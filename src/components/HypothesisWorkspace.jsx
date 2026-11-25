import { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Scale,
  CheckCircle2,
  AlertTriangle,
  FileSearch,
  Sparkles,
  ArrowRight,
  Save,
  Check,
  Compass,
} from 'lucide-react';
import { ExhibitTag, cx } from './ui.jsx';
import { evaluateCompetingHypotheses, HYPOTHESIS_IDS } from '../../server/intelligence/hypothesis.js';

export default function HypothesisWorkspace({
  exhibits = [],
  caseId = null,
  title = '',
  jurisdiction = 'UK',
  onNotify,
}) {
  const [evaluation, setEvaluation] = useState(null);
  const [selectedHypothesis, setSelectedHypothesis] = useState(null);
  const [rationale, setRationale] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (exhibits && exhibits.length > 0) {
      // Evaluate natively in-browser
      const res = evaluateCompetingHypotheses(exhibits);
      setEvaluation(res);
      if (res?.primaryHypothesis?.id) {
        setSelectedHypothesis(res.primaryHypothesis.id);
      }
    }
  }, [exhibits]);

  // Load existing decision memory if caseId exists
  useEffect(() => {
    if (caseId) {
      fetch(`/api/intelligence/decision-memory/${encodeURIComponent(caseId)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.decision?.selectedHypothesis) {
            setSelectedHypothesis(data.decision.selectedHypothesis);
            if (data.decision.hypothesisRationale) {
              setRationale(data.decision.hypothesisRationale);
            }
          }
        })
        .catch(() => {});
    }
  }, [caseId]);

  const handleSaveDecisionMemory = async () => {
    if (!caseId) {
      onNotify?.('Case must be saved or opened to persist decision memory.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/api/intelligence/decision-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          investigationId: caseId,
          selectedHypothesis,
          hypothesisRationale: rationale,
        }),
      });

      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
        onNotify?.('Investigator hypothesis appraisal persisted to immutable audit trail.');
      } else {
        const err = await res.json();
        onNotify?.(err.error || 'Failed to save hypothesis decision.');
      }
    } catch {
      onNotify?.('Network error saving decision memory.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!evaluation || !evaluation.hypotheses?.length) {
    return (
      <div className="rounded-[8px] border border-rule bg-sheet p-8 text-center">
        <Scale className="mx-auto size-10 text-ink-3 mb-3" />
        <h3 className="text-[16px] font-semibold text-ink">Competing Hypothesis Workspace</h3>
        <p className="mt-1 text-[14px] text-ink-2 max-w-[50ch] mx-auto">
          Add or load at least two exhibits into the investigation to evaluate competing causal explanations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Narrative Synthesis Banner */}
      <div className="rounded-[8px] border border-pen/20 bg-pen-wash/50 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Compass className="size-5 shrink-0 text-pen mt-0.5" />
          <div className="min-w-0">
            <h3 className="text-[15.5px] font-semibold text-ink">
              Multi-Hypothesis Evidentiary Balance
            </h3>
            <p className="mt-1 text-[14.5px] leading-relaxed text-ink-2">
              {evaluation.investigatorSummary}
            </p>
          </div>
        </div>
      </div>

      {/* 3 Hypotheses Cards */}
      <div className="grid gap-5 lg:grid-cols-3">
        {evaluation.hypotheses.map((hypo) => {
          const isSelected = selectedHypothesis === hypo.id;
          const isPrimary = evaluation.primaryHypothesis.id === hypo.id;
          const isContradicted = hypo.status === 'CONTRADICTED_BY_PHYSICAL_FACTS';

          return (
            <div
              key={hypo.id}
              onClick={() => setSelectedHypothesis(hypo.id)}
              className={cx(
                'cursor-pointer relative flex flex-col justify-between rounded-[9px] border p-4.5 transition-all shadow-xs',
                isSelected
                  ? 'border-pen ring-2 ring-pen/20 bg-sheet'
                  : 'border-rule bg-sheet hover:border-rule-strong hover:shadow-sm',
              )}
            >
              <div>
                {/* Header Badges */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span className="font-mono text-[12px] font-bold px-2 py-0.5 rounded bg-ink/5 text-ink-2">
                    {hypo.code}
                  </span>
                  <span
                    className={cx(
                      'text-[11.5px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider',
                      hypo.status === 'STRONGLY_SUPPORTED'
                        ? 'bg-agree-wash text-agree-ink border border-agree/30'
                        : isContradicted
                        ? 'bg-critical-wash text-critical-ink border border-critical/30'
                        : 'bg-minor-wash text-minor-ink border border-minor/30',
                    )}
                  >
                    {hypo.status.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Title & Description */}
                <h4 className="text-[15px] font-semibold text-ink leading-snug">
                  {hypo.title}
                </h4>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">
                  {hypo.description}
                </p>

                {/* Net Evidence Score Bar */}
                <div className="mt-4 pt-3 border-t border-rule/60">
                  <div className="flex items-center justify-between text-[12.5px]">
                    <span className="font-medium text-ink-3">Net Evidence Weight</span>
                    <span
                      className={cx(
                        'font-bold font-mono',
                        hypo.netEvidenceScore > 0 ? 'text-agree' : hypo.netEvidenceScore < 0 ? 'text-critical' : 'text-ink-3',
                      )}
                    >
                      {hypo.netEvidenceScore > 0 ? `+${hypo.netEvidenceScore}` : hypo.netEvidenceScore} pts
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full bg-rule rounded-full overflow-hidden">
                    <div
                      className={cx(
                        'h-full transition-all rounded-full',
                        hypo.netEvidenceScore > 0 ? 'bg-agree' : 'bg-critical',
                      )}
                      style={{
                        width: `${Math.min(100, Math.max(10, Math.abs(hypo.netEvidenceScore) * 12))}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Supporting Points */}
                <div className="mt-4">
                  <span className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">
                    Supporting Proof ({hypo.supportingEvidence.length})
                  </span>
                  {hypo.supportingEvidence.length > 0 ? (
                    <ul className="mt-1.5 space-y-1.5">
                      {hypo.supportingEvidence.map((s, idx) => (
                        <li key={idx} className="text-[12.5px] leading-tight text-ink-2 flex items-start gap-1.5">
                          <CheckCircle2 className="size-3.5 shrink-0 text-agree mt-0.5" />
                          <div>
                            <span className="font-semibold text-ink">Exhibit {s.exhibitId}:</span> {s.rationale}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-[12px] text-ink-3 italic">None identified in exhibits</p>
                  )}
                </div>

                {/* Contradicting Points */}
                {hypo.contradictingEvidence.length > 0 && (
                  <div className="mt-3">
                    <span className="text-[12px] font-semibold uppercase tracking-wider text-critical-ink">
                      Contradicting Facts ({hypo.contradictingEvidence.length})
                    </span>
                    <ul className="mt-1.5 space-y-1.5">
                      {hypo.contradictingEvidence.map((c, idx) => (
                        <li key={idx} className="text-[12.5px] leading-tight text-critical-ink flex items-start gap-1.5">
                          <AlertTriangle className="size-3.5 shrink-0 text-critical mt-0.5" />
                          <div>
                            <span className="font-semibold text-critical">Exhibit {c.exhibitId}:</span> {c.rationale}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Selection Radio / Action Button */}
              <div className="mt-5 pt-3 border-t border-rule/60 flex items-center justify-between">
                <span className="text-[12px] font-medium text-ink-3">
                  {isSelected ? '✔ Selected Working Theory' : 'Click to select hypothesis'}
                </span>
                <input
                  type="radio"
                  name="selectedHypothesis"
                  checked={isSelected}
                  onChange={() => setSelectedHypothesis(hypo.id)}
                  className="size-4 text-pen focus:ring-pen"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Decisive Discriminators & Action Plan */}
      {evaluation.criticalDiscriminators?.length > 0 && (
        <div className="rounded-[8px] border border-rule bg-sheet p-5">
          <h4 className="text-[15px] font-semibold text-ink flex items-center gap-2">
            <FileSearch className="size-4.5 text-pen" />
            Decisive Forensic Discriminators
          </h4>
          <p className="mt-1 text-[13.5px] text-ink-2">
            Execute these targeted forensic steps to definitively discriminate between the competing hypotheses:
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {evaluation.criticalDiscriminators.map((disc, idx) => (
              <div
                key={idx}
                className="rounded-[7px] border border-rule/80 bg-paper/60 p-3.5 text-[13px] flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between font-semibold text-ink">
                    <span>{disc.testName}</span>
                    <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-ink/5 text-ink-3">
                      Priority #{disc.rank}
                    </span>
                  </div>
                  <p className="mt-1 text-ink-2">{disc.purpose}</p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-rule/50 text-[12px] text-ink-3">
                  Target: <span className="font-medium text-ink-2">{disc.targetExhibit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Investigator Decision Memory Persister */}
      <div className="rounded-[8px] border border-rule bg-sheet p-5">
        <h4 className="text-[15px] font-semibold text-ink flex items-center gap-2">
          <Save className="size-4.5 text-pen" />
          Investigator Decision Memory & Case History
        </h4>
        <p className="mt-1 text-[13.5px] text-ink-2">
          Record your endorsed working hypothesis and forensic rationale. All hypothesis changes are signed and appended to the immutable SHA-256 audit trail.
        </p>

        <div className="mt-3">
          <label className="block text-[13px] font-medium text-ink-2 mb-1.5">
            Investigator Rationale & Justification Notes
          </label>
          <textarea
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            placeholder="Record evidence justification, rationale for selected hypothesis, and pending verifications..."
            rows={3}
            className="w-full rounded-[6px] border border-rule bg-paper px-3 py-2 text-[14px] text-ink placeholder:text-ink-3 focus:border-pen focus:outline-hidden"
          />
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-[12px] text-ink-3">
            {savedSuccess ? '✔ Cryptographically chained to audit trail.' : 'Stored in auditEvents.json & decisions.json'}
          </span>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveDecisionMemory}
            className={cx(
              'inline-flex items-center gap-2 rounded-[6px] px-4 py-2 text-[13.5px] font-semibold transition-colors',
              savedSuccess
                ? 'bg-agree text-white'
                : 'bg-pen hover:bg-pen-dark text-white',
            )}
          >
            {savedSuccess ? (
              <>
                <Check className="size-4" />
                Saved to Audit Trail
              </>
            ) : (
              <>
                <Save className="size-4" />
                {isSaving ? 'Signing Audit...' : 'Save Working Hypothesis'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Safeguard Notice */}
      <div className="rounded-[7px] border border-rule bg-paper/60 px-4 py-3 text-[12.5px] text-ink-3 flex items-center gap-2">
        <ShieldCheck className="size-4 shrink-0 text-ink-2" />
        <span>{evaluation.safeguardNotice}</span>
      </div>
    </div>
  );
}
