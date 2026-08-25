-- Homeland Tours — RPC (RF-05, RF-06, RF-07, RF-09)
-- create_booking: única vía de creación de reservas; valida cupo y escribe en una sola
-- transacción con bloqueo de fila (invariante de no sobrevender, RF-05).

create or replace function public.create_booking(
  p_tour_id uuid,
  p_date date,
  p_tour_type text,
  p_pax integer,
  p_extras jsonb default '[]',
  p_passengers jsonb default '[]',
  p_coupon_code text default null,
  p_payment_method text default 'link'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_tour public.tours%rowtype;
  v_date public.tour_dates%rowtype;
  v_price numeric;
  v_extras_total numeric := 0;
  v_extras_resolved jsonb := '[]';
  v_subtotal numeric;
  v_group_rate numeric := 0;
  v_group_discount numeric;
  v_coupon public.coupons%rowtype;
  v_has_coupon boolean := false;
  v_coupon_discount numeric := 0;
  v_total numeric;
  v_code text;
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_res public.reservations%rowtype;
  v_occupied integer;
  v_extra_id text;
  v_pax jsonb;
  i integer;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  if p_pax is null or p_pax < 1 or p_pax > 8 then
    raise exception 'invalid_pax' using errcode = 'P0001';
  end if;
  if p_tour_type not in ('group', 'semi', 'private') then
    raise exception 'invalid_tour_type' using errcode = 'P0001';
  end if;
  if p_payment_method not in ('link', 'qr') then
    raise exception 'invalid_payment_method' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_passengers) <> 'array' or jsonb_array_length(p_passengers) < 1 then
    raise exception 'invalid_passengers' using errcode = 'P0001';
  end if;

  select * into v_tour from public.tours where id = p_tour_id for update;
  if not found then
    raise exception 'tour_not_found' using errcode = 'P0001';
  end if;
  if not v_tour.active then
    raise exception 'tour_inactive' using errcode = 'P0001';
  end if;

  select * into v_date
  from public.tour_dates
  where tour_id = p_tour_id and date = p_date
  for update;
  if not found then
    raise exception 'date_not_open' using errcode = 'P0001';
  end if;
  if v_date.date < current_date then
    raise exception 'date_past' using errcode = 'P0001';
  end if;

  select coalesce(sum(r.pax), 0) into v_occupied
  from public.reservations r
  where r.tour_date_id = v_date.id
    and r.status in ('pendiente_pago', 'confirmada');

  if v_date.capacity - v_occupied < p_pax then
    raise exception 'date_full: esta fecha no tiene cupo libre suficiente (% de % ocupado)',
      v_occupied, v_date.capacity using errcode = 'P0001';
  end if;

  if p_coupon_code is not null and btrim(p_coupon_code) <> '' then
    select * into v_coupon
    from public.coupons
    where code = upper(btrim(p_coupon_code))
      and active
      and (valid_from is null or current_date >= valid_from)
      and (valid_to is null or current_date <= valid_to)
    limit 1;
    if found then
      v_has_coupon := true;
    else
      raise exception 'coupon_invalid: el cupón no existe, está inactivo o venció' using errcode = 'P0001';
    end if;
  end if;

  case p_tour_type
    when 'group' then v_price := v_tour.price_group;
    when 'semi' then v_price := v_tour.price_semi;
    when 'private' then v_price := v_tour.price_private;
  end case;
  if v_price is null or v_price < 0 then
    raise exception 'tour_type_unavailable' using errcode = 'P0001';
  end if;

  -- Extras: solo los que existen en el tour y son de pago
  for i in 0 .. jsonb_array_length(p_extras) - 1 loop
    v_extra_id := p_extras -> i ->> 'id';
    if v_extra_id is null then
      continue;
    end if;
    if (
      select count(*)
      from jsonb_array_elements(v_tour.extras) e
      where e ->> 'id' = v_extra_id and e ->> 'kind' = 'paid'
    ) = 1 then
      v_extras_total := v_extras_total + (
        select (e ->> 'price')::numeric
        from jsonb_array_elements(v_tour.extras) e
        where e ->> 'id' = v_extra_id
      );
      v_extras_resolved := v_extras_resolved || (
        select jsonb_build_array(e)
        from jsonb_array_elements(v_tour.extras) e
        where e ->> 'id' = v_extra_id
      );
    end if;
  end loop;

  v_subtotal := v_price * p_pax + v_extras_total;
  if p_pax >= 5 then
    v_group_rate := 0.08;
  elsif p_pax >= 3 then
    v_group_rate := 0.05;
  end if;
  v_group_discount := round(v_subtotal * v_group_rate);
  v_coupon_discount := 0;
  if v_has_coupon then
    v_coupon_discount := round((v_subtotal - v_group_discount) * (v_coupon.discount_pct / 100.0));
  end if;
  v_total := v_subtotal - v_group_discount - v_coupon_discount;

  -- Código único HT-XXXXX
  loop
    v_code := 'HT-';
    for i in 1 .. 5 loop
      v_code := v_code || substr(v_chars, 1 + floor(random() * length(v_chars))::int, 1);
    end loop;
    exit when not exists (select 1 from public.reservations where code = v_code);
  end loop;

  insert into public.reservations (
    code, user_id, tour_id, tour_date_id, tour_type, pax, extras,
    subtotal, group_discount, coupon_code, coupon_discount, total,
    status, payment_method
  )
  values (
    v_code, v_user_id, p_tour_id, v_date.id, p_tour_type, p_pax, v_extras_resolved,
    v_subtotal, v_group_discount,
    case when v_has_coupon then upper(btrim(p_coupon_code)) else null end,
    v_coupon_discount, v_total,
    'pendiente_pago', p_payment_method
  )
  returning * into v_res;

  for i in 0 .. jsonb_array_length(p_passengers) - 1 loop
    v_pax := p_passengers -> i;
    insert into public.booking_passengers (reservations_id, position, name, doc, country, meal, is_lead)
    values (
      v_res.id,
      i + 1,
      coalesce(nullif(btrim(v_pax ->> 'name'), ''), 'Sin nombre'),
      coalesce(btrim(v_pax ->> 'doc'), ''),
      coalesce(btrim(v_pax ->> 'country'), ''),
      coalesce(nullif(btrim(v_pax ->> 'meal'), ''), 'Normal'),
      coalesce((v_pax ->> 'is_lead')::boolean, i = 0)
    );
  end loop;

  return jsonb_build_object(
    'reservation', to_jsonb(v_res),
    'passengers', (
      select coalesce(jsonb_agg(to_jsonb(bp) order by bp.position), '[]')
      from public.booking_passengers bp
      where bp.reservations_id = v_res.id
    )
  );
