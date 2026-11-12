-- CC-HT7B · Catálogo real: fotografías verificadas y productos pendientes de revisión.
-- Aplicar después de 0011 y 0012. No ejecutada durante su preparación.
-- Rutas cotejadas con el manifest del sitio público, sin copiar ni modificar ese índice.
-- Todas las fotografías solicitadas existen en el manifest; no hubo sustituciones.
begin;

-- Fotografías de los diez slugs existentes. Salkantay conserva su gallery porque
-- el encargo solo cambia su portada. No se altera actividad, precio ni contenido.
with media(slug,image,gallery) as (
  values
  ('salar-de-uyuni-3-day-adventure','/assets/tours/salar-de-uyuni/02.webp','["/assets/tours/salar-de-uyuni/01.webp","/assets/tours/salar-de-uyuni/03.webp","/assets/tours/reserva-eduardo-avaroa/01.webp","/assets/tours/reserva-eduardo-avaroa/02.webp","/assets/tours/reserva-eduardo-avaroa/04.webp","/assets/tours/reserva-eduardo-avaroa/06.webp"]'::jsonb),
  ('laguna-colorada-uyuni-4-day-tour','/assets/tours/reserva-eduardo-avaroa/01.webp','["/assets/tours/reserva-eduardo-avaroa/03.webp","/assets/tours/reserva-eduardo-avaroa/05.webp","/assets/tours/reserva-eduardo-avaroa/06.webp","/assets/tours/reserva-eduardo-avaroa/08.webp","/assets/tours/salar-de-uyuni/01.webp"]'::jsonb),
  ('uyuni-salt-flats-day-tour','/assets/tours/salar-de-uyuni/01.webp','["/assets/tours/salar-de-uyuni/02.webp","/assets/tours/salar-de-uyuni/03.webp","/assets/tours/varios/01.webp"]'::jsonb),
  ('copacabana-isla-del-sol','/assets/tours/lago-titicaca-isla-del-sol-norte-y-sur/03.webp','["/assets/tours/lago-titicaca-copacabana/01.webp","/assets/tours/lago-titicaca-copacabana/02.webp","/assets/tours/lago-titicaca-copacabana/03.webp","/assets/tours/lago-titicaca-isla-del-sol-norte-y-sur/04.webp","/assets/tours/lago-titicaca-isla-del-sol-norte-y-sur/05.webp","/assets/tours/lago-titicaca-isla-de-la-luna/01.webp"]'::jsonb),
  ('la-paz-city-tour-valle-de-la-luna','/assets/tours/teleferico-la-paz/02.webp','["/assets/tours/teleferico-la-paz/01.webp","/assets/tours/teleferico-la-paz/03.webp","/assets/tours/teleferico-la-paz/05.webp","/assets/tours/valle-de-la-luna/01.webp","/assets/tours/valle-de-la-luna/02.webp"]'::jsonb),
  ('valle-de-la-luna-half-day','/assets/tours/valle-de-la-luna/02.webp','["/assets/tours/valle-de-la-luna/01.webp","/assets/tours/valle-de-la-luna/03.webp","/assets/tours/valle-de-la-luna-sec/01.webp","/assets/tours/valle-de-la-luna-sec/02.webp"]'::jsonb),
  ('madidi-amazon-expedition','/assets/tours/madidi-national-park/01.webp','["/assets/tours/madidi-national-park/02.webp","/assets/tours/madidi-national-park/03.webp","/assets/tours/madidi-national-park/04.webp"]'::jsonb),
  ('rurrenabaque-pampas-jungle-3-day','/assets/tours/pampas-de-yacuma/01.webp','["/assets/tours/pampas-de-yacuma/02.webp","/assets/tours/pampas-de-yacuma/03.webp","/assets/tours/madidi-national-park/04.webp"]'::jsonb),
  ('salkantay-trek-machu-picchu','/assets/tours/machu-picchu/01.webp',null::jsonb),
  ('andean-traditions-communities','/assets/tours/tiwanaku/01.webp','["/assets/tours/lago-titicaca-isla-de-la-luna/01.webp","/assets/tours/sajama/05.webp"]'::jsonb)
)
update public.tours t set image=m.image,gallery=coalesce(m.gallery,t.gallery),
  rating=null,review_count=0,languages=array['Español','English']::text[],free_cancellation_hours=24
from media m where t.slug=m.slug;

