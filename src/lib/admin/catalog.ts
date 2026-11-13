import type { AdminTour, CategoryRow, TourRow } from '@/lib/api';
import { allRows, sb } from './core';

// El marcador solo identifica borradores importados y nunca etiqueta tours activos.
export function isDraftTour(tour: { active: boolean; summary: string[] }): boolean {
  return !tour.active && Boolean(tour.summary[0]?.trimStart().startsWith('[BORRADOR]'));
}

export async function deleteTour(id: string): Promise<void> {
  const { data, error } = await sb().rpc('admin_delete_tour', { p_tour_id: id });
  if (error) throw error;
  if (data !== id) throw new Error('No se pudo confirmar el borrado del tour. Actualiza el catálogo.');
  window.dispatchEvent(new Event('admin-data-changed'));
}

export async function catalogForAdmin(): Promise<{ tours: AdminTour[]; categories: CategoryRow[] }> {
  const [rows, categories, reservations] = await Promise.all([
    allRows<TourRow>((a, b) => sb().from('tours').select('*').order('created_at').order('id').range(a, b)),
    allRows<CategoryRow>((a, b) => sb().from('categories').select('*').order('position').order('id').range(a, b)),
    allRows<{ tour_id: string }>((a, b) => sb().from('reservations').select('id,tour_id').order('id').range(a, b)),
  ]);
  const counts = new Map<string, number>();
  for (const reservation of reservations) counts.set(reservation.tour_id, (counts.get(reservation.tour_id) ?? 0) + 1);
  const slugs = new Map(categories.map(category => [category.id, category.slug]));
  return { categories, tours: rows.map(tour => ({ ...tour,
    primary_category_slug: slugs.get(tour.category_id ?? '') ?? '',
    category_slugs: (tour.category_ids ?? []).map(id => slugs.get(id) ?? '').filter(Boolean),
    reservation_count: counts.get(tour.id) ?? 0,
  })) };
}
