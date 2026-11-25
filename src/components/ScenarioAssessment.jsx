import { Brain, Check, CircleCheck, CircleX, Equal, LoaderCircle, RotateCcw, Scale, Square } from 'lucide-react';
import { ASSESS_STAGES } from '../../shared/assess.js';
import { compareWithReference } from '../../shared/scenarios/compare.js';
import { computeClaimDecision } from '../../shared/decision.js';
import FinalDecisionCard from './FinalDecisionCard.jsx';
import { useNow } from '../lib/hooks.js';
import { formatClock, formatDuration, plural, prettyModel } from '../lib/format.js';
import { BulletList, IntentTag, RiskBadge, SectionHeading } from './ScenarioBits.jsx';
import { Button, CopyButton, ExhibitTag, MatchBadge, cx } from './ui.jsx';

const ERROR_TITLE = {
  NO_API_KEY: 'Add an API key first',
  AUTH: 'The API key was rejected',
  BILLING: 'The API account needs credit',
  RATE_LIMITED: 'The model is busy',
  LOCAL_RATE_LIMIT: 'Too many requests in a row',
  OVERLOADED: 'The model is overloaded',
  TIMEOUT: 'The assessment took too long',
  SERVER_DOWN: "Can't reach the FaultLine server",
  NO_RUNTIME: 'Open this page on claude.ai',
  NOT_GRANTED: 'FaultLine needs permission to ask Claude',
  INCOMPLETE: 'The assessment was interrupted',
  REFUSED: 'The model declined this case',
  TOO_LONG: 'The assessment ran too long',
  BAD_OUTPUT: 'The answer came back in the wrong format',
};

const WEIGHT_LABEL = { strong: 'Strong', moderate: 'Moderate', weak: 'Weak' };

function counter(stage, counts = {}) {
  if (stage === 1 && (counts.supporting || counts.against)) return `${counts.supporting ?? 0} for, ${counts.against ?? 0} against`;
  if (stage === 2 && counts.indicators) return plural(counts.indicators, 'warning sign');
  if (stage === 3 && counts.missing) return `${counts.missing} missing`;
  if (stage === 4 && counts.questions) return plural(counts.questions, 'question');
  return '';
}

function Running({ run, onCancel }) {
  const now = useNow(true, 500);
  const stage = run.progress?.stage ?? 0;
  return (
    <div className="rounded-[9px] border border-rule bg-sheet p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[15px] font-semibold">
          <LoaderCircle className="size-4 animate-spin text-pen" aria-hidden="true" />
          Assessing the claim file
          <span className="font-normal tabular text-ink-3">{formatClock(now - run.startedAt)}</span>
        </p>
        <Button variant="secondary" size="sm" onClick={onCancel}>
          <Square className="size-3.5" aria-hidden="true" />
          Stop
        </Button>
      </div>
      <ol className="mt-4 space-y-2">
        {ASSESS_STAGES.map((label, i) => {
          const done = i < stage;
          const current = i === stage;
          const detail = counter(i, run.progress?.counts);
          return (
            <li key={label} className={cx('flex items-center gap-2.5 text-[14px]', done ? 'text-ink' : current ? 'font-medium text-ink' : 'text-ink-3')}>
              <span className="flex size-4 items-center justify-center">
                {done ? (
                  <Check className="size-4 text-agree" strokeWidth={2.6} aria-hidden="true" />
                ) : current ? (
                  <LoaderCircle className="size-4 animate-spin text-pen" aria-hidden="true" />
                ) : (
                  <span className="size-1.5 rounded-full bg-ink-3/50" />
                )}
              </span>
              {label}
              {detail && <span className="text-[13px] font-normal text-ink-3">{detail}</span>}
            </li>
          );
        })}
      </ol>
      {stage === 0 && run.progress?.reasoning && (
        <p className="mt-4 flex items-start gap-2 border-t border-rule pt-3 text-[13.5px] text-ink-2">
          <Brain className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden="true" />
          <span>
            <span className="font-medium text-ink">Now:</span> {run.progress.reasoning}
          </span>
        </p>
      )}
    </div>
  );
}

