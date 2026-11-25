import { KeyRound, ListOrdered, MessageCircleQuestion, OctagonAlert, Quote, RotateCcw, ScanSearch, Terminal, Unplug, Zap } from 'lucide-react';
import { prettyModel } from '../lib/format.js';
import Findings from './Findings.jsx';
import LiveLog from './LiveLog.jsx';
import { Button } from './ui.jsx';

function SetupSteps({ provider }) {
  const openai = provider === 'openai';
  return (
    <ol className="mt-3 space-y-2.5 text-[14.5px] leading-relaxed text-ink-2">
      <li>
        <span className="font-semibold text-ink">1. </span>
        In the project folder, copy <code className="rounded bg-paper px-1 py-0.5 text-[13px]">.env.example</code> to{' '}
        <code className="rounded bg-paper px-1 py-0.5 text-[13px]">.env</code>
        <pre className="mt-1.5 overflow-x-auto rounded-[6px] bg-paper border border-rule px-3 py-2 text-[12.5px] leading-relaxed text-ink font-mono">
          {'copy .env.example .env      # Windows\ncp .env.example .env        # macOS or Linux'}
        </pre>
      </li>
      <li>
        <span className="font-semibold text-ink">2. </span>
        Paste your key after{' '}
        <code className="rounded bg-paper px-1 py-0.5 text-[13px]">{openai ? 'OPENAI_API_KEY=' : 'ANTHROPIC_API_KEY='}</code>.{' '}
        {openai ? 'Also set OPENAI_BASE_URL and OPENAI_MODEL for your provider.' : 'Keys come from the Claude Console under API keys.'}
      </li>
      <li>
        <span className="font-semibold text-ink">3. </span>
        Save the file, then try again. The server picks up the change without a restart.
      </li>
    </ol>
  );
}

const HELP = {
  NO_API_KEY: { icon: KeyRound, title: 'Connect a model to run the analysis', setup: true },
  AUTH: { icon: KeyRound, title: 'The API key was rejected', setup: true },
  BILLING: {
    icon: KeyRound,
    title: 'The API account needs credit',
    retry: true,
    hint: (provider) =>
      provider === 'openai'
        ? 'Add credit with your model provider, then try again. A new key on the same account won’t help.'
        : 'Add credit in the Claude Console under Billing, then try again. A new key on the same account won’t help.',
  },
  SERVER_DOWN: { icon: Unplug, title: "Can't reach the FaultLine server", retry: true, hint: 'Run npm run dev in the project folder and keep that terminal open.' },
  MODEL_NOT_FOUND: { icon: Terminal, title: 'The model name was not recognised', retry: true },
  RATE_LIMITED: { icon: RotateCcw, title: 'The model is busy', retry: true },
  LOCAL_RATE_LIMIT: { icon: RotateCcw, title: 'Too many analyses in a row', retry: true },
  OVERLOADED: { icon: RotateCcw, title: 'The model is overloaded', retry: true },
  TIMEOUT: { icon: RotateCcw, title: 'The analysis took too long', retry: true },
  NETWORK: { icon: Unplug, title: "Couldn't reach the model", retry: true },
  INCOMPLETE: { icon: RotateCcw, title: 'The analysis was interrupted', retry: true },
  BAD_OUTPUT: { icon: RotateCcw, title: 'The findings came back garbled', retry: true },
  PROVIDER_ERROR: { icon: RotateCcw, title: 'The model returned an error', retry: true },
  TOO_LONG: { icon: OctagonAlert, title: 'The case is too long for one pass' },
  TOO_LARGE: { icon: OctagonAlert, title: 'The case is too large to send' },
  INVALID_INPUT: { icon: OctagonAlert, title: 'Check the exhibits' },
  REFUSED: { icon: OctagonAlert, title: 'The model declined this case' },
  NOT_GRANTED: { icon: KeyRound, title: 'FaultLine needs permission to ask Claude', retry: true },
  NO_RUNTIME: { icon: Unplug, title: 'Live analysis runs on claude.ai' },
};

function ErrorState({ error, onRetry, onRestore, artifact, provider }) {
  const help = HELP[error.code] ?? { icon: OctagonAlert, title: 'The analysis failed', retry: true };
  const hint = typeof help.hint === 'function' ? help.hint(provider) : help.hint;
  const Icon = help.icon;
  return (
    <div className="rounded-[8px] border border-rule bg-paper/60 p-6">
      <Icon className="size-6 text-ink-2" strokeWidth={2} aria-hidden="true" />
      <h2 id="analysis-heading" className="mt-3 text-[20px] font-semibold">
        {help.title}
      </h2>
      <p className="mt-1.5 max-w-[62ch] text-[15px] leading-relaxed text-ink-2">{error.message}</p>
      {hint && <p className="mt-2 max-w-[62ch] text-[14.5px] text-ink-2">{hint}</p>}
      {help.setup && !artifact && <SetupSteps provider={provider} />}
      <div className="mt-5 flex flex-wrap gap-2">
        {(help.retry || error.retryable || help.setup) && (
          <Button onClick={onRetry}>
            <RotateCcw className="size-4" aria-hidden="true" />
            Try again
          </Button>
        )}
        {onRestore && (
          <Button variant="secondary" onClick={onRestore}>
            Back to the previous findings
          </Button>
        )}
      </div>
    </div>
  );
}

