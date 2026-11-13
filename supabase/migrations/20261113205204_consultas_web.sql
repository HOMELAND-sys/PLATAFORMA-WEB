-- Formularios públicos: inserción sin lectura; bandeja privada de administración.
create table public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('customize', 'business')),
  full_name text not null check (char_length(btrim(full_name)) between 2 and 160),
  email text not null check (char_length(email) between 5 and 320 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  phone text not null check (char_length(phone) between 7 and 40),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object' and octet_length(details::text) <= 8192),
  status text not null default 'new' check (status in ('new', 'contacted')),
  created_at timestamptz not null default now()
);
alter table public.contact_requests enable row level security;
revoke all on public.contact_requests from public, anon, authenticated;
grant insert (source, full_name, email, phone, details) on public.contact_requests to anon, authenticated;
grant select on public.contact_requests to authenticated;
grant update (status) on public.contact_requests to authenticated;
create policy contact_requests_insert on public.contact_requests
  for insert to anon, authenticated with check (status = 'new');
create policy contact_requests_read_admin on public.contact_requests
  for select to authenticated using ((select public.is_admin()));
create policy contact_requests_update_admin on public.contact_requests
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create index contact_requests_recent on public.contact_requests (created_at desc);
create index contact_requests_email_rate on public.contact_requests (lower(email), created_at desc);

-- El trigger puede contar envíos para limitar abuso, sin exponer las consultas.
create schema if not exists private;
create function private.guard_contact_request() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.email := lower(btrim(new.email));
  new.full_name := btrim(new.full_name);
  new.phone := btrim(new.phone);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.email, 0));
  if exists (select 1 from public.contact_requests where lower(email)=new.email and created_at > now()-interval '1 minute')
    or (select count(*) from public.contact_requests where lower(email)=new.email and created_at > now()-interval '1 day') >= 5 then
    raise exception 'contact_rate_limit';
  end if;
  return new;
end $$;
revoke all on function private.guard_contact_request() from public, anon, authenticated;
create trigger contact_request_guard before insert on public.contact_requests
  for each row execute function private.guard_contact_request();
notify pgrst, 'reload schema';
