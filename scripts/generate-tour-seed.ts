// Convierte src/data/tours.ts a la migración SQL 0007_seed_tours.sql (S-12).
// Uso: node scripts/generate-tour-seed.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// @ts-ignore - import dinámico de módulo TS con type-stripping
const { tours, featuredTours } = await import('../src/data/tours.ts');

const SUPA_URL = 'https://bqppfgnouwevzmpgdepr.supabase.co';

const storageUrl = (path: string): string => {
  if (!path) return path;
  if (path.startsWith('http')) return path;
  const name = path.replace(/^\/assets\//, '');
  return `${SUPA_URL}/storage/v1/object/public/tours/${name}`;
};

const esc = (s: string): string => s.replace(/'/g, "''");

const sqlStr = (s: string | null | undefined): string =>
  s === null || s === undefined ? 'null' : `'${esc(s)}'`;

const sqlArr = (a: string[]): string =>
  a.length === 0 ? `'{}'` : `ARRAY[${a.map((x) => `'${esc(x)}'`).join(', ')}]`;

const jsonb = (v: unknown): string => `'${esc(JSON.stringify(v))}'`;

const featured = new Set(featuredTours as string[]);

// Orden posicional (debe coincidir con la lista de columnas del CTE staged)
const rows: string[] = [];
for (const t of tours) {
  const catSlug = t.category as string;
  const catSlugs = t.categories as string[];
  rows.push(`  (${sqlStr(t.slug)},
    ${sqlStr(t.title)},
    ${sqlStr(storageUrl(t.image))},
    ${jsonb((t.gallery as string[]).map(storageUrl))},
    ${sqlStr(t.badge)},
    ${sqlStr(t.badgeVariant)},
    ${sqlStr(catSlug)},
    ARRAY[${catSlugs.map((s) => `'${esc(s)}'`).join(', ')}],
    ${sqlStr(t.duration)},
    ${sqlStr(t.difficulty)},
    ${sqlStr(t.activityLabel)},
    ${sqlStr(t.typeLabel)},
    ${sqlStr(t.destination)},
    ${sqlStr(t.startEnd)},
    ${sqlStr(t.bestSeason)},
    ${sqlStr(t.maxAltitude)},
    ${t.tourTypes.group},
    ${t.tourTypes.semi},
    ${t.tourTypes.private},
    ${sqlArr(t.summary as string[])},
    ${sqlArr(t.highlights as string[])},
    ${jsonb(t.itinerary)},
    ${sqlArr(t.included as string[])},
    ${sqlArr(t.notIncluded as string[])},
    ${jsonb(t.whatToBring)},
    ${jsonb(t.info)},
    ${jsonb(t.extras)},
    ${featured.has(t.slug) ? 'true' : 'false'})`);
}

const sql = `-- Siembra 1:1 de los 12 tours actuales (S-12). Imágenes en Storage (bucket tours).
with staged (
  slug, title, image, gallery, badge, badge_variant, category_slug, category_slugs,
  duration, difficulty, activity_label, type_label, destination, start_end, best_season,
  max_altitude, price_group, price_semi, price_private, summary, highlights, itinerary,
  included, not_included, what_to_bring, info, extras, featured
) as (
  values
${rows.join(',\n')}
)
insert into public.tours (
  slug, title, image, gallery, badge, badge_variant,
  category_id, category_ids, duration, difficulty, activity_label, type_label,
  destination, start_end, best_season, max_altitude,
  price_group, price_semi, price_private, summary, highlights, itinerary,
  included, not_included, what_to_bring, info, extras, featured
)
select
  s.slug, s.title, s.image, s.gallery::jsonb, s.badge, s.badge_variant,
  (select c.id from public.categories c where c.slug = s.category_slug),
  (select array_agg(c.id) from public.categories c where c.slug = any (s.category_slugs)),
  s.duration, s.difficulty, s.activity_label, s.type_label,
  s.destination, s.start_end, s.best_season, s.max_altitude,
  s.price_group::numeric(10,2), s.price_semi::numeric(10,2), s.price_private::numeric(10,2),
  s.summary::text[], s.highlights::text[], s.itinerary::jsonb,
  s.included::text[], s.not_included::text[],
  s.what_to_bring::jsonb, s.info::jsonb, s.extras::jsonb, s.featured
from staged s
on conflict (slug) do update set
  title = excluded.title,
  image = excluded.image,
  gallery = excluded.gallery,
  badge = excluded.badge,
  badge_variant = excluded.badge_variant,
  category_id = excluded.category_id,
  category_ids = excluded.category_ids,
  duration = excluded.duration,
  difficulty = excluded.difficulty,
  activity_label = excluded.activity_label,
  type_label = excluded.type_label,
  destination = excluded.destination,
  start_end = excluded.start_end,
  best_season = excluded.best_season,
  max_altitude = excluded.max_altitude,
  price_group = excluded.price_group,
  price_semi = excluded.price_semi,
  price_private = excluded.price_private,
  summary = excluded.summary,
  highlights = excluded.highlights,
  itinerary = excluded.itinerary,
  included = excluded.included,
  not_included = excluded.not_included,
  what_to_bring = excluded.what_to_bring,
  info = excluded.info,
  extras = excluded.extras,
  featured = excluded.featured;
`;

const out = join(dirname(fileURLToPath(import.meta.url)), '../supabase/migrations/0007_seed_tours.sql');
writeFileSync(out, sql);
console.log(`OK: ${tours.length} tours -> ${out}`);
