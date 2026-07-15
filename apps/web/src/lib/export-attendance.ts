/**
 * Export an examination ATTENDANCE SHEET (.xlsx) for a single subject, in the
 * official format: a centered header block (programme, campus, exam period,
 * intake, course, date/time/location) with the SAB logo, a numbered candidate
 * table (#, Registration Number, Name with Initials, NIC No., Signature), and
 * Supervisor / Date signature lines.
 */

export interface AttendanceCandidate {
  regNo: string;
  name: string; // Name with Initials
  nic: string;
}

export interface AttendanceInput {
  programmeTitle: string;
  examPeriod: string;   // e.g. "June/July 2026"
  intake: string;       // schedule's exam intake designation
  courseLine: string;   // "BSAA 32013 — Governance, Ethics & Risk Management"
  dateLine: string;     // "13th July 2026    9.00-11.30am    Location: ..."
  candidates: AttendanceCandidate[];
  fileName: string;
}

async function logoBase64(): Promise<{ base64: string; extension: 'png' } | null> {
  try {
    const res = await fetch('/sab-campus-logo.png');
    const blob = await res.blob();
    const base64 = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve((fr.result as string).split(',')[1]);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
    return { base64, extension: 'png' };
  } catch { return null; }
}

export async function exportAttendanceSheet(input: AttendanceInput) {
  const ExcelJS = (await import('exceljs')).default ?? (await import('exceljs'));
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ERMS';
  const ws = wb.addWorksheet('Attendance', {
    pageSetup: {
      paperSize: 9,           // A4
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
    },
  });

  // A = #, B = Reg No, C = Name w/ Initials, D = NIC, E = Signature.
  // Widths sized to fill the A4 landscape width (narrower Signature column).
  ws.columns = [{ width: 6 }, { width: 30 }, { width: 52 }, { width: 24 }, { width: 28 }];
  const lastCol = 'E';

  // Logo occupies A1:B6 (like the template).
  const logo = await logoBase64();
  if (logo) {
    const id = wb.addImage(logo);
    // Keep the logo's natural 2.48:1 ratio and centre it within the A1:B6 block
    // (≈2 cols × 6 rows). The offset anchors it rather than stretching it.
    ws.addImage(id, { tl: { col: 0.15, row: 0.4 }, ext: { width: 268, height: 108 }, editAs: 'oneCell' } as any);
  }

  // Centered header lines in C:E.
  const headerLines: { text: string; bold?: boolean; size?: number }[] = [
    { text: input.programmeTitle, bold: true, size: 14 },
    { text: 'SAB Campus, 411, Galle Road, Colombo 04' },
    { text: `END SEMESTER EXAMINATION -  (${input.examPeriod}) Repeat /Medical`, bold: true },
    { text: `Exam Intake - INTAKE ${input.intake || ''}`.trim() },
    { text: input.courseLine, bold: true },
    { text: input.dateLine },
  ];
  headerLines.forEach((h, i) => {
    const r = i + 1;
    ws.mergeCells(`C${r}:${lastCol}${r}`);
    const cell = ws.getCell(`C${r}`);
    cell.value = h.text;
    cell.font = { name: 'Calibri', size: h.size ?? 12, bold: !!h.bold };
    cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true, indent: 1 };
    ws.getRow(r).height = h.size ? h.size + 8 : 20;
  });
  ws.mergeCells('A1:B6');

  // Spacer row for a gap between the header block and the table.
  ws.getRow(7).height = 14;

  // Table header (row 8, after the gap).
  const headRow = 8;
  const headers = ['#', 'Registration Number', 'Name with Initials', 'NIC No.', 'Signature'];
  const hr = ws.getRow(headRow);
  headers.forEach((h, i) => {
    const c = hr.getCell(i + 1);
    c.value = h;
    c.font = { name: 'Calibri', size: 12, bold: true };
    c.alignment = { horizontal: i === 0 ? 'center' : 'left', vertical: 'middle', wrapText: true };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    c.border = box();
  });
  hr.height = 24;

  // Candidate rows.
  input.candidates.forEach((cand, i) => {
    const row = ws.getRow(headRow + 1 + i);
    row.getCell(1).value = i + 1;
    row.getCell(2).value = cand.regNo;
    row.getCell(3).value = cand.name;
    row.getCell(4).value = cand.nic;
    row.getCell(5).value = '';
    [1, 2, 3, 4, 5].forEach((ci) => {
      const c = row.getCell(ci);
      c.font = { name: 'Calibri', size: 12 };
      c.alignment = { vertical: 'middle', horizontal: ci === 1 ? 'center' : 'left' };
      c.border = box();
    });
    row.height = 24;
  });

  // Footer signature lines, a couple of rows below the table.
  const footRow = headRow + input.candidates.length + 4;
  ws.getCell(`B${footRow}`).value = '………………………………………..';
  ws.getCell(`E${footRow}`).value = '………………………………………….';
  ws.getCell(`B${footRow + 1}`).value = 'Supervisor';
  ws.getCell(`E${footRow + 1}`).value = 'Date';
  [`B${footRow}`, `E${footRow}`, `B${footRow + 1}`, `E${footRow + 1}`].forEach((addr) => {
    ws.getCell(addr).font = { name: 'Calibri', size: 10 };
  });

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf as unknown as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = input.fileName;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function box(): any {
  const side = { style: 'thin', color: { argb: 'FFB8BCC6' } } as const;
  return { top: side, bottom: side, left: side, right: side };
}
