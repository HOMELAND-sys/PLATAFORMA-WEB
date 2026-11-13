-- 0019: contenido real de los itinerarios de Homeland Tours (Sajama y Toro Toro),
-- catálogo en español, política de cancelación real y ajustes iniciales.
-- Solo datos. Todo es editable después desde el panel.
begin;

-- ---------------------------------------------------------------------------
-- 1. Ajustes iniciales (solo si aún no existen)
-- ---------------------------------------------------------------------------
insert into public.settings (key, value) values
  ('company', jsonb_build_object(
    'name', 'Homeland Tours', 'phones', '', 'whatsapp', '', 'email', '', 'address', '',
    'facebook', '', 'instagram', '', 'tiktok', '', 'website', 'https://www.homeland.tours', 'license', '')),
  ('policies', jsonb_build_object(
    'free_cancellation_hours', 48, 'default_cutoff_hours', 24, 'cancellation_fee_pct', 10,
    'policy_text', 'Puedes cancelar hasta 48 horas antes del inicio del tour y te reembolsamos el total menos un cargo administrativo del 10 %. Si cancelas dentro de las 48 horas previas al viaje, o no te presentas, no se realizan devoluciones. El itinerario puede variar por condiciones externas como carreteras en mantenimiento o lluvias.'))
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Catálogo en español (los productos de demostración tenían textos en inglés)
-- ---------------------------------------------------------------------------
update public.tours set title = v.title, duration = v.duration, type_label = v.type_label, badge = v.badge
from (values
  ('salar-de-uyuni-3-day-adventure',   'Salar de Uyuni: aventura de 3 días',      '3 días · 2 noches', 'Aventura y naturaleza', 'Más vendido'),
  ('laguna-colorada-uyuni-4-day-tour', 'Laguna Colorada y Uyuni en 4 días',       '4 días · 3 noches', 'Aventura',              null),
  ('uyuni-salt-flats-day-tour',        'Salar de Uyuni: tour de 1 día',           '1 día',             'Fotografía',            null),
  ('copacabana-isla-del-sol',          'Copacabana e Isla del Sol',               '2 días · 1 noche',  'Cultural',              'Cultural'),
  ('la-paz-city-tour-valle-de-la-luna','City tour La Paz y Valle de la Luna',     '1 día',             'Cultural',              'Popular'),
  ('madidi-amazon-expedition',         'Expedición amazónica al Madidi',          '5 días · 4 noches', 'Vida silvestre',        'Aventura'),
  ('rurrenabaque-pampas-jungle-3-day', 'Rurrenabaque: pampas y selva en 3 días',  '3 días · 2 noches', 'Vida silvestre',        null),
  ('salkantay-trek-machu-picchu',      'Trek Salkantay a Machu Picchu',           '5 días',            'Trekking',              'Aventura'),
  ('valle-de-la-luna-half-day',        'Valle de la Luna: medio día',             'Medio día',         'Naturaleza',            null)
) as v(slug, title, duration, type_label, badge)
where tours.slug = v.slug;

-- Política real de cancelación en todos los productos.
update public.tours set
  free_cancellation_hours = 48,
  info = jsonb_set(coalesce(info, '{}'::jsonb), '{cancellation}',
    to_jsonb('Puedes cancelar hasta 48 horas antes del inicio y te reembolsamos el total menos un cargo administrativo del 10 %. Dentro de las 48 horas previas, o si no te presentas, no hay devolución.'::text))
where free_cancellation_hours is distinct from 48
   or info->>'cancellation' is distinct from 'Puedes cancelar hasta 48 horas antes del inicio y te reembolsamos el total menos un cargo administrativo del 10 %. Dentro de las 48 horas previas, o si no te presentas, no hay devolución.';

