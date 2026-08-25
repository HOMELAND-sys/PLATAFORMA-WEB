-- Homeland Tours — RLS (sección 19 de la especificación)

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.tours enable row level security;
alter table public.tour_dates enable row level security;
alter table public.reservations enable row level security;
alter table public.booking_passengers enable row level security;
alter table public.coupons enable row level security;
alter table public.settings enable row level security;
alter table public.audit_log enable row level security;

-- profiles: lectura propia; admin lee todo (tab Clientes). Un cliente no edita su rol (trigger).
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin" on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- categories: lectura pública; escritura solo admin
drop policy if exists "categories_select_public" on public.categories;
create policy "categories_select_public" on public.categories
  for select using (true);

drop policy if exists "categories_admin_all" on public.categories;
create policy "categories_admin_all" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

-- tours: lectura pública de lo activo; escritura solo admin
drop policy if exists "tours_select_public_active" on public.tours;
create policy "tours_select_public_active" on public.tours
  for select using (active);

drop policy if exists "tours_admin_all" on public.tours;
create policy "tours_admin_all" on public.tours
  for all using (public.is_admin()) with check (public.is_admin());

-- tour_dates: lectura pública (la vista v_tour_dates_free expone el cupo libre); escritura solo admin
drop policy if exists "tour_dates_select_public" on public.tour_dates;
create policy "tour_dates_select_public" on public.tour_dates
  for select using (true);

drop policy if exists "tour_dates_admin_all" on public.tour_dates;
create policy "tour_dates_admin_all" on public.tour_dates
  for all using (public.is_admin()) with check (public.is_admin());

-- reservations: lectura propia o admin; creación SOLO vía RPC create_booking (no hay policy de insert).
-- Update: dueño (autocancelación pendiente, RF-17, forzada por trigger) o admin (guardada por trigger).
drop policy if exists "reservations_select_own_or_admin" on public.reservations;
create policy "reservations_select_own_or_admin" on public.reservations
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "reservations_update_own_or_admin" on public.reservations;
create policy "reservations_update_own_or_admin" on public.reservations
  for update using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- booking_passengers: lectura propia (vía reserva) o admin. Sin policy de insert: solo la RPC escribe.
drop policy if exists "passengers_select_own_or_admin" on public.booking_passengers;
create policy "passengers_select_own_or_admin" on public.booking_passengers
  for select using (
    exists (
      select 1 from public.reservations r
      where r.id = reservations_id
        and (r.user_id = auth.uid() or public.is_admin())
    )
  );

-- coupons: lectura pública (se validan en el checkout); escritura solo admin
drop policy if exists "coupons_select_public" on public.coupons;
create policy "coupons_select_public" on public.coupons
  for select using (true);

drop policy if exists "coupons_admin_all" on public.coupons;
create policy "coupons_admin_all" on public.coupons
  for all using (public.is_admin()) with check (public.is_admin());

-- settings: lectura de autenticados (el voucher lo ve el cliente); escritura solo admin
drop policy if exists "settings_select_auth" on public.settings;
create policy "settings_select_auth" on public.settings
  for select to authenticated using (true);

drop policy if exists "settings_admin_all" on public.settings;
create policy "settings_admin_all" on public.settings
  for all using (public.is_admin()) with check (public.is_admin());

-- audit_log: solo admin lee (RF-19); la escritura la hace el trigger de auditoría (security definer)
drop policy if exists "audit_select_admin" on public.audit_log;
create policy "audit_select_admin" on public.audit_log
  for select using (public.is_admin());
