import type { BookingSelection, Tour } from '@/lib/types';

export const EXCHANGE_RATE_BOB = 6.9;

export function calcAvailabilityTotal(
  tour: Tour,
  tourType: BookingSelection['tourType'],
  pax: number,
  extraIds: string[],
): { perPerson: number; extrasTotal: number; subtotal: number } {
  const perPerson = tour.tourTypes[tourType];
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
  return `US$ ${amount}`;
}

export function formatBob(amount: number): string {
  return `BOB ${amount.toLocaleString('es-BO')}`;
}
