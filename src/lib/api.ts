import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ItineraryDay,
  PriceTier,
  Tour,
  TourExtra,
  TourInfo,
  TourType,
} from '@/lib/types';
import { fromPrice, getGroupDiscountRate, hasTiers, unitPrice } from '@/lib/pricing';

// ---------------------------------------------------------------------------
// Tipos de fila (forma de la base)
// ---------------------------------------------------------------------------

export interface CategoryRow {
  id: string;
  slug: string;
  label: string;
  emoji: string;
  image: string | null;
  position: number;
}

export interface TourRow {
  id: string;
  slug: string;
  title: string;
  image: string;
  gallery: string[];
  badge: string | null;
  badge_variant: 'popular' | 'adventure' | 'cultural' | null;
  category_id: string | null;
  category_ids: string[];
  duration: string;
  difficulty: Tour['difficulty'];
  activity_label: string;
  type_label: string;
  destination: string;
  start_end: string;
  best_season: string;
  max_altitude: string;
  price_group: number | null;
  price_semi: number | null;
  price_private: number | null;
  summary: string[];
  highlights: string[];
  itinerary: ItineraryDay[];
  included: string[];
  not_included: string[];
  what_to_bring: { emoji: string; title: string; detail: string }[];
  info: TourInfo;
  extras: TourExtra[];
  featured: boolean;
  active: boolean;
}

export interface TourDateFree {
  id: string;
  tour_id: string;
  date: string;
  capacity: number;
  occupied: number;
  free: number;
  // Migración 0011 — opcionales (la vista puede no tenerlas aún).
  start_time?: string | null;
  blocked?: boolean | null;
  bookable?: boolean | null;
  cutoff_hours?: number | null;
  booked?: boolean | null;
}

// Columnas públicas añadidas por la migración 0011: todas opcionales,
// porque la base puede no tenerlas todavía al desplegar el front.
export interface TourPublicColumns {
  rating: number | null;
  review_count: number | null;
  languages: string[] | null;
  free_cancellation_hours: number | null;
  pay_later: boolean | null;
  pickup_included: boolean | null;
  meeting_point: string | null;
  meeting_lat: number | null;
  meeting_lng: number | null;
  price_child: number | null;
  child_age_max: number | null;
  min_pax: number | null;
  default_start_times: string[] | null;
  default_cutoff_hours: number | null;
  code: string | null;
  price_tiers: Partial<Record<TourType, PriceTier[]>> | null;
  departures: string | null;
}

export interface SpecialOffer {
  id: string;
  tour_ids: string[] | null;
  kind: string | null;
  discount_pct: number | null;
  activity_from: string | null;
  activity_to: string | null;
  weekdays?: number[] | null;
  start_times?: string[] | null;
  booking_notice_days?: number | null;
  seats_limit?: number | null;
  seats_sold?: number | null;
  status?: string | null;
}

export interface ReservationRow {
  id: string;
  code: string;
  user_id: string;
  tour_id: string;
  tour_date_id: string;
  tour_type: TourType;
  pax: number;
  adults?: number | null;
  children?: number;
  extras: TourExtra[];
  subtotal: number;
  group_discount: number;
  coupon_code: string | null;
  coupon_discount: number;
  total: number;
  status: 'pendiente_pago' | 'confirmada' | 'completada' | 'cancelada';
  payment_method: 'link' | 'qr';
  cancellation_reason: string | null;
  refund_pending: boolean;
  created_at: string;
  paid_at: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
  reminder_sent_at: string | null;
}

export interface PassengerRow {
  id: string;
  reservations_id: string;
  position: number;
  name: string;
  doc: string;
  country: string;
  meal: string;
  is_lead: boolean;
}

export interface PaymentSettings {
  link: string | null;
  qrUrl: string | null;
  instructions: string | null;
}

// ---------------------------------------------------------------------------
// Mapeo fila → interfaz Tour (la UI sigue igual, sin cambios de diseño)
// ---------------------------------------------------------------------------

