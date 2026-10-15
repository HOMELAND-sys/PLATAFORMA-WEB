-- 0009 — Fase 2: panel profesional (RF-13 dashboard, RF-14 clientes, RF-15 reportes)
-- Backend de agregación: RPC admin_dashboard_overview, vista v_admin_clients y
-- RPCs admin_report_sales / admin_report_bookings / admin_report_clients.
-- Todas exigen rol admin (is_admin()); con SECURITY INVOKER la RLS es la primera línea.

-- ---------------------------------------------------------------------------
-- RF-14 — Clientes: cuentas con nº de reservas y total gastado (confirmadas).
-- security_invoker = false + filtro is_admin() interno: para no-admin devuelve vacío.
-- ---------------------------------------------------------------------------
create or replace view public.v_admin_clients
with (security_invoker = false)
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

-- ---------------------------------------------------------------------------
-- Helper: convierte una fecha (día del operador, America/La_Paz) al inicio UTC del día.
-- ---------------------------------------------------------------------------
create or replace function public._day_start(p_day date)
returns timestamptz
language sql
immutable
as $$
  select (p_day::timestamp) at time zone 'America/La_Paz';
$$;

-- ---------------------------------------------------------------------------
-- RF-13 — Dashboard: KPIs del período, ocupación próximos 7 días, top 5 tours
-- y alerta de pendientes de pago con más de 7 días.
-- ---------------------------------------------------------------------------
create or replace function public.admin_dashboard_overview(p_from date, p_to date)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_from timestamptz := public._day_start(p_from);
  v_to timestamptz := public._day_start(p_to + 1);
  v_today date := (now() at time zone 'America/La_Paz')::date;
  v_kpis jsonb;
  v_occupancy jsonb;
  v_top jsonb;
  v_alerts jsonb;
