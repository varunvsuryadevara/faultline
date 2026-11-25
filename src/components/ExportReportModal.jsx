import { useState, useEffect } from 'react';
import {
  Download,
  FileCode,
  FileDown,
  FileSpreadsheet,
  FileText,
  LoaderCircle,
  Printer,
  Sparkles,
  X,
  CheckCircle2,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import {
  generatePlainTextReport,
  generateMarkdownReport,
  generateWordDocx,
  generatePdfDocument,
  printInvestigationReport,
  printEntireInvestigationPage,
  getReportFilename,
  downloadBlob,
  downloadText,
  normalizeReportData,
} from '../lib/exportReport.js';
import { isArtifact } from '../lib/transport.js';
import { copyText } from '../lib/report.js';
import { cx, Button } from './ui.jsx';

export default function ExportReportModal({
  isOpen,
  onClose,
  data = {},
  onNotify = null,
}) {
  const [loadingType, setLoadingType] = useState(null);
  const [lastExported, setLastExported] = useState(null);

  // Close modal on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const normalized = normalizeReportData(data);
  const caseId = normalized.scenarioId;
  const caseTitle = normalized.title;
  const decisionLabel = normalized.decision?.decision_label || 'UNDER REVIEW';

  // Handler for TXT Export
  const handleExportTxt = () => {
    try {
      setLoadingType('txt');
      const text = generatePlainTextReport(data);
      const filename = getReportFilename(normalized, 'txt');
      if (isArtifact) {
        copyText(text).then((ok) => {
          onNotify?.(ok ? 'Investigation report copied as TXT' : 'Copy failed');
        });
      } else {
        downloadText(filename, text, 'text/plain');
        onNotify?.(`Downloaded report as plain text (${filename})`);
      }
      setLastExported('txt');
    } catch (err) {
      console.error('TXT export failed:', err);
      onNotify?.(`Failed to generate TXT report: ${err.message}`);
    } finally {
      setLoadingType(null);
    }
  };

  // Handler for Markdown Export
  const handleExportMarkdown = () => {
    try {
      setLoadingType('md');
      const md = generateMarkdownReport(data);
      const filename = getReportFilename(normalized, 'md');
      if (isArtifact) {
        copyText(md).then((ok) => {
          onNotify?.(ok ? 'Investigation report copied as Markdown' : 'Copy failed');
        });
      } else {
        downloadText(filename, md, 'text/markdown');
        onNotify?.(`Downloaded report as Markdown (${filename})`);
      }
      setLastExported('md');
    } catch (err) {
      console.error('Markdown export failed:', err);
      onNotify?.(`Failed to generate Markdown report: ${err.message}`);
    } finally {
      setLoadingType(null);
    }
  };

  // Handler for Word DOCX Export
  const handleExportWord = async () => {
    try {
      setLoadingType('docx');
      const { blob, filename } = await generateWordDocx(data);
      if (isArtifact) {
        // Fallback for artifact iframe
        const md = generateMarkdownReport(data);
        const ok = await copyText(md);
        onNotify?.(ok ? 'Word preview: Copied investigation content to clipboard' : 'Copy failed');
      } else {
        downloadBlob(filename, blob);
        onNotify?.(`Downloaded editable Word document (${filename})`);
      }
      setLastExported('docx');
    } catch (err) {
      console.error('Word export failed:', err);
      onNotify?.(`Failed to generate Word document: ${err.message}`);
    } finally {
      setLoadingType(null);
    }
  };

  // Handler for PDF Export
  const handleExportPdf = async () => {
    try {
      setLoadingType('pdf');
      // Yield to let UI update spinner
      await new Promise((r) => setTimeout(r, 60));
      const { blob, filename } = generatePdfDocument(data);
      if (isArtifact) {
        // In iframe environments, trigger printable view
        printInvestigationReport(data);
        onNotify?.('Opened printable investigation report preview');
      } else {
        downloadBlob(filename, blob);
        onNotify?.(`Downloaded forensic report as PDF (${filename})`);
      }
      setLastExported('pdf');
    } catch (err) {
      console.error('PDF export failed:', err);
      onNotify?.(`Failed to generate PDF: ${err.message}`);
    } finally {
      setLoadingType(null);
    }
  };

  // Handler for Print Investigation Report
  const handlePrintReport = () => {
    try {
      setLoadingType('print-report');
      printInvestigationReport(data);
      onNotify?.('Opened printable investigation report dialog');
      setLastExported('print-report');
    } catch (err) {
      console.error('Print report failed:', err);
      onNotify?.(`Print error: ${err.message}`);
    } finally {
      setLoadingType(null);
    }
  };

  // Handler for Print Entire Page
  const handlePrintEntirePage = () => {
    try {
      setLoadingType('print-page');
      printEntireInvestigationPage();
      onNotify?.('Printing full investigation page');
      setLastExported('print-page');
    } catch (err) {
      console.error('Print full page failed:', err);
      onNotify?.(`Print error: ${err.message}`);
    } finally {
      setLoadingType(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-paper/80 backdrop-blur-md animate-enter"
    >
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl rounded-2xl border border-rule-strong bg-sheet p-6 shadow-2xl transition-all z-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-rule pb-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-pen/15 text-pen border border-pen/30">
              <FileDown className="size-5" />
            </span>
            <div>
              <h2 id="export-dialog-title" className="text-[18px] font-bold text-ink">
                Export Forensic Investigation Report
              </h2>
              <p className="text-[13px] text-ink-3 mt-0.5">
                {caseId ? <strong className="text-pen-bright">{caseId}: </strong> : null}
                <span>{caseTitle}</span> &bull;{' '}
                <span className="font-semibold text-ink-2">{decisionLabel}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-3 hover:bg-hover hover:text-ink transition-colors"
            title="Close dialog (Esc)"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Export Options Grid */}
        <div className="mt-6 space-y-6">
          {/* Section 1: Download Report Files */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Download className="size-4 text-pen" />
              <h3 className="text-[13.5px] font-bold uppercase tracking-wider text-ink-2">
                Download Report Files
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: PDF */}
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={loadingType !== null}
                className={cx(
                  'group flex items-start gap-3.5 rounded-xl border p-4 text-left transition-all duration-150',
                  loadingType === 'pdf'
                    ? 'border-pen bg-pen/10'
                    : 'border-rule bg-paper/70 hover:border-rule-strong hover:bg-hover hover:shadow-md',
                )}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-critical/15 text-critical border border-critical/30 mt-0.5 group-hover:scale-105 transition-transform">
                  {loadingType === 'pdf' ? <LoaderCircle className="size-5 animate-spin text-pen" /> : <FileText className="size-5" />}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[14px] text-ink group-hover:text-pen-bright transition-colors">
                      Download as PDF
                    </span>
                    <span className="rounded bg-paper px-1.5 py-0.2 text-[10.5px] font-mono text-ink-3 border border-rule">
                      .PDF
                    </span>
                  </div>
                  <p className="text-[12px] text-ink-3 mt-1 leading-relaxed">
                    Formatted multi-page forensic report with executive banner, verified quotes &amp; tables.
                  </p>
                </div>
              </button>

              {/* Option 2: Word DOCX */}
              <button
                type="button"
                onClick={handleExportWord}
                disabled={loadingType !== null}
                className={cx(
                  'group flex items-start gap-3.5 rounded-xl border p-4 text-left transition-all duration-150',
                  loadingType === 'docx'
                    ? 'border-pen bg-pen/10'
                    : 'border-rule bg-paper/70 hover:border-rule-strong hover:bg-hover hover:shadow-md',
                )}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-pen/15 text-pen border border-pen/30 mt-0.5 group-hover:scale-105 transition-transform">
                  {loadingType === 'docx' ? <LoaderCircle className="size-5 animate-spin text-pen" /> : <FileCheck className="size-5" />}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[14px] text-ink group-hover:text-pen-bright transition-colors">
                      Download as Word
                    </span>
                    <span className="rounded bg-paper px-1.5 py-0.2 text-[10.5px] font-mono text-ink-3 border border-rule">
                      .DOCX
                    </span>
                  </div>
                  <p className="text-[12px] text-ink-3 mt-1 leading-relaxed">
                    Fully editable Microsoft Word document with formatted heading styles, tables &amp; action plan.
                  </p>
                </div>
              </button>

              {/* Option 3: Plain Text */}
              <button
                type="button"
                onClick={handleExportTxt}
                disabled={loadingType !== null}
                className={cx(
                  'group flex items-start gap-3.5 rounded-xl border p-4 text-left transition-all duration-150',
                  loadingType === 'txt'
                    ? 'border-pen bg-pen/10'
                    : 'border-rule bg-paper/70 hover:border-rule-strong hover:bg-hover hover:shadow-md',
                )}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-hover text-ink-2 border border-rule mt-0.5 group-hover:scale-105 transition-transform">
                  {loadingType === 'txt' ? <LoaderCircle className="size-5 animate-spin text-pen" /> : <FileText className="size-5" />}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[14px] text-ink group-hover:text-pen-bright transition-colors">
                      Download as TXT
                    </span>
                    <span className="rounded bg-paper px-1.5 py-0.2 text-[10.5px] font-mono text-ink-3 border border-rule">
                      .TXT
                    </span>
                  </div>
                  <p className="text-[12px] text-ink-3 mt-1 leading-relaxed">
                    Standard plain text format with ASCII table borders, section dividers &amp; clean indentation.
                  </p>
                </div>
              </button>

              {/* Option 4: Markdown */}
              <button
                type="button"
                onClick={handleExportMarkdown}
                disabled={loadingType !== null}
                className={cx(
                  'group flex items-start gap-3.5 rounded-xl border p-4 text-left transition-all duration-150',
                  loadingType === 'md'
                    ? 'border-pen bg-pen/10'
                    : 'border-rule bg-paper/70 hover:border-rule-strong hover:bg-hover hover:shadow-md',
                )}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-cyan/15 text-cyan border border-cyan/30 mt-0.5 group-hover:scale-105 transition-transform">
                  {loadingType === 'md' ? <LoaderCircle className="size-5 animate-spin text-pen" /> : <FileCode className="size-5" />}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[14px] text-ink group-hover:text-pen-bright transition-colors">
                      Download as Markdown
                    </span>
                    <span className="rounded bg-paper px-1.5 py-0.2 text-[10.5px] font-mono text-ink-3 border border-rule">
                      .MD
                    </span>
                  </div>
                  <p className="text-[12px] text-ink-3 mt-1 leading-relaxed">
                    Structured GitHub Flavored Markdown with markdown tables, quotes &amp; heading hierarchy.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Section 2: Print Options */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Printer className="size-4 text-pen" />
              <h3 className="text-[13.5px] font-bold uppercase tracking-wider text-ink-2">
                Print &amp; Printer-Friendly Options
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 5: Print Investigation Report */}
              <button
                type="button"
                onClick={handlePrintReport}
                disabled={loadingType !== null}
                className={cx(
                  'group flex items-start gap-3.5 rounded-xl border p-4 text-left transition-all duration-150',
                  loadingType === 'print-report'
                    ? 'border-pen bg-pen/10'
                    : 'border-rule bg-paper/70 hover:border-rule-strong hover:bg-hover hover:shadow-md',
                )}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-pen/15 text-pen border border-pen/30 mt-0.5 group-hover:scale-105 transition-transform">
                  {loadingType === 'print-report' ? <LoaderCircle className="size-5 animate-spin text-pen" /> : <Printer className="size-5" />}
                </span>
                <div className="min-w-0">
                  <span className="font-bold text-[14px] text-ink group-hover:text-pen-bright transition-colors">
                    Print Investigation Report
                  </span>
                  <p className="text-[12px] text-ink-3 mt-1 leading-relaxed">
                    Dedicated, clean white-background print view without navigation chrome or dark backgrounds.
                  </p>
                </div>
              </button>

              {/* Option 6: Print Entire Investigation Page */}
              <button
                type="button"
                onClick={handlePrintEntirePage}
                disabled={loadingType !== null}
                className={cx(
                  'group flex items-start gap-3.5 rounded-xl border p-4 text-left transition-all duration-150',
                  loadingType === 'print-page'
                    ? 'border-pen bg-pen/10'
                    : 'border-rule bg-paper/70 hover:border-rule-strong hover:bg-hover hover:shadow-md',
                )}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-hover text-ink-2 border border-rule mt-0.5 group-hover:scale-105 transition-transform">
                  {loadingType === 'print-page' ? <LoaderCircle className="size-5 animate-spin text-pen" /> : <Printer className="size-5" />}
                </span>
                <div className="min-w-0">
                  <span className="font-bold text-[14px] text-ink group-hover:text-pen-bright transition-colors">
                    Print Entire Investigation Page
                  </span>
                  <p className="text-[12px] text-ink-3 mt-1 leading-relaxed">
                    Prints current workspace with case file exhibits and uncollapsed analysis findings.
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between border-t border-rule pt-4">
          <div className="text-[12px] text-ink-3 flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-pen" />
            <span>All formats include verified quotes, evidence tables &amp; legal disclaimer.</span>
          </div>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
