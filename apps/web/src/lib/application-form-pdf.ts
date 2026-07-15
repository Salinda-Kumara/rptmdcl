/**
 * Generate a printable copy of an application in the ORIGINAL form layout
 * (Repeat / Medical Exam Application), then merge the uploaded attachments
 * after the form pages.
 *
 * Two programme variants share the same layout — only the title, the subjects
 * table header, and the category options differ:
 *   • BSc. (Applied Accounting) General/Special Degree Programme
 *   • Bachelor of Management in Business Analytics Degree
 */
import { staffApi, StaffApplication } from './staff-api';
import { DOC_TYPE_LABELS } from './applications-api';

type Programme = 'AA' | 'BMBA';

function programmeOf(app: StaffApplication): Programme {
  const ad: any = app.applicantDetails ?? {};
  const hay = `${ad.batchNumber ?? app.student?.batchNumber ?? ''} ${ad.registrationNumber ?? app.student?.registrationNumber ?? ''}`.toUpperCase();
  return hay.includes('BMBA') ? 'BMBA' : 'AA';
}

const TITLES: Record<Programme, string> = {
  AA: 'BSc. (Applied Accounting) General/Special Degree Programme',
  BMBA: 'Bachelor of Management in Business Analytics Degree',
};

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-GB') : '');

/* ───────────────────────── Form generation (jsPDF) ───────────────────────── */

