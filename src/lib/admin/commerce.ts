import { allRows, sb } from './core';
import type { Agency, CouponRow, Offer, Transfer } from './types';
import { validateCoupon } from './validation';
export const agencies = () => allRows<Agency>((a,b) => sb().from('agencies').select('*').order('company').order('id').range(a,b));
export const transfers = (kind?: 'pase' | 'endoso') => allRows<Transfer>((a,b) => {
  let query = sb().from('agency_transfers').select('*');
  if (kind) query = query.eq('kind', kind);
  return query.order('travel_date', { ascending: false }).order('id').range(a,b);
});
export const offers = () => allRows<Offer>((a,b) => sb().from('special_offers').select('*').order('created_at', { ascending: false }).order('id').range(a,b));
export const coupons = () => allRows<CouponRow>((a,b) => sb().from('coupons').select('*').order('code').range(a,b));
export async function saveCoupon(input: CouponRow, existing = false) {
  validateCoupon(input);
  const query = existing ? sb().from('coupons').update(input).eq('code', input.code) : sb().from('coupons').insert(input);
  const { error } = await query.select('code').single();
  if (error) throw error;
}
export async function deleteCoupon(code: string) {
  const { error } = await sb().from('coupons').delete().eq('code', code).select('code').single();
  if (error) throw error;
}
