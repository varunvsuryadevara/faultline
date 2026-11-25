import { AnalysisError, isAbortError } from '../../shared/errors.js';

// Parses a server-sent-events body into { event, data } records. If the connection drops part
// way through, this throws INCOMPLETE rather than a raw network error the UI can't explain.
export async function* readSSE(body, providerName = 'The model') {
  try {
    yield* readRecords(body);
  } catch (err) {
    if (err instanceof AnalysisError || isAbortError(err)) throw err;
    throw new AnalysisError('INCOMPLETE', `The connection to ${providerName} dropped before the answer finished. Try again.`, {
      status: 502,
      retryable: true,
      cause: err,
    });
  }
}

async function* readRecords(body) {
  const decoder = new TextDecoder();
  let buffer = '';
  const parseBlock = (block) => {
    let event = 'message';
    const data = [];
    for (const line of block.split('\n')) {
      if (!line || line.startsWith(':')) continue;
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
    }
    return data.length ? { event, data: data.join('\n') } : null;
  };

  for await (const chunk of body) {
    buffer = (buffer + decoder.decode(chunk, { stream: true })).replace(/\r\n/g, '\n');
    let split;
    while ((split = buffer.indexOf('\n\n')) !== -1) {
      const record = parseBlock(buffer.slice(0, split));
      buffer = buffer.slice(split + 2);
      if (record) yield record;
    }
  }
  buffer += decoder.decode();
  const tail = parseBlock(buffer.trim());
  if (tail) yield tail;
}

const sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t);
        reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });

const RETRYABLE = new Set([429, 500, 502, 503, 529]);

// POST with up to two retries on rate-limit/overload responses, before any streaming starts.
export async function postJson(url, { headers, body, signal, providerName, attempts = 3 }) {
  for (let attempt = 1; ; attempt += 1) {
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...headers },
        body: JSON.stringify(body),
        signal,
      });
    } catch (err) {
      if (isAbortError(err) || signal?.aborted) throw err;
      throw new AnalysisError('NETWORK', `Couldn't reach ${providerName}. Check this computer's internet connection.`, {
        status: 502,
        retryable: true,
        cause: err,
      });
    }
    if (RETRYABLE.has(res.status) && attempt < attempts) {
      const retryAfter = Number(res.headers.get('retry-after'));
      const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 8000) : 700 * 2 ** (attempt - 1);
      await res.body?.cancel().catch(() => {});
      await sleep(wait, signal);
      continue;
    }
    return res;
  }
}

function extractMessage(bodyText) {
  try {
    const parsed = JSON.parse(bodyText);
    const e = Array.isArray(parsed) ? parsed[0]?.error : parsed?.error;
    return (typeof e === 'string' ? e : e?.message) || parsed?.message || '';
  } catch {
    return bodyText?.slice(0, 200) || '';
  }
}

// Turns a non-2xx provider response into an AnalysisError the UI knows how to explain.
// `vars` names the .env settings to check, e.g. { key: 'ANTHROPIC_API_KEY', model: 'ANTHROPIC_MODEL' }.
export function providerError(providerName, status, bodyText, vars = {}) {
  const detail = String(extractMessage(bodyText)).trim().replace(/[.\s]+$/, ''); // we add our own full stop
  const suffix = detail ? ` (${detail})` : '';
  // A new account with no credit is the most common first-run failure; say so plainly.
  if (/credit balance|billing|purchase credits|insufficient_quota|exceeded your current quota/i.test(detail)) {
    return new AnalysisError('BILLING', `${providerName} says this account has no credit left${suffix}.`, { status: 402 });
  }
  if (status === 401 || status === 403) {
    return new AnalysisError(
      'AUTH',
      `${providerName} rejected the API key${suffix}. Check ${vars.key ?? 'the API key'} in .env and save the file.`,
      { status: 502 },
    );
  }
  if (status === 404) {
    return new AnalysisError(
      'MODEL_NOT_FOUND',
      `${providerName} doesn't recognise the configured model${suffix}. Check ${vars.model ?? 'the model name'} in .env, save the file, then try again.`,
      { status: 502 },
    );
  }
  if (status === 413) {
    return new AnalysisError('TOO_LARGE', 'The exhibits are too large for the model. Trim them and try again.', { status: 413 });
  }
  if (status === 429) {
    return new AnalysisError('RATE_LIMITED', `${providerName} is rate-limiting this API key. Wait a few seconds and try again.`, {
      status: 429,
      retryable: true,
    });
  }
  if (status === 529 || status === 503) {
    return new AnalysisError('OVERLOADED', `${providerName} is overloaded right now. Try again in a moment.`, { status: 503, retryable: true });
  }
  if (status >= 500) {
    return new AnalysisError('PROVIDER_ERROR', `${providerName} returned an error (${status}). Try again.`, { status: 502, retryable: true });
  }
  return new AnalysisError('PROVIDER_REJECTED', `${providerName} rejected the request${suffix}.`, { status: 502 });
}
