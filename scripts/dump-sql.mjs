/**
 * Exports the demo SQLite database as a portable SQL dump (schema + data).
 * Usage: npm run db:dump  ->  prisma/dump.sql
 */
import { DatabaseSync } from 'node:sqlite';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const db = new DatabaseSync(join(root, 'prisma', 'dev.db'));
const out = [];

const lit = (v) => {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (v instanceof Uint8Array) return `X'${[...v].map(b => b.toString(16).padStart(2, '0')).join('')}'`;
  return `'${String(v).replace(/'/g, "''")}'`;
};

out.push('-- GabiElectricals demo database dump');
out.push(`-- generated: ${new Date().toISOString()}`);
out.push('PRAGMA foreign_keys=OFF;');
out.push('BEGIN TRANSACTION;');

const objects = db.prepare("SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY type DESC, name").all();
for (const o of objects) out.push(o.sql + ';');

for (const o of objects.filter(x => x.type === 'table')) {
  const rows = db.prepare(`SELECT * FROM "${o.name}"`).all();
  if (!rows.length) continue;
  const cols = Object.keys(rows[0]);
  out.push(`-- ${rows.length} rows: ${o.name}`);
  for (let i = 0; i < rows.length; i += 50) {
    const chunk = rows.slice(i, i + 50);
    out.push(`INSERT INTO "${o.name}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES`);
    out.push(chunk.map(r => `  (${cols.map(c => lit(r[c])).join(', ')})`).join(',\n') + ';');
  }
}

out.push('COMMIT;');
out.push('PRAGMA foreign_keys=ON;');

const dest = join(root, 'prisma', 'dump.sql');
writeFileSync(dest, out.join('\n') + '\n');
const counts = objects.filter(x => x.type === 'table').map(o => `${o.name}=${db.prepare(`SELECT COUNT(*) c FROM "${o.name}"`).get().c}`).filter(s => !s.endsWith('=0'));
console.log(`Wrote ${dest}`);
console.log(counts.join(' '));
