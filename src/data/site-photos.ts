// Fotos reales optimizadas de public/assets/tours (índice: manifest.json).
// Solo piezas estáticas del sitio: las fichas de tour usan image/gallery de la base.

export interface SitePhoto {
  src: string;
  sm: string;
  alt: string;
}

export interface HeroSlide extends SitePhoto {
  destination: string;
}

function photo(folder: string, n: string, alt: string): SitePhoto {
  return {
    src: `/assets/tours/${folder}/${n}.webp`,
    sm: `/assets/tours/${folder}/${n}-sm.webp`,
    alt,
  };
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    ...photo('salar-de-uyuni', '01', 'Atardecer reflejado en el espejo de agua del Salar de Uyuni'),
    destination: 'Salar de Uyuni',
  },
  {
    ...photo('teleferico-la-paz', '01', 'Cabinas del teleférico sobrevolando la ciudad de La Paz'),
    destination: 'La Paz',
  },
  {
    ...photo('lago-titicaca-copacabana', '01', 'Bahía de Copacabana con sus botes sobre el lago Titicaca'),
    destination: 'Lago Titicaca',
  },
  {
    ...photo('reserva-eduardo-avaroa', '01', 'Flamencos en la laguna colorada de la Reserva Eduardo Avaroa'),
    destination: 'Reserva Eduardo Avaroa',
  },
  {
    ...photo('valle-de-la-luna', '01', 'Formaciones erosionadas y senderos del Valle de la Luna'),
    destination: 'Valle de la Luna',
  },
];

export const TOURS_HERO = photo(
  'condoriri',
  '01',
  'Nevados de la cordillera Condoriri sobre el sendero de trekking',
);

export const REVIEWS_BG = photo('salar-de-uyuni', '02', '');

export const FOOTER_CTA = photo(
  'condoriri',
  '03',
  'Trekking hacia los nevados de la Cordillera Condoriri',
);

export const CATEGORY_PHOTOS: Record<string, SitePhoto> = {
  'lapaz-top': photo('teleferico-la-paz', '01', 'Teleférico de La Paz cruzando la ciudad'),
  'lapaz-city': photo('mirador-alaxpacha', '01', 'Viajero fotografiando los valles desde un mirador de La Paz'),
  uyuni: photo('salar-de-uyuni', '03', 'Cactus gigantes de la Isla Incahuasi frente al Salar de Uyuni'),
  amazon: photo('madidi-national-park', '01', 'Guacamayos rojos volando sobre la selva del Madidi'),
  trekking: photo('condoriri', '01', 'Trekking con llamas hacia los nevados del Condoriri'),
  'bolivia-top': photo('toro-toro', '01', 'Cañón profundo del Parque Nacional Toro Toro'),
  peru: photo('machu-picchu', '01', 'Ciudadela inca de Machu Picchu entre nubes'),
};