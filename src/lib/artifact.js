import { runAssessment } from '../../shared/assess.js';
import { AnalysisError, isAbortError } from '../../shared/errors.js';
import { runAnalysis } from '../../shared/pipeline.js';
import { jsonOnlyInstructions } from '../../shared/prompt.js';
import { scenarioCase } from '../../shared/scenarios/case.js';
import { validateCase } from '../../shared/validate.js';

// Used only by `npm run build:artifact`: the page runs inside claude.ai and asks Claude through
// the artifact runtime's `sample` capability, so no API key or server is needed. The analysis
// pipeline (prompt, progress, normalising, quote checks) is the same shared code the server runs.

let samplePromise;
function getSample() {
  if (!samplePromise) {
    const use = typeof window !== 'undefined' ? window.claude?.use : undefined;
    samplePromise =
      typeof use === 'function' ? Promise.resolve(use.call(window.claude, 'sample')).catch(() => null) : Promise.resolve(null);
  }
  return samplePromise;
}

export async function getStatus() {
  const sample = await getSample();
  return sample
    ? { mode: 'artifact', reachable: true, configured: true, name: 'Claude', model: 'Claude on claude.ai' }
    : { mode: 'artifact', reachable: false, configured: false, name: 'Claude', model: 'Claude on claude.ai' };
}

export async function analyze(payload, { signal, onProgress } = {}) {
  const sample = await getSample();
  if (!sample) {
    throw new AnalysisError('NO_RUNTIME', 'Live analysis is only available when this page is opened on claude.ai.');
  }
  const parsed = validateCase(payload);
  if (!parsed.ok) throw new AnalysisError('INVALID_INPUT', parsed.error, { status: 400 });

  return runAnalysis(parsed.value, {
    signal,
    onProgress,
    provider: 'Claude',
    model: 'Claude on claude.ai',
    streamText: streamWith(sample),
  });
}

// Claim assessment of a library scenario, run in the page with the same shared pipeline.
export async function assessScenario(scenario, options = {}) {
  const { signal, onProgress } = options;
  const sample = await getSample();
  if (!sample) {
    throw new AnalysisError('NO_RUNTIME', 'Live assessment is only available when this page is opened on claude.ai.');
  }
  const customCase = options?.customCase || options?.case || scenario.case;
  const built = customCase || scenarioCase(scenario);
  const parsed = validateCase({ context: built.context, sources: built.exhibits });
  if (!parsed.ok) throw new AnalysisError('INVALID_INPUT', parsed.error, { status: 400 });
  const result = await runAssessment(parsed.value, {
    signal,
    onProgress,
    provider: 'Claude',
    model: 'Claude on claude.ai',
    streamText: streamWith(sample),
  });
  return { ...result, scenarioId: scenario.id };
}

export async function listCustomScenarios() {
  try {
    const raw = localStorage.getItem('faultline_custom_scenarios');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveCustomScenario(scenario) {
  const list = await listCustomScenarios();
  const idx = list.findIndex((s) => s.id === scenario.id);
  if (idx >= 0) list[idx] = scenario;
  else list.push(scenario);
  try {
    localStorage.setItem('faultline_custom_scenarios', JSON.stringify(list));
  } catch {}
  return { ok: true, scenario };
}

export async function deleteCustomScenario(id) {
  const list = await listCustomScenarios();
  const next = list.filter((s) => s.id !== id);
  try {
    localStorage.setItem('faultline_custom_scenarios', JSON.stringify(next));
  } catch {}
  return { ok: true };
}

export async function duplicateScenario(id, title) {
  const list = await listCustomScenarios();
  const found = list.find((s) => s.id === id);
  if (!found) return null;
  const copy = {
    ...found,
    id: `${found.id}-COPY-${Math.random().toString(36).slice(2, 7)}`.toUpperCase(),
    title: title || `${found.title} (Copy)`,
    isCustom: true,
  };
  return saveCustomScenario(copy);
}

function streamWith(sample) {
  return async ({ system, user, schema }, { signal: s, onText }) => {
    try {
      const out = await sample(`${system}${jsonOnlyInstructions(schema)}\n\n${user}`, {
        signal: s,
        cache: false,
        modelTier: 'default',
        onText: ({ text }) => {
          if (typeof text === 'string' && text.includes('{')) onText(text);
        },
      });
      if (out?.truncated) {
        throw new AnalysisError('TOO_LONG', 'The findings ran past the output limit. Shorten the exhibits and try again.');
      }
      return out?.text ?? '';
    } catch (err) {
      if (err instanceof AnalysisError || isAbortError(err) || s?.aborted) throw err;
      if (err?.code === 'not_granted') {
        throw new AnalysisError('NOT_GRANTED', 'FaultLine needs your permission to ask Claude. Allow it, then run the analysis again.');
      }
      if (err?.code === 'rate_limited') {
        throw new AnalysisError('RATE_LIMITED', 'Claude is rate-limiting this page. Wait a minute and try again.', { retryable: true });
      }
      throw new AnalysisError('PROVIDER_ERROR', err?.message || 'Claude could not complete the analysis. Try again.', {
        retryable: true,
      });
    }
  };
}
