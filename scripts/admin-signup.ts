// Crea la cuenta admin en Supabase Auth (S-05). La contraseña la entrega el usuario; no se guarda en el repo.
// Uso: node scripts/admin-signup.ts <password>
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

const password = process.argv[2];
if (!password) {
  console.error('uso: node scripts/admin-signup.ts <password>');
  process.exit(1);
}

const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/signup`, {
  method: 'POST',
  headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'webhomeland1@gmail.com',
    password,
    data: { full_name: 'Homeland Admin' },
  }),
});
console.log(`HTTP ${res.status}`);
console.log(await res.text());
