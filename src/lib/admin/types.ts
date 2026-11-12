import type { PassengerRow, ReservationRow, TourRow } from '@/lib/api';
import type { AgencyCompanyType, BookingSource, SpecialOfferKind, TransferKind } from '@/lib/types';

export interface Product extends Pick<TourRow, 'id' | 'title' | 'slug' | 'active' | 'price_group' | 'price_semi' | 'price_private'> {
  code: string | null;
  price_child: number | null;
  child_age_max: number;
  min_pax: number;
  default_cutoff_hours: number;
  default_start_times: string[];
}
export interface Slot {
  id: string; tour_id: string; date: string; start_time: string | null;
  capacity: number; occupied: number; booked: number; free: number;
  blocked: boolean; cutoff_hours: number; bookable: boolean;
}
export interface Agency {
  id: string; company: string; contact: string; phone: string;
  other_contacts: { name: string; phone: string; email?: string }[];
  address: string; company_type: AgencyCompanyType; email: string;
  notes: string; active: boolean; created_at: string;
}
export type AgencyInput = Omit<Agency, 'id' | 'created_at'>;
export interface Booking extends Omit<ReservationRow, 'user_id' | 'payment_method'> {
  user_id: string | null;
  payment_method: 'link' | 'qr' | 'efectivo' | 'transferencia';
  special_offer_id: string | null; offer_discount: number;
  source: BookingSource; agency_id: string | null;
  contact_name: string | null; contact_email: string | null; contact_phone: string | null; contact_country: string | null;
  adults: number | null; children: number; internal_notes: string | null;
  checked_in_at: string | null; voucher_sent_at: string | null; created_by: string | null;
  tour: { title: string; slug: string; summary: string[]; included: string[]; meeting_point: string } | null;
  date_row: { date: string; start_time: string | null } | null;
  profile: { full_name: string; phone: string } | null;
  passengers: PassengerRow[];
  client_name: string; client_email: string; client_phone: string; client_country: string;
}
export interface ManualBookingInput {
  p_slot_id: string; p_tour_type: string; p_adults: number; p_children: number;
  p_contact_name: string; p_contact_phone: string; p_contact_country: string;
  p_passengers: { name: string; doc: string; country: string; meal: string }[];
  p_source: Exclude<BookingSource, 'web'>; p_agency_id: string | null;
  p_contact_email: string | null; p_total: number | null;
  p_paid: boolean; p_payment_method: string; p_notes: string | null;
}
export interface Transfer {
  id: string; kind: TransferKind; agency_id: string; reservation_id: string | null;
  travel_date: string; tour_id: string | null; service: string; pax: number;
  names: string; amount: number; currency: 'BOB' | 'USD'; status: 'pendiente' | 'pagado';
  paid_at: string | null; notes: string; created_at: string;
}
export type TransferInput = Omit<Transfer, 'id' | 'created_at' | 'paid_at'>;
export interface Offer {
  id: string; name: string; tour_ids: string[]; kind: SpecialOfferKind; discount_pct: number;
  activity_from: string; activity_to: string; weekdays: number[] | null;
  start_times: string[] | null; booking_notice_days: number | null;
  seats_limit: number | null; seats_sold: number; status: 'active' | 'paused'; created_at: string;
}
export type OfferInput = Omit<Offer, 'id' | 'created_at' | 'seats_sold'>;
export interface CouponRow { code: string; discount_pct: number; active: boolean; valid_from: string | null; valid_to: string | null }
export interface AuditEntry { id: number; action: string; before: Record<string, unknown> | null; after: Record<string, unknown> | null; created_at: string }
