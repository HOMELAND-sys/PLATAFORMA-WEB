-- 0018: precios por tamaño de grupo, tarifa de niño real, salidas y reseñas.
--
-- 1) tours.price_tiers: precio por persona según cuántos viajan, por tipo de tour.
--    Es como Homeland publica sus tours privados (2 pax 255 USD, 3 pax 210 USD…).
--    Forma: {"private":[{"min":2,"price":255},{"min":3,"price":210}], "group":[…]}
--    Cuando un tipo tiene escala, el descuento automático por grupo NO se suma
--    (la escala ya es el descuento). Sin escala, todo sigue como en 0016.
-- 2) price_child deja de ser "de referencia": si el producto la tiene, los niños
--    pagan esa tarifa en la reserva online.
-- 3) tours.departures: texto corto de salidas ("Salidas diarias", "Solo sábados").
-- 4) reviews: reseñas reales, moderadas por administración; la valoración del
--    producto se recalcula sola con las reseñas publicadas.
begin;

alter table public.tours add column if not exists price_tiers jsonb not null default '{}'::jsonb;
alter table public.tours add column if not exists departures text not null default '';

create or replace function public.valid_price_tiers(p jsonb)
returns boolean language plpgsql immutable set search_path = public as $$
declare k text; v jsonb; e jsonb;
begin
  if p is null or jsonb_typeof(p) <> 'object' then return false; end if;
  for k, v in select * from jsonb_each(p) loop
    if k not in ('group', 'semi', 'private') or jsonb_typeof(v) <> 'array' then return false; end if;
    for e in select * from jsonb_array_elements(v) loop
      if jsonb_typeof(e) <> 'object'
        or jsonb_typeof(e->'min') <> 'number' or jsonb_typeof(e->'price') <> 'number'
        or (e->>'min')::numeric < 1 or (e->>'min')::numeric <> floor((e->>'min')::numeric)
        or (e->>'price')::numeric < 0 then
        return false;
      end if;
    end loop;
  end loop;
  return true;
end $$;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tours_price_tiers_valid') then
    alter table public.tours add constraint tours_price_tiers_valid check (public.valid_price_tiers(price_tiers));
  end if;
end $$;

-- Precio por persona para un tipo y una cantidad de viajeros.
create or replace function public.tour_unit_price(p_tiers jsonb, p_type text, p_base numeric, p_pax integer)
returns numeric language sql immutable set search_path = public as $$
  select coalesce(
    (select (t->>'price')::numeric
       from jsonb_array_elements(
              case when jsonb_typeof(p_tiers->p_type) = 'array' then p_tiers->p_type else '[]'::jsonb end) t
      where (t->>'min')::int <= p_pax
      order by (t->>'min')::int desc
      limit 1),
    p_base);
$$;
revoke all on function public.valid_price_tiers(jsonb) from public, anon, authenticated;
revoke all on function public.tour_unit_price(jsonb, text, numeric, integer) from public, anon, authenticated;

-- create_booking: misma firma que 0016 (PostgREST conserva una sola).
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
  v_base numeric; v_price numeric; v_child_price numeric; v_tiered boolean;
  v_subtotal numeric; v_group numeric; v_discount numeric := 0;
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
  case p_tour_type when 'group' then v_base := v_tour.price_group;
    when 'semi' then v_base := v_tour.price_semi; else v_base := v_tour.price_private; end case;
  if v_base is null or v_base < 0 then raise exception 'tour_type_unavailable'; end if;
  -- Escala por tamaño de grupo: manda sobre el precio base y sustituye al descuento de grupo.
  v_tiered := jsonb_typeof(v_tour.price_tiers->p_tour_type) = 'array'
    and jsonb_array_length(v_tour.price_tiers->p_tour_type) > 0;
  v_price := public.tour_unit_price(v_tour.price_tiers, p_tour_type, v_base, p_pax);
  v_child_price := case when v_tour.price_child is not null and p_children > 0
    then least(v_tour.price_child, v_price) else v_price end;
  select coalesce(jsonb_agg(e), '[]'), coalesce(sum((e->>'price')::numeric),0)
    into v_extras,v_extra_total from jsonb_array_elements(v_tour.extras) e
    where e->>'kind' = 'paid' and exists (select 1 from jsonb_array_elements(p_extras) x where x->>'id' = e->>'id');
  v_subtotal := v_price * (p_pax - p_children) + v_child_price * p_children + v_extra_total;
  v_group := case when v_tiered then 0
    else round(v_subtotal * case when p_pax >= 5 then .08 when p_pax >= 3 then .05 else 0 end) end;
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
    v_discount := least(v_subtotal - v_group - v_offer_discount,
      round((v_subtotal - v_group - v_offer_discount) * v_coupon.discount_pct / 100.0));
  end if;
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

