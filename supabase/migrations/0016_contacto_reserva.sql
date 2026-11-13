-- CC-HT8E: contacto del reservante en reservas web y relleno histórico.
-- Conserva precios, descuentos, cupos y reparto de adultos/niños de 0015.
-- Los dos parámetros opcionales mantienen compatibles las llamadas anteriores.
-- Nombre normalizado (también el suplente): hasta 120 caracteres; teléfono: 40.
begin;

-- Una sola firma en PostgREST; CREATE OR REPLACE hace repetible la nueva.
drop function if exists public.create_booking(uuid,date,text,integer,jsonb,jsonb,text,text,uuid,uuid,integer);

create or replace function public.create_booking(
  p_tour_id uuid, p_date date, p_tour_type text, p_pax integer,
  p_extras jsonb default '[]', p_passengers jsonb default '[]',
  p_coupon_code text default null, p_payment_method text default 'link',
  p_tour_date_id uuid default null, p_offer_id uuid default null, p_children int default 0,
  p_contact_name text default null, p_contact_phone text default null
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
  if char_length(coalesce(nullif(btrim(p_contact_name),''),nullif(btrim(p_passengers->0->>'name'),''))) > 120
    or char_length(btrim(p_contact_phone)) > 40 then
    raise exception 'invalid_contact: el nombre admite hasta 120 caracteres y el teléfono hasta 40';
  end if;
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
      subtotal,group_discount,coupon_code,coupon_discount,total,payment_method,adults,children,special_offer_id,offer_discount,
      contact_name,contact_phone,contact_email,contact_country)
    values(v_code,auth.uid(),p_tour_id,v_slot.id,p_tour_type,p_pax,v_extras,
      v_subtotal,v_group,v_coupon.code,v_discount,v_subtotal-v_group-v_offer_discount-v_discount,p_payment_method,p_pax - p_children,p_children,p_offer_id,v_offer_discount,
      coalesce(nullif(btrim(p_contact_name),''),nullif(btrim(p_passengers->0->>'name'),'')),
      nullif(btrim(p_contact_phone),''),
      (select u.email from auth.users u where u.id=auth.uid()),
      nullif(btrim(p_passengers->0->>'country'),''))
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
revoke all on function public.create_booking(uuid,date,text,integer,jsonb,jsonb,text,text,uuid,uuid,integer,text,text) from public, anon;
grant execute on function public.create_booking(uuid,date,text,integer,jsonb,jsonb,text,text,uuid,uuid,integer,text,text) to authenticated;

-- Completa únicamente contactos NULL de reservas web con usuario.
-- La guarda de 0011 rechaza cambios de contacto sin una sesión admin incluso
-- al migrar. El bloqueo impide escrituras concurrentes mientras se suspende
-- SOLO esa guarda; se conservan auditoría, cupos, estados, ofertas y RLS.
-- Su modo original se restaura antes de COMMIT; un error revierte todo el bloque.
do $backfill$
declare
  v_phone_sql text := 'null::text';
  v_guard_mode "char";
begin
  lock table public.reservations in share row exclusive mode;
  select t.tgenabled into v_guard_mode
    from pg_trigger t
    where t.tgrelid='public.reservations'::regclass
      and t.tgname='reservations_fields_guard' and not t.tgisinternal;
  if v_guard_mode in ('O','R','A') then
    alter table public.reservations disable trigger reservations_fields_guard;
  end if;

  -- SQL dinámico: la ausencia de profiles.phone no impide el resto del relleno.
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='profiles' and column_name='phone'
  ) then
    v_phone_sql := $phone$nullif(btrim(p.phone),'')$phone$;
  end if;

  execute format($fill$
    with contacts as (
      select r.id,
        coalesce(r.contact_name,nullif(btrim(lead.name),'')) as contact_name,
        coalesce(r.contact_phone,%s) as contact_phone,
        coalesce(r.contact_email,nullif(btrim(u.email),'')) as contact_email,
        coalesce(r.contact_country,nullif(btrim(lead.country),'')) as contact_country
      from public.reservations r
      left join auth.users u on u.id=r.user_id
      left join public.profiles p on p.id=r.user_id
      left join lateral (
        select bp.name,bp.country from public.booking_passengers bp
        where bp.reservations_id=r.id
        order by bp.is_lead desc,bp.position,bp.id limit 1
      ) lead on true
      where r.source='web' and r.user_id is not null
        and (r.contact_name is null or r.contact_phone is null
          or r.contact_email is null or r.contact_country is null)
    )
    update public.reservations r
      set contact_name=c.contact_name,contact_phone=c.contact_phone,
        contact_email=c.contact_email,contact_country=c.contact_country
      from contacts c
      where r.id=c.id
        and (r.contact_name,r.contact_phone,r.contact_email,r.contact_country)
          is distinct from (c.contact_name,c.contact_phone,c.contact_email,c.contact_country)
  $fill$,v_phone_sql);

  -- Conserva también configuraciones previas REPLICA, ALWAYS o deshabilitadas.
  if v_guard_mode='O' then
    alter table public.reservations enable trigger reservations_fields_guard;
  elsif v_guard_mode='R' then
    alter table public.reservations enable replica trigger reservations_fields_guard;
  elsif v_guard_mode='A' then
    alter table public.reservations enable always trigger reservations_fields_guard;
  end if;
end;
$backfill$;

notify pgrst, 'reload schema';
commit;
