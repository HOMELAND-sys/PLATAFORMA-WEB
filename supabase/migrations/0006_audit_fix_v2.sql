-- 0006 — Fix de auditoría v2 (historial).
-- Reasegura la forma final de los triggers de auditoría y sus triggers asociados,
-- para que una aplicación fresca de la secuencia termine en el mismo estado que
-- producción. Idempotente: re-crea funciones y triggers ya existentes.

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
