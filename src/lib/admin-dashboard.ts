import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchDashboardOverview, type ReservationRow } from '@/lib/api';

export const DASHBOARD_PERIODS = [
  { id: '7d', label: 'Últimos 7 días', days: 7 },
  { id: '30d', label: 'Últimos 30 días', days: 30 },
  { id: '90d', label: 'Últimos 3 meses', days: 90 },
  { id: '365d', label: 'Último año', days: 365 },
  { id: 'custom', label: 'Personalizar fechas', days: 0 },
] as const;
export type DashboardPeriod = typeof DASHBOARD_PERIODS[number]['id'];
export interface DashboardRange { from: string; to: string }

const dayFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/La_Paz', year: 'numeric', month: '2-digit', day: '2-digit',
});

export function operatorDay(date = new Date()): string {
  const parts = dayFormatter.formatToParts(date);
  return ['year', 'month', 'day'].map((key) => parts.find((p) => p.type === key)?.value).join('-');
}

export function shiftDay(day: string, offset: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function daysInRange(range: DashboardRange): number {
  return Math.round((Date.parse(range.to) - Date.parse(range.from)) / 86400000) + 1;
}

export const dashboardDate = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString('es-BO', {
  timeZone: 'America/La_Paz', day: 'numeric', month: 'short',
});

export interface DashboardBooking extends Pick<ReservationRow,
  'id' | 'code' | 'tour_id' | 'pax' | 'group_discount' | 'coupon_discount' | 'total' | 'status' | 'created_at'
> {
  profile: { full_name: string } | null;
  tour: { title: string; image: string; destination: string } | null;
}
export interface DashboardTour { id: string; image: string; destination: string }

async function fetchActivity(sb: SupabaseClient, range: DashboardRange, signal: AbortSignal) {
  const from = shiftDay(range.from, -daysInRange(range));
  const rows: DashboardBooking[] = [];
  // Page every row so charts and comparisons do not silently stop at the API row limit.
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await sb.from('reservations')
      .select('id,code,tour_id,pax,group_discount,coupon_discount,total,status,created_at,profile:reservations_user_id_fkey(full_name),tour:reservations_tour_id_fkey(title,image,destination)')
      .gte('created_at', `${from}T00:00:00-04:00`)
      .lt('created_at', `${shiftDay(range.to, 1)}T00:00:00-04:00`)
      .order('created_at', { ascending: false }).order('id')
      .range(offset, offset + 499).abortSignal(signal);
    if (error) throw error;
    rows.push(...(data as unknown as DashboardBooking[]));
    if (data.length < 500) return rows;
  }
}

export async function fetchDashboardData(sb: SupabaseClient, range: DashboardRange, signal: AbortSignal) {
  const [overview, activity, tours] = await Promise.all([
    fetchDashboardOverview(sb, range.from, range.to),
    fetchActivity(sb, range, signal),
    sb.from('tours').select('id,image,destination').abortSignal(signal),
  ]);
  if (tours.error) throw tours.error;
  return { overview, activity, tours: (tours.data ?? []) as DashboardTour[] };
}

export type DashboardData = Awaited<ReturnType<typeof fetchDashboardData>>;

export function dashboardMoney(amount: number): string {
  return `US$ ${new Intl.NumberFormat('es-BO', { maximumFractionDigits: 0 }).format(amount)}`;
}
