import * as XLSX from 'xlsx';

const norm = (v: any) => (v == null ? '' : String(v).trim());

export interface ParsedExamRow {
  serialCode?: string;
  startAtLabel?: string;
  examDate?: Date | null;
  weekday?: string;
  revisedDate?: Date | null;
  intake?: string;
  courseCode?: string;
  courseName?: string;
  expectedCount?: number | null;
  session1?: string;
  session2?: string;
  session3?: string;
  location?: string;
  chiefExaminers: string[];
  supervisors: string[];
  invigilators: string[];
  supporting: string[];
}

/** Parse a MM.DD.YYYY / MM/DD/YYYY style date to a UTC-midnight Date. */
function parseDate(v: any): Date | null {
  const s = norm(v);
  if (!s) return null;
  const m = s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})$/);
  if (m) {
    const mm = parseInt(m[1], 10);
    const dd = parseInt(m[2], 10);
    const yy = m[3].length === 2 ? 2000 + parseInt(m[3], 10) : parseInt(m[3], 10);
    const d = new Date(Date.UTC(yy, mm - 1, dd));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/** Split a staff cell ("Hasitha/ Sandun", "A & B") into clean names. */
function splitNames(v: any): string[] {
  const s = norm(v);
  if (!s) return [];
  return s
    .split(/[\/,&\n]+/)
    .map((x) => x.trim())
    .filter((x) => x.length > 1 && !/^ex\.?\s*in/i.test(x)); // drop stray "Ex. In" tokens
}

/**
 * Parse an ESE duty-schedule workbook (the format exported by this system) into
 * timetable rows. Header row is auto-detected; blank separator rows are skipped.
 */
export function parseExamScheduleWorkbook(buffer: Buffer): { rows: ParsedExamRow[] } {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const grid: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });

  // Locate the header row (contains "Course Code" / "Intake").
  let headerIdx = grid.findIndex((r) =>
    r.some((c) => norm(c).toLowerCase().includes('course code')) &&
    r.some((c) => norm(c).toLowerCase().includes('intake')),
  );
  if (headerIdx === -1) headerIdx = grid.findIndex((r) => r.some((c) => norm(c).toLowerCase() === 's. no'));
  if (headerIdx === -1) headerIdx = 3; // fall back to known layout

  const header = grid[headerIdx].map((c) => norm(c).toLowerCase());
  const find = (pred: (h: string) => boolean) => header.findIndex(pred);
  const idx = {
    code:        find((h) => h === 'code'),
    startAt:     find((h) => h.includes('start at')),
    eseDate:     find((h) => h.includes('ese date') && !h.includes('weekday')),
    weekday:     find((h) => h.includes('weekday')),
    revised:     find((h) => h.includes('revised')),
    intake:      find((h) => h.includes('intake')),
    courseCode:  find((h) => h.includes('course code')),
    course:      find((h) => h === 'course'),
    count:       find((h) => h.includes('expected') || h.includes('count')),
    session1:    find((h) => h.includes('session 1')),
    session2:    find((h) => h.includes('session 2')),
    session3:    find((h) => h.includes('session 3')),
    location:    find((h) => h.includes('location')),
    chief:       find((h) => h.includes('chief')),
    supervisor:  find((h) => h.includes('supervisor')),
    invigilator: find((h) => h.includes('invigilator')),
    supporting:  find((h) => h.includes('supporting')),
  };
  const cell = (row: any[], i: number) => (i >= 0 ? norm(row[i]) : '');

  const rows: ParsedExamRow[] = [];
  for (let i = headerIdx + 1; i < grid.length; i++) {
    const r = grid[i];
    const courseCode = cell(r, idx.courseCode);
    const course = cell(r, idx.course);
    const code = cell(r, idx.code);
    // Skip blank separator rows / rows with no identifying data.
    if (!courseCode && !course && !code) continue;

    const countStr = cell(r, idx.count).replace(/[^\d]/g, '');
    rows.push({
      serialCode: code || undefined,
      startAtLabel: cell(r, idx.startAt) || undefined,
      examDate: parseDate(cell(r, idx.eseDate)),
      weekday: cell(r, idx.weekday) || undefined,
      revisedDate: parseDate(cell(r, idx.revised)),
      intake: cell(r, idx.intake) || undefined,
      courseCode: courseCode || undefined,
      courseName: course || undefined,
      expectedCount: countStr ? parseInt(countStr, 10) : null,
      session1: cell(r, idx.session1) || undefined,
      session2: cell(r, idx.session2) || undefined,
      session3: cell(r, idx.session3) || undefined,
      location: cell(r, idx.location) || undefined,
      chiefExaminers: splitNames(cell(r, idx.chief)),
      supervisors: splitNames(cell(r, idx.supervisor)),
      invigilators: splitNames(cell(r, idx.invigilator)),
      supporting: splitNames(cell(r, idx.supporting)),
    });
  }

  return { rows };
}
