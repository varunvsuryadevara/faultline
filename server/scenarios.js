import express from 'express';
import { runAssessment } from '../shared/assess.js';
import { AnalysisError, isAbortError } from '../shared/errors.js';
import { scenarioCase } from '../shared/scenarios/case.js';
import { compareWithReference } from '../shared/scenarios/compare.js';
import { SCENARIOS, getScenario } from '../shared/scenarios/index.js';
import { facetCounts, filtersFromParams, queryScenarios, randomScenario, summaryOf } from '../shared/scenarios/query.js';
import { validateCase } from '../shared/validate.js';
import {
  deleteCustomScenario,
  duplicateScenario,
  getCustomScenario,
  listCustomScenarios,
  saveCustomScenario,
} from './custom-scenarios.js';

// The scenario library API, mounted at /api/scenarios.
//   GET  /api/scenarios                list with filters (?country=UK,US&intent=…), search (?q=) and facets
//   GET  /api/scenarios/custom         list all user-customised scenarios
//   POST /api/scenarios/custom         create or save a customised scenario
//   POST /api/scenarios/custom/:id/duplicate duplicate a scenario
//   DELETE /api/scenarios/custom/:id   delete a customised scenario
//   GET  /api/scenarios/random         one random scenario, honouring the same filters and search
//   GET  /api/scenarios/:id            the full scenario and the case file built from it
//   POST /api/scenarios/:id/assess     streams an AI assessment of the case file (NDJSON)

const MAX_LIMIT = 200;

