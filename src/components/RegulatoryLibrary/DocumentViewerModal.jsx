import { useState } from 'react';
import {
  AlertTriangle,
  Download,
  ExternalLink,
  FileText,
  Maximize2,
  Minimize2,
  ShieldCheck,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { COUNTRY_METADATA } from '../../../shared/regulations/vocab.js';

export default function DocumentViewerModal({ document, onClose }) {
  const [fullscreen, setFullscreen] = useState(false);
  const [iframeError, setIframeError] = useState(false);

  if (!document) return null;

  const countryMeta = COUNTRY_METADATA[document.country] || { flag: '🌐', name: document.country };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`relative flex flex-col w-full rounded-2xl border border-rule bg-sheet shadow-2xl overflow-hidden transition-all duration-200 ${
          fullscreen ? 'h-[98vh] max-w-[98vw]' : 'h-[88vh] max-w-4xl'
        }`}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-rule bg-card-elevated/50">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xl" role="img" aria-label={countryMeta.name}>
              {countryMeta.flag}
            </span>
            <div className="min-w-0">
              <h2 className="text-[15px] font-bold text-ink truncate leading-tight">
                {document.title}
              </h2>
              <div className="flex items-center gap-2 text-[11px] text-ink-3">
                <span>{document.category}</span>
                <span>•</span>
                <span>{document.authority}</span>
                <span>•</span>
                <span className="font-mono">{document.year}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {document.officialUrl && (
              <a
                href={document.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rule bg-paper px-2.5 text-[12px] font-medium text-ink hover:border-pen hover:text-pen-bright transition-colors"
                title="Open official portal in new browser tab"
              >
                <ExternalLink className="size-3.5" />
                <span className="hidden sm:inline">Open in Tab</span>
              </a>
            )}

            <button
              type="button"
              onClick={() => setFullscreen(!fullscreen)}
              className="rounded-lg p-1.5 text-ink-3 hover:text-ink hover:bg-hover transition-colors"
              title={fullscreen ? 'Exit full screen' : 'Full screen'}
            >
              {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-ink-3 hover:text-ink hover:bg-hover transition-colors"
              aria-label="Close viewer"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Viewer Content Area */}
        <div className="relative flex-1 bg-paper/50 flex flex-col overflow-hidden">
          {/* Metadata Sub-bar */}
          <div className="px-5 py-2.5 bg-sheet/90 border-b border-rule/60 text-[12px] text-ink-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="line-clamp-2 max-w-2xl">{document.description}</p>
            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
                <ShieldCheck className="size-3" />
                Official Gazette
              </span>
            </div>
          </div>

          {/* Document Frame or Embed Fallback */}
          <div className="relative flex-1 w-full h-full p-2">
            {!iframeError && document.officialUrl ? (
              <iframe
                src={document.officialUrl}
                title={document.title}
                onError={() => setIframeError(true)}
                sandbox="allow-scripts allow-same-origin allow-popups"
                className="w-full h-full rounded-xl border border-rule bg-white"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <div className="size-12 rounded-full bg-pen/10 border border-pen/20 flex items-center justify-center mb-3">
                  <FileText className="size-6 text-pen-bright" />
                </div>
                <h3 className="text-[16px] font-bold text-ink mb-1">Official Government Document Portal</h3>
                <p className="text-[13px] text-ink-2 max-w-md mb-4">
                  External government repositories frequently prevent direct iframe embedding via X-Frame-Options security headers.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <a
                    href={document.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-pen px-4 text-[13px] font-semibold text-white shadow-xs hover:bg-pen-bright transition-colors"
                  >
                    <ExternalLink className="size-4" />
                    Open Official Document Directly
                  </a>
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-9 items-center rounded-lg border border-rule bg-paper px-4 text-[13px] font-medium text-ink hover:bg-hover transition-colors"
                  >
                    Close Viewer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
