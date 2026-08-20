import Link from 'next/link';
import { categoryImages } from '@/data/categories';

const HOME_CATEGORIES: { id: string; label: string; image: string; featured?: boolean }[] = [
  { id: 'lapaz-city', label: 'La Paz city tours', image: '/assets/lapaz-city.jpg' },
  { id: 'lapaz-top', label: 'La Paz top tours', image: '/assets/uyuni-mirror.jpg', featured: true },
  { id: 'uyuni', label: 'Salar de Uyuni', image: '/assets/uyuni-salt.jpg' },
  { id: 'amazon', label: 'Amazonía', image: '/assets/titicaca-lake.jpg' },
  { id: 'trekking', label: 'Trekking Cordillera', image: '/assets/andes-mountains.jpg' },
  { id: 'bolivia-top', label: 'Bolivia top tours', image: '/assets/uyuni-salt.jpg' },
  { id: 'peru', label: 'Tours en Perú', image: '/assets/machu-picchu.jpg' },
];

export default function CategoriesSection() {
  return (
    <section className="section section-alt categories">
      <div className="container">
        <div className="flex-between" style={{ marginBottom: 32 }}>
          <div>
            <p className="eyebrow">Categorías de viaje</p>
            <h2>Encuentra tu próxima aventura</h2>
          </div>
          <Link className="btn btn--ghost btn--sm" href="/tours">
            Ver todos los destinos
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div className="cat-grid">
          {HOME_CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              className={`cat-card${cat.featured ? ' cat-card--featured' : ''}`}
              href={`/tours?cat=${cat.id}`}
            >
              <div className="cat-card__media">
                <img src={cat.image} alt={cat.label} />
                {cat.featured && (
                  <div className="cat-card__overlay">
                    <span className="cat-card__label">{cat.label}</span>
                  </div>
                )}
              </div>
              <div className="cat-card__body">
                <h3>{cat.label}</h3>
                <span>Explorar categoría →</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
