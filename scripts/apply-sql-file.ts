// Aplica un archivo SQL (una o varias sentencias) vía la RPC temporal _migrate.
// Uso: node scripts/apply-sql-file.ts <ruta.sql>
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i), l.slice(i + 1).trim()] as [string, string];
    }),
);

const file = process.argv[2];
if (!file) {
  console.error('uso: node scripts/apply-sql-file.ts <ruta.sql>');
  process.exit(1);
}

const sql = readFileSync(file, 'utf8').trim();
const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/_migrate`, {
  method: 'POST',
  headers: {
    apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  },
  body: JSON.stringify({ p_sql: sql }),
});
const text = await res.text();
if (!res.ok) {
  console.error(`HTTP ${res.status}: ${text}`);
  process.exit(1);
}
console.log('OK:', file);
