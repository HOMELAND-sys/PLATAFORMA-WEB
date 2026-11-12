'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { SplitText } from 'gsap/SplitText';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import Icon from '@/components/ui/Icon';
import HomelandLogo from '@/components/brand/HomelandLogo';
import { onIntroReveal, prefersReducedMotion } from '@/lib/intro';
import { fetchActiveTours, fetchCategories, tourThumb, type CategoryRow } from '@/lib/api';
import { getSupabase } from '@/lib/supabase';
import { HERO_SLIDES } from '@/data/site-photos';
import type { Tour } from '@/lib/types';

gsap.registerPlugin(useGSAP, SplitText, ScrambleTextPlugin);

const PLACEHOLDERS = [
  '¿A dónde quieres ir?',
  'Salar de Uyuni',
  'La Paz',
  'Valle de la Luna',
  'Amazonía',
  'Titicaca',
  'Potosí',
];

const SLIDE_MS = 7000;
const PROOF_AVATARS = [12, 32, 45, 8];

function tourMatchesQuery(tour: Tour, q: string, categories: CategoryRow[]): boolean {
  if (!q) return true;
  const haystack = [
    tour.title,
    tour.destination,
    tour.summary.join(' '),
    tour.highlights.join(' '),
    tour.typeLabel,
    tour.activityLabel,
    ...categories.filter((c) => tour.categories.includes(c.slug as never)).map((c) => c.label),
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(q.toLowerCase());
}

export default function Hero() {
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [tours, setTours] = useState<Tour[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [slideIdx, setSlideIdx] = useState(0);
  const [date, setDate] = useState('');
  const [pax, setPax] = useState(2);
  const [paxOpen, setPaxOpen] = useState(false);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const paxRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  /* Entrada del hero: espera a que la intro del logotipo abra la cortina. */
  useGSAP(
    () => {
      const hero = heroRef.current;
      if (!hero || prefersReducedMotion()) return;
      const q = gsap.utils.selector(hero);
      const media = q('.hero__media');
      const eyebrow = q('.hero__eyebrow')[0] as HTMLElement | undefined;
      const title = q('.hero__title')[0] as HTMLElement | undefined;
      const rest = q('.hero__lead, .search, .hero__proof, .hero__foot');

      gsap.set(media, { autoAlpha: 0 });
      gsap.set([eyebrow, title, ...rest], { autoAlpha: 0 });

      let split: SplitText | null = null;
      const play = () => {
        const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
        tl.to(media, { autoAlpha: 1, duration: 1.6, ease: 'power2.out' }, 0);

        if (eyebrow) {
          const text = eyebrow.textContent ?? '';
          tl.set(eyebrow, { autoAlpha: 1 }, 0.25).to(
            eyebrow,
            { duration: 1.2, scrambleText: { text, chars: 'upperCase', speed: 0.5, revealDelay: 0.15 }, ease: 'none' },
            0.25,
          );
        }

        if (title) {
          split = SplitText.create(title, { type: 'lines,words', mask: 'lines', linesClass: 'hero__line' });
          tl.set(title, { autoAlpha: 1 }, 0.3).from(
            split.words,
            { yPercent: 115, rotate: 4, duration: 1.3, stagger: 0.07, transformOrigin: '0% 100%' },
            0.3,
          );
          tl.add(() => {
            split?.revert();
            split = null;
          });
        }

        tl.fromTo(
          rest,
          { autoAlpha: 0, y: 26 },
          { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.12, clearProps: 'transform' },
          0.75,
        );
      };

      let cancelled = false;
      const unsubscribe = onIntroReveal(() => {
        // Espera a las fuentes para que SplitText corte las líneas correctamente.
        void document.fonts.ready.then(() => {
          if (!cancelled) play();
        });
      });
      return () => {
        cancelled = true;
        unsubscribe();
        split?.revert();
      };
    },
    { scope: heroRef },
  );

  useEffect(() => {
    let active = true;
    Promise.all([fetchActiveTours(getSupabase()), fetchCategories(getSupabase())])
      .then(([t, c]) => {
        if (!active) return;
        setTours(t);
        setCategories(c);
      })
      .catch(() => {
        // sin catálogo no hay sugerencias
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const t = setTimeout(() => setSlideIdx((i) => (i + 1) % HERO_SLIDES.length), SLIDE_MS);
    return () => clearTimeout(t);
  }, [slideIdx]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (inputRef.current && document.activeElement !== inputRef.current && !search) {
      inputRef.current.placeholder = PLACEHOLDERS[placeholderIdx];
    }
  }, [placeholderIdx, search]);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
      if (paxRef.current && !paxRef.current.contains(e.target as Node)) {
        setPaxOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const results = useMemo(() => {
    const q = search.trim();
    if (!q) return tours.slice(0, 6);
    return tours.filter((t) => tourMatchesQuery(t, q, categories)).slice(0, 8);
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
    params.set('pax', String(pax));
    router.push(`/tours?${params.toString()}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) setOpen(true);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const slide = HERO_SLIDES[slideIdx];

  return (
    <section className="hero" ref={heroRef}>
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
        <HomelandLogo className="hero__brand" height={30} />
        <p className="hero__eyebrow">Authentic journeys. Local hearts.</p>
        <h1 className="hero__title">
          Descubre la magia
          <br />
          de los <em>Andes Bolivianos</em>
        </h1>
        <p className="hero__lead">
          Paisajes inolvidables, culturas vibrantes y experiencias auténticas —{' '}
          <span className="accent">reservables 100% online</span> con operadores locales.
        </p>

        <form className="search" onSubmit={handleSubmit} autoComplete="off">
          <div className="search__field search__field--main" ref={containerRef}>
            <span className="search__icon">
              <Icon name="search" size={19} />
            </span>
            <div className="search__field-text">
              <label>Destino o tour</label>
              <input
                ref={inputRef}
                type="text"
                placeholder={PLACEHOLDERS[0]}
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
                    Sin resultados para &ldquo;{search.trim()}&rdquo;. Probá con otro destino.
                  </div>
                ) : (
                  results.map((tour, i) => (
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
                      <span className="hero-search-item__price">US$ {tour.price}</span>
                    </button>
                  ))
                )}
                <div className="hero-search-foot">
                  {results.length > 0 ? `${results.length} tour${results.length === 1 ? '' : 's'} sugerido${results.length === 1 ? '' : 's'}` : ''}
                </div>
              </div>
            )}
          </div>
          <div className="search__field search__field--date">
            <span className="search__icon">
              <Icon name="calendar" size={19} />
            </span>
            <div className="search__field-text">
              <label htmlFor="hero-date">Fecha</label>
              <input
                id="hero-date"
                type="date"
                min={today}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
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
                <button
                  type="button"
                  aria-label="Quitar un viajero"
                  disabled={pax <= 1}
                  onClick={() => setPax((p) => Math.max(1, p - 1))}
                >
                  <Icon name="minus" size={16} />
                </button>
                <span aria-live="polite">{pax}</span>
                <button
                  type="button"
                  aria-label="Añadir un viajero"
                  disabled={pax >= 12}
                  onClick={() => setPax((p) => Math.min(12, p + 1))}
                >
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
      </div>

      <aside className="hero__proof">
        <div className="avatar-group">
          {PROOF_AVATARS.map((n) => (
            <span
              key={n}
              className="avatar"
              style={{ backgroundImage: `url('https://i.pravatar.cc/60?img=${n}')` }}
            ></span>
          ))}
        </div>
        <div className="hero__proof-body">
          <span className="hero__proof-score">
            <Icon name="star-solid" size={14} />
            <strong>4.9/5</strong> Excelente
          </span>
          <span className="hero__proof-text">
            Confianza de <strong>12.000+</strong> viajeros
          </span>
        </div>
      </aside>

      <div className="hero__foot">
        <div className="container hero__foot-inner">
          <span className="hero__dest">
            <Icon name="pin" size={14} />
            {slide.destination}
          </span>
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