export async function buildApplicationFormPdf(app: StaffApplication): Promise<Uint8Array> {
  const jspdfMod: any = await import('jspdf');
  const jsPDF = jspdfMod.jsPDF ?? jspdfMod.default?.jsPDF ?? jspdfMod.default;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();   // 595.28
  const M = 36;                                  // margin
  const right = W - M;
  const ad: any = app.applicantDetails ?? {};
  const prog = programmeOf(app);
  const subjects: any[] = app.applicationSubjects ?? [];

  // ── drawing helpers ──
  const setF = (style: 'normal' | 'bold' | 'italic', size: number) => { doc.setFont('helvetica', style); doc.setFontSize(size); };
  const line = (x1: number, y1: number, x2: number, y2: number, w = 0.6) => { doc.setLineWidth(w); doc.line(x1, y1, x2, y2); };
  const rect = (x: number, y: number, w: number, h: number, lw = 0.6) => { doc.setLineWidth(lw); doc.rect(x, y, w, h); };

  /** Truncate a string with an ellipsis so it fits within maxW at the current font. */
  const fit = (s: any, maxW: number): string => {
    let t = (s ?? '').toString();
    if (doc.getTextWidth(t) <= maxW) return t;
    while (t.length > 1 && doc.getTextWidth(t + '…') > maxW) t = t.slice(0, -1);
    return t + '…';
  };
  const text = (s: string, x: number, y: number, opts: any = {}) => doc.text(s ?? '', x, y, opts);
  /** Draw truncated text inside a column [x, x+w] with alignment. */
  const cell = (s: any, x: number, y: number, w: number, align: 'left' | 'center' | 'right' = 'left') => {
    const t = fit(s, w - 6);
    if (align === 'center') doc.text(t, x + w / 2, y, { align: 'center' });
    else if (align === 'right') doc.text(t, x + w - 3, y, { align: 'right' });
    else doc.text(t, x + 3, y);
  };
  /** Multi-line (\n) header text, centered in a column. */
  const headCell = (s: string, x: number, y: number, w: number, lh = 7.5) => {
    s.split('\n').forEach((ln, i) => doc.text(ln, x + w / 2, y + i * lh, { align: 'center' }));
  };
  /** Label + value on a dotted line, value truncated to remaining width. */
  const dotted = (label: string, x: number, y: number, endX: number, value?: string) => {
    setF('normal', 9); text(label, x, y);
    const startX = x + doc.getTextWidth(label) + 6;
    doc.setLineDashPattern([1, 1.6], 0); line(startX, y + 2, endX, y + 2, 0.5); doc.setLineDashPattern([], 0);
    if (value) { setF('bold', 8.5); doc.text(fit(value, endX - startX - 6), startX + 2, y - 1); setF('normal', 9); }
  };

  const serial = app.serialNumber ?? '';
  let y = M + 8;

  /* ── Header ── */
  const logoX = M + 110;
  setF('bold', 11.5); text(fit(TITLES[prog], right - logoX), logoX, y);
  setF('normal', 8); text('School of Accounting and Business, No. 411 Galle - Colombo Rd, Colombo 04, Sri Lanka.', logoX, y + 13);
  text('Tel: 011-2101044', logoX, y + 24);
  setF('bold', 9); text('APPLICATION FOR THE END SEMESTER EXAMINATION', logoX, y + 38);
  // Categories are chosen per subject, so an application can mix Repeat and
  // Medical/1st-Attempt subjects. Reflect the actual mix in the title.
  const hasRepeat = subjects.some((s) => (s.category ?? '').toUpperCase() === 'REPEAT');
  const hasMedical = subjects.some((s) => (s.category ?? '').toUpperCase() !== 'REPEAT');
  const appTitle = hasRepeat && hasMedical ? 'MEDICAL / REPEAT APPLICATION'
    : hasMedical ? 'MEDICAL APPLICATION' : 'REPEAT APPLICATION';
  text(appTitle, logoX, y + 50);
  try {
    const { SAB_LOGO_DATA_URL } = await import('./sab-logo');
    doc.addImage(SAB_LOGO_DATA_URL, 'PNG', M - 14, y - 45, 120, 120);
  } catch { rect(M - 14, y - 45, 120, 120); }

  /* ── Application No. — top-right corner (overlaid; layout unchanged) ── */
  if (serial) {
    setF('bold', 9);
    const noH = 16, pad = 8;
    const noW = doc.getTextWidth(serial) + pad * 2;
    const noX = right - noW, noY = M - 22;
    rect(noX, noY, noW, noH, 0.7);
    text(serial, noX + noW / 2, noY + noH / 2 + 3, { align: 'center' });
  }

  y += 60;
  line(M, y, right, y, 1);

  /* ── Bank table ── */
  y += 6;
  const bankH = 28;
  const bAcc = right - M - 190;              // account-name column width
  const c1 = M, c2 = M + bAcc, c3 = c2 + 78, c4 = c3 + 56;
  rect(c1, y, right - c1, bankH);
  [c2, c3, c4].forEach((cx) => line(cx, y, cx, y + bankH));
  line(c1, y + bankH / 2, right, y + bankH / 2);
  setF('bold', 8);
  cell('Bank Account Name', c1, y + 10, bAcc, 'center');
  cell('Bank', c2, y + 10, c3 - c2, 'center');
  cell('Branch', c3, y + 10, c4 - c3, 'center');
  cell('Account No', c4, y + 10, right - c4, 'center');
  setF('normal', 7.5);
  cell('The Institute of Chartered Accountants of Sri Lanka- SAB', c1, y + 23, bAcc, 'center');
  cell('Sampath Bank', c2, y + 23, c3 - c2, 'center');
  cell('Borella', c3, y + 23, c4 - c3, 'center');
  cell('000460002370', c4, y + 23, right - c4, 'center');

  y += bankH + 22;

  /* ── 1–4 applicant fields ── */
  const numX = M, romX = M + 14, labX = M + 28;
  const fullName = (ad.fullName ?? app.student?.fullName ?? '').toUpperCase();
  setF('normal', 9);
  text('1.', numX, y); text('i', romX, y); dotted('FullName (in BLOCK CAPITALS)', labX, y, right, fullName);
  y += 18; text('ii', romX, y); dotted('Name with Initials (Mr./Ms.)', labX, y, right, ad.nameWithInitials ?? '');
  y += 20; text('2.', numX, y); text('i', romX, y); dotted('Permanent Address', labX, y, right, ad.permanentAddress ?? '');
  y += 18; text('ii', romX, y); dotted('Postal Address (if different from 2 i)', labX, y, right, ad.postalAddress ?? '');
  y += 18; text('iii', romX, y); setF('normal', 9); text('Contact Telephone Numbers', labX, y);
  y += 16;
  dotted('Home', labX, y, M + 170, ad.telephone ?? '');
  dotted('Mobile', M + 185, y, M + 280, ad.mobile ?? '');
  dotted('Email', M + 295, y, right, ad.email ?? '');
  y += 24;

  // NIC boxes
  setF('normal', 9);
  text('3.', numX, y + 2); text('NIC No. / Passport No.', labX, y + 2);
  const nic = (ad.nic ?? app.student?.nic ?? '').toString();
  const boxN = 14, boxW = 17, boxH = 16, boxX = M + 155;
  for (let i = 0; i < boxN; i++) {
    rect(boxX + i * boxW, y - 9, boxW, boxH, 0.5);
    if (nic[i]) { setF('bold', 9); cell(nic[i], boxX + i * boxW, y + 2, boxW, 'center'); setF('normal', 9); }
  }
  y += 26;
  text('4.', numX, y); dotted('SAB Registration Number', labX, y, M + 330, ad.registrationNumber ?? app.student?.registrationNumber ?? '');
  dotted('Intake', M + 345, y, right, ad.intake ?? '');
  y += 24;

  /* ── 5. Subjects table ── */
  setF('normal', 9); text('5. Subjects applied for:', M, y);
  /*setF('italic', 7); text('Write the correct course code, title, category and CA marks for each course.', M + 118, y);*/
  y += 10;

  // column widths (portrait content width ≈ 523pt)
  const tableW = right - M;
  const wCode = 52, wCat = 76, wCA = 54, wInt = 92;
  const wTitle = tableW - (wCode + wCat + wCA + wInt);
  const xCode = M, xTitle = xCode + wCode, xCat = xTitle + wTitle, xCA = xCat + wCat, xInt = xCA + wCA;
  const colsX = [xTitle, xCat, xCA, xInt];
  const headH = 36, rowH = 18;
  const nRows = Math.max(1, subjects.length);
  const tblTop = y, tblH = headH + nRows * rowH;

  rect(M, tblTop, tableW, tblH);
  colsX.forEach((cx) => line(cx, tblTop, cx, tblTop + tblH));
  line(M, tblTop + headH, right, tblTop + headH);
  setF('bold', 7.5);
  headCell('Course\ncode', xCode, tblTop + 13, wCode);
  headCell('Course title', xTitle, tblTop + 21, wTitle);
  headCell(prog === 'AA' ? 'Category\n(Medical/\nRepeat/\n1st Attempt)' : 'Category\n(Medical/\nRepeat)', xCat, tblTop + 9, wCat);
  headCell('CA Marks\n(Mandatory)', xCA, tblTop + 15, wCA);
  headCell(prog === 'AA' ? 'Upcoming\nExam Intake' : 'Intake', xInt, tblTop + 15, wInt);

  setF('normal', 8);
  for (let i = 0; i < nRows; i++) {
    const ry = tblTop + headH + i * rowH;
    if (i > 0) line(M, ry, right, ry, 0.4);
    const s = subjects[i];
    if (!s) continue;
    cell(s.subject?.code ?? '', xCode, ry + 12, wCode, 'center');
    cell(s.subject?.name ?? '', xTitle, ry + 12, wTitle, 'left');
    cell(catLabel(s.category), xCat, ry + 12, wCat, 'center');
    cell(s.caMarks != null ? String(s.caMarks) : '', xCA, ry + 12, wCA, 'center');
    cell(s.upcomingExamIntake ?? (s.upcomingExamDate ? fmtDate(s.upcomingExamDate) : ''), xInt, ry + 12, wInt, 'center');
  }
  y = tblTop + tblH + 20;

  /* ── 6. Previous Examination Details ── */
  setF('normal', 9); text('6. Previous Examination Details;', M, y);
  y += 15;

  // Each subject appears under the table matching its own category. Repeat
  // subjects use the Repeat table (with Grade Earned + Exam-Division outcome);
  // Medical and 1st-Attempt subjects use the Medical table.
  const repeatSubs = subjects.filter((s) => (s.category ?? '').toUpperCase() === 'REPEAT');
  const medicalSubs = subjects.filter((s) => (s.category ?? '').toUpperCase() !== 'REPEAT');
  // Exam Division outcome for the Repeat table's confirmation column: rejected
  // outright, or confirmed once the exam division forwards it past SUBMITTED.
  const examConfirmation = app.status === 'REJECTED' ? 'Rejected'
    : ['PAYMENT_PENDING', 'PAYMENT_VERIFIED', 'APPROVED', 'PAYMENT_REJECTED'].includes(app.status) ? 'Confirmed'
      : '';

  if (medicalSubs.length) {
    setF('bold', 8.5); text('Medical Exam ', M, y); y += 6;
    y = prevExamTable(doc, M, right, y,
      ['Course code', 'Course title', 'Date of the exam', 'Intake details'],
      [58, tableW - 58 - 100 - 90, 100, 90],
      medicalSubs.map((s) => [s.subject?.code ?? '', s.subject?.name ?? '', fmtDate(s.previousExamDate), s.previousExamIntake ?? '']),
      Math.max(1, medicalSubs.length));
    y += 12;
  }
  if (repeatSubs.length) {
    setF('bold', 8.5); text('Repeat Exam', M, y); y += 6;
    y = prevExamTable(doc, M, right, y,
      ['Course code', 'Course title', 'Date of the exam', 'Intake details', 'Grade Earned', 'Confirmation from Exam Div.'],
      [52, tableW - 52 - 68 - 58 - 52 - 82, 68, 58, 52, 82],
      repeatSubs.map((s) => [s.subject?.code ?? '', s.subject?.name ?? '', fmtDate(s.previousExamDate), s.previousExamIntake ?? '', s.gradeEarned ?? '', examConfirmation]),
      Math.max(1, repeatSubs.length));
  }
  y += 20;

  // Break to a new page for the closing sections only if there isn't room.
  const pageH = doc.internal.pageSize.getHeight();
  if (y > pageH - 200) { doc.addPage(); y = M + 20; }

  /* ── NOTE box ── */
  /*const noteH = 42, noteW = 340;
  rect(M, y, noteW, noteH);
  setF('bold', 8); cell('NOTE', M, y + 12, noteW, 'center');
  setF('normal', 7.5);
  text('* Re-sit examination fee on medical ground: LKR 5,200/= per subject', M + 10, y + 26);
  text('* Repeat / Re-Repeat examination fee: LKR 2,600/= per subject', M + 10, y + 37);

  y += noteH + 26;*/

  /* ── Certification ── */
  setF('normal', 8.5);
  text('I certify that the particulars disclosed above are true and accurate.', M, y);
  y += 32;
  signatureLine(doc, M + 10, y, 150, fmtDate(app.submittedAt), 'Date');
  signatureLine(doc, right - 200, y, 190, '', 'Signature of the Applicant');
  y += 40;

  /* ── For Office Use ── */
  line(M, y - 8, right, y - 8, 0.4);
  setF('bold', 9.5); cell('For Office Use Only', M, y + 4, tableW, 'center');
  setF('normal', 8.5);
  y += 18;
  text('Eligibility to sit for the End Semester Examination (Medical / Repeat):', M, y);
  const approval = (app.approvals ?? []).find((a) => a.approvedAt);
  const decided = approval?.approvedAt ? fmtDate(approval.approvedAt) : '';
  const decision = app.status === 'REJECTED' ? 'Rejected'
    : app.status === 'SUBMITTED' ? 'Pending'
      : (app.status === 'PAYMENT_PENDING' || app.status === 'PAYMENT_VERIFIED'
        || app.status === 'APPROVED' || app.status === 'PAYMENT_REJECTED') ? 'Approved'
        : '';

  // Remarks helper — rendered under the division that raised them.
  const remarks = (app.remarks ?? []).filter((r: any) => r?.content?.trim());
  const showRemarks = (label: string) => {
    if (!remarks.length) return;
    if (y > doc.internal.pageSize.getHeight() - 90) { doc.addPage(); y = M + 20; }
    setF('bold', 8); text(label, M + 10, y);
    y += 12; setF('normal', 8);
    remarks.forEach((r: any) => {
      const who = r.user?.staffUser?.name ?? r.user?.email ?? '';
      const meta = [who, fmtDate(r.createdAt)].filter(Boolean).join(' • ');
      const body = meta ? `• ${r.content}   (${meta})` : `• ${r.content}`;
      (doc.splitTextToSize(body, right - M - 16) as string[]).forEach((ln) => { text(ln, M + 16, y); y += 11; });
    });
    y += 4;
  };

  y += 34;
  signatureLine(doc, M + 10, y, 150, decided, 'Date');
  signatureLine(doc, right - 220, y, 210, decision, 'SAB Campus - Exam Division');
  y += 24;
  if (app.status === 'REJECTED') showRemarks('Reason for Rejection (Exam Division):');
  y += 8;

  /* ── Finance Verification (same layout as the exam division block) ── */
  const pay = app.payment;
  // Finance only acts after the exam division approves (status PAYMENT_PENDING onward);
  // before that (SUBMITTED / REJECTED) it has no status.
  const payStatus = (app.status === 'PAYMENT_VERIFIED' || app.status === 'APPROVED') ? 'Verified'
    : app.status === 'PAYMENT_REJECTED' ? 'Rejected'
      : app.status === 'PAYMENT_PENDING' ? 'Pending'
        : '';
  const payVerified = pay?.verifiedAt ? fmtDate(pay.verifiedAt) : '';
  setF('normal', 8.5);
  text('Payment Verification (Finance):', M, y);
  y += 34;
  signatureLine(doc, M + 10, y, 150, payVerified, 'Date');
  signatureLine(doc, right - 220, y, 210, payStatus, 'SAB Campus - Finance Division');
  y += 24;
  if (app.status !== 'REJECTED')
    showRemarks(app.status === 'PAYMENT_REJECTED' ? 'Reason for Rejection (Finance Division):' : 'Remarks:');

  // The footer (disclaimer + Application No + Generated timestamp) is drawn on
  // EVERY page of the final packet in buildApplicationPacket().

  return new Uint8Array(doc.output('arraybuffer'));
}