const MATCH_ICON = { match: CircleCheck, near: Equal, differs: CircleX };
const MATCH_TEXT = { match: 'Same', near: 'Close', differs: 'Different' };
const OVERALL = {
  agrees: { title: 'Agrees with the reference', cls: 'border-agree/40 bg-agree-wash', icon: CircleCheck, iconCls: 'text-agree-ink' },
  close: { title: 'Close to the reference', cls: 'border-minor/50 bg-minor-wash', icon: Equal, iconCls: 'text-minor-ink' },
  differs: { title: 'Differs from the reference', cls: 'border-rule-strong bg-paper', icon: CircleX, iconCls: 'text-ink-2' },
};

function Comparison({ comparison }) {
  if (!comparison) return null;
  const o = OVERALL[comparison.overall];
  const Icon = o.icon;
  // One row per measure. On a phone: the measure and the verdict, then each call on its own line;
  // from small screens up: measure, AI call, reference call and verdict side by side.
  const row = (label, part, ai, ref) => {
    const MIcon = MATCH_ICON[part.match];
    return (
      <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 py-2.5 sm:grid-cols-[80px_1fr_1fr_90px]">
        <span className="text-[13px] font-medium text-ink-2">{label}</span>
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink sm:order-last">
          <MIcon className="size-4 text-ink-2" aria-hidden="true" />
          {MATCH_TEXT[part.match]}
        </span>
        <span className="col-span-2 flex flex-wrap items-center gap-2 text-[13px] text-ink-3 sm:col-span-1">AI {ai}</span>
        <span className="col-span-2 flex flex-wrap items-center gap-2 text-[13px] text-ink-3 sm:col-span-1">Reference {ref}</span>
      </div>
    );
  };
  return (
    <div className={cx('rounded-[9px] border p-4', o.cls)}>
      <p className="flex items-center gap-2 text-[15px] font-semibold text-ink">
        <Icon className={cx('size-5', o.iconCls)} aria-hidden="true" />
        {o.title}
      </p>
      <div className="mt-2 divide-y divide-ink/10">
        {row('Intent', comparison.intent, <IntentTag intent={comparison.intent.ai} />, <IntentTag intent={comparison.intent.reference} />)}
        {row('Risk', comparison.risk, <RiskBadge risk={comparison.risk.ai} />, <RiskBadge risk={comparison.risk.reference} />)}
      </div>
    </div>
  );
}

function EvidenceItem({ item, labels, onSelectExhibit }) {
  const { match } = item;
  return (
    <li className="rounded-[8px] border border-rule bg-sheet p-3.5 transition-all duration-150 hover:border-rule-strong">
      <p className="text-[14.5px] leading-snug text-ink">{item.point}</p>
      {item.quote && (
        <figure
          onClick={() => onSelectExhibit?.(item.exhibit)}
          className={cx(
            'mt-2.5 rounded-[7px] border px-3 py-2.5 transition-all duration-150 group',
            onSelectExhibit ? 'cursor-pointer hover:border-pen/60 hover:shadow-2xs active:scale-[0.995]' : '',
            match?.status === 'missing' ? 'border-critical/30 bg-critical-wash/40' : 'border-rule bg-paper/70',
          )}
          title={onSelectExhibit ? `Click to view Exhibit ${item.exhibit} in Case File` : undefined}
        >
          <figcaption className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px]">
            <ExhibitTag id={item.exhibit} label={labels[item.exhibit]} />
            <span className="min-w-0 max-w-[30ch] truncate font-medium text-ink-2 group-hover:text-pen transition-colors">
              {labels[item.exhibit]}
            </span>
            <MatchBadge match={match} />
            {match?.citedAs && <span className="text-[12px] text-ink-3">(model cited exhibit {match.citedAs})</span>}
            {item.weight && (
              <span className="ml-auto rounded bg-ink/[0.055] px-1.5 py-0.5 text-[12px] font-semibold text-ink-2">{WEIGHT_LABEL[item.weight]} sign</span>
            )}
          </figcaption>
          <blockquote className="quote-text mt-1.5 text-ink">“{item.quote}”</blockquote>
        </figure>
      )}
    </li>
  );
}

