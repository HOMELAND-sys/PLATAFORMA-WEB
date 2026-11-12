'use client';

import { getGroupDiscountLabel, getGroupDiscountRate, GROUP_DISCOUNT_MAX_PAX } from '@/lib/pricing';
import type { Tour, TourType } from '@/lib/types';
import Icon from '@/components/ui/Icon';

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
          <Icon name="close" size={20} />
        </button>

        <header className="am-head">
          <p className="am-head__tour">
            <Icon name="pin" size={14} />{' '}
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
              <Icon name="tag" size={15} />
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
            <Icon name="arrow-right" size={17} />
          </button>
        </footer>
      </div>
    </div>
  );
}
