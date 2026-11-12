// Datos derivados del voucher, compartidos entre la vista animada y el PDF.
import type { MyBooking, PassengerRow } from '@/lib/api';
import type { TourExtra, TourType } from '@/lib/types';
import { EXCHANGE_RATE_BOB, usdToBob } from '@/lib/pricing';

export const WHATSAPP_NUMBER = '59176012345';
export const SUPPORT_PHONE = '+591 760 12345';

export type BookingStatus = MyBooking['status'];
export type Tone = 'green' | 'amber' | 'red';

export const STATUS_META: Record<BookingStatus, { label: string; stamp: string; stampSub: string; tone: Tone }> = {
  pendiente_pago: { label: 'Pendiente de pago', stamp: 'RESERVADA', stampSub: 'PAGO PENDIENTE', tone: 'amber' },
  confirmada: { label: 'Confirmada', stamp: 'CONFIRMADA', stampSub: 'BUEN VIAJE', tone: 'green' },
  completada: { label: 'Completada', stamp: 'COMPLETADA', stampSub: 'GRACIAS', tone: 'green' },
  cancelada: { label: 'Cancelada', stamp: 'CANCELADA', stampSub: 'SIN VALIDEZ', tone: 'red' },
};

/** Colores de tinta del sello por tono (hex y RGB para jsPDF). */
export const TONE_INK: Record<Tone, { hex: string; rgb: [number, number, number] }> = {
  green: { hex: '#3f6a1f', rgb: [63, 106, 31] },
  amber: { hex: '#b26f12', rgb: [178, 111, 18] },
  red: { hex: '#b3261e', rgb: [179, 38, 30] },
};

export const TOUR_TYPE_LABEL: Record<TourType, string> = {
  group: 'Compartido',
  semi: 'Semiprivado',
  private: 'Privado',
};

export const EXTRA_KIND_LABEL: Record<TourExtra['kind'], string> = {
  free: 'Incluido',
  paid: 'Agregado',
  'pay-on-site': 'Se paga en destino',
};

export const DIFFICULTY_LABEL: Record<string, string> = {
  Easy: 'Fácil',
  Moderate: 'Moderada',
  Challenging: 'Exigente',
};

/* ---------------------------------------------------------------- fechas */

const asDate = (d: string) => new Date(`${d.slice(0, 10)}T12:00:00`);

