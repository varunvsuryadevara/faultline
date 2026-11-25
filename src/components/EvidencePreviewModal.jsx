import { useState, useEffect, useMemo } from 'react';
import {
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Search,
  FileText,
  FileSpreadsheet,
  FileImage,
  Video,
  Music,
  FileCode,
  File,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Button, IconButton, cx } from './ui.jsx';

function sanitizeHtml(html) {
  if (!html) return '';
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\s*on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '');
}

function getFileIcon(type = '', name = '') {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (ext === 'pdf' || type.includes('pdf')) return <FileText className="size-5 text-red-400" />;
  if (['xlsx', 'xls', 'csv'].includes(ext) || type.includes('spreadsheet') || type.includes('excel') || type.includes('csv')) {
    return <FileSpreadsheet className="size-5 text-emerald-400" />;
  }
  if (['docx', 'doc', 'rtf'].includes(ext) || type.includes('word')) return <FileText className="size-5 text-sky-400" />;
  if (['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(ext) || type.startsWith('image/')) {
    return <FileImage className="size-5 text-purple-400" />;
  }
  if (['mp4', 'mov', 'webm'].includes(ext) || type.startsWith('video/')) return <Video className="size-5 text-cyan-400" />;
  if (['mp3', 'wav', 'm4a'].includes(ext) || type.startsWith('audio/')) return <Music className="size-5 text-amber-400" />;
  if (['json', 'eml'].includes(ext)) return <FileCode className="size-5 text-indigo-400" />;
  return <File className="size-5 text-ink-3" />;
}

export default function EvidencePreviewModal({
  attachment,
  exhibitLabel = 'Exhibit Evidence',
  initialPage = 1,
  initialSheet = null,
  initialCell = null,
  onClose,
}) {
  const [activeSheet, setActiveSheet] = useState(initialSheet || '');
  const [currentPage, setCurrentPage] = useState(initialPage || 1);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!attachment) return null;

  const ext = (attachment.name.split('.').pop() || '').toLowerCase();
  const isPdf = ext === 'pdf' || attachment.type?.includes('pdf');
  const isExcel = ['xlsx', 'xls'].includes(ext) || attachment.type?.includes('spreadsheet') || attachment.type?.includes('excel');
  const isCsv = ext === 'csv' || attachment.type === 'text/csv';
  const isWord = ['docx', 'doc', 'rtf'].includes(ext) || attachment.type?.includes('word');
  const isImage = ['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(ext) || attachment.type?.startsWith('image/');
  const isVideo = ['mp4', 'mov', 'webm'].includes(ext) || attachment.type?.startsWith('video/');
  const isAudio = ['mp3', 'wav', 'm4a'].includes(ext) || attachment.type?.startsWith('audio/');
  const isEmail = ext === 'eml';
  const isJson = ext === 'json';

  const previewData = attachment.previewData || {};

  // Setup initial active sheet if Excel
  useEffect(() => {
    if (isExcel && previewData.sheetNames?.length && !activeSheet) {
      setActiveSheet(initialSheet && previewData.sheetNames.includes(initialSheet) ? initialSheet : previewData.sheetNames[0]);
    }
  }, [isExcel, previewData, activeSheet, initialSheet]);

  const handleDownload = () => {
    const url = `/api/evidence/file/${attachment.id}?download=1`;
    const link = document.createElement('a');
    link.href = url;
    link.download = attachment.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const pages = previewData.pages || [];
  const totalPages = previewData.pageCount || pages.length || 1;

  const currentPdfPage = useMemo(() => {
    if (!pages.length) return null;
    return pages.find((p) => p.num === currentPage) || pages[0];
  }, [pages, currentPage]);

  const currentSheetData = useMemo(() => {
    if (!isExcel && !isCsv) return null;
    if (isCsv) return previewData.sheets?.['Data'] || null;
    return previewData.sheets?.[activeSheet] || null;
  }, [isExcel, isCsv, previewData, activeSheet]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        className="relative flex h-[92vh] w-full max-w-5xl flex-col rounded-xl border border-rule bg-sheet text-ink shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-title"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-rule bg-sheet px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="shrink-0 rounded-lg bg-paper border border-rule p-2">
              {getFileIcon(attachment.type, attachment.name)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 id="preview-title" className="truncate text-[15px] font-semibold text-ink">
                  {attachment.name}
                </h3>
                <span className="rounded bg-pen-wash border border-pen/30 px-2 py-0.5 text-[11px] font-medium text-pen-dark dark:text-pen-bright">
                  {exhibitLabel}
                </span>
              </div>
              <p className="mt-0.5 text-[12px] text-ink-3">
                {attachment.summary || `${(attachment.size / 1024).toFixed(1)} KB`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rule bg-sheet px-3 py-1.5 text-[13px] font-medium text-ink hover:border-pen/50 hover:bg-hover transition-colors"
            >
              <Download className="size-4" />
              <span className="hidden sm:inline">Download</span>
            </button>
            <IconButton label="Close preview" onClick={onClose}>
              <X className="size-5" />
            </IconButton>
          </div>
        </div>

        {/* Toolbar based on format */}
        {isPdf && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule bg-card-elevated px-4 py-2 sm:px-6 text-[13px]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="rounded p-1 text-ink-2 hover:bg-hover disabled:opacity-40"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="tabular text-ink-2">
                Page <span className="font-semibold text-ink">{currentPage}</span> of {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="rounded p-1 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Find in page text…"
                  className="h-7 w-36 sm:w-48 rounded bg-slate-900 border border-slate-700/60 pl-8 pr-2 text-[12px] text-slate-200 outline-none focus:border-cyan-400"
                />
              </div>
              <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(50, z - 15))}
                  className="rounded p-1 text-slate-300 hover:bg-slate-800"
                  title="Zoom out"
                >
                  <ZoomOut className="size-4" />
                </button>
                <span className="tabular text-[12px] text-slate-400">{zoom}%</span>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(200, z + 15))}
                  className="rounded p-1 text-slate-300 hover:bg-slate-800"
                  title="Zoom in"
                >
                  <ZoomIn className="size-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {isExcel && previewData.sheetNames?.length > 1 && (
          <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-800/60 bg-slate-950/40 px-4 py-1.5 sm:px-6">
            <span className="flex items-center gap-1 text-[12px] text-slate-400 mr-2 shrink-0">
              <Layers className="size-3.5 text-emerald-400" />
              Worksheets:
            </span>
            {previewData.sheetNames.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setActiveSheet(name)}
                className={cx(
                  'rounded px-2.5 py-1 text-[12.5px] font-medium transition-colors shrink-0',
                  activeSheet === name
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200',
                )}
              >
                {name}
              </button>
            ))}
          </div>
        )}

        {isImage && (
          <div className="flex items-center justify-end gap-2 border-b border-slate-800/60 bg-slate-950/40 px-4 py-1.5 sm:px-6">
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-[12px] text-slate-300 hover:bg-slate-800"
            >
              <RotateCw className="size-3.5" />
              Rotate
            </button>
            <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(50, z - 20))}
                className="rounded p-1 text-slate-300 hover:bg-slate-800"
              >
                <ZoomOut className="size-4" />
              </button>
              <span className="tabular text-[12px] text-slate-400">{zoom}%</span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(250, z + 20))}
                className="rounded p-1 text-slate-300 hover:bg-slate-800"
              >
                <ZoomIn className="size-4" />
              </button>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto bg-paper p-4 sm:p-6">
          {/* PDF Viewer */}
          {isPdf && (
            <div className="mx-auto max-w-3xl rounded-lg border border-rule bg-sheet p-6 shadow-xl">
              <div className="border-b border-rule pb-3 mb-4 flex items-center justify-between text-xs text-ink-3">
                <span className="font-semibold uppercase tracking-wider text-pen">
                  Document Page {currentPage} of {totalPages}
                </span>
                <span>Exact Text Extracted for AI Cross-Examination</span>
              </div>
              <div
                style={{ fontSize: `${(zoom / 100) * 14.5}px`, lineHeight: 1.6 }}
                className="font-serif whitespace-pre-wrap text-ink selection:bg-pen/20"
              >
                {currentPdfPage?.text || attachment.extractedText || 'No text extracted for this page.'}
              </div>
            </div>
          )}

          {/* Excel / CSV Spreadsheet Grid */}
          {(isExcel || isCsv) && currentSheetData && (
            <div className="overflow-x-auto rounded-lg border border-rule bg-sheet">
              <table className="w-full border-collapse text-[13px] text-left">
                <thead>
                  <tr className="border-b border-rule bg-paper">
                    <th className="w-12 border-r border-rule p-2 text-center font-mono text-[11px] text-ink-3">
                      #
                    </th>
                    {Array.from({ length: Math.max(1, currentSheetData.colCount || 6) }).map((_, colIdx) => (
                      <th
                        key={colIdx}
                        className="border-r border-rule px-3 py-2 font-mono text-[11px] font-semibold text-ink-3"
                      >
                        {String.fromCharCode(65 + colIdx)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule">
                  {(currentSheetData.matrix || []).map((row, rowIdx) => (
                    <tr
                      key={rowIdx}
                      className={cx(
                        'hover:bg-hover transition-colors',
                        rowIdx === 0 && 'bg-card-elevated font-semibold text-ink',
                      )}
                    >
                      <td className="border-r border-rule bg-paper p-2 text-center font-mono text-[11px] text-ink-3">
                        {rowIdx + 1}
                      </td>
                      {Array.from({ length: Math.max(1, currentSheetData.colCount || (row ? row.length : 6)) }).map((_, colIdx) => {
                        const cellCoord = `${String.fromCharCode(65 + colIdx)}${rowIdx + 1}`;
                        const isTarget = initialCell && cellCoord.toUpperCase() === initialCell.toUpperCase();
                        const val = row ? row[colIdx] : '';
                        return (
                          <td
                            key={colIdx}
                            className={cx(
                              'border-r border-rule px-3 py-2 text-ink',
                              isTarget && 'bg-major-wash text-major-ink font-bold border-major/40',
                            )}
                          >
                            {val !== undefined && val !== null ? String(val) : ''}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Word Document */}
          {isWord && (
            <div className="mx-auto max-w-3xl rounded-lg border border-rule bg-sheet p-6 shadow-xl">
              <div className="border-b border-rule pb-3 mb-4 flex items-center justify-between text-xs text-ink-3">
                <span className="font-semibold uppercase tracking-wider text-pen">
                  Word Document Reader
                </span>
                <span>{attachment.meta?.wordCount ? `${attachment.meta.wordCount} words` : ''}</span>
              </div>
              {previewData.html ? (
                <div
                  className="prose prose-invert max-w-none text-slate-200 text-[14.5px] leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(previewData.html) }}
                />
              ) : (
                <div className="whitespace-pre-wrap font-serif text-[14.5px] leading-relaxed text-slate-200">
                  {previewData.text || attachment.extractedText}
                </div>
              )}
            </div>
          )}

          {/* Image Viewer with Visual Inspection Panel */}
          {isImage && (
            <div className="flex flex-col lg:flex-row gap-6 items-start justify-center">
              <div className="flex-1 flex items-center justify-center overflow-hidden rounded-lg border border-slate-800 bg-black/40 p-4 min-h-[350px]">
                <img
                  src={`/api/evidence/file/${attachment.id}`}
                  alt={attachment.name}
                  style={{
                    transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                    transition: 'transform 0.2s ease-out',
                  }}
                  className="max-h-[65vh] max-w-full rounded object-contain shadow-lg"
                />
              </div>

              {/* Forensic OCR & Observation Panel */}
              <div className="w-full lg:w-80 shrink-0 rounded-lg border border-rule bg-sheet p-4 space-y-3">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-pen-dark dark:text-pen-bright">
                  <Sparkles className="size-4 text-pen" />
                  Forensic Image Analysis
                </div>
                <div className="space-y-2 text-[12px] text-ink">
                  <div className="rounded bg-paper p-2.5 border border-rule">
                    <span className="font-medium text-ink-3 block mb-1">Dimensions:</span>
                    <span>{attachment.meta?.dimensions?.width || 1920} × {attachment.meta?.dimensions?.height || 1080} px</span>
                  </div>
                  <div className="rounded bg-paper p-2.5 border border-rule">
                    <span className="font-medium text-ink-3 block mb-1">Extracted Scene Evidence:</span>
                    <p className="whitespace-pre-wrap text-[11.5px] text-ink-2 leading-snug">
                      {attachment.extractedText || 'Ready for visual cross-examination.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Audio / Video Viewer */}
          {(isVideo || isAudio) && (
            <div className="mx-auto max-w-3xl space-y-4">
              <div className="rounded-lg border border-slate-800 bg-black/50 p-4 flex justify-center">
                {isVideo ? (
                  <video
                    controls
                    src={`/api/evidence/file/${attachment.id}`}
                    className="max-h-[50vh] rounded shadow"
                  />
                ) : (
                  <audio
                    controls
                    src={`/api/evidence/file/${attachment.id}`}
                    className="w-full"
                  />
                )}
              </div>
              <div className="rounded-lg border border-rule bg-sheet p-4 space-y-2">
                <span className="text-[12.5px] font-semibold uppercase tracking-wider text-pen block">
                  Transcript & Chronology
                </span>
                <div className="whitespace-pre-wrap text-[13px] text-ink font-mono">
                  {attachment.extractedText}
                </div>
              </div>
            </div>
          )}

          {/* Text / EML / JSON */}
          {(isEmail || isJson || (!isPdf && !isExcel && !isCsv && !isWord && !isImage && !isVideo && !isAudio)) && (
            <div className="mx-auto max-w-3xl rounded-lg border border-rule bg-sheet p-6 shadow-xl">
              <div className="border-b border-rule pb-3 mb-4 flex items-center justify-between text-xs text-ink-3">
                <span className="font-semibold uppercase tracking-wider text-pen">
                  {isEmail ? 'Email Message (.eml)' : isJson ? 'JSON Data' : 'Text Content'}
                </span>
              </div>
              <pre className="whitespace-pre-wrap font-mono text-[13px] leading-relaxed text-ink">
                {previewData.text || attachment.extractedText}
              </pre>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between border-t border-rule bg-sheet px-4 py-2.5 sm:px-6 text-[12px] text-ink-3">
          <span>Source: {attachment.name}</span>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
