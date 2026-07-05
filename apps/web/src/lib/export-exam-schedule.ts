import { AdminSchedule, AdminScheduledExam, AdminExamStaff } from './admin-api';

// Columns in the exact order of the printed ESE schedule.
const COLUMNS: { header: string; width: number; wrap?: boolean }[] = [
  { header: 'S. No', width: 6 },
  { header: 'Code', width: 12 },
  { header: 'Exams to start at', width: 15 },
  { header: 'ESE Date', width: 12 },
  { header: 'Weekday', width: 11 },
  { header: 'Revised Date', width: 12 },
  { header: 'Intake', width: 16, wrap: true },
  { header: 'Course Code', width: 13 },
  { header: 'Course', width: 32, wrap: true },
  { header: 'Count', width: 8 },
  { header: 'Session 1', width: 13 },
  { header: 'Session 2', width: 13 },
  { header: 'Session 3', width: 13 },
  { header: 'Location', width: 24, wrap: true },
  { header: 'Chief Examiner', width: 22, wrap: true },
  { header: 'Supervisor', width: 20, wrap: true },
  { header: 'Invigilator', width: 22, wrap: true },
  { header: 'Supporting Staff', width: 18, wrap: true },
];
const NCOLS = COLUMNS.length;

// Palette (ARGB).
const C = {
  title: 'FF0F172A',      // slate-900
  titleText: 'FFFFFFFF',
  sub: 'FF334155',        // slate-700
  header: 'FF4F46E5',     // indigo-600
  headerText: 'FFFFFFFF',
  band: 'FFFDE68A',       // amber-200
  bandText: 'FF78350F',   // amber-900
  zebra: 'FFF8FAFC',      // slate-50
  border: 'FFCBD5E1',     // slate-300
};

const p2 = (n: number) => String(n).padStart(2, '0');
const mmddyyyy = (d?: string | null): string => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  return `${p2(dt.getUTCMonth() + 1)}.${p2(dt.getUTCDate())}.${dt.getUTCFullYear()}`;
};
const longDate = (d?: string | null): string => {
  if (!d) return 'Unscheduled';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return 'Unscheduled';
  return dt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
};
const weekdayOf = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }) : '');

