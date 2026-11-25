import { AlertTriangle } from 'lucide-react';
import { Button } from './ui.jsx';

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'destructive',
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-md rounded-[10px] border border-rule bg-sheet p-6 shadow-2xl animate-scale-in">
        <div className="flex items-start gap-3.5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-critical-wash border border-critical/30 text-critical-ink">
            <AlertTriangle className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 id="confirm-title" className="text-[17px] font-bold text-ink">
              {title}
            </h3>
            <p className="mt-2 text-[14.5px] leading-relaxed text-ink-2">
              {message}
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2.5">
          <Button variant="ghost" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'primary' : 'primary'}
            onClick={onConfirm}
            className={variant === 'destructive' ? '!bg-critical !text-white hover:!bg-critical/90' : ''}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
