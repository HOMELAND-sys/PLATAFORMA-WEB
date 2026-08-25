import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase';
import { fetchActiveTours, fetchActiveTourBySlug } from '@/lib/api';
import TourDetailContent from '@/components/tour-detail/TourDetailContent';

interface TourDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: TourDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tour = await fetchActiveTourBySlug(getSupabaseServer(), slug).catch(() => null);
  if (!tour) return { title: 'Tour no encontrado' };
  return { title: tour.title, description: tour.summary[0] };
}

export default async function TourDetailPage({ params }: TourDetailPageProps) {
  const { slug } = await params;
  const sb = getSupabaseServer();
  const [tour, allTours] = await Promise.all([
    fetchActiveTourBySlug(sb, slug),
    fetchActiveTours(sb),
  ]);
  if (!tour) notFound();

  const mightLike = allTours
    .filter((t) => t.slug !== tour.slug)
    .sort((a, b) => {
      const aShares = a.categories.filter((c) => tour.categories.includes(c)).length;
      const bShares = b.categories.filter((c) => tour.categories.includes(c)).length;
      return bShares - aShares;
    })
    .slice(0, 3);

  return <TourDetailContent tour={tour} mightLike={mightLike} />;
}
