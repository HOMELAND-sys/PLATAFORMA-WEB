-- CC-HT8D: reparto de adultos y niños en las reservas del sitio web.
-- p_pax sigue siendo el total para cupos, precios y descuentos.
-- p_children es opcional: las llamadas anteriores mantienen children = 0.
-- No se modifica el reparto de las reservas históricas.
begin;

-- Elimina la firma anterior para que PostgREST no encuentre sobrecargas ambiguas.
-- CREATE OR REPLACE permite volver a aplicar esta migración con la firma nueva.
drop function if exists public.create_booking(uuid,date,text,integer,jsonb,jsonb,text,text,uuid,uuid);

create or replace function public.create_booking(
  p_tour_id uuid, p_date date, p_tour_type text, p_pax integer,
  p_extras jsonb default '[]', p_passengers jsonb default '[]',
  p_coupon_code text default null, p_payment_method text default 'link',
  p_tour_date_id uuid default null, p_offer_id uuid default null, p_children int default 0
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_tour public.tours%rowtype; v_slot public.tour_dates%rowtype;
  v_res public.reservations%rowtype; v_coupon public.coupons%rowtype;
  v_offer public.special_offers%rowtype; v_offer_discount numeric := 0;
  v_price numeric; v_subtotal numeric; v_group numeric; v_discount numeric := 0;
  v_extra_total numeric := 0; v_extras jsonb := '[]'; v_extra jsonb;
  v_passenger jsonb; v_code text; v_i int;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if p_pax is null or p_pax not between 1 and 8 then raise exception 'invalid_pax'; end if;
  if p_children is null or p_children < 0 or p_children > p_pax - 1 then raise exception 'invalid_passengers: debe viajar al menos un adulto'; end if;
  if p_tour_type is null or p_tour_type not in ('group','semi','private') then raise exception 'invalid_tour_type'; end if;
  if p_payment_method is null or p_payment_method not in ('link','qr') then raise exception 'invalid_payment_method'; end if;
  if p_passengers is null or jsonb_typeof(p_passengers) <> 'array' then raise exception 'invalid_passengers'; end if;
  if jsonb_array_length(p_passengers) <> p_pax then raise exception 'invalid_passengers: debe registrar a todos los pasajeros'; end if;
  if p_extras is null or jsonb_typeof(p_extras) <> 'array' then raise exception 'invalid_extras'; end if;
  select * into v_tour from public.tours where id = p_tour_id for share;
  if not found or not v_tour.active then raise exception 'tour_inactive'; end if;
  if p_pax < v_tour.min_pax then raise exception 'invalid_pax: mínimo %',v_tour.min_pax; end if;
  if p_tour_date_id is null then
    -- Bloquea en el mismo orden por UUID que la edición masiva. La selección
    -- posterior usa una lectura nueva de ocupación, incluso si tuvo que esperar
    -- otra reserva concurrente. Nunca reserva una franja bloqueada o vencida.
    perform td.id from public.tour_dates td
      where td.tour_id=p_tour_id and td.date=p_date order by td.id for update;
    select td.* into v_slot from public.tour_dates td
      join public.v_tour_dates_free f on f.id=td.id
      where td.tour_id=p_tour_id and td.date=p_date and f.bookable and f.free>=p_pax
      order by td.start_time nulls first,td.id limit 1;
    if not found then
      raise exception 'date_full: no hay una franja reservable con cupo suficiente en esta fecha';
    end if;
  else
    select * into v_slot from public.tour_dates
      where tour_id=p_tour_id and date=p_date and id=p_tour_date_id for update;
    if not found then raise exception 'date_not_open'; end if;
  end if;
  if v_slot.blocked then raise exception 'slot_blocked: salida bloqueada'; end if;
  if now() >= ((v_slot.date + coalesce(v_slot.start_time,time '00:00')) at time zone 'America/La_Paz')
    - make_interval(hours => coalesce(v_slot.cutoff_hours,v_tour.default_cutoff_hours)) then
    raise exception 'cutoff_passed: ha pasado la hora límite de reserva';
  end if;
  case p_tour_type when 'group' then v_price := v_tour.price_group;
    when 'semi' then v_price := v_tour.price_semi; else v_price := v_tour.price_private; end case;
  if v_price is null or v_price < 0 then raise exception 'tour_type_unavailable'; end if;
  select coalesce(jsonb_agg(e), '[]'), coalesce(sum((e->>'price')::numeric),0)
    into v_extras,v_extra_total from jsonb_array_elements(v_tour.extras) e
    where e->>'kind' = 'paid' and exists (select 1 from jsonb_array_elements(p_extras) x where x->>'id' = e->>'id');
  v_subtotal := v_price * p_pax + v_extra_total;
  v_group := round(v_subtotal * case when p_pax >= 5 then .08 when p_pax >= 3 then .05 else 0 end);
  if p_offer_id is not null then
    select * into v_offer from public.special_offers o where o.id=p_offer_id
      and p_tour_id=any(o.tour_ids) and o.status='active'
      and (now() at time zone 'America/La_Paz')::date between o.activity_from and o.activity_to
      and p_date between o.activity_from and o.activity_to
      and (o.weekdays is null or extract(dow from p_date)::int=any(o.weekdays))
      and (o.start_times is null or to_char(v_slot.start_time,'HH24:MI')=any(o.start_times))
      and (o.kind='limited'
        or (o.kind='early_bird' and p_date-(now() at time zone 'America/La_Paz')::date >= o.booking_notice_days)
        or (o.kind='last_minute' and p_date-(now() at time zone 'America/La_Paz')::date between 0 and o.booking_notice_days))
      for update;
    if not found then raise exception 'offer_invalid: oferta no aplicable a esta salida'; end if;
    if v_offer.seats_limit is not null and v_offer.seats_sold+p_pax>v_offer.seats_limit then raise exception 'offer_full: no quedan plazas con descuento'; end if;
    v_offer_discount:=round((v_subtotal-v_group)*v_offer.discount_pct/100.0,2);
  end if;
  if nullif(btrim(p_coupon_code),'') is not null then
    select * into v_coupon from public.coupons where code = upper(btrim(p_coupon_code)) and active
      and (valid_from is null or valid_from <= (now() at time zone 'America/La_Paz')::date)
      and (valid_to is null or valid_to >= (now() at time zone 'America/La_Paz')::date);
    if not found then raise exception 'coupon_invalid'; end if;
    -- El redondeo de un cupón del 100 % nunca puede volver negativo el total.
    v_discount := least(v_subtotal - v_group - v_offer_discount,
      round((v_subtotal - v_group - v_offer_discount) * v_coupon.discount_pct / 100.0));
  end if;
  -- ON CONFLICT solo reintenta una colisión de código, sin ocultar otros errores.
  loop
    v_code := 'HT-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,5));
    insert into public.reservations(code,user_id,tour_id,tour_date_id,tour_type,pax,extras,
      subtotal,group_discount,coupon_code,coupon_discount,total,payment_method,adults,children,special_offer_id,offer_discount)
    values(v_code,auth.uid(),p_tour_id,v_slot.id,p_tour_type,p_pax,v_extras,
      v_subtotal,v_group,v_coupon.code,v_discount,v_subtotal-v_group-v_offer_discount-v_discount,p_payment_method,p_pax - p_children,p_children,p_offer_id,v_offer_discount)
    on conflict(code) do nothing returning * into v_res;
    exit when found;
  end loop;
  for v_passenger,v_i in select value, ordinality::int from jsonb_array_elements(p_passengers) with ordinality loop
    if nullif(btrim(v_passenger->>'name'),'') is null then raise exception 'invalid_passengers: nombre obligatorio'; end if;
    insert into public.booking_passengers(reservations_id,position,name,doc,country,meal,is_lead)
    values(v_res.id,v_i,btrim(v_passenger->>'name'),coalesce(v_passenger->>'doc',''),
      coalesce(v_passenger->>'country',''),coalesce(v_passenger->>'meal','Normal'),v_i=1);
  end loop;
  return jsonb_build_object('reservation',to_jsonb(v_res),'passengers',
    (select coalesce(jsonb_agg(to_jsonb(bp) order by position),'[]') from public.booking_passengers bp where reservations_id=v_res.id));
end $$;
revoke all on function public.create_booking(uuid,date,text,integer,jsonb,jsonb,text,text,uuid,uuid,integer) from public, anon;
grant execute on function public.create_booking(uuid,date,text,integer,jsonb,jsonb,text,text,uuid,uuid,integer) to authenticated;

-- El reporte devuelve las dos columnas almacenadas; sus totales y filtros no cambian.
-- CREATE OR REPLACE conserva los permisos existentes de admin_report_bookings.
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
        'adults', s.adults,
        'children', s.children,
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

notify pgrst, 'reload schema';
commit;
