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

  // helpers
  const line = (x1: number, y1: number, x2: number, y2: number, w = 0.6) => {
    doc.setLineWidth(w); doc.line(x1, y1, x2, y2);
  };
  const rect = (x: number, y: number, w: number, h: number, lw = 0.6) => {
    doc.setLineWidth(lw); doc.rect(x, y, w, h);
  };
  const text = (s: string, x: number, y: number, opts: any = {}) => {
    doc.text(s ?? '', x, y, opts);
  };
  const dotted = (label: string, x: number, y: number, endX: number, value?: string) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    text(label, x, y);
    const lw = doc.getTextWidth(label);
    const startX = x + lw + 4;
    // value (bold) then dotted underline filler
    if (value) { doc.setFont('helvetica', 'bold'); text(value, startX + 2, y - 1); doc.setFont('helvetica', 'normal'); }
    doc.setLineDashPattern([1, 1.6], 0);
    line(startX, y + 2, endX, y + 2, 0.5);
    doc.setLineDashPattern([], 0);
  };

  let y = M + 6;

  /* ── Header ── */
  const logoX = M + 76;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12);
  text(TITLES[prog], logoX, y);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
  text('School of Accounting and Business, No. 30A, Malalasekara Mawatha, Colombo 07.', logoX, y + 14);
  text('Tel: 011-2352077   Fax: 011-2352060', logoX, y + 26);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  text('APPLICATION FOR THE END SEMESTER EXAMINATION', logoX, y + 40);
  text('REPEAT / MEDICAL APPLICATION', logoX, y + 52);
  // SAB / CA logo
  try {
    const { SAB_LOGO_DATA_URL } = await import('./sab-logo');
    doc.addImage(SAB_LOGO_DATA_URL, 'JPEG', M, y - 8, 64, 64);
  } catch {
    rect(M, y - 8, 58, 56);
  }

  y += 64;
  line(M, y, right, y, 1);

  /* ── Bank table ── */
  y += 4;
  const bankH = 30;
  const c1 = M, c2 = M + 300, c3 = c2 + 95, c4 = c3 + 80;
  rect(c1, y, right - c1, bankH);
  line(c2, y, c2, y + bankH); line(c3, y, c3, y + bankH); line(c4, y, c4, y + bankH);
  line(c1, y + bankH / 2, right, y + bankH / 2);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
  text('Bank Account Name', c1 + 90, y + 10); text('Bank', c2 + 30, y + 10);
  text('Branch', c3 + 22, y + 10); text('Account No', c4 + 14, y + 10);
  doc.setFont('helvetica', 'normal');
  text('The Institute of Chartered Accountants of Sri Lanka- SAB', c1 + 20, y + 24);
  text('Sampath Bank', c2 + 20, y + 24); text('Borella', c3 + 22, y + 24); text('000460002370', c4 + 12, y + 24);

  y += bankH + 20;

  /* ── 1–4 applicant fields ── */
  doc.setFontSize(9);
  const fullName = ad.fullName ?? app.student?.fullName ?? '';
  text('1.', M, y); text('i', M + 16, y); dotted('FullName (in BLOCKCAPITALS)', M + 28, y, right, fullName.toUpperCase());
  y += 18;
  text('ii', M + 16, y); dotted('Name with Initials (Mr./Ms.)', M + 28, y, right, ad.nameWithInitials ?? '');
  y += 20;
  text('2.', M, y); text('i', M + 16, y); dotted('Permanent Address', M + 28, y, right, ad.permanentAddress ?? '');
  y += 18;
  text('ii', M + 16, y); dotted('Postal Address (if different from 2 i)', M + 28, y, right, ad.postalAddress ?? '');
  y += 18;
  text('iii', M + 16, y); text('Contact Telephone Numbers', M + 28, y);
  y += 16;
  dotted('Home', M + 28, y, M + 190, ad.telephone ?? '');
  dotted('Mobile', M + 200, y, M + 360, ad.mobile ?? '');
  dotted('Email', M + 370, y, right, ad.email ?? '');
  y += 22;

  // NIC boxes
  text('3.', M, y + 2); text('NIC No. / Passport No.', M + 28, y + 2);
  const nic = (ad.nic ?? app.student?.nic ?? '').toString();
  const boxN = 14, boxW = 18, boxH = 16, boxX = M + 150;
  for (let i = 0; i < boxN; i++) {
    rect(boxX + i * boxW, y - 10, boxW, boxH, 0.5);
    if (nic[i]) { doc.setFont('helvetica', 'bold'); text(nic[i], boxX + i * boxW + 5, y + 2); doc.setFont('helvetica', 'normal'); }
  }
  y += 24;
  dotted('4.    SAB Registration Number', M, y, M + 330, ad.registrationNumber ?? app.student?.registrationNumber ?? '');
  dotted('Intake', M + 345, y, right, ad.intake ?? '');
  y += 22;

  /* ── 5. Subjects table ── */
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
  text('5. Subjects applied for:', M, y);
  doc.setFont('helvetica', 'italic'); doc.setFontSize(7.5);
  text('Please write the correct course code, the title and CA marks for each course.', M + 105, y);
  doc.setFont('helvetica', 'normal');
  y += 8;

  // columns
  const tcCode = M, tcTitle = M + 60, tcCat = M + 250, tcCA = M + 330, tcIntake = M + 390;
  const tEnd = right;
  const headH = 34;
  const rowH = 20;
  const nRows = Math.max(6, subjects.length);
  const tblTop = y;
  const tblBottom = tblTop + headH + nRows * rowH;

  // outer + verticals
  rect(M, tblTop, tEnd - M, headH + nRows * rowH);
  [tcTitle, tcCat, tcCA, tcIntake].forEach((cx) => line(cx, tblTop, cx, tblBottom));
  // header labels
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
  text('Course\ncode', tcCode + 6, tblTop + 12);
  text('Course title', tcTitle + 55, tblTop + 18);
  text(prog === 'AA' ? 'Category\n(Medical/\nRepeat/\n1st Attempt)' : 'Category\n(Medical/\nRepeat)', tcCat + 3, tblTop + 10);
  text('CA Marks\n(Mandatory)', tcCA + 2, tblTop + 12);
  text(prog === 'AA' ? 'Upcoming\nExam\nIntake' : 'Intake', tcIntake + 4, tblTop + 12);
  doc.setFont('helvetica', 'normal');
  // header row separator
  line(M, tblTop + headH, tEnd, tblTop + headH);

  // rows
  doc.setFontSize(8);
  for (let i = 0; i < nRows; i++) {
    const ry = tblTop + headH + i * rowH;
    if (i > 0) line(M, ry, tEnd, ry, 0.4);
    const s = subjects[i];
    if (s) {
      text(s.subject?.code ?? '', tcCode + 4, ry + 13);
      text(s.subject?.name ?? '', tcTitle + 4, ry + 13);
      text(catLabel(s.category), tcCat + 4, ry + 13);
      text(s.caMarks != null ? String(s.caMarks) : '', tcCA + 18, ry + 13);
      text(s.upcomingExamIntake ?? (s.upcomingExamDate ? fmtDate(s.upcomingExamDate) : ''), tcIntake + 4, ry + 13);
    }
  }
  y = tblBottom + 18;

  /* ── 6. Previous Examination Details ── */
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
  text('6. Previous Examination Details;', M, y);
  y += 14;

  const medical = subjects.filter((s) => (s.category ?? '').toUpperCase().includes('MEDICAL'));
  const repeat = subjects.filter((s) => (s.category ?? '').toUpperCase().includes('REPEAT'));

  // If Medical
  doc.setFont('helvetica', 'bold'); text('If Medical', M, y); y += 6;
  y = prevExamTable(doc, M, y, tEnd, ['Course\ncode', 'Course title', 'Date of the\nexam', 'Intake details'],
    [60, tEnd - M - 60 - 120 - 90, 120, 90],
    medical.map((s) => [s.subject?.code ?? '', s.subject?.name ?? '', fmtDate(s.previousExamDate), s.previousExamIntake ?? '']),
    3);
  y += 14;

  // If Repeat
  doc.setFont('helvetica', 'bold'); text('If Repeat Exam', M, y); y += 6;
  y = prevExamTable(doc, M, y, tEnd,
    ['Course\ncode', 'Course title', 'Date of the\nexam', 'Intake\ndetails', 'Grade\nEarned', 'Confirmation\nfrom Exam Div.'],
    [55, tEnd - M - 55 - 70 - 60 - 55 - 75, 70, 60, 55, 75],
    repeat.map((s) => [s.subject?.code ?? '', s.subject?.name ?? '', fmtDate(s.previousExamDate), s.previousExamIntake ?? '', s.gradeEarned ?? '', '']),
    3);
  y += 16;

  /* ── NOTE box ── */
  const noteH = 44;
  rect(M, y, 320, noteH);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
  text('NOTE', M + 145, y + 12);
  doc.setFontSize(7.5);
  text('*Re-sit examination fee on medical ground LKR. 5200/= per course/subject', M + 8, y + 26);
  text('*Repeat / Re- Repeat examination fee LKR. 2600/= per course/subject', M + 8, y + 38);
  doc.setFont('helvetica', 'normal');
  y += noteH + 20;

  /* ── Certification ── */
  doc.setFontSize(8.5);
  text('I certify that the particulars disclosed above are true and accurate.', M, y);
  y += 30;
  const submitted = fmtDate(app.submittedAt);
  signatureLine(doc, M + 20, y, 130, submitted, 'Date');
  signatureLine(doc, right - 200, y, 180, '', 'Signature of the Applicant');
  y += 34;

  /* ── For Office Use ── */
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  text('For Office Use Only', W / 2 - 40, y);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
  y += 14;
  text('Eligibility to sit for the End Semester Examination (Medical/Repeat):', M, y);
  // decision from approvals
  const approval = (app.approvals ?? []).find((a) => a.approvedAt);
  const decided = approval?.approvedAt ? fmtDate(approval.approvedAt) : '';
  const approvedBy = (app.status === 'PAYMENT_VERIFIED' || app.status === 'APPROVED') ? 'Approved' :
    (app.status === 'REJECTED' || app.status === 'PAYMENT_REJECTED') ? 'Rejected' : '';
  y += 30;
  signatureLine(doc, M + 10, y, 130, decided, 'Date');
  signatureLine(doc, right - 210, y, 190, approvedBy, 'Approved by\nAssistant Registrar - Exams');

  // Serial number footer
  if (app.serialNumber) {
    doc.setFontSize(8); doc.setTextColor(120);
    text(`Application No: ${app.serialNumber}`, M, doc.internal.pageSize.getHeight() - 20);
    doc.setTextColor(0);
  }

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
  if (value) { doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.text(value, x + 6, y - 3); doc.setFont('helvetica', 'normal'); }
  doc.setFontSize(7.5);
  const lines = label.split('\n');
  lines.forEach((ln, i) => doc.text(ln, x + w / 2 - doc.getTextWidth(ln) / 2, y + 11 + i * 9));
}

