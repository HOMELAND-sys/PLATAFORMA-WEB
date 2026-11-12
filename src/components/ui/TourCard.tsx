import Link from 'next/link';
import type { Tour } from '@/lib/types';
import Icon from '@/components/ui/Icon';

interface TourCardProps {
  tour: Tour;
}

function HeartIcon() {
  return (
    <span className="tour-card__heart" aria-label="Favorito">
      <Icon name="heart" size={17} />
    </span>
  );
}

function ArrowIcon() {
  return (
    <Icon name="arrow-right" size={17} />
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
          <span>
            <Icon name="clock" size={15} /> {tour.duration}
          </span>
          <span>
            <Icon name="mountain" size={15} /> {tour.difficulty}
          </span>
          <span>
            <Icon name="users" size={15} /> {tour.typeLabel}
          </span>
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
