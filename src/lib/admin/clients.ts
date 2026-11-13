import type { AdminClientRow, ClientBooking, ReservationRow } from '@/lib/api';
import { allRows, sb } from './core';

export const clients = () => allRows<AdminClientRow>((a, b) => sb().from('v_admin_clients').select('*').order('created_at', { ascending: false }).order('id').range(a, b));

export async function clientBookings(userId: string): Promise<ClientBooking[]> {
  const rows = await allRows<ReservationRow & {
    tour: { slug: string; title: string } | null;
    profile: { full_name: string } | null;
    date_row: { date: string } | null;
  }>((a, b) => sb().from('reservations').select('*,tour:reservations_tour_id_fkey(slug,title),profile:reservations_user_id_fkey(full_name),date_row:reservations_tour_date_id_fkey(date)').eq('user_id', userId).order('created_at', { ascending: false }).order('id').range(a, b));
  return rows.map(row => ({ ...row, tour_slug: row.tour?.slug ?? '', tour_title: row.tour?.title ?? '',
    client_name: row.profile?.full_name ?? '', client_email: '', tour_date: row.date_row?.date ?? '',
  }));
}
