import { allRows, sb } from './core';
import type { AuditEntry, Booking, ManualBookingInput } from './types';
import { validateManualBooking } from './validation';
const selection = '*,tour:reservations_tour_id_fkey(title,slug,summary,included,meeting_point),profile:reservations_user_id_fkey(full_name,phone),date_row:reservations_tour_date_id_fkey(date,start_time),passengers:booking_passengers_reservations_id_fkey(*)';
// El contacto guardado pertenece a la reserva; el perfil solo suple datos antiguos.
function withContact(row: Booking, userEmail = ''): Booking {
  const passengers = [...row.passengers].sort((a,b) => a.position-b.position);
  const lead = passengers.find(p => p.is_lead) ?? passengers[0];
  return { ...row, passengers,
    client_name: row.contact_name || lead?.name || row.profile?.full_name || 'Sin nombre',
    client_email: row.contact_email || userEmail || '',
    client_phone: row.contact_phone || row.profile?.phone || '',
    client_country: row.contact_country || lead?.country || '',
  };
}
export async function bookings() {
  const rows = await allRows<Booking>((a,b) => sb().from('reservations').select(selection).order('created_at', { ascending: false }).order('id').range(a,b));
  const emails = new Map<string,string>();
  const ids = [...new Set(rows.filter(r => !r.contact_email).map(r => r.user_id).filter((id): id is string => Boolean(id)))];
  for (let i=0; i<ids.length; i+=100) {
    const { data, error } = await sb().from('v_user_emails').select('id,email').in('id', ids.slice(i,i+100));
    if (error) throw error;
    for (const row of data ?? []) emails.set(row.id, row.email);
  }
  return rows.map(row => withContact(row, emails.get(row.user_id ?? '')));
}
export const auditFor = (id: string) => allRows<AuditEntry>((a,b) => sb().from('audit_log').select('id,action,before,after,created_at').eq('entity', 'reservations').eq('entity_id', id).order('created_at').order('id').range(a,b));
export async function manualBooking(input: ManualBookingInput) {
  validateManualBooking(input);
  const { data, error } = await sb().rpc('admin_create_manual_booking', input);
  if (error) throw error;
  window.dispatchEvent(new Event('admin-data-changed'));
  return data as Booking;
}
export async function bookingStatus(id: string, status: string, reason?: string) {
  const { error } = await sb().rpc('update_reservation_status', { p_reservation_id: id, p_status: status, p_cancellation_reason: reason ?? null });
  if (error) throw error;
  window.dispatchEvent(new Event('admin-data-changed'));
}
export async function bookingPatch(id: string, patch: { voucher_sent_at?: string; refund_pending?: boolean }) {
  const { error } = await sb().from('reservations').update(patch).eq('id', id).select('id').single();
  if (error) throw error;
  window.dispatchEvent(new Event('admin-data-changed'));
}
export async function checkIn(code: string) {
  const { data, error } = await sb().rpc('admin_check_in', { p_code: code });
  if (error) throw error;
  window.dispatchEvent(new Event('admin-data-changed'));
  return data as Booking;
}

// Consulta actual al validar un QR: evita anunciar como libre un ticket usado
// por otro puesto desde que se cargo el listado de reservas.
export async function ticketByCode(code: string): Promise<Booking | null> {
  const { data, error } = await sb().from('reservations').select(selection).eq('code', code).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as Booking;
  return withContact(row);
}
