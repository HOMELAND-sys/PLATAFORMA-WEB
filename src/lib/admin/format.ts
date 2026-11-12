import { operatorDay } from '@/lib/admin-dashboard';
export { operatorDay, shiftDay } from '@/lib/admin-dashboard';
export const dateLabel = (d: string, long = false) => d ? new Date(`${d}T12:00:00Z`).toLocaleDateString('es-BO', { timeZone: 'America/La_Paz', day: 'numeric', month: long ? 'long' : 'short', year: 'numeric', ...(long ? { weekday: 'long' as const } : {}) }) : 'Sin fecha';
export const timeLabel = (d: string | null) => d ? new Date(d).toLocaleString('es-BO', { timeZone: 'America/La_Paz', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
export const usd = (n: number) => `US$ ${Number(n).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const bob = (n: number) => `Bs. ${Number(n).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const initials = (n: string) => n.trim().split(/\s+/).slice(0,2).map(x => x[0]).join('').toUpperCase();
export const flag = (n: string) => {
  const countries: Record<string,string> = { bolivia:'BO',perú:'PE',peru:'PE',chile:'CL',argentina:'AR',brasil:'BR',brazil:'BR',españa:'ES',spain:'ES',francia:'FR',france:'FR',alemania:'DE',germany:'DE','estados unidos':'US',usa:'US','united states':'US','reino unido':'GB',uk:'GB',colombia:'CO',ecuador:'EC',méxico:'MX',mexico:'MX' };
  const iso = countries[n.toLowerCase()] ?? (/^[a-z]{2}$/i.test(n) ? n.toUpperCase() : '');
  return iso ? String.fromCodePoint(...[...iso].map(c => 127397+c.charCodeAt(0))) : '🌐';
};
export const statusLabels: Record<string,string> = { pendiente_pago: 'Pendiente de pago', confirmada: 'Confirmada', completada: 'Completada', cancelada: 'Cancelada' };
export const sourceLabels: Record<string,string> = { web:'Web', oficina:'Oficina', whatsapp:'WhatsApp', agencia:'Agencia', gyg:'GetYourGuide', otro:'Otro' };
export const methodLabels: Record<string,string> = { efectivo:'Efectivo', transferencia:'Transferencia', qr:'QR', link:'Link' };
export function ticketCode(raw: string): string {
  let code = raw.trim();
  try { code = new URL(code).searchParams.get('code') ?? code; } catch { /* permite el código directo */ }
  return /^HT-[A-Z0-9]{5}$/i.test(code) ? code.toUpperCase() : '';
}
export function ticketState(b: { status: string; checked_in_at: string | null; date_row: { date: string } | null }): string {
  if (b.status === 'cancelada') return 'Cancelada';
  if (b.checked_in_at || b.status === 'completada') return 'Ya usado';
  if (b.date_row?.date !== operatorDay()) return 'Otra fecha';
  if (b.status !== 'confirmada') return 'Pago pendiente';
  return 'Válido';
}

export function validDay(value: string | null): string | null {
  if(!value||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
  const date=new Date(value+'T12:00:00Z');
  return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value?value:null;
}
