-- 0021 · Un tour «a consultar» no se puede reservar en línea.
--
-- En el panel, precio 0 significa «precio a consultar». create_booking solo
-- rechazaba precios negativos o vacíos, así que una modalidad a 0 habría
-- generado una reserva web por US$ 0. Se añade la comprobación justo después
-- de calcular el precio por persona (tramo incluido).
--
-- Se parchea la definición vigente (la de 0018) en lugar de repetir sus 120
-- líneas: el bloque es idempotente y no cambia la firma ni los permisos.
do $$
declare
  v_def text;
  v_anchor constant text := 'v_price := public.tour_unit_price(v_tour.price_tiers, p_tour_type, v_base, p_pax);';
begin
  select pg_get_functiondef(p.oid) into v_def
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'create_booking';
  if v_def is null then
    raise exception 'create_booking no existe: aplica antes la migración 0018';
  end if;
  if position('price_on_request' in v_def) > 0 then
    return; -- ya aplicado
  end if;
  if position(v_anchor in v_def) = 0 then
    raise exception 'create_booking no tiene el cálculo de precio esperado';
  end if;
  v_def := replace(v_def, v_anchor, v_anchor || E'\n'
    || '  if v_price is null or v_price <= 0 then raise exception ''tour_type_unavailable: price_on_request''; end if;');
  execute v_def;
end $$;
