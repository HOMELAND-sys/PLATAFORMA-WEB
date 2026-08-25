-- Homeland Tours — esquema base (RF-04, RF-05, RF-06, RF-19)
-- Tablas: profiles, categories, tours, tour_dates, reservations, booking_passengers, coupons, settings, audit_log

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  role text not null default 'client' check (role in ('client', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  emoji text not null default '',
  image text,
  position integer not null default 0
);

create table if not exists public.tours (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  image text not null,
  gallery jsonb not null default '[]',
  badge text,
  badge_variant text check (badge_variant in ('popular', 'adventure', 'cultural')),
  category_id uuid references public.categories (id) on delete set null,
  category_ids uuid[] not null default '{}',
  duration text not null default '',
  difficulty text not null default 'Easy' check (difficulty in ('Easy', 'Moderate', 'Challenging')),
  activity_label text not null default '',
  type_label text not null default '',
  destination text not null default '',
  start_end text not null default '',
  best_season text not null default '',
  max_altitude text not null default '',
  price_group numeric(10,2),
  price_semi numeric(10,2),
  price_private numeric(10,2),
  summary text[] not null default '{}',
  highlights text[] not null default '{}',
  itinerary jsonb not null default '[]',
  included text[] not null default '{}',
  not_included text[] not null default '{}',
  what_to_bring jsonb not null default '[]',
  info jsonb not null default '{}',
  extras jsonb not null default '[]',
  featured boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tour_dates (
  id uuid primary key default gen_random_uuid(),
  tour_id uuid not null references public.tours (id) on delete cascade,
  date date not null,
  capacity integer not null check (capacity >= 1),
  created_at timestamptz not null default now(),
  unique (tour_id, date)
);
create index if not exists idx_tour_dates_tour_date on public.tour_dates (tour_id, date);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  user_id uuid not null references public.profiles (id) on delete cascade,
  tour_id uuid not null references public.tours (id) on delete restrict,
  tour_date_id uuid not null references public.tour_dates (id) on delete restrict,
  tour_type text not null check (tour_type in ('group', 'semi', 'private')),
  pax integer not null check (pax >= 1 and pax <= 8),
  extras jsonb not null default '[]',
  subtotal numeric(10,2) not null default 0,
  group_discount numeric(10,2) not null default 0,
  coupon_code text,
  coupon_discount numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  status text not null default 'pendiente_pago' check (status in ('pendiente_pago', 'confirmada', 'completada', 'cancelada')),
  payment_method text not null default 'link' check (payment_method in ('link', 'qr')),
  cancellation_reason text,
  refund_pending boolean not null default false,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  cancelled_at timestamptz,
  completed_at timestamptz,
  reminder_sent_at timestamptz
);
create index if not exists idx_reservations_user on public.reservations (user_id);
create index if not exists idx_reservations_tour on public.reservations (tour_id);
create index if not exists idx_reservations_date on public.reservations (tour_date_id);
create index if not exists idx_reservations_status on public.reservations (status);

create table if not exists public.booking_passengers (
  id uuid primary key default gen_random_uuid(),
  reservations_id uuid not null references public.reservations (id) on delete cascade,
  position integer not null default 1,
  name text not null default '',
  doc text not null default '',
  country text not null default '',
  meal text not null default 'Normal',
  is_lead boolean not null default false
);
create index if not exists idx_booking_passengers_res on public.booking_passengers (reservations_id);

create table if not exists public.coupons (
  code text primary key,
  discount_pct integer not null check (discount_pct >= 0 and discount_pct <= 100),
  active boolean not null default true,
  valid_from date,
  valid_to date
);

create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  admin_id uuid,
  entity text not null,
  entity_id text not null default '',
  action text not null,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_entity on public.audit_log (entity, entity_id);
create index if not exists idx_audit_created on public.audit_log (created_at desc);

-- Perfil al registrarse: role admin para la cuenta fija, client para el resto (S-05)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    case when new.email = 'webhomeland1@gmail.com' then 'admin' else 'client' end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at en tours y settings
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists tours_touch on public.tours;
create trigger tours_touch before update on public.tours
  for each row execute function public.touch_updated_at();

drop trigger if exists settings_touch on public.settings;
create trigger settings_touch before update on public.settings
  for each row execute function public.touch_updated_at();

-- Rol admin (definido por el dueño de la base; lo usan las políticas RLS)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Cupo libre = capacidad - ocupado por pendientes + confirmadas (S-07, S-11)
create or replace view public.v_tour_dates_free
with (security_invoker = false)
as
select
  td.id,
  td.tour_id,
  td.date,
  td.capacity,
  coalesce(occ.occupied, 0) as occupied,
  td.capacity - coalesce(occ.occupied, 0) as free
from public.tour_dates td
left join lateral (
  select sum(r.pax) as occupied
  from public.reservations r
  where r.tour_date_id = td.id
    and r.status in ('pendiente_pago', 'confirmada')
) occ on true;

-- Guardia: la capacidad no puede bajar por debajo de lo ocupado (RF-11)
create or replace function public.guard_tour_date_capacity()
returns trigger
language plpgsql
as $$
declare
  v_occupied integer;
begin
  if new.capacity is distinct from old.capacity then
    select coalesce(sum(r.pax), 0) into v_occupied
    from public.reservations r
    where r.tour_date_id = new.id
      and r.status in ('pendiente_pago', 'confirmada');
    if new.capacity < v_occupied then
      raise exception 'capacity_below_occupied: % pasajeros ocupados, no podés bajar por debajo de eso', v_occupied;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists tour_dates_capacity_guard on public.tour_dates;
create trigger tour_dates_capacity_guard
  before update on public.tour_dates
  for each row execute function public.guard_tour_date_capacity();

-- Guardia: no se borra una fecha con reservas activas (RF-11)
create or replace function public.guard_tour_date_delete()
returns trigger
language plpgsql
as $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.reservations r
  where r.tour_date_id = old.id
    and r.status in ('pendiente_pago', 'confirmada');
  if v_count > 0 then
    raise exception 'date_has_active_bookings: % reservas activas usan esta fecha', v_count;
  end if;
  return old;
end;
$$;

drop trigger if exists tour_dates_delete_guard on public.tour_dates;
create trigger tour_dates_delete_guard
  before delete on public.tour_dates
  for each row execute function public.guard_tour_date_delete();

-- Guardia: transiciones de estado de reserva (RF-09, RF-17)
-- Cliente: solo puede cancelar SU reserva mientras esté pendiente_pago.
-- Admin: pendiente→confirmada / confirmada→completada / activa→cancelada (motivo).
create or replace function public.guard_reservation_status()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  -- Autoservicio del cliente: cancelación propia de pendiente_pago (RF-17)
  if auth.uid() = old.user_id
     and new.status = 'cancelada'
     and old.status = 'pendiente_pago' then
    new.cancelled_at := now();
    if new.cancellation_reason is null or btrim(new.cancellation_reason) = '' then
      new.cancellation_reason := 'Cancelada por el cliente';
    end if;
    return new;
  end if;

  -- Cambios admin
  if is_admin() then
    if new.status = 'confirmada' and old.status = 'pendiente_pago' then
      if new.paid_at is null then new.paid_at := now(); end if;
      return new;
    end if;
    if new.status = 'completada' and old.status = 'confirmada' then
      if new.completed_at is null then new.completed_at := now(); end if;
      return new;
    end if;
    if new.status = 'cancelada' and old.status in ('pendiente_pago', 'confirmada') then
      if new.cancellation_reason is null or btrim(new.cancellation_reason) = '' then
        raise exception 'cancellation_reason_required: la cancelación exige motivo';
      end if;
      if new.cancelled_at is null then new.cancelled_at := now(); end if;
      new.refund_pending := (old.status = 'confirmada');
      return new;
    end if;
    raise exception 'invalid_transition: % -> %', old.status, new.status;
  end if;

  raise exception 'not_authorized_to_change_status';
end;
$$;

drop trigger if exists reservations_status_guard on public.reservations;
create trigger reservations_status_guard
  before update on public.reservations
  for each row execute function public.guard_reservation_status();

-- Guardia: nadie (salvo admin) cambia su rol (RF-12)
create or replace function public.guard_profile_role()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role is distinct from old.role and not is_admin() then
    raise exception 'cannot_change_role';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_role_guard on public.profiles;
create trigger profiles_role_guard
  before update on public.profiles
  for each row execute function public.guard_profile_role();

-- Auditoría (RF-19): quién, cuándo, entidad, antes/después.
-- Función específica por tipo de clave (uuid, code, key).
create or replace function public.audit_write_uuid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entity_id text := case when tg_op = 'INSERT' then new.id::text else old.id::text end;
begin
  insert into public.audit_log (admin_id, entity, entity_id, action, before, after)
  values (
    auth.uid(), tg_table_name, coalesce(v_entity_id, ''), tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.audit_write_coupon()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entity_id text := case when tg_op = 'INSERT' then new.code else old.code end;
begin
  insert into public.audit_log (admin_id, entity, entity_id, action, before, after)
  values (
    auth.uid(), tg_table_name, coalesce(v_entity_id, ''), tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function public.audit_write_setting()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entity_id text := case when tg_op = 'INSERT' then new.key else old.key end;
begin
  insert into public.audit_log (admin_id, entity, entity_id, action, before, after)
  values (
    auth.uid(), tg_table_name, coalesce(v_entity_id, ''), tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists tours_audit on public.tours;
create trigger tours_audit
  after insert or update or delete on public.tours
  for each row execute function public.audit_write_uuid();

drop trigger if exists tour_dates_audit on public.tour_dates;
create trigger tour_dates_audit
  after insert or update or delete on public.tour_dates
  for each row execute function public.audit_write_uuid();

drop trigger if exists coupons_audit on public.coupons;
create trigger coupons_audit
  after insert or update or delete on public.coupons
  for each row execute function public.audit_write_coupon();

drop trigger if exists settings_audit on public.settings;
create trigger settings_audit
  after insert or update on public.settings
  for each row execute function public.audit_write_setting();