end;
$$;

revoke execute on function public.create_booking(uuid, date, text, integer, jsonb, jsonb, text, text) from anon;

-- Cambio de estado admin con auditoría (RF-09)
create or replace function public.update_reservation_status(
  p_reservation_id uuid,
  p_status text,
  p_cancellation_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_res public.reservations%rowtype;
  v_new public.reservations%rowtype;
begin
  if not public.is_admin() then
    raise exception 'forbidden: solo el admin cambia estados de reservas' using errcode = '42501';
  end if;
  if p_status not in ('pendiente_pago', 'confirmada', 'completada', 'cancelada') then
    raise exception 'invalid_status' using errcode = 'P0001';
  end if;

  select * into v_res from public.reservations where id = p_reservation_id for update;
  if not found then
    raise exception 'reservation_not_found' using errcode = 'P0001';
  end if;

  if p_status = 'confirmada' and v_res.status = 'pendiente_pago' then
    update public.reservations
       set status = 'confirmada', paid_at = now()
     where id = p_reservation_id
     returning * into v_new;
  elsif p_status = 'completada' and v_res.status = 'confirmada' then
    update public.reservations
       set status = 'completada', completed_at = now()
     where id = p_reservation_id
     returning * into v_new;
  elsif p_status = 'cancelada' and v_res.status in ('pendiente_pago', 'confirmada') then
    if p_cancellation_reason is null or btrim(p_cancellation_reason) = '' then
      raise exception 'cancellation_reason_required' using errcode = 'P0001';
    end if;
    update public.reservations
       set status = 'cancelada',
           cancelled_at = now(),
           cancellation_reason = btrim(p_cancellation_reason),
           refund_pending = (v_res.status = 'confirmada')
     where id = p_reservation_id
     returning * into v_new;
  else
    raise exception 'invalid_transition: % -> %', v_res.status, p_status using errcode = 'P0001';
  end if;

  insert into public.audit_log (admin_id, entity, entity_id, action, before, after)
  values (
    auth.uid(),
    'reservations',
    p_reservation_id::text,
    'status_change',
    jsonb_build_object('status', v_res.status, 'paid_at', v_res.paid_at),
    jsonb_build_object(
      'status', v_new.status,
      'paid_at', v_new.paid_at,
      'cancelled_at', v_new.cancelled_at,
      'completed_at', v_new.completed_at,
      'cancellation_reason', v_new.cancellation_reason,
      'refund_pending', v_new.refund_pending
    )
  );

  return jsonb_build_object('reservation', to_jsonb(v_new));
end;
$$;

-- Validación de cupón para el checkout (lectura pública)
create or replace function public.validate_coupon(p_code text)
returns jsonb
language sql
stable
as $$
  select coalesce(
    (
      select jsonb_build_object(
        'code', c.code,
        'discount_pct', c.discount_pct,
        'valid', true
      )
      from public.coupons c
      where c.code = upper(btrim(coalesce(p_code, '')))
        and c.active
        and (c.valid_from is null or current_date >= c.valid_from)
        and (c.valid_to is null or current_date <= c.valid_to)
      limit 1
    ),
    jsonb_build_object('code', upper(btrim(coalesce(p_code, ''))), 'valid', false)
  );
$$;
