-- CC-HT8A · Catálogo con fotografías de Drive y coherencia del reporte de ventas.
-- Preparada para revisión; aplicar después de 0013. No modifica reservas históricas.
begin;

do $$
declare
  v_slugs text[] := array[
    'sucre-colonial-city-tour',
    'potosi-colonial-silver-route',
    'rainbow-mountain-day-hike',
    'andean-traditions-communities'
  ];
  v_ids uuid[];
  v_reserved text;
  v_category text;
begin
  -- Las RPC de reserva toman FOR SHARE sobre el tour: este bloqueo espera las
  -- reservas en curso y evita nuevas reservas entre la comprobación y el borrado.
  perform t.id from public.tours t
    where t.slug = any(v_slugs) order by t.id for update;
  select coalesce(array_agg(t.id order by t.id), '{}'::uuid[]) into v_ids
    from public.tours t where t.slug = any(v_slugs);

  -- Protege TODAS las reservas, incluidas las canceladas y completadas.
  -- Se comprueba también la fecha por si existiera un vínculo histórico incoherente.
  select string_agg(t.slug, ', ' order by t.slug) into v_reserved
  from public.tours t where t.id = any(v_ids) and exists (
    select 1 from public.reservations r
    where r.tour_id = t.id or r.tour_date_id in (
      select td.id from public.tour_dates td where td.tour_id = t.id
    )
  );
  if v_reserved is not null then
    raise exception 'No se puede depurar el catálogo: existen reservas para %. No se ha eliminado ningún tour ni oferta.', v_reserved
      using errcode = 'P0001';
  end if;

  if cardinality(v_ids) > 0 then
    -- Evita que otra edición de ofertas vuelva a añadir estos ids durante la limpieza.
    lock table public.special_offers in share row exclusive mode;

    -- La restricción cardinality(tour_ids) > 0 exige borrar primero las ofertas
    -- que quedarían vacías. No se escribe un array vacío ni se desactivan guardas.
    -- Un vínculo histórico ajeno a los tours afectados debe revisarse antes de borrar.
    if exists (
      select 1 from public.reservations r join public.special_offers o on o.id = r.special_offer_id
      where o.tour_ids && v_ids and not exists (
        select 1 from unnest(o.tour_ids) as x(id) where not (x.id = any(v_ids))
      )
    ) then
      raise exception 'No se puede depurar el catálogo: una oferta que quedaría vacía tiene reservas vinculadas. Revise su historial antes de continuar.'
        using errcode = 'P0001';
    end if;

    delete from public.special_offers o
    where o.tour_ids && v_ids and not exists (
      select 1 from unnest(o.tour_ids) as x(id) where not (x.id = any(v_ids))
    );
    update public.special_offers o
    set tour_ids = array(
      select x.id from unnest(o.tour_ids) with ordinality as x(id, ord)
      where not (x.id = any(v_ids)) order by x.ord
    )
    where o.tour_ids && v_ids;

    -- tour_dates.tour_id tiene ON DELETE CASCADE (0001).
    -- tour_dates_delete_guard solo impide borrar fechas con reservas activas:
    -- la comprobación anterior garantiza cero reservas de cualquier estado.
    -- No hace falta borrar fechas antes ni desactivar el trigger.
    delete from public.tours where id = any(v_ids);
  end if;

  -- Las categorías se conservan siempre; el aviso informa del resultado real al aplicar.
  for v_category in
    select c.slug from public.categories c where not exists (
      select 1 from public.tours t where t.active
        and (t.category_id = c.id or c.id = any(t.category_ids))
    ) order by c.slug
  loop
    raise notice 'Categoría conservada sin tours activos: %', v_category;
  end loop;
end;
$$;

-- CC-HT8B · Códigos cortos de los nueve productos originales conservados.
-- Idempotente: un código ya configurado por administración nunca se sobrescribe.
update public.tours t set code = original.code
from (values
  ('salar-de-uyuni-3-day-adventure', 'UYU-03'),
  ('laguna-colorada-uyuni-4-day-tour', 'UYU-04'),
  ('uyuni-salt-flats-day-tour', 'UYU-01'),
  ('copacabana-isla-del-sol', 'TIT-01'),
  ('la-paz-city-tour-valle-de-la-luna', 'LPZ-01'),
  ('valle-de-la-luna-half-day', 'LUN-01'),
  ('madidi-amazon-expedition', 'MAD-01'),
  ('rurrenabaque-pampas-jungle-3-day', 'RUR-03'),
  ('salkantay-trek-machu-picchu', 'SAL-01')
) as original(slug, code)
where t.slug = original.slug and t.code is null;

