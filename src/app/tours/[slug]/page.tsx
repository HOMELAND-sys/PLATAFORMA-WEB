import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTourBySlug } from '@/data/tours';
import TourDetailContent from '@/components/tour-detail/TourDetailContent';

interface TourDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: TourDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tour = getTourBySlug(slug);
  if (!tour) return { title: 'Tour no encontrado' };
  return { title: tour.title };
}

export default async function TourDetailPage({ params }: TourDetailPageProps) {
  const { slug } = await params;
  const tour = getTourBySlug(slug);
  if (!tour) notFound();
  return <TourDetailContent tour={tour} />;
}