function prevExamTable(doc: any, x: number, y: number, endX: number, headers: string[], widths: number[], rows: string[][], minRows: number): number {
  const headH = 24, rowH = 18;
  const nRows = Math.max(minRows, rows.length);
  const top = y;
  const bottom = top + headH + nRows * rowH;
  doc.setLineWidth(0.6); doc.rect(x, top, endX - x, headH + nRows * rowH);
  // verticals
  let cx = x;
  const colX = [x];
  for (let i = 0; i < widths.length - 1; i++) { cx += widths[i]; colX.push(cx); doc.line(cx, top, cx, bottom); }
  // header
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5);
  headers.forEach((h, i) => {
    const hx = colX[i] + 4;
    h.split('\n').forEach((ln, j) => doc.text(ln, hx, top + 10 + j * 8));
  });
  doc.setFont('helvetica', 'normal');
  doc.line(x, top + headH, endX, top + headH);
  // rows
  doc.setFontSize(8);
  for (let i = 0; i < nRows; i++) {
    const ry = top + headH + i * rowH;
    if (i > 0) doc.setLineWidth(0.4), doc.line(x, ry, endX, ry);
    const r = rows[i];
    if (r) r.forEach((cell, c) => doc.text(cell ?? '', colX[c] + 4, ry + 12));
  }
  return bottom;
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