export function scenarioRouter({ getProvider, rateLimiter, timeoutMs }) {
  const router = express.Router();

  router.get('/custom', (req, res) => {
    res.json({ items: listCustomScenarios() });
  });

  router.post('/custom', (req, res) => {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ code: 'INVALID_INPUT', error: 'JSON payload required.' });
    }
    const saved = saveCustomScenario(req.body);
    res.json({ ok: true, scenario: saved });
  });

  router.post('/custom/:id/duplicate', (req, res) => {
    const duplicated = duplicateScenario(req.params.id, req.body?.title);
    if (!duplicated) {
      return res.status(404).json({ code: 'NOT_FOUND', error: `Scenario ${req.params.id} not found.` });
    }
    res.json({ ok: true, scenario: duplicated });
  });

  router.delete('/custom/:id', (req, res) => {
    const deleted = deleteCustomScenario(req.params.id);
    if (!deleted) {
      return res.status(404).json({ code: 'NOT_FOUND', error: 'Custom scenario not found or cannot be deleted.' });
    }
    res.json({ ok: true });
  });

  router.get('/', (req, res) => {
    const filters = filtersFromParams(req.query);
    const q = typeof req.query.q === 'string' ? req.query.q.slice(0, 200) : '';
    const sort = typeof req.query.sort === 'string' ? req.query.sort : 'relevance';
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(req.query.limit) || 50));
    const offset = Math.max(0, Number(req.query.offset) || 0);

    const includeCustom = req.query.includeCustom === 'true';
    const customList = includeCustom ? listCustomScenarios() : [];
    const pool = customList.length ? [...customList, ...SCENARIOS] : SCENARIOS;

    const { items, total, partial } = queryScenarios(pool, { filters, q, sort });
    res.json({
      total,
      partial,
      offset,
      limit,
      items: items.slice(offset, offset + limit).map(summaryOf),
      facets: facetCounts(pool, { filters, q }),
      libraryTotal: SCENARIOS.length,
      customTotal: listCustomScenarios().length,
    });
  });

  router.get('/random', (req, res) => {
    const filters = filtersFromParams(req.query);
    const q = typeof req.query.q === 'string' ? req.query.q.slice(0, 200) : '';
    const { items } = queryScenarios(SCENARIOS, { filters, q });
    const pick = randomScenario(items, { exclude: typeof req.query.exclude === 'string' ? req.query.exclude : undefined });
    if (!pick) return res.status(404).json({ code: 'NOT_FOUND', error: 'No scenario matches those filters.' });
    return res.json({ scenario: pick, case: scenarioCase(pick) });
  });

  router.get('/:id', (req, res) => {
    const scenario = getScenario(req.params.id) || getCustomScenario(req.params.id);
    if (!scenario) return res.status(404).json({ code: 'NOT_FOUND', error: `No scenario with id ${req.params.id}.` });
    return res.json({ scenario, case: scenarioCase(scenario) });
  });

  router.post('/:id/assess', rateLimiter, async (req, res) => {
    const scenario = getScenario(req.params.id) || getCustomScenario(req.params.id);
    if (!scenario && !req.body?.case) {
      return res.status(404).json({ code: 'NOT_FOUND', error: `No scenario with id ${req.params.id}.` });
    }

    // AI assessment strictly uses the modified case if provided by the client,
    // reflecting all edits, additions, and deletions made by the user.
    const built = req.body?.case
      ? {
          title: req.body.case.title || (scenario ? scenario.title : 'Customised Scenario'),
          context: req.body.case.context ?? (scenario ? scenarioCase(scenario).context : ''),
          exhibits: (req.body.case.exhibits || []).map((e) => ({ ...e })),
          scenarioId: scenario?.id || req.params.id,
        }
      : scenarioCase(scenario);

    const parsed = validateCase({ context: built.context, sources: built.exhibits });
    if (!parsed.ok) {
      return res.status(400).json({ code: 'BAD_CASE', error: `Invalid case: ${parsed.error}` });
    }

    const provider = getProvider();
    if (!provider.configured) return res.status(503).json({ code: 'NO_API_KEY', error: provider.setupHint });

    res.status(200).set({
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();
    const send = (message) => {
      if (!res.writableEnded && !res.destroyed) res.write(`${JSON.stringify(message)}\n`);
    };
    const clientGone = new AbortController();
    res.on('close', () => {
      if (!res.writableFinished) clientGone.abort();
    });
    const limitMs = timeoutMs();
    const timeout = AbortSignal.timeout(limitMs);
    const signal = AbortSignal.any([clientGone.signal, timeout]);
    const keepAlive = setInterval(() => send({ type: 'ping' }), 15_000);
    const started = Date.now();

    try {
      const result = await runAssessment(parsed.value, {
        streamText: (prompt, options) => provider.stream(prompt, options),
        onProgress: (progress) => send({ type: 'progress', ...progress }),
        signal,
        provider: provider.name,
        model: provider.model,
      });
      send({
        type: 'result',
        result: {
          ...result,
          scenarioId: scenario?.id || req.params.id,
          comparison: scenario ? compareWithReference(result, scenario) : null,
        },
      });
      console.log(`[assess] ${scenario?.id || req.params.id} → ${result.intent}, ${result.risk} risk in ${((Date.now() - started) / 1000).toFixed(1)}s`);
    } catch (err) {
      if (clientGone.signal.aborted) {
        console.log(`[assess] ${scenario?.id || req.params.id} cancelled by the browser`);
        return;
      }
      const error = timeout.aborted
        ? new AnalysisError('TIMEOUT', `The model took longer than ${limitMs / 1000} s to answer. Try again.`, { retryable: true })
        : err instanceof AnalysisError
          ? err
          : new AnalysisError('SERVER_ERROR', 'Something went wrong on the FaultLine server. Check the terminal for details.', {
              cause: err,
            });
      if (!(err instanceof AnalysisError) && !isAbortError(err)) console.error(err);
      console.error(`[assess] ${scenario?.id || req.params.id} ${error.code}: ${error.message}`);
      send({ type: 'error', code: error.code, message: error.message, retryable: error.retryable });
    } finally {
      clearInterval(keepAlive);
      res.end();
    }
  });

  return router;
}
