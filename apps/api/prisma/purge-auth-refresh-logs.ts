/**
 * One-time cleanup: delete existing "auth.refresh" rows from the activity
 * log. Token refresh isn't a user action (it fires silently in the
 * background with no authenticated actor), so the logging interceptor no
 * longer records it going forward — this just clears out the old noise.
 *
 * Uses the separate logs database (LOGS_DATABASE_URL), not the main one.
 *
 * Run with:
 *   npx ts-node --project tsconfig.json -r tsconfig-paths/register prisma/purge-auth-refresh-logs.ts
 */
import { Pool } from 'pg';

async function main() {
  const connectionString = process.env.LOGS_DATABASE_URL;
  if (!connectionString) {
    console.error('❌ LOGS_DATABASE_URL is not set.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  try {
    const { rowCount } = await pool.query(`DELETE FROM action_logs WHERE action = 'auth.refresh'`);
    console.log(`✅ Deleted ${rowCount} "auth.refresh" log entr${rowCount === 1 ? 'y' : 'ies'}.`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => { console.error('❌ Failed:', e); process.exit(1); });