export function mapTour(row: TourRow, catSlugById: Map<string, string>): Tour {
  const x = row as TourRow & Partial<TourPublicColumns>;
  const slugs = row.category_ids.map((id) => catSlugById.get(id)).filter(Boolean) as string[];
  const primary = (row.category_id && catSlugById.get(row.category_id)) || slugs[0] || 'uyuni';
  const tourTypes = {
    group: Number(row.price_group ?? 0),
    semi: Number(row.price_semi ?? 0),
    private: Number(row.price_private ?? 0),
  };
  const priceTiers = normalizeTiers(x.price_tiers);
  const availableTypes = (
    [
      ['group', row.price_group],
      ['semi', row.price_semi],
      ['private', row.price_private],
    ] as [TourType, number | null][]
  )
    // Precio 0 significa «a consultar»: esa modalidad no se reserva en línea,
    // salvo que tenga una escala de precios por tamaño de grupo.
    .filter(([t, p]) => p !== null && (Number(p) > 0 || (priceTiers[t]?.length ?? 0) > 0))
    .map(([t]) => t);
  return {
    id: row.id,
    featured: row.featured,
    slug: row.slug,
    title: row.title,
    image: row.image,
    gallery: row.gallery,
    badge: row.badge ?? undefined,
    badgeVariant: row.badge_variant ?? undefined,
    category: primary as Tour['category'],
    categories: slugs as Tour['categories'],
    duration: row.duration,
    difficulty: row.difficulty,
    activityLabel: row.activity_label,
    typeLabel: row.type_label,
    price: fromPrice({ tourTypes, availableTypes, priceTiers }),
    destination: row.destination,
    startEnd: row.start_end,
    bestSeason: row.best_season,
    maxAltitude: row.max_altitude,
    summary: row.summary,
    highlights: row.highlights,
    itinerary: row.itinerary,
    included: row.included,
    notIncluded: row.not_included,
    whatToBring: row.what_to_bring,
    info: row.info,
    tourTypes,
    availableTypes,
    priceTiers,
    departures: x.departures ?? undefined,
    extras: row.extras ?? [],
    rating: x.rating != null ? Number(x.rating) : undefined,
    reviewCount: x.review_count ?? undefined,
    languages: x.languages ?? undefined,
    freeCancellationHours: x.free_cancellation_hours ?? undefined,
    payLater: x.pay_later ?? undefined,
    pickupIncluded: x.pickup_included ?? undefined,
    meetingPoint: x.meeting_point ?? undefined,
    meetingLat: x.meeting_lat ?? undefined,
    meetingLng: x.meeting_lng ?? undefined,
    priceChild: x.price_child != null ? Number(x.price_child) : undefined,
    childAgeMax: x.child_age_max ?? undefined,
    minPax: x.min_pax ?? undefined,
    defaultStartTimes: x.default_start_times ?? undefined,
    defaultCutoffHours: x.default_cutoff_hours ?? undefined,
    code: x.code ?? undefined,
  };
}

/** Limpia la escala de precios que llega de la base (orden ascendente por `min`). */
export function normalizeTiers(raw: unknown): Partial<Record<TourType, PriceTier[]>> {
  const out: Partial<Record<TourType, PriceTier[]>> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const type of ['group', 'semi', 'private'] as TourType[]) {
    const list = (raw as Record<string, unknown>)[type];
    if (!Array.isArray(list)) continue;
    const tiers = list
      .map((t) => ({ min: Number((t as PriceTier)?.min), price: Number((t as PriceTier)?.price) }))
      .filter((t) => Number.isInteger(t.min) && t.min >= 1 && Number.isFinite(t.price) && t.price >= 0)
      .sort((a, b) => a.min - b.min);
    if (tiers.length > 0) out[type] = tiers;
  }
  return out;
}

export function buildCatSlugMap(categories: CategoryRow[]): Map<string, string> {
  return new Map(categories.map((c) => [c.id, c.slug]));
}

// ---------------------------------------------------------------------------
// Catálogo público (RF-04)
// ---------------------------------------------------------------------------

export async function fetchCategories(sb: SupabaseClient): Promise<CategoryRow[]> {
  const { data, error } = await sb.from('categories').select('*').order('position');
  if (error) throw error;
  return (data ?? []) as CategoryRow[];
}

export async function fetchActiveTours(sb: SupabaseClient): Promise<Tour[]> {
  const [catsRes, toursRes, offers] = await Promise.all([
    sb.from('categories').select('*'),
    sb.from('tours').select('*').eq('active', true).order('created_at'),
    fetchActiveOffers(sb),
  ]);
  if (catsRes.error) throw catsRes.error;
  if (toursRes.error) throw toursRes.error;
  const catMap = buildCatSlugMap((catsRes.data ?? []) as CategoryRow[]);
  return ((toursRes.data ?? []) as TourRow[]).map((row) => {
    const tour = mapTour(row, catMap);
    const offer = bestOfferForTour(offers, row.id);
    return offer ? { ...tour, offerPct: offer.discount_pct ?? 0, offerId: offer.id, offer } : tour;
  });
}

export async function fetchActiveTourBySlug(sb: SupabaseClient, slug: string): Promise<Tour | null> {
  const [catsRes, toursRes, offers] = await Promise.all([
    sb.from('categories').select('*'),
    sb.from('tours').select('*').eq('slug', slug).eq('active', true).maybeSingle(),
    fetchActiveOffers(sb),
  ]);
  if (catsRes.error) throw catsRes.error;
  if (toursRes.error) throw toursRes.error;
  const row = toursRes.data as TourRow | null;
  if (!row) return null;
  const tour = mapTour(row, buildCatSlugMap((catsRes.data ?? []) as CategoryRow[]));
  const offer = bestOfferForTour(offers, row.id);
  return offer ? { ...tour, offerPct: offer.discount_pct ?? 0, offerId: offer.id, offer } : tour;
}

// Fecha de hoy en America/La_Paz: la RPC create_booking usa esa zona, no UTC.
function laPazToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