-- ---------------------------------------------------------------------------
-- 3. Sajama clásico · 2 días / 1 noche · tour privado (itinerario oficial)
-- ---------------------------------------------------------------------------
update public.tours set
  title = 'Sajama clásico: 2 días / 1 noche',
  destination = 'Parque Nacional Sajama, Oruro',
  duration = '2 días · 1 noche',
  difficulty = 'Moderate',
  type_label = 'Tour privado',
  activity_label = 'Clásico cultural',
  departures = 'Salidas diarias',
  start_end = 'Recojo y retorno en tu hotel',
  best_season = '',
  max_altitude = 'Más de 4.000 m s. n. m.',
  badge = 'Tour privado', badge_variant = 'cultural',
  image = '/assets/tours/sajama/04.webp',
  gallery = '["/assets/tours/sajama/04.webp","/assets/tours/sajama/01.webp","/assets/tours/sajama/02.webp","/assets/tours/sajama/03.webp","/assets/tours/sajama/05.webp","/assets/tours/sajama/06.webp","/assets/tours/sajama/07.webp"]'::jsonb,
  price_group = null, price_semi = null, price_private = 255, price_child = null,
  price_tiers = '{"private":[{"min":2,"price":255},{"min":3,"price":210},{"min":4,"price":180},{"min":5,"price":160},{"min":6,"price":150},{"min":7,"price":138},{"min":8,"price":130}]}'::jsonb,
  min_pax = 2,
  languages = array['Español','English'],
  free_cancellation_hours = 48, default_cutoff_hours = 24,
  default_start_times = array['07:00'],
  pickup_included = true, pay_later = true,
  meeting_point = 'Te recogemos en tu hotel alrededor de las 07:00.',
  summary = array[
    'Disfruta el majestuoso Parque Nacional Sajama en un tour privado, con comodidad y flexibilidad. A más de 4.000 m s. n. m., explora sus volcanes nevados, imponentes géiseres, místicas lagunas altoandinas y fauna única.',
    'Una experiencia exclusiva y a tu ritmo para conectar con uno de los paisajes más impresionantes del Altiplano boliviano.'],
  highlights = array[
    'Iglesia colonial de Curahuara de Carangas, la «Capilla Sixtina de los Andes»',
    'Valle de las Rocas y su ciudad de piedra',
    'Aguas termales con vista al nevado Sajama',
    'Atardecer en la laguna Huayñacota, santuario de aves',
    'Géiseres del Sajama: fumarolas y pozas burbujeantes',
    'Bosque de queñuas y pueblo histórico de Sajama'],
  itinerary = $j$[
    {"day":1,"title":"Curahuara de Carangas, Valle de las Rocas y aguas termales","meals":["Almuerzo","Cena"],"stay":"Hostal con baño privado",
     "description":"Te recogemos de tu hotel alrededor de las 07:00 para iniciar el viaje hacia el Altiplano. A medio camino paramos en Curahuara de Carangas para explorar su iglesia colonial, conocida como la «Capilla Sixtina de los Andes», y el fascinante Valle de las Rocas. Continuamos hasta el Parque Sajama, donde disfrutamos de un delicioso almuerzo y nos instalamos en el hospedaje. Por la tarde nos relajamos en las aguas termales y sus propiedades curativas, y al atardecer visitamos la laguna Huayñacota, un santuario de aves acuáticas y migratorias con el majestuoso nevado Sajama como telón de fondo. Regresamos al hospedaje para la cena.",
     "activities":["07:00 · Recojo en tu hotel","Iglesia colonial de Curahuara de Carangas","Valle de las Rocas","Almuerzo e instalación en el hospedaje","Aguas termales","Atardecer en la laguna Huayñacota","Cena en el hospedaje"]},
    {"day":2,"title":"Géiseres, bosque de queñuas y pueblo de Sajama","meals":["Desayuno","Almuerzo"],
     "description":"Después de un revitalizante desayuno recorremos los impresionantes géiseres del Sajama, donde la tierra respira con fumarolas y pozas burbujeantes: un espectáculo geotérmico único. Luego hacemos una caminata escénica por el singular bosque de queñuas, ideal para capturar fotografías memorables y aprender sobre su importancia en este ecosistema. A continuación visitamos el pueblo histórico de Sajama para conocer su arquitectura y herencia cultural. Tras un almuerzo tradicional emprendemos el retorno a la ciudad; llegamos a tu hotel aproximadamente a las 20:00.",
     "activities":["Géiseres del Sajama","Caminata por el bosque de queñuas","Pueblo histórico de Sajama","Almuerzo tradicional","20:00 aprox. · Llegada a tu hotel"]}
  ]$j$::jsonb,
  included = array[
    'Transporte privado: cómoda unidad durante todo el recorrido',
    'Transporte privado: recojo y traslado a tu hotel al finalizar el tour',
    'Hospedaje: 1 noche en hostal con baño privado',
    'Entradas: ingreso a la Capilla Sixtina de los Andes',
    'Entradas: ingreso a las aguas termales',
    'Guía: guía profesional bilingüe',
    'Alimentación: 1 desayuno, 2 almuerzos y 1 cena'],
  not_included = array['Ingreso al Parque Nacional Sajama (nacionales 50 Bs · extranjeros 150 Bs)'],
  what_to_bring = $j$[
    {"emoji":"","title":"Ropa cómoda y abrigadora en capas","detail":""},
    {"emoji":"","title":"Chaqueta impermeable térmica","detail":""},
    {"emoji":"","title":"Calcetines extra","detail":""},
    {"emoji":"","title":"Calzado cómodo","detail":""},
    {"emoji":"","title":"Gorra o sombrero","detail":""},
    {"emoji":"","title":"Traje de baño","detail":"Para las aguas termales."},
    {"emoji":"","title":"Gafas de sol","detail":"Obligatorias: el sol de altura es muy fuerte."},
    {"emoji":"","title":"Gorro de lana y chalina","detail":""},
    {"emoji":"","title":"Bloqueador solar","detail":""},
    {"emoji":"","title":"Botella de agua","detail":""},
    {"emoji":"","title":"Cámara fotográfica","detail":""},
    {"emoji":"","title":"Dinero en efectivo","detail":"Para el ingreso al parque y gastos personales."}
  ]$j$::jsonb,
  info = jsonb_build_object(
    'cancellation', 'Puedes cancelar hasta 48 horas antes del inicio y te reembolsamos el total menos un cargo administrativo del 10 %. Dentro de las 48 horas previas, o si no te presentas, no hay devolución.',
    'health', 'El recorrido supera los 4.000 m s. n. m. No es apto para personas con enfermedades cardiacas o respiratorias ni para mujeres embarazadas. Avísanos si tienes alguna necesidad alimentaria especial.',
    'transport', 'Servicio privado en una cómoda unidad, con recojo y retorno a tu hotel. El itinerario puede variar por condiciones externas como carreteras en mantenimiento o lluvias.',
    'meeting', 'Te recogemos en tu hotel alrededor de las 07:00.'),
  extras = '[]'::jsonb,
  featured = true, active = true
