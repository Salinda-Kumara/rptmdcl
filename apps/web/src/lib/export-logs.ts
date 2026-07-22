// Excel export for the Activity Logs view. The caller pre-formats each row using
// the same human-readable labels shown in the table, so the spreadsheet matches
// exactly what the admin sees on screen.

export interface LogExportRow {
  time: string;
  user: string;
  email: string;
  action: string;
  description: string;
  application: string;
  method: string;
  route: string;
  status: string;
  ip: string;
}

const COLUMNS: { header: string; key: keyof LogExportRow; width: number; wrap?: boolean }[] = [
  { header: 'Time', key: 'time', width: 20 },
  { header: 'User', key: 'user', width: 24 },
  { header: 'Email', key: 'email', width: 28 },
  { header: 'Action', key: 'action', width: 24 },
  { header: 'Description', key: 'description', width: 40, wrap: true },
  { header: 'Application', key: 'application', width: 16 },
  { header: 'Method', key: 'method', width: 10 },
  { header: 'Route', key: 'route', width: 40, wrap: true },
  { header: 'Status', key: 'status', width: 10 },
  { header: 'IP Address', key: 'ip', width: 16 },
];
const NCOLS = COLUMNS.length;

const C = {
  title: 'FF0F172A',
  titleText: 'FFFFFFFF',
  header: 'FFB45309',   // amber-700 (matches the Logs accent)
  headerText: 'FFFFFFFF',
  zebra: 'FFFDF4E7',    // soft amber tint
  border: 'FFCBD5E1',
};

function saveBlob(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Build and download a styled .xlsx of the (already filtered + formatted) logs. */
export async function exportLogsExcel(rows: LogExportRow[], meta: { filterNote?: string } = {}) {
  const ExcelJS: any = (await import('exceljs')).default ?? (await import('exceljs'));

  const wb = new ExcelJS.Workbook();
  wb.creator = 'ERMS';
  wb.created = new Date();
  const ws = wb.addWorksheet('Activity Logs', {
    views: [{ state: 'frozen', ySplit: 4 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  ws.columns = COLUMNS.map((c) => ({ width: c.width }));
  const thin = { style: 'thin', color: { argb: C.border } } as const;
  const allBorders = { top: thin, left: thin, bottom: thin, right: thin };
  const lastCol = ws.getColumn(NCOLS).letter;

  // ── Title block ──
  ws.mergeCells(`A1:${lastCol}1`);
  const t1 = ws.getCell('A1');
  t1.value = 'ERMS — ACTIVITY LOGS';
  t1.font = { name: 'Calibri', size: 15, bold: true, color: { argb: C.titleText } };
  t1.alignment = { horizontal: 'center', vertical: 'middle' };
  t1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.title } };
  ws.getRow(1).height = 24;

  ws.mergeCells(`A2:${lastCol}2`);
  const t2 = ws.getCell('A2');
  const note = meta.filterNote ? `${meta.filterNote}     •     ` : '';
  t2.value = `${note}${rows.length} record${rows.length !== 1 ? 's' : ''}     •     Generated ${new Date().toLocaleString('en-GB')}`;
  t2.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF64748B' } };
  t2.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(3).height = 4; // slim spacer

  // ── Header row (row 4) ──
  const headerIdx = 4;
  const header = ws.getRow(headerIdx);
  COLUMNS.forEach((c, i) => {
    const cell = header.getCell(i + 1);
    cell.value = c.header;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: C.headerText } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.header } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = allBorders;
  });
  header.height = 22;

  // ── Data rows ──
  let r = headerIdx + 1;
  rows.forEach((row, idx) => {
    const rowRef = ws.getRow(r);
    const zebra = idx % 2 === 1;
    COLUMNS.forEach((c, i) => {
      const cell = rowRef.getCell(i + 1);
      cell.value = row[c.key] ?? '';
      cell.font = { name: 'Calibri', size: 9, color: { argb: 'FF1E293B' } };
      cell.alignment = { vertical: 'middle', wrapText: !!c.wrap, horizontal: c.key === 'method' || c.key === 'status' ? 'center' : 'left' };
      cell.border = allBorders;
      if (zebra) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.zebra } };
    });
    r += 1;
  });

  ws.autoFilter = { from: { row: headerIdx, column: 1 }, to: { row: Math.max(headerIdx, r - 1), column: NCOLS } };

  const buffer = await wb.xlsx.writeBuffer();
  const stamp = new Date().toISOString().slice(0, 10);
  saveBlob(buffer, `ERMS_Activity_Logs_${stamp}.xlsx`);
}
