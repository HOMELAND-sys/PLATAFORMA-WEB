import { allRows, sb } from './core';
import type { Slot } from './types';
import { integerIn, requireRange } from './validation';
export const slots = (from: string, to: string, tourId = '') => allRows<Slot>((a, b) => {
  requireRange(from, to);
  let query = sb().from('v_tour_dates_free').select('*').gte('date', from).lte('date', to);
  if (tourId) query = query.eq('tour_id', tourId);
  return query.order('date').order('start_time').order('id').range(a, b);
});
export async function updateSlots(ids: string[], patch: { blocked?: boolean; capacity?: number; cutoff?: number }) {
  if (!ids.length || new Set(ids).size !== ids.length) throw new Error('Selecciona franjas válidas, sin duplicados.');
  if (patch.blocked === undefined && patch.capacity === undefined && patch.cutoff === undefined) throw new Error('Indica al menos un cambio para las franjas.');
  if (patch.capacity !== undefined && !integerIn(patch.capacity, 1)) throw new Error('El cupo debe ser un número entero igual o mayor que 1.');
  if (patch.cutoff !== undefined && !integerIn(patch.cutoff, 0, 8760)) throw new Error('La hora límite debe ser un entero entre 0 y 8760 horas.');
  const { data, error } = await sb().rpc('admin_bulk_update_slots', { p_ids: ids, p_blocked: patch.blocked ?? null, p_capacity: patch.capacity ?? null, p_cutoff: patch.cutoff ?? null });
  if (error) throw error;
  if (Number(data) !== ids.length) throw new Error('Algunas franjas ya no existen. Actualiza la lista.');
  window.dispatchEvent(new Event('admin-data-changed'));
}
export async function generateSlots(input: { p_tour_id: string; p_from: string; p_to: string; p_weekdays: number[]; p_start_times: string[]; p_capacity: number; p_cutoff: number | null }) {
  requireRange(input.p_from, input.p_to);
  if (Date.parse(input.p_to) - Date.parse(input.p_from) > 366 * 86400000) throw new Error('El rango no puede superar 367 días.');
  if (!input.p_tour_id || !input.p_weekdays.length || input.p_weekdays.some(day => !integerIn(day, 0, 6))) throw new Error('Selecciona un producto y al menos un día válido de la semana.');
  if (!input.p_start_times.length || input.p_start_times.length > 24 || input.p_start_times.some(time => !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))) throw new Error('Indica entre 1 y 24 horas con formato HH:MM.');
  if (!integerIn(input.p_capacity, 1, 10000) || (input.p_cutoff !== null && !integerIn(input.p_cutoff, 0, 8760))) throw new Error('Revisa el cupo y la hora límite: deben ser números enteros dentro del rango permitido.');
  const { data, error } = await sb().rpc('admin_generate_slots', input);
  if (error) throw error;
  window.dispatchEvent(new Event('admin-data-changed'));
  return Number(data);
}