where slug = 'parque-nacional-sajama';

-- ---------------------------------------------------------------------------
-- 4. Toro Toro · 2 días / 1 noche · tour grupal (itinerario oficial)
-- ---------------------------------------------------------------------------
update public.tours set
  title = 'Toro Toro: experiencia de 2 días',
  destination = 'Parque Nacional Torotoro, Potosí',
  duration = '2 días · 1 noche',
  difficulty = 'Moderate',
  type_label = 'Tour grupal',
  activity_label = 'Aventura y ecoturismo',
  departures = 'Salidas los sábados',
  start_end = 'Cochabamba → Cochabamba',
  best_season = '', max_altitude = '',
  badge = 'Tour grupal', badge_variant = 'adventure',
  image = '/assets/tours/toro-toro/01.webp',
  gallery = '["/assets/tours/toro-toro/01.webp","/assets/tours/toro-toro/02.webp"]'::jsonb,
  price_group = 90, price_semi = null, price_private = null, price_child = null,
  price_tiers = '{}'::jsonb,
  min_pax = 1,
  languages = array['Español'],
  free_cancellation_hours = 48, default_cutoff_hours = 24,
  default_start_times = array['06:30'],
  pickup_included = true, pay_later = true,
  meeting_point = 'Terminal de buses de Cochabamba o tu hotel, a las 06:30 del día 1.',
  summary = array[
    'Dos días en el Parque Nacional Torotoro, tierra de dinosaurios, cañones y cavernas: huellas fosilizadas, las cascadas de El Vergel, la Ciudad de Itas y la caverna de Umajalanta, la más profunda de Bolivia.',
    'Sale todos los sábados desde Cochabamba en servicio compartido, con guía local, hospedaje con baño privado y alimentación incluida.'],
  highlights = array[
    'Huellas fosilizadas de dinosaurio y la huella gigante de saurópodo',
    'Cañón de Torotoro, puentes naturales de piedra y mirador colgante',
    'Cascadas y pozas naturales de El Vergel',
    'Ciudad de Itas: formaciones rocosas, laberintos y pinturas rupestres',
    'Caverna de Umajalanta: estalactitas, estalagmitas y peces ciegos',
    'Museo de piedra Pachamama Wasi'],
  itinerary = $j$[
    {"day":1,"title":"Cochabamba – Torotoro: cañón, huellas de dinosaurio y El Vergel","meals":["Almuerzo","Cena"],"stay":"Hospedaje con baño privado",
     "description":"Te recogemos a las 06:30 en la terminal de buses de Cochabamba o en tu hotel para partir hacia Torotoro (de 4 a 5 horas, con una parada técnica). Al llegar nos instalamos en el hospedaje y disfrutamos de un almuerzo de bienvenida. Por la tarde recorremos el circuito del Cañón de Torotoro: huellas fosilizadas de dinosaurio, puentes naturales de piedra, el mirador colgante y la huella gigante de saurópodo. Bajamos al fondo del cañón hasta las cascadas de El Vergel para nadar en sus pozas naturales, en una caminata activa de unas 4 horas. De regreso al pueblo visitamos el museo de piedra Pachamama Wasi, cenamos y descansamos en el hotel.",
     "activities":["06:30 · Recojo en la terminal o en tu hotel","Viaje a Torotoro y almuerzo de bienvenida","Circuito del cañón: huellas de dinosaurio y mirador colgante","Cascadas y pozas de El Vergel","Museo de piedra Pachamama Wasi","Cena y descanso"]},
    {"day":2,"title":"Ciudad de Itas y caverna de Umajalanta","meals":["Desayuno","Almuerzo"],
     "description":"Desayunamos temprano, a las 06:00, y subimos a la imponente Ciudad de Itas, una meseta de altura con enormes formaciones rocosas, laberintos naturales y antiguas pinturas rupestres. Almorzamos en las cabañas de Umajalanta y nos equipamos con casco y linterna para explorar la caverna de Umajalanta, el sistema de cuevas más profundo de Bolivia, con sus formaciones de estalactitas y estalagmitas y sus peces ciegos endémicos. Al final de la tarde emprendemos el retorno a Cochabamba; llegamos a la terminal de buses o a tu hotel entre las 21:00 y las 22:00.",
     "activities":["06:00 · Desayuno","Ciudad de Itas","Almuerzo en las cabañas de Umajalanta","Caverna de Umajalanta con casco y linterna","21:00 – 22:00 · Llegada a Cochabamba"]}
  ]$j$::jsonb,
  included = array[
    'Recojo en la terminal de buses de Cochabamba',
    'Transporte: ida y vuelta Cochabamba – Torotoro',
    'Hospedaje: 1 noche con baño privado',
    'Guía: guía profesional (español)',
    'Alimentación: 2 almuerzos, 1 desayuno y 1 cena',
    'Entradas: ingreso al Parque Nacional Torotoro',
    'Equipo: casco y linterna',
    'Fotos digitales'],
  not_included = array[
    'Bus ida y vuelta La Paz – Cochabamba',
    'Entrada al museo Pachamama Wasi (10 Bs)',
    'Comidas y bebidas extra'],
  what_to_bring = $j$[
    {"emoji":"","title":"Dos mudas de ropa","detail":""},
    {"emoji":"","title":"Traje de baño","detail":"Para las pozas de El Vergel."},
    {"emoji":"","title":"Bloqueador solar","detail":""},
    {"emoji":"","title":"Calzado cómodo de trekking","detail":""},
    {"emoji":"","title":"Sombrero o gorra","detail":""},
    {"emoji":"","title":"Cámara","detail":""},
    {"emoji":"","title":"Gafas de sol","detail":""},
    {"emoji":"","title":"Repelente de insectos","detail":""}
  ]$j$::jsonb,
  info = jsonb_build_object(
    'cancellation', 'Puedes cancelar hasta 48 horas antes del inicio y te reembolsamos el total menos un cargo administrativo del 10 %. Dentro de las 48 horas previas, o si no te presentas, no hay devolución.',
    'health', 'Exigencia física moderada. No es apto para niños menores de 5 años ni para personas alérgicas a los insectos.',
    'transport', 'Servicio compartido con salida solo los sábados. Cualquier demora externa (bus o vuelo) implica un costo adicional para alcanzar el servicio compartido. El itinerario puede variar por condiciones externas como carreteras en mantenimiento o lluvias.',
    'meeting', 'Terminal de buses de Cochabamba o tu hotel, a las 06:30 del día 1.'),
  extras = '[]'::jsonb,
  featured = true, active = true
