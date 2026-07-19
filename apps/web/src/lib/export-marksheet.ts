/**
 * Export a DETAILED MARK SHEET (.xlsx) for a single subject, in the official
 * format: a centered header block (programme title + "Detailed Mark Sheet")
 * with the SAB logo, an examination / question-paper / intake info block, the
 * marking notes, a numbered candidate table (Serial Number, Registration
 * Number, Q1–Q8, Total) and Supervisor / Marker signature lines.
 */

export interface MarksheetCandidate {
  regNo: string;
  category?: string | null; // "REPEAT" → (R), "MEDICAL" → (M)
}

export interface MarksheetInput {
  programmeTitle: string;
  examName: string;    // "End Semester Examination - August/September 2025"
  courseLine: string;  // "BSAA 21023 — Business Processes, Controls & Audits"
  intakeLine: string;  // "INTAKE 18A WE ..."
  candidates: MarksheetCandidate[];
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

const catSuffix = (c?: string | null) =>
  (c ?? '').toUpperCase() === 'MEDICAL' ? ' (M)' : (c ?? '').toUpperCase() === 'REPEAT' ? ' (R)' : '';

export async function exportMarksheet(input: MarksheetInput) {
  const ExcelJS = (await import('exceljs')).default ?? (await import('exceljs'));
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ERMS';
  const ws = wb.addWorksheet('Detailed Mark Sheet', {
    pageSetup: {
      paperSize: 9,           // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 },
    },
  });

  // A = margin, B = Serial, C = Reg No, D..K = Q1..Q8, L = Total.
  ws.columns = [
    { width: 2.6 }, { width: 8.9 }, { width: 33.3 },
    { width: 9 }, { width: 9 }, { width: 9 }, { width: 9 },
    { width: 9 }, { width: 9 }, { width: 9 }, { width: 9 },
    { width: 15.4 },
  ];

  // Logo occupies B1:C5 (like the template).
  const logo = await logoBase64();
  if (logo) {
    const id = wb.addImage(logo);
    // Keep the logo's natural 2.48:1 ratio, anchored within the B1:C5 block.
    ws.addImage(id, { tl: { col: 1.1, row: 0.4 }, ext: { width: 230, height: 93 }, editAs: 'oneCell' } as any);
  }

  // Centered header: programme title (D1:L3) then "Detailed Mark Sheet" (D4:L5).
  ws.mergeCells('D1:L3');
  const titleCell = ws.getCell('D1');
  titleCell.value = input.programmeTitle;
  titleCell.font = { name: 'Calibri', size: 14, bold: true };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  ws.mergeCells('D4:L5');
  const subCell = ws.getCell('D4');
  subCell.value = 'Detailed Mark Sheet';
  subCell.font = { name: 'Calibri', size: 13, bold: true };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };

  ws.mergeCells('B1:C5');

  // Info block (rows 7–9): label in B, value merged across D:L.
  const info: [string, string][] = [
    ['Name of the Examination', input.examName],
    ['Title of Question Paper', input.courseLine],
    ['Intake, Year & Semester', input.intakeLine],
  ];
  info.forEach(([label, value], i) => {
    const r = 7 + i;
    ws.getCell(`B${r}`).value = label;
    ws.getCell(`B${r}`).font = { name: 'Calibri', size: 12, bold: true };
    ws.getCell(`B${r}`).alignment = { vertical: 'middle' };
    ws.mergeCells(`D${r}:L${r}`);
    const v = ws.getCell(`D${r}`);
    v.value = value;
    v.font = { name: 'Calibri', size: 12 };
    v.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    ws.getRow(r).height = 20;
  });

  // Notes.
  ws.getCell('B11').value = 'NOTE';
  ws.getCell('B11').font = { name: 'Calibri', size: 12, bold: true };
  const notes = [
    'Please enter the Marks clearly in ink. Alteration, if any, should be initiated.',
    'Marks for each paper should be entered on separate mark sheets.',
    'The Marks per paper should then be transferred to the final Mark return sheet.',
  ];
  notes.forEach((n, i) => {
    const c = ws.getCell(`B${12 + i}`);
    c.value = `        ${i + 1}.  ${n}`;
    c.font = { name: 'Calibri', size: 12 };
    c.alignment = { vertical: 'middle' };
  });

  // Table header spans rows 16–17 (merged vertically), starting at col B.
  const headRow = 16;
  const headers = ['Serial\nNumber', 'Registration Number', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8', 'Total'];
  headers.forEach((h, i) => {
    const col = i + 2; // B onwards
    const letter = ws.getColumn(col).letter;
    ws.mergeCells(`${letter}${headRow}:${letter}${headRow + 1}`);
    const c = ws.getCell(`${letter}${headRow}`);
    c.value = h;
    c.font = { name: 'Calibri', size: 12, bold: true };
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    c.border = box();
  });
  ws.getRow(headRow).height = 20;
  ws.getRow(headRow + 1).height = 20;

  // Candidate rows begin at row 18.
  const firstRow = headRow + 2;
  input.candidates.forEach((cand, i) => {
    const row = ws.getRow(firstRow + i);
    row.getCell(2).value = i + 1;
    row.getCell(3).value = `${cand.regNo}${catSuffix(cand.category)}`;
    for (let col = 2; col <= 12; col++) {
      const c = row.getCell(col);
      c.font = { name: 'Calibri', size: 11 };
      c.alignment = { vertical: 'middle', horizontal: col === 3 ? 'left' : 'center' };
      c.border = box();
    }
    row.height = 22;
  });

  // Signature footer, a couple of rows below the table.
  const footRow = firstRow + input.candidates.length + 3;
  ws.getCell(`B${footRow}`).value = ' ….................................................';
  ws.getCell(`I${footRow}`).value = '….........................................................';
  ws.getCell(`B${footRow + 1}`).value = 'Supervisor of the Examination Hall';
  ws.getCell(`I${footRow + 1}`).value = 'First/Second Marker Examiner';
  ws.getCell(`B${footRow + 3}`).value = 'Name :- ';
  ws.getCell(`I${footRow + 3}`).value = 'Name :-';
  ws.getCell(`B${footRow + 4}`).value = 'Date :- ';
  ws.getCell(`I${footRow + 4}`).value = 'Date :-';
  [footRow, footRow + 1, footRow + 3, footRow + 4].forEach((r) => {
    ws.getCell(`B${r}`).font = { name: 'Calibri', size: 11 };
    ws.getCell(`I${r}`).font = { name: 'Calibri', size: 11 };
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
