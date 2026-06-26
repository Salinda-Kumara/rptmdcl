/**
 * One-time backfill: assign serial numbers to all submitted applications
 * that don't have one yet. Groups by submission date (YYYYMMDD) and assigns
 * sequential numbers within each day, ordered by submittedAt ASC.
 *
 * Run with:
 *   npx ts-node --project tsconfig.json -r tsconfig-paths/register prisma/backfill-serial-numbers.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Fetch all submitted applications without a serial number, oldest first
  const apps = await prisma.application.findMany({
    where: {
      serialNumber: null,
      status: { not: 'DRAFT' },
      deletedAt: null,
    },
    orderBy: { submittedAt: 'asc' },
    select: { id: true, submittedAt: true, createdAt: true },
  });

  if (apps.length === 0) {
    console.log('✅ All submitted applications already have serial numbers.');
    return;
  }

  console.log(`Found ${apps.length} application(s) to backfill…`);

  // Group by date string (YYYYMMDD) based on submittedAt (fall back to createdAt)
  const byDate = new Map<string, typeof apps>();
  for (const app of apps) {
    const dt = app.submittedAt ?? app.createdAt;
    const y  = dt.getFullYear();
    const m  = String(dt.getMonth() + 1).padStart(2, '0');
    const d  = String(dt.getDate()).padStart(2, '0');
    const key = `${y}${m}${d}`;
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(app);
  }

  let total = 0;
  for (const [dateStr, group] of byDate) {
    // Start sequence after any already-assigned numbers for this date
    const existingCount = await prisma.application.count({
      where: { serialNumber: { startsWith: dateStr } },
    });

    for (let i = 0; i < group.length; i++) {
      const seq    = String(existingCount + i + 1).padStart(2, '0');
      const serial = `${dateStr}-${seq}`;
      await prisma.application.update({
        where: { id: group[i].id },
        data:  { serialNumber: serial },
      });
      console.log(`  ${group[i].id.slice(0, 8)}… → ${serial}`);
      total++;
    }
  }

  console.log(`\n✅ Backfilled ${total} application(s).`);
}

main()
  .catch((e) => { console.error('❌ Failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