// Ofertas especiales vigentes (migración 0011). Si la tabla no existe aún
// o falla la lectura, el catálogo sigue funcionando sin descuentos.
export async function fetchActiveOffers(sb: SupabaseClient): Promise<SpecialOffer[]> {
  const today = laPazToday();
  const { data, error } = await sb.from('special_offers').select('*');
  if (error) return [];
  return ((data ?? []) as SpecialOffer[]).filter(
    (o) =>
      (o.status ?? 'active') === 'active' &&
      Array.isArray(o.tour_ids) &&
      typeof o.discount_pct === 'number' &&
      o.discount_pct > 0 &&
      (!o.activity_from || o.activity_from <= today) &&
      (!o.activity_to || o.activity_to >= today),
  );
}

export function offerPctForTour(offers: SpecialOffer[], tourId: string): number {
  return offers
    .filter((o) => o.tour_ids?.includes(tourId))
    .reduce((max, o) => Math.max(max, o.discount_pct ?? 0), 0);
}

/** La oferta vigente de mayor descuento para un tour (para enviar su id a la RPC). */
export function bestOfferForTour(offers: SpecialOffer[], tourId: string): SpecialOffer | null {
  return offers
    .filter((o) => o.tour_ids?.includes(tourId))
    .reduce<SpecialOffer | null>(
      (best, o) => (!best || (o.discount_pct ?? 0) > (best.discount_pct ?? 0) ? o : best),
      null,
    );
}

/**
 * Reproduce las condiciones de create_booking (migración 0011) para saber si
 * una oferta aplica a la selección actual antes de enviar p_offer_id:
 * vigencia (hoy y fecha del tour), días de la semana, horarios de salida,
 * anticipación (early_bird / last_minute) y cupos promocionales.
 */
