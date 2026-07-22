'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import {
  TrendingUp, RefreshCw, Loader2, FileText, CheckCircle2, Clock, XCircle,
  BookOpen, Wallet,
} from 'lucide-react';
import { analyticsApi, AnalyticsData } from '@/lib/analytics-api';
import { formatFee } from '@/lib/applications-api';

/* ── Validated categorical palette (dataviz skill; light / dark steps) ── */
function usePalette() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted ? resolvedTheme === 'dark' : false;
  return {
    dark,
    repeat: dark ? '#3987e5' : '#2a78d6',   // blue
    medical: dark ? '#d95926' : '#eb6834',  // orange
    first: dark ? '#199e70' : '#1baf7a',    // aqua
    bar: dark ? '#3987e5' : '#2a78d6',
    area: dark ? '#3987e5' : '#2a78d6',
    grid: dark ? '#1f2937' : '#eef1f4',
    axis: dark ? '#6b7280' : '#94a3b8',
    // Ordinal blue ramp for the funnel (dark→light; each step ≥2:1 on both surfaces).
    funnel: ['#184f95', '#256abf', '#3987e5', '#6da7ec'],
  };
}

const nf = (n: number) => n.toLocaleString('en-LK');

/* ── Stat tile ── */
function StatTile({ icon: Icon, label, value, sub, accent }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: string; sub?: string; accent: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-2">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${accent}`}><Icon className="h-4 w-4" /></span>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-gray-500">{label}</span>
      </div>
      <p className="mt-2.5 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400 dark:text-gray-500">{sub}</p>}
    </div>
  );
}

