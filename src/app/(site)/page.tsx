import type { Metadata } from 'next';
import Hero from '@/components/home/Hero';
import TrustBar from '@/components/home/TrustBar';
import WhySection from '@/components/home/WhySection';
import CategoriesSection from '@/components/home/CategoriesSection';
import FeaturedSection from '@/components/home/FeaturedSection';
import DiffSection from '@/components/home/DiffSection';
import ReviewsCarousel from '@/components/home/ReviewsCarousel';
import { getSupabaseServer } from '@/lib/supabase';
import { fetchActiveTours, fetchCategories } from '@/lib/api';

export const metadata: Metadata = {
  title: 'Authentic Bolivian Journeys',
};

// RF-04: el catálogo vive en Supabase; cambios visibles en < 1 minuto.
export const revalidate = 30;

export default async function HomePage() {
  const sb = getSupabaseServer();
  const [tours, categories] = await Promise.all([fetchActiveTours(sb), fetchCategories(sb)]);
  const featured = tours.filter((t) => t.featured);

  return (
    <>
      <Hero />
      <TrustBar />
      <WhySection />
      <CategoriesSection categories={categories} />
      <FeaturedSection tours={featured} />
      <DiffSection />
      <ReviewsCarousel />
    </>
  );
}
