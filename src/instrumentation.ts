import { copyFileSync, existsSync, renameSync } from 'node:fs';
import path from 'node:path';

// Runs once per server instance at startup (Node.js runtime only).
// On serverless hosts (Vercel) the project filesystem is read-only, so when
// SQLITE_BOOT_FROM_BUNDLE=1 the bundled store database is copied into /tmp —
// the one writable place — before any request is served. DATABASE_URL points
// at that /tmp copy. Data written there lasts only for the life of the
// instance; a hosted database (Neon/Postgres) replaces this for real trading.
export function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.SQLITE_BOOT_FROM_BUNDLE !== '1') return;
  const target = '/tmp/gabi-store.db';
  try {
    if (!existsSync(target)) {
      const staging = `${target}.copying`;
      copyFileSync(path.join(process.cwd(), 'prisma', 'dev.db'), staging);
      renameSync(staging, target);
    }
  } catch {
    // If the copy fails, requests surface DB errors as before — never crash boot.
  }
}
