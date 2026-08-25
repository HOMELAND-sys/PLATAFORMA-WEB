-- Homeland Tours — siembra inicial (S-12) + Storage

-- 7 categorías actuales (S-12). 'All tours' es un filtro solo de UI.
insert into public.categories (slug, label, emoji, image, position) values
  ('lapaz-city',   'La Paz city tours',   '🏔️', '/assets/lapaz-city.jpg',     1),
  ('lapaz-top',    'La Paz top tours',    '⭐', '/assets/uyuni-mirror.jpg',   2),
  ('uyuni',        'Salar de Uyuni',      '🧂', '/assets/uyuni-salt.jpg',     3),
  ('amazon',       'Amazonía',            '🌿', '/assets/titicaca-lake.jpg',  4),
  ('trekking',     'Trekking Cordillera', '⛰️', '/assets/andes-mountains.jpg',5),
  ('bolivia-top',  'Bolivia top tours',   '🏛️', '/assets/uyuni-salt.jpg',     6),
  ('peru',         'Tours en Perú',       '🦙', '/assets/machu-picchu.jpg',   7)
on conflict (slug) do update set label = excluded.label, emoji = excluded.emoji, image = excluded.image, position = excluded.position;

-- 3 cupones actuales (S-12)
insert into public.coupons (code, discount_pct, active, valid_from, valid_to) values
  ('WELCOME10', 10, true, null, null),
  ('BOLIVIA15', 15, true, null, null),
  ('SUMMER20',  20, true, null, null)
on conflict (code) do update set discount_pct = excluded.discount_pct, active = excluded.active;

-- Settings: pago global (RF-08). Vacío hasta que el admin lo configure.
insert into public.settings (key, value) values
  ('payment_link', 'null'),
  ('payment_qr_url', 'null'),
  ('payment_instructions', 'null')
on conflict (key) do nothing;

-- Storage: buckets públicos para imágenes de tours y QR de pago
insert into storage.buckets (id, name, public) values ('tours', 'tours', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public) values ('payment', 'payment', true)
on conflict (id) do update set public = true;

-- Lectura pública de ambos buckets
drop policy if exists "ht_storage_public_read" on storage.objects;
create policy "ht_storage_public_read" on storage.objects
  for select using (bucket_id in ('tours', 'payment'));

-- Escritura solo admin (imágenes de tours, galerías, QR de pago)
drop policy if exists "ht_storage_admin_insert" on storage.objects;
create policy "ht_storage_admin_insert" on storage.objects
  for insert with check (bucket_id in ('tours', 'payment') and public.is_admin());

drop policy if exists "ht_storage_admin_update" on storage.objects;
create policy "ht_storage_admin_update" on storage.objects
  for update using (bucket_id in ('tours', 'payment') and public.is_admin())
  with check (bucket_id in ('tours', 'payment') and public.is_admin());

drop policy if exists "ht_storage_admin_delete" on storage.objects;
create policy "ht_storage_admin_delete" on storage.objects
  for delete using (bucket_id in ('tours', 'payment') and public.is_admin());