where slug = 'toro-toro';

-- ---------------------------------------------------------------------------
-- 5. Salidas abiertas (120 días): Sajama a diario, Toro Toro los sábados.
--    Cupos de arranque; se ajustan en Disponibilidad.
-- ---------------------------------------------------------------------------
insert into public.tour_dates (tour_id, date, capacity, start_time, cutoff_hours)
select t.id, d::date, 8, time '07:00', 24
from public.tours t
cross join generate_series(
  (now() at time zone 'America/La_Paz')::date + 2,
  (now() at time zone 'America/La_Paz')::date + 120, interval '1 day') d
where t.slug = 'parque-nacional-sajama'
  and not exists (select 1 from public.tour_dates x where x.tour_id = t.id and x.date = d::date);

insert into public.tour_dates (tour_id, date, capacity, start_time, cutoff_hours)
select t.id, d::date, 12, time '06:30', 24
from public.tours t
cross join generate_series(
  (now() at time zone 'America/La_Paz')::date + 2,
  (now() at time zone 'America/La_Paz')::date + 120, interval '1 day') d
where t.slug = 'toro-toro' and extract(dow from d) = 6
  and not exists (select 1 from public.tour_dates x where x.tour_id = t.id and x.date = d::date);

-- ---------------------------------------------------------------------------
-- 6. Testimonios generales (los que ya mostraba el sitio), ahora administrables.
-- ---------------------------------------------------------------------------
insert into public.reviews (tour_id, author_name, rating, title, body, status, source, created_at, published_at)
select null, v.name, 5, v.title, v.body, 'published', 'manual', v.d::timestamptz, v.d::timestamptz
from (values
  ('Giulia M.',  'Quisiera volver otra vez', 'Gracias a Fabiola, Jhomayra, Wilmer y Eloy por la experiencia más increíble de ese viaje en Bolivia. Fue todo perfecto.', '2024-09-04'),
  ('Cecilia D.', 'Excelencia y amabilidad', 'Excelente el servicio, coordinación, puntualidad y organización. Carlos, el chófer, un conocedor profesional que inspira confianza total; Sonia, excelente cocinera; Mariana, con una atención que va más allá.', '2024-08-05'),
  ('Silvia R.',  'Increíble viaje al Salar de Uyuni y sus islas', 'Viajamos con Rubén y Sonia tres días seguidos y recorrimos todo el salar de Uyuni y sus islas. Sonia nos cocinaba comida casera inolvidable y Rubén nos hizo de guía.', '2024-09-19'),
  ('Andrés C.',  'La mejor experiencia en Bolivia', 'Pasamos 7 días recorriendo el país con Homeland y todo fue perfecto, desde la organización del itinerario hasta los pequeños detalles. Volveré a viajar con ellos seguro.', '2024-07-22'),
  ('Mariana P.', 'Increíble atención y profesionalismo', 'El equipo de Homeland nos trató como reyes durante todo el viaje. Los guías, súper preparados, y los hoteles, increíbles. Sin duda la mejor agencia que contraté en mi vida.', '2024-10-11'),
  ('Roberto F.', 'Paisajes que dejan sin aliento', 'Hicimos el tour del Salar de Uyuni y fue mágico. El atardecer con el espejo de agua fue lo más bonito que he visto en mi vida. Gracias, Homeland, por hacerlo posible.', '2024-03-03'),
  ('Patricia L.','Viaje inolvidable a la Amazonía', 'Tres días en la selva con guías locales expertos. Aprendimos sobre plantas medicinales, vimos delfines rosados y monos. Una experiencia única que recordaremos siempre.', '2024-11-15'),
  ('Diego M.',   'Todo perfecto de principio a fin', 'Desde la primera llamada por WhatsApp hasta el último día, todo fue excelente. Los precios justos, los guías simpáticos, los lugares soñados. Homeland es de confianza total.', '2024-06-08'),
  ('Carolina V.','Cumplieron cada expectativa', 'Teníamos muchas expectativas del viaje a Bolivia y Homeland las superó todas. La Paz, Uyuni, Copacabana, todo increíble. El guía Jhonathan, un crack.', '2024-12-27')
) as v(name, title, body, d)
where not exists (select 1 from public.reviews);

commit;
