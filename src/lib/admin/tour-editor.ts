import { buildTourPayload, normalizeTiers, type AdminTour, type CategoryRow, type TourFormData } from '@/lib/api';
import type { PriceTier, TourType } from '@/lib/types';
import { copyTourForm, makeTourForm } from '@/lib/tour-form';

export interface TourOperation {
  code: string | null; rating: number | null; review_count: number; languages: string[];
  free_cancellation_hours: number; pay_later: boolean; pickup_included: boolean;
  meeting_point: string; meeting_lat: number | null; meeting_lng: number | null;
  price_child: number | null; child_age_max: number; min_pax: number;
  default_start_times: string[]; default_cutoff_hours: number;
  /** Precio por persona según el tamaño del grupo, por modalidad. */
  price_tiers: Partial<Record<TourType, PriceTier[]>>;
  /** Texto corto de salidas: «Salidas diarias», «Sábados»… */
  departures: string;
}
export type AdminTourForm = TourFormData & TourOperation;

export const TIER_TYPES: { type: TourType; label: string; priceKey: 'price_group' | 'price_semi' | 'price_private' }[] = [
  { type: 'group', label: 'Grupo compartido', priceKey: 'price_group' },
  { type: 'semi', label: 'Semiprivado', priceKey: 'price_semi' },
  { type: 'private', label: 'Privado', priceKey: 'price_private' },
];

export function makeAdminTourForm(tour?: AdminTour | null): AdminTourForm {
  const operation = tour as (AdminTour & Partial<TourOperation>) | null | undefined;
  return {
    ...makeTourForm(tour), code: operation?.code ?? null,
    rating: operation?.rating ?? null, review_count: operation?.review_count ?? 0,
    languages: [...(operation?.languages ?? ['Español', 'English'])],
    free_cancellation_hours: operation?.free_cancellation_hours ?? 24,
    pay_later: operation?.pay_later ?? false, pickup_included: operation?.pickup_included ?? false,
    meeting_point: operation?.meeting_point ?? '', meeting_lat: operation?.meeting_lat ?? null,
    meeting_lng: operation?.meeting_lng ?? null, price_child: operation?.price_child ?? null,
    child_age_max: operation?.child_age_max ?? 11, min_pax: operation?.min_pax ?? 1,
    default_start_times: [...(operation?.default_start_times ?? [])],
    default_cutoff_hours: operation?.default_cutoff_hours ?? 12,
    price_tiers: normalizeTiers(operation?.price_tiers),
    departures: operation?.departures ?? '',
  };
}

export function copyAdminTourForm(data: AdminTourForm, slugs: string[]): AdminTourForm {
  // El código es único. Las reseñas pertenecen al producto original.
  return { ...structuredClone(data), ...copyTourForm(data, slugs), code: null, rating: null, review_count: 0 };
}

export function validateTourOperation(data: TourOperation): string {
  const integer = (n: number, min: number, max: number) => Number.isInteger(n) && n >= min && n <= max;
  if (!data.languages.length || data.languages.some(language => !language.trim())) return 'Registra al menos un idioma.';
  if (!integer(data.min_pax, 1, 8)) return 'El mínimo de participantes debe ser un entero entre 1 y 8.';
  if (!integer(data.child_age_max, 0, 17)) return 'La edad máxima del niño debe ser un entero entre 0 y 17.';
  if (![data.free_cancellation_hours, data.default_cutoff_hours].every(n => integer(n, 0, 8760))) return 'Los plazos deben ser horas enteras entre 0 y 8760.';
  if (data.default_start_times.some(time => !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))) return 'Las horas deben tener formato HH:MM, por ejemplo 08:00, 14:30.';
  if (data.price_child !== null && (!Number.isFinite(data.price_child) || data.price_child < 0 || data.price_child > 99999999.99)) return 'La tarifa infantil debe estar entre 0 y 99.999.999,99 USD.';
  if (data.meeting_lat !== null && (!Number.isFinite(data.meeting_lat) || Math.abs(data.meeting_lat) > 90)) return 'La latitud debe estar entre −90 y 90.';
  if (data.meeting_lng !== null && (!Number.isFinite(data.meeting_lng) || Math.abs(data.meeting_lng) > 180)) return 'La longitud debe estar entre −180 y 180.';
  if ((data.meeting_lat === null) !== (data.meeting_lng === null)) return 'Completa ambas coordenadas o deja las dos vacías.';
  if (data.rating !== null && (!Number.isFinite(data.rating) || data.rating < 0 || data.rating > 5)) return 'La valoración debe estar entre 0 y 5.';
  if (!integer(data.review_count, 0, 2147483647)) return 'El número de reseñas debe ser un entero igual o mayor que cero.';
  if ((data.departures ?? '').length > 80) return 'El texto de salidas admite hasta 80 caracteres.';
  for (const { type, label } of TIER_TYPES) {
    const tiers = data.price_tiers?.[type] ?? [];
    if (tiers.some(tier => !integer(tier.min, 1, 8))) return `${label}: «desde» debe ser un número de viajeros entre 1 y 8.`;
    if (tiers.some(tier => !Number.isFinite(tier.price) || tier.price < 0 || tier.price > 99999999.99)) return `${label}: cada tramo necesita un precio válido.`;
    if (new Set(tiers.map(tier => tier.min)).size !== tiers.length) return `${label}: hay dos tramos que empiezan en el mismo número de viajeros.`;
  }
  return '';
}

export function buildAdminTourPayload(data: AdminTourForm, categories: CategoryRow[]) {
  const { code, languages, free_cancellation_hours, pay_later, pickup_included,
    meeting_point, meeting_lat, meeting_lng, price_child, child_age_max, min_pax,
    default_start_times, default_cutoff_hours, price_tiers, departures } = data;
  const tiers: Partial<Record<TourType, PriceTier[]>> = {};
  for (const { type } of TIER_TYPES) {
    const list = [...(price_tiers?.[type] ?? [])].sort((a, b) => a.min - b.min).map(tier => ({ min: tier.min, price: tier.price }));
    if (list.length) tiers[type] = list;
  }
  // La valoración y el número de reseñas no se envían: los calcula la base
  // de datos a partir de las reseñas publicadas.
  return { ...buildTourPayload(data, categories), code: code?.trim() || null,
    price_tiers: tiers, departures: (departures ?? '').trim(),
    languages: [...new Set(languages.map(language => language.trim()))], free_cancellation_hours,
    pay_later, pickup_included, meeting_point: meeting_point.trim(), meeting_lat, meeting_lng,
    price_child, child_age_max, min_pax, default_start_times: [...new Set(default_start_times)], default_cutoff_hours };
}

export function reorderTourImages(images: string[], from: number, to: number): string[] {
  if (from < 0 || from >= images.length || to < 0 || to >= images.length) return images;
  const next = [...images];
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
}
