import Link from 'next/link';
import Icon from '@/components/ui/Icon';
import TourCard from '@/components/ui/TourCard';
import type { Tour } from '@/lib/types';

export default function FeaturedSection({ tours }: { tours: Tour[] }) {
  return (
    <section className="section">
      <div className="container">
        <div className="flex-between" style={{ marginBottom: 32 }}>
          <div>
            <p className="eyebrow">Aventuras seleccionadas</p>
            <h2>Tours destacados</h2>
          </div>
          <Link className="btn btn--ghost btn--sm" href="/tours">
            Ver todos los tours
            <Icon name="arrow-right" size={16} />
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