function EvidenceList({ title, items, labels, empty, onSelectExhibit }) {
  return (
    <section>
      <SectionHeading count={items.length || undefined}>{title}</SectionHeading>
      {items.length ? (
        <ul className="mt-2.5 space-y-2.5">
          {items.map((item, i) => (
            <EvidenceItem key={i} item={item} labels={labels} onSelectExhibit={onSelectExhibit} />
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 text-[14.5px] text-ink-3">{empty}</p>
      )}
    </section>
  );
}

function questionsText(result, scenario) {
  const groups = new Map();
  for (const q of result.questions) {
    if (!groups.has(q.ask)) groups.set(q.ask, []);
    groups.get(q.ask).push(q.question);
  }
  const lines = [`Questions for scenario ${scenario.id}: ${scenario.title}`, ''];
  for (const [ask, qs] of groups) {
    lines.push(`${ask}:`);
    qs.forEach((q) => lines.push(`- ${q}`));
    lines.push('');
  }
  return lines.join('\n').trim();
}

function Result({ result, scenario, onAssess, onNotify, onSelectExhibit }) {
  const labels = Object.fromEntries(result.meta.exhibits.map((e) => [e.id, e.label]));
  const comparison = compareWithReference(result, scenario);
  const decision = computeClaimDecision({ assessment: result, scenario });
  const qc = result.quoteCheck;
  const groups = new Map();
  for (const q of result.questions) {
    if (!groups.has(q.ask)) groups.set(q.ask, []);
    groups.get(q.ask).push(q.question);
  }
  const handleNavigateMetric = (metric) => {
    let targetId = null;
    if (metric === 'supporting') targetId = 'scenario-supporting-evidence';
    else if (metric === 'unresolved') targetId = 'scenario-missing-evidence';
    else if (metric === 'conflicts') targetId = 'scenario-against-evidence';
    if (targetId) {
      document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="space-y-7">
      <FinalDecisionCard
        decision={decision}
        title={scenario.title}
        result={result}
        scenario={scenario}
        onRerun={onAssess}
        onNotify={onNotify}
        onSelectExhibit={onSelectExhibit}
        onNavigateMetric={handleNavigateMetric}
      />

      <Comparison comparison={comparison} />

      <section className="rounded-[9px] border border-rule bg-sheet p-5">
        <div className="flex flex-wrap items-center gap-2">
          <IntentTag intent={result.intent} />
          <RiskBadge risk={result.risk} />
          <span className="text-[13px] text-ink-3">{Math.round(result.confidence * 100)}% confident</span>
        </div>
        <h3 className="mt-4 text-[15px] font-semibold">What most likely happened</h3>
        <p className="mt-1.5 text-[15px] leading-relaxed text-ink">{result.summary}</p>
        <h3 className="mt-4 text-[15px] font-semibold">Why it reached this assessment</h3>
        <p className="mt-1.5 text-[15px] leading-relaxed text-ink">{result.reasoning}</p>
      </section>

      <div className="grid gap-7 xl:grid-cols-2">
        <div id="scenario-supporting-evidence">
          <EvidenceList title="Evidence supporting the claimant" items={result.supporting} labels={labels} empty="None identified." onSelectExhibit={onSelectExhibit} />
        </div>
        <div id="scenario-against-evidence">
          <EvidenceList title="Evidence against the claim" items={result.against} labels={labels} empty="None identified." onSelectExhibit={onSelectExhibit} />
        </div>
      </div>

      <EvidenceList title="Suspicious indicators" items={result.indicators} labels={labels} empty="No suspicious indicators found." onSelectExhibit={onSelectExhibit} />

      <div className="grid gap-7 md:grid-cols-2">
        <section>
          <SectionHeading>Possible innocent explanations</SectionHeading>
          <BulletList items={result.innocent} />
        </section>
        <section>
          <SectionHeading>Potential risks</SectionHeading>
          <BulletList items={result.risks} />
        </section>
      </div>

      <section id="scenario-missing-evidence">
        <SectionHeading count={result.missing.length || undefined}>Missing evidence</SectionHeading>
        {result.missing.length ? (
          <ul className="mt-2 space-y-2 text-[14.5px] leading-relaxed">
            {result.missing.map((m, i) => (
              <li key={i}>
                <span className="font-semibold text-ink">{m.item}.</span> <span className="text-ink-2">{m.why}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1.5 text-[14.5px] text-ink-3">Nothing important is missing.</p>
        )}
      </section>

      <section>
        <div className="flex items-center justify-between gap-3">
          <SectionHeading count={result.questions.length || undefined}>Investigation questions</SectionHeading>
          {result.questions.length > 0 && (
            <CopyButton text={questionsText(result, scenario)} label="Copy questions" onCopied={() => onNotify?.('Questions copied')} />
          )}
        </div>
        {[...groups.entries()].map(([ask, qs]) => (
          <div key={ask} className="mt-3">
            <p className="text-[13px] font-semibold text-ink-2">{ask}</p>
            <BulletList items={qs} className="mt-1" />
          </div>
        ))}
      </section>

      <div className="grid gap-7 md:grid-cols-2">
        <section>
          <SectionHeading>Investigation steps</SectionHeading>
          <BulletList items={result.steps} ordered />
        </section>
        <section>
          <SectionHeading>Recommended next actions</SectionHeading>
          <BulletList items={result.nextActions} ordered />
        </section>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-4 text-[13px] text-ink-3">
        <span>
          {prettyModel(result.meta.model) || result.meta.provider} in {formatDuration(result.meta.ms)}.{' '}
          {qc.total
            ? `${qc.exact} of ${plural(qc.total, 'quote')} found word for word${qc.close ? `, ${qc.close} close` : ''}${qc.missing ? `, ${qc.missing} not found` : ''}.`
            : 'No quotes to check.'}
        </span>
        <Button variant="secondary" size="sm" onClick={onAssess}>
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Assess again
        </Button>
      </div>
    </div>
  );
}

export default function ScenarioAssessment({ scenario, run, status, onAssess, onCancel, onRestore, onNotify, onSelectExhibit }) {
  if (run?.status === 'running') return <Running run={run} onCancel={onCancel} />;
  if (run?.status === 'done') return <Result result={run.result} scenario={scenario} onAssess={onAssess} onNotify={onNotify} onSelectExhibit={onSelectExhibit} />;

  const offline = status && !status.reachable;
  const missingKey = status?.reachable && !status.configured;
  return (
    <div className="space-y-4">
      {run?.status === 'error' && (
        <div className="rounded-[9px] border border-critical/30 bg-critical-wash p-4">
          <p className="text-[15px] font-semibold text-critical-ink">{ERROR_TITLE[run.error.code] ?? 'The assessment failed'}</p>
          <p className="mt-1 text-[14.5px] text-ink">{run.error.message}</p>
          {run.previous && onRestore && (
            <Button variant="secondary" size="sm" className="mt-3" onClick={onRestore}>
              Show the previous assessment
            </Button>
          )}
        </div>
      )}
      <div className="rounded-[9px] border border-rule bg-sheet p-5">
        <p className="max-w-[68ch] text-[15px] leading-relaxed text-ink-2">
          The AI reads only the case file: the notification, the statements and the evidence on file. It never sees the reference answers, so you
          can compare its call with them afterwards. It explains what probably happened, weighs the evidence for and against, flags warning signs,
          suggests innocent explanations and questions, and recommends next steps, quoting the documents for every point.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button onClick={onAssess}>
            <Scale className="size-4" aria-hidden="true" />
            {run?.status === 'error' ? 'Try again' : 'Assess with AI'}
          </Button>
          {offline && (
            <span className="text-[13.5px] text-ink-3">
              {status.mode === 'artifact' ? 'Assessments run when this page is opened on claude.ai.' : 'The FaultLine server is offline. Start it with npm run dev.'}
            </span>
          )}
          {missingKey && <span className="text-[13.5px] text-ink-3">Add an API key to .env first, then save the file.</span>}
        </div>
      </div>
    </div>
  );
}
