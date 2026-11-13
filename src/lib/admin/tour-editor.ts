import { buildTourPayload, type AdminTour, type CategoryRow, type TourFormData } from '@/lib/api';
import { copyTourForm, makeTourForm } from '@/lib/tour-form';

export interface TourOperation {
  code: string | null; rating: number | null; review_count: number; languages: string[];
  free_cancellation_hours: number; pay_later: boolean; pickup_included: boolean;
  meeting_point: string; meeting_lat: number | null; meeting_lng: number | null;
  price_child: number | null; child_age_max: number; min_pax: number;
  default_start_times: string[]; default_cutoff_hours: number;
}
export type AdminTourForm = TourFormData & TourOperation;

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
  return '';
}

export function buildAdminTourPayload(data: AdminTourForm, categories: CategoryRow[]) {
  const { code, rating, review_count, languages, free_cancellation_hours, pay_later, pickup_included,
    meeting_point, meeting_lat, meeting_lng, price_child, child_age_max, min_pax,
    default_start_times, default_cutoff_hours } = data;
  return { ...buildTourPayload(data, categories), code: code?.trim() || null, rating, review_count,
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
