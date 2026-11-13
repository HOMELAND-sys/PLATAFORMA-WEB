import type { BookingSelection, PriceTier, Tour, TourType } from '@/lib/types';

type Priced = Pick<Tour, 'tourTypes' | 'priceTiers' | 'availableTypes'>;

/** Escala de precios de un tipo de servicio (vacía si no tiene). */
export function tiersFor(tour: Pick<Tour, 'priceTiers'>, type: TourType): PriceTier[] {
  return tour.priceTiers?.[type] ?? [];
}

export function hasTiers(tour: Pick<Tour, 'priceTiers'>, type: TourType): boolean {
  return tiersFor(tour, type).length > 0;
}

/**
 * Precio por persona para un tipo y una cantidad de viajeros. Igual que
 * tour_unit_price() en la base: el escalón con mayor `min` que no supere a pax;
 * sin escala (o por debajo del primer escalón) rige el precio base del tipo.
 */
export function unitPrice(
  tour: Pick<Tour, 'tourTypes' | 'priceTiers'>,
  type: TourType,
  pax: number,
): number {
  const tier = [...tiersFor(tour, type)].reverse().find((t) => t.min <= pax);
  return tier ? tier.price : (tour.tourTypes[type] ?? 0);
}

/** Precio "desde": el menor precio por persona que el producto puede llegar a tener. */
export function fromPrice(tour: Priced): number {
  const prices: number[] = [];
  for (const type of tour.availableTypes) {
    prices.push(tour.tourTypes[type]);
    for (const t of tiersFor(tour, type)) prices.push(t.price);
  }
  return prices.length > 0 ? Math.min(...prices) : 0;
}

/** Formato de importes en USD: sin decimales si es entero, con 2 si no. */
export function money(amount: number): string {
  const n = Number.isFinite(amount) ? amount : 0;
  return n.toLocaleString('es-BO', {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

export const EXCHANGE_RATE_BOB = 6.9;

export function calcAvailabilityTotal(
  tour: Tour,
  tourType: BookingSelection['tourType'],
  pax: number,
  extraIds: string[],
): { perPerson: number; extrasTotal: number; subtotal: number } {
  const perPerson = unitPrice(tour, tourType, pax);
  const extrasTotal = tour.extras
    .filter((e) => extraIds.includes(e.id) && e.kind === 'paid')
    .reduce((sum, e) => sum + e.price, 0);
  const subtotal = perPerson * pax + extrasTotal;
  return { perPerson, extrasTotal, subtotal };
}

export const GROUP_DISCOUNT_TIERS: { minPax: number; rate: number; label: string }[] = [
  { minPax: 3, rate: 0.05, label: '5% OFF' },
  { minPax: 5, rate: 0.08, label: '8% OFF' },
];

export const GROUP_DISCOUNT_MAX_PAX = 8;

export function getGroupDiscountRate(pax: number): number {
  if (pax < GROUP_DISCOUNT_TIERS[0].minPax) return 0;
  if (pax > GROUP_DISCOUNT_MAX_PAX) return GROUP_DISCOUNT_TIERS[GROUP_DISCOUNT_TIERS.length - 1].rate;
  let rate = 0;
  for (const tier of GROUP_DISCOUNT_TIERS) {
    if (pax >= tier.minPax) rate = tier.rate;
  }
  return rate;
}

export function getGroupDiscountLabel(pax: number): string {
  if (pax < GROUP_DISCOUNT_TIERS[0].minPax) return '';
  const capped = Math.min(pax, GROUP_DISCOUNT_MAX_PAX);
  const tier = [...GROUP_DISCOUNT_TIERS].reverse().find((t) => capped >= t.minPax);
  return tier ? tier.label : '';
}

export const GROUP_DISCOUNT_MIN_PAX = GROUP_DISCOUNT_TIERS[0].minPax;
export const GROUP_DISCOUNT_RATE = GROUP_DISCOUNT_TIERS[0].rate;

export interface BookingTotals {
  base: number;
  groupDiscount: number;
  groupDiscountRate: number;
  couponDiscount: number;
  total: number;
}

export function calcBookingTotals(
  subtotal: number,
  pax: number,
  couponDiscountPct = 0,
): BookingTotals {
  const base = subtotal;
  const groupDiscountRate = getGroupDiscountRate(pax);
  const groupDiscount = groupDiscountRate > 0 ? Math.round(base * groupDiscountRate) : 0;
  const afterGroup = base - groupDiscount;
  const couponDiscount = Math.round(afterGroup * (couponDiscountPct / 100));
  const total = afterGroup - couponDiscount;
  return { base, groupDiscount, groupDiscountRate, couponDiscount, total };
}

export function usdToBob(usd: number): number {
  return Math.round(usd * EXCHANGE_RATE_BOB);
}

export function formatUsd(amount: number): string {
  return `US$ ${money(amount)}`;
}

export function formatBob(amount: number): string {
  return `BOB ${amount.toLocaleString('es-BO')}`;
}