-- ---------------------------------------------------------------------------
-- Reseñas
-- ---------------------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid references public.tours(id) on delete set null,
  reservation_id uuid unique references public.reservations(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  author_name text not null check (char_length(btrim(author_name)) between 1 and 80),
  author_country text not null default '',
  rating integer not null check (rating between 1 and 5),
  title text not null default '' check (char_length(title) <= 120),
  body text not null check (char_length(btrim(body)) between 10 and 2000),
  status text not null default 'pending' check (status in ('pending', 'published', 'hidden')),
  source text not null default 'web' check (source in ('web', 'manual', 'google', 'tripadvisor')),
  travel_date date,
  admin_reply text,
  created_at timestamptz not null default now(),
  published_at timestamptz
);
comment on table public.reviews is 'Reseñas de viajeros. tour_id nulo = testimonio general de la operadora.';
create index if not exists reviews_tour_status_idx on public.reviews (tour_id, status, created_at desc);
create index if not exists reviews_user_idx on public.reviews (user_id);
alter table public.reviews enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='reviews' and policyname='reviews_select_visible') then
    create policy reviews_select_visible on public.reviews for select to anon, authenticated
      using (status = 'published' or user_id = (select auth.uid()) or (select public.is_admin()));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='reviews' and policyname='reviews_admin_write') then
    create policy reviews_admin_write on public.reviews for all to authenticated
      using ((select public.is_admin())) with check ((select public.is_admin()));
  end if;
end $$;

-- El cliente reseña solo sus reservas completadas, una vez; queda pendiente de moderación.
create or replace function public.submit_review(p_reservation_id uuid, p_rating integer, p_title text, p_body text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_res public.reservations%rowtype; v_full text; v_name text; v_date date; v_row public.reviews%rowtype;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if p_rating is null or p_rating not between 1 and 5 then raise exception 'invalid_rating'; end if;
  if char_length(btrim(coalesce(p_body, ''))) < 10 or char_length(p_body) > 2000 then raise exception 'invalid_body'; end if;
  if char_length(coalesce(p_title, '')) > 120 then raise exception 'invalid_title'; end if;
  select * into v_res from public.reservations where id = p_reservation_id and user_id = auth.uid();
  if not found then raise exception 'reservation_not_found'; end if;
  if v_res.status <> 'completada' then raise exception 'reservation_not_completed'; end if;
  if exists (select 1 from public.reviews r where r.reservation_id = v_res.id) then raise exception 'already_reviewed'; end if;
  select nullif(btrim(p.full_name), '') into v_full from public.profiles p where p.id = auth.uid();
  v_full := coalesce(v_full, nullif(btrim(v_res.contact_name), ''), 'Viajero');
  -- Nombre público: nombre de pila + inicial del apellido.
  v_name := split_part(v_full, ' ', 1)
    || case when split_part(v_full, ' ', 2) <> '' then ' ' || upper(left(split_part(v_full, ' ', 2), 1)) || '.' else '' end;
  select td.date into v_date from public.tour_dates td where td.id = v_res.tour_date_id;
  insert into public.reviews (tour_id, reservation_id, user_id, author_name, author_country, rating, title, body, status, source, travel_date)
  values (v_res.tour_id, v_res.id, auth.uid(), left(v_name, 80), coalesce(v_res.contact_country, ''), p_rating,
    btrim(coalesce(p_title, '')), btrim(p_body), 'pending', 'web', v_date)
  returning * into v_row;
  return to_jsonb(v_row);
end $$;
revoke all on function public.submit_review(uuid, integer, text, text) from public, anon;
grant execute on function public.submit_review(uuid, integer, text, text) to authenticated;

-- La valoración pública del producto sale de sus reseñas publicadas.
create or replace function public.refresh_tour_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_ids uuid[];
begin
  v_ids := array_remove(array[
    case when tg_op <> 'INSERT' then old.tour_id end,
    case when tg_op <> 'DELETE' then new.tour_id end], null);
  if tg_op <> 'DELETE' and new.status = 'published' and new.published_at is null then
    update public.reviews set published_at = now() where id = new.id;
  end if;
  update public.tours t set
    rating = (select round(avg(r.rating)::numeric, 1) from public.reviews r where r.tour_id = t.id and r.status = 'published'),
    review_count = (select count(*) from public.reviews r where r.tour_id = t.id and r.status = 'published')
  where t.id = any(v_ids);
  return null;
end $$;
revoke all on function public.refresh_tour_rating() from public, anon, authenticated;

create or replace trigger reviews_refresh_rating
  after insert or delete or update of status, rating, tour_id on public.reviews
  for each row execute function public.refresh_tour_rating();

notify pgrst, 'reload schema';
commit;
