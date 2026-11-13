'use client';

import Link from 'next/link';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import Icon from '@/components/ui/Icon';
import TourCard from '@/components/ui/TourCard';
import { useFavorites } from '@/context/FavoritesContext';
import type { OpenDate } from '@/lib/api';
import type { Tour } from '@/lib/types';

export default function FavoritesContent({ tours, openDates }: { tours: Tour[]; openDates: Record<string, OpenDate[]> }) {
  const { slugs, hydrated } = useFavorites();
  const saved = slugs.map((s) => tours.find((t) => t.slug === s)).filter((t): t is Tour => Boolean(t));

  return (
    <section className="fav-page">
      <div className="container">
        <Breadcrumbs light items={[{ label: 'Inicio', href: '/' }, { label: 'Mis favoritos' }]} />
        <h1>Mis favoritos</h1>
        <p className="fav-page__sub">
          {saved.length > 0
            ? `Tienes ${saved.length} ${saved.length === 1 ? 'tour guardado' : 'tours guardados'} en este dispositivo.`
            : 'Guarda los tours que te interesan para compararlos y reservar cuando quieras.'}
        </p>

        {!hydrated ? (
          <div className="tl-grid">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="ht-skel" style={{ height: 380, borderRadius: 20 }} />
            ))}
          </div>
        ) : saved.length > 0 ? (
          <div className="tl-grid">
            {saved.map((tour) => (
              <TourCard
                key={tour.slug}
                tour={tour}
                nextDate={(tour.id ? openDates[tour.id] : undefined)?.[0]?.date ?? null}
              />
            ))}
          </div>
        ) : (
          <div className="ht-empty">
            <span className="ht-empty__icon">
              <Icon name="heart" size={30} />
            </span>
            <h2>Todavía no guardaste ningún tour</h2>
            <p>Toca el corazón de cualquier tour para tenerlo aquí a mano.</p>
            <Link className="btn btn--primary" href="/tours">
              Explorar tours <Icon name="arrow-right" size={16} />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
