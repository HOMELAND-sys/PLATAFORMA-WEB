-- CC-HT7A · Producto completo. PostgreSQL 15. Revisar y aplicar manualmente.
-- No cambia precios históricos: las reservas siguen expresadas en USD;
-- los movimientos entre agencias usan su propia moneda (BOB por defecto).
begin;

alter table public.tours
  add column if not exists rating numeric(2,1),
  add column if not exists review_count int not null default 0,
  add column if not exists languages text[] not null default '{Español,English}',
  add column if not exists free_cancellation_hours int not null default 24,
  add column if not exists pay_later boolean not null default false,
  add column if not exists pickup_included boolean not null default false,
  add column if not exists meeting_point text not null default '',
  add column if not exists meeting_lat numeric(9,6),
  add column if not exists meeting_lng numeric(9,6),
  add column if not exists price_child numeric(10,2),
  add column if not exists child_age_max int not null default 11,
  add column if not exists min_pax int not null default 1,
  add column if not exists default_start_times text[] not null default '{}',
  add column if not exists default_cutoff_hours int not null default 12,
  add column if not exists code text;
create unique index if not exists tours_code_key on public.tours(code);

alter table public.tour_dates
  add column if not exists start_time time,
  add column if not exists blocked boolean not null default false,
  add column if not exists cutoff_hours int,
  add column if not exists notes text;
alter table public.tour_dates drop constraint if exists tour_dates_tour_id_date_key;
-- Sin hora y medianoche representan la misma salida; nunca se duplican.
create unique index if not exists tour_dates_slot_key
  on public.tour_dates(tour_id, date, (coalesce(start_time, time '00:00')));

