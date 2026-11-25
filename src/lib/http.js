import { AnalysisError, isAbortError } from '../../shared/errors.js';

// Talks to the FaultLine API server. The API key lives there, never in the browser.

export async function getStatus() {
  try {
    const res = await fetch('/api/health', { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    return {
      mode: 'server',
      reachable: true,
      configured: Boolean(data.configured),
      provider: data.provider,
      name: data.name,
      model: data.model,
      setupHint: data.setupHint,
    };
  } catch {
    return { mode: 'server', reachable: false, configured: false };
  }
}

const serverDown = () =>
  new AnalysisError('SERVER_DOWN', "Can't reach the FaultLine server. Start it with npm run dev, then try again.", {
    retryable: true,
  });

export const analyze = (payload, options) => postStream('/api/analyze', payload, options);

// Claim assessment of a library scenario. If custom exhibits are provided in options or scenario,
// they are passed to the server so the assessment runs on the modified case file.
export const assessScenario = (scenario, options) => {
  const customCase = options?.customCase || options?.case || scenario.case;
  return postStream(
    `/api/scenarios/${encodeURIComponent(scenario.id)}/assess`,
    customCase ? { case: customCase } : {},
    options,
  );
};

export async function listCustomScenarios() {
  try {
    const res = await fetch('/api/scenarios/custom');
    if (!res.ok) return [];
    const data = await res.json();
    return data.items || [];
  } catch {
    return [];
  }
}

export async function saveCustomScenario(scenario) {
  const res = await fetch('/api/scenarios/custom', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scenario),
  });
  if (!res.ok) throw new Error('Failed to save custom scenario');
  return res.json();
}

export async function deleteCustomScenario(id) {
  const res = await fetch(`/api/scenarios/custom/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete custom scenario');
  return res.json();
}

export async function duplicateScenario(id, title) {
  const res = await fetch(`/api/scenarios/custom/${encodeURIComponent(id)}/duplicate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  if (!res.ok) throw new Error('Failed to duplicate scenario');
  return res.json();
}

// POSTs a JSON body and reads a newline-delimited JSON stream of progress events and one result.
async function postStream(url, payload, { signal, onProgress } = {}) {
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/x-ndjson' },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (err) {
    if (isAbortError(err) || signal?.aborted) throw err;
    throw serverDown();
  }

  if (!res.ok) {
    let data = null;
    try {
      data = await res.json();
    } catch {
      // The dev proxy answers with an empty 5xx when the API server isn't running.
    }
    if (!data && res.status >= 500) throw serverDown();
    throw new AnalysisError(data?.code || `HTTP_${res.status}`, data?.error || `The server answered with status ${res.status}.`, {
      status: res.status,
      retryable: res.status === 429 || res.status >= 500,
    });
  }

  // Newline-delimited JSON: {type:"progress"}…, then {type:"result"} or {type:"error"}.
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result = null;

  const handle = (line) => {
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      return;
    }
    if (msg.type === 'progress') onProgress?.(msg);
    else if (msg.type === 'result') result = msg.result;
    else if (msg.type === 'error') {
      throw new AnalysisError(msg.code || 'SERVER_ERROR', msg.message || 'The analysis failed.', { retryable: msg.retryable });
    }
  };

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newline;
      while ((newline = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (line) handle(line);
      }
    }
    buffer += decoder.decode();
    if (buffer.trim()) handle(buffer.trim());
  } catch (err) {
    reader.cancel().catch(() => {});
    if (err instanceof AnalysisError || isAbortError(err) || signal?.aborted) throw err;
    throw new AnalysisError('INCOMPLETE', 'The connection dropped before the analysis finished. Try again.', { retryable: true });
  }

  if (!result) {
    throw new AnalysisError('INCOMPLETE', 'The analysis stopped before it finished. Try again.', { retryable: true });
  }
  return result;
}
