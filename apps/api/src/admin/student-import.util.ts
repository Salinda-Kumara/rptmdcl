import * as XLSX from 'xlsx';

export interface ParsedStudent {
  registrationNumber: string;
  nic: string;
  title?: string;
  fullName: string;
  gender?: string;
  email?: string;
  mobile?: string;
  intake: string;
  batchNumber: string;
}

/**
 * Derive the intake/batch label from a registration number.
 *
 * Modern formats (BAA/BMBA/BSc) encode the batch as an `NNX` token plus optional
 * middle codes (e.g. MOHE) and a trailing stream code (WD/WE/EX):
 *   BAA/2023-17A/WD-001            → "17A WD"
 *   BSc/2025-19B/WD-077            → "19B WD"
 *   BSc/2026/HONS-20A/MOHE/WD-108  → "20A MOHE WD"
 *   BMBA/2025/GEN-03B/MOHE/WD-001  → "03B MOHE WD"
 *
 * Legacy formats (SAB/GEN/SPE/numeric) have no NNX token; the raw registration
 * number is used as the intake so the record is still importable and unique.
 */
export function deriveIntake(reg: string): string {
  const raw = String(reg ?? '').trim();
  const segs = raw.split('/').map((s) => s.trim()).filter(Boolean);
  if (segs.length <= 1) return raw;

  let batch: string | null = null;
  let batchIdx = -1;
  for (let i = 0; i < segs.length; i++) {
    const m = segs[i].match(/(\d{1,2}[A-Z])(?![A-Za-z0-9])/);
    if (m) {
      batch = m[1];
      batchIdx = i;
      break;
    }
  }
  if (!batch) return raw;

  const last = segs[segs.length - 1];
  const streamMatch = last.match(/^([A-Za-z]+)/);
  const stream = streamMatch ? streamMatch[1].toUpperCase() : '';

  const middle: string[] = [];
  for (let i = batchIdx + 1; i < segs.length - 1; i++) {
    if (/^[A-Za-z]+$/.test(segs[i])) middle.push(segs[i].toUpperCase());
  }

  return [batch, ...middle, stream].filter(Boolean).join(' ');
}

/**
 * Registration-number prefixes that map onto a canonical programme code.
 * "BSc" (Applied Accounting) students are stored under the BSAA programme so
 * they inherit its subjects.
 */
const CODE_ALIASES: Record<string, string> = {
  BSC: 'BSAA',   // BSc/... → BSc in Applied Accounting
  BAA: 'BSAA',   // legacy Applied Accounting prefix
};

/** Programme display names keyed by canonical programme code. */
export const PROGRAMME_NAMES: Record<string, string> = {
  BSAA: 'BSc in Applied Accounting',
  BMBA: 'B.Mgt. in Business Analytics',
  SAB: 'SAB (Legacy)',
  SPE: 'Special Programme',
  GEN: 'General Programme',
  OTHER: 'Other / Legacy',
};

/** Programme code derived from the registration-number prefix (with aliases applied). */
export function programmeCodeOf(reg: string): string {
  const segs = String(reg ?? '').split('/');
  const raw = segs.length > 1 ? segs[0].trim().toUpperCase() : 'OTHER';
  return CODE_ALIASES[raw] ?? raw;
}

const norm = (v: unknown) => String(v ?? '').trim();

/**
 * Parse the Student Master Report workbook into structured records.
 * Expected columns (row 3 header): #, Registration Number, NIC, Title, Full Name,
 * Gender, E-mail, Contact No.
 */
export function parseStudentWorkbook(buffer: Buffer): { students: ParsedStudent[]; skipped: number } {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

  // Find the header row (contains "Registration Number").
  let headerIdx = rows.findIndex((r) =>
    r.some((c) => norm(c).toLowerCase() === 'registration number'),
  );
  if (headerIdx === -1) headerIdx = 2; // fall back to known layout

  const header = rows[headerIdx].map((c) => norm(c).toLowerCase());
  const col = (name: string) => header.findIndex((h) => h.includes(name));

  const idxReg = col('registration');
  const idxNic = col('nic');
  const idxTitle = col('title');
  const idxName = col('full name');
  const idxGender = col('gender');
  const idxEmail = col('mail');
  const idxContact = col('contact');

  const students: ParsedStudent[] = [];
  let skipped = 0;

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    const reg = norm(r[idxReg]);
    const name = norm(r[idxName]);
    if (!reg || !name) {
      if (r.some((c) => norm(c))) skipped++; // a non-empty but unusable row
      continue;
    }
    const intake = deriveIntake(reg);
    students.push({
      registrationNumber: reg,
      nic: norm(r[idxNic]),
      title: norm(r[idxTitle]) || undefined,
      fullName: name,
      gender: idxGender >= 0 ? norm(r[idxGender]) || undefined : undefined,
      email: idxEmail >= 0 ? norm(r[idxEmail]) || undefined : undefined,
      mobile: idxContact >= 0 ? norm(r[idxContact]) || undefined : undefined,
      intake,
      batchNumber: intake, // per decision: batchNumber == derived intake
    });
  }

  return { students, skipped };
}
