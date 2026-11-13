import { getSupabase } from '@/lib/supabase';
import type { Product } from './types';
export const sb = () => getSupabase();
interface Response { data: unknown[] | null; error: { message: string } | null }
export async function allRows<T>(query: (from: number, to: number) => PromiseLike<Response>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await query(from, from + 499);
    if (error) throw error;
    rows.push(...(data ?? []) as T[]);
    if ((data?.length ?? 0) < 500) return rows;
  }
}
export function messageOf(error: unknown): string {
  const msg = error && typeof error === 'object' && 'message' in error ? String(error.message) : 'No se pudo completar la operación.';
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  if (msg.includes('capacity_below_occupied')) return 'El cupo no puede ser menor que los participantes ya reservados. ' + msg.split(':').slice(1).join(':');
  if (msg.includes('date_full')) return 'No hay cupo suficiente. Actualiza la disponibilidad e intenta de nuevo.';
  if (msg.includes('cutoff_passed')) return 'Ha pasado la hora límite de esta franja. Actualízala en Disponibilidad si corresponde.';
  if (msg.includes('slot_blocked')) return 'La franja está bloqueada. Desbloquéala en Disponibilidad para reservar.';
  if (code === '23503' || msg.includes('23503') || msg.includes('foreign key')) return 'Este registro tiene movimientos vinculados. Desactívalo o revisa sus vínculos antes de eliminarlo.';
  if (code === '23505' || msg.includes('duplicate') || msg.includes('23505')) return 'Ya existe un registro con ese código o franja.';
  const messages: Record<string, string> = {
    invalid_transition: 'La reserva cambió de estado. Actualiza la lista antes de continuar.',
    reservation_not_found: 'La reserva ya no está disponible. Actualiza la lista.',
    cancellation_reason_required: 'Escribe el motivo de la cancelación.',
    tour_inactive: 'El tour está inactivo o ya no existe. Elige otro producto.',
    tour_not_found: 'El tour ya no existe. Actualiza el catálogo.',
    tour_has_bookings: 'El tour tiene reservas. Desactívalo para conservar el historial.',
    tour_type_unavailable: 'Esta modalidad no tiene una tarifa disponible.',
    date_not_open: 'Esta salida ya no está disponible. Actualiza las franjas.',
    invalid_slots: 'La selección de franjas cambió. Actualiza la disponibilidad.',
    slots_required: 'Selecciona al menos una franja.',
    agency_required: 'Selecciona una agencia.', agency_inactive: 'La agencia está inactiva o ya no existe.',
    contact_required: 'Completa nombre, teléfono y país del contacto.',
    invalid_passengers: 'Completa los datos de todos los pasajeros.',
    invalid_pax: 'Revisa el número de participantes. ' + (msg.split(':').slice(1).join(':').trim() || 'Se permiten entre 1 y 8.'),
    invalid_total: 'Revisa el total: debe ser un importe válido igual o mayor que cero.',
    invalid_start_times: 'Escribe las horas con formato HH:MM.',
    invalid_range: 'Revisa el rango de fechas: debe ser válido y no superar 367 días.',
    invalid_offer_tours: 'Uno de los tours seleccionados ya no existe. Actualiza los productos.',
    offer_full: 'No quedan suficientes plazas con descuento.',
    ticket_not_found: 'Código no encontrado. Revisa el ticket.',
    ticket_cancelled: 'La reserva está cancelada.', ticket_used: 'Este ticket ya fue utilizado.',
    ticket_other_date: 'El ticket corresponde a otra fecha de viaje.',
    ticket_unpaid: 'Confirma el pago antes de aceptar el ticket.',
    not_authenticated: 'La sesión venció. Inicia sesión nuevamente.',
    forbidden: 'Tu sesión no tiene permiso para realizar esta operación.',
  };
  const match = Object.keys(messages).find(key => msg.includes(key));
  if (match) return messages[match];
  if (/Failed to fetch|fetch failed|NetworkError/i.test(msg)) return 'No se pudo conectar con el servidor. Revisa la conexión y vuelve a intentarlo.';
  return msg;
}
export const products = () => allRows<Product>((from, to) => sb().from('tours').select('id,title,slug,active,code,price_group,price_semi,price_private,price_child,price_tiers,child_age_max,min_pax,default_cutoff_hours,default_start_times').order('title').order('id').range(from, to));
export async function saveRow(table: 'agencies' | 'agency_transfers' | 'special_offers', input: object, id?: string) {
  const query = id ? sb().from(table).update(input).eq('id', id) : sb().from(table).insert(input);
  const { data, error } = await query.select('id').single();
  if (error) throw error;
  window.dispatchEvent(new Event('admin-data-changed'));
  return data.id as string;
}
export async function deleteRow(table: 'agencies' | 'agency_transfers' | 'special_offers', id: string) {
  const { error } = await sb().from(table).delete().eq('id', id).select('id').single();
  if (error) throw error;
  window.dispatchEvent(new Event('admin-data-changed'));
}
export async function setting<T>(key: string, fallback: T): Promise<T> {
  const { data, error } = await sb().from('settings').select('value').eq('key', key).maybeSingle();
  if (error) throw error;
  return data?.value as T ?? fallback;
}
export async function saveSetting(key: string, value: object) {
  const { error } = await sb().from('settings').upsert({ key, value }, { onConflict: 'key' }).select('key').single();
  if (error) throw error;
}
