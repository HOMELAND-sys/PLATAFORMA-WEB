'use client';

import { useEffect, useState } from 'react';
import { reviews } from '@/data/reviews';

const VISIBLE = 3;
const ROTATE_MS = 5000;

export default function ReviewsCarousel() {
  const [start, setStart] = useState(0);
  const [animating, setAnimating] = useState(false);

  const totalDots = Math.ceil(reviews.length / VISIBLE);

  const goTo = (next: number) => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => {
      setStart(next);
      setAnimating(false);
    }, 350);
  };

  const prev = () => goTo((start - VISIBLE + reviews.length) % reviews.length);
  const next = () => goTo((start + VISIBLE) % reviews.length);

  useEffect(() => {
    const interval = setInterval(() => {
      goTo((start + VISIBLE) % reviews.length);
    }, ROTATE_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, animating]);

  const visible = Array.from({ length: VISIBLE }, (_, i) => reviews[(start + i) % reviews.length]);

  return (
    <section className="ta-reviews">
      <div className="ta-reviews__bg">
        <img src="/assets/uyuni-salt.jpg" alt="" />
        <div className="ta-reviews__bg-tint"></div>
      </div>

      <button className="ta-reviews__nav ta-reviews__nav--prev" onClick={prev} aria-label="Anterior">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      <button className="ta-reviews__nav ta-reviews__nav--next" onClick={next} aria-label="Siguiente">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>

      <div className="ta-reviews__head">
        <p className="ta-reviews__pretitle">Lo que dicen</p>
        <h2 className="ta-reviews__title">nuestros viajeros</h2>
        <p className="ta-reviews__sub">Ellos dan testimonio de nuestros servicios</p>
      </div>

      <div
        className="ta-reviews__grid"
        style={{
          opacity: animating ? 0 : 1,
          transform: animating ? 'translateY(15px)' : 'translateY(0)',
          transition: 'opacity 0.35s ease, transform 0.35s ease',
        }}
      >
        {visible.map((r, i) => (
          <div className="ta-review" key={`${r.name}-${start + i}`}>
            <div className="ta-review__bubble">
              <span className="ta-review__quote">&quot;</span>
              <div className="ta-review__head">
                <div className="ta-review__stars">
                  {Array.from({ length: r.stars }, (_, j) => (
                    <span key={j} className="ta-review__star"></span>
                  ))}
                </div>
                <span className="ta-review__title">{r.title}</span>
                <span className="ta-review__dash">-</span>
                <span className="ta-review__text">
                  {r.text} <a href="#" className="ta-review__more">Leer más</a>
                </span>
              </div>
              <div className="ta-review__verified" aria-label="Reseña verificada">
                <svg viewBox="0 0 24 24" width="22" height="22">
                  <circle cx="12" cy="12" r="11" fill="#00aa6c" />
                  <circle cx="12" cy="12" r="4" fill="#fff" />
                  <circle cx="9" cy="9" r="1.4" fill="#00aa6c" />
                  <circle cx="15" cy="9" r="1.4" fill="#00aa6c" />
                </svg>
              </div>
              <div className="ta-review__tail"></div>
            </div>
            <div className="ta-review__meta">
              <div className="ta-review__avatar" style={{ backgroundImage: `url('${r.avatar}')` }}></div>
              <div className="ta-review__info">
                <strong>{r.name}</strong>
                <small>{r.date}</small>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="ta-reviews__dots">
        {Array.from({ length: totalDots }, (_, i) => (
          <button
            key={i}
            className={`ta-reviews__dot${start / VISIBLE === i ? ' is-active' : ''}`}
            aria-label={`Página ${i + 1}`}
            onClick={() => goTo(i * VISIBLE)}
          ></button>
        ))}
      </div>
    </section>
  );
}
