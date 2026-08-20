import type { Coupon } from '@/lib/types';

export const coupons: Record<string, Coupon> = {
  WELCOME10: { code: 'WELCOME10', discount: 10 },
  BOLIVIA15: { code: 'BOLIVIA15', discount: 15 },
  SUMMER20: { code: 'SUMMER20', discount: 20 },
};

export function findCoupon(code: string): Coupon | undefined {
  return coupons[code.trim().toUpperCase()];
}
