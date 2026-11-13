'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import TourCard from '@/components/ui/TourCard';
import FilterPanel from '@/components/tours/FilterPanel';
import { fetchActiveTours, fetchCategories, tourThumb } from '@/lib/api';
import type { CategoryRow } from '@/lib/api';
import { getSupabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';
import type { CategoryId, Difficulty, Tour } from '@/lib/types';
import Icon from '@/components/ui/Icon';

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

function durationDays(duration: string): number {
  const s = duration.toLowerCase();
  if (s.includes('half')) return 0.5;
  const m = s.match(/(\d+(?:[.,]\d+)?)\s*(day|día|hora|hour)/);
  if (!m) return 99;
  const n = parseFloat(m[1].replace(',', '.'));
  return /hora|hour/.test(m[2]) ? n / 24 : n;
}

function effectivePrice(t: Tour): number {
  return t.price * (1 - (t.offerPct ?? 0) / 100);
}

function fmtChipDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

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
  const initialDate = searchParams.get('date') ?? '';
  const initialPax = searchParams.get('pax') ?? '';

  const [tours, setTours] = useState<Tour[] | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [category, setCategory] = useState<string>('all');
  const [query, setQuery] = useState(initialQuery);
  const [dateChip, setDateChip] = useState(initialDate);
  const [paxChip, setPaxChip] = useState(initialPax);
  const [sort, setSort] = useState('recommended');
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
    () => [{ slug: 'all', label: 'Todos los tours' }, ...categories.map((c) => ({ slug: c.slug, label: c.label }))],
    [categories],
  );

  const filtered = useMemo(() => {
    if (!tours) return [];
    const list = tours.filter((t) => {
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
    switch (sort) {
      case 'price-asc':
        list.sort((a, b) => effectivePrice(a) - effectivePrice(b));
        break;
      case 'price-desc':
        list.sort((a, b) => effectivePrice(b) - effectivePrice(a));
        break;
      case 'duration':
        list.sort((a, b) => durationDays(a.duration) - durationDays(b.duration));
        break;
      default:
        list.sort(
          (a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.reviewCount ?? 0) - (a.reviewCount ?? 0),
        );
    }
    return list;
  }, [tours, category, filters, query, categories, sort]);

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
          <Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'Tours' }]} />
          <h1>
            Tours y <em>paquetes</em>
          </h1>
          <p>
            Recorridos seleccionados por los paisajes y las culturas más extraordinarias de Bolivia,
            con operadores locales y garantía del mejor precio.
          </p>
          {(query || dateChip || paxChip) && (
            <div className="tours-search-summary">
              {query && (
                <span>
                  Resultados para <strong>&ldquo;{query}&rdquo;</strong>
                </span>
              )}
              {dateChip && (
                <span className="tours-search-chip">
                  <Icon name="calendar" size={14} />
                  {fmtChipDate(dateChip)}
                  <button type="button" aria-label="Quitar fecha" onClick={() => setDateChip('')}>
                    <Icon name="close" size={12} />
                  </button>
                </span>
              )}
              {paxChip && (
                <span className="tours-search-chip">
                  <Icon name="users" size={14} />
                  {paxChip} viajero{paxChip === '1' ? '' : 's'}
                  <button type="button" aria-label="Quitar viajeros" onClick={() => setPaxChip('')}>
                    <Icon name="close" size={12} />
                  </button>
                </span>
              )}
              {query && (
                <button type="button" className="tours-search-clear" onClick={() => setQuery('')}>
                  Limpiar búsqueda
                </button>
              )}
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
              <Icon name="filter" size={17} />
              Filtros
            </button>
          </div>
        </div>
      </div>

      <section className="section-tight">
        <div className="container">
          <div className="results-head">
            <span>
              Mostrando <strong>{filtered.length} de {tours.length} tours</strong> · Tour compartido / privado
            </span>
            <label className="sort-select">
              <span>Ordenar por</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="recommended">Recomendados</option>
                <option value="price-asc">Precio: menor a mayor</option>
                <option value="price-desc">Precio: mayor a menor</option>
                <option value="duration">Duración</option>
              </select>
            </label>
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
                <Icon name="users" size={24} />
              </span>
              <div>
                <div className="stat-item__num">2,000+</div>
                <div className="stat-item__label">Viajeros felices</div>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-item__icon" style={{ color: 'var(--accent-600)' }}>
                <Icon name="star-solid" size={24} />
              </span>
              <div>
                <div className="stat-item__num">4.9/5</div>
                <div className="stat-item__label">Valoración media</div>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-item__icon">
                <Icon name="rotate-ccw" size={24} />
              </span>
              <div>
                <div className="stat-item__num">98%</div>
                <div className="stat-item__label">Volverían a viajar</div>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-item__icon">
                <Icon name="chat" size={24} />
              </span>
              <div>
                <div className="stat-item__num">24/7</div>
                <div className="stat-item__label">Soporte local</div>
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
              <Icon name="arrow-right" size={16} />
            </Link>
          </div>

          <div className="premium-grid">
            {premium.map((p) => (
              <Link className="premium-card" key={p.slug} href={`/tours/${p.slug}`}>
                <div className="premium-card__media">
                  <img src={tourThumb(p.image)} alt={p.title} loading="lazy" />
                  {p.badge && <span className="premium-card__badge">{p.badge}</span>}
                </div>
                <div className="premium-card__body">
                  <h3>{p.title}</h3>
                  <div className="premium-card__meta">
                    <span>
                      <Icon name="clock" size={14} />{' '}
                      {p.duration}
                    </span>
                    <span>
                      <Icon name="mountain" size={14} />{' '}
                      {p.activityLabel}
                    </span>
                    <span>
                      <Icon name="pin" size={14} />{' '}
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
                      <Icon name="arrow-right" size={14} />
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
