import Link from 'next/link';
import type { CategoryRow } from '@/lib/api';

export default function CategoriesSection({ categories }: { categories: CategoryRow[] }) {
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
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              className={`cat-card${cat.slug === 'lapaz-top' ? ' cat-card--featured' : ''}`}
              href={`/tours?cat=${cat.slug}`}
            >
              <div className="cat-card__media">
                {cat.image && <img src={cat.image} alt={cat.label} />}
                {cat.slug === 'lapaz-top' && (
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
