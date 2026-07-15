/**
 * Generate an ADMISSION CARD for an approved application, in the official
 * layout: header (candidate details), a signature-form table listing each
 * course with its exam date/time (from the schedule), and a detachable stub.
 */
import { StaffApplication } from './staff-api';
import type { AdmissionExam } from './staff-api';

type Programme = 'AA' | 'BMBA';

function programmeOf(app: StaffApplication): Programme {
  const ad: any = app.applicantDetails ?? {};
  const hay = `${ad.batchNumber ?? app.student?.batchNumber ?? ''} ${ad.registrationNumber ?? app.student?.registrationNumber ?? ''}`.toUpperCase();
  return hay.includes('BMBA') ? 'BMBA' : 'AA';
}

const TITLES: Record<Programme, string> = {
  AA: 'BSc. (Applied Accounting) General / Special Degree Programme',
  BMBA: 'B.Mgt (Business Analytics) General / Special Degree Programme',
};

/** Load a public image as a data URL with its natural dimensions (for jsPDF). */
async function loadPng(url: string): Promise<{ dataUrl: string; w: number; h: number } | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
    const dim = await new Promise<{ w: number; h: number }>((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve({ w: im.naturalWidth, h: im.naturalHeight });
      im.onerror = reject;
      im.src = dataUrl;
    });
    return { dataUrl, ...dim };
  } catch { return null; }
}

