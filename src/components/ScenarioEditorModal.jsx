import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button, IconButton } from './ui.jsx';

export default function ScenarioEditorModal({
  open,
  scenario,
  context = '',
  onSave,
  onClose,
}) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('');
  const [caseContext, setCaseContext] = useState('');

  useEffect(() => {
    if (open && scenario) {
      setTitle(scenario.title || '');
      setType(scenario.type || '');
      setCaseContext(context || '');
    }
  }, [open, scenario, context]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      type: type.trim(),
      context: caseContext.trim(),
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="scenario-editor-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in"
    >
      <div className="relative w-full max-w-xl rounded-[10px] border border-rule bg-sheet shadow-2xl animate-scale-in">
        <div className="flex items-center justify-between border-b border-rule px-5 py-4">
          <h2 id="scenario-editor-title" className="text-[17px] font-bold text-ink">
            Edit Scenario Details
          </h2>
          <IconButton label="Close" onClick={onClose}>
            <X className="size-5" />
          </IconButton>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label htmlFor="scenario-title" className="block text-[13px] font-semibold text-ink">
              Scenario Title <span className="text-critical-ink">*</span>
            </label>
            <input
              id="scenario-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sudden stop on a roundabout exit, two passengers and inconsistent injury evidence"
              className="mt-1.5 block w-full rounded-[6px] border border-rule bg-paper px-3 py-2 text-[14.5px] font-semibold text-ink outline-none focus:border-pen"
              required
            />
          </div>

          <div>
            <label htmlFor="scenario-type" className="block text-[13px] font-semibold text-ink">
              Scenario Concept / Description
            </label>
            <textarea
              id="scenario-type"
              rows={2}
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="Brief summary of the incident concept or background..."
              className="mt-1.5 block w-full rounded-[6px] border border-rule bg-paper px-3 py-2 text-[14px] text-ink outline-none focus:border-pen"
            />
          </div>

          <div>
            <label htmlFor="scenario-context" className="block text-[13px] font-semibold text-ink">
              Case Context <span className="text-ink-3 font-normal">(instructions for analysis/assessment)</span>
            </label>
            <textarea
              id="scenario-context"
              rows={3}
              value={caseContext}
              onChange={(e) => setCaseContext(e.target.value)}
              placeholder="Case context, jurisdiction, policy terms or decisions needed..."
              className="mt-1.5 block w-full rounded-[6px] border border-rule bg-paper px-3 py-2 text-[14px] text-ink outline-none focus:border-pen"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit}>
              Save Details
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