function catLabel(cat?: string): string {
  const c = (cat ?? '').toUpperCase();
  if (c.includes('MEDICAL')) return 'Medical';
  if (c.includes('REPEAT')) return 'Repeat';
  if (c.includes('1ST') || c.includes('FIRST')) return '1st Attempt';
  return cat ?? '';
}

function signatureLine(doc: any, x: number, y: number, w: number, value: string, label: string) {
  doc.setLineDashPattern([1, 1.6], 0);
  doc.setLineWidth(0.5); doc.line(x, y, x + w, y);
  doc.setLineDashPattern([], 0);
  if (value) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
    doc.text(value, x + w / 2, y - 3, { align: 'center' });
    doc.setFont('helvetica', 'normal');
  }
  doc.setFontSize(7.5);
  label.split('\n').forEach((ln, i) => doc.text(ln, x + w / 2, y + 11 + i * 9, { align: 'center' }));
}

/** Bordered table with fitted cell text and multi-line centered headers. */
function prevExamTable(doc: any, x: number, endX: number, y: number, headers: string[], widths: number[], rows: string[][], minRows: number): number {
  const headH = 22, rowH = 17;
  const nRows = Math.max(minRows, rows.length);
  const top = y, tblH = headH + nRows * rowH;
  const fit = (s: any, w: number): string => {
    let t = (s ?? '').toString();
    if (doc.getTextWidth(t) <= w) return t;
    while (t.length > 1 && doc.getTextWidth(t + '…') > w) t = t.slice(0, -1);
    return t + '…';
  };
  doc.setLineWidth(0.6); doc.rect(x, top, endX - x, tblH);
  // column x positions
  const colX = [x];
  for (let i = 0; i < widths.length - 1; i++) colX.push(colX[i] + widths[i]);
  for (let i = 1; i < colX.length; i++) doc.line(colX[i], top, colX[i], top + tblH);
  doc.line(x, top + headH, endX, top + headH);
  // headers (wrap to 2 lines if needed, centered)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
  headers.forEach((h, i) => {
    const cw = widths[i];
    const cx = colX[i] + cw / 2;
    const words = h.split(' ');
    // greedily wrap into up to 2 lines
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (doc.getTextWidth(test) > cw - 6 && cur) { lines.push(cur); cur = w; } else cur = test;
    }
    if (cur) lines.push(cur);
    const startY = top + 10 - (lines.length - 1) * 4;
    lines.slice(0, 2).forEach((ln, j) => doc.text(fit(ln, cw - 4), cx, startY + j * 8, { align: 'center' }));
  });
  // rows
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  for (let i = 0; i < nRows; i++) {
    const ry = top + headH + i * rowH;
    if (i > 0) { doc.setLineWidth(0.4); doc.line(x, ry, endX, ry); }
    const r = rows[i];
    if (!r) continue;
    r.forEach((c, ci) => {
      const cw = widths[ci];
      const t = fit(c ?? '', cw - 6);
      // course title left-aligned, everything else centered
      if (ci === 1) doc.text(t, colX[ci] + 3, ry + 12);
      else doc.text(t, colX[ci] + cw / 2, ry + 12, { align: 'center' });
    });
  }
  return top + tblH;
}

