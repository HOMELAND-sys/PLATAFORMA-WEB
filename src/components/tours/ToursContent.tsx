'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import TourCard from '@/components/ui/TourCard';
import Icon from '@/components/ui/Icon';
import type { CategoryRow, OpenDate } from '@/lib/api';
import { track } from '@/lib/analytics';
import { DIFFICULTY_LABEL, fmtDate } from '@/lib/tour-display';
import { TOURS_HERO } from '@/data/site-photos';
import type { CategoryId, Difficulty, Tour } from '@/lib/types';

type DurationKey = 'any' | 'half' | 'one' | 'short' | 'long';
type ServiceKey = 'any' | 'shared' | 'private';

const DURATIONS: { key: DurationKey; label: string }[] = [
  { key: 'any', label: 'Cualquier duración' },
  { key: 'half', label: 'Medio día' },
  { key: 'one', label: '1 día' },
  { key: 'short', label: '2 a 3 días' },
  { key: 'long', label: '4 días o más' },
];

/** Días aproximados a partir del texto de duración ("Medio día", "3 días · 2 noches"…). */
function durationDays(duration: string): number {
  const s = duration.toLowerCase();
  if (/medio|half|hora|hour/.test(s)) return 0.5;
  const m = s.match(/(\d+(?:[.,]\d+)?)\s*(d[ií]as?|days?)/);
  if (m) return parseFloat(m[1].replace(',', '.'));
  if (/d[ií]a completo|full day/.test(s)) return 1;
  return 1;
}

function matchesDuration(t: Tour, key: DurationKey): boolean {
  const d = durationDays(t.duration);
  if (key === 'any') return true;
  if (key === 'half') return d < 1;
  if (key === 'one') return d === 1;
  if (key === 'short') return d >= 2 && d <= 3;
  return d >= 4;
}

