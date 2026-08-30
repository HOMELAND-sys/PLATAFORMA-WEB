-- 0005 — Fix del trigger de auditoría (historial).
-- La auditoría original (0001) se ejecutaba como el usuario que dispara el trigger
-- (security invoker) y el INSERT en audit_log fallaba por RLS; además no resolvía bien
-- la clave de la entidad en coupons/settings. Fix: security definer + search_path
-- explícito y clave de entidad por tipo de tabla. (0006 refinó a funciones tipadas.)

create or replace function public.audit_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entity_id text;
begin
  v_entity_id := case
    when tg_table_name = 'coupons' then coalesce(new.code, old.code)
    when tg_table_name = 'settings' then coalesce(new.key, old.key)
    when tg_op = 'INSERT' then new.id::text
    else old.id::text
  end;

  insert into public.audit_log (admin_id, entity, entity_id, action, before, after)
  values (
    auth.uid(),
    tg_table_name,
    coalesce(v_entity_id, ''),
    tg_op,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;
