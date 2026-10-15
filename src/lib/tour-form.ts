import type { AdminTour, TourFormData } from '@/lib/api';

export const DIFFICULTY_LABELS = { Easy: 'Fácil', Moderate: 'Moderada', Challenging: 'Exigente' } as const;

export const slugifyTour = (text: string) => text.toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export function makeTourForm(tour?: AdminTour | null): TourFormData {
  return {
    slug: tour?.slug ?? '', title: tour?.title ?? '', image: tour?.image ?? '',
    gallery: [...(tour?.gallery ?? [])], badge: tour?.badge ?? '', badge_variant: tour?.badge_variant ?? null,
    primary_category_slug: tour?.primary_category_slug ?? '', category_slugs: [...(tour?.category_slugs ?? [])],
    duration: tour?.duration ?? '', difficulty: tour?.difficulty ?? 'Easy', activity_label: tour?.activity_label ?? '',
    type_label: tour?.type_label ?? '', destination: tour?.destination ?? '', start_end: tour?.start_end ?? '',
    best_season: tour?.best_season ?? '', max_altitude: tour?.max_altitude ?? '',
    price_group: tour?.price_group ?? 0, price_semi: tour?.price_semi ?? null, price_private: tour?.price_private ?? null,
    summary: [...(tour?.summary ?? [])], highlights: [...(tour?.highlights ?? [])],
    itinerary: structuredClone(tour?.itinerary ?? []), included: [...(tour?.included ?? [])], not_included: [...(tour?.not_included ?? [])],
    what_to_bring: structuredClone(tour?.what_to_bring ?? []),
    info: { cancellation: '', health: '', transport: '', meeting: '', ...tour?.info },
    extras: structuredClone(tour?.extras ?? []), featured: tour?.featured ?? false, active: tour?.active ?? true,
  };
}

export function copyTourForm(data: TourFormData, existingSlugs: string[]): TourFormData {
  const copy = structuredClone(data);
  const base = `${data.slug || slugifyTour(data.title) || 'tour'}-copia`;
  let slug = base;
  for (let suffix = 2; existingSlugs.includes(slug); suffix++) slug = `${base}-${suffix}`;
  return { ...copy, slug, title: `${data.title} (copia)`, active: false, featured: false };
}

export const tourMoney = (value: number | null) => value === null || Number(value) === 0
  ? 'Consultar' : new Intl.NumberFormat('es-BO', { maximumFractionDigits: 2 }).format(value);

export const cleanTourLines = (lines: string[]) => lines.map((line) => line.trim()).filter(Boolean);
