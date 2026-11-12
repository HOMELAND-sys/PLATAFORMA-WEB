import Link from 'next/link';
import type { Tour } from '@/lib/types';
import Icon from '@/components/ui/Icon';
import { tourThumb } from '@/lib/api';

interface TourCardProps {
  tour: Tour;
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

  const offerPct = tour.offerPct ?? 0;
  const hasOffer = offerPct > 0;
  const finalPrice = hasOffer ? Math.round(tour.price * (1 - offerPct / 100)) : tour.price;
  const rating = typeof tour.rating === 'number' ? tour.rating : null;
  const reviewCount =
    typeof tour.reviewCount === 'number' && tour.reviewCount > 0 ? tour.reviewCount : null;
  const languages = (tour.languages ?? []).filter(Boolean);
  const freeCancel = (tour.freeCancellationHours ?? 0) > 0;

  return (
    <Link className="tour-card card" href={`/tours/${tour.slug}`}>
      <div className="tour-card__media">
        <img src={tourThumb(tour.image)} alt={tour.title} loading="lazy" />
        {tour.badge && <span className={`tour-card__badge${badgeClass}`}>{tour.badge}</span>}
        {hasOffer && (
          <span className="tour-card__badge tour-card__badge--offer">Oferta −{offerPct}%</span>
        )}
        <span className="tour-card__heart" aria-label="Favorito">
          <Icon name="heart" size={17} />
        </span>
      </div>
      <div className="card__body">
        <p className="tour-card__dest">{tour.destination}</p>
        <h3 className="card__title">{tour.title}</h3>
        <div className="card__meta">
          <span>
            <Icon name="clock" size={15} /> {tour.duration}
          </span>
          {languages.length > 0 && (
            <span>
              <Icon name="globe" size={15} /> {languages.join(', ')}
            </span>
          )}
          {tour.pickupIncluded && (
            <span>
              <Icon name="pin" size={15} /> Recogida incluida
            </span>
          )}
        </div>
        {rating !== null && (
          <div className="tour-card__rating">
            <Icon name="star-solid" size={14} />
            <strong>
              {rating.toLocaleString('es-ES', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
            </strong>
            {reviewCount !== null && (
              <span>({reviewCount.toLocaleString('es-ES')} reseñas)</span>
            )}
          </div>
        )}
        {freeCancel && (
          <p className="tour-card__cancel">
            <Icon name="check" size={14} /> Cancelación gratis
          </p>
        )}
        <div className="card__price">
          <small>Desde</small>
          <strong>US$ {finalPrice}</strong>
          {hasOffer && <s>US$ {tour.price}</s>}
          <span className="card__price-per">por persona</span>
        </div>
      </div>
    </Link>
  );
}
