// Flip prisma/schema.prisma between the demo (sqlite) and live (postgresql) datasource.
// Usage: node scripts/db-provider.mjs postgresql|sqlite
import { readFileSync, writeFileSync } from 'node:fs';

const want = process.argv[2];
if (want !== 'sqlite' && want !== 'postgresql') {
  console.error('usage: node scripts/db-provider.mjs sqlite|postgresql');
  process.exit(1);
}

const file = new URL('../prisma/schema.prisma', import.meta.url);
const src = readFileSync(file, 'utf8');
const next = src.replace(/(datasource\s+db\s*\{[^}]*?provider\s*=\s*)"[^"]+"/, `$1"${want}"`);
if (next === src && !src.includes(`provider = "${want}"`)) {
  console.error('Could not find a datasource provider line in prisma/schema.prisma');
  process.exit(1);
}
writeFileSync(file, next);

// DATABASE_URL has to match the provider, but a real connection string is never overwritten.
const envFile = new URL('../.env', import.meta.url);
let env = '';
try { env = readFileSync(envFile, 'utf8'); } catch { /* first run may have no .env */ }
const current = env.match(/^DATABASE_URL="?([^"\n]*)"?$/m)?.[1] ?? '';
const isSqliteUrl = /^file:/i.test(current);
const isPostgresUrl = /^postgres(ql)?:///i.test(current);

if (!env) {
  console.log(`provider → ${want} (no .env found — copy .env.example and set DATABASE_URL)`);
} else if (want === 'postgresql' && isSqliteUrl) {
  writeFileSync(envFile, env.replace(/^DATABASE_URL=.*$/m, 'DATABASE_URL="postgresql://user:password@localhost:5432/gabielectricals"'));
  console.log('provider → postgresql; .env DATABASE_URL is now a placeholder — put your real Postgres URL in it');
} else if (want === 'sqlite' && isPostgresUrl) {
  writeFileSync(envFile, env.replace(/^DATABASE_URL=.*$/m, 'DATABASE_URL="file:./dev.db"'));
  console.log('provider → sqlite; .env DATABASE_URL set to file:./dev.db');
} else {
  console.log(`provider → ${want}; DATABASE_URL left untouched (${current ? 'existing value' : 'not set'})`);
}
