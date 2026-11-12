-- CC-HT7A: ofertas y compatibilidad de reportes. Aplicar después de 0011.
begin;
-- Compatibilidad de los informes anteriores con reservas sin cuenta y franjas.
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
      'id', d.id,
      'start_time', d.start_time,
      'date', d.date,
      'tour_id', d.tour_id,
      'tour_title', t.title,
      'capacity', d.capacity,
      'occupied', d.occupied,
      'free', d.capacity - d.occupied
    ) order by d.date, t.title), '[]')
  into v_occupancy
  from public.v_tour_dates_free d
  join public.tours t on t.id=d.tour_id
  where d.date>=v_today and d.date<v_today+7;

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
      'client_name', coalesce(r.contact_name,p.full_name,''),
      'tour_title', t.title,
      'tour_date', td.date,
      'total', r.total,
      'created_at', r.created_at,
      'days_pending', floor(extract(epoch from (now() - r.created_at)) / 86400)::int
    ) order by r.created_at), '[]')
  into v_alerts
  from public.reservations r
  left join public.profiles p on p.id = r.user_id
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
    select r.*, coalesce(r.contact_name,p.full_name,'') as client_name, coalesce(r.contact_email,u.email,'') as client_email,
           t.title as tour_title, td.date as tour_date
    from public.reservations r
    left join public.profiles p on p.id = r.user_id
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

commit;
