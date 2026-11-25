import { EXHIBIT_IDS } from './constants.js';
import { ANALYSIS_SCHEMA, SYSTEM_PROMPT, buildUserMessage } from './prompt.js';
import { createProgressTracker } from './progress.js';
import { extractJson, normalizeAnalysis } from './normalize.js';
import { verifyEvidence } from './verify.js';

/**
 * The whole analysis, independent of where the model runs.
 *
 * @param {{context: string, sources: {label: string, kind: string, text: string}[]}} input  validated case
 * @param {object} options
 * @param {(prompt, opts) => Promise<string>} options.streamText  calls the model; reports text/thinking as it streams
 * @param {(progress) => void} [options.onProgress]
 * @param {AbortSignal} [options.signal]
 * @param {string} [options.provider]  display name, e.g. "Claude"
 * @param {string} [options.model]     model id, e.g. "claude-sonnet-5-5"
 */
export async function runAnalysis(input, { streamText, onProgress = () => {}, signal, provider = '', model = '' }) {
  const exhibits = input.sources.map((s, i) => ({ id: EXHIBIT_IDS[i], label: s.label, kind: s.kind, text: s.text }));
  const startedAt = Date.now();
  const tracker = createProgressTracker(onProgress);
  tracker.start();

  let text;
  try {
    text = await streamText(
      { system: SYSTEM_PROMPT, user: buildUserMessage({ context: input.context, exhibits }), schema: ANALYSIS_SCHEMA },
      { signal, onText: tracker.text, onThinking: tracker.thinking },
    );
  } finally {
    tracker.stop();
  }

  tracker.finish(); // stage: verifying quotes
  const analysis = normalizeAnalysis(extractJson(text), exhibits.map((e) => e.id));
  const verified = verifyEvidence(analysis, exhibits);

  return {
    ...verified,
    meta: {
      provider,
      model,
      ms: Date.now() - startedAt,
      generatedAt: new Date().toISOString(),
      exhibits: exhibits.map(({ id, label, kind }) => ({ id, label, kind })),
    },
  };
}