export function offerAppliesToSelection(
  offer: SpecialOffer,
  sel: { tourId?: string; date: string; startTime?: string | null; pax: number; today?: string },
): boolean {
  const today = sel.today ?? laPazToday();
  if ((offer.status ?? 'active') !== 'active') return false;
  if (sel.tourId && offer.tour_ids && !offer.tour_ids.includes(sel.tourId)) return false;
  if (!offer.activity_from || !offer.activity_to) return false;
  if (today < offer.activity_from || today > offer.activity_to) return false;
  if (sel.date < offer.activity_from || sel.date > offer.activity_to) return false;
  if (offer.weekdays && offer.weekdays.length > 0) {
    const dow = new Date(`${sel.date}T00:00:00Z`).getUTCDay(); // 0 = domingo
    if (!offer.weekdays.includes(dow)) return false;
  }
  if (offer.start_times && offer.start_times.length > 0) {
    const hhmm = sel.startTime ? sel.startTime.slice(0, 5) : null;
    if (!hhmm || !offer.start_times.includes(hhmm)) return false;
  }
  const kind = offer.kind ?? 'limited';
  if (kind !== 'limited') {
    const notice = offer.booking_notice_days ?? 0;
    const daysAhead = Math.round(
      (Date.parse(`${sel.date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000,
    );
    if (kind === 'early_bird' && daysAhead < notice) return false;
    if (kind === 'last_minute' && (daysAhead < 0 || daysAhead > notice)) return false;
  }
  if (offer.seats_limit != null && (offer.seats_sold ?? 0) + sel.pax > offer.seats_limit) return false;
  return true;
}

// Miniatura optimizada: /assets/tours/<destino>/NN.webp → NN-sm.webp.
// Cualquier otra URL (Supabase storage, fotos antiguas) pasa intacta.
export function tourThumb(url: string): string {
  const m = url.match(/^(.*\/assets\/tours\/.+)\/(\d+)\.webp$/);
  return m ? `${m[1]}/${m[2]}-sm.webp` : url;
}

// ---------------------------------------------------------------------------
// Disponibilidad real (RF-05)
// ---------------------------------------------------------------------------

export async function fetchTourAvailability(
  sb: SupabaseClient,
  tourId: string,
): Promise<TourDateFree[]> {
  const { data, error } = await sb
    .from('v_tour_dates_free')
    .select('*')
    .eq('tour_id', tourId)
    .gte('date', new Date().toISOString().slice(0, 10))
    .order('date', { ascending: true });
  if (error) throw error;
  return (data ?? []) as TourDateFree[];
}

// ---------------------------------------------------------------------------
// Cupones (checkout)
// ---------------------------------------------------------------------------

export interface CouponCheck {
  code: string;
  discount_pct: number;
  valid: boolean;
}

export async function checkCoupon(sb: SupabaseClient, code: string): Promise<CouponCheck> {
  const { data, error } = await sb.rpc('validate_coupon', { p_code: code });
  if (error) throw error;
  return data as CouponCheck;
}

// ---------------------------------------------------------------------------
// Reservas (RF-06) — la RPC es la única vía de creación
// ---------------------------------------------------------------------------

export interface CreateBookingArgs {
  tourId: string;
  date: string;
  tourType: TourType;
  pax: number;
  extraIds: string[];
  passengers: { name: string; doc: string; country: string; meal: string; isLead?: boolean }[];
  couponCode?: string | null;
  paymentMethod?: 'link' | 'qr';
  tourDateId?: string | null;
  offerId?: string | null;
  children?: number;
  contactName?: string | null;
  contactPhone?: string | null;
}

export interface CreatedBooking {
  reservation: ReservationRow;
  passengers: PassengerRow[];
}

export type BookingErrorCode =
  | 'date_full'
  | 'date_not_open'
  | 'date_past'
  | 'cutoff_passed'
  | 'slot_blocked'
  | 'offer_invalid'
  | 'offer_full'
  | 'coupon_invalid'
  | 'tour_not_found'
  | 'tour_inactive'
  | 'tour_type_unavailable'
  | 'not_authenticated'
  | 'invalid_pax'
  | 'invalid_passengers'
  | 'invalid_contact'
  | 'unknown';

export function bookingErrorInfo(message: string): { code: BookingErrorCode; detail: string } {
  const known: BookingErrorCode[] = [
    'date_full',
    'date_not_open',
    'date_past',
    'cutoff_passed',
    'slot_blocked',
    'offer_invalid',
    'offer_full',
    'coupon_invalid',
    'tour_not_found',
    'tour_inactive',
    'tour_type_unavailable',
    'not_authenticated',
    'invalid_pax',
    'invalid_passengers',
    'invalid_contact',
  ];
  const code = known.find((k) => message.startsWith(k)) ?? 'unknown';
  const detail = message.replace(/^[a-z_]+:?\s*/, '');
  return { code, detail };
}

export async function createBooking(
  sb: SupabaseClient,
  args: CreateBookingArgs,
): Promise<CreatedBooking> {
  const { data, error } = await sb.rpc('create_booking', {
    p_tour_id: args.tourId,
    p_date: args.date,
    p_tour_type: args.tourType,
    p_pax: args.pax,
    p_extras: args.extraIds.map((id) => ({ id })),
    p_passengers: args.passengers,
    p_coupon_code: args.couponCode ?? null,
    p_payment_method: args.paymentMethod ?? 'link',
    p_tour_date_id: args.tourDateId ?? null,
    p_offer_id: args.offerId ?? null,
    p_children: args.children ?? 0,
    p_contact_name: args.contactName ?? null,
    p_contact_phone: args.contactPhone ?? null,
  });
  if (error) {
    // PostgREST devuelve un objeto plano (no Error): sin normalizar, el
    // instanceof Error del checkout es falso y se pierden message/code.
    const err = new Error(error.message || 'unknown');
    (err as Error & { code?: string }).code = error.code ?? undefined;
    throw err;
  }
  return data as CreatedBooking;
}

// Totales en el cliente para el resumen del checkout. Centavos enteros para
// reproducir el orden y el round de PostgreSQL (numeric) de create_booking:
// precio por persona (escala por grupo si existe) → niños → extras →
// grupo (round entero; no aplica con escala) → oferta (round 2 dec.) →
// cupón (round entero, con tope).
export function clientTotals(
  tour: Tour,
  tourType: TourType,
  pax: number,
  extraIds: string[],
  couponDiscountPct = 0,
  offerDiscountPct = 0,
  children = 0,
) {
  const perPerson = unitPrice(tour, tourType, pax);
  const tiered = hasTiers(tour, tourType);
  const kids = Math.max(0, Math.min(children, pax - 1));
  const childPrice =
    tour.priceChild != null && kids > 0 ? Math.min(Number(tour.priceChild), perPerson) : perPerson;
  const perPersonCents = Math.round(perPerson * 100);
  const childCents = Math.round(childPrice * 100);
  const extrasCents = tour.extras
    .filter((e) => extraIds.includes(e.id) && e.kind === 'paid')
    .reduce((sum, e) => sum + Math.round(e.price * 100), 0);
  const subtotalCents = perPersonCents * (pax - kids) + childCents * kids + extrasCents;
  const groupDiscountRate = tiered ? 0 : getGroupDiscountRate(pax);
  const groupPct = Math.round(groupDiscountRate * 100);
  const groupCents = groupPct > 0 ? Math.round((subtotalCents * groupPct) / 10000) * 100 : 0;
  const afterGroupCents = subtotalCents - groupCents;
  const offerPct = Math.round(offerDiscountPct);
  const offerCents = offerPct > 0 ? Math.round((afterGroupCents * offerPct) / 100) : 0;
  const afterOfferCents = afterGroupCents - offerCents;
  const couponPct = Math.round(couponDiscountPct);
  const couponCents =
    couponPct > 0
      ? Math.min(afterOfferCents, Math.round((afterOfferCents * couponPct) / 10000) * 100)
      : 0;
  const totalCents = afterOfferCents - couponCents;
  return {
    perPerson,
    childPrice,
    childrenCount: kids,
    tiered,
    extrasTotal: extrasCents / 100,
    subtotal: subtotalCents / 100,
    base: subtotalCents / 100,
    groupDiscount: groupCents / 100,
    groupDiscountRate,
    offerDiscount: offerCents / 100,
    couponDiscount: couponCents / 100,
    total: totalCents / 100,
  };
}

// ---------------------------------------------------------------------------
// Ajustes de pago global (RF-07/08)
// ---------------------------------------------------------------------------

export async function fetchPaymentSettings(sb: SupabaseClient): Promise<PaymentSettings> {
  const { data, error } = await sb.from('settings').select('key, value');
  if (error) throw error;
  const map = new Map((data ?? []).map((r) => [r.key, r.value]));
  return {
    link: (map.get('payment_link') as string | null) ?? null,
    qrUrl: (map.get('payment_qr_url') as string | null) ?? null,
    instructions: (map.get('payment_instructions') as string | null) ?? null,
  };
}

// ---------------------------------------------------------------------------
// Mis reservas (RF-17)
// ---------------------------------------------------------------------------

export interface MyBooking extends ReservationRow {
  tour_slug: string;
  tour_title: string;
  tour_image: string;
  tour_date: string;
  tour_start_time?: string | null;
  tour_duration: string;
  tour_start_end: string;
  passengers: PassengerRow[];
  /** Detalle extra del tour (solo lo trae fetchBookingByCode, para el voucher). */
  tour_destination?: string;
  tour_max_altitude?: string;
  tour_difficulty?: string;
  tour_info?: Partial<TourInfo>;
  tour_included?: string[];
}

export async function fetchMyBookings(sb: SupabaseClient, userId: string): Promise<MyBooking[]> {
  const { data, error } = await sb
    .from('reservations')
    .select(
      '*, tour:reservations_tour_id_fkey (slug, title, image, duration, start_end), date_row:reservations_tour_date_id_fkey (date, start_time), passengers:booking_passengers_reservations_id_fkey (*)',
    )
    // Filtro explícito: una cuenta admin no debe ver reservas de oficina sin user_id.
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as unknown as (ReservationRow & {
    tour: { slug: string; title: string; image: string; duration: string; start_end: string } | null;
    date_row: { date: string; start_time: string | null } | null;
    passengers: PassengerRow[];
  })[];
  return rows
    .filter((r) => r.tour)
    .map((r) => ({
      ...r,
      tour_slug: r.tour!.slug,
      tour_title: r.tour!.title,
      tour_image: r.tour!.image,
      tour_date: r.date_row?.date ?? '',
      tour_start_time: r.date_row?.start_time ?? null,
      tour_duration: r.tour!.duration,
      tour_start_end: r.tour!.start_end,
      passengers: r.passengers,
    }));
}

export async function fetchBookingByCode(sb: SupabaseClient, code: string): Promise<MyBooking | null> {
  const { data, error } = await sb
    .from('reservations')
    .select(
      '*, tour:reservations_tour_id_fkey (slug, title, image, duration, start_end, destination, max_altitude, difficulty, info, included), date_row:reservations_tour_date_id_fkey (date, start_time), passengers:booking_passengers_reservations_id_fkey (*)',
    )
    .eq('code', code)
    .maybeSingle();
  if (error) throw error;
  const r = data as unknown as (ReservationRow & {
    tour: {
      slug: string;
      title: string;
      image: string;
      duration: string;
      start_end: string;
      destination: string;
      max_altitude: string;
      difficulty: string;
      info: Partial<TourInfo> | null;
      included: string[] | null;
    } | null;
    date_row: { date: string; start_time: string | null } | null;
    passengers: PassengerRow[];
  }) | null;
  if (!r || !r.tour) return null;
  return {
    ...r,
    tour_slug: r.tour.slug,
    tour_title: r.tour.title,
    tour_image: r.tour.image,
    tour_date: r.date_row?.date ?? '',
    tour_start_time: r.date_row?.start_time ?? null,
    tour_duration: r.tour.duration,
    tour_start_end: r.tour.start_end,
    tour_destination: r.tour.destination,
    tour_max_altitude: r.tour.max_altitude,
    tour_difficulty: r.tour.difficulty,
    tour_info: r.tour.info ?? {},
    tour_included: r.tour.included ?? [],
    passengers: [...(r.passengers ?? [])].sort((a, b) => a.position - b.position),
  };
}

export async function cancelBooking(
  sb: SupabaseClient,
  reservationId: string,
  reason = 'Cancelada por el cliente',
): Promise<void> {
  // La RPC valida que sea propia y cancelable (pendiente_pago o confirmada) y libera el cupo.
  await updateReservationStatus(sb, reservationId, 'cancelada', reason);
}

// ---------------------------------------------------------------------------
// Admin: reservas con datos de cliente/tour (RF-09)
// ---------------------------------------------------------------------------

export interface AdminBooking extends ReservationRow {
  tour_slug: string;
  tour_title: string;
  client_name: string;
  client_email: string;
  tour_date: string;
  passengers: PassengerRow[];
}

export async function fetchAdminBookings(sb: SupabaseClient): Promise<AdminBooking[]> {
  const { data, error } = await sb
    .from('reservations')
    .select(
      '*, tour:reservations_tour_id_fkey (slug, title), profile:reservations_user_id_fkey (full_name), date_row:reservations_tour_date_id_fkey (date), passengers:booking_passengers_reservations_id_fkey (*)',
    )
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as unknown as (ReservationRow & {
    tour: { slug: string; title: string } | null;
    profile: { full_name: string } | null;
    date_row: { date: string } | null;
    passengers: PassengerRow[];
  })[];
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const emails = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: uData, error: uErr } = await sb
      .from('v_user_emails')
      .select('id, email')
      .in('id', userIds);
    if (!uErr && uData) for (const u of uData as { id: string; email: string }[]) emails.set(u.id, u.email);
  }
  return rows.map((r) => ({
    ...r,
    tour_slug: r.tour?.slug ?? '',
    tour_title: r.tour?.title ?? '',
    client_name: r.profile?.full_name ?? '',
    client_email: emails.get(r.user_id) ?? '',
    tour_date: r.date_row?.date ?? '',
    passengers: r.passengers,
  }));
}

export async function updateReservationStatus(
  sb: SupabaseClient,
  reservationId: string,
  status: 'confirmada' | 'completada' | 'cancelada',
  reason?: string,
): Promise<ReservationRow> {
  const { data, error } = await sb.rpc('update_reservation_status', {
    p_reservation_id: reservationId,
    p_status: status,
    p_cancellation_reason: reason ?? null,
  });
  if (error) throw error;
  return (data as { reservation: ReservationRow }).reservation;
}

// ---------------------------------------------------------------------------
// Admin: tours CRUD (RF-10), disponibilidad (RF-11), pago (RF-08)
// ---------------------------------------------------------------------------

export interface AdminTour extends TourRow {
  primary_category_slug: string;
  category_slugs: string[];
  reservation_count: number;
}

export async function fetchToursForAdmin(sb: SupabaseClient): Promise<AdminTour[]> {
  const [tRes, cRes] = await Promise.all([
    sb.from('tours').select('*').order('created_at', { ascending: true }),
    sb.from('categories').select('id, slug'),
  ]);
  if (tRes.error) throw tRes.error;
  if (cRes.error) throw cRes.error;
  const catMap = new Map((cRes.data ?? []).map((c: { id: string; slug: string }) => [c.id, c.slug]));
  const rows = (tRes.data ?? []) as TourRow[];
  return Promise.all(
    rows.map(async (r) => {
      const { count } = await sb
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('tour_id', r.id);
      return {
        ...r,
        primary_category_slug: r.category_id ? (catMap.get(r.category_id) ?? '') : '',
        category_slugs: (r.category_ids ?? []).map((id) => catMap.get(id) ?? '').filter(Boolean),
        reservation_count: count ?? 0,
      };
    }),
  );
}

// Formulario del editor de tours (slugs de categoría, no ids).
export interface TourFormData {
  slug: string;
  title: string;
  image: string;
  gallery: string[];
  badge: string;
  badge_variant: 'popular' | 'adventure' | 'cultural' | null;
  primary_category_slug: string;
  category_slugs: string[];
  duration: string;
  difficulty: Tour['difficulty'];
  activity_label: string;
  type_label: string;
  destination: string;
  start_end: string;
  best_season: string;
  max_altitude: string;
  price_group: number | null;
  price_semi: number | null;
  price_private: number | null;
  summary: string[];
  highlights: string[];
  itinerary: ItineraryDay[];
  included: string[];
  not_included: string[];
  what_to_bring: { emoji: string; title: string; detail: string }[];
  info: TourInfo;
  extras: TourExtra[];
  featured: boolean;
  active: boolean;
}

export function buildTourPayload(data: TourFormData, cats: CategoryRow[]): Record<string, unknown> {
  const catId = (slug: string) => cats.find((c) => c.slug === slug)?.id ?? null;
  return {
    slug: data.slug,
    title: data.title,
    image: data.image,
    gallery: data.gallery,
    badge: data.badge || null,
    badge_variant: data.badge_variant,
    category_id: catId(data.primary_category_slug),
    category_ids: data.category_slugs.map((s) => catId(s)).filter((id): id is string => Boolean(id)),
    duration: data.duration,
    difficulty: data.difficulty,
    activity_label: data.activity_label,
    type_label: data.type_label,
    destination: data.destination,
    start_end: data.start_end,
    best_season: data.best_season,
    max_altitude: data.max_altitude,
    price_group: data.price_group,
    price_semi: data.price_semi,
    price_private: data.price_private,
    summary: data.summary,
    highlights: data.highlights,
    itinerary: data.itinerary,
    included: data.included,
    not_included: data.not_included,
    what_to_bring: data.what_to_bring,
    info: data.info,
    extras: data.extras,
    featured: data.featured,
    active: data.active,
  };
}

export async function fetchTourDates(sb: SupabaseClient, tourId: string): Promise<TourDateFree[]> {
  const { data, error } = await sb
    .from('v_tour_dates_free')
    .select('id, tour_id, date, capacity, occupied, free')
    .eq('tour_id', tourId)
    .order('date', { ascending: true });
  if (error) throw error;
  return (data ?? []) as TourDateFree[];
}

export async function upsertSetting(sb: SupabaseClient, key: string, value: string | null): Promise<void> {
  const { error } = await sb
    .from('settings')
    .upsert({ key, value: value as unknown as Record<string, unknown> }, { onConflict: 'key' });
  if (error) throw error;
}

export async function uploadToBucket(
  sb: SupabaseClient,
  bucket: 'tours' | 'payment',
  path: string,
  file: File,
): Promise<string> {
  const { error } = await sb.storage.from(bucket).upload(path, file, { cacheControl: '3600' });
  if (error) throw error;
  const { data } = sb.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// Reescalado en cliente antes de subir (RF-10): limita el lado mayor a maxDim px.
// Los GIF/SVG y los archivos ya pequeños pasan intactos; ante cualquier fallo devuelve el original.
export async function resizeImageForUpload(file: File, maxDim = 1600, quality = 0.82): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') {
    return file;
  }
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 900_000) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob) return file;
    const name = `${file.name.replace(/\.[^.]+$/, '')}.jpg`;
    return new File([blob], name, { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

// Categorías nuevas desde el panel (RF-10).
export async function createCategory(
  sb: SupabaseClient,
  cat: { slug: string; label: string; emoji?: string; position?: number },
): Promise<CategoryRow> {
  const { data, error } = await sb
    .from('categories')
    .insert({
      slug: cat.slug,
      label: cat.label,
      emoji: cat.emoji ?? '',
      position: cat.position ?? 99,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as CategoryRow;
}

// ---------------------------------------------------------------------------
// Fase 2 — Dashboard (RF-13)
// ---------------------------------------------------------------------------

export interface DashboardKpis {
  reservations_total: number;
  pending_payment: number;
  pending_amount: number;
  confirmed_count: number;
  confirmed_revenue: number;
  cancelled: number;
  avg_ticket: number;
  clients_new: number;
  clients_total: number;
}

export interface DashboardOccupancyRow {
  date: string;
  tour_id: string;
  tour_title: string;
  capacity: number;
  occupied: number;
  free: number;
}

export interface DashboardTopTour {
  tour_id: string;
  tour_title: string;
  reservations: number;
  pax: number;
  revenue: number;
}

export interface DashboardStalePending {
  id: string;
  code: string;
  client_name: string;
  tour_title: string;
  tour_date: string;
  total: number;
  created_at: string;
  days_pending: number;
}

export interface DashboardOverview {
  from: string;
  to: string;
  kpis: DashboardKpis;
  occupancy: DashboardOccupancyRow[];
  top_tours: DashboardTopTour[];
  stale_pending: DashboardStalePending[];
}

export async function fetchDashboardOverview(
  sb: SupabaseClient,
  from: string,
  to: string,
): Promise<DashboardOverview> {
  const { data, error } = await sb.rpc('admin_dashboard_overview', { p_from: from, p_to: to });
  if (error) throw error;
  return data as DashboardOverview;
}

// ---------------------------------------------------------------------------
// Fase 2 — Clientes (RF-14)
// ---------------------------------------------------------------------------

export interface AdminClientRow {
  id: string;
  full_name: string;
  email: string | null;
  phone: string;
  created_at: string;
  reservations_count: number;
  total_spent: number;
  last_reservation_at: string | null;
}

export async function fetchAdminClients(sb: SupabaseClient): Promise<AdminClientRow[]> {
  const { data, error } = await sb
    .from('v_admin_clients')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdminClientRow[];
}

// Historial de reservas de un cliente (detalle del tab Clientes).
export type ClientBooking = Omit<AdminBooking, 'passengers'>;

export async function fetchClientBookings(
  sb: SupabaseClient,
  userId: string,
): Promise<ClientBooking[]> {
  const { data, error } = await sb
    .from('reservations')
    .select(
      '*, tour:reservations_tour_id_fkey (slug, title), profile:reservations_user_id_fkey (full_name), date_row:reservations_tour_date_id_fkey (date)',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as unknown as (ReservationRow & {
    tour: { slug: string; title: string } | null;
    profile: { full_name: string } | null;
    date_row: { date: string } | null;
  })[];
  return rows.map((r) => ({
    ...r,
    tour_slug: r.tour?.slug ?? '',
    tour_title: r.tour?.title ?? '',
    client_name: r.profile?.full_name ?? '',
    client_email: '',
    tour_date: r.date_row?.date ?? '',
  }));
}

// ---------------------------------------------------------------------------
// Fase 2 — Reportes (RF-15): agregados calculados en la base
// ---------------------------------------------------------------------------

export interface ReportSales {
  from: string;
  to: string;
  tours: { tour_title: string; reservations: number; pax: number; revenue: number; cancellations: number }[];
  months: { month: string; reservations: number; pax: number; revenue: number; cancellations: number }[];
  totals: { reservations: number; pax: number; revenue: number; cancellations: number };
}

export interface ReportBookingsRow {
  code: string;
  created_at: string;
  client_name: string;
  client_email: string;
  tour_title: string;
  tour_date: string;
  tour_type: TourType;
  pax: number;
  total: number;
  status: ReservationRow['status'];
}

export interface ReportBookings {
  from: string;
  to: string;
  status: string | null;
  rows: ReportBookingsRow[];
  totals: { reservations: number; pax: number; revenue: number; grand_total: number };
}

export interface ReportClients {
  from: string | null;
  to: string | null;
  rows: {
    full_name: string;
    email: string;
    created_at: string;
    reservations_count: number;
    total_spent: number;
  }[];
  totals: { clients: number; reservations: number; revenue: number };
}

export async function fetchReportSales(sb: SupabaseClient, from: string, to: string): Promise<ReportSales> {
  const { data, error } = await sb.rpc('admin_report_sales', { p_from: from, p_to: to });
  if (error) throw error;
  return data as ReportSales;
}

export async function fetchReportBookings(
  sb: SupabaseClient,
  from: string,
  to: string,
  status: string | null,
): Promise<ReportBookings> {
  const { data, error } = await sb.rpc('admin_report_bookings', {
    p_from: from,
    p_to: to,
    p_status: status,
  });
  if (error) throw error;
  return data as ReportBookings;
}

export async function fetchReportClients(
  sb: SupabaseClient,
  from: string | null,
  to: string | null,
): Promise<ReportClients> {
  const { data, error } = await sb.rpc('admin_report_clients', { p_from: from, p_to: to });
  if (error) throw error;
  return data as ReportClients;
}

// ---------------------------------------------------------------------------
// Reseñas (migración 0018): reales, moderadas por administración
// ---------------------------------------------------------------------------

export type ReviewStatus = 'pending' | 'published' | 'hidden';
export type ReviewSource = 'web' | 'manual' | 'google' | 'tripadvisor';

export interface ReviewRow {
  id: string;
  tour_id: string | null;
  reservation_id: string | null;
  user_id: string | null;
  author_name: string;
  author_country: string;
  rating: number;
  title: string;
  body: string;
  status: ReviewStatus;
  source: ReviewSource;
  travel_date: string | null;
  admin_reply: string | null;
  created_at: string;
  published_at: string | null;
}

/** Reseñas publicadas de un tour; sin tourId, los testimonios generales. */
export async function fetchPublishedReviews(
  sb: SupabaseClient,
  opts: { tourId?: string | null; limit?: number } = {},
): Promise<ReviewRow[]> {
  let q = sb.from('reviews').select('*').eq('status', 'published');
  q = opts.tourId ? q.eq('tour_id', opts.tourId) : q.is('tour_id', null);
  const { data, error } = await q.order('created_at', { ascending: false }).limit(opts.limit ?? 30);
  // Sin la tabla (migración pendiente) el sitio sigue funcionando sin reseñas.
  if (error) return [];
  return (data ?? []) as ReviewRow[];
}

/** Las reseñas más recientes de todo el sitio (para la portada). */
export async function fetchLatestReviews(sb: SupabaseClient, limit = 9): Promise<ReviewRow[]> {
  const { data, error } = await sb
    .from('reviews')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []) as ReviewRow[];
}

/** Reseñas del propio cliente (cualquier estado), indexables por reserva. */
export async function fetchMyReviews(sb: SupabaseClient, userId: string): Promise<ReviewRow[]> {
  const { data, error } = await sb.from('reviews').select('*').eq('user_id', userId);
  if (error) return [];
  return (data ?? []) as ReviewRow[];
}

export async function submitReview(
  sb: SupabaseClient,
  args: { reservationId: string; rating: number; title: string; body: string },
): Promise<ReviewRow> {
  const { data, error } = await sb.rpc('submit_review', {
    p_reservation_id: args.reservationId,
    p_rating: args.rating,
    p_title: args.title,
    p_body: args.body,
  });
  if (error) throw new Error(error.message || 'unknown');
  return data as ReviewRow;
}

/** Resumen de valoración a partir de una lista de reseñas. */
export function reviewStats(list: Pick<ReviewRow, 'rating'>[]): { avg: number; count: number; dist: number[] } {
  const dist = [0, 0, 0, 0, 0];
  for (const r of list) if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1] += 1;
  const count = list.length;
  const avg = count > 0 ? list.reduce((s, r) => s + r.rating, 0) / count : 0;
  return { avg, count, dist };
}

// ---------------------------------------------------------------------------
// Fechas abiertas de todo el catálogo (listado y buscador por fecha)
// ---------------------------------------------------------------------------

export interface OpenDate {
  date: string;
  /** Mayor cupo libre entre las salidas de ese día. */
  free: number;
}

/** Fechas reservables por tour en los próximos `days` días (cupo > 0). */
export async function fetchOpenDates(sb: SupabaseClient, days = 120): Promise<Record<string, OpenDate[]>> {
  const from = laPazToday();
  const until = new Date(Date.parse(`${from}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
  const out: Record<string, OpenDate[]> = {};
  const PAGE = 1000;
  for (let page = 0; page < 5; page += 1) {
    const { data, error } = await sb
      .from('v_tour_dates_free')
      .select('tour_id, date, free')
      .eq('bookable', true)
      .gt('free', 0)
      .gte('date', from)
      .lte('date', until)
      .order('date', { ascending: true })
      .order('id', { ascending: true })
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error || !data) break;
    for (const row of data as { tour_id: string; date: string; free: number }[]) {
      const list = (out[row.tour_id] ??= []);
      const last = list[list.length - 1];
      if (last && last.date === row.date) last.free = Math.max(last.free, row.free);
      else list.push({ date: row.date, free: row.free });
    }
    if (data.length < PAGE) break;
  }
  return out;
}
