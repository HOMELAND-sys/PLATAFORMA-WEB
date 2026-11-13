import type { SpecialOffer } from './api';

export type CategoryId =
  | 'lapaz-city'
  | 'lapaz-top'
  | 'uyuni'
  | 'amazon'
  | 'trekking'
  | 'bolivia-top'
  | 'peru';

export type Difficulty = 'Easy' | 'Moderate' | 'Challenging';

export type TourType = 'group' | 'semi' | 'private';

export type MealOption = 'Normal' | 'Vegetariano' | 'Vegano' | 'Sin gluten';

export interface TourExtra {
  id: string;
  name: string;
  sub: string;
  price: number;
  kind: 'free' | 'paid' | 'pay-on-site';
}

export interface ItineraryDay {
  day: number;
  title: string;
  meals: string[];
  stay?: string;
  description: string;
  activities: string[];
}

export interface TourInfo {
  cancellation: string;
  health: string;
  transport: string;
  meeting: string;
}

export interface Tour {
  id?: string;
  featured?: boolean;
  slug: string;
  title: string;
  image: string;
  gallery: string[];
  badge?: string;
  badgeVariant?: 'popular' | 'adventure' | 'cultural';
  category: CategoryId;
  categories: CategoryId[];
  duration: string;
  difficulty: Difficulty;
  activityLabel: string;
  typeLabel: string;
  price: number;
  destination: string;
  startEnd: string;
  bestSeason: string;
  maxAltitude: string;
  summary: string[];
  highlights: string[];
  itinerary: ItineraryDay[];
  included: string[];
  notIncluded: string[];
  whatToBring: { emoji: string; title: string; detail: string }[];
  info: TourInfo;
  tourTypes: Record<TourType, number>;
  extras: TourExtra[];
  // Migración 0011 — opcionales: pueden no existir aún en la base.
  rating?: number | null;
  reviewCount?: number | null;
  languages?: string[] | null;
  freeCancellationHours?: number | null;
  payLater?: boolean | null;
  pickupIncluded?: boolean | null;
  meetingPoint?: string | null;
  meetingLat?: number | null;
  meetingLng?: number | null;
  priceChild?: number | null;
  childAgeMax?: number | null;
  minPax?: number | null;
  defaultStartTimes?: string[] | null;
  defaultCutoffHours?: number | null;
  code?: string | null;
  /** Descuento % de una oferta especial vigente (special_offers). */
  offerPct?: number;
  /** Id de la oferta especial vigente (para enviarlo a la RPC de reserva). */
  offerId?: string;
  /** Oferta completa vigente: permite validar aplicabilidad a fecha/franja/pax. */
  offer?: SpecialOffer | null;
}

export interface Review {
  stars: number;
  title: string;
  text: string;
  name: string;
  date: string;
  avatar: string;
}

export interface Coupon {
  code: string;
  discount: number;
}

export interface Passenger {
  id: string;
  name: string;
  doc: string;
  country: string;
  meal: string;
  isLead?: boolean;
}

export interface BookingSelection {
  tourSlug: string;
  tourType: TourType;
  date: string;
  pax: number;
  extras: string[];
  perPerson: number;
  extrasTotal: number;
  subtotal: number;
  // Campos opcionales del flujo de disponibilidad real (migración 0011).
  tourDateId?: string | null;
  offerId?: string | null;
  offerPct?: number;
  adults?: number;
  children?: number;
  startTime?: string | null;
}

export interface BookingResult {
  id: string;
  createdAt: string;
  transactionId: string;
  selection: BookingSelection;
  passenger: Passenger;
  total: number;
}

export interface Category {
  id: CategoryId | 'all';
  label: string;
  emoji: string;
  image?: string;
}
// Tipos adicionales del back-office; no alteran los contratos del sitio público.
export type BookingSource = 'web' | 'oficina' | 'whatsapp' | 'agencia' | 'gyg' | 'otro';
export type AgencyCompanyType = 'operadora' | 'agencia' | 'hotel' | 'otro';
export type TransferKind = 'pase' | 'endoso';
export type SpecialOfferKind = 'limited' | 'early_bird' | 'last_minute';
