import type { Metadata } from 'next';
import Hero from '@/components/home/Hero';
import TrustBar from '@/components/home/TrustBar';
import WhySection from '@/components/home/WhySection';
import CategoriesSection from '@/components/home/CategoriesSection';
import FeaturedSection from '@/components/home/FeaturedSection';
import DiffSection from '@/components/home/DiffSection';
import ReviewsCarousel from '@/components/home/ReviewsCarousel';

export const metadata: Metadata = {
  title: 'Authentic Bolivian Journeys',
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <TrustBar />
      <WhySection />
      <CategoriesSection />
      <FeaturedSection />
      <DiffSection />
      <ReviewsCarousel />
    </>
  );
}
