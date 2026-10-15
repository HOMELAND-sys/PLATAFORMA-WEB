-- 0010 — Endurece v_admin_clients (Fase 2): security_invoker para que la vista use la
-- RLS del consultante (lint 0010 de Supabase) y search_path fijo en _day_start (lint 0011).
-- Para no-admin la RLS de profiles/reservations ya limita las filas y el filtro
-- is_admin() interno devuelve vacío.

drop view if exists public.v_admin_clients;

create view public.v_admin_clients
with (security_invoker = true)
as
select
  p.id,
  p.full_name,
  u.email,
  p.phone,
  p.created_at,
  count(r.id) as reservations_count,
  coalesce(sum(r.total) filter (where r.status in ('confirmada', 'completada')), 0) as total_spent,
  max(r.created_at) as last_reservation_at
from public.profiles p
left join public.v_user_emails u on u.id = p.id
left join public.reservations r on r.user_id = p.id
where public.is_admin()
group by p.id, u.email;

create or replace function public._day_start(p_day date)
returns timestamptz
language sql
immutable
set search_path = public
as $$
  select (p_day::timestamp) at time zone 'America/La_Paz';
$$;
