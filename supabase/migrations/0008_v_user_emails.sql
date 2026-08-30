-- 0008 — Vista de emails de usuarios (RF-09: el panel muestra email del cliente).
-- auth.users no es legible por el cliente directamente; la vista expone solo
-- el email de la propia cuenta (o todo, para admin), filtrado por RLS-equivalente.

create or replace view public.v_user_emails
with (security_invoker = false)
as
select u.id, u.email
from auth.users u
where u.email is not null
  and (u.id = auth.uid() or public.is_admin());