export function addDays(dateStr: string, days: number): string {
  const d = asDate(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function durationDays(duration: string): number {
  const m = duration.match(/(\d+)/);
  return m ? Math.max(1, parseInt(m[1], 10)) : 1;
}

export const fmtDate = (d: string) =>
  d ? asDate(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const fmtDateLong = (d: string) =>
  d
    ? asDate(d).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

/** "19 – 21 nov 2026" / "30 nov – 2 dic 2026" */
export function fmtRange(a: string, b: string): string {
  if (!a) return '—';
  if (!b || a === b) return fmtDate(a);
  const da = asDate(a);
  const db = asDate(b);
  const mon = (d: Date) => d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
  if (da.getFullYear() !== db.getFullYear()) return `${fmtDate(a)} – ${fmtDate(b)}`;
  if (da.getMonth() === db.getMonth()) return `${da.getDate()} – ${db.getDate()} ${mon(db)} ${db.getFullYear()}`;
  return `${da.getDate()} ${mon(da)} – ${db.getDate()} ${mon(db)} ${db.getFullYear()}`;
}

/** Partes de una fecha para los bloques grandes del voucher (12 · NOV · JUE). */
export function dateParts(d: string) {
  if (!d) return { day: '—', month: '', weekday: '', year: '' };
  const date = asDate(d);
  const clean = (s: string) => s.replace('.', '').toUpperCase();
  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: clean(date.toLocaleDateString('es-ES', { month: 'short' })),
    weekday: clean(date.toLocaleDateString('es-ES', { weekday: 'short' })),
    year: String(date.getFullYear()),
  };
}

/* ---------------------------------------------------------------- ruta */

export interface RouteInfo {
  origin: string;
  highlight: string;
  end: string;
}

/** "La Paz / Copacabana" + "Lago Titicaca, Bolivia" → salida, destino destacado y regreso. */
export function parseRoute(startEnd: string, destination?: string): RouteInfo {
  const parts = startEnd
    .split(/\s*(?:\/|→|->)\s*|\s+[-–]\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const origin = parts[0] || 'Punto de encuentro';
  const end = parts[parts.length - 1] || origin;
  const highlight = (destination ?? '').split(',')[0].trim() || end;
  return { origin, highlight, end };
}

/** Extrae la hora de presentación del texto de punto de encuentro ("… 07:30 AM."). */
export function meetingTime(meeting?: string): string | null {
  const m = meeting?.match(/\b(\d{1,2}:\d{2})\s*(AM|PM|am|pm)?/);
  return m ? `${m[1]}${m[2] ? ` ${m[2].toUpperCase()}` : ''}` : null;
}

/* ---------------------------------------------------------------- precios */

const num = (n: unknown) => Number(n) || 0;

export const money = (n: number) =>
  `US$ ${num(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export const bob = (usd: number) => `BOB ${usdToBob(num(usd)).toLocaleString('es-BO')}`;

export interface PriceBreakdown {
  perPerson: number;
  base: number;
  paidExtras: TourExtra[];
  freeExtras: TourExtra[];
  onSiteExtras: TourExtra[];
  groupDiscount: number;
  couponCode: string | null;
  couponDiscount: number;
  total: number;
  totalBob: number;
  rate: number;
}

export function priceBreakdown(b: MyBooking): PriceBreakdown {
  const extras = b.extras ?? [];
  const paidExtras = extras.filter((e) => e.kind === 'paid');
  const extrasTotal = paidExtras.reduce((s, e) => s + num(e.price), 0);
  const base = Math.max(0, num(b.subtotal) - extrasTotal);
  return {
    perPerson: b.pax > 0 ? Math.round((base / b.pax) * 100) / 100 : base,
    base,
    paidExtras,
    freeExtras: extras.filter((e) => e.kind === 'free'),
    onSiteExtras: extras.filter((e) => e.kind === 'pay-on-site'),
    groupDiscount: num(b.group_discount),
    couponCode: b.coupon_code,
    couponDiscount: num(b.coupon_discount),
    total: num(b.total),
    totalBob: usdToBob(num(b.total)),
    rate: EXCHANGE_RATE_BOB,
  };
}

/* ---------------------------------------------------------------- pasajeros */

export function leadPassenger(b: MyBooking): PassengerRow | undefined {
  return b.passengers.find((p) => p.is_lead) ?? b.passengers[0];
}

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('') || '·';

/* ---------------------------------------------------------------- enlaces */

/** Origen usado en SSR (el cliente usa window.location.origin). */
export const SITE_ORIGIN = 'https://homeland.tours';

export const voucherUrl = (code: string, origin?: string) =>
  `${origin ?? (typeof window !== 'undefined' ? window.location.origin : SITE_ORIGIN)}/confirmation?code=${encodeURIComponent(code)}`;

export const whatsAppUrl = (b: MyBooking) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Hola! Tengo la reserva ${b.code} de "${b.tour_title}" para el ${fmtDate(b.tour_date)} con ${b.pax} pasajero(s). Quiero coordinar el pago.`,
  )}`;

/* ---------------------------------------------------------------- código de barras */

/** PRNG determinista (mulberry32) a partir de un texto: mismo código → mismas barras. */
export function seededRandom(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Barras decorativas [x, ancho] en una pista de `width` unidades. */
export function barcodeBars(code: string, width = 220): Array<[number, number]> {
  const rnd = seededRandom(code || 'HOMELAND');
  const bars: Array<[number, number]> = [];
  let x = 0;
  // guardas de inicio
  bars.push([0, 2], [3, 1]);
  x = 6;
  while (x < width - 8) {
    const w = 1 + Math.floor(rnd() * 3);
    const gap = 1 + Math.floor(rnd() * 2);
    bars.push([x, w]);
    x += w + gap;
  }
  bars.push([width - 4, 1], [width - 2, 2]);
  return bars;
}

/* ---------------------------------------------------------------- calendario */

function icsEscape(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
}

export function buildIcs(b: MyBooking): string {
  const days = durationDays(b.tour_duration);
  const start = b.tour_date.replace(/-/g, '');
  const end = addDays(b.tour_date, days).replace(/-/g, '');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const meeting = b.tour_info?.meeting ?? b.tour_start_end;
  const desc = [
    `Reserva ${b.code} · ${b.pax} pasajero(s)`,
    meeting ? `Punto de encuentro: ${meeting}` : '',
    `Voucher: ${voucherUrl(b.code)}`,
  ]
    .filter(Boolean)
    .join('\n');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Homeland Tours//Voucher//ES',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${b.code}@homeland.tours`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${icsEscape(`${b.tour_title} · Homeland Tours`)}`,
    `LOCATION:${icsEscape(meeting || 'Bolivia')}`,
    `DESCRIPTION:${icsEscape(desc)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadBlob(content: BlobPart, type: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