function saveBlob(buffer: ArrayBuffer, filename: string) {
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Build and download a professionally styled .xlsx of the ESE duty schedule. */
export async function exportExamScheduleExcel(
  schedule: AdminSchedule,
  exams: AdminScheduledExam[],
  staff: AdminExamStaff[],
) {
  const ExcelJS: any = (await import('exceljs')).default ?? (await import('exceljs'));
  const byId = new Map(staff.map((s) => [s.id, s.name]));
  const names = (ids?: string[]) => (ids || []).map((i) => byId.get(i)).filter(Boolean).join(' / ');

  const wb = new ExcelJS.Workbook();
  wb.creator = 'ERMAS';
  wb.created = new Date();
  const ws = wb.addWorksheet('Duty Schedule', {
    views: [{ state: 'frozen', ySplit: 6 }],
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 } as any },
  });

  ws.columns = COLUMNS.map((c) => ({ width: c.width }));
  const thin = { style: 'thin', color: { argb: C.border } } as const;
  const allBorders = { top: thin, left: thin, bottom: thin, right: thin };
  const lastColLetter = ws.getColumn(NCOLS).letter;

  // ── Title block ──
  ws.mergeCells(`A1:${lastColLetter}1`);
  const t1 = ws.getCell('A1');
  t1.value = 'END SEMESTER EXAMINATION — DUTY SCHEDULE';
  t1.font = { name: 'Calibri', size: 16, bold: true, color: { argb: C.titleText } };
  t1.alignment = { horizontal: 'center', vertical: 'middle' };
  t1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.title } };
  ws.getRow(1).height = 26;

  ws.mergeCells(`A2:${lastColLetter}2`);
  const t2 = ws.getCell('A2');
  t2.value = schedule.name;
  t2.font = { name: 'Calibri', size: 12, bold: true, color: { argb: C.titleText } };
  t2.alignment = { horizontal: 'center', vertical: 'middle' };
  t2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.sub } };
  ws.getRow(2).height = 20;

  ws.mergeCells(`A3:${lastColLetter}3`);
  const t3 = ws.getCell('A3');
  const range = `${new Date(schedule.startDate).toLocaleDateString('en-GB', { dateStyle: 'medium' } as any)} – ${new Date(schedule.endDate).toLocaleDateString('en-GB', { dateStyle: 'medium' } as any)}`;
  t3.value = `${range}     •     ${exams.length} exam${exams.length !== 1 ? 's' : ''}     •     Generated ${new Date().toLocaleString('en-GB')}`;
  t3.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF64748B' } };
  t3.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(4).height = 4; // slim spacer row

  // ── Header row (row 6; row 5 spacer above is thin) ──
  const headerRowIdx = 6;
  const header = ws.getRow(headerRowIdx);
  COLUMNS.forEach((c, i) => {
    const cell = header.getCell(i + 1);
    cell.value = c.header;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: C.headerText } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.header } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = allBorders;
  });
  header.height = 30;

  // ── Data rows, grouped by exam date with a coloured band per group ──
  let r = headerRowIdx + 1;
  let sno = 0;
  let lastKey: string | null = null;
  const numericCols = new Set([1, 10]); // S.No, Count → centred

  for (const e of exams) {
    const key = e.examDate ? mmddyyyy(e.examDate) : e.revisedDate ? mmddyyyy(e.revisedDate) : 'Unscheduled';
    if (key !== lastKey) {
      // date band
      ws.mergeCells(`A${r}:${lastColLetter}${r}`);
      const band = ws.getCell(`A${r}`);
      band.value = `📅  ${longDate(e.examDate || e.revisedDate)}`;
      band.font = { name: 'Calibri', size: 10, bold: true, color: { argb: C.bandText } };
      band.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.band } };
      band.alignment = { horizontal: 'left', vertical: 'middle' };
      band.border = allBorders;
      ws.getRow(r).height = 18;
      r += 1;
      lastKey = key;
    }

    sno += 1;
    const values = [
      sno,
      e.serialCode || '',
      e.startAtLabel || '',
      mmddyyyy(e.examDate),
      e.weekday || weekdayOf(e.examDate),
      mmddyyyy(e.revisedDate),
      e.intake || '',
      e.courseCode || '',
      e.courseName || '',
      e.expectedCount ?? '',
      e.session1 || '',
      e.session2 || '',
      e.session3 || '',
      e.location || '',
      names(e.chiefExaminerIds),
      names(e.supervisorIds),
      names(e.invigilatorIds),
      names(e.supportingIds),
    ];
    const row = ws.getRow(r);
    const zebra = sno % 2 === 0;
    values.forEach((v, i) => {
      const cell = row.getCell(i + 1);
      cell.value = v as any;
      cell.font = { name: 'Calibri', size: 9, color: { argb: 'FF1E293B' } };
      cell.alignment = { vertical: 'middle', wrapText: !!COLUMNS[i].wrap, horizontal: numericCols.has(i + 1) ? 'center' : 'left' };
      cell.border = allBorders;
      if (zebra) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.zebra } };
    });
    row.getCell(8).font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF4F46E5' } }; // Course Code emphasis
    r += 1;
  }

  // Auto-filter over the header + data.
  ws.autoFilter = { from: { row: headerRowIdx, column: 1 }, to: { row: Math.max(headerRowIdx, r - 1), column: NCOLS } };

  const buffer = await wb.xlsx.writeBuffer();
  const safe = schedule.name.replace(/[^\w]+/g, '_').replace(/^_+|_+$/g, '');
  saveBlob(buffer, `ESE_Schedule_${safe || 'export'}.xlsx`);
}
