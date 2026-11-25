import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import express from 'express';
import { AnalysisError, isAbortError } from '../shared/errors.js';
import { runAnalysis } from '../shared/pipeline.js';
import { runNativeAnalysis } from './intelligence/native/pipeline.js';
import { validateCase } from '../shared/validate.js';
import { SCENARIOS, SCENARIO_PROBLEMS } from '../shared/scenarios/index.js';
import { getProvider } from './providers/index.js';
import { createRateLimiter } from './rate-limit.js';
import { scenarioRouter } from './scenarios.js';
import { evidenceRouter } from './evidence.js';
import { legalRouter } from './legal.js';
import { intelligenceRouter } from './intelligence/index.js';
import { authenticateToken } from './auth.js';
import { authRouter } from './routes/auth.js';
import { governanceRouter } from './routes/governance.js';
import { auditRouter } from './routes/audit.js';
import { subrogationRouter } from './routes/subrogation.js';
import { salvageRouter } from './routes/salvage.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DIST = path.join(ROOT, 'dist');

// Candidate .env paths: project root, parent workspace, and user directory
const candidateEnvFiles = [
  path.join(ROOT, '.env'),
  path.join(ROOT, '..', '.env'),
  path.join(ROOT, '..', '..', '.env'),
];

const envStamps = new Map();
function loadEnv() {
  for (const envFile of candidateEnvFiles) {
    let stamp = 0;
    try {
      stamp = statSync(envFile).mtimeMs;
    } catch {
      continue; // file does not exist
    }
    const prev = envStamps.get(envFile) || 0;
    if (stamp !== prev) {
      envStamps.set(envFile, stamp);
      try {
        const content = readFileSync(envFile, 'utf8').replace(/^\uFEFF/, ''); // Notepad may add a byte-order mark
        for (const [key, value] of Object.entries(parseEnv(content))) {
          if (value.trim() !== '') process.env[key] = value.trim();
        }
      } catch (err) {
        console.warn(`Could not read ${envFile}: ${err.message}`);
      }
    }
  }
}
loadEnv();

const PORT = Number(process.env.PORT) || 8787;
const HOST = process.env.HOST || '127.0.0.1';
// Read on every request, so a change saved to .env applies without a restart.
const timeoutMs = () => (Number(process.env.ANALYSIS_TIMEOUT_SECONDS) || 240) * 1000;
const rateLimitMax = () => Number(process.env.RATE_LIMIT_PER_10_MIN) || 30;

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 'loopback');
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'SAMEORIGIN',
  });
  next();
});
app.use('/api', (req, res, next) => {
  loadEnv();
  next();
});
app.use('/api', express.json({ limit: '20mb' }));
app.use(authenticateToken);

// The browser asks which model is configured. Never returns the key itself.
app.get('/api/health', (req, res) => {
  const provider = getProvider();
  res.json({
    ok: true,
    provider: provider.id,
    name: provider.name,
    model: provider.model,
    configured: provider.configured,
    setupHint: provider.configured ? null : provider.setupHint,
  });
});

// One limit shared by every route that calls the model, so it caps total model spend.
const modelLimiter = createRateLimiter({ windowMs: 10 * 60_000, max: rateLimitMax });