/* ───────────────────────── Merge attachments (pdf-lib) ───────────────────────── */

/** Decode any browser-supported image to PNG bytes (handles jpg/png/webp/gif). */
async function imageToPngBytes(bytes: Uint8Array, mime: string): Promise<Uint8Array> {
  const blob = new Blob([bytes as unknown as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext('2d')!.drawImage(img, 0, 0);
    const dataUrl = canvas.toDataURL('image/png');
    const b64 = dataUrl.split(',')[1];
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// A4 portrait dimensions (pt).
const A4_W = 595.28;
const A4_H = 841.89;

/**
 * Build the filled form + append each attachment. Every page in the result is a
 * portrait A4 page and carries the same footer (disclaimer + Application No +
 * Generated timestamp).
 */
export async function buildApplicationPacket(app: StaffApplication, generatedBy?: string): Promise<Blob> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');

  const formBytes = await buildApplicationFormPdf(app);
  const merged = await PDFDocument.create();
  const fontBold = await merged.embedFont(StandardFonts.HelveticaBold);
  const font = await merged.embedFont(StandardFonts.Helvetica);
  const fontItalic = await merged.embedFont(StandardFonts.HelveticaOblique);

  // Draw one embedded page (from a form/attachment PDF) onto a fresh portrait A4.
  // `full` = draw at native size top-aligned (form pages are already A4 portrait);
  // otherwise scale-to-fit within the content area above the footer.
  const placeEmbedded = (ep: any, full: boolean, label?: string) => {
    const page = merged.addPage([A4_W, A4_H]);
    if (full && Math.abs(ep.width - A4_W) < 2 && Math.abs(ep.height - A4_H) < 2) {
      page.drawPage(ep, { x: 0, y: 0, width: A4_W, height: A4_H });
      return;
    }
    const M = 36, footerH = 46, labelH = label ? 18 : 0;
    const availW = A4_W - 2 * M;
    const availH = A4_H - M - labelH - footerH;
    const scale = Math.min(availW / ep.width, availH / ep.height);
    const w = ep.width * scale, h = ep.height * scale;
    const x = (A4_W - w) / 2;
    const y = footerH + (availH - h) / 2;
    if (label) page.drawText(label, { x: M, y: A4_H - M - 4, size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
    page.drawPage(ep, { x, y, width: w, height: h });
  };

  // 1) form pages — full size (already A4 portrait)
  const formDoc = await PDFDocument.load(formBytes);
  const formEmbedded = await merged.embedPages(formDoc.getPages());
  for (const ep of formEmbedded) placeEmbedded(ep, true);

  // 2) attachments after the form — each fitted onto its own portrait A4 page
  for (const d of app.documents ?? []) {
    let data: { bytes: Uint8Array; mimeType: string };
    try {
      data = await staffApi.documentBytes(d.id);
    } catch (e) {
      console.error(`[packet] failed to download attachment ${d.fileName} (${d.id})`, e);
      continue; // skip unreadable attachment
    }
    const name = (d.fileName || '').toLowerCase();
    const isPdf = data.mimeType.includes('pdf') || name.endsWith('.pdf');
    const label = DOC_TYPE_LABELS[d.documentType as keyof typeof DOC_TYPE_LABELS] || d.fileName || 'Attachment';

    if (isPdf) {
      try {
        const att = await PDFDocument.load(data.bytes, { ignoreEncryption: true });
        const embedded = await merged.embedPages(att.getPages());
        embedded.forEach((ep, i) => placeEmbedded(ep, false, i === 0 ? label : `${label} (cont.)`));
      } catch (e) { console.error(`[packet] broken PDF ${d.fileName}`, e); }
    } else {
      // treat as image → its own fitted portrait page
      let pngBytes: Uint8Array;
      try {
        pngBytes = await imageToPngBytes(data.bytes, data.mimeType || 'image/jpeg');
      } catch (e) {
        console.error(`[packet] image decode failed ${d.fileName}`, e);
        continue;
      }
      const png = await merged.embedPng(pngBytes);
      const page = merged.addPage([A4_W, A4_H]);
      const M = 36, footerH = 46, labelH = 18;
      page.drawText(label, { x: M, y: A4_H - M - 4, size: 11, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
      const availW = A4_W - 2 * M;
      const availH = A4_H - M - labelH - footerH;
      const scale = Math.min(availW / png.width, availH / png.height);
      const w = png.width * scale, h = png.height * scale;
      page.drawImage(png, { x: (A4_W - w) / 2, y: footerH + (availH - h) / 2, width: w, height: h });
    }
  }

  // 3) footer on every page
  const serialText = app.serialNumber ? `Application No: ${app.serialNumber}` : '';
  const ts = new Date().toLocaleString('en-GB');
  const generatedText = generatedBy ? `Generated by ${generatedBy} · ${ts}` : `Generated: ${ts}`;
  drawPacketFooters(merged.getPages(), { font, fontItalic, rgb, serialText, generatedText });

  const out = await merged.save();
  return new Blob([out as unknown as BlobPart], { type: 'application/pdf' });
}

/** Stamp the disclaimer + Application No + Generated timestamp on the bottom of every page. */
function drawPacketFooters(
  pages: any[],
  o: { font: any; fontItalic: any; rgb: any; serialText: string; generatedText: string },
) {
  const M = 36;
  const gray = o.rgb(0.47, 0.47, 0.47);
  const dz = 6.5, fz = 7;
  const d1 = '*This application is system-generated. This is provisional and subject to verification by the Examination Department';
  const d2 = 'SAB Campus, The Institute of Chartered Accountants of Sri Lanka.';
  for (const page of pages) {
    const { width } = page.getSize();
    const centre = (t: string, y: number) => {
      const tw = o.fontItalic.widthOfTextAtSize(t, dz);
      page.drawText(t, { x: (width - tw) / 2, y, size: dz, font: o.fontItalic, color: gray });
    };
    centre(d1, 34);
    centre(d2, 25);
    if (o.serialText) page.drawText(o.serialText, { x: M, y: 12, size: fz, font: o.font, color: gray });
    const gw = o.font.widthOfTextAtSize(o.generatedText, fz);
    page.drawText(o.generatedText, { x: width - M - gw, y: 12, size: fz, font: o.font, color: gray });
  }
}

/**
 * Show a ready PDF blob as an in-tab print view. The tab renders an HTML page
 * that embeds the PDF in an <iframe>, so it always displays inline (a viewer you
 * can print from) instead of triggering a file download — even when the browser
 * is set to "download PDFs instead of opening them".
 */
function showPdf(blob: Blob, win: Window | null, fileName: string) {
  const url = URL.createObjectURL(blob);
  const target = win && !win.closed ? win : window.open('', '_blank');
  if (target) {
    target.document.open();
    target.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>${fileName}</title>` +
      `<style>html,body{margin:0;height:100%}iframe{border:0;width:100%;height:100vh}</style></head>` +
      `<body><iframe src="${url}" title="${fileName}"></iframe></body></html>`,
    );
    target.document.close();
  }
  setTimeout(() => URL.revokeObjectURL(url), 120000);
}

/**
 * Open the merged application packet in a new tab (print-ready).
 * `win` should be opened synchronously in the click handler (via openBlankTab)
 * so the browser keeps the user-gesture and doesn't block/abort the blob tab.
 */
export async function printApplicationPacket(app: StaffApplication, win?: Window | null, generatedBy?: string) {
  const w = win !== undefined ? win : openBlankTab();
  try {
    const blob = await buildApplicationPacket(app, generatedBy);
    showPdf(blob, w, `application-${app.serialNumber ?? app.id}.pdf`);
  } catch (e) {
    try { w?.close(); } catch { /* noop */ }
    throw e;
  }
}

/** Open a blank tab immediately (call from the click handler, before awaiting). */
export function openBlankTab(): Window | null {
  return typeof window !== 'undefined' ? window.open('', '_blank') : null;
}

/**
 * Fetch the full application (with documents + subject exam details) by id,
 * then open the merged form-and-attachments packet in a new tab.
 */
export async function printApplicationById(id: string, win?: Window | null, generatedBy?: string) {
  const w = win !== undefined ? win : openBlankTab();
  try {
    const full = await staffApi.getApplication(id);
    await printApplicationPacket(full, w, generatedBy);
  } catch (e) {
    try { w?.close(); } catch { /* noop */ }
    throw e;
  }
}
