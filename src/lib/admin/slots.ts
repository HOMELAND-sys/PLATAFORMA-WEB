import { allRows, sb } from './core';
import type { Slot } from './types';
export const slots = (from: string, to: string, tourId = '') => allRows<Slot>((a, b) => {
  let query = sb().from('v_tour_dates_free').select('*').gte('date', from).lte('date', to);
  if (tourId) query = query.eq('tour_id', tourId);
  return query.order('date').order('start_time').order('id').range(a, b);
});
export async function updateSlots(ids: string[], patch: { blocked?: boolean; capacity?: number; cutoff?: number }) {
  const { data, error } = await sb().rpc('admin_bulk_update_slots', { p_ids: ids, p_blocked: patch.blocked ?? null, p_capacity: patch.capacity ?? null, p_cutoff: patch.cutoff ?? null });
  if (error) throw error;
  if (Number(data) !== ids.length) throw new Error('Algunas franjas ya no existen. Actualiza la lista.');
  window.dispatchEvent(new Event('admin-data-changed'));
}
export async function generateSlots(input: { p_tour_id: string; p_from: string; p_to: string; p_weekdays: number[]; p_start_times: string[]; p_capacity: number; p_cutoff: number | null }) {
  const { data, error } = await sb().rpc('admin_generate_slots', input);
  if (error) throw error;
  return Number(data);
}
