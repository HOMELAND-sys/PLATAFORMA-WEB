-- 0020 · La reserva manual del panel usa el mismo precio que la web.
--
-- admin_create_manual_booking calculaba el importe con el precio fijo de la
-- modalidad. Desde 0018 un tour puede tener precio por tamaño de grupo
-- (tours.price_tiers): se aplica aquí la misma regla que en create_booking.
--   · precio por persona = tramo que corresponde al número de viajeros
--   · tarifa infantil = la menor entre price_child y el precio del tramo
--   · con tramos no se suma el descuento general por grupo
-- La firma no cambia; p_total sigue permitiendo fijar el importe a mano.
begin;

create or replace function public.admin_create_manual_booking(
  p_slot_id uuid, p_tour_type text, p_adults integer, p_children integer,
  p_contact_name text, p_contact_phone text, p_contact_country text, p_passengers jsonb,
  p_source text default 'oficina', p_agency_id uuid default null, p_contact_email text default null,
  p_total numeric default null, p_paid boolean default false,
  p_payment_method text default 'efectivo', p_notes text default null
) returns jsonb language plpgsql security definer set search_path = public as $function$
declare
  v_slot public.tour_dates%rowtype; v_tour public.tours%rowtype; v_res public.reservations%rowtype;
  v_pax int := p_adults+p_children; v_base numeric; v_price numeric; v_child_price numeric;
  v_tiered boolean; v_subtotal numeric; v_group numeric;
  v_passenger jsonb; v_i int; v_code text;
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode='42501'; end if;
  if p_adults is null or p_children is null or p_adults < 0 or p_children < 0 or v_pax not between 1 and 8 then raise exception 'invalid_pax: entre 1 y 8 participantes'; end if;
  if p_source is null or p_source not in ('oficina','whatsapp','agencia','gyg','otro') then raise exception 'invalid_source'; end if;
  if p_source = 'agencia' and p_agency_id is null then raise exception 'agency_required'; end if;
  if p_agency_id is not null and not exists(select 1 from public.agencies where id=p_agency_id and active) then raise exception 'agency_inactive'; end if;
  if nullif(btrim(p_contact_name),'') is null or nullif(btrim(p_contact_phone),'') is null or nullif(btrim(p_contact_country),'') is null then raise exception 'contact_required'; end if;
  if p_tour_type is null or p_tour_type not in ('group','semi','private') then raise exception 'invalid_tour_type'; end if;
  if p_payment_method is null or p_payment_method not in ('efectivo','transferencia','qr','link') then raise exception 'invalid_payment_method'; end if;
  if p_total is not null and (p_total < 0 or p_total > 99999999.99 or p_total::text in ('NaN','Infinity','-Infinity')) then raise exception 'invalid_total'; end if;
  if p_passengers is null or jsonb_typeof(p_passengers) <> 'array' then raise exception 'invalid_passengers'; end if;
  if jsonb_array_length(p_passengers) <> v_pax then raise exception 'invalid_passengers: debe registrar a todos'; end if;
  -- Orden de bloqueo consistente con create_booking: tour, luego franja.
  select t.* into v_tour from public.tours t join public.tour_dates d on d.tour_id=t.id where d.id=p_slot_id for share of t;
  if not found or not v_tour.active then raise exception 'tour_inactive'; end if;
  if v_pax < v_tour.min_pax then raise exception 'invalid_pax: mínimo %',v_tour.min_pax; end if;
  select * into v_slot from public.tour_dates where id=p_slot_id for update;
  if not found then raise exception 'date_not_open'; end if;
  if v_slot.blocked then raise exception 'slot_blocked'; end if;
  if now() >= ((v_slot.date+coalesce(v_slot.start_time,time '00:00')) at time zone 'America/La_Paz')
    - make_interval(hours=>coalesce(v_slot.cutoff_hours,v_tour.default_cutoff_hours)) then raise exception 'cutoff_passed'; end if;
  case p_tour_type when 'group' then v_base:=v_tour.price_group;
    when 'semi' then v_base:=v_tour.price_semi; else v_base:=v_tour.price_private; end case;
  if v_base is null or v_base < 0 then raise exception 'tour_type_unavailable'; end if;
  -- Misma regla que la reserva web: el tramo manda y sustituye al descuento de grupo.
  v_tiered := jsonb_typeof(v_tour.price_tiers->p_tour_type) = 'array'
    and jsonb_array_length(v_tour.price_tiers->p_tour_type) > 0;
  v_price := public.tour_unit_price(v_tour.price_tiers, p_tour_type, v_base, v_pax);
  v_child_price := case when v_tour.price_child is not null and p_children > 0
    then least(v_tour.price_child, v_price) else v_price end;
  v_subtotal := v_price*p_adults + v_child_price*p_children;
  v_group := case when v_tiered then 0
    else round(v_subtotal*case when v_pax>=5 then .08 when v_pax>=3 then .05 else 0 end) end;
  loop
    v_code := 'HT-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,5));
    insert into public.reservations(code,tour_id,tour_date_id,tour_type,pax,adults,children,
      subtotal,group_discount,total,status,paid_at,payment_method,source,agency_id,
      contact_name,contact_email,contact_phone,contact_country,internal_notes,created_by)
    values(v_code,v_tour.id,v_slot.id,p_tour_type,v_pax,p_adults,p_children,v_subtotal,v_group,
      coalesce(p_total,v_subtotal-v_group),case when p_paid then 'confirmada' else 'pendiente_pago' end,
      case when p_paid then now() end,p_payment_method,p_source,p_agency_id,
      btrim(p_contact_name),nullif(btrim(p_contact_email),''),btrim(p_contact_phone),btrim(p_contact_country),p_notes,auth.uid())
    on conflict(code) do nothing returning * into v_res;
    exit when found;
  end loop;
  for v_passenger,v_i in select value,ordinality::int from jsonb_array_elements(p_passengers) with ordinality loop
    if nullif(btrim(v_passenger->>'name'),'') is null then raise exception 'invalid_passengers: nombre obligatorio'; end if;
    insert into public.booking_passengers(reservations_id,position,name,doc,country,meal,is_lead)
    values(v_res.id,v_i,btrim(v_passenger->>'name'),coalesce(v_passenger->>'doc',''),
      coalesce(v_passenger->>'country',p_contact_country),coalesce(v_passenger->>'meal','Normal'),v_i=1);
  end loop;
  return to_jsonb(v_res);
end $function$;

commit;
