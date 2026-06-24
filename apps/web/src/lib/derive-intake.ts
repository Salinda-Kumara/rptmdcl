/**
 * Client-side mirror of the backend `deriveIntake` (apps/api student-import.util).
 * Used to preview/auto-fill the intake when an admin types a registration number.
 *
 *   BAA/2023-17A/WD-001            → "17A WD"
 *   BSc/2026/HONS-20A/MOHE/WD-108  → "20A MOHE WD"
 *   (legacy / no NNX token)        → the raw registration number
 */
export function deriveIntakeClient(reg: string): string {
  const raw = String(reg ?? '').trim();
  const segs = raw.split('/').map((s) => s.trim()).filter(Boolean);
  if (segs.length <= 1) return raw;

  let batch: string | null = null;
  let batchIdx = -1;
  for (let i = 0; i < segs.length; i++) {
    const m = segs[i].match(/(\d{1,2}[A-Z])(?![A-Za-z0-9])/);
    if (m) { batch = m[1]; batchIdx = i; break; }
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
