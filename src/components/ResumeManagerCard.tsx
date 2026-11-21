import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Lock,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { deleteOwnResume, fetchOwnResumeBlob, uploadResumePdf } from '../api';
import type { UserProfile } from '../types';

interface ResumeManagerCardProps {
  user: UserProfile;
  onUserUpdated: (user: UserProfile) => void;
  compact?: boolean;
  highlightPrompt?: boolean;
}

const MAX_RESUME_BYTES = 5 * 1024 * 1024;

function formatBytes(bytes: number | null): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Could not read PDF file.'));
        return;
      }
      const commaIdx = reader.result.indexOf(',');
      resolve(commaIdx >= 0 ? reader.result.slice(commaIdx + 1) : reader.result);
    };
    reader.onerror = () => reject(new Error('Failed to read selected PDF file.'));
    reader.readAsDataURL(file);
  });
}

export function ResumeManagerCard({
  user,
  onUserUpdated,
  compact = false,
  highlightPrompt = false,
}: ResumeManagerCardProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function triggerFilePicker() {
    setError(null);
    setNotice(null);
    fileInputRef.current?.click();
  }

  async function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError(null);
    setNotice(null);

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setError('Only PDF files (.pdf) are accepted.');
      return;
    }

    if (file.size === 0) {
      setError('Selected PDF file is empty.');
      return;
    }

    if (file.size > MAX_RESUME_BYTES) {
      setError('Resume PDF must be 5 MB or smaller.');
      return;
    }

    setUploading(true);
    try {
      const contentBase64 = await readFileAsBase64(file);
      const res = await uploadResumePdf({
        filename: file.name,
        contentBase64,
      });
      onUserUpdated(res.user);
      setNotice('Resume stored in private storage. Project publishing is unlocked.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to upload resume.');
    } finally {
      setUploading(false);
    }
  }

  async function handleViewOrDownload(mode: 'preview' | 'download') {
    setError(null);
    setLoadingPdf(true);
    try {
      const blob = await fetchOwnResumeBlob();
      const url = URL.createObjectURL(blob);
      if (mode === 'download') {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = user.resume_filename || 'resume.pdf';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load private resume.');
    } finally {
      setLoadingPdf(false);
    }
  }

  function closePreview() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
  }

  async function handleDelete() {
    setError(null);
    setNotice(null);
    setDeleting(true);
    try {
      const res = await deleteOwnResume();
      onUserUpdated(res.user);
      setConfirmDelete(false);
      setNotice('Resume deleted from private storage.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete resume.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className={`rounded-2xl border bg-white ${
        highlightPrompt && !user.has_resume
          ? 'border-amber-300 bg-amber-50/40'
          : 'border-slate-200'
      } ${compact ? 'p-4' : 'p-5 shadow-xs sm:p-6'}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileSelected}
        className="sr-only"
        aria-label="Select PDF resume up to 5 MB"
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
              user.has_resume
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-blue-50 text-[#0052CC]'
            }`}
          >
            {user.has_resume ? (
              <CheckCircle2 className="h-5 w-5" />
            ) : (
              <FileText className="h-5 w-5" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display text-sm font-bold text-slate-900 sm:text-base">
                Resume (PDF, max 5 MB)
              </h3>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                <Lock className="h-3.5 w-3.5 text-[#0052CC]" />
                <span>Private storage</span>
              </span>
            </div>

            {user.has_resume ? (
              <p className="mt-1 truncate text-xs text-slate-600 sm:text-sm">
                <span className="font-semibold text-slate-900">{user.resume_filename}</span> ·{' '}
                {formatBytes(user.resume_size_bytes)} · Ready for publishing projects
              </p>
            ) : (
              <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm">
                Upload a PDF resume before publishing a project. Posting an idea stays open with no
                resume needed.
              </p>
            )}
          </div>
        </div>

        {!user.has_resume && (
          <button
            type="button"
            disabled={uploading}
            onClick={triggerFilePicker}
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0052CC] px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#0043A8] disabled:opacity-60 whitespace-nowrap sm:text-sm"
          >
            <Upload className="h-4 w-4" />
            <span>{uploading ? 'Uploading PDF...' : 'Upload resume now'}</span>
          </button>
        )}
      </div>

      {user.has_resume && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3.5">
          <button
            type="button"
            disabled={loadingPdf}
            onClick={() => void handleViewOrDownload('preview')}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 whitespace-nowrap"
          >
            <Eye className="h-3.5 w-3.5 text-[#0052CC]" />
            <span>{loadingPdf ? 'Loading...' : 'View PDF'}</span>
          </button>

          <button
            type="button"
            disabled={loadingPdf}
            onClick={() => void handleViewOrDownload('download')}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5 text-slate-600" />
            <span>Download</span>
          </button>

          <button
            type="button"
            disabled={uploading}
            onClick={triggerFilePicker}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/70 px-3.5 py-2 text-xs font-semibold text-[#0052CC] transition-colors hover:bg-blue-100 disabled:opacity-60 whitespace-nowrap"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>{uploading ? 'Replacing...' : 'Replace PDF'}</span>
          </button>

          {confirmDelete ? (
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="min-h-[38px] rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleDelete()}
                className="min-h-[38px] rounded-xl bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="ml-auto inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 whitespace-nowrap"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete</span>
            </button>
          )}
        </div>
      )}

      {confirmDelete && (
        <p className="mt-2.5 text-xs text-amber-800">
          Note: projects stay published publicly only while an active PDF resume is uploaded.
        </p>
      )}

      {error && (
        <div
          role="alert"
          className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700"
        >
          {error}
        </div>
      )}

      {notice && !error && (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800">
          {notice}
        </div>
      )}

      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-label="Private resume preview"
          onClick={closePreview}
        >
          <div
            className="flex h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-bold text-slate-900">
                  {user.resume_filename || 'Resume Preview'}
                </p>
                <p className="text-xs text-slate-500">Served securely from private storage</p>
              </div>
              <button
                type="button"
                onClick={closePreview}
                aria-label="Close resume preview"
                className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <iframe
              src={previewUrl}
              title="Student PDF Resume"
              className="h-full w-full flex-1 bg-slate-100"
            />
          </div>
        </div>
      )}
    </div>
  );
}
