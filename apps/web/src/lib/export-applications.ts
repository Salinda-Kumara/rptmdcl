import { StaffApplication } from './staff-api';

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

/** Columns exported to Excel / PDF, in order. */
const COLUMNS: { header: string; get: (a: StaffApplication) => string | number }[] = [
  { header: 'Submitted Date',    get: (a) => fmt(a.submittedAt) },
  { header: 'Serial No.',        get: (a) => a.serialNumber ?? '' },
  { header: 'Registration No.',  get: (a) => a.student?.registrationNumber ?? '' },
  { header: 'Student Name',      get: (a) => a.student?.fullName ?? '' },
  { header: 'Batch',             get: (a) => a.student?.batchNumber ?? '' },
  { header: 'NIC',               get: (a) => a.student?.nic ?? '' },
  { header: 'Mobile',            get: (a) => a.student?.mobile ?? '' },
  { header: 'Email',             get: (a) => a.student?.email ?? '' },
  { header: 'Type',              get: (a) => (a.type === 'MEDICAL' ? 'Medical' : 'Repeat') },
  { header: 'Subjects',          get: (a) => a.applicationSubjects?.length ?? 0 },
  { header: 'Subject Codes',     get: (a) => (a.applicationSubjects ?? []).map((s) => s.subject?.code).filter(Boolean).join(', ') },
  { header: 'Subject Names',     get: (a) => (a.applicationSubjects ?? []).map((s) => s.subject?.name).filter(Boolean).join(', ') },
  { header: 'Total Fee (LKR)',   get: (a) => a.totalFee ?? 0 },
  { header: 'Payment Ref.',      get: (a) => a.paymentReferenceId ?? '' },
  { header: 'Status',            get: (a) => reportStatus(a.status) },
  { header: 'Approved/Rejected Date', get: (a) => decisionDate(a) },
  { header: 'Remarks',           get: (a) => (a.remarks ?? []).map((r) => r.content).filter(Boolean).join(' | ') },
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
  wb.creator = 'ERMAS';
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
  title.value = 'ERMAS — Applications Report';
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

  // ── Data rows ──
  const statusFont: Record<string, string> = {
    'Approved': 'FF047857', 'Exam Rejected': 'FFB91C1C', 'Finance Rejected': 'FFB91C1C',
    'New': 'FF1D4ED8', 'Finance Pending': 'FFB45309',
  };
  apps.forEach((a, r) => {
    const row = ws.getRow(5 + r);
    COLUMNS.forEach((c, i) => {
      const cell = row.getCell(i + 1);
      cell.value = c.get(a);
      cell.font = { name: 'Calibri', size: 9.5 };
      cell.alignment = { vertical: 'middle', wrapText: ['Subject Names', 'Remarks'].includes(c.header) };
      if (r % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };
      cell.border = {
        bottom: { style: 'thin', color: { argb: BORDER } },
        right: { style: 'thin', color: { argb: BORDER } },
      };
      if (c.header === 'Total Fee (LKR)') { cell.numFmt = '#,##0.00'; cell.alignment = { horizontal: 'right' }; }
      if (c.header === 'Subjects') cell.alignment = { horizontal: 'center' };
      if (c.header === 'Status') {
        const color = statusFont[String(cell.value)] ?? 'FF334155';
        cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: color } };
        cell.alignment = { horizontal: 'center' };
      }
    });
  });

  // ── Totals row ──
  const totalRow = ws.getRow(5 + apps.length);
  totalRow.getCell(1).value = `Total: ${apps.length}`;
  totalRow.getCell(1).font = { name: 'Calibri', size: 10, bold: true };
  const feeIdx = COLUMNS.findIndex((c) => c.header === 'Total Fee (LKR)') + 1;
  const feeCell = totalRow.getCell(feeIdx);
  feeCell.value = apps.reduce((s, a) => s + (a.totalFee ?? 0), 0);
  feeCell.numFmt = '#,##0.00';
  feeCell.font = { name: 'Calibri', size: 10, bold: true };
  feeCell.alignment = { horizontal: 'right' };
  totalRow.eachCell((cell) => {
    cell.border = { top: { style: 'medium', color: { argb: INDIGO } } };
  });

  // ── Column widths + autofilter ──
  const widths: Record<string, number> = {
    'Submitted Date': 14, 'Serial No.': 13, 'Registration No.': 16, 'Student Name': 26,
    'Batch': 10, 'NIC': 14, 'Mobile': 13, 'Email': 24, 'Type': 9, 'Subjects': 9,
    'Subject Codes': 22, 'Subject Names': 36, 'Total Fee (LKR)': 14, 'Payment Ref.': 14,
    'Status': 15, 'Approved/Rejected Date': 15, 'Remarks': 36,
  };
  COLUMNS.forEach((c, i) => { ws.getColumn(i + 1).width = widths[c.header] ?? 14; });
  ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4 + apps.length, column: nCols } };

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
  doc.text('ERMAS — Applications Report', 40, 36);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(
    `Generated ${now.toLocaleString('en-LK')}  ·  ${apps.length} application(s)`,
    40,
    50,
  );

  // Slim the PDF for width — drop the wide/less-critical columns.
  const pdfCols = COLUMNS.filter((c) =>
    !['Email', 'NIC', 'Mobile', 'Subject Names'].includes(c.header),
  );

  autoTable(doc, {
    startY: 62,
    head: [pdfCols.map((c) => c.header)],
    body: apps.map((a) => pdfCols.map((c) => String(c.get(a)))),
    styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 40, right: 40 },
  });

  doc.save(`applications-${todayStamp()}.pdf`);
}