const normCode = (c?: string | null) => (c ?? '').toUpperCase().replace(/\s+/g, '');
const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).replace(/\//g, '.') : '';

async function buildAdmissionPdf(app: StaffApplication, exams: AdmissionExam[], onlySubjectId?: string): Promise<Blob> {
  const jspdfMod: any = await import('jspdf');
  const jsPDF = jspdfMod.jsPDF ?? jspdfMod.default?.jsPDF ?? jspdfMod.default;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;
  const right = W - M;

  const setF = (style: 'normal' | 'bold' | 'italic', size: number) => { doc.setFont('helvetica', style); doc.setFontSize(size); };
  const fit = (s: any, maxW: number): string => {
    let t = (s ?? '').toString();
    if (doc.getTextWidth(t) <= maxW) return t;
    while (t.length > 1 && doc.getTextWidth(t + '…') > maxW) t = t.slice(0, -1);
    return t + '…';
  };
  const line = (x1: number, y1: number, x2: number, y2: number, w = 0.6) => { doc.setLineWidth(w); doc.line(x1, y1, x2, y2); };

  const ad: any = app.applicantDetails ?? {};
  const name = ad.fullName ?? app.student?.fullName ?? '';
  const reg = ad.registrationNumber ?? app.student?.registrationNumber ?? '';
  const prog = programmeOf(app);

  // Course code → { date, time, location } from the apply-enabled timetable.
  const examByCode = new Map<string, AdmissionExam>();
  for (const e of exams) { const k = normCode(e.courseCode); if (k && !examByCode.has(k)) examByCode.set(k, e); }

  // A card is printed per subject: when onlySubjectId is given, keep only that
  // application-subject; otherwise list them all.
  const allSubjects: any[] = app.applicationSubjects ?? [];
  const cardSubjects = onlySubjectId ? allSubjects.filter((s) => s.id === onlySubjectId) : allSubjects;

  // Center — the exam location allocated in the schedule for this candidate's
  // subjects (first non-empty match); falls back to CA Sri Lanka.
  const subjectsForCenter: any[] = cardSubjects;
  const center =
    subjectsForCenter
      .map((s) => examByCode.get(normCode(s.subject?.code))?.location)
      .find((loc) => loc && loc.trim()) || ad.center || 'CA Sri Lanka';
  const dateOf = (e?: AdmissionExam) => fmtDate(e?.revisedDate || e?.examDate);
  const timeOf = (e?: AdmissionExam) => (e?.session1 || e?.session2 || e?.session3 || '').toString();

  let y = M;

  // SAB Campus logo — flush to the top-left corner of the page.
  const logo = await loadPng('/sab-campus-logo.png');
  const lh = 66;
  if (logo) {
    const lw = (logo.w / logo.h) * lh;
    doc.addImage(logo.dataUrl, 'PNG', 18, 14, lw, lh);
  }
  // Index No. — two-row bordered box (header row + value row) in the top-right.
  setF('bold', 9); const wHead = doc.getTextWidth('Index No.');
  setF('normal', 9); const wVal = doc.getTextWidth(reg);
  const idxRowH = 16, bw = Math.max(wHead, wVal) + 26, bh = idxRowH * 2, bx = right - bw, by = 14;
  doc.setLineWidth(0.6);
  doc.rect(bx, by, bw, bh);
  doc.line(bx, by + idxRowH, bx + bw, by + idxRowH);
  setF('bold', 9); doc.text('Index No.', bx + bw / 2, by + 11, { align: 'center' });
  setF('normal', 9); doc.text(reg, bx + bw / 2, by + idxRowH + 11, { align: 'center' });

  y += lh + 14;

  setF('bold', 15); doc.text('ADMISSION CARD', W / 2, y, { align: 'center' });
  y += 18;
  setF('bold', 10.5); doc.text(fit(TITLES[prog], right - M), W / 2, y, { align: 'center' });
  y += 15;
  setF('bold', 10); doc.text('END SEMESTER EXAMINATION', W / 2, y, { align: 'center' });
  y += 26;

  // Candidate details
  const label = (k: string, v: string, yy: number) => {
    setF('bold', 10); doc.text(k, M, yy);
    setF('normal', 10); doc.text(`: ${v}`, M + 165, yy);
  };
  label('Name of the Candidate', name, y); y += 18;
  label('SAB Registration Number', reg, y); y += 18;
  label('Center', center, y); y += 24;

  setF('normal', 10);
  doc.text('This candidate is admitted to the Examination(s) below mentioned.', M, y);
  y += 40;

  // Deputy Registrar signature (right)
  setF('bold', 10); doc.text('Hasitha Karunarathne', right, y, { align: 'right' });
  y += 14; setF('normal', 9);
  doc.text('Deputy Registrar', right, y, { align: 'right' }); y += 12;
  doc.text('Examination Division', right, y, { align: 'right' });
  y += 26;

  // ── SIGNATURE FORM ──
  line(M, y, right, y, 1); y += 16;
  setF('bold', 11); doc.text('SIGNATURE FORM', W / 2, y, { align: 'center' }); y += 16;
  setF('normal', 8.5);
  doc.text('The candidate will place his/her usual signature in the appropriate place in the presence of the Invigilator at the Examination(s)', M, y, { maxWidth: right - M });
  y += 20;

  // Table
  const subjects: any[] = cardSubjects;
  const cols = [
    { h: 'Course Code', w: 70 },
    { h: 'Course', w: 150 },
    { h: 'Date', w: 62 },
    { h: 'Time', w: 88 },
    { h: "Candidate's\nSignature", w: 0 },
    { h: "Invigilator's\nSignature", w: 0 },
  ];
  const fixed = cols.slice(0, 4).reduce((s, c) => s + c.w, 0);
  const rem = (right - M) - fixed;
  cols[4].w = Math.floor(rem / 2); cols[5].w = rem - cols[4].w;
  const xs: number[] = [M];
  cols.forEach((c) => xs.push(xs[xs.length - 1] + c.w));

  const headH = 26, minRowH = 30, lineH = 10;
  setF('normal', 8.5);
  // Wrap each course name and size the row to fit it fully.
  // Suffix the course name with (R)/(M) to flag Repeat vs Medical/1st-Attempt.
  const catSuffix = (cat?: string) => ((cat ?? '').toUpperCase() === 'REPEAT' ? ' (R)' : ' (M)');
  const rowsData = (subjects.length ? subjects : []).map((s) => {
    const nameText = `${s.subject?.name ?? ''}${catSuffix(s.category)}`;
    const nameLines = doc.splitTextToSize(nameText, cols[1].w - 8) as string[];
    return { s, nameLines, rowH: Math.max(minRowH, nameLines.length * lineH + 14) };
  });
  const bodyH = rowsData.length ? rowsData.reduce((sum, r) => sum + r.rowH, 0) : minRowH;
  const tblTop = y, tblH = headH + bodyH;

  doc.setLineWidth(0.6); doc.rect(M, tblTop, right - M, tblH);
  xs.slice(1, -1).forEach((x) => line(x, tblTop, x, tblTop + tblH));
  line(M, tblTop + headH, right, tblTop + headH);
  setF('bold', 8);
  cols.forEach((c, i) => {
    const cx = xs[i] + c.w / 2;
    c.h.split('\n').forEach((ln, j) => doc.text(ln, cx, tblTop + 11 + j * 9, { align: 'center' }));
  });
  setF('normal', 8.5);
  let ry = tblTop + headH;
  rowsData.forEach(({ s, nameLines, rowH }, i) => {
    if (i > 0) line(M, ry, right, ry, 0.4);
    const e = examByCode.get(normCode(s.subject?.code));
    const cy = ry + rowH / 2 + 3;                         // single-line vertical centre
    const nameTop = ry + rowH / 2 - ((nameLines.length - 1) * lineH) / 2 + 3;
    doc.text(fit(s.subject?.code ?? '', cols[0].w - 6), xs[0] + cols[0].w / 2, cy, { align: 'center' });
    nameLines.forEach((ln, j) => doc.text(ln, xs[1] + 4, nameTop + j * lineH));
    doc.text(dateOf(e), xs[2] + cols[2].w / 2, cy, { align: 'center' });
    doc.text(fit(timeOf(e), cols[3].w - 6), xs[3] + cols[3].w / 2, cy, { align: 'center' });
    ry += rowH;
  });
  y = tblTop + tblH + 12;

  setF('italic', 7.5);
  doc.text("* Supervisor / Invigilator should check the Student's ID card issued by the School of Accounting and Business to every candidate when he/she places his/her usual signature on this form.", M, y, { maxWidth: right - M });
  y += 34;

  // ── Detachable stub ──
  doc.setLineDashPattern([2, 2], 0); line(M, y, right, y, 0.6); doc.setLineDashPattern([], 0);
  y += 4; setF('italic', 7.5);
  doc.text('Candidate should detach this portion and keep it in safe custody.', W / 2, y, { align: 'center' });
  y += 44;
  setF('bold', 10); doc.text('END SEMESTER EXAMINATION', W / 2, y, { align: 'center' }); y += 20;
  label('SAB Registration Number', reg, y); y += 18;
  label('Name of the Candidate', name, y);

  // ── Footer ──
  const pageH = doc.internal.pageSize.getHeight();
  const genY = pageH - 14;
  doc.setTextColor(120);
  setF('italic', 7);
  doc.text('This is a system-generated document and does not require a physical signature.', W / 2, genY - 12, { align: 'center' });
  setF('normal', 7);
  if (app.serialNumber) doc.text(`Application No: ${app.serialNumber}`, M, genY);
  doc.text(`Date and Time: ${new Date().toLocaleString('en-US')}`, right, genY, { align: 'right' });
  doc.setTextColor(0);

  return doc.output('blob') as Blob;
}

/**
 * Build the admission card and print it directly. The PDF is loaded into a
 * hidden iframe and printed via the browser's PDF print, so the output is the
 * A4 page itself — no HTML wrapper, no browser date/URL/page-number headers,
 * and no stray second sheet.
 */
export async function printAdmissionCard(app: StaffApplication, exams: AdmissionExam[], onlySubjectId?: string) {
  const blob = await buildAdmissionPdf(app, exams, onlySubjectId);
  const url = URL.createObjectURL(blob);

  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  iframe.src = url;
  iframe.onload = () => {
    setTimeout(() => {
      try { iframe.contentWindow?.focus(); iframe.contentWindow?.print(); } catch { /* noop */ }
    }, 300);
  };
  document.body.appendChild(iframe);

  // Clean up once printing is well underway.
  setTimeout(() => { iframe.remove(); URL.revokeObjectURL(url); }, 120000);
}
