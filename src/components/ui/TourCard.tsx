'use client';

import Link from 'next/link';
import type { Tour } from '@/lib/types';
import Icon from '@/components/ui/Icon';
import { tourThumb } from '@/lib/api';
import { money } from '@/lib/pricing';
import { cancellationShort } from '@/lib/site';
import { fmtDate, serviceKind, SERVICE_LABEL } from '@/lib/tour-display';
import { useFavorites } from '@/context/FavoritesContext';

interface TourCardProps {
  tour: Tour;
  /** Carga la foto de inmediato (primeras tarjetas visibles). */
  priority?: boolean;
  /** Próxima fecha con cupo (listado). undefined = no se muestra; null = sin fechas abiertas. */
  nextDate?: string | null;
}

export default function TourCard({ tour, priority = false, nextDate }: TourCardProps) {
  const { has, toggle, hydrated } = useFavorites();
  const saved = hydrated && has(tour.slug);

  const offerPct = tour.offerPct ?? 0;
  const hasOffer = offerPct > 0;
  const finalPrice = hasOffer ? Math.round(tour.price * (1 - offerPct / 100)) : tour.price;
  const rating = typeof tour.rating === 'number' && tour.rating > 0 ? tour.rating : null;
  const reviewCount =
    typeof tour.reviewCount === 'number' && tour.reviewCount > 0 ? tour.reviewCount : null;
  const cancel = cancellationShort(tour.freeCancellationHours ?? 0);
  const kind = serviceKind(tour);
  const hasPrice = tour.price > 0;

  return (
    <article className="tour-card card">
      <Link className="tour-card__link" href={`/tours/${tour.slug}`} aria-label={tour.title} />
      <div className="tour-card__media">
        <img
          src={tourThumb(tour.image)}
          alt=""
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
        />
        {kind && (
          <span className={`tour-card__tag ht-tag ht-tag--${kind}`}>
            <Icon name={kind === 'private' ? 'user' : 'users'} size={13} />
            {SERVICE_LABEL[kind]}
          </span>
        )}
        {tour.badge && !/^tour (privado|grupal)$/i.test(tour.badge) && (
          <span className="tour-card__badge">{tour.badge}</span>
        )}
        {hasOffer && <span className="tour-card__badge tour-card__badge--offer">−{offerPct}%</span>}
        <button
          type="button"
          className={`tour-card__heart${saved ? ' is-on' : ''}`}
          aria-pressed={saved}
          aria-label={saved ? `Quitar ${tour.title} de favoritos` : `Guardar ${tour.title} en favoritos`}
          onClick={() => toggle(tour.slug)}
        >
          <Icon name="heart" size={18} />
        </button>
      </div>
      <div className="card__body">
        <p className="tour-card__dest">
          <Icon name="pin" size={12} /> {tour.destination}
        </p>
        <h3 className="card__title">{tour.title}</h3>
        <div className="card__meta">
          <span>
            <Icon name="clock" size={15} /> {tour.duration}
          </span>
          {tour.departures && (
            <span>
              <Icon name="calendar" size={15} /> {tour.departures}
            </span>
          )}
          {!tour.departures && tour.pickupIncluded && (
            <span>
              <Icon name="pin" size={15} /> Recojo incluido
            </span>
          )}
        </div>
        {rating !== null ? (
          <div className="tour-card__rating">
            <Icon name="star-solid" size={14} />
            <strong>
              {rating.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </strong>
            {reviewCount !== null && (
              <span>
                ({reviewCount.toLocaleString('es-ES')} {reviewCount === 1 ? 'reseña' : 'reseñas'})
              </span>
            )}
          </div>
        ) : null}
        {nextDate !== undefined ? (
          <p className={`tour-card__next${nextDate ? '' : ' is-none'}`}>
            <Icon name="calendar" size={14} />
            {nextDate ? (
              <span>
                Próxima salida: <b>{fmtDate(nextDate, { weekday: 'short', day: 'numeric', month: 'short' })}</b>
              </span>
            ) : (
              <span>Fechas a consultar</span>
            )}
          </p>
        ) : (
          rating === null &&
          cancel && (
            <p className="tour-card__cancel">
              <Icon name="rotate-ccw" size={14} /> {cancel}
            </p>
          )
        )}
        <div className="card__price">
          {hasPrice ? (
            <>
              <small>Desde</small>
              <strong>US$ {money(finalPrice)}</strong>
              {hasOffer && <s>US$ {money(tour.price)}</s>}
              <span className="card__price-per">por persona</span>
            </>
          ) : (
            <span className="card__price-per">Precio a consultar</span>
          )}
        </div>
      </div>
    </article>
  );
}