create table if not exists public.agencies (
  id uuid primary key default gen_random_uuid(),
  company text not null check (btrim(company) <> ''),
  contact text not null default '',
  phone text not null default '',
  other_contacts jsonb not null default '[]' check (jsonb_typeof(other_contacts) = 'array'),
  address text not null default '',
  company_type text not null default 'agencia'
    check (company_type in ('operadora','agencia','hotel','otro')),
  email text not null default '',
  notes text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.reservations alter column user_id drop not null;
alter table public.reservations
  add column if not exists source text not null default 'web',
  add column if not exists agency_id uuid references public.agencies(id) on delete restrict,
  add column if not exists contact_name text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists contact_country text,
  add column if not exists adults int,
  add column if not exists children int not null default 0,
  add column if not exists internal_notes text,
  add column if not exists checked_in_at timestamptz,
  add column if not exists voucher_sent_at timestamptz,
  add column if not exists created_by uuid references public.profiles(id) on delete set null;
alter table public.reservations drop constraint if exists reservations_payment_method_check;
alter table public.reservations add constraint reservations_payment_method_check
  check (payment_method in ('link','qr','efectivo','transferencia'));

-- Restricciones nombradas para permitir una segunda ejecución sin duplicarlas.
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.tours'::regclass and conname = 'tours_operation_check') then
    alter table public.tours add constraint tours_operation_check check (
      (rating is null or rating between 0 and 5) and review_count >= 0
      and free_cancellation_hours >= 0 and default_cutoff_hours >= 0
      and min_pax between 1 and 8 and child_age_max between 0 and 17
      and (price_child is null or price_child >= 0)
      and (meeting_lat is null or meeting_lat between -90 and 90)
      and (meeting_lng is null or meeting_lng between -180 and 180));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.tour_dates'::regclass and conname = 'tour_dates_cutoff_check') then
    alter table public.tour_dates add constraint tour_dates_cutoff_check check (cutoff_hours is null or cutoff_hours >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.reservations'::regclass and conname = 'reservations_source_check') then
    alter table public.reservations add constraint reservations_source_check check (source in ('web','oficina','whatsapp','agencia','gyg','otro'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.reservations'::regclass and conname = 'reservations_party_check') then
    alter table public.reservations add constraint reservations_party_check check (
      children >= 0 and (adults is null or (adults >= 0 and adults + children = pax)));
  end if;
end $$;

create table if not exists public.agency_transfers (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('pase','endoso')),
  agency_id uuid not null references public.agencies(id) on delete restrict,
  reservation_id uuid references public.reservations(id) on delete set null,
  travel_date date not null,
  tour_id uuid references public.tours(id) on delete set null,
  service text not null check (btrim(service) <> ''),
  pax int not null check (pax >= 1),
  names text not null default '',
  amount numeric(10,2) not null check (amount >= 0),
  currency text not null default 'BOB' check (currency in ('BOB','USD')),
  status text not null default 'pendiente' check (status in ('pendiente','pagado')),
  paid_at timestamptz,
  notes text not null default '',
  created_at timestamptz not null default now()
);
comment on table public.agency_transfers is 'Pase: agencia nos debe; endoso: nosotros debemos al operador.';

create table if not exists public.special_offers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  tour_ids uuid[] not null check (cardinality(tour_ids) > 0),
  kind text not null check (kind in ('limited','early_bird','last_minute')),
  discount_pct int not null check (discount_pct between 1 and 90),
  activity_from date not null,
  activity_to date not null check (activity_to >= activity_from),
  weekdays smallint[] check (weekdays is null or (cardinality(weekdays) > 0 and weekdays <@ array[0,1,2,3,4,5,6]::smallint[])),
  start_times text[],
  booking_notice_days int,
  seats_limit int check (seats_limit is null or seats_limit >= 1),
  seats_sold int not null default 0 check (seats_sold >= 0),
  status text not null default 'active' check (status in ('active','paused')),
  created_at timestamptz not null default now(),
  check (kind = 'limited' or booking_notice_days >= 1 and booking_notice_days is not null),
  check (seats_limit is null or seats_sold <= seats_limit)
);
create index if not exists idx_reservations_agency on public.reservations(agency_id);
create index if not exists idx_reservations_created_by on public.reservations(created_by);
create index if not exists idx_transfers_agency_date on public.agency_transfers(agency_id,travel_date);
create index if not exists idx_transfers_kind_date on public.agency_transfers(kind,travel_date);
create index if not exists idx_transfers_reservation on public.agency_transfers(reservation_id);
create index if not exists idx_transfers_tour on public.agency_transfers(tour_id);
create index if not exists idx_offers_tours on public.special_offers using gin(tour_ids);

-- Contrato opcional para el checkout renovado: al enviar p_offer_id se aplica
-- el descuento en servidor y se contabilizan sus plazas en la misma transacción.
-- Las llamadas antiguas sin oferta mantienen exactamente sus reglas de precio.
alter table public.reservations
  add column if not exists special_offer_id uuid references public.special_offers(id) on delete set null,
  add column if not exists offer_discount numeric(10,2) not null default 0 check (offer_discount >= 0);
create index if not exists idx_reservations_offer on public.reservations(special_offer_id);

alter table public.agencies enable row level security;
alter table public.agency_transfers enable row level security;
alter table public.special_offers enable row level security;
drop policy if exists agencies_admin on public.agencies;
create policy agencies_admin on public.agencies for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists transfers_admin on public.agency_transfers;
create policy transfers_admin on public.agency_transfers for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists offers_admin on public.special_offers;
create policy offers_admin on public.special_offers for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists offers_public_active on public.special_offers;
create policy offers_public_active on public.special_offers for select to anon, authenticated
  using (status = 'active' and activity_to >= (now() at time zone 'America/La_Paz')::date
    and activity_from <= (now() at time zone 'America/La_Paz')::date
    and (seats_limit is null or seats_sold < seats_limit));
revoke all on public.agencies, public.agency_transfers from anon;
grant select, insert, update, delete on public.agencies, public.agency_transfers, public.special_offers to authenticated;
grant select on public.special_offers to anon;

-- Esta vista pública conserva las primeras seis columnas y sus tipos (bigint).
-- Ejecuta como propietario SOLO para sumar ocupación de todas las reservas:
-- security_invoker ocultaría las ajenas por RLS y publicaría cupos incorrectos.
-- No expone identidades ni reservas individuales; las tablas mantienen RLS.
create or replace view public.v_tour_dates_free
with (security_barrier = true, security_invoker = false) as
select td.id, td.tour_id, td.date, td.capacity,
  coalesce(occ.occupied,0::bigint) as occupied,
  td.capacity - coalesce(occ.occupied,0::bigint) as free,
  td.start_time, td.blocked,
  coalesce(td.cutoff_hours,t.default_cutoff_hours) as cutoff_hours,
  (t.active and not td.blocked and td.capacity > coalesce(occ.occupied,0)
    and now() < ((td.date + coalesce(td.start_time,time '00:00')) at time zone 'America/La_Paz')
      - make_interval(hours => coalesce(td.cutoff_hours,t.default_cutoff_hours))) as bookable,
  coalesce(occ.occupied,0::bigint) as booked
from public.tour_dates td join public.tours t on t.id = td.tour_id
left join lateral (
  select sum(r.pax) as occupied from public.reservations r
  where r.tour_date_id = td.id and r.status in ('pendiente_pago','confirmada')
) occ on true;
grant select on public.v_tour_dates_free to anon, authenticated;

create or replace function public.guard_tour_date_capacity()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_occupied int;
begin
  if new.capacity is distinct from old.capacity then
    select coalesce(sum(pax),0) into v_occupied from public.reservations
      where tour_date_id = new.id and status in ('pendiente_pago','confirmada');
    if new.capacity < v_occupied then
      raise exception 'capacity_below_occupied: hay % participantes reservados; el cupo no puede ser menor',v_occupied;
    end if;
  end if;
  return new;
end $$;

-- La ocupación conserva los estados de 0001: pendiente_pago y confirmada.
-- Cancelar o completar libera plazas; completada permanece en el historial y
-- en las plazas de oferta vendidas, pero no en la ocupación operativa.
-- El bloqueo se conserva también al liberar plazas para serializar la reserva
-- concurrente con una cancelación/completado.
create or replace function public.guard_reservation_capacity()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_slot public.tour_dates%rowtype; v_occupied int;
begin
  if tg_op = 'UPDATE' then
    if new.tour_id = old.tour_id and new.tour_date_id = old.tour_date_id and new.pax = old.pax and new.status = old.status then return new; end if;
  end if;
  select * into v_slot from public.tour_dates where id = new.tour_date_id for update;
  if not found or v_slot.tour_id <> new.tour_id then raise exception 'invalid_slot: franja y producto no coinciden'; end if;
  if new.status in ('pendiente_pago','confirmada') then
    select coalesce(sum(pax),0) into v_occupied from public.reservations
      where tour_date_id = new.tour_date_id and id <> new.id
        and status in ('pendiente_pago','confirmada');
    if v_occupied + new.pax > v_slot.capacity then raise exception 'date_full: cupo insuficiente'; end if;
  end if;
  return new;
end $$;
drop trigger if exists reservations_capacity_guard on public.reservations;
create trigger reservations_capacity_guard before insert or update on public.reservations
  for each row execute function public.guard_reservation_capacity();

-- Solo permite la cancelación propia y los cuatro campos que la RPC legítima
-- modifica. El trigger de estado determina refund_pending y cancelled_at;
-- permitir comparar esos campos no permite falsear un reembolso o su fecha.
-- Importes, titular, franja, canal, check-in y marcas de pago/voucher se protegen.
create or replace function public.guard_reservation_fields()
returns trigger language plpgsql set search_path = public as $$
begin
  if not public.is_admin() and (
    auth.uid() is null or old.user_id is distinct from auth.uid()
    or old.status not in ('pendiente_pago','confirmada') or new.status <> 'cancelada' or
    (to_jsonb(new) - array['status','cancellation_reason','cancelled_at','refund_pending']) is distinct from
    (to_jsonb(old) - array['status','cancellation_reason','cancelled_at','refund_pending'])) then
    raise exception 'forbidden: solo administración puede modificar estos campos' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists reservations_fields_guard on public.reservations;
create trigger reservations_fields_guard before update on public.reservations
  for each row execute function public.guard_reservation_fields();

-- Sustituye la guarda de 0001 sin editar la migración histórica. Solo el dueño
-- puede autocancelar pendientes/confirmadas; confirmar pago/completar sigue
-- reservado a administración. Los cambios financieros ajenos siguen prohibidos.
create or replace function public.guard_reservation_status()
returns trigger language plpgsql set search_path=public as $$
begin
  if old.status is not distinct from new.status then return new; end if;
  if not public.is_admin() and auth.uid()=old.user_id
    and old.status in ('pendiente_pago','confirmada') and new.status='cancelada' then
    new.cancelled_at:=now();
    new.refund_pending:=(old.status='confirmada');
    new.cancellation_reason:=coalesce(nullif(btrim(new.cancellation_reason),''),'Cancelada por el cliente');
    return new;
  end if;
  if public.is_admin() then
    if new.status='confirmada' and old.status='pendiente_pago' then
      new.paid_at:=coalesce(new.paid_at,now()); return new;
    end if;
    if new.status='completada' and old.status='confirmada' then
      new.completed_at:=coalesce(new.completed_at,now()); return new;
    end if;
    if new.status='cancelada' and old.status in ('pendiente_pago','confirmada') then
      if nullif(btrim(new.cancellation_reason),'') is null then raise exception 'cancellation_reason_required'; end if;
      new.cancelled_at:=coalesce(new.cancelled_at,now());
      new.refund_pending:=(old.status='confirmada'); return new;
    end if;
    raise exception 'invalid_transition: % -> %',old.status,new.status;
  end if;
  raise exception 'not_authorized_to_change_status' using errcode='42501';
end $$;

-- La RPC de 0003 era solo admin: el autoservicio permite exclusivamente cancelar
-- la reserva del usuario autenticado. Los demás estados conservan control admin.
create or replace function public.update_reservation_status(
  p_reservation_id uuid,p_status text,p_cancellation_reason text default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_res public.reservations%rowtype; v_new public.reservations%rowtype;
  v_admin bool:=public.is_admin();
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  if p_status is null or p_status not in ('confirmada','completada','cancelada') then raise exception 'invalid_status'; end if;
  if not v_admin and p_status<>'cancelada' then raise exception 'forbidden' using errcode='42501'; end if;
  select * into v_res from public.reservations
    where id=p_reservation_id and (v_admin or user_id=auth.uid()) for update;
  if not found then raise exception 'reservation_not_found'; end if;
  if p_status='confirmada' and v_res.status='pendiente_pago' then
    update public.reservations set status='confirmada',paid_at=now()
      where id=v_res.id returning * into v_new;
  elsif p_status='completada' and v_res.status='confirmada' then
    update public.reservations set status='completada',completed_at=now()
      where id=v_res.id returning * into v_new;
  elsif p_status='cancelada' and v_res.status in ('pendiente_pago','confirmada') then
    if v_admin and nullif(btrim(p_cancellation_reason),'') is null then raise exception 'cancellation_reason_required'; end if;
    update public.reservations set status='cancelada',cancelled_at=now(),
      cancellation_reason=coalesce(nullif(btrim(p_cancellation_reason),''),'Cancelada por el cliente'),
      refund_pending=(v_res.status='confirmada') where id=v_res.id returning * into v_new;
  else
    raise exception 'invalid_transition: % -> %',v_res.status,p_status;
  end if;
  insert into public.audit_log(admin_id,entity,entity_id,action,before,after)
    values(auth.uid(),'reservations',v_res.id::text,'status_change',to_jsonb(v_res),to_jsonb(v_new));
  return jsonb_build_object('reservation',to_jsonb(v_new));
end $$;

-- Una sola firma en PostgREST: elimina las variantes históricas de 8 y 9 args.
-- Los dos parámetros nuevos son opcionales; el checkout actual sigue enviando 8.
-- Sin p_tour_date_id se elige la primera franja reservable con cupo suficiente.
drop function if exists public.create_booking(uuid,date,text,integer,jsonb,jsonb,text,text);
drop function if exists public.create_booking(uuid,date,text,integer,jsonb,jsonb,text,text,uuid);
create or replace function public.create_booking(
  p_tour_id uuid, p_date date, p_tour_type text, p_pax integer,
  p_extras jsonb default '[]', p_passengers jsonb default '[]',
  p_coupon_code text default null, p_payment_method text default 'link',
  p_tour_date_id uuid default null, p_offer_id uuid default null
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
      subtotal,group_discount,coupon_code,coupon_discount,total,payment_method,adults,special_offer_id,offer_discount)
    values(v_code,auth.uid(),p_tour_id,v_slot.id,p_tour_type,p_pax,v_extras,
      v_subtotal,v_group,v_coupon.code,v_discount,v_subtotal-v_group-v_offer_discount-v_discount,p_payment_method,p_pax,p_offer_id,v_offer_discount)
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
revoke all on function public.create_booking(uuid,date,text,integer,jsonb,jsonb,text,text,uuid,uuid) from public, anon;
grant execute on function public.create_booking(uuid,date,text,integer,jsonb,jsonb,text,text,uuid,uuid) to authenticated;

-- Reserva de oficina: mismo bloqueo de fila e invariante de cupos que la web.
-- Respeta bloqueo y hora límite; el admin puede actualizar la franja previamente.
create or replace function public.admin_create_manual_booking(
  p_slot_id uuid, p_tour_type text, p_adults int, p_children int,
  p_contact_name text, p_contact_phone text, p_contact_country text,
  p_passengers jsonb, p_source text default 'oficina', p_agency_id uuid default null,
  p_contact_email text default null, p_total numeric default null,
  p_paid boolean default false, p_payment_method text default 'efectivo', p_notes text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_slot public.tour_dates%rowtype; v_tour public.tours%rowtype; v_res public.reservations%rowtype;
  v_pax int := p_adults+p_children; v_price numeric; v_subtotal numeric; v_group numeric;
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
  case p_tour_type when 'group' then v_price:=v_tour.price_group;
    when 'semi' then v_price:=v_tour.price_semi; else v_price:=v_tour.price_private; end case;
  if v_price is null or v_price < 0 then raise exception 'tour_type_unavailable'; end if;
  v_subtotal := v_price*p_adults + coalesce(v_tour.price_child,v_price)*p_children;
  v_group := round(v_subtotal*case when v_pax>=5 then .08 when v_pax>=3 then .05 else 0 end);
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
end $$;

create or replace function public.admin_bulk_update_slots(
  p_ids uuid[], p_blocked bool default null, p_capacity int default null, p_cutoff int default null
) returns int language plpgsql security definer set search_path=public as $$
declare v_count int;
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode='42501'; end if;
  if coalesce(cardinality(p_ids),0)=0 then raise exception 'slots_required'; end if;
  if array_position(p_ids,null) is not null then raise exception 'invalid_slots'; end if;
  if p_capacity < 1 or p_cutoff < 0 then raise exception 'invalid_capacity_or_cutoff'; end if;
  -- Orden estable para ediciones masivas concurrentes; todo o nada por transacción.
  perform id from public.tour_dates where id=any(p_ids) order by id for update;
  select count(*) into v_count from public.tour_dates where id=any(p_ids);
  if v_count <> cardinality(p_ids) then raise exception 'invalid_slots: actualice la selección'; end if;
  update public.tour_dates set blocked=coalesce(p_blocked,blocked),
    capacity=coalesce(p_capacity,capacity),cutoff_hours=coalesce(p_cutoff,cutoff_hours) where id=any(p_ids);
  get diagnostics v_count=row_count;
  return v_count;
end $$;

create or replace function public.admin_generate_slots(
  p_tour_id uuid,p_from date,p_to date,p_weekdays int[],p_start_times text[],p_capacity int,p_cutoff int default null
) returns int language plpgsql security definer set search_path=public as $$
declare v_count int;
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode='42501'; end if;
  if p_from is null or p_to is null or p_to<p_from or p_to-p_from>366 then raise exception 'invalid_range: máximo 367 días'; end if;
  if p_capacity is null or p_capacity<1 or p_cutoff<0 then raise exception 'invalid_capacity_or_cutoff'; end if;
  if coalesce(cardinality(p_weekdays),0)=0 or not p_weekdays <@ array[0,1,2,3,4,5,6] then raise exception 'invalid_weekdays'; end if;
  if coalesce(cardinality(p_start_times),0)=0 or cardinality(p_start_times)>24 then raise exception 'invalid_start_times'; end if;
  if exists(select 1 from unnest(p_start_times) t where t is null or t !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$') then raise exception 'invalid_start_times: use HH:MM'; end if;
  if not exists(select 1 from public.tours where id=p_tour_id) then raise exception 'tour_not_found'; end if;
  insert into public.tour_dates(tour_id,date,start_time,capacity,cutoff_hours)
  select p_tour_id,p_from+g.n,t::time,p_capacity,p_cutoff
    from generate_series(0,p_to-p_from) g(n) cross join (select distinct unnest(p_start_times) as t) times
    where extract(dow from p_from+g.n)::int=any(p_weekdays)
    on conflict do nothing;
  get diagnostics v_count=row_count;
  return v_count;
end $$;

create or replace function public.admin_check_in(p_code text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_res public.reservations%rowtype; v_day date;
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode='42501'; end if;
  select * into v_res from public.reservations where code=upper(btrim(p_code)) for update;
  if not found then raise exception 'ticket_not_found: código no encontrado'; end if;
  if v_res.status='cancelada' then raise exception 'ticket_cancelled: reserva cancelada'; end if;
  if v_res.checked_in_at is not null then raise exception 'ticket_used: ticket ya utilizado'; end if;
  if v_res.status='completada' then raise exception 'ticket_used: el viaje ya fue completado'; end if;
  select date into v_day from public.tour_dates where id=v_res.tour_date_id;
  if v_day<>(now() at time zone 'America/La_Paz')::date then raise exception 'ticket_other_date: corresponde a otra fecha'; end if;
  if v_res.status<>'confirmada' then raise exception 'ticket_unpaid: debe confirmar el pago antes del check-in'; end if;
  update public.reservations set checked_in_at=now() where id=v_res.id returning * into v_res;
  return to_jsonb(v_res);
end $$;

-- Fechas de pago coherentes incluso al editar el estado desde una tabla.
create or replace function public.touch_transfer_payment()
returns trigger language plpgsql as $$ begin
  new.paid_at := case when new.status='pagado' then coalesce(new.paid_at,now()) else null end;
  return new;
end $$;
drop trigger if exists transfers_payment on public.agency_transfers;
create trigger transfers_payment before insert or update on public.agency_transfers
  for each row execute function public.touch_transfer_payment();
drop trigger if exists agencies_audit on public.agencies;
create trigger agencies_audit after insert or update or delete on public.agencies for each row execute function public.audit_write_uuid();
drop trigger if exists transfers_audit on public.agency_transfers;
create trigger transfers_audit after insert or update or delete on public.agency_transfers for each row execute function public.audit_write_uuid();
drop trigger if exists offers_audit on public.special_offers;
create trigger offers_audit after insert or update or delete on public.special_offers for each row execute function public.audit_write_uuid();
drop trigger if exists reservations_audit on public.reservations;
create trigger reservations_audit after insert or update or delete on public.reservations for each row execute function public.audit_write_uuid();

revoke all on function public.admin_create_manual_booking(uuid,text,int,int,text,text,text,jsonb,text,uuid,text,numeric,bool,text,text) from public,anon;
revoke all on function public.admin_bulk_update_slots(uuid[],bool,int,int) from public,anon;
revoke all on function public.admin_generate_slots(uuid,date,date,int[],text[],int,int) from public,anon;
revoke all on function public.admin_check_in(text) from public,anon;
grant execute on function public.admin_create_manual_booking(uuid,text,int,int,text,text,text,jsonb,text,uuid,text,numeric,bool,text,text) to authenticated;
grant execute on function public.admin_bulk_update_slots(uuid[],bool,int,int) to authenticated;
grant execute on function public.admin_generate_slots(uuid,date,date,int[],text[],int,int) to authenticated;
grant execute on function public.admin_check_in(text) to authenticated;
-- Cierra EXECUTE implícito de PUBLIC: la RPC comprueba admin o cancelación propia.
revoke all on function public.update_reservation_status(uuid,text,text) from public,anon;
grant execute on function public.update_reservation_status(uuid,text,text) to authenticated;

-- Valida los arrays que no pueden expresarse mediante claves foráneas simples.
create or replace function public.validate_offer_definition()
returns trigger language plpgsql set search_path=public as $$
begin
  if exists(select 1 from unnest(new.tour_ids) x where x is null or not exists(select 1 from public.tours t where t.id=x)) then
    raise exception 'invalid_offer_tours: hay productos inexistentes';
  end if;
  if new.start_times is not null and (cardinality(new.start_times)=0 or exists(
    select 1 from unnest(new.start_times) t where t is null or t !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')) then
    raise exception 'invalid_start_times: use HH:MM';
  end if;
  return new;
end $$;
drop trigger if exists offers_definition_guard on public.special_offers;
create trigger offers_definition_guard before insert or update on public.special_offers
  for each row execute function public.validate_offer_definition();

-- Cuenta plazas comprometidas (pendientes, confirmadas o completadas); cancelar
-- las libera. El bloqueo evita vender simultáneamente la última plaza de oferta.
create or replace function public.sync_offer_seats()
returns trigger language plpgsql security definer set search_path=public as $$
declare
  v_old_id uuid; v_new_id uuid; v_old_pax int:=0; v_new_pax int:=0;
  v_offer public.special_offers%rowtype; v_delta int;
begin
  if tg_op <> 'INSERT' then
    v_old_id:=old.special_offer_id;
    if old.status<>'cancelada' then v_old_pax:=old.pax; end if;
  end if;
  if tg_op <> 'DELETE' then
    v_new_id:=new.special_offer_id;
    if new.status<>'cancelada' then v_new_pax:=new.pax; end if;
  end if;
  for v_offer in select * from public.special_offers where id=any(array[v_old_id,v_new_id]) order by id for update loop
    v_delta:=(case when v_offer.id=v_new_id then v_new_pax else 0 end)-(case when v_offer.id=v_old_id then v_old_pax else 0 end);
    if v_delta<>0 then
      if v_offer.seats_sold+v_delta<0 or (v_offer.seats_limit is not null and v_offer.seats_sold+v_delta>v_offer.seats_limit) then
        raise exception 'offer_full: límite de plazas con descuento';
      end if;
      update public.special_offers set seats_sold=seats_sold+v_delta where id=v_offer.id;
    end if;
  end loop;
  if tg_op='DELETE' then return old; end if;
  return new;
end $$;
drop trigger if exists reservations_offer_seats on public.reservations;
create trigger reservations_offer_seats after insert or update or delete on public.reservations
  for each row execute function public.sync_offer_seats();


-- Actualiza la caché de PostgREST después de eliminar las firmas antiguas.
notify pgrst, 'reload schema';
commit;
