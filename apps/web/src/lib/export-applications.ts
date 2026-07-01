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

/** Export applications to an .xlsx file. */
export async function exportApplicationsExcel(apps: StaffApplication[]) {
  const XLSX = await import('xlsx');

  const rows = apps.map((a) => {
    const row: Record<string, string | number> = {};
    for (const col of COLUMNS) row[col.header] = col.get(a);
    return row;
  });

  const ws = XLSX.utils.json_to_sheet(rows, { header: COLUMNS.map((c) => c.header) });

  // Column widths
  ws['!cols'] = COLUMNS.map((c) => ({ wch: Math.max(c.header.length + 2, 14) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Applications');
  XLSX.writeFile(wb, `applications-${todayStamp()}.xlsx`);
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
