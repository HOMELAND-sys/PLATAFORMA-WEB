import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Category,
  Coupon,
  ItineraryDay,
  Tour,
  TourExtra,
  TourInfo,
  TourType,
} from '@/lib/types';
import { calcBookingTotals } from '@/lib/pricing';

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
}

export interface ReservationRow {
  id: string;
  code: string;
  user_id: string;
  tour_id: string;
  tour_date_id: string;
  tour_type: TourType;
  pax: number;
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
  const slugs = row.category_ids.map((id) => catSlugById.get(id)).filter(Boolean) as string[];
  const primary = (row.category_id && catSlugById.get(row.category_id)) || slugs[0] || 'uyuni';
  const prices = [row.price_group, row.price_semi, row.price_private].filter(
    (p): p is number => p !== null && p >= 0,
  );
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
    price: prices.length > 0 ? Math.min(...prices) : 0,
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
    tourTypes: {
      group: row.price_group ?? 0,
      semi: row.price_semi ?? 0,
      private: row.price_private ?? 0,
    },
    extras: row.extras,
  };
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
  const [catsRes, toursRes] = await Promise.all([
    sb.from('categories').select('*'),
    sb.from('tours').select('*').eq('active', true).order('created_at'),
  ]);
  if (catsRes.error) throw catsRes.error;
  if (toursRes.error) throw toursRes.error;
  const catMap = buildCatSlugMap((catsRes.data ?? []) as CategoryRow[]);
  return ((toursRes.data ?? []) as TourRow[]).map((row) => mapTour(row, catMap));
}

export async function fetchActiveTourBySlug(sb: SupabaseClient, slug: string): Promise<Tour | null> {
  const [catsRes, toursRes] = await Promise.all([
    sb.from('categories').select('*'),
    sb.from('tours').select('*').eq('slug', slug).eq('active', true).maybeSingle(),
  ]);
  if (catsRes.error) throw catsRes.error;
  if (toursRes.error) throw toursRes.error;
  const row = toursRes.data as TourRow | null;
  if (!row) return null;
  return mapTour(row, buildCatSlugMap((catsRes.data ?? []) as CategoryRow[]));
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
    .select('id, tour_id, date, capacity, occupied, free')
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
}

export interface CreatedBooking {
  reservation: ReservationRow;
  passengers: PassengerRow[];
}

export type BookingErrorCode =
  | 'date_full'
  | 'date_not_open'
  | 'date_past'
  | 'coupon_invalid'
  | 'tour_not_found'
  | 'tour_inactive'
  | 'tour_type_unavailable'
  | 'not_authenticated'
  | 'invalid_pax'
  | 'invalid_passengers'
  | 'unknown';

export function bookingErrorInfo(message: string): { code: BookingErrorCode; detail: string } {
  const known: BookingErrorCode[] = [
    'date_full',
    'date_not_open',
    'date_past',
    'coupon_invalid',
    'tour_not_found',
    'tour_inactive',
    'tour_type_unavailable',
    'not_authenticated',
    'invalid_pax',
    'invalid_passengers',
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
  });
  if (error) throw error;
  return data as CreatedBooking;
}

// Totales en el cliente (misma lógica que la RPC) para el resumen del checkout.
export function clientTotals(
  tour: Tour,
  tourType: TourType,
  pax: number,
  extraIds: string[],
  couponDiscountPct = 0,
) {
  const perPerson = tour.tourTypes[tourType] ?? 0;
  const extrasTotal = tour.extras
    .filter((e) => extraIds.includes(e.id) && e.kind === 'paid')
    .reduce((sum, e) => sum + e.price, 0);
  const subtotal = perPerson * pax + extrasTotal;
  return { perPerson, extrasTotal, subtotal, ...calcBookingTotals(subtotal, pax, couponDiscountPct) };
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
  tour_duration: string;
  tour_start_end: string;
  passengers: PassengerRow[];
}

export async function fetchMyBookings(sb: SupabaseClient): Promise<MyBooking[]> {
  const { data, error } = await sb
    .from('reservations')
    .select(
      '*, tour:reservations_tour_id_fkey (slug, title, image, duration, start_end), date_row:reservations_tour_date_id_fkey (date), passengers:booking_passengers_reservations_id_fkey (*)',
    )
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as unknown as (ReservationRow & {
    tour: { slug: string; title: string; image: string; duration: string; start_end: string } | null;
    date_row: { date: string } | null;
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
      tour_duration: r.tour!.duration,
      tour_start_end: r.tour!.start_end,
      passengers: r.passengers,
    }));
}

export async function fetchBookingByCode(sb: SupabaseClient, code: string): Promise<MyBooking | null> {
  const { data, error } = await sb
    .from('reservations')
    .select(
      '*, tour:reservations_tour_id_fkey (slug, title, image, duration, start_end), date_row:reservations_tour_date_id_fkey (date), passengers:booking_passengers_reservations_id_fkey (*)',
    )
    .eq('code', code)
    .maybeSingle();
  if (error) throw error;
  const r = data as unknown as (ReservationRow & {
    tour: { slug: string; title: string; image: string; duration: string; start_end: string } | null;
    date_row: { date: string } | null;
    passengers: PassengerRow[];
  }) | null;
  if (!r || !r.tour) return null;
  return {
    ...r,
    tour_slug: r.tour.slug,
    tour_title: r.tour.title,
    tour_image: r.tour.image,
    tour_date: r.date_row?.date ?? '',
    tour_duration: r.tour.duration,
    tour_start_end: r.tour.start_end,
    passengers: r.passengers,
  };
}

export async function cancelBooking(sb: SupabaseClient, reservationId: string): Promise<void> {
  // El trigger solo permite: propio + pendiente_pago → cancelada (libera el cupo al instante).
  const { error } = await sb
    .from('reservations')
    .update({ status: 'cancelada', cancellation_reason: 'Cancelada por el cliente' })
    .eq('id', reservationId);
  if (error) throw error;
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
