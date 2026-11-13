'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/Icon';
import { onIntroReveal, prefersReducedMotion } from '@/lib/intro';
import { tourThumb, type CategoryRow } from '@/lib/api';
import { money } from '@/lib/pricing';
import { HERO_SLIDES } from '@/data/site-photos';
import type { Tour } from '@/lib/types';

const SLIDE_MS = 7000;

function norm(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function tourMatchesQuery(tour: Tour, q: string, categories: CategoryRow[]): boolean {
  if (!q) return true;
  const haystack = norm(
    [
      tour.title,
      tour.destination,
      tour.summary.join(' '),
      tour.highlights.join(' '),
      tour.typeLabel,
      tour.activityLabel,
      ...categories.filter((c) => tour.categories.includes(c.slug as never)).map((c) => c.label),
    ].join(' '),
  );
  return norm(q)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

interface HeroProps {
  tours: Tour[];
  categories: CategoryRow[];
  rating: { avg: number; count: number } | null;
}

export default function Hero({ tours, categories, rating }: HeroProps) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [slideIdx, setSlideIdx] = useState(0);
  const [date, setDate] = useState('');
  const [pax, setPax] = useState(2);
  const [paxOpen, setPaxOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const paxRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // La entrada espera a que la intro del logotipo abra la cortina (con tope de seguridad).
  useEffect(() => {
    const unsubscribe = onIntroReveal(() => setShown(true));
    const safety = window.setTimeout(() => setShown(true), 3200);
    return () => {
      unsubscribe();
      window.clearTimeout(safety);
    };
  }, []);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const t = setTimeout(() => setSlideIdx((i) => (i + 1) % HERO_SLIDES.length), SLIDE_MS);
    return () => clearTimeout(t);
  }, [slideIdx]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
      if (paxRef.current && !paxRef.current.contains(e.target as Node)) setPaxOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const results = useMemo(() => {
    const q = search.trim();
    if (!q) return tours.slice(0, 5);
    return tours.filter((t) => tourMatchesQuery(t, q, categories)).slice(0, 6);
  }, [search, tours, categories]);

  useEffect(() => {
    setActiveIdx(0);
  }, [search]);

  const goToTour = (slug: string) => {
    setOpen(false);
    router.push(`/tours/${slug}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOpen(false);
    setPaxOpen(false);
    const params = new URLSearchParams();
    const q = search.trim();
    if (q) params.set('q', q);
    if (date) params.set('date', date);
    if (pax !== 2) params.set('pax', String(pax));
    const qs = params.toString();
    router.push(qs ? `/tours?${qs}` : '/tours');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActiveIdx((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && open && search.trim() && results[activeIdx]) {
      e.preventDefault();
      goToTour(results[activeIdx].slug);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const slide = HERO_SLIDES[slideIdx];
  const quick = categories.filter((c) => tours.some((t) => t.categories.includes(c.slug as never))).slice(0, 5);

  return (
    <section className={`hero hv${shown ? ' is-in' : ''}`}>
      <noscript>
        <style>{`.hv .hv-anim{opacity:1!important;transform:none!important}`}</style>
      </noscript>
      <div className="hero__media">
        {HERO_SLIDES.map((s, i) => (
          <img
            key={s.src}
            src={s.src}
            alt={i === slideIdx ? s.alt : ''}
            aria-hidden={i !== slideIdx}
            className={`hero__slide${i === slideIdx ? ' is-active' : ''}`}
            loading={i === 0 ? 'eager' : 'lazy'}
            fetchPriority={i === 0 ? 'high' : 'auto'}
          />
        ))}
        <div className="hero__veil"></div>
      </div>

      <div className="container hero__inner">
        <p className="hv-eyebrow hv-anim">
          <Icon name="badge-check" size={16} /> Operadora de turismo boliviana
        </p>
        <h1 className="hero__title hv-anim">
          Vive Bolivia con quienes <em>mejor la conocen</em>
        </h1>
        <p className="hero__lead hv-anim">
          Salar de Uyuni, Sajama, Toro Toro, el lago Titicaca y la Amazonía. Elige tu fecha, reserva online y
          recibe tu voucher al instante.
        </p>

        <form className="search hv-anim" onSubmit={handleSubmit} autoComplete="off" role="search">
          <div className="search__field search__field--main" ref={containerRef}>
            <span className="search__icon">
              <Icon name="search" size={19} />
            </span>
            <div className="search__field-text">
              <label htmlFor="hero-q">Destino o tour</label>
              <input
                id="hero-q"
                type="text"
                placeholder="¿A dónde quieres ir?"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={handleKeyDown}
                role="combobox"
                aria-expanded={open}
                aria-controls="hero-search-list"
                aria-autocomplete="list"
                aria-activedescendant={open && results[activeIdx] ? `hero-opt-${results[activeIdx].slug}` : undefined}
              />
            </div>
            {open && (
              <div className="hero-search-dropdown" id="hero-search-list" role="listbox">
                {results.length === 0 ? (
                  <div className="hero-search-empty">
                    Sin resultados para «{search.trim()}». Prueba con otro destino.
                  </div>
                ) : (
                  <>
                    <div className="hero-search-foot">{search.trim() ? 'Tours que coinciden' : 'Tours populares'}</div>
                    {results.map((tour, i) => (
                      <button
                        type="button"
                        key={tour.slug}
                        id={`hero-opt-${tour.slug}`}
                        role="option"
                        aria-selected={i === activeIdx}
                        className={`hero-search-item${i === activeIdx ? ' is-active' : ''}`}
                        onMouseEnter={() => setActiveIdx(i)}
                        onClick={() => goToTour(tour.slug)}
                      >
                        <span
                          className="hero-search-item__img"
                          style={{ backgroundImage: `url('${tourThumb(tour.image)}')` }}
                          aria-hidden="true"
                        ></span>
                        <span className="hero-search-item__body">
                          <span className="hero-search-item__title">{tour.title}</span>
                          <span className="hero-search-item__meta">
                            {tour.destination} · {tour.duration}
                          </span>
                        </span>
                        {tour.price > 0 && <span className="hero-search-item__price">US$ {money(tour.price)}</span>}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
          <div className="search__field search__field--date">
            <span className="search__icon">
              <Icon name="calendar" size={19} />
            </span>
            <div className="search__field-text">
              <label htmlFor="hero-date">Fecha</label>
              <input id="hero-date" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="search__field search__field--pax" ref={paxRef}>
            <span className="search__icon">
              <Icon name="users" size={19} />
            </span>
            <div className="search__field-text">
              <label id="hero-pax-label">Viajeros</label>
              <button
                type="button"
                className="search__pax-btn"
                aria-labelledby="hero-pax-label"
                aria-expanded={paxOpen}
                onClick={() => setPaxOpen((v) => !v)}
              >
                {pax} viajero{pax === 1 ? '' : 's'}
              </button>
            </div>
            {paxOpen && (
              <div className="hero-pax-pop">
                <button type="button" aria-label="Quitar un viajero" disabled={pax <= 1} onClick={() => setPax((p) => Math.max(1, p - 1))}>
                  <Icon name="minus" size={16} />
                </button>
                <span aria-live="polite">{pax}</span>
                <button type="button" aria-label="Añadir un viajero" disabled={pax >= 8} onClick={() => setPax((p) => Math.min(8, p + 1))}>
                  <Icon name="plus" size={16} />
                </button>
              </div>
            )}
          </div>
          <button className="search__submit" type="submit">
            <span>Buscar</span>
            <Icon name="arrow-right" size={18} />
          </button>
        </form>

        {quick.length > 0 && (
          <div className="hv-quick hv-anim">
            <span>Explora:</span>
            {quick.map((c) => (
              <Link key={c.slug} href={`/tours?cat=${c.slug}`} className="hv-quick__chip">
                {c.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="hero__foot">
        <div className="container hero__foot-inner">
          <span className="hero__dest">
            <Icon name="pin" size={14} />
            {slide.destination}
          </span>
          {rating && rating.count > 0 && (
            <span className="hv-rating">
              <Icon name="star-solid" size={15} />
              <strong>{rating.avg.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</strong>
              <span>
                · {rating.count} {rating.count === 1 ? 'opinión' : 'opiniones'} de viajeros
              </span>
            </span>
          )}
          <div className="hero__dots" role="group" aria-label="Destinos destacados">
            {HERO_SLIDES.map((s, i) => (
              <button
                key={s.src}
                type="button"
                className={`hero__dot${i === slideIdx ? ' is-active' : ''}`}
                aria-label={`Ver ${s.destination}`}
                aria-current={i === slideIdx}
                onClick={() => setSlideIdx(i)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
