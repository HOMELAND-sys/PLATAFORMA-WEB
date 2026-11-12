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
  if (msg.includes('capacity_below_occupied')) return 'El cupo no puede ser menor que los participantes ya reservados. ' + msg.split(':').slice(1).join(':');
  if (msg.includes('date_full')) return 'No hay cupo suficiente. Actualiza la disponibilidad e intenta de nuevo.';
  if (msg.includes('cutoff_passed')) return 'Ha pasado la hora límite de esta franja. Actualízala en Disponibilidad si corresponde.';
  if (msg.includes('slot_blocked')) return 'La franja está bloqueada. Desbloquéala en Disponibilidad para reservar.';
  if (msg.includes('23503') || msg.includes('foreign key')) return 'Este registro tiene movimientos vinculados. Desactívalo o revisa sus vínculos antes de eliminarlo.';
  if (msg.includes('duplicate') || msg.includes('23505')) return 'Ya existe un registro con ese código o franja.';
  return msg;
}
export const products = () => allRows<Product>((from, to) => sb().from('tours').select('id,title,slug,active,code,price_group,price_semi,price_private,price_child,child_age_max,min_pax,default_cutoff_hours,default_start_times').order('title').order('id').range(from, to));
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
