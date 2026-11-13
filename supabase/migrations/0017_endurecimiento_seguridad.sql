-- 0017: endurecimiento de seguridad antes de producción.
-- No cambia datos ni contratos del sitio: solo permisos, políticas y search_path.
begin;

-- 1. Vistas: solo lectura y solo para el rol que las necesita.
--    (Supabase concede ALL a anon/authenticated por defecto.)
revoke all on public.v_user_emails from public, anon, authenticated;
grant select on public.v_user_emails to authenticated;

revoke all on public.v_admin_clients from public, anon, authenticated;
grant select on public.v_admin_clients to authenticated;

revoke all on public.v_tour_dates_free from public, anon, authenticated;
grant select on public.v_tour_dates_free to anon, authenticated;

-- 2. Cupones: nadie puede listar los códigos por la API. Se validan uno a uno
--    con la RPC (solo usuarios con sesión, que es cuando existe el checkout).
--    (ALTER en vez de DROP: la política pública pasa a ser solo de administración.)
do $$
begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'coupons' and policyname = 'coupons_select_public') then
    alter policy coupons_select_public on public.coupons using (public.is_admin());
    alter policy coupons_select_public on public.coupons rename to coupons_select_admin;
  end if;
end $$;

create or replace function public.validate_coupon(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select jsonb_build_object('code', c.code, 'discount_pct', c.discount_pct, 'valid', true)
      from public.coupons c
      where c.code = upper(btrim(coalesce(p_code, '')))
        and c.active
        and (c.valid_from is null or (now() at time zone 'America/La_Paz')::date >= c.valid_from)
        and (c.valid_to is null or (now() at time zone 'America/La_Paz')::date <= c.valid_to)
      limit 1
    ),
    jsonb_build_object('code', upper(btrim(coalesce(p_code, ''))), 'valid', false)
  );
$$;
revoke all on function public.validate_coupon(text) from public, anon;
grant execute on function public.validate_coupon(text) to authenticated;

-- 3. Funciones de trigger: se ejecutan por el trigger, nunca por la API.
revoke all on function public.audit_write() from public, anon, authenticated;
revoke all on function public.audit_write_coupon() from public, anon, authenticated;
revoke all on function public.audit_write_setting() from public, anon, authenticated;
revoke all on function public.audit_write_uuid() from public, anon, authenticated;
revoke all on function public.guard_profile_role() from public, anon, authenticated;
revoke all on function public.guard_reservation_capacity() from public, anon, authenticated;
revoke all on function public.guard_reservation_fields() from public, anon, authenticated;
revoke all on function public.guard_reservation_status() from public, anon, authenticated;
revoke all on function public.guard_tour_date_capacity() from public, anon, authenticated;
revoke all on function public.guard_tour_date_delete() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.sync_offer_seats() from public, anon, authenticated;
revoke all on function public.touch_transfer_payment() from public, anon, authenticated;
revoke all on function public.touch_updated_at() from public, anon, authenticated;
revoke all on function public.validate_offer_definition() from public, anon, authenticated;
revoke all on function public.rls_auto_enable() from public, anon, authenticated;

alter function public.touch_updated_at() set search_path = public;
alter function public.guard_tour_date_delete() set search_path = public;
alter function public.touch_transfer_payment() set search_path = public;

-- 4. RPC de administración: un visitante anónimo no tiene por qué poder llamarlas
--    (ya rechazaban por dentro; ahora ni siquiera son alcanzables sin sesión).
revoke all on function public.admin_dashboard_overview(date, date) from public, anon;
grant execute on function public.admin_dashboard_overview(date, date) to authenticated;
revoke all on function public.admin_report_bookings(date, date, text) from public, anon;
grant execute on function public.admin_report_bookings(date, date, text) to authenticated;
revoke all on function public.admin_report_clients(date, date) from public, anon;
grant execute on function public.admin_report_clients(date, date) to authenticated;
revoke all on function public._day_start(date) from public, anon;
grant execute on function public._day_start(date) to authenticated;

-- 5. Ajustes públicos: el sitio (sin sesión) necesita leer los datos de la empresa
--    y las políticas para el pie de página, WhatsApp y las páginas legales.
--    El enlace/QR de pago siguen visibles solo con sesión (settings_select_auth).
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'settings' and policyname = 'settings_select_public_keys') then
    create policy settings_select_public_keys on public.settings
      for select to anon, authenticated
      using (key in ('company', 'policies', 'site'));
  end if;
end $$;

notify pgrst, 'reload schema';
commit;