begin
  if not public.is_admin() then
    raise exception 'forbidden: solo el admin ve el dashboard' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'reservations_total', count(*),
    'pending_payment', count(*) filter (where status = 'pendiente_pago'),
    'pending_amount', coalesce(sum(total) filter (where status = 'pendiente_pago'), 0),
    'confirmed_count', count(*) filter (where status in ('confirmada', 'completada')),
    'confirmed_revenue', coalesce(sum(total) filter (where status in ('confirmada', 'completada')), 0),
    'cancelled', count(*) filter (where status = 'cancelada'),
    'avg_ticket', coalesce(
      sum(total) filter (where status in ('confirmada', 'completada'))
        / nullif(count(*) filter (where status in ('confirmada', 'completada')), 0),
      0),
    'clients_new', (select count(*) from public.profiles pp where pp.created_at >= v_from and pp.created_at < v_to),
    'clients_total', (select count(*) from public.profiles pp)
  )
  into v_kpis
  from public.reservations r
  where r.created_at >= v_from and r.created_at < v_to;

  -- Ocupación de los próximos 7 días (hoy incluido), por tour y fecha
  select coalesce(jsonb_agg(jsonb_build_object(
      'date', d.date,
      'tour_id', d.tour_id,
      'tour_title', t.title,
      'capacity', d.capacity,
      'occupied', d.occupied,
      'free', d.capacity - d.occupied
    ) order by d.date, t.title), '[]')
  into v_occupancy
  from (
    select td.id, td.tour_id, td.date, td.capacity,
           coalesce(o.occupied, 0) as occupied
    from public.tour_dates td
    left join lateral (
      select sum(r.pax) as occupied
      from public.reservations r
      where r.tour_date_id = td.id
        and r.status in ('pendiente_pago', 'confirmada')
    ) o on true
    where td.date >= v_today and td.date < v_today + 7
  ) d
  join public.tours t on t.id = d.tour_id;

  -- Top 5 tours por reservas del período
  select coalesce(jsonb_agg(jsonb_build_object(
      'tour_id', s.tour_id,
      'tour_title', t.title,
      'reservations', s.reservas,
      'pax', s.pax,
      'revenue', s.ingresos
    ) order by s.reservas desc, s.ingresos desc), '[]')
  into v_top
  from (
    select r.tour_id,
           count(*) as reservas,
           coalesce(sum(r.pax), 0) as pax,
           coalesce(sum(r.total) filter (where r.status in ('confirmada', 'completada')), 0) as ingresos
    from public.reservations r
    where r.created_at >= v_from and r.created_at < v_to
    group by r.tour_id
    order by count(*) desc, 4 desc
    limit 5
  ) s
  join public.tours t on t.id = s.tour_id;

  -- Alerta: pendientes de pago con más de 7 días (R-01)
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', r.id,
      'code', r.code,
      'client_name', p.full_name,
      'tour_title', t.title,
      'tour_date', td.date,
      'total', r.total,
      'created_at', r.created_at,
      'days_pending', floor(extract(epoch from (now() - r.created_at)) / 86400)::int
    ) order by r.created_at), '[]')
  into v_alerts
  from public.reservations r
  join public.profiles p on p.id = r.user_id
  join public.tours t on t.id = r.tour_id
  join public.tour_dates td on td.id = r.tour_date_id
  where r.status = 'pendiente_pago'
    and r.created_at < now() - interval '7 days';

  return jsonb_build_object(
    'from', p_from,
    'to', p_to,
    'kpis', v_kpis,
    'occupancy', v_occupancy,
    'top_tours', v_top,
    'stale_pending', v_alerts
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RF-15 — Reporte Ventas: por tour y por mes (reservas del período, por
-- created_at). Ingresos = solo confirmadas/completadas (R-07).
-- ---------------------------------------------------------------------------
create or replace function public.admin_report_sales(p_from date, p_to date)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_from timestamptz := public._day_start(p_from);
  v_to timestamptz := public._day_start(p_to + 1);
  v_tours jsonb;
  v_months jsonb;
  v_totals jsonb;
begin
  if not public.is_admin() then
    raise exception 'forbidden: solo el admin genera reportes' using errcode = '42501';
  end if;

  with scoped as (
    select * from public.reservations r
    where r.created_at >= v_from and r.created_at < v_to
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
        'tour_title', t.title,
        'reservations', s.reservas,
        'pax', s.pax,
        'revenue', s.ingresos,
        'cancellations', s.cancelaciones
      ) order by s.ingresos desc, s.reservas desc), '[]'),
    jsonb_build_object(
      'reservations', (select count(*) from scoped),
      'pax', (select coalesce(sum(pax), 0) from scoped where status <> 'cancelada'),
      'revenue', (select coalesce(sum(total), 0) from scoped where status in ('confirmada', 'completada')),
      'cancellations', (select count(*) from scoped where status = 'cancelada')
    )
  into v_tours, v_totals
  from (
    select r.tour_id,
           count(*) as reservas,
           coalesce(sum(r.pax), 0) as pax,
           coalesce(sum(r.total) filter (where r.status in ('confirmada', 'completada')), 0) as ingresos,
           count(*) filter (where r.status = 'cancelada') as cancelaciones
    from scoped r
    group by r.tour_id
  ) s
  join public.tours t on t.id = s.tour_id;

  with scoped as (
    select * from public.reservations r
    where r.created_at >= v_from and r.created_at < v_to
  )
  select coalesce(jsonb_agg(jsonb_build_object(
        'month', to_char(s.month, 'YYYY-MM'),
        'reservations', s.reservas,
        'pax', s.pax,
        'revenue', s.ingresos,
        'cancellations', s.cancelaciones
      ) order by s.month), '[]')
  into v_months
  from (
    select date_trunc('month', r.created_at at time zone 'America/La_Paz') as month,
           count(*) as reservas,
           coalesce(sum(r.pax), 0) as pax,
           coalesce(sum(r.total) filter (where r.status in ('confirmada', 'completada')), 0) as ingresos,
           count(*) filter (where r.status = 'cancelada') as cancelaciones
    from scoped r
    group by 1
  ) s;

  return jsonb_build_object(
    'from', p_from,
    'to', p_to,
    'tours', v_tours,
    'months', v_months,
    'totals', v_totals
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RF-15 — Reporte Reservas: listado completo del período (creadas entre las
-- fechas), opcionalmente filtrado por estado.
-- ---------------------------------------------------------------------------
create or replace function public.admin_report_bookings(p_from date, p_to date, p_status text default null)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_from timestamptz := public._day_start(p_from);
  v_to timestamptz := public._day_start(p_to + 1);
  v_rows jsonb;
  v_totals jsonb;
begin
  if not public.is_admin() then
    raise exception 'forbidden: solo el admin genera reportes' using errcode = '42501';
  end if;
  if p_status is not null and p_status not in ('pendiente_pago', 'confirmada', 'completada', 'cancelada') then
    raise exception 'invalid_status' using errcode = 'P0001';
  end if;

  with scoped as (
    select r.*, p.full_name as client_name, u.email as client_email,
           t.title as tour_title, td.date as tour_date
    from public.reservations r
    join public.profiles p on p.id = r.user_id
    left join public.v_user_emails u on u.id = r.user_id
    join public.tours t on t.id = r.tour_id
    join public.tour_dates td on td.id = r.tour_date_id
    where r.created_at >= v_from and r.created_at < v_to
      and (p_status is null or r.status = p_status)
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
        'code', s.code,
        'created_at', s.created_at,
        'client_name', s.client_name,
        'client_email', s.client_email,
        'tour_title', s.tour_title,
        'tour_date', s.tour_date,
        'tour_type', s.tour_type,
        'pax', s.pax,
        'total', s.total,
        'status', s.status
      ) order by s.created_at desc), '[]'),
    jsonb_build_object(
      'reservations', (select count(*) from scoped),
      'pax', (select coalesce(sum(pax), 0) from scoped where status <> 'cancelada'),
      'revenue', (select coalesce(sum(total), 0) from scoped where status in ('confirmada', 'completada')),
      'grand_total', (select coalesce(sum(total), 0) from scoped where status <> 'cancelada')
    )
  into v_rows, v_totals
  from scoped s;

  return jsonb_build_object(
    'from', p_from,
    'to', p_to,
    'status', p_status,
    'rows', v_rows,
    'totals', v_totals
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- RF-15 — Reporte Clientes: registros y gasto por cliente (rango opcional
-- sobre la fecha de registro).
-- ---------------------------------------------------------------------------
create or replace function public.admin_report_clients(p_from date default null, p_to date default null)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  v_rows jsonb;
  v_totals jsonb;
begin
  if not public.is_admin() then
    raise exception 'forbidden: solo el admin genera reportes' using errcode = '42501';
  end if;

  with scoped as (
    select
      c.id, c.full_name, c.email, c.created_at,
      c.reservations_count, c.total_spent
    from public.v_admin_clients c
    where (p_from is null or c.created_at >= public._day_start(p_from))
      and (p_to is null or c.created_at < public._day_start(p_to + 1))
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
        'full_name', s.full_name,
        'email', s.email,
        'created_at', s.created_at,
        'reservations_count', s.reservations_count,
        'total_spent', s.total_spent
      ) order by s.total_spent desc, s.created_at), '[]'),
    jsonb_build_object(
      'clients', (select count(*) from scoped),
      'reservations', (select coalesce(sum(reservations_count), 0) from scoped),
      'revenue', (select coalesce(sum(total_spent), 0) from scoped)
    )
  into v_rows, v_totals
  from scoped s;

  return jsonb_build_object(
    'from', p_from,
    'to', p_to,
    'rows', v_rows,
    'totals', v_totals
  );
end;
$$;

-- Higiene: ninguna de estas funciones tiene sentido para usuarios anónimos.
revoke execute on function public.admin_dashboard_overview(date, date) from anon;
revoke execute on function public.admin_report_sales(date, date) from anon;
revoke execute on function public.admin_report_bookings(date, date, text) from anon;
revoke execute on function public.admin_report_clients(date, date) from anon;