/**
 * Build the filled form + append each attachment, returning a merged PDF blob URL.
 */
export async function buildApplicationPacket(app: StaffApplication): Promise<Blob> {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');

  const formBytes = await buildApplicationFormPdf(app);
  const merged = await PDFDocument.create();
  const font = await merged.embedFont(StandardFonts.HelveticaBold);

  // 1) form pages
  const formDoc = await PDFDocument.load(formBytes);
  const formPages = await merged.copyPages(formDoc, formDoc.getPageIndices());
  formPages.forEach((p) => merged.addPage(p));

  // 2) attachments after the form
  for (const d of app.documents ?? []) {
    let data: { bytes: Uint8Array; mimeType: string };
    try {
      data = await staffApi.documentBytes(d.id);
    } catch {
      continue; // skip unreadable attachment
    }
    const name = (d.fileName || '').toLowerCase();
    const isPdf = data.mimeType.includes('pdf') || name.endsWith('.pdf');

    if (isPdf) {
      try {
        const att = await PDFDocument.load(data.bytes, { ignoreEncryption: true });
        const pages = await merged.copyPages(att, att.getPageIndices());
        pages.forEach((p) => merged.addPage(p));
      } catch { /* skip broken pdf */ }
    } else {
      // treat as image
      let pngBytes: Uint8Array;
      try {
        pngBytes = await imageToPngBytes(data.bytes, data.mimeType || 'image/jpeg');
      } catch {
        continue;
      }
      const png = await merged.embedPng(pngBytes);
      const page = merged.addPage([595.28, 841.89]);
      const label = DOC_TYPE_LABELS[d.documentType as keyof typeof DOC_TYPE_LABELS] || d.fileName || 'Attachment';
      page.drawText(label, { x: 36, y: 800, size: 12, font, color: rgb(0.1, 0.1, 0.1) });
      const maxW = 595.28 - 72;
      const maxH = 841.89 - 120;
      const scale = Math.min(maxW / png.width, maxH / png.height, 1);
      const w = png.width * scale;
      const h = png.height * scale;
      page.drawImage(png, { x: (595.28 - w) / 2, y: (841.89 - 120 - h) / 2 + 20, width: w, height: h });
    }
  }

  const out = await merged.save();
  return new Blob([out as unknown as BlobPart], { type: 'application/pdf' });
}

/** Open the merged application packet in a new tab (print-ready). */
export async function printApplicationPacket(app: StaffApplication) {
  const blob = await buildApplicationPacket(app);
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  // Revoke a bit later so the new tab has time to load it.
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

/**
 * Fetch the full application (with documents + subject exam details) by id,
 * then open the merged form-and-attachments packet in a new tab.
 */
export async function printApplicationById(id: string) {
  const full = await staffApi.getApplication(id);
  await printApplicationPacket(full);
}
