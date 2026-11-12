import Link from 'next/link';
import Icon from '@/components/ui/Icon';
import type { CategoryRow } from '@/lib/api';
import { CATEGORY_PHOTOS } from '@/data/site-photos';

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
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>

        <div className="cat-grid">
          {categories.map((cat) => {
            const photo = CATEGORY_PHOTOS[cat.slug];
            const imgSrc = photo?.sm ?? cat.image;
            const imgAlt = photo?.alt ?? cat.label;
            return (
              <Link
                key={cat.slug}
                className={`cat-card${cat.slug === 'lapaz-top' ? ' cat-card--featured' : ''}`}
                href={`/tours?cat=${cat.slug}`}
              >
                <div className="cat-card__media">
                  {imgSrc && <img src={imgSrc} alt={imgAlt} loading="lazy" />}
                  {cat.slug === 'lapaz-top' && (
                    <div className="cat-card__overlay">
                      <span className="cat-card__label">{cat.label}</span>
                    </div>
                  )}
                </div>
                <div className="cat-card__body">
                  <h3>{cat.label}</h3>
                  <span className="icon-inline">
                    Explorar categoría <Icon name="arrow-right" size={14} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