app.post('/api/analyze', modelLimiter, async (req, res) => {
  const parsed = validateCase(req.body);
  if (!parsed.ok) return res.status(400).json({ code: 'INVALID_INPUT', error: parsed.error });

  const provider = getProvider();
  const runOffline = req.body?.mode === 'native' || req.query?.mode === 'native' || !provider.configured;

  // Stream newline-delimited JSON: progress events while the model writes, then one result.
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
    let result;
    if (runOffline) {
      result = await runNativeAnalysis(parsed.value, {
        onProgress: (progress) => send({ type: 'progress', ...progress }),
        signal,
      });
    } else {
      result = await runAnalysis(parsed.value, {
        streamText: (prompt, options) => provider.stream(prompt, options),
        onProgress: (progress) => send({ type: 'progress', ...progress }),
        signal,
        provider: provider.name,
        model: provider.model,
      });
    }
    send({ type: 'result', result });
    console.log(
      `[analyze] ${parsed.value.sources.length} exhibits → ${result.contradictions.length} conflicts in ${((Date.now() - started) / 1000).toFixed(1)}s`,
    );
  } catch (err) {
    if (clientGone.signal.aborted) {
      console.log('[analyze] cancelled by the browser');
      return;
    }
    const error = timeout.aborted
      ? new AnalysisError('TIMEOUT', `The model took longer than ${limitMs / 1000} s to answer. Try again, or use fewer or shorter exhibits.`, {
          retryable: true,
        })
      : err instanceof AnalysisError
        ? err
        : new AnalysisError('SERVER_ERROR', 'Something went wrong on the FaultLine server. Check the terminal for details.', {
            cause: err,
          });
    if (!(err instanceof AnalysisError) && !isAbortError(err)) console.error(err);
    console.error(`[analyze] ${error.code}: ${error.message}`);
    send({ type: 'error', code: error.code, message: error.message, retryable: error.retryable });
  } finally {
    clearInterval(keepAlive);
    res.end();
  }
});

// Evidence upload and preview
app.use('/api/evidence', evidenceRouter());

// The motor claims scenario library: browse, search, open, and assess scenarios with the model.
app.use('/api/scenarios', scenarioRouter({ getProvider, rateLimiter: modelLimiter, timeoutMs }));

// Jurisdictional Legal Intelligence & Statutory Assessment API
app.use('/api/legal', legalRouter({ getProvider, rateLimiter: modelLimiter, timeoutMs }));

// FaultLine Intelligence - Hybrid Chatbot Orchestrator API
app.use('/api/intelligence', intelligenceRouter({ getProvider, rateLimiter: modelLimiter, timeoutMs }));

// Authentication & Enterprise RBAC
app.use('/api/auth', authRouter);

// Human Decision Governance & Two-Key Manager Sign-Off
app.use('/api/governance', governanceRouter);

// Cryptographic Audit Trail & Event History
app.use('/api/audit', auditRouter);

// Subrogation Recovery Engine
app.use('/api/subrogation', subrogationRouter);

// Total-Loss Vehicle Salvage Engine (ABI Standards)
app.use('/api/salvage', salvageRouter);

app.use('/api', (req, res) => res.status(404).json({ code: 'NOT_FOUND', error: 'Unknown API route.' }));

// After `npm run build`, the same server also serves the app on one port.
if (existsSync(path.join(DIST, 'index.html'))) {
  app.use(express.static(DIST));
  app.use((req, res) => {
    res.sendFile(path.join(DIST, 'index.html'));
  });
}

// Malformed JSON, oversized bodies and anything else Express throws.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ code: 'TOO_LARGE', error: 'That case is too large to send. Trim the exhibits and try again.' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ code: 'INVALID_INPUT', error: 'The request body is not valid JSON.' });
  }
  console.error(err);
  return res.status(500).json({ code: 'SERVER_ERROR', error: 'Something went wrong on the FaultLine server.' });
});

const server = app.listen(PORT, HOST, () => {
  const provider = getProvider();
  const devMode = process.env.npm_lifecycle_event === 'dev:api';
  const hasBuild = existsSync(path.join(DIST, 'index.html'));
  console.log(`\n  FaultLine API  http://${HOST}:${PORT}`);
  console.log(`  Model         ${provider.name} (${provider.model})`);
  console.log(provider.configured ? '  API key       found' : `  API key       MISSING. ${provider.setupHint}`);
  console.log(`  Scenarios     ${SCENARIOS.length} in the library${SCENARIO_PROBLEMS.length ? ` (${SCENARIO_PROBLEMS.length} data problems, run npm test)` : ''}`);
  if (devMode) console.log('  App           http://localhost:5173');
  else if (hasBuild) console.log(`  App           http://localhost:${PORT}`);
  else console.log('  App           run "npm run build" first, or use "npm run dev"');
  console.log('');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  Port ${PORT} is already in use. Stop the other process or set PORT in .env.\n`);
    process.exit(1);
  }
  throw err;
});
