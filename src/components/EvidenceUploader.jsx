import { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  FileSpreadsheet,
  FileImage,
  Video,
  Music,
  FileCode,
  File,
  Eye,
  Download,
  RefreshCw,
  Trash2,
  Plus,
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  X,
} from 'lucide-react';
import { Button, IconButton, cx } from './ui.jsx';

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

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

export default function EvidenceUploader({
  exhibitId = 'A',
  attachments = [],
  onAddAttachments,
  onRemoveAttachment,
  onReplaceAttachment,
  onPreviewAttachment,
  disabled = false,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadPercentage, setUploadPercentage] = useState(0);
  const [uploadBytesInfo, setUploadBytesInfo] = useState('');
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const replaceTargetRef = useRef(null);
  const activeXhrRef = useRef(null);

  const uploadWithProgress = (formData, onProgress) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      activeXhrRef.current = xhr;

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent, event.loaded, event.total);
        }
      };

      xhr.onload = () => {
        activeXhrRef.current = null;
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data);
          } catch {
            reject(new Error('Invalid response from server'));
          }
        } else {
          try {
            const data = JSON.parse(xhr.responseText);
            reject(new Error(data.error || `Upload failed with status ${xhr.status}`));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => {
        activeXhrRef.current = null;
        reject(new Error('Network error during file upload'));
      };

      xhr.onabort = () => {
        activeXhrRef.current = null;
        reject(new Error('Upload cancelled'));
      };

      xhr.open('POST', '/api/evidence/upload');
      xhr.send(formData);
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || !e.dataTransfer?.files?.length) return;
    await uploadFiles(e.dataTransfer.files);
  };

  const handleSelectFiles = async (e) => {
    if (!e.target.files?.length) return;
    const files = e.target.files;
    if (replaceTargetRef.current) {
      const targetId = replaceTargetRef.current;
      replaceTargetRef.current = null;
      await uploadReplacementFile(files[0], targetId);
    } else {
      await uploadFiles(files);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadFiles = async (fileList) => {
    setError(null);
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      if (f.size > 50 * 1024 * 1024) {
        setError(`File "${f.name}" (${formatBytes(f.size)}) exceeds the 50 MB limit.`);
        return;
      }
    }

    setUploading(true);
    setUploadPercentage(0);
    setUploadBytesInfo('');
    setUploadProgress(`Uploading ${fileList.length} file${fileList.length > 1 ? 's' : ''}…`);

    const formData = new FormData();
    formData.append('exhibitId', exhibitId);
    for (let i = 0; i < fileList.length; i++) {
      formData.append('files', fileList[i]);
    }

    try {
      const data = await uploadWithProgress(formData, (percent, loaded, total) => {
        setUploadPercentage(percent);
        setUploadBytesInfo(`${formatBytes(loaded)} / ${formatBytes(total)}`);
        if (percent >= 100) {
          setUploadProgress('Extracting and verifying evidence contents…');
        } else {
          setUploadProgress(`Uploading ${fileList.length} file${fileList.length > 1 ? 's' : ''}…`);
        }
      });

      if (!data.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      onAddAttachments(data.attachments);
    } catch (err) {
      setError(err.message || 'Failed to upload and process evidence files.');
    } finally {
      setUploading(false);
      setUploadPercentage(0);
      setUploadBytesInfo('');
      setUploadProgress('');
    }
  };

  const uploadReplacementFile = async (file, targetId) => {
    setError(null);
    if (file.size > 50 * 1024 * 1024) {
      setError(`File "${file.name}" (${formatBytes(file.size)}) exceeds the 50 MB limit.`);
      return;
    }

    setUploading(true);
    setUploadPercentage(0);
    setUploadBytesInfo('');
    setUploadProgress(`Replacing evidence with ${file.name}…`);

    const formData = new FormData();
    formData.append('exhibitId', exhibitId);
    formData.append('files', file);

    try {
      const data = await uploadWithProgress(formData, (percent, loaded, total) => {
        setUploadPercentage(percent);
        setUploadBytesInfo(`${formatBytes(loaded)} / ${formatBytes(total)}`);
        if (percent >= 100) {
          setUploadProgress('Analyzing replacement evidence file…');
        } else {
          setUploadProgress(`Uploading ${file.name}…`);
        }
      });

      if (!data.ok || !data.attachments?.length) {
        throw new Error(data.error || 'Replacement failed');
      }

      onReplaceAttachment(targetId, data.attachments[0]);
    } catch (err) {
      setError(err.message || 'Failed to replace evidence file.');
    } finally {
      setUploading(false);
      setUploadPercentage(0);
      setUploadBytesInfo('');
      setUploadProgress('');
    }
  };

  const triggerReplace = (attachmentId) => {
    if (disabled) return;
    replaceTargetRef.current = attachmentId;
    fileInputRef.current?.click();
  };

  const handleDownload = (attachment) => {
    const url = `/api/evidence/file/${attachment.id}?download=1`;
    const link = document.createElement('a');
    link.href = url;
    link.download = attachment.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mt-3 space-y-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleSelectFiles}
        disabled={disabled || uploading}
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.webp,.heic,.txt,.rtf,.json,.eml,.mp3,.wav,.mp4,.mov"
      />

      {/* Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
        className={cx(
          'group relative flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 py-5 text-center transition-all duration-200',
          isDragging
            ? 'border-pen bg-pen-wash/50 shadow-[0_0_20px_rgba(70,92,230,0.15)]'
            : 'border-rule bg-card-elevated hover:border-pen/50 hover:bg-hover',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <div className="flex size-10 items-center justify-center rounded-full bg-paper border border-rule text-pen transition-transform group-hover:scale-105 group-hover:bg-pen-wash">
          {uploading ? (
            <LoaderCircle className="size-5 animate-spin text-pen" />
          ) : (
            <UploadCloud className="size-5" />
          )}
        </div>
        <p className="mt-2.5 text-[13.5px] font-medium text-ink">
          {uploading ? (
            uploadProgress
          ) : (
            <>
              Drag & drop evidence files here, or <span className="text-pen font-semibold underline decoration-pen/40 underline-offset-2">browse files</span>
            </>
          )}
        </p>

        {uploading && (
          <div className="mt-2 w-full max-w-xs space-y-1.5 animate-in fade-in duration-200">
            <div className="flex justify-between text-[11px] font-mono text-ink-3">
              <span>{uploadPercentage}% uploaded</span>
              {uploadBytesInfo && <span>{uploadBytesInfo}</span>}
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-rule">
              <div
                className="h-full bg-pen transition-all duration-150 rounded-full"
                style={{ width: `${Math.max(4, uploadPercentage)}%` }}
              />
            </div>
          </div>
        )}

        <p className="mt-1 text-[11.5px] text-ink-3">
          PDF • Word • Excel • CSV • Images • Audio/Video (up to 50 MB)
        </p>
      </div>

      {/* Error alert */}
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-critical/30 bg-critical-wash px-3 py-2 text-[12.5px] text-critical-ink">
          <AlertCircle className="size-4 shrink-0 text-critical" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-critical hover:opacity-80"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Attached evidence files list */}
      {attachments.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-[12px] font-semibold uppercase tracking-wider text-ink-3">
            <span>Attached Evidence ({attachments.length})</span>
            <button
              type="button"
              disabled={disabled || uploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1 font-medium text-pen hover:text-pen-dark dark:hover:text-pen-bright disabled:opacity-50"
            >
              <Plus className="size-3.5" />
              Add another file
            </button>
          </div>

          <div className="space-y-2">
            {attachments.map((att) => (
              <div
                key={att.id}
                className={cx(
                  'group flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors',
                  att.status === 'error'
                    ? 'border-critical/40 bg-critical-wash/50'
                    : 'border-rule bg-card-elevated hover:border-rule-strong hover:bg-hover',
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="shrink-0 rounded bg-paper border border-rule p-1.5">
                    {getFileIcon(att.type, att.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[13.5px] font-medium text-ink" title={att.name}>
                        {att.name}
                      </span>
                      {att.status === 'ready' && (
                        <span className="inline-flex items-center gap-1 rounded bg-agree-wash px-1.5 py-0.5 text-[10.5px] font-medium text-agree-ink border border-agree/30">
                          <CheckCircle2 className="size-3" />
                          Ready
                        </span>
                      )}
                      {att.status === 'error' && (
                        <span className="inline-flex items-center gap-1 rounded bg-critical-wash px-1.5 py-0.5 text-[10.5px] font-medium text-critical-ink border border-critical/30">
                          <AlertCircle className="size-3" />
                          Failed
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11.5px] text-ink-3">
                      {att.summary || `${(att.size / 1024).toFixed(1)} KB`}
                    </p>
                    {att.errorMessage && (
                      <p className="mt-0.5 text-[11px] text-red-400">{att.errorMessage}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onPreviewAttachment(att)}
                    title="Preview attachment"
                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-[12px] font-medium text-slate-300 hover:bg-slate-800 hover:text-cyan-400 transition-colors"
                  >
                    <Eye className="size-3.5" />
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownload(att)}
                    title="Download original file"
                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-[12px] font-medium text-slate-300 hover:bg-slate-800 hover:text-slate-100 transition-colors"
                  >
                    <Download className="size-3.5" />
                    Download
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => triggerReplace(att.id)}
                    title="Replace file"
                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-[12px] font-medium text-slate-300 hover:bg-slate-800 hover:text-slate-100 disabled:opacity-50 transition-colors"
                  >
                    <RefreshCw className="size-3.5" />
                    Replace
                  </button>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onRemoveAttachment(att.id)}
                    title="Remove attachment"
                    className="inline-flex items-center gap-1 rounded p-1 text-ink-3 hover:bg-critical-wash hover:text-critical disabled:opacity-50 transition-colors"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
