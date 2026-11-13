import type { Metadata } from 'next';
import Hero from '@/components/home/Hero';
import {
  CustomBanner,
  Destinations,
  FaqTeaser,
  FeaturedTours,
  HowItWorks,
  ReviewsSection,
  TrustBar,
  WhyHomeland,
} from '@/components/home/HomeSections';
import { getSupabaseServer } from '@/lib/supabase';
import { fetchActiveTours, fetchCategories, fetchLatestReviews, reviewStats } from '@/lib/api';
import { fetchSiteSettings, SITE_URL } from '@/lib/site';
import { CATEGORY_PHOTOS, FOOTER_CTA } from '@/data/site-photos';
import '@/styles/home-v3.css';

export const metadata: Metadata = {
  title: { absolute: 'Homeland Tours · Tours y experiencias en Bolivia' },
  alternates: { canonical: '/' },
};

// El catálogo vive en Supabase; los cambios del panel se ven en menos de un minuto.
export const revalidate = 30;

export default async function HomePage() {
  const sb = getSupabaseServer();
  const [tours, categories, reviews, site] = await Promise.all([
    fetchActiveTours(sb),
    fetchCategories(sb),
    fetchLatestReviews(sb, 60),
    fetchSiteSettings(sb),
  ]);

  // Primero los destacados; se completa con el resto hasta llenar dos filas.
  const featured = [...tours.filter((t) => t.featured), ...tours.filter((t) => !t.featured)].slice(0, 8);
  const counts: Record<string, number> = {};
  for (const t of tours) for (const c of t.categories) counts[c] = (counts[c] ?? 0) + 1;
  // La nota numérica solo cuenta reseñas verificables (reservas de la web o
  // fuentes externas); los testimonios cargados a mano se muestran, pero no puntúan.
  const stats = reviewStats(reviews.filter((r) => r.source !== 'manual'));
  const rating = stats.count > 0 ? { avg: stats.avg, count: stats.count } : null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TravelAgency',
    name: site.company.name || 'Homeland Tours',
    url: SITE_URL,
    logo: `${SITE_URL}/assets/og-homeland.png`,
    image: `${SITE_URL}/assets/og-homeland.png`,
    description: 'Operadora de turismo boliviana: tours al Salar de Uyuni, Sajama, Toro Toro, La Paz, el lago Titicaca y la Amazonía.',
    areaServed: 'Bolivia',
    ...(site.company.address ? { address: site.company.address } : {}),
    ...(site.company.email ? { email: site.company.email } : {}),
    ...(rating
      ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: Number(rating.avg.toFixed(1)), reviewCount: rating.count } }
      : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Hero tours={tours} categories={categories} rating={rating} />
      <TrustBar policies={site.policies} rating={rating} />
      <FeaturedTours tours={featured} />
      <Destinations categories={categories} counts={counts} />
      <HowItWorks />
      <WhyHomeland photo={CATEGORY_PHOTOS.trekking ?? FOOTER_CTA} />
      <ReviewsSection reviews={reviews.slice(0, 9)} rating={rating} />
      <CustomBanner photo={CATEGORY_PHOTOS.uyuni ?? FOOTER_CTA} />
      <FaqTeaser />
    </>
  );
}
