import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { EVIDENCE_CATEGORIES, EXHIBIT_KINDS, LIMITS } from '../../shared/constants.js';
import { plural, wordCount } from '../lib/format.js';
import { Button, IconButton } from './ui.jsx';

export default function ExhibitEditorModal({
  open,
  isNew = false,
  identifier = 'A',
  initialExhibit = null,
  onSave,
  onClose,
}) {
  const [label, setLabel] = useState('');
  const [kind, setKind] = useState('statement');
  const [person, setPerson] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setError('');
      if (initialExhibit) {
        setLabel(initialExhibit.label || '');
        setKind(initialExhibit.kind || 'statement');
        setPerson(initialExhibit.person || '');
        setDateTime(initialExhibit.dateTime || '');
        setCategory(initialExhibit.category || '');
        setDescription(initialExhibit.description || '');
        setText(initialExhibit.text || '');
      } else {
        setLabel(`Exhibit ${identifier}`);
        setKind('statement');
        setPerson('');
        setDateTime('');
        setCategory('');
        setDescription('');
        setText('');
      }
    }
  }, [open, initialExhibit, identifier]);

  if (!open) return null;

  const words = wordCount(text);
  const chars = text.length;
  const isOverLimit = chars > LIMITS.maxChars;

  const handleSubmit = (e) => {
    e?.preventDefault();
    const hasAttachments = (initialExhibit?.attachments || []).some((a) => a.status === 'ready' || a.extractedText);
    if (!text.trim() && !hasAttachments) {
      setError('Please provide exhibit content, statements, or attach evidence files.');
      return;
    }
    if (text.trim() && text.trim().length < LIMITS.minChars && !hasAttachments) {
      setError(`Exhibit text needs at least ${LIMITS.minChars} characters (a couple of sentences).`);
      return;
    }
    if (isOverLimit) {
      setError(`Exhibit text is over the limit of ${LIMITS.maxChars.toLocaleString()} characters.`);
      return;
    }

    onSave({
      label: label.trim() || `Exhibit ${identifier}`,
      kind,
      person: person.trim(),
      dateTime: dateTime.trim(),
      category: category.trim(),
      description: description.trim(),
      text: text.trim(),
      attachments: initialExhibit?.attachments ? [...initialExhibit.attachments] : [],
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="exhibit-editor-title"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm animate-fade-in sm:p-6"
    >
      <div className="relative my-8 flex max-h-[90vh] w-full max-w-3xl flex-col rounded-[10px] border border-rule bg-sheet shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-rule px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded bg-manila font-bold text-manila-ink text-[13px]">
              {identifier}
            </span>
            <h2 id="exhibit-editor-title" className="text-[17px] font-bold text-ink">
              {isNew ? `Add New Exhibit (${identifier})` : `Edit Exhibit ${identifier}`}
            </h2>
          </div>
          <IconButton label="Close" onClick={onClose}>
            <X className="size-5" />
          </IconButton>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 space-y-4">
          {error && (
            <div className="rounded-[6px] border border-critical/30 bg-critical-tint p-3 text-[13.5px] font-medium text-critical-ink">
              {error}
            </div>
          )}

          {/* Row 1: Title and Type */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="exhibit-label" className="block text-[13px] font-semibold text-ink">
                Exhibit Title / Document Label <span className="text-critical-ink">*</span>
              </label>
              <input
                id="exhibit-label"
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Claimant statement, Rohan Mehta"
                maxLength={LIMITS.maxLabelChars}
                className="mt-1.5 block w-full rounded-[6px] border border-rule bg-paper px-3 py-2 text-[14px] text-ink outline-none placeholder:text-ink-3 focus:border-pen"
              />
            </div>

            <div>
              <label htmlFor="exhibit-kind" className="block text-[13px] font-semibold text-ink">
                Exhibit Type <span className="text-critical-ink">*</span>
              </label>
              <select
                id="exhibit-kind"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                className="mt-1.5 block w-full rounded-[6px] border border-rule bg-paper px-3 py-2 text-[14px] text-ink outline-none focus:border-pen"
              >
                {EXHIBIT_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Associated Person & Date/Time */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="exhibit-person" className="block text-[13px] font-semibold text-ink">
                Person / Entity Associated <span className="text-ink-3 font-normal">(optional)</span>
              </label>
              <input
                id="exhibit-person"
                type="text"
                value={person}
                onChange={(e) => setPerson(e.target.value)}
                placeholder="e.g. Rohan Mehta (Policyholder), Officer J. Roy"
                className="mt-1.5 block w-full rounded-[6px] border border-rule bg-paper px-3 py-2 text-[14px] text-ink outline-none placeholder:text-ink-3 focus:border-pen"
              />
            </div>

            <div>
              <label htmlFor="exhibit-datetime" className="block text-[13px] font-semibold text-ink">
                Date & Time <span className="text-ink-3 font-normal">(optional)</span>
              </label>
              <input
                id="exhibit-datetime"
                type="text"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                placeholder="e.g. 14 October 2026, 21:15"
                className="mt-1.5 block w-full rounded-[6px] border border-rule bg-paper px-3 py-2 text-[14px] text-ink outline-none placeholder:text-ink-3 focus:border-pen"
              />
            </div>
          </div>

          {/* Row 3: Category & Description */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="exhibit-category" className="block text-[13px] font-semibold text-ink">
                Evidence Category <span className="text-ink-3 font-normal">(optional)</span>
              </label>
              <select
                id="exhibit-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1.5 block w-full rounded-[6px] border border-rule bg-paper px-3 py-2 text-[14px] text-ink outline-none focus:border-pen"
              >
                <option value="">Select a category...</option>
                {EVIDENCE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="exhibit-desc" className="block text-[13px] font-semibold text-ink">
                Short Description / Notes <span className="text-ink-3 font-normal">(optional)</span>
              </label>
              <input
                id="exhibit-desc"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Statement recorded at roadside"
                className="mt-1.5 block w-full rounded-[6px] border border-rule bg-paper px-3 py-2 text-[14px] text-ink outline-none placeholder:text-ink-3 focus:border-pen"
              />
            </div>
          </div>

          {/* Full Exhibit Content */}
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="exhibit-text" className="block text-[13px] font-semibold text-ink">
                Full Exhibit Content & Statements <span className="text-critical-ink">*</span>
              </label>
              <span className={`text-[12px] tabular ${isOverLimit ? 'font-bold text-critical-ink' : 'text-ink-3'}`}>
                {chars.toLocaleString()} / {LIMITS.maxChars.toLocaleString()} chars ({plural(words, 'word')})
              </span>
            </div>
            <textarea
              id="exhibit-text"
              rows={10}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste or write the full exhibit text, witness statement, police report, inspection findings, telematics log, or vehicle details here..."
              className="mt-1.5 block w-full rounded-[7px] border border-rule bg-paper p-3 font-serif text-[15px] leading-relaxed text-ink outline-none placeholder:font-sans placeholder:text-[14px] placeholder:text-ink-3 focus:border-pen"
            />
            <p className="mt-1.5 text-[12.5px] text-ink-3">
              The AI cross-examiner and claim assessor will analyze verbatim quotes from this text.
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-rule px-5 py-3.5 sm:px-6">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            {isNew ? 'Add Exhibit' : 'Save Exhibit'}
          </Button>
        </div>
      </div>
    </div>
  );
}