/* ── Card wrapper ── */
function Card({ title, subtitle, children, className = '' }: { title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 ${className}`}>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-gray-100">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-400 dark:text-gray-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

/* ── Legend ── */
function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-gray-400">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: it.color }} /> {it.label}
        </span>
      ))}
    </div>
  );
}

/* ── Horizontal bar list (optionally stacked). Direct value labels + hover tooltip. ── */
interface Seg { value: number; color: string; label: string }
function HBarList({ rows, max }: { rows: { key: string; sub?: string; total: number; segs: Seg[] }[]; max: number }) {
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.key} className="group">
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span className="truncate text-xs font-medium text-slate-600 dark:text-gray-300" title={r.sub ? `${r.key} — ${r.sub}` : r.key}>
              {r.key}{r.sub ? <span className="ml-1 text-slate-400 dark:text-gray-500">{r.sub}</span> : null}
            </span>
            <span className="shrink-0 text-xs font-bold text-slate-700 dark:text-gray-200">{nf(r.total)}</span>
          </div>
          <div className="relative flex h-3 overflow-hidden rounded-[4px] bg-slate-100 dark:bg-gray-800" title={r.segs.map((s) => `${s.label}: ${s.value}`).join('  ·  ')}>
            {r.segs.filter((s) => s.value > 0).map((s, i) => (
              <div
                key={i}
                className="h-full transition-[width] duration-500"
                style={{ width: `${(s.value / max) * 100}%`, background: s.color, marginLeft: i === 0 ? 0 : 2, borderRadius: 2 }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Donut (category mix) ── */
function Donut({ data, centerLabel, centerValue }: { data: { label: string; value: number; color: string }[]; centerLabel: string; centerValue: string }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const R = 60, C = 2 * Math.PI * R, GAP = 2; // 2px surface gap between arcs
  let offset = 0;
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 150 150" className="h-36 w-36 shrink-0 -rotate-90">
        {data.filter((d) => d.value > 0).map((d, i) => {
          const frac = d.value / total;
          const len = frac * C;
          const dash = `${Math.max(len - GAP, 0)} ${C - Math.max(len - GAP, 0)}`;
          const el = (
            <circle key={i} cx="75" cy="75" r={R} fill="none" stroke={d.color} strokeWidth="16"
              strokeDasharray={dash} strokeDashoffset={-offset} />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="min-w-0 flex-1">
        <div className="mb-2">
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{centerValue}</p>
          <p className="text-xs text-slate-400 dark:text-gray-500">{centerLabel}</p>
        </div>
        <div className="space-y-1.5">
          {data.map((d) => (
            <div key={d.label} className="flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-gray-300">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: d.color }} /> {d.label}
              </span>
              <span className="font-semibold text-slate-700 dark:text-gray-200">
                {nf(d.value)} <span className="text-slate-400 dark:text-gray-500">({Math.round((d.value / total) * 100)}%)</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Funnel (monotonic horizontal bars, % of top) ── */
function Funnel({ data, colors }: { data: { stage: string; count: number }[]; colors: string[] }) {
  const top = data[0]?.count || 1;
  return (
    <div className="space-y-2.5">
      {data.map((d, i) => (
        <div key={d.stage}>
          <div className="mb-1 flex items-baseline justify-between text-xs">
            <span className="font-medium text-slate-600 dark:text-gray-300">{d.stage}</span>
            <span className="text-slate-500 dark:text-gray-400">
              <b className="text-slate-700 dark:text-gray-200">{nf(d.count)}</b>
              <span className="ml-1.5 text-slate-400 dark:text-gray-500">{Math.round((d.count / top) * 100)}%</span>
            </span>
          </div>
          <div className="h-6 overflow-hidden rounded-[4px] bg-slate-100 dark:bg-gray-800">
            <div className="h-full transition-[width] duration-500" style={{ width: `${(d.count / top) * 100}%`, background: colors[i % colors.length], borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Area chart (submissions over time) with crosshair + tooltip ── */
function AreaChart({ data, color, grid, axis }: { data: { date: string; count: number }[]; color: string; grid: string; axis: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const W = 720, H = 200, PAD = { t: 10, r: 12, b: 24, l: 30 };
  const iw = W - PAD.l - PAD.r, ih = H - PAD.t - PAD.b;
  const max = Math.max(1, ...data.map((d) => d.count));
  const n = data.length;
  const x = (i: number) => PAD.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => PAD.t + ih - (v / max) * ih;

  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(d.count).toFixed(1)}`).join(' ');
  const area = n ? `${line} L ${x(n - 1).toFixed(1)} ${PAD.t + ih} L ${x(0).toFixed(1)} ${PAD.t + ih} Z` : '';
  const ticks = [0, 0.5, 1].map((f) => Math.round(max * f));

  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    const rect = (e.currentTarget as SVGRectElement).getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0, bd = Infinity;
    for (let i = 0; i < n; i++) { const d = Math.abs(x(i) - px); if (d < bd) { bd = d; best = i; } }
    setHover(best);
  };

  const fmtDay = (s: string) => new Date(s).toLocaleDateString('en-LK', { day: 'numeric', month: 'short' });

  if (n === 0) return <p className="py-10 text-center text-sm text-slate-400">No submissions yet.</p>;

  return (
    <div ref={wrapRef} className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height: 200 }}>
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {ticks.map((t, i) => {
          const yy = y(t);
          return (
            <g key={i}>
              <line x1={PAD.l} x2={W - PAD.r} y1={yy} y2={yy} stroke={grid} strokeWidth="1" />
              <text x={PAD.l - 6} y={yy + 3} textAnchor="end" fontSize="9" fill={axis}>{t}</text>
            </g>
          );
        })}
        {area && <path d={area} fill="url(#areaFill)" />}
        {line && <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
        {hover != null && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={PAD.t + ih} stroke={axis} strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(data[hover].count)} r="4" fill={color} stroke="#fff" strokeWidth="1.5" />
          </>
        )}
        {/* x labels: first, middle, last */}
        {[0, Math.floor((n - 1) / 2), n - 1].filter((v, i, a) => a.indexOf(v) === i).map((i) => (
          <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="9" fill={axis}>{fmtDay(data[i].date)}</text>
        ))}
        <rect x={PAD.l} y={PAD.t} width={iw} height={ih} fill="transparent" onMouseMove={onMove} onMouseLeave={() => setHover(null)} />
      </svg>
      {hover != null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-md dark:border-gray-700 dark:bg-gray-800"
          style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(data[hover].count) / H) * 100}%` }}
        >
          <p className="font-semibold text-slate-800 dark:text-gray-100">{nf(data[hover].count)} application{data[hover].count !== 1 ? 's' : ''}</p>
          <p className="text-slate-400 dark:text-gray-500">{new Date(data[hover].date).toLocaleDateString('en-LK', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════ Panel ═══════════════════════════ */
export function AnalyticsPanel() {
  const p = usePalette();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = () => {
    setLoading(true);
    analyticsApi.get({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined })
      .then(setData).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, [dateFrom, dateTo]); // eslint-disable-line react-hooks/exhaustive-deps

  const subjMax = useMemo(() => Math.max(1, ...(data?.topSubjects.map((s) => s.total) ?? [1])), [data]);
  const batchMax = useMemo(() => Math.max(1, ...(data?.topBatches.map((b) => b.count) ?? [1])), [data]);
  const intakeMax = useMemo(() => Math.max(1, ...(data?.topIntakes.map((b) => b.count) ?? [1])), [data]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
            <TrendingUp className="h-6 w-6 text-indigo-500" /> Analytics
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-gray-400">
            Application demand, subject &amp; batch trends, and processing throughput.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <span className="text-[11px] font-medium text-slate-400 dark:text-gray-500">From</span>
            <input type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)}
              className="bg-transparent text-xs text-slate-700 focus:outline-none dark:text-gray-300" />
            <span className="text-[11px] font-medium text-slate-400 dark:text-gray-500">To</span>
            <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)}
              className="bg-transparent text-xs text-slate-700 focus:outline-none dark:text-gray-300" />
          </div>
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
              Clear
            </button>
          )}
          <button onClick={load}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-500' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center py-24 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : !data ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-sm text-slate-400 dark:border-gray-700 dark:bg-gray-900">
          Could not load analytics.
        </div>
      ) : (
        <div className="space-y-5">
          {/* KPI tiles */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            <StatTile icon={FileText} label="Applications" value={nf(data.kpis.totalApplications)} sub={`${nf(data.kpis.uniqueStudents)} students`} accent="bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400" />
            <StatTile icon={CheckCircle2} label="Approved" value={nf(data.kpis.approved)} sub={`${data.kpis.approvalRate}% approval rate`} accent="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400" />
            <StatTile icon={Clock} label="In Progress" value={nf(data.kpis.pending)} sub="awaiting a decision" accent="bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400" />
            <StatTile icon={XCircle} label="Rejected" value={nf(data.kpis.rejected)} sub="exam / finance" accent="bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400" />
            <StatTile icon={BookOpen} label="Subjects Applied" value={nf(data.kpis.totalSubjects)} sub={`${data.kpis.avgSubjectsPerApp} avg / application`} accent="bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400" />
            <StatTile icon={Wallet} label="Verified Revenue" value={formatFee(data.kpis.verifiedRevenue)} accent="bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400" />
          </div>

          {/* Top subjects (stacked) + Category mix */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Card title="Most-Applied Subjects" subtitle="Subject demand split by category — the highest repeat & medical load" className="lg:col-span-2">
              <Legend items={[{ label: 'Repeat', color: p.repeat }, { label: 'Medical', color: p.medical }, { label: '1st Attempt', color: p.first }]} />
              {data.topSubjects.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">No subject data yet.</p>
              ) : (
                <HBarList
                  max={subjMax}
                  rows={data.topSubjects.map((s) => ({
                    key: s.code, sub: s.name, total: s.total,
                    segs: [
                      { value: s.repeat, color: p.repeat, label: 'Repeat' },
                      { value: s.medical, color: p.medical, label: 'Medical' },
                      { value: s.firstAttempt, color: p.first, label: '1st Attempt' },
                    ],
                  }))}
                />
              )}
            </Card>

            <Card title="Category Mix" subtitle="Share of subject applications by type">
              <Donut
                centerLabel="subject applications"
                centerValue={nf(data.byCategory.reduce((s, c) => s + c.count, 0))}
                data={[
                  { label: 'Repeat', value: data.byCategory.find((c) => c.category === 'Repeat')?.count ?? 0, color: p.repeat },
                  { label: 'Medical', value: data.byCategory.find((c) => c.category === 'Medical')?.count ?? 0, color: p.medical },
                  { label: '1st Attempt', value: data.byCategory.find((c) => c.category === '1st Attempt')?.count ?? 0, color: p.first },
                ]}
              />
            </Card>
          </div>

          {/* Batches + Intakes + Funnel */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Card title="Top Batches by Demand" subtitle="Applications submitted per batch">
              {data.topBatches.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">No data.</p> : (
                <HBarList max={batchMax} rows={data.topBatches.map((b) => ({ key: b.batch, total: b.count, segs: [{ value: b.count, color: p.bar, label: 'Applications' }] }))} />
              )}
            </Card>

            <Card title="Upcoming Exam Demand" subtitle="Subjects applied per upcoming exam intake">
              {data.topIntakes.length === 0 ? <p className="py-8 text-center text-sm text-slate-400">No data.</p> : (
                <HBarList max={intakeMax} rows={data.topIntakes.map((b) => ({ key: b.intake, total: b.count, segs: [{ value: b.count, color: p.medical, label: 'Subjects' }] }))} />
              )}
            </Card>

            <Card title="Processing Funnel" subtitle="How far applications progress">
              <div className="mt-1"><Funnel data={data.funnel} colors={p.funnel} /></div>
            </Card>
          </div>

          {/* Submissions over time */}
          <Card title="Submissions Over Time" subtitle="Applications submitted per day">
            <AreaChart data={data.submissionsOverTime} color={p.area} grid={p.grid} axis={p.axis} />
          </Card>
        </div>
      )}
    </div>
  );
}
