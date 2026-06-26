'use client';

import React, { useEffect, useRef, useState } from 'react';
import { UserSquare2, Upload, Search, Loader2, AlertCircle, CheckCircle2, FileSpreadsheet, X, ArrowRight } from 'lucide-react';
import { adminApi, AdminStudent, ImportResult } from '@/lib/admin-api';

const PAGE = 50;

export function StudentsImportPanel() {
  const [items, setItems] = useState<AdminStudent[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState<'preview' | 'import' | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const loadList = (reset = false) => {
    setLoading(true);
    const nextSkip = reset ? 0 : skip;
    adminApi.listStudents({ search: search.trim() || undefined, take: PAGE, skip: nextSkip })
      .then((d) => { setItems(d.items); setTotal(d.total); if (reset) setSkip(0); })
      .catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { const t = setTimeout(() => loadList(true), search ? 350 : 0); return () => clearTimeout(t); }, [search]); // eslint-disable-line
  useEffect(() => { loadList(); }, [skip]); // eslint-disable-line

  const pickFile = (f: File | null) => { setFile(f); setPreview(null); setResult(null); setError(''); if (f) runPreview(f); };
  const runPreview = async (f: File) => {
    setBusy('preview'); setError('');
    try { setPreview(await adminApi.importStudents(f, true)); }
    catch (e: any) { setError(e.response?.data?.message?.toString() || 'Could not read the file'); }
    finally { setBusy(null); }
  };
  const runImport = async () => {
    if (!file) return;
    setBusy('import'); setError('');
    try {
      const res = await adminApi.importStudents(file, false);
      setResult(res); setPreview(null); setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      loadList(true);
    } catch (e: any) { setError(e.response?.data?.message?.toString() || 'Import failed'); }
    finally { setBusy(null); }
  };
  const reset = () => { setFile(null); setPreview(null); setError(''); if (fileRef.current) fileRef.current.value = ''; };

  return (
    <div>
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><UserSquare2 className="h-6 w-6 text-amber-500" /> Students</h1>
        <p className="mt-1 text-sm text-slate-500">Import students from Excel and browse the register. Intake is derived from the registration number.</p>
      </div>

      {/* Import card */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-semibold text-slate-900">Bulk Import (.xls / .xlsx)</h2>
        </div>
        {result && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800"><CheckCircle2 className="h-4 w-4" /> Import complete</div>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-emerald-700">
              <span>Created: <b>{result.created}</b></span><span>Updated: <b>{result.updated}</b></span>
              <span>Merged duplicates: <b>{result.mergedDuplicatePersons}</b></span><span>Repeated reg-nos: <b>{result.duplicateRegNumbers}</b></span>
              {!!result.failed && <span className="text-red-600">Failed: <b>{result.failed}</b></span>}
            </div>
          </div>
        )}
        {error && <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="h-4 w-4" /> {error}</div>}
        {!file ? (
          <button onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 py-10 transition hover:border-amber-400 hover:bg-amber-50/40">
            <Upload className="h-7 w-7 text-slate-400" />
            <span className="text-sm font-medium text-slate-600">Click to choose an Excel file</span>
            <span className="text-xs text-slate-400">Columns: Registration Number, NIC, Title, Full Name, Gender, E-mail, Contact No.</span>
          </button>
        ) : (
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 shrink-0 text-emerald-600" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{file.name}</p>
                <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button onClick={reset} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            {busy === 'preview' && <div className="mt-4 flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Analyzing file…</div>}
            {preview && (
              <div className="mt-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[{ label: 'Rows in file', value: preview.total }, { label: 'To import', value: preview.toImport }, { label: 'New', value: preview.willCreate }, { label: 'Update existing', value: preview.willUpdate }].map((s) => (
                    <div key={s.label} className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-lg font-bold text-slate-900">{s.value}</p>
                      <p className="text-[11px] text-slate-500">{s.label}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-400">{preview.mergedDuplicatePersons} same-person duplicate(s) and {preview.duplicateRegNumbers} repeated registration number(s) will be merged.</p>
                {preview.sample && preview.sample.length > 0 && (
                  <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 text-left text-[10px] uppercase tracking-wide text-slate-400">
                        <tr><th className="px-3 py-2">Reg No</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Derived Intake</th></tr>
                      </thead>
                      <tbody>
                        {preview.sample.map((r) => (
                          <tr key={r.registrationNumber} className="border-t border-slate-100">
                            <td className="px-3 py-1.5 font-mono text-slate-600">{r.registrationNumber}</td>
                            <td className="px-3 py-1.5 text-slate-700">{r.fullName}</td>
                            <td className="px-3 py-1.5"><span className="rounded bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-700">{r.intake}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <button onClick={runImport} disabled={busy !== null}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-amber-600 disabled:opacity-50">
                  {busy === 'import' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  Import {preview.toImport} student{preview.toImport !== 1 ? 's' : ''}
                </button>
              </div>
            )}
          </div>
        )}
        <input ref={fileRef} type="file" accept=".xls,.xlsx" className="hidden" onChange={(e) => pickFile(e.target.files?.[0] || null)} />
      </div>

      {/* Student list */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">Register <span className="text-slate-400">({total.toLocaleString()})</span></h2>
        <div className="relative w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, reg no, NIC, intake…"
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100" />
        </div>
      </div>
      {loading ? <div className="space-y-2">{[0,1,2].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-white" />)}</div>
      : items.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-400">No students found.</div>
      : (
        <>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 text-left text-[11px] uppercase tracking-wide text-slate-400">
                <th className="px-6 py-3 font-medium">Registration No</th><th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">NIC</th><th className="px-4 py-3 font-medium">Intake</th><th className="px-4 py-3 font-medium">Contact</th>
              </tr></thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                    <td className="px-6 py-3 font-mono text-xs text-slate-600">{s.registrationNumber}</td>
                    <td className="px-4 py-3"><p className="font-medium text-slate-900">{s.title ? `${s.title} ` : ''}{s.fullName}</p>{s.email && <p className="text-xs text-slate-400">{s.email}</p>}</td>
                    <td className="px-4 py-3 text-slate-600">{s.nic || '—'}</td>
                    <td className="px-4 py-3"><span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">{s.intake}</span></td>
                    <td className="px-4 py-3 text-slate-600">{s.mobile || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-slate-500">{skip + 1}–{Math.min(skip + PAGE, total)} of {total.toLocaleString()}</span>
            <div className="flex gap-2">
              <button onClick={() => setSkip(Math.max(0, skip - PAGE))} disabled={skip === 0} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">Previous</button>
              <button onClick={() => setSkip(skip + PAGE)} disabled={skip + PAGE >= total} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40">Next</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
