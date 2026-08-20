'use client';

import { getGroupDiscountLabel, getGroupDiscountRate, GROUP_DISCOUNT_MAX_PAX } from '@/lib/pricing';
import type { Tour, TourType } from '@/lib/types';

interface AvailabilityModalProps {
  open: boolean;
  tour: Tour;
  tourType: TourType;
  pax: number;
  extraIds: string[];
  total: { perPerson: number; extrasTotal: number; subtotal: number };
  onClose: () => void;
  onTourTypeChange: (t: TourType) => void;
  onPaxChange: (p: number) => void;
  onToggleExtra: (id: string) => void;
  onAddToCart: () => void;
}

const TOUR_TYPE_LABELS: Record<TourType, string> = {
  group: 'Grupal',
  semi: 'Semi',
  private: 'Privado',
};

export default function AvailabilityModal({
  open,
  tour,
  tourType,
  pax,
  extraIds,
  total,
  onClose,
  onTourTypeChange,
  onPaxChange,
  onToggleExtra,
  onAddToCart,
}: AvailabilityModalProps) {
  if (!open) return null;

  return (
    <div className="am-modal is-open" aria-hidden={false}>
      <div className="am-modal__overlay" onClick={onClose}></div>
      <div className="am-modal__panel" role="dialog" aria-modal="true" aria-labelledby="availTitle">
        <button className="am-modal__close" aria-label="Cerrar" onClick={onClose}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <header className="am-head">
          <p className="am-head__tour">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>{' '}
            {tour.title}
          </p>
          <h2 className="am-head__title" id="availTitle">
            Reservá tu aventura
          </h2>
        </header>

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
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
                        </svg>
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
              <small>
                {pax} {pax === 1 ? 'pasajero' : 'pasajeros'}
              </small>
            </div>
            <div className="am-pax__ctrl">
              <button type="button" onClick={() => onPaxChange(Math.max(1, pax - 1))} aria-label="Restar pasajero">
                −
              </button>
              <span>{pax}</span>
              <button type="button" onClick={() => onPaxChange(Math.min(GROUP_DISCOUNT_MAX_PAX, pax + 1))} aria-label="Sumar pasajero">
                +
              </button>
            </div>
          </div>

          <div className="am-total">
            <div>
              <span className="am-total__label">Total</span>
              <small>
                {pax} × US$ {total.perPerson}
                {total.extrasTotal > 0 ? ` + US$ ${total.extrasTotal}` : ''}
              </small>
            </div>
            <strong>US$ {total.subtotal}</strong>
          </div>

          {getGroupDiscountRate(pax) > 0 && (
            <div className="am-promo">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
              <span>
                {pax >= GROUP_DISCOUNT_MAX_PAX
                  ? `¡Descuento máximo! ${getGroupDiscountLabel(pax)} por reservar ${pax} pasajeros.`
                  : getGroupDiscountRate(pax) === getGroupDiscountRate(pax + 1)
                    ? `¡${getGroupDiscountLabel(pax)} por grupo ya aplicado! Sumá más pasajeros para mantener el descuento.`
                    : `¡${getGroupDiscountLabel(pax)} por grupo! Subí a ${pax + 1} para llegar a ${getGroupDiscountLabel(pax + 1)}.`}
              </span>
            </div>
          )}

          <button className="am-cta" onClick={onAddToCart}>
            Añadir al carrito
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </button>
        </footer>
      </div>
    </div>
  );
}