const PROMISES = [
  { icon: ListOrdered, text: 'One timeline across every exhibit, with the disputed moments marked' },
  { icon: Quote, text: 'Each conflict with the exact quotes behind it, checked against the text' },
  { icon: MessageCircleQuestion, text: 'An innocent explanation and the question to ask next' },
];

function ReadyState({ exhibitCount, problem, onRun, status }) {
  const missingKey = status && status.reachable && !status.configured;
  const offline = status && !status.reachable && status.mode === 'server';
  return (
    <div className="relative">
      <h2 id="analysis-heading" className="text-[22px] font-semibold tracking-[-0.01em]">
        Ready to cross-examine
      </h2>
      <p className="mt-1.5 max-w-[60ch] text-[15.5px] leading-relaxed text-ink-2">
        FaultLine reads all {exhibitCount} exhibits together, the way an investigator would, and reports:
      </p>
      <ul className="mt-5 space-y-3.5">
        {PROMISES.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-start gap-3 text-[15.5px] text-ink">
            <Icon className="mt-0.5 size-[18px] shrink-0 text-pen" strokeWidth={2} aria-hidden="true" />
            {text}
          </li>
        ))}
      </ul>

      {missingKey && (
        <div className="mt-7 rounded-[8px] border border-blue-500/30 bg-blue-500/10 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-[16px] font-semibold text-blue-600 dark:text-blue-400">
                <Zap className="size-5" />
                Offline Native Intelligence Ready
              </p>
              <p className="mt-1 text-[14.5px] text-ink-2 max-w-[60ch]">
                {status.name} has no API key configured, but FaultLine's internal deterministic engines are ready to cross-examine all {exhibitCount} exhibits 100% offline with zero external dependencies.
              </p>
            </div>
            <Button onClick={onRun} disabled={Boolean(problem)} className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-semibold">
              <ScanSearch className="size-[18px]" aria-hidden="true" />
              Cross-examine offline
            </Button>
          </div>
          <details className="mt-4 pt-3 border-t border-rule/50 text-[13px] text-ink-3">
            <summary className="cursor-pointer hover:text-ink font-medium">
              Want to connect Claude Sonnet anyway? View API Key Setup Steps
            </summary>
            <div className="mt-2 text-ink">
              <SetupSteps provider={status.provider} />
            </div>
          </details>
        </div>
      )}
      {offline && (
        <div className="mt-7 rounded-[8px] border border-critical/30 bg-critical-wash/50 p-5">
          <p className="flex items-center gap-2 text-[16px] font-semibold">
            <Unplug className="size-5 text-critical-ink" aria-hidden="true" />
            The FaultLine server isn’t running
          </p>
          <p className="mt-1 text-[14.5px] text-ink-2">
            Start it from the project folder with <code className="rounded bg-sheet px-1 py-0.5 text-[13px]">npm run dev</code>, then reload this page.
          </p>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button onClick={onRun} disabled={Boolean(problem)}>
          <ScanSearch className="size-[18px]" aria-hidden="true" />
          Cross-examine {exhibitCount} exhibits
        </Button>
        {status?.configured ? (
          <span className="text-[13.5px] text-ink-3">Uses {prettyModel(status.model) || status.name}. Usually takes one to two minutes.</span>
        ) : (
          <span className="text-[13.5px] text-ink-3 flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
            <Zap className="size-3.5" /> Uses Native Intelligence Engine (100% Offline • Zero LLM Cost)
          </span>
        )}
      </div>
      {problem && <p className="mt-3 text-[14px] text-ink-2">{problem}</p>}
    </div>
  );
}

export default function AnalysisPanel(props) {
  const { run, exhibitCount, problem, status, onRun, onCancel, onRestore, artifact } = props;
  return (
    <section aria-labelledby="analysis-heading">
      {run.status === 'idle' && <ReadyState exhibitCount={exhibitCount} problem={problem} onRun={onRun} status={status} />}
      {run.status === 'running' && (
        <LiveLog exhibitCount={run.snapshot.length} progress={run.progress} startedAt={run.startedAt} onCancel={onCancel} />
      )}
      {run.status === 'error' && (
        <ErrorState error={run.error} onRetry={onRun} onRestore={onRestore} artifact={artifact} provider={status?.provider} />
      )}
      {run.status === 'done' && (
        <Findings
          result={run.result}
          title={props.title}
          context={props.context}
          review={props.review}
          onReview={props.onReview}
          tab={props.tab}
          onTab={props.onTab}
          activeRef={props.activeRef}
          scrollTarget={props.scrollTarget}
          onSelect={props.onSelect}
          onShowEvidence={props.onShowEvidence}
          onRerun={onRun}
          stale={props.stale}
          onNotify={props.onNotify}
          onPreviewAttachment={props.onPreviewAttachment}
          allAttachments={props.allAttachments}
          onOpenCountryLibrary={props.onOpenCountryLibrary}
          activeFilter={props.activeFilter}
          onClearFilter={props.onClearFilter}
          onNavigateMetric={props.onNavigateMetric}
        />
      )}
    </section>
  );
}
