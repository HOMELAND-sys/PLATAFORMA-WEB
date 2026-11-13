import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase';
import { fetchActiveTours, fetchActiveTourBySlug, fetchPublishedReviews } from '@/lib/api';
import { SITE_URL } from '@/lib/site';
import TourDetailContent from '@/components/tour-detail/TourDetailContent';

interface TourDetailPageProps {
  params: Promise<{ slug: string }>;
}

// Catálogo y precios vienen de la base: cambios visibles en menos de un minuto.
export const revalidate = 30;

export async function generateMetadata({ params }: TourDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tour = await fetchActiveTourBySlug(getSupabaseServer(), slug).catch(() => null);
  if (!tour) return { title: 'Tour no encontrado', robots: { index: false } };
  const description = (tour.summary[0] ?? '').slice(0, 160);
  const title = /\d/.test(tour.title) ? tour.title : `${tour.title} · ${tour.duration}`;
  return {
    title,
    description,
    alternates: { canonical: `/tours/${tour.slug}` },
    openGraph: {
      type: 'website',
      title,
      description,
      url: `/tours/${tour.slug}`,
      images: tour.image ? [{ url: tour.image, alt: tour.title }] : undefined,
    },
    twitter: { card: 'summary_large_image', title, description, images: tour.image ? [tour.image] : undefined },
  };
}

export default async function TourDetailPage({ params }: TourDetailPageProps) {
  const { slug } = await params;
  const sb = getSupabaseServer();
  const [tour, allTours] = await Promise.all([fetchActiveTourBySlug(sb, slug), fetchActiveTours(sb)]);
  if (!tour) notFound();

  const [reviews, testimonials] = await Promise.all([
    fetchPublishedReviews(sb, { tourId: tour.id }),
    fetchPublishedReviews(sb, { limit: 4 }),
  ]);

  const mightLike = allTours
    .filter((t) => t.slug !== tour.slug)
    .sort((a, b) => {
      const aShares = a.categories.filter((c) => tour.categories.includes(c)).length;
      const bShares = b.categories.filter((c) => tour.categories.includes(c)).length;
      return bShares - aShares;
    })
    .slice(0, 3);

  const abs = (path: string) => (/^https?:\/\//.test(path) ? path : `${SITE_URL}${path}`);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: tour.title,
    description: tour.summary.join(' '),
    image: (tour.gallery.length ? tour.gallery : [tour.image]).slice(0, 6).map(abs),
    url: `${SITE_URL}/tours/${tour.slug}`,
    touristType: tour.activityLabel || undefined,
    itinerary: tour.itinerary.map((d) => ({
      '@type': 'ListItem',
      position: d.day,
      name: d.title,
      description: d.description,
    })),
    provider: { '@type': 'TravelAgency', name: 'Homeland Tours', url: SITE_URL },
    ...(tour.price > 0
      ? {
          offers: {
            '@type': 'Offer',
            price: tour.price,
            priceCurrency: 'USD',
            availability: 'https://schema.org/InStock',
            url: `${SITE_URL}/tours/${tour.slug}`,
          },
        }
      : {}),
    ...(reviews.length > 0 && tour.rating
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: tour.rating,
            reviewCount: reviews.length,
          },
        }
      : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <TourDetailContent tour={tour} mightLike={mightLike} reviews={reviews} testimonials={testimonials} />
    </>
  );
}
