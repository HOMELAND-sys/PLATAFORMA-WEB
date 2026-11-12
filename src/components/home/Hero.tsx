'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { SplitText } from 'gsap/SplitText';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import Icon from '@/components/ui/Icon';
import { onIntroReveal, prefersReducedMotion } from '@/lib/intro';
import { fetchActiveTours, fetchCategories, type CategoryRow } from '@/lib/api';
import { getSupabase } from '@/lib/supabase';
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
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);

  /* Entrada del hero: espera a que la intro del logotipo abra la cortina. */
  useGSAP(
    () => {
      const hero = heroRef.current;
      if (!hero || prefersReducedMotion()) return;
      const q = gsap.utils.selector(hero);
      const img = q('.hero__media img');
      const eyebrow = q('.hero__eyebrow')[0] as HTMLElement | undefined;
      const title = q('.hero__title')[0] as HTMLElement | undefined;
      const rest = q('.hero__lead, .search');

      gsap.set(img, { scale: 1.18, transformOrigin: '50% 60%' });
      gsap.set([eyebrow, title, ...rest], { autoAlpha: 0 });

      let split: SplitText | null = null;
      const play = () => {
        const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
        tl.to(img, { scale: 1, duration: 2.6, ease: 'power3.out' }, 0);

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
    if (results.length > 0) {
      goToTour(results[activeIdx]?.slug ?? results[0].slug);
    } else {
      router.push(`/tours?q=${encodeURIComponent(search.trim())}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) setOpen(true);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <section className="hero" ref={heroRef}>
      <div className="hero__media">
        <img src="/assets/uyuni-mirror.jpg" alt="Paisaje andino" />
        <div className="hero__veil"></div>
      </div>
      <div className="container hero__inner">
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
              <label>Buscar tour</label>
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
                        style={{ backgroundImage: `url('${tour.image}')` }}
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
          <button className="search__submit" type="submit">
            <span>Buscar tours</span>
            <Icon name="arrow-right" size={18} />
          </button>
        </form>
      </div>
    </section>
  );
}
