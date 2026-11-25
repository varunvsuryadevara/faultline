import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Columns2,
  Copy,
  Eye,
  FileText,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react';
import { EVIDENCE_CATEGORIES, EXHIBIT_IDS, EXHIBIT_KINDS, LIMITS } from '../../shared/constants.js';
import ConfirmDialog from './ConfirmDialog.jsx';
import ExhibitEditorModal from './ExhibitEditorModal.jsx';
import ScenarioEditorModal from './ScenarioEditorModal.jsx';
import { Button, ExhibitTag } from './ui.jsx';

const KIND_LABEL = Object.fromEntries(EXHIBIT_KINDS.map((k) => [k.value, k.label]));
const CATEGORY_LABEL = Object.fromEntries(EVIDENCE_CATEGORIES.map((c) => [c.value, c.label]));

export default function ScenarioCaseFile({
  scenario,
  caseFile,
  originalCaseFile,
  isModified,
  isCustom,
  versions = [],
  onChangeCaseFile,
  onSaveScenario,
  onDuplicateScenario,
  onResetToOriginal,
  onSwitchVersion,
  onNotify,
}) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditingScenario, setIsEditingScenario] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [collapsedExhibits, setCollapsedExhibits] = useState({});
  const [compareMode, setCompareMode] = useState(false);
  const [compareLeft, setCompareLeft] = useState(0);
  const [compareRight, setCompareRight] = useState(1);

  const exhibits = caseFile?.exhibits || [];
  const nextIdentifier = EXHIBIT_IDS[exhibits.length] || `X${exhibits.length + 1}`;

  const toggleCollapse = (idx) => {
    setCollapsedExhibits((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleOpenEdit = (index) => {
    setEditingIndex(index);
  };

  const handleSaveExhibit = (updated) => {
    if (editingIndex !== null) {
      const nextExhibits = exhibits.map((e, i) => (i === editingIndex ? { ...e, ...updated } : e));
      onChangeCaseFile({ ...caseFile, exhibits: nextExhibits });
      setEditingIndex(null);
      onNotify?.(`Exhibit ${EXHIBIT_IDS[editingIndex]} updated`);
    } else if (isAdding) {
      const nextExhibits = [
        ...exhibits,
        {
          key: `ex-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          ...updated,
        },
      ];
      onChangeCaseFile({ ...caseFile, exhibits: nextExhibits });
      setIsAdding(false);
      onNotify?.(`Exhibit ${EXHIBIT_IDS[exhibits.length]} added`);
    }
  };

  const handleDuplicateExhibit = (index) => {
    if (exhibits.length >= LIMITS.maxExhibits) {
      onNotify?.(`Maximum of ${LIMITS.maxExhibits} exhibits allowed.`);
      return;
    }
    const source = exhibits[index];
    const newExhibit = {
      ...source,
      key: `ex-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label: `${source.label || `Exhibit ${EXHIBIT_IDS[index]}`} (Copy)`,
      attachments: source.attachments ? [...source.attachments] : [],
    };
    const nextExhibits = [...exhibits, newExhibit];
    onChangeCaseFile({ ...caseFile, exhibits: nextExhibits });
    onNotify?.(`Duplicated Exhibit ${EXHIBIT_IDS[index]} to Exhibit ${EXHIBIT_IDS[nextExhibits.length - 1]}`);
  };

  const handleConfirmDelete = () => {
    if (deleteIndex === null) return;
    const deletedLetter = EXHIBIT_IDS[deleteIndex];
    if (exhibits.length <= LIMITS.minExhibits) {
      onNotify?.(`A case must contain at least ${LIMITS.minExhibits} exhibits.`);
      setDeleteIndex(null);
      return;
    }
    const nextExhibits = exhibits.filter((_, i) => i !== deleteIndex);
    onChangeCaseFile({ ...caseFile, exhibits: nextExhibits });
    setDeleteIndex(null);
    onNotify?.(`Exhibit ${deletedLetter} removed. Exhibits renumbered.`);
  };

  const handleConfirmReset = () => {
    setShowResetConfirm(false);
    onResetToOriginal?.();
    onNotify?.('Restored original predefined scenario exhibits');
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Action Controls */}
      <div className="rounded-[12px] border border-rule bg-sheet p-5 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[16px] font-bold text-ink">Case File Documents</span>
              <span className="tabular rounded-full bg-paper border border-rule px-2.5 py-0.5 text-[12px] font-bold text-ink-2">
                {exhibits.length} Exhibits
              </span>
              {isCustom ? (
                <span className="rounded bg-pen-wash text-pen-dark border border-pen/30 px-2.5 py-0.5 text-[12px] font-bold dark:bg-pen/15 dark:text-pen">
                  Customised Version
                </span>
              ) : isModified ? (
                <span className="rounded bg-major-wash text-major-ink border border-major/40 px-2.5 py-0.5 text-[12px] font-bold dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-500/30">
                  Unsaved Modifications
                </span>
              ) : (
                <span className="rounded bg-card-elevated text-ink-2 border border-rule px-2.5 py-0.5 text-[12px] font-medium">
                  Original Predefined Exhibits
                </span>
              )}
            </div>
            <p className="mt-1 text-[13.5px] text-ink-2">
              All statements and documents on the claim file. AI cross-examination and blind assessments run strictly on these exhibits.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsAdding(true)}
              disabled={exhibits.length >= LIMITS.maxExhibits}
            >
              <Plus className="size-4" aria-hidden="true" />
              Add Exhibit
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setIsEditingScenario(true)}>
              <Pencil className="size-3.5" aria-hidden="true" />
              Edit Scenario
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={onSaveScenario}
              disabled={!isModified && isCustom}
            >
              <Save className="size-3.5" aria-hidden="true" />
              Save Changes
            </Button>
            <Button variant="secondary" size="sm" onClick={onDuplicateScenario}>
              <Copy className="size-3.5" aria-hidden="true" />
              Duplicate
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowResetConfirm(true)}
              disabled={!isModified && !isCustom}
              className="text-ink-3 hover:text-ink"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              Reset
            </Button>
            {exhibits.length >= 2 && (
              <Button
                variant={compareMode ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setCompareMode(!compareMode)}
                title="Compare two exhibits side-by-side"
              >
                <Columns2 className="size-3.5" />
                {compareMode ? 'Exit Compare' : 'Compare Side-by-Side'}
              </Button>
            )}
          </div>
        </div>

        {/* Versions selector if user has saved multiple customised versions */}
        {versions && versions.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-rule pt-3 text-[13px]">
            <span className="font-semibold text-ink-3">Saved Versions:</span>
            <button
              type="button"
              onClick={() => onSwitchVersion('original')}
              className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${
                !isCustom && !isModified
                  ? 'bg-pen text-white'
                  : 'bg-paper border border-rule text-ink hover:bg-hover'
              }`}
            >
              Original ({originalCaseFile?.scenarioId || scenario.id})
            </button>
            {versions.map((ver) => (
              <button
                key={ver.id}
                type="button"
                onClick={() => onSwitchVersion(ver.id)}
                className={`rounded-md px-2.5 py-1 font-semibold transition-colors ${
                  scenario.id === ver.id
                    ? 'bg-pen text-white'
                    : 'bg-paper text-ink hover:bg-pen/10'
                }`}
              >
                {ver.title.length > 30 ? `${ver.title.slice(0, 30)}…` : ver.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Side-by-Side Comparison Mode */}
      {compareMode && exhibits.length >= 2 && (
        <div className="rounded-[12px] border-2 border-pen/40 bg-sheet p-5 shadow-sm space-y-4 animate-scale-in">
          <div className="flex items-center justify-between border-b border-rule pb-3">
            <div className="flex items-center gap-2">
              <Columns2 className="size-4 text-pen" />
              <h4 className="text-[14.5px] font-bold text-ink">Side-by-Side Exhibit Comparison</h4>
            </div>
            <button
              type="button"
              onClick={() => setCompareMode(false)}
              className="text-[13px] font-semibold text-ink-3 hover:text-ink"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left selector */}
            <div className="rounded-lg border border-rule bg-paper p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-bold text-pen">Exhibit 1</span>
                <select
                  value={compareLeft}
                  onChange={(e) => setCompareLeft(Number(e.target.value))}
                  className="rounded border border-rule bg-sheet px-2 py-1 text-[13px] font-semibold text-ink"
                >
                  {exhibits.map((e, idx) => (
                    <option key={idx} value={idx}>
                      Exhibit {EXHIBIT_IDS[idx]}: {e.label || `Exhibit ${EXHIBIT_IDS[idx]}`}
                    </option>
                  ))}
                </select>
              </div>
              <h5 className="font-bold text-[14px] text-ink">{exhibits[compareLeft]?.label}</h5>
              <p className="mt-2 text-[14px] leading-relaxed text-ink font-serif whitespace-pre-wrap bg-sheet p-3 rounded border border-rule">
                {exhibits[compareLeft]?.text}
              </p>
            </div>

            {/* Right selector */}
            <div className="rounded-lg border border-rule bg-paper p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[12px] font-bold text-pen">Exhibit 2</span>
                <select
                  value={compareRight}
                  onChange={(e) => setCompareRight(Number(e.target.value))}
                  className="rounded border border-rule bg-sheet px-2 py-1 text-[13px] font-semibold text-ink"
                >
                  {exhibits.map((e, idx) => (
                    <option key={idx} value={idx}>
                      Exhibit {EXHIBIT_IDS[idx]}: {e.label || `Exhibit ${EXHIBIT_IDS[idx]}`}
                    </option>
                  ))}
                </select>
              </div>
              <h5 className="font-bold text-[14px] text-ink">{exhibits[compareRight]?.label}</h5>
              <p className="mt-2 text-[14px] leading-relaxed text-ink font-serif whitespace-pre-wrap bg-sheet p-3 rounded border border-rule">
                {exhibits[compareRight]?.text}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Exhibit Cards */}
      <div className="space-y-4">
        {exhibits.map((e, i) => {
          const id = EXHIBIT_IDS[i] || `X${i + 1}`;
          const kindLabel = KIND_LABEL[e.kind] ?? e.kind;
          const categoryLabel = CATEGORY_LABEL[e.category] ?? e.category;
          const isCollapsed = collapsedExhibits[i];

          return (
            <article
              key={e.key || i}
              id={`exhibit-${id}`}
              className="group rounded-[10px] border border-rule bg-sheet shadow-2xs transition-all duration-200 hover:border-pen/60 hover:shadow-sm scroll-mt-24"
              aria-label={`Exhibit ${id}: ${e.label}`}
            >
              {/* Card Header */}
              <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-rule px-5 py-3 bg-sheet rounded-t-[10px]">
                <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                  <span className="flex size-6 items-center justify-center rounded bg-manila font-bold text-manila-ink text-[12px]">
                    {id}
                  </span>
                  <h3 className="truncate text-[15px] font-bold text-ink">
                    {e.label || `Exhibit ${id}`}
                  </h3>
                  <span className="rounded bg-paper px-2 py-0.5 text-[11.5px] font-semibold text-ink-2 border border-rule">
                    {kindLabel}
                  </span>
                </div>

                {/* Exhibit Actions */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleCollapse(i)}
                    className="h-8 px-2 text-[12.5px] text-ink-3 hover:text-ink"
                    title={isCollapsed ? 'Expand exhibit' : 'Collapse exhibit preview'}
                  >
                    {isCollapsed ? <ChevronDown className="size-3.5" /> : <ChevronUp className="size-3.5" />}
                    {isCollapsed ? 'Expand' : 'Collapse'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenEdit(i)}
                    className="h-8 px-2 text-[12.5px] font-semibold text-pen hover:bg-pen/10"
                    title={`Edit Exhibit ${id}`}
                  >
                    <Pencil className="size-3.5" aria-hidden="true" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDuplicateExhibit(i)}
                    className="h-8 px-2 text-[12.5px] text-ink-3 hover:text-ink"
                    title={`Duplicate Exhibit ${id}`}
                  >
                    <Copy className="size-3.5" aria-hidden="true" />
                    Duplicate
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteIndex(i)}
                    disabled={exhibits.length <= LIMITS.minExhibits}
                    className="h-8 px-2 text-[12.5px] text-rose-700 hover:bg-rose-50 disabled:opacity-30"
                    title={`Delete Exhibit ${id}`}
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                    Delete
                  </Button>
                </div>
              </header>

              {/* Exhibit Metadata Row */}
              {(e.person || e.dateTime || e.category || e.description) && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-rule/60 bg-paper/60 px-5 py-2 text-[12px] text-ink-2">
                  {e.person && (
                    <span>
                      <strong className="font-semibold text-ink">Party:</strong> {e.person}
                    </span>
                  )}
                  {e.dateTime && (
                    <span>
                      <strong className="font-semibold text-ink">Date/Time:</strong> {e.dateTime}
                    </span>
                  )}
                  {e.category && (
                    <span>
                      <strong className="font-semibold text-ink">Category:</strong> {categoryLabel}
                    </span>
                  )}
                  {e.description && (
                    <span className="italic text-ink-3">
                      Note: {e.description}
                    </span>
                  )}
                </div>
              )}

              {/* Exhibit Text Content */}
              <div className="px-5 py-4">
                {isCollapsed ? (
                  <div className="flex items-center justify-between">
                    <p className="text-[13.5px] text-ink-3 italic truncate max-w-[80ch]">
                      "{e.text?.slice(0, 120)}…"
                    </p>
                    <button
                      type="button"
                      onClick={() => toggleCollapse(i)}
                      className="text-[12.5px] font-bold text-pen hover:underline ml-2 shrink-0"
                    >
                      Read full exhibit
                    </button>
                  </div>
                ) : (
                  <p className="exhibit-text max-w-[84ch] leading-relaxed text-ink whitespace-pre-wrap">
                    {e.text}
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* Add Exhibit bottom button */}
      {exhibits.length < LIMITS.maxExhibits && (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] border border-dashed border-rule-strong bg-sheet text-[14px] font-bold text-ink-2 transition-all hover:border-pen hover:bg-paper hover:text-pen shadow-2xs"
        >
          <Plus className="size-4" aria-hidden="true" />
          Add Exhibit {nextIdentifier}
        </button>
      )}

      {/* Exhibit Edit/Add Modal */}
      <ExhibitEditorModal
        open={editingIndex !== null || isAdding}
        isNew={isAdding}
        identifier={isAdding ? nextIdentifier : (EXHIBIT_IDS[editingIndex] || 'A')}
        initialExhibit={editingIndex !== null ? exhibits[editingIndex] : null}
        onSave={handleSaveExhibit}
        onClose={() => {
          setEditingIndex(null);
          setIsAdding(false);
        }}
      />

      {/* Scenario Metadata Edit Modal */}
      <ScenarioEditorModal
        open={isEditingScenario}
        scenario={scenario}
        context={caseFile?.context || ''}
        onSave={(data) => {
          setIsEditingScenario(false);
          onChangeCaseFile({
            ...caseFile,
            title: data.title,
            context: data.context,
          });
          onNotify?.('Scenario details updated');
        }}
        onClose={() => setIsEditingScenario(false)}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteIndex !== null}
        title={`Delete Exhibit ${deleteIndex !== null ? EXHIBIT_IDS[deleteIndex] : ''}?`}
        message="Are you sure you want to remove this exhibit from the customised scenario? Remaining exhibits will be renumbered. The original scenario exhibits will remain completely safe."
        confirmLabel="Delete Exhibit"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteIndex(null)}
      />

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        open={showResetConfirm}
        title="Reset to Original Scenario?"
        message="This will discard all your custom exhibit modifications, added exhibits, and edits, reverting back to the predefined scenario exhibits. Are you sure you want to proceed?"
        confirmLabel="Reset to Original"
        cancelLabel="Keep Changes"
        variant="destructive"
        onConfirm={handleConfirmReset}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
}
