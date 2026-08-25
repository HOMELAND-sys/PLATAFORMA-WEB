'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import TourCard from '@/components/ui/TourCard';
import FilterPanel from '@/components/tours/FilterPanel';
import { fetchActiveTours, fetchCategories } from '@/lib/api';
import type { CategoryRow } from '@/lib/api';
import { getSupabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';
import type { CategoryId, Difficulty, Tour } from '@/lib/types';

interface Filters {
  mode: 'shared' | 'private';
  duration: string;
  difficulties: Difficulty[];
  maxPrice: number;
}

const DURATION_MAP: Record<string, (t: { duration: string }) => boolean> = {
  any: () => true,
  'half-day': (t) => t.duration.toLowerCase().includes('half'),
  '1-day': (t) => /^1 day$/i.test(t.duration.trim()),
  '2-3-days': (t) => /^2|^3/.test(t.duration.trim()),
  '4-plus': (t) => /^4|^5/.test(t.duration.trim()),
};

// Selección curada de la sección "Experiencias destacadas" (datos reales del catálogo).
const PREMIUM_SLUGS = [
  'salkantay-trek-machu-picchu',
  'laguna-colorada-uyuni-4-day-tour',
  'rurrenabaque-pampas-jungle-3-day',
  'valle-de-la-luna-half-day',
];

export default function ToursContent() {
  const searchParams = useSearchParams();
  const initialCat = searchParams.get('cat');
  const initialQuery = searchParams.get('q')?.trim().toLowerCase() ?? '';

  const [tours, setTours] = useState<Tour[] | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [category, setCategory] = useState<string>('all');
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<Filters>({
    mode: 'shared',
    duration: 'any',
    difficulties: ['Easy'],
    maxPrice: 1000,
  });
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([fetchActiveTours(getSupabase()), fetchCategories(getSupabase())])
      .then(([t, c]) => {
        if (!active) return;
        setTours(t);
        setCategories(c);
        const validCat = initialCat && c.some((x) => x.slug === initialCat) ? initialCat : 'all';
        setCategory(validCat);
      })
      .catch(() => {
        if (active) setTours([]);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tours) track('tours_browsed', { count: tours.length });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tours !== null]);

  const allPills = useMemo(
    () => [{ slug: 'all', label: 'All tours' }, ...categories.map((c) => ({ slug: c.slug, label: c.label }))],
    [categories],
  );

  const filtered = useMemo(() => {
    if (!tours) return [];
    return tours.filter((t) => {
      if (category !== 'all' && !t.categories.includes(category as CategoryId)) return false;
      if (!DURATION_MAP[filters.duration]?.(t)) return false;
      if (!filters.difficulties.includes(t.difficulty)) return false;
      if (t.price > filters.maxPrice) return false;
      if (query) {
        const haystack = [
          t.title,
          t.destination,
          t.summary.join(' '),
          t.highlights.join(' '),
          t.typeLabel,
          t.activityLabel,
          ...categories.filter((c) => t.categories.includes(c.slug as CategoryId)).map((c) => c.label),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [tours, category, filters, query, categories]);

  const premium = useMemo(() => {
    if (!tours) return [];
    return PREMIUM_SLUGS.map((slug) => tours.find((t) => t.slug === slug)).filter(
      (t): t is Tour => Boolean(t),
    );
  }, [tours]);

  if (tours === null) {
    return <div style={{ padding: '80px 0', textAlign: 'center' }}>Cargando tours…</div>;
  }

  return (
    <>
      <section className="page-header">
        <div className="container">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Tours & Packages' }]} />
          <h1>
            Tours & <em>Packages</em>
          </h1>
          <p>
            Journeys handpicked across Bolivia&apos;s most extraordinary landscapes and cultures. 200+ curated
            tours, all with local operators and best-price guarantee.
          </p>
          {query && (
            <div className="tours-search-summary">
              <span>
                Resultados para <strong>&ldquo;{query}&rdquo;</strong>
              </span>
              <button type="button" className="tours-search-clear" onClick={() => setQuery('')}>
                Limpiar búsqueda
              </button>
            </div>
          )}
        </div>
      </section>

      <div className="toolbar">
        <div className="container toolbar__inner">
          <div className="cat-pills">
            {allPills.map((c) => (
              <button
                key={c.slug}
                className={`cat-pill${category === c.slug ? ' is-active' : ''}`}
                onClick={() => setCategory(c.slug)}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="toolbar__side">
            <span className="divider-v"></span>
            <button className="filter-toggle" onClick={() => setFilterPanelOpen(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
              </svg>
              Filtros
            </button>
          </div>
        </div>
      </div>

      <section className="section-tight">
        <div className="container">
          <div className="results-head">
            <span>
              Mostrando <strong>{filtered.length} tours</strong> · Tour compartido / privado
            </span>
          </div>

          <div className="tour-grid">
            {filtered.map((tour) => (
              <TourCard key={tour.slug} tour={tour} />
            ))}
          </div>

          {filtered.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--ink-500)', padding: '40px 0' }}>
              {query
                ? `No encontramos tours para "${query}". Probá con otro destino o limpiá los filtros.`
                : 'No hay tours que coincidan con los filtros seleccionados.'}
            </p>
          )}

          <div className="stats-row">
            <div className="stat-item">
              <span className="stat-item__icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </span>
              <div>
                <div className="stat-item__num">2,000+</div>
                <div className="stat-item__label">Happy travelers</div>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-item__icon" style={{ color: 'var(--accent-600)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </span>
              <div>
                <div className="stat-item__num">4.9/5</div>
                <div className="stat-item__label">Average rating</div>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-item__icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M21 12a9 9 0 11-9-9" />
                  <path d="M21 3v6h-6" />
                </svg>
              </span>
              <div>
                <div className="stat-item__num">98%</div>
                <div className="stat-item__label">Would travel again</div>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-item__icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.33 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </span>
              <div>
                <div className="stat-item__num">24/7</div>
                <div className="stat-item__label">Local support</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="flex-between" style={{ marginBottom: 32 }}>
            <div>
              <p className="eyebrow">Aventura premium</p>
              <h2>Experiencias destacadas</h2>
            </div>
            <Link className="btn btn--ghost btn--sm" href="/tours">
              Ver todas
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="premium-grid">
            {premium.map((p) => (
              <Link className="premium-card" key={p.slug} href={`/tours/${p.slug}`}>
                <div className="premium-card__media">
                  <img src={p.image} alt={p.title} />
                  {p.badge && <span className="premium-card__badge">{p.badge}</span>}
                </div>
                <div className="premium-card__body">
                  <h3>{p.title}</h3>
                  <div className="premium-card__meta">
                    <span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 6v6l4 2" />
                      </svg>{' '}
                      {p.duration}
                    </span>
                    <span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M2 20l3-10h14l3 10" />
                      </svg>{' '}
                      {p.activityLabel}
                    </span>
                    <span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      </svg>{' '}
                      {p.typeLabel}
                    </span>
                  </div>
                  <div className="premium-card__price-row">
                    <div>
                      <small>Desde</small>
                      <strong>US$ {p.price}</strong>
                    </div>
                    <span className="premium-card__cta">
                      VER MÁS
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M5 12h14M13 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {filterPanelOpen && <div className="scrim is-open" onClick={() => setFilterPanelOpen(false)}></div>}
      <FilterPanel
        open={filterPanelOpen}
        filters={filters}
        onChange={setFilters}
        onClose={() => setFilterPanelOpen(false)}
      />
    </>
  );
}
