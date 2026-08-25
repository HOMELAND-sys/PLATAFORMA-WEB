import Link from 'next/link';
import TourCard from '@/components/ui/TourCard';
import type { Tour } from '@/lib/types';

export default function FeaturedSection({ tours }: { tours: Tour[] }) {
  return (
    <section className="section">
      <div className="container">
        <div className="flex-between" style={{ marginBottom: 32 }}>
          <div>
            <p className="eyebrow">Handpicked adventures</p>
            <h2>Tours destacados</h2>
          </div>
          <Link className="btn btn--ghost btn--sm" href="/tours">
            Ver todos los tours
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div className="featured-grid">
          {tours.map((tour) => (
            <TourCard key={tour.slug} tour={tour} />
          ))}
        </div>
      </div>
    </section>
  );
}