function norm(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function effectivePrice(t: Tour): number {
  return t.price * (1 - (t.offerPct ?? 0) / 100);
}

interface Props {
  tours: Tour[];
  categories: CategoryRow[];
  openDates: Record<string, OpenDate[]>;
}

export default function ToursContent({ tours, categories, openDates }: Props) {
  const searchParams = useSearchParams();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const priceCeil = useMemo(
    () => Math.max(100, Math.ceil(Math.max(0, ...tours.map((t) => t.price)) / 50) * 50),
    [tours],
  );

  const paramCat = searchParams.get('cat');
  const [category, setCategory] = useState<string>(
    paramCat && categories.some((c) => c.slug === paramCat) ? paramCat : 'all',
  );
  const [query, setQuery] = useState(searchParams.get('q')?.trim() ?? '');
  const [date, setDate] = useState(searchParams.get('date') ?? '');
  const [pax, setPax] = useState(() => {
    const n = Number(searchParams.get('pax'));
    return Number.isInteger(n) && n >= 1 && n <= 8 ? n : 2;
  });
  const [duration, setDuration] = useState<DurationKey>('any');
  const [service, setService] = useState<ServiceKey>('any');
  const [difficulties, setDifficulties] = useState<Difficulty[]>([]);
  const [maxPrice, setMaxPrice] = useState(priceCeil);
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [sort, setSort] = useState('recommended');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Al llegar por un enlace de categoría (menú, pie) se respeta el parámetro.
  useEffect(() => {
    const cat = searchParams.get('cat');
    setCategory(cat && categories.some((c) => c.slug === cat) ? cat : 'all');
    setQuery(searchParams.get('q')?.trim() ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    track('tours_browsed', { count: tours.length });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // La URL refleja la búsqueda para poder compartirla.
  useEffect(() => {
    const params = new URLSearchParams();
    if (category !== 'all') params.set('cat', category);
    if (query) params.set('q', query);
    if (date) params.set('date', date);
    if (pax !== 2) params.set('pax', String(pax));
    const qs = params.toString();
    window.history.replaceState(null, '', qs ? `/tours?${qs}` : '/tours');
  }, [category, query, date, pax]);

  const nextDateOf = (t: Tour): string | null =>
    (t.id ? openDates[t.id] : undefined)?.find((d) => d.free >= pax)?.date ?? null;

  const filtered = useMemo(() => {
    const q = norm(query);
    const list = tours.filter((t) => {
      if (category !== 'all' && !t.categories.includes(category as CategoryId)) return false;
      if (!matchesDuration(t, duration)) return false;
      if (difficulties.length > 0 && !difficulties.includes(t.difficulty)) return false;
      if (t.price > maxPrice) return false;
      if (service === 'private' && !t.availableTypes.includes('private')) return false;
      if (service === 'shared' && !t.availableTypes.some((x) => x !== 'private')) return false;
      const dates = (t.id ? openDates[t.id] : undefined) ?? [];
      if (date && !dates.some((d) => d.date === date && d.free >= pax)) return false;
      if (onlyOpen && !dates.some((d) => d.free >= pax)) return false;
      if (q) {
        const haystack = norm(
          [
            t.title,
            t.destination,
            t.summary.join(' '),
            t.highlights.join(' '),
            t.typeLabel,
            t.activityLabel,
            ...categories.filter((c) => t.categories.includes(c.slug as CategoryId)).map((c) => c.label),
          ].join(' '),
        );
        if (!q.split(/\s+/).every((word) => haystack.includes(word))) return false;
      }
      return true;
    });
    const hasDates = (t: Tour) => ((t.id ? openDates[t.id] : undefined)?.length ?? 0) > 0;
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
          (a, b) =>
            Number(hasDates(b)) - Number(hasDates(a)) ||
            Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
            (b.rating ?? 0) - (a.rating ?? 0),
        );
    }
    return list;
  }, [tours, category, duration, difficulties, maxPrice, service, date, pax, onlyOpen, query, sort, categories, openDates]);

  const activeCount =
    Number(duration !== 'any') +
    Number(service !== 'any') +
    Number(difficulties.length > 0) +
    Number(maxPrice < priceCeil) +
    Number(onlyOpen) +
    Number(Boolean(date)) +
    Number(Boolean(query));

  const reset = () => {
    setCategory('all');
    setQuery('');
    setDate('');
    setDuration('any');
    setService('any');
    setDifficulties([]);
    setMaxPrice(priceCeil);
    setOnlyOpen(false);
  };

  const toggleDifficulty = (d: Difficulty) =>
    setDifficulties((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const currentCat = categories.find((c) => c.slug === category);

  return (
    <>
      <section className="page-header tl-hero">
        <img className="tl-hero__bg" src={TOURS_HERO.src} alt="" />
        <div className="container">
          <Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'Tours' }]} />
          <h1>{currentCat ? currentCat.label : <>Tours y experiencias en <em>Bolivia</em></>}</h1>
          <p>Elige tu destino y tu fecha: aquí ves los cupos reales de cada salida y reservas en minutos.</p>

          <form className="tl-search" role="search" onSubmit={(e) => e.preventDefault()}>
            <label className="tl-search__field tl-search__field--q">
              <Icon name="search" size={18} />
              <input
                type="search"
                placeholder="Busca un destino o actividad"
                aria-label="Buscar tours"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <label className="tl-search__field">
              <Icon name="calendar" size={18} />
              <input type="date" min={today} aria-label="Fecha del viaje" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <div className="tl-search__field tl-search__field--pax">
              <Icon name="users" size={18} />
              <button type="button" aria-label="Quitar un viajero" disabled={pax <= 1} onClick={() => setPax((p) => Math.max(1, p - 1))}>
                <Icon name="minus" size={14} />
              </button>
              <span aria-live="polite">
                {pax} {pax === 1 ? 'viajero' : 'viajeros'}
              </span>
              <button type="button" aria-label="Añadir un viajero" disabled={pax >= 8} onClick={() => setPax((p) => Math.min(8, p + 1))}>
                <Icon name="plus" size={14} />
              </button>
            </div>
          </form>
        </div>
      </section>

      <div className="toolbar">
        <div className="container toolbar__inner">
          <div className="cat-pills" role="tablist" aria-label="Categorías">
            <button role="tab" aria-selected={category === 'all'} className={`cat-pill${category === 'all' ? ' is-active' : ''}`} onClick={() => setCategory('all')}>
              Todos los tours
            </button>
            {categories.map((c) => (
              <button
                key={c.slug}
                role="tab"
                aria-selected={category === c.slug}
                className={`cat-pill${category === c.slug ? ' is-active' : ''}`}
                onClick={() => setCategory(c.slug)}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="toolbar__side">
            <span className="divider-v"></span>
            <button className="filter-toggle" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((v) => !v)}>
              <Icon name="filter" size={17} />
              Filtros{activeCount > 0 ? ` (${activeCount})` : ''}
            </button>
          </div>
        </div>
      </div>

      <section className="section-tight">
        <div className="container">
          {filtersOpen && (
            <div className="tl-filters">
              <label className="tl-filter">
                <span>Duración</span>
                <select value={duration} onChange={(e) => setDuration(e.target.value as DurationKey)}>
                  {DURATIONS.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="tl-filter">
                <span>Tipo de servicio</span>
                <select value={service} onChange={(e) => setService(e.target.value as ServiceKey)}>
                  <option value="any">Todos</option>
                  <option value="shared">Compartido (grupal)</option>
                  <option value="private">Privado</option>
                </select>
              </label>
              <div className="tl-filter">
                <span>Exigencia física</span>
                <div className="tl-chips">
                  {(['Easy', 'Moderate', 'Challenging'] as Difficulty[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={difficulties.includes(d)}
                      className={`tl-chip${difficulties.includes(d) ? ' is-on' : ''}`}
                      onClick={() => toggleDifficulty(d)}
                    >
                      {DIFFICULTY_LABEL[d].replace('Exigencia ', '')}
                    </button>
                  ))}
                </div>
              </div>
              <label className="tl-filter tl-filter--range">
                <span>
                  Precio máximo: <b>{maxPrice >= priceCeil ? 'sin límite' : `US$ ${maxPrice}`}</b>
                </span>
                <input type="range" min={50} max={priceCeil} step={10} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} />
              </label>
              <label className="tl-filter tl-filter--check">
                <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} />
                Solo con fechas disponibles
              </label>
            </div>
          )}

          <div className="results-head">
            <span>
              <strong>
                {filtered.length} {filtered.length === 1 ? 'tour' : 'tours'}
              </strong>
              {date ? ` con salida el ${fmtDate(date, { day: 'numeric', month: 'long' })}` : ''}
              {query ? ` para «${query}»` : ''}
              {activeCount > 0 || category !== 'all' ? (
                <button type="button" className="tl-reset" onClick={reset}>
                  Limpiar filtros
                </button>
              ) : null}
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

          {filtered.length > 0 ? (
            <div className="tl-grid">
              {filtered.map((tour, i) => (
                <TourCard key={tour.slug} tour={tour} priority={i < 4} nextDate={nextDateOf(tour)} />
              ))}
            </div>
          ) : (
            <div className="ht-empty">
              <span className="ht-empty__icon">
                <Icon name="compass" size={30} />
              </span>
              <h2>No encontramos tours con esos filtros</h2>
              <p>
                {date
                  ? 'No hay salidas abiertas ese día para tu grupo. Prueba con otra fecha o cuéntanos qué buscas y armamos tu viaje.'
                  : 'Prueba con otro destino, quita algún filtro o pídenos un viaje a medida.'}
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                <button type="button" className="btn btn--primary" onClick={reset}>
                  Ver todos los tours
                </button>
                <Link className="btn btn--ghost" href="/customize">
                  Pedir un viaje a medida
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="section-tight tl-cta">
        <div className="container">
          <div className="tl-cta__box">
            <div>
              <h2>¿No encuentras lo que buscas?</h2>
              <p>Diseñamos itinerarios privados para tu grupo, con las fechas y el ritmo que necesites.</p>
            </div>
            <Link className="btn btn--dark" href="/customize">
              Armar mi viaje a medida <Icon name="arrow-right" size={16} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
