'use client';

import { getGroupDiscountLabel, getGroupDiscountRate, GROUP_DISCOUNT_MAX_PAX } from '@/lib/pricing';
import type { Tour, TourType } from '@/lib/types';
import Icon from '@/components/ui/Icon';

interface AvailabilityModalProps {
  open: boolean;
  tour: Tour;
  tourType: TourType;
  adults: number;
  children: number;
  date: string;
  startTime: string;
  extraIds: string[];
  totals: {
    perPerson: number;
    extrasTotal: number;
    subtotal: number;
    groupDiscount: number;
    groupDiscountRate: number;
    offerDiscount: number;
    total: number;
  };
  offerPct: number;
  canAdd: boolean;
  onClose: () => void;
  onTourTypeChange: (t: TourType) => void;
  onAdultsChange: (n: number) => void;
  onChildrenChange: (n: number) => void;
  onToggleExtra: (id: string) => void;
  onAddToCart: () => void;
}

const TOUR_TYPE_LABELS: Record<TourType, string> = {
  group: 'Grupal',
  semi: 'Semi',
  private: 'Privado',
};

const fmtTripDate = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString('es-ES', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

export default function AvailabilityModal({
  open,
  tour,
  tourType,
  adults,
  children,
  date,
  startTime,
  extraIds,
  totals,
  offerPct,
  canAdd,
  onClose,
  onTourTypeChange,
  onAdultsChange,
  onChildrenChange,
  onToggleExtra,
  onAddToCart,
}: AvailabilityModalProps) {
  if (!open) return null;

  const pax = adults + children;

  return (
    <div className="am-modal is-open" aria-hidden={false}>
      <div className="am-modal__overlay" onClick={onClose}></div>
      <div className="am-modal__panel" role="dialog" aria-modal="true" aria-labelledby="availTitle">
        <button className="am-modal__close" aria-label="Cerrar" onClick={onClose}>
          <Icon name="close" size={20} />
        </button>

        <header className="am-head">
          <p className="am-head__tour">
            <Icon name="pin" size={14} />{' '}
            {tour.title}
          </p>
          <h2 className="am-head__title" id="availTitle">
            Reserva tu aventura
          </h2>
        </header>

        {date && (
          <div className="am-trip">
            <div className="am-trip__info">
              <span>
                <Icon name="calendar" size={15} />
                {fmtTripDate(date)}
                {startTime ? ` · ${startTime} hs` : ''}
              </span>
              <span>
                <Icon name="users" size={15} />
                {adults} adulto{adults !== 1 ? 's' : ''}
                {children > 0 ? ` · ${children} niño${children !== 1 ? 's' : ''}` : ''}
              </span>
            </div>
            <button type="button" className="am-trip__change" onClick={onClose}>
              Cambiar
            </button>
          </div>
        )}

        <div className="am-body">
          <div className="am-group">
            <span className="am-group__label">Tipo de tour</span>
            <div className="am-tours" role="radiogroup" aria-label="Tipo de tour">
              {(Object.keys(tour.tourTypes) as TourType[]).map((type) => (
                <div key={type} style={{ display: 'contents' }}>
                  <input
                    type="radio"
                    id={`tour-${type}`}
                    name="amTour"
                    value={tour.tourTypes[type]}
                    checked={tourType === type}
                    onChange={() => onTourTypeChange(type)}
                  />
                  <label htmlFor={`tour-${type}`} className="am-tour">
                    <span className="am-tour__name">{TOUR_TYPE_LABELS[type]}</span>
                    <span className="am-tour__price">
                      {tour.tourTypes[type] === 0 ? 'Consultar' : `US$ ${tour.tourTypes[type]}`}
                      <small>/pax</small>
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="am-group">
            <span className="am-group__label">Extras · opcional</span>
            <div className="am-extras">
              {tour.extras.map((extra) => {
                const priceClass =
                  extra.kind === 'free'
                    ? ' am-extra__price--free'
                    : extra.kind === 'pay-on-site'
                      ? ' am-extra__price--dopay'
                      : '';
                const priceLabel =
                  extra.kind === 'free'
                    ? 'Incluido gratis'
                    : extra.kind === 'pay-on-site'
                      ? 'Pago en destino'
                      : `+US$ ${extra.price} total`;
                return (
                  <div key={extra.id} style={{ display: 'contents' }}>
                    <input
                      type="checkbox"
                      id={`extra-${extra.id}`}
                      checked={extraIds.includes(extra.id)}
                      onChange={() => onToggleExtra(extra.id)}
                    />
                    <label htmlFor={`extra-${extra.id}`} className="am-extra">
                      <span className="am-extra__icon" aria-hidden="true">
                        <Icon name="plane" size={17} />
                      </span>
                      <span className="am-extra__name">{extra.name}</span>
                      <span className="am-extra__sub">{extra.sub}</span>
                      <span className={`am-extra__price${priceClass}`}>{priceLabel}</span>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <footer className="am-foot">
          <div className="am-pax">
            <div className="am-pax__label">
              <strong>Adultos</strong>
              <small>13 años o más</small>
            </div>
            <div className="am-pax__ctrl">
              <button
                type="button"
                disabled={adults <= 1}
                onClick={() => onAdultsChange(Math.max(1, adults - 1))}
                aria-label="Restar adulto"
              >
                −
              </button>
              <span>{adults}</span>
              <button
                type="button"
                disabled={pax >= GROUP_DISCOUNT_MAX_PAX}
                onClick={() => onAdultsChange(Math.min(GROUP_DISCOUNT_MAX_PAX - children, adults + 1))}
                aria-label="Sumar adulto"
              >
                +
              </button>
            </div>
          </div>

          <div className="am-pax">
            <div className="am-pax__label">
              <strong>Niños</strong>
              <small>{tour.childAgeMax ? `Hasta ${tour.childAgeMax} años` : 'Tarifa de adulto online'}</small>
            </div>
            <div className="am-pax__ctrl">
              <button
                type="button"
                disabled={children <= 0}
                onClick={() => onChildrenChange(Math.max(0, children - 1))}
                aria-label="Restar niño"
              >
                −
              </button>
              <span>{children}</span>
              <button
                type="button"
                disabled={pax >= GROUP_DISCOUNT_MAX_PAX}
                onClick={() => onChildrenChange(Math.min(GROUP_DISCOUNT_MAX_PAX - adults, children + 1))}
                aria-label="Sumar niño"
              >
                +
              </button>
            </div>
          </div>

          <div className="am-total">
            <div className="am-total__rows">
              <div className="am-total__row">
                <span>
                  Subtotal · {pax} × US$ {totals.perPerson}
                  {totals.extrasTotal > 0 ? ` + US$ ${totals.extrasTotal} extras` : ''}
                </span>
                <span>US$ {totals.subtotal}</span>
              </div>
              {totals.groupDiscount > 0 && (
                <div className="am-total__row am-total__row--discount">
                  <span>Descuento por grupo ({Math.round(totals.groupDiscountRate * 100)}%)</span>
                  <span>−US$ {totals.groupDiscount}</span>
                </div>
              )}
              {totals.offerDiscount > 0 && (
                <div className="am-total__row am-total__row--discount">
                  <span>Oferta especial ({offerPct}%)</span>
                  <span>−US$ {totals.offerDiscount}</span>
                </div>
              )}
            </div>
            <div className="am-total__final">
              <span className="am-total__label">Total</span>
              <strong>US$ {totals.total}</strong>
            </div>
          </div>

          {getGroupDiscountRate(pax) > 0 && (
            <div className="am-promo">
              <Icon name="tag" size={15} />
              <span>
                {pax >= GROUP_DISCOUNT_MAX_PAX
                  ? `¡Descuento máximo! ${getGroupDiscountLabel(pax)} por reservar ${pax} viajeros.`
                  : getGroupDiscountRate(pax) === getGroupDiscountRate(pax + 1)
                    ? `¡${getGroupDiscountLabel(pax)} por grupo ya aplicado! Suma más viajeros para mantener el descuento.`
                    : `¡${getGroupDiscountLabel(pax)} por grupo! Subí a ${pax + 1} para llegar a ${getGroupDiscountLabel(pax + 1)}.`}
              </span>
            </div>
          )}

          {!canAdd && (
            <p className="am-warning" role="alert">
              Cupo insuficiente para {pax} viajeros en esta salida. Quita viajeros o cambia de horario.
            </p>
          )}
          <button className="am-cta" onClick={onAddToCart} disabled={!canAdd}>
            Añadir al carrito
            <Icon name="arrow-right" size={17} />
          </button>
        </footer>
      </div>
    </div>
  );
}
