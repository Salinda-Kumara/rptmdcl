'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Paperclip,
  Upload,
  FileText,
  Image as ImageIcon,
  Download,
  Trash2,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import {
  documentsApi,
  ApplicationDocument,
  DocumentType,
  DOC_TYPE_LABELS,
} from '@/lib/applications-api';

interface Props {
  applicationId: string;
  appType: 'MEDICAL' | 'REPEAT';
  editable: boolean;
  /** Called whenever the document list changes (load / upload / delete). */
  onDocsChange?: (docs: ApplicationDocument[]) => void;
  /** Document types still required before submission (for highlighting). */
  requiredMissing?: DocumentType[];
}

const ACCEPT = '.pdf,.jpg,.jpeg,.png';
const MAX_BYTES = 10 * 1024 * 1024;

function typeOptionsFor(appType: 'MEDICAL' | 'REPEAT'): DocumentType[] {
  return appType === 'MEDICAL'
    ? ['MEDICAL_CERTIFICATE', 'PAYMENT_SLIP', 'SUPPORTING_DOCUMENT']
    : ['PAYMENT_SLIP', 'SUPPORTING_DOCUMENT'];
}

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DocumentsCard({ applicationId, appType, editable, onDocsChange, requiredMissing }: Props) {
  const [docs, setDocs] = useState<ApplicationDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingType, setUploadingType] = useState<DocumentType | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingType = useRef<DocumentType | null>(null);

  const load = () => {
    documentsApi.list(applicationId).then(setDocs).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(load, [applicationId]);

  // Notify the parent whenever the document list changes.
  useEffect(() => {
    onDocsChange?.(docs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docs]);

  // Open the file picker for a specific document type.
  const pickFileFor = (type: DocumentType) => {
    setError('');
    pendingType.current = type;
    fileRef.current?.click();
  };

  const handleFile = async (file: File) => {
    const type = pendingType.current;
    if (!type) return;
    setError('');
    if (file.size > MAX_BYTES) {
      setError('File exceeds the 10MB limit');
      return;
    }
    setUploadingType(type);
    try {
      const created = await documentsApi.upload(applicationId, type, file);
      setDocs((prev) => [created, ...prev]);
    } catch (e: any) {
      setError(e.response?.data?.message?.toString() || 'Upload failed');
    } finally {
      setUploadingType(null);
      pendingType.current = null;
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleDownload = async (doc: ApplicationDocument) => {
    setBusyId(doc.id);
    try {
      const url = await documentsApi.downloadUrl(doc.id);
      window.open(url, '_blank');
    } catch {
      setError('Could not open document');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (doc: ApplicationDocument) => {
    if (!confirm(`Remove "${doc.fileName}"?`)) return;
    setBusyId(doc.id);
    try {
      await documentsApi.remove(doc.id);
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (e: any) {
      setError(e.response?.data?.message?.toString() || 'Delete failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4">
        <Paperclip className="h-4 w-4 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-900">Attachments</h3>
        <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
          {docs.length}
        </span>
      </div>

      <div className="p-6">
        {/* Upload buttons — one per document type */}
        {editable && (
          <div className="mb-5">
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {typeOptionsFor(appType).map((t) => {
                const count = docs.filter((d) => d.documentType === t).length;
                const isMissingRequired = !!requiredMissing?.includes(t);
                const isUploading = uploadingType === t;
                return (
                  <button
                    key={t}
                    onClick={() => pickFileFor(t)}
                    disabled={uploadingType !== null}
                    className={`group relative flex items-center gap-2 rounded-xl border-2 border-dashed px-3 py-3 text-left text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                      isMissingRequired
                        ? 'border-amber-300 bg-amber-50 text-amber-800 hover:border-amber-400'
                        : 'border-slate-300 bg-slate-50/50 text-slate-700 hover:border-blue-400 hover:bg-blue-50/50'
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isMissingRequired ? 'bg-amber-100 text-amber-600' : 'bg-white text-blue-600'
                      }`}
                    >
                      {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{isUploading ? 'Uploading…' : DOC_TYPE_LABELS[t]}</span>
                      <span className="block text-[11px] font-normal text-slate-400">
                        {count > 0 ? `${count} attached` : isMissingRequired ? 'Required' : 'Optional'}
                      </span>
                    </span>
                    {count > 0 && (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-slate-400">PDF, JPG or PNG · max 10MB</p>
            {error && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
                <AlertCircle className="h-3.5 w-3.5" /> {error}
              </div>
            )}
          </div>
        )}

        {/* Document list */}
        {loading ? (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : docs.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            {editable ? 'No attachments yet. Upload your payment slip or certificate above.' : 'No attachments.'}
          </p>
        ) : (
          <ul className="space-y-2">
            {docs.map((doc) => {
              const isImage = doc.mimeType.startsWith('image/');
              const Icon = isImage ? ImageIcon : FileText;
              return (
                <li
                  key={doc.id}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 p-3"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      isImage ? 'bg-violet-50 text-violet-600' : 'bg-rose-50 text-rose-600'
                    }`}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{doc.fileName}</p>
                    <p className="text-xs text-slate-400">
                      {DOC_TYPE_LABELS[doc.documentType]} · {humanSize(doc.fileSize)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownload(doc)}
                    disabled={busyId === doc.id}
                    title="View / download"
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-blue-600 disabled:opacity-50"
                  >
                    {busyId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  </button>
                  {editable && (
                    <button
                      onClick={() => handleDelete(doc)}
                      disabled={busyId === doc.id}
                      title="Remove"
                      className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
