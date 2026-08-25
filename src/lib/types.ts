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
