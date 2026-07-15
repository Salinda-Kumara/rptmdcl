import { StaffApplication } from './staff-api';
import { ApplicationSubject, subjectCategoryLabel } from './applications-api';

/** Report status label aligned with the Applications board columns. */
function reportStatus(status: string): string {
  switch (status) {
    case 'SUBMITTED':        return 'New';
    case 'PAYMENT_PENDING':  return 'Finance Pending';
    case 'PAYMENT_VERIFIED': return 'Approved';
    case 'APPROVED':         return 'Approved';
    case 'PAYMENT_REJECTED': return 'Finance Rejected';
    case 'REJECTED':         return 'Exam Rejected';
    case 'DRAFT':            return 'Draft';
    case 'CANCELLED':        return 'Cancelled';
    default:                 return status;
  }
}

const fmt = (d?: string | Date | null) => (d ? new Date(d).toLocaleDateString('en-LK', { dateStyle: 'medium' }) : '');

// Per-subject fee driven by category (mirrors the API).
const feeForCategory = (category?: string | null): number =>
  String(category ?? '').toUpperCase() === 'REPEAT' ? 2600 : 5200;

// One exported row per subject. `s` is undefined only for the (rare) case of an
// application with no subjects, so it still appears as a single row.
interface ExportRow {
  a: StaffApplication;
  s?: ApplicationSubject;
  /** First subject row of its application — used to merge shared columns. */
  first: boolean;
  /** Number of subject rows this application spans. */
  span: number;
}

function flatten(apps: StaffApplication[]): ExportRow[] {
  const rows: ExportRow[] = [];
  for (const a of apps) {
    const subs = a.applicationSubjects ?? [];
    if (subs.length === 0) {
      rows.push({ a, first: true, span: 1 });
      continue;
    }
    subs.forEach((s, i) => rows.push({ a, s, first: i === 0, span: subs.length }));
  }
  return rows;
}

/** Latest approvedAt timestamp among the application's approvals. */
function lastApprovalDate(a: StaffApplication): string | undefined {
  const dates = (a.approvals ?? []).map((x) => x.approvedAt).filter(Boolean) as string[];
  if (dates.length === 0) return undefined;
  return dates.sort().at(-1);
}

/** Decision date — the approved date for approved apps, the rejected date for rejected apps. */
function decisionDate(a: StaffApplication): string {
  const s = a.status;
  if (s === 'PAYMENT_VERIFIED' || s === 'APPROVED') {
    return fmt(a.payment?.verifiedAt ?? lastApprovalDate(a));
  }
  if (s === 'REJECTED' || s === 'PAYMENT_REJECTED') {
    // Rejection sets approvedAt on the approval and adds a remark — use whichever exists.
    return fmt(lastApprovalDate(a) ?? (a.remarks ?? []).at(-1)?.createdAt);
  }
  return '';
}

/**
 * Columns exported to Excel / PDF, in order. Each column is either application
 * level (`app: true` → merged across the application's subject rows) or subject
 * level (a distinct value per subject row).
 */
interface Col {
  header: string;
  get: (row: ExportRow) => string | number;
  app?: boolean; // application-level → merge across subject rows
  num?: boolean; // numeric (fee) formatting
}

const COLUMNS: Col[] = [
  { header: 'Submitted Date',    app: true, get: ({ a }) => fmt(a.submittedAt) },
  { header: 'Serial No.',        app: true, get: ({ a }) => a.serialNumber ?? '' },
  { header: 'Registration No.',  app: true, get: ({ a }) => a.student?.registrationNumber ?? '' },
  { header: 'Student Name',      app: true, get: ({ a }) => a.student?.fullName ?? '' },
  { header: 'Batch',             app: true, get: ({ a }) => a.student?.batchNumber ?? '' },
  { header: 'NIC',               app: true, get: ({ a }) => a.student?.nic ?? '' },
  { header: 'Mobile',            app: true, get: ({ a }) => a.student?.mobile ?? '' },
  { header: 'Email',             app: true, get: ({ a }) => a.student?.email ?? '' },
  { header: 'Type',              app: true, get: ({ a }) => (a.type === 'MEDICAL' ? 'Medical' : 'Repeat') },
  // ── Per-subject columns ──
  { header: 'Subject Code',      get: ({ s }) => s?.subject?.code ?? '' },
  { header: 'Subject Name',      get: ({ s }) => s?.subject?.name ?? '' },
  { header: 'Category',          get: ({ s }) => (s ? subjectCategoryLabel(s.category) : '') },
  { header: 'CA Marks',          get: ({ s }) => (s?.caMarks ?? '') as number | string },
  { header: 'Subject Fee (LKR)', num: true, get: ({ s }) => (s ? feeForCategory(s.category) : 0) },
  { header: 'Upcoming Exam Date', get: ({ s }) => fmt(s?.upcomingExamDate) },
  { header: 'Upcoming Intake',   get: ({ s }) => s?.upcomingExamIntake ?? '' },
  { header: 'Previous Exam Date', get: ({ s }) => fmt(s?.previousExamDate) },
  // ── Application status / payment (merged) ──
  { header: 'Total Fee (LKR)',   app: true, num: true, get: ({ a }) => a.totalFee ?? 0 },
  { header: 'Payment Ref.',      app: true, get: ({ a }) => a.paymentReferenceId ?? '' },
  { header: 'Status',            app: true, get: ({ a }) => reportStatus(a.status) },
  { header: 'Approved/Rejected Date', app: true, get: ({ a }) => decisionDate(a) },
  { header: 'Remarks',           app: true, get: ({ a }) => (a.remarks ?? []).map((r) => r.content).filter(Boolean).join(' | ') },
];

function todayStamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
}

/** Export applications to a professionally styled .xlsx file (exceljs). */
export async function exportApplicationsExcel(apps: StaffApplication[]) {
  const ExcelJS = (await import('exceljs')).default ?? (await import('exceljs'));

  const INDIGO = 'FF4F46E5';
  const INDIGO_DARK = 'FF3730A3';
  const ZEBRA = 'FFF6F7FB';
  const BORDER = 'FFD8DCE6';

  const wb = new ExcelJS.Workbook();
  wb.creator = 'ERMS';
  wb.created = new Date();
  const ws = wb.addWorksheet('Applications', {
    views: [{ state: 'frozen', ySplit: 4 }], // freeze title + header rows
    properties: { defaultRowHeight: 18 },
  });

  const nCols = COLUMNS.length;
  const lastCol = ws.getColumn(nCols).letter;

  // ── Title band ──
  ws.mergeCells(`A1:${lastCol}1`);
  const title = ws.getCell('A1');
  title.value = 'ERMS — Applications Report';
  title.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  title.fill = { type: 'gradient', gradient: 'angle', degree: 0,
    stops: [{ position: 0, color: { argb: INDIGO } }, { position: 1, color: { argb: INDIGO_DARK } }] };
  title.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(1).height = 34;

  ws.mergeCells(`A2:${lastCol}2`);
  const meta = ws.getCell('A2');
  const revenue = apps
    .filter((a) => a.status === 'PAYMENT_VERIFIED' || a.status === 'APPROVED')
    .reduce((s, a) => s + (a.totalFee ?? 0), 0);
  meta.value = `School of Accounting and Business — CA Sri Lanka   ·   Generated ${new Date().toLocaleString('en-LK')}   ·   ${apps.length} application(s)   ·   Approved revenue: LKR ${revenue.toLocaleString('en-LK')}`;
  meta.font = { name: 'Calibri', size: 9, color: { argb: 'FF6B7280' } };
  meta.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  ws.getRow(2).height = 16;
  ws.getRow(3).height = 6; // spacer

  // ── Header row ──
  const headerRow = ws.getRow(4);
  COLUMNS.forEach((c, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = c.header;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INDIGO } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = { bottom: { style: 'medium', color: { argb: INDIGO_DARK } } };
  });
  headerRow.height = 26;

  // ── Data rows (one per subject; app-level columns merged per application) ──
  const statusFont: Record<string, string> = {
    'Approved': 'FF047857', 'Exam Rejected': 'FFB91C1C', 'Finance Rejected': 'FFB91C1C',
    'New': 'FF1D4ED8', 'Finance Pending': 'FFB45309',
  };
  const rows = flatten(apps);
  const HEADER_OFFSET = 5; // first data row number
  let appGroupIndex = 0; // stripe by application, not by subject row
  rows.forEach((rowData, r) => {
    if (rowData.first && r > 0) appGroupIndex++;
    const rowNo = HEADER_OFFSET + r;
    const row = ws.getRow(rowNo);
    const zebra = appGroupIndex % 2 === 1;
    COLUMNS.forEach((c, i) => {
      // For a merged app-level column only the first row of the group holds the value.
      if (c.app && !rowData.first) return;
      const cell = row.getCell(i + 1);
      cell.value = c.get(rowData);
      cell.font = { name: 'Calibri', size: 9.5 };
      cell.alignment = { vertical: 'middle', wrapText: ['Remarks'].includes(c.header) };
      if (zebra) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };
      cell.border = {
        bottom: { style: 'thin', color: { argb: BORDER } },
        right: { style: 'thin', color: { argb: BORDER } },
      };
      if (c.num) { cell.numFmt = '#,##0.00'; cell.alignment = { vertical: 'middle', horizontal: 'right' }; }
      if (['CA Marks', 'Category'].includes(c.header)) cell.alignment = { vertical: 'middle', horizontal: 'center' };
      if (c.header === 'Status') {
        const color = statusFont[String(cell.value)] ?? 'FF334155';
        cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: color } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      }
    });
    // Merge app-level columns across this application's subject rows.
    if (rowData.first && rowData.span > 1) {
      COLUMNS.forEach((c, i) => {
        if (!c.app) return;
        ws.mergeCells(rowNo, i + 1, rowNo + rowData.span - 1, i + 1);
      });
    }
  });

  // ── Totals row ──
  const totalRowNo = HEADER_OFFSET + rows.length;
  const totalRow = ws.getRow(totalRowNo);
  totalRow.getCell(1).value = `Total: ${apps.length} application(s), ${rows.filter((x) => x.s).length} subject(s)`;
  totalRow.getCell(1).font = { name: 'Calibri', size: 10, bold: true };
  const subjectFeeIdx = COLUMNS.findIndex((c) => c.header === 'Subject Fee (LKR)') + 1;
  const subjectFeeCell = totalRow.getCell(subjectFeeIdx);
  subjectFeeCell.value = rows.reduce((s, x) => s + (x.s ? feeForCategory(x.s.category) : 0), 0);
  subjectFeeCell.numFmt = '#,##0.00';
  subjectFeeCell.font = { name: 'Calibri', size: 10, bold: true };
  subjectFeeCell.alignment = { horizontal: 'right' };
  totalRow.eachCell((cell) => {
    cell.border = { top: { style: 'medium', color: { argb: INDIGO } } };
  });

  // ── Column widths + autofilter ──
  const widths: Record<string, number> = {
    'Submitted Date': 14, 'Serial No.': 13, 'Registration No.': 16, 'Student Name': 26,
    'Batch': 10, 'NIC': 14, 'Mobile': 13, 'Email': 24, 'Type': 9,
    'Subject Code': 16, 'Subject Name': 34, 'Category': 12, 'CA Marks': 9,
    'Subject Fee (LKR)': 14, 'Upcoming Exam Date': 16, 'Upcoming Intake': 16, 'Previous Exam Date': 16,
    'Total Fee (LKR)': 14, 'Payment Ref.': 14,
    'Status': 15, 'Approved/Rejected Date': 15, 'Remarks': 36,
  };
  COLUMNS.forEach((c, i) => { ws.getColumn(i + 1).width = widths[c.header] ?? 14; });
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4 + rows.length, column: nCols } };

  // ── Save ──
  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf as unknown as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `applications-${todayStamp()}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/** Export applications to a landscape .pdf file. */
export async function exportApplicationsPdf(apps: StaffApplication[]) {
  // Defensive resolution — handles ESM/CJS interop differences across bundlers.
  const jspdfMod: any = await import('jspdf');
  const jsPDF = jspdfMod.jsPDF ?? jspdfMod.default?.jsPDF ?? jspdfMod.default;
  const autoTableMod: any = await import('jspdf-autotable');
  const autoTable = autoTableMod.default ?? autoTableMod.autoTable;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

  const now = new Date();
  doc.setFontSize(14);
  doc.text('ERMS — Applications Report', 40, 36);
  doc.setFontSize(9);
  doc.setTextColor(120);
  const rows = flatten(apps);
  doc.text(
    `Generated ${now.toLocaleString('en-LK')}  ·  ${apps.length} application(s)  ·  ${rows.filter((x) => x.s).length} subject(s)`,
    40,
    50,
  );

  // Slim the PDF for width — drop the wide/less-critical columns.
  const pdfCols = COLUMNS.filter((c) =>
    !['Email', 'NIC', 'Mobile', 'Upcoming Intake', 'Remarks'].includes(c.header),
  );

  // One row per subject; app-level cells use rowSpan to merge across the
  // application's subject rows (emitted only on the first subject row).
  const body = rows.map((rowData) =>
    pdfCols.flatMap((c) => {
      if (c.app && !rowData.first) return [];
      const val = String(c.get(rowData));
      return [c.app && rowData.span > 1
        ? { content: val, rowSpan: rowData.span, styles: { valign: 'middle' as const } }
        : val];
    }),
  );

  autoTable(doc, {
    startY: 62,
    head: [pdfCols.map((c) => c.header)],
    body,
    styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 40, right: 40 },
  });

  doc.save(`applications-${todayStamp()}.pdf`);
}
