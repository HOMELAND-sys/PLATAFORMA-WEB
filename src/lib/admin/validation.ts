import type { CouponRow, ManualBookingInput, OfferInput, TransferInput } from './types';

export function validDay(value: string | null): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(value + 'T12:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null;
}

export function integerIn(value: number, min: number, max = 2147483647): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
}
export function validAmount(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 99999999.99;
}
export function requireRange(from: string, to: string): void {
  if (!validDay(from) || !validDay(to) || from > to) throw new Error('Selecciona un rango de fechas válido, con el inicio anterior o igual al fin.');
}
export function httpUrl(value: string): boolean {
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
}
export function validateManualBooking(input: ManualBookingInput): void {
  if (!input.p_slot_id) throw new Error('Selecciona una franja de salida.');
  if (!integerIn(input.p_adults, 0, 8) || !integerIn(input.p_children, 0, 8) || !integerIn(input.p_adults + input.p_children, 1, 8)) throw new Error('Registra entre 1 y 8 participantes, con cantidades enteras.');
  if (!input.p_contact_name.trim() || !input.p_contact_phone.trim() || !input.p_contact_country.trim()) throw new Error('Completa nombre, teléfono y país del contacto.');
  if (input.p_passengers.length !== input.p_adults + input.p_children || input.p_passengers.some(p => !p.name.trim())) throw new Error('Completa el nombre de todos los pasajeros.');
  if (input.p_source === 'agencia' && !input.p_agency_id) throw new Error('Selecciona la agencia que realiza la reserva.');
  if (input.p_total !== null && !validAmount(input.p_total)) throw new Error('El total debe estar entre 0 y 99.999.999,99 USD.');
}
export function validateTransfer(input: TransferInput): void {
  if (!input.agency_id) throw new Error('Selecciona una agencia.');
  if (!input.service.trim()) throw new Error('El servicio es obligatorio.');
  if (!validDay(input.travel_date)) throw new Error('Selecciona una fecha de viaje válida.');
  if (!integerIn(input.pax, 1, 10000)) throw new Error('El número de pasajeros debe ser un entero entre 1 y 10.000.');
  if (!validAmount(input.amount)) throw new Error('El monto debe estar entre 0 y 99.999.999,99.');
}
export function validateOffer(input: OfferInput, sold: number): void {
  requireRange(input.activity_from, input.activity_to);
  if (!input.name.trim() || !input.tour_ids.length) throw new Error('Indica un nombre y selecciona al menos un tour.');
  if (!integerIn(input.discount_pct, 1, 90)) throw new Error('El descuento debe ser un entero entre 1 y 90 %.');
  if (input.kind !== 'limited' && !integerIn(input.booking_notice_days ?? 0, 1, 3660)) throw new Error('El aviso de reserva debe ser un entero entre 1 y 3660 días.');
  if (input.seats_limit !== null && (!integerIn(input.seats_limit, 1, 1000000) || input.seats_limit < sold)) throw new Error('El límite de plazas debe ser entero y no menor que las plazas vendidas.');
  if (input.weekdays !== null && (!input.weekdays.length || input.weekdays.some(day => !integerIn(day, 0, 6)))) throw new Error('Selecciona al menos un día válido de la semana.');
}
export function validateCoupon(input: CouponRow): void {
  if (!/^[A-Z0-9_-]{2,40}$/.test(input.code)) throw new Error('Usa un código de 2 a 40 letras, números, guiones o guiones bajos.');
  if (!integerIn(input.discount_pct, 0, 100)) throw new Error('El descuento debe ser un entero entre 0 y 100 %.');
  if ((input.valid_from && !validDay(input.valid_from)) || (input.valid_to && !validDay(input.valid_to))) throw new Error('Selecciona fechas de vigencia válidas.');
  if (input.valid_from && input.valid_to) requireRange(input.valid_from, input.valid_to);
}