-- El borrado desde la interfaz necesita las mismas garantías que la depuración:
-- una única transacción evita ids huérfanos en los arrays de ofertas.
create or replace function public.admin_delete_tour(p_tour_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden: solo el admin puede eliminar tours' using errcode = '42501';
  end if;
  perform t.id from public.tours t where t.id = p_tour_id for update;
  if not found then raise exception 'tour_not_found: el tour ya no existe'; end if;
  if exists (
    select 1 from public.reservations r where r.tour_id = p_tour_id
      or r.tour_date_id in (select td.id from public.tour_dates td where td.tour_id = p_tour_id)
  ) then
    raise exception 'tour_has_bookings: este tour tiene reservas. Desactívelo para conservar el historial.';
  end if;
  lock table public.special_offers in share row exclusive mode;
  if exists (
    select 1 from public.reservations r join public.special_offers o on o.id = r.special_offer_id
    where o.tour_ids <@ array[p_tour_id] and p_tour_id = any(o.tour_ids)
  ) then
    raise exception 'La oferta de este tour tiene reservas vinculadas. Revise su historial antes de eliminarlo.';
  end if;
  delete from public.special_offers o
    where p_tour_id = any(o.tour_ids) and o.tour_ids <@ array[p_tour_id];
  update public.special_offers o set tour_ids = array_remove(o.tour_ids, p_tour_id)
    where p_tour_id = any(o.tour_ids);
  delete from public.tours where id = p_tour_id;
  return p_tour_id;
end;
$$;
revoke all on function public.admin_delete_tour(uuid) from public, anon;
grant execute on function public.admin_delete_tour(uuid) to authenticated;

-- En 0009 los pasajeros cancelados se sumaban en las filas por tour/mes,
-- aunque el total ya los excluía. Se mantiene la firma y se unifica ese criterio.
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
  if p_from is null or p_to is null or p_to < p_from then
    raise exception 'Seleccione un rango de fechas válido para el reporte de ventas.';
  end if;

  with scoped as (
    select * from public.reservations r where r.created_at >= v_from and r.created_at < v_to
  )
  select
    coalesce(jsonb_agg(jsonb_build_object(
      'tour_title', t.title, 'reservations', s.reservas, 'pax', s.pax,
      'revenue', s.ingresos, 'cancellations', s.cancelaciones
    ) order by s.ingresos desc, s.reservas desc), '[]'),
    jsonb_build_object(
      'reservations', (select count(*) from scoped),
      'pax', (select coalesce(sum(pax), 0) from scoped where status <> 'cancelada'),
      'revenue', (select coalesce(sum(total), 0) from scoped where status in ('confirmada', 'completada')),
      'cancellations', (select count(*) from scoped where status = 'cancelada')
    )
  into v_tours, v_totals
  from (
    select r.tour_id, count(*) as reservas,
      coalesce(sum(r.pax) filter (where r.status <> 'cancelada'), 0) as pax,
      coalesce(sum(r.total) filter (where r.status in ('confirmada', 'completada')), 0) as ingresos,
      count(*) filter (where r.status = 'cancelada') as cancelaciones
    from scoped r group by r.tour_id
  ) s join public.tours t on t.id = s.tour_id;

  with scoped as (
    select * from public.reservations r where r.created_at >= v_from and r.created_at < v_to
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'month', to_char(s.month, 'YYYY-MM'), 'reservations', s.reservas,
    'pax', s.pax, 'revenue', s.ingresos, 'cancellations', s.cancelaciones
  ) order by s.month), '[]') into v_months
  from (
    select date_trunc('month', r.created_at at time zone 'America/La_Paz') as month,
      count(*) as reservas,
      coalesce(sum(r.pax) filter (where r.status <> 'cancelada'), 0) as pax,
      coalesce(sum(r.total) filter (where r.status in ('confirmada', 'completada')), 0) as ingresos,
      count(*) filter (where r.status = 'cancelada') as cancelaciones
    from scoped r group by 1
  ) s;

  return jsonb_build_object('from', p_from, 'to', p_to, 'tours', v_tours, 'months', v_months, 'totals', v_totals);
end;
$$;
revoke all on function public.admin_report_sales(date, date) from public, anon;
grant execute on function public.admin_report_sales(date, date) to authenticated;

notify pgrst, 'reload schema';
commit;