-- Requiere las categorías originales de 0004: evita omitir borradores en silencio.
do $$ begin
  if exists(select 1 from unnest(array['lapaz-top','trekking','bolivia-top','lapaz-city']::text[]) needed(slug)
    left join public.categories c on c.slug=needed.slug where c.id is null) then
    raise exception 'catalog_categories_missing: revise las categorías de 0004 antes de continuar';
  end if;
end $$;

-- Duraciones indicadas por los dueños. Dificultad provisional de catálogo:
-- debe validarse antes de activar. No se crean horarios, alturas, tarifas ni reseñas.
-- Galerías: resto del destino, sin repetir hero y con un máximo de ocho fotos.
with staged(slug,code,title,destination,duration,difficulty,image,gallery,category_slug,category_slugs,summary) as (
  values
  ('valle-de-las-animas','ANI-01','Valle de las Ánimas','Valle de las Ánimas','Medio día · tarde','Moderate','/assets/tours/valle-de-las-animas/02.webp',
    '["/assets/tours/valle-de-las-animas/01.webp","/assets/tours/valle-de-las-animas/03.webp"]'::jsonb,'lapaz-top',array['lapaz-top','trekking']::text[],
    array['[BORRADOR] Visita de medio día al Valle de las Ánimas. El recorrido de la tarde está pendiente de confirmación.']::text[]),
  ('parque-nacional-sajama','SAJ-01','Parque Nacional Sajama','Parque Nacional Sajama','Día completo','Easy','/assets/tours/sajama/04.webp',
    '["/assets/tours/sajama/01.webp","/assets/tours/sajama/02.webp","/assets/tours/sajama/03.webp","/assets/tours/sajama/05.webp","/assets/tours/sajama/06.webp","/assets/tours/sajama/07.webp"]'::jsonb,'bolivia-top',array['bolivia-top','trekking']::text[],
    array['[BORRADOR] Propuesta de visita al Parque Nacional Sajama. El itinerario y los servicios se completarán antes de publicar.']::text[]),
  ('laguna-charquini','CHQ-01','Laguna Charquini','Laguna Charquini','Día completo','Moderate','/assets/tours/charquini/02.webp',
    '["/assets/tours/charquini/01.webp","/assets/tours/charquini/03.webp","/assets/tours/charquini/04.webp"]'::jsonb,'trekking',array['trekking','lapaz-top']::text[],
    array['[BORRADOR] Propuesta de excursión a la Laguna Charquini. El recorrido y los servicios están pendientes de validación.']::text[]),
  ('condoriri-trekking-de-dia','CON-01','Condoriri: trekking de día','Condoriri','Día completo','Moderate','/assets/tours/condoriri/03.webp',
    '["/assets/tours/condoriri/01.webp","/assets/tours/condoriri/02.webp","/assets/tours/condoriri/04.webp","/assets/tours/condoriri/05.webp","/assets/tours/condoriri/06.webp","/assets/tours/condoriri/07.webp","/assets/tours/condoriri/08.webp"]'::jsonb,'trekking',array['trekking','lapaz-top']::text[],
    array['[BORRADOR] Propuesta de trekking de día en Condoriri. La ruta y los servicios se definirán antes de su publicación.']::text[]),
  ('camino-de-la-muerte-en-bicicleta','BIC-01','Camino de la Muerte en bicicleta','Camino de la Muerte en bicicleta','Día completo','Moderate','/assets/tours/death-road/02.webp',
    '["/assets/tours/death-road/01.webp","/assets/tours/death-road/03.webp"]'::jsonb,'lapaz-top',array['lapaz-top']::text[],
    array['[BORRADOR] Propuesta de recorrido en bicicleta por el Camino de la Muerte. La operación y el equipamiento están pendientes de confirmación.']::text[]),
  ('chacaltaya','CHA-01','Chacaltaya','Chacaltaya','Medio día','Easy','/assets/tours/chacaltaya/03.webp',
    '["/assets/tours/chacaltaya/01.webp","/assets/tours/chacaltaya/02.webp","/assets/tours/chacaltaya/04.webp"]'::jsonb,'lapaz-top',array['lapaz-top']::text[],
    array['[BORRADOR] Propuesta de visita de medio día a Chacaltaya. El itinerario y los servicios se completarán antes de publicar.']::text[]),
  ('canon-de-palca','PAL-01','Cañón de Palca','Cañón de Palca','Medio día','Moderate','/assets/tours/canon-de-palca/04.webp',
    '["/assets/tours/canon-de-palca/01.webp","/assets/tours/canon-de-palca/02.webp","/assets/tours/canon-de-palca/03.webp","/assets/tours/canon-de-palca/05.webp","/assets/tours/canon-de-palca/06.webp","/assets/tours/canon-de-palca/07.webp"]'::jsonb,'lapaz-top',array['lapaz-top','trekking']::text[],
    array['[BORRADOR] Propuesta de visita de medio día al Cañón de Palca. El recorrido está pendiente de validación.']::text[]),
  ('toro-toro','TOR-01','Toro Toro','Toro Toro','2 días','Moderate','/assets/tours/toro-toro/01.webp',
    '["/assets/tours/toro-toro/02.webp"]'::jsonb,'bolivia-top',array['bolivia-top']::text[],
    array['[BORRADOR] Propuesta de recorrido de dos días en Toro Toro. El itinerario y los servicios se completarán antes de publicar.']::text[]),
  ('tiwanaku','TIW-01','Tiwanaku','Tiwanaku','Medio día / día completo','Easy','/assets/tours/tiwanaku/01.webp',
    '[]'::jsonb,'lapaz-top',array['lapaz-top','bolivia-top']::text[],
    array['[BORRADOR] Propuesta de visita a Tiwanaku. La modalidad de medio día o día completo y el itinerario están pendientes de confirmación.']::text[]),
  ('glaciar-y-lagunas-ventanani','VEN-01','Glaciar y lagunas Ventanani','Glaciar y lagunas Ventanani','Día completo','Moderate','/assets/tours/ventanani/04.webp',
    '["/assets/tours/ventanani/01.webp","/assets/tours/ventanani/02.webp","/assets/tours/ventanani/03.webp","/assets/tours/ventanani/05.webp","/assets/tours/ventanani/06.webp","/assets/tours/ventanani/07.webp","/assets/tours/ventanani/08.webp","/assets/tours/ventanani/09.webp"]'::jsonb,'trekking',array['trekking','lapaz-top']::text[],
    array['[BORRADOR] Propuesta de excursión al glaciar y las lagunas Ventanani. La ruta y los servicios están pendientes de validación.']::text[]),
  ('mirador-alaxpacha','ALX-01','Mirador Alaxpacha','Mirador Alaxpacha','Medio día','Easy','/assets/tours/mirador-alaxpacha/01.webp',
    '["/assets/tours/mirador-alaxpacha/02.webp"]'::jsonb,'lapaz-top',array['lapaz-top']::text[],
    array['[BORRADOR] Propuesta de visita de medio día al Mirador Alaxpacha. El recorrido y los servicios se completarán antes de publicar.']::text[]),
  ('teleferico-y-miradores-de-la-paz','TEL-01','Teleférico y miradores de La Paz','Teleférico y miradores de La Paz','Medio día','Easy','/assets/tours/teleferico-la-paz/02.webp',
    '["/assets/tours/teleferico-la-paz/01.webp","/assets/tours/teleferico-la-paz/03.webp","/assets/tours/teleferico-la-paz/04.webp","/assets/tours/teleferico-la-paz/05.webp","/assets/tours/teleferico-la-paz/06.webp","/assets/tours/teleferico-la-paz/07.webp","/assets/tours/teleferico-la-paz/08.webp","/assets/tours/teleferico-la-paz/09.webp"]'::jsonb,'lapaz-city',array['lapaz-city']::text[],
    array['[BORRADOR] Propuesta de recorrido en teleférico y visita a miradores de La Paz. El itinerario está pendiente de confirmación.']::text[])
)
insert into public.tours(
  slug,code,title,destination,duration,difficulty,image,gallery,category_id,category_ids,
  summary,highlights,price_group,price_semi,price_private,price_child,
  rating,review_count,languages,free_cancellation_hours,active,featured
)
select s.slug,s.code,s.title,s.destination,s.duration,s.difficulty,s.image,s.gallery,c.id,
  array(select c2.id from unnest(s.category_slugs) with ordinality desired(slug,n)
    join public.categories c2 on c2.slug=desired.slug order by desired.n),
  s.summary,'{}'::text[],null,null,null,null,
  null,0,array['Español','English']::text[],24,false,false
from staged s join public.categories c on c.slug=s.category_slug
-- No duplica un producto dedicado que ya tenga el mismo slug, título o destino.
-- Un city tour general no se considera el producto dedicado de teleférico.
where not exists(select 1 from public.tours existing where existing.slug=s.slug
  or lower(btrim(existing.title))=lower(s.title)
  or lower(btrim(existing.destination))=lower(s.destination))
on conflict (slug) do nothing;

commit;
