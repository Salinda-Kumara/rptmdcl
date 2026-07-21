/**
 * One-time backfill: replace stale `Payment.verifiedBy` values that still
 * hold a raw User id (from before financeReview started storing the
 * resolved staff display name) with that user's actual name — the same
 * value now stamped on the payment slip as "By: ...".
 *
 * Run with:
 *   npx ts-node --project tsconfig.json -r tsconfig-paths/register prisma/backfill-payment-verifier-names.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// A v4 UUID, which is what User.id looks like — anything matching this in
// verifiedBy is a raw id left over from before the fix, not a real name.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function main() {
  const payments = await prisma.payment.findMany({
    where: { verifiedBy: { not: null }, deletedAt: null },
    select: { id: true, verifiedBy: true },
  });

  const stale = payments.filter((p) => p.verifiedBy && UUID_RE.test(p.verifiedBy));
  if (stale.length === 0) {
    console.log('✅ No stale verifiedBy values found — nothing to backfill.');
    return;
  }
  console.log(`Found ${stale.length} payment(s) with a raw user id in verifiedBy…`);

  let updated = 0;
  for (const p of stale) {
    const user = await prisma.user.findUnique({
      where: { id: p.verifiedBy! },
      include: { staffUser: true },
    });
    const name = user?.staffUser?.name ?? user?.email ?? null;
    if (!name) {
      console.log(`  ${p.id.slice(0, 8)}… → user ${p.verifiedBy} not found, skipped`);
      continue;
    }
    await prisma.payment.update({ where: { id: p.id }, data: { verifiedBy: name } });
    console.log(`  ${p.id.slice(0, 8)}… → "${name}"`);
    updated++;
  }

  console.log(`\n✅ Backfilled ${updated} payment(s).`);
}

main()
  .catch((e) => { console.error('❌ Failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
