import Link from 'next/link';
import type { Tour } from '@/lib/types';

interface TourCardProps {
  tour: Tour;
}

function HeartIcon() {
  return (
    <span className="tour-card__heart" aria-label="Favorito">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </span>
  );
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}

export default function TourCard({ tour }: TourCardProps) {
  const badgeClass =
    tour.badgeVariant === 'popular'
      ? ' tour-card__badge--popular'
      : tour.badgeVariant === 'adventure'
        ? ' tour-card__badge--adventure'
        : tour.badgeVariant === 'cultural'
          ? ' tour-card__badge--cultural'
          : '';

  return (
    <Link className="tour-card card" href={`/tours/${tour.slug}`}>
      <div className="tour-card__media">
        <img src={tour.image} alt={tour.title} />
        {tour.badge && <span className={`tour-card__badge${badgeClass}`}>{tour.badge}</span>}
        <HeartIcon />
      </div>
      <div className="card__body">
        <h3 className="card__title">{tour.title}</h3>
        <div className="card__meta">
          <span>⏱ {tour.duration}</span>
          <span>⛰ {tour.difficulty}</span>
          <span>👥 {tour.typeLabel}</span>
        </div>
        <div className="card__price">
          <small>Desde</small>
          <strong>US$ {tour.price}</strong>
        </div>
        <span className="card__cta">
          <ArrowIcon />
        </span>
      </div>
    </Link>
  );
}
