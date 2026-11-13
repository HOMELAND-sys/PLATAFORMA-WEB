'use client';

import { useState } from 'react';
import { checkCoupon, tourThumb } from '@/lib/api';
import { formatUsd, usdToBob } from '@/lib/pricing';
import { getSupabase } from '@/lib/supabase';
import { cancellationShort } from '@/lib/site';
import { fmtDate, plural, TYPE_LABEL } from '@/lib/tour-display';
import type { BookingSelection, Tour } from '@/lib/types';
import Icon from '@/components/ui/Icon';

interface SummaryCardProps {
  tour: Tour;
  selection: BookingSelection | null;
  paxCount: number;
  couponCode: string | null;
  couponDiscount: number;
  totals: {
    groupDiscount: number;
    groupDiscountRate?: number;
    offerDiscount?: number;
    offerPct?: number;
    coupon: number;
    total: number;
  };
  baseSubtotal: number;
  onApplyCoupon: (code: string, discount: number) => void;
  onRemoveCoupon?: () => void;
}

export default function SummaryCard({
  tour,
  selection,
  paxCount,
  couponCode,
  couponDiscount,
  totals,
  baseSubtotal,
  onApplyCoupon,
  onRemoveCoupon,
}: SummaryCardProps) {
  const [input, setInput] = useState('');
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [checking, setChecking] = useState(false);

  const children = selection?.children ?? 0;
  const adults = selection?.adults ?? Math.max(0, paxCount - children);
  const perPerson = selection?.perPerson ?? 0;
  const childPrice =
    tour.priceChild != null && children > 0 ? Math.min(Number(tour.priceChild), perPerson) : perPerson;
  const extras = tour.extras.filter((e) => selection?.extras.includes(e.id));
  const cancel = cancellationShort(tour.freeCancellationHours ?? 0);

  const applyCoupon = async () => {
    const code = input.trim().toUpperCase();
    if (!code) {
      setMessage({ text: 'Escribe un código de cupón.', ok: false });
      return;
    }
    setChecking(true);
    try {
      const coupon = await checkCoupon(getSupabase(), code);
      if (coupon.valid) {
        onApplyCoupon(coupon.code, coupon.discount_pct);
        setMessage({ text: `Cupón ${coupon.code} aplicado: ${coupon.discount_pct}% de descuento.`, ok: true });
      } else {
        setMessage({ text: 'Ese cupón no existe, no está activo o ya venció.', ok: false });
      }
    } catch {
      setMessage({ text: 'No pudimos validar el cupón. Vuelve a intentarlo.', ok: false });
    } finally {
      setChecking(false);
    }
  };

  return (
    <aside className="summary-card" aria-label="Resumen de tu reserva">
      <h3>Tu reserva</h3>

      <div className="summary-tour">
        <div className="summary-tour__img" style={{ backgroundImage: `url('${tourThumb(tour.image)}')` }} />
        <div>
          <div className="summary-tour__name">{tour.title}</div>
          <div className="summary-tour__meta">
            {tour.duration}
            {selection ? ` · ${TYPE_LABEL[selection.tourType]}` : ''}
          </div>
        </div>
      </div>

      <div className="summary-row">
        <span className="icon-inline">
          <Icon name="calendar" size={16} /> Salida
        </span>
        <span style={{ textAlign: 'right' }}>
          {selection?.date ? fmtDate(selection.date) : 'Fecha por elegir'}
          {selection?.startTime ? (
            <>
              <br />
              <small className="text-muted">{selection.startTime} h (hora de Bolivia)</small>
            </>
          ) : null}
        </span>
      </div>
      <div className="summary-row">
        <span className="icon-inline">
          <Icon name="users" size={16} /> Viajeros
        </span>
        <span>
          {plural(adults, 'adulto', 'adultos')}
          {children > 0 ? ` · ${plural(children, 'niño', 'niños')}` : ''}
        </span>
      </div>

      <div className="divider" style={{ margin: '16px 0' }} />

      {children > 0 && childPrice !== perPerson ? (
        <>
          <div className="summary-row">
            <span>
              {plural(adults, 'adulto', 'adultos')} × {formatUsd(perPerson)}
            </span>
            <span>{formatUsd(perPerson * adults)}</span>
          </div>
          <div className="summary-row">
            <span>
              {plural(children, 'niño', 'niños')} × {formatUsd(childPrice)}
            </span>
            <span>{formatUsd(childPrice * children)}</span>
          </div>
        </>
      ) : (
        <div className="summary-row">
          <span>
            {plural(paxCount, 'viajero', 'viajeros')} × {formatUsd(perPerson)}
          </span>
          <span>{formatUsd(perPerson * paxCount)}</span>
        </div>
      )}
      {extras
        .filter((e) => e.kind === 'paid')
        .map((e) => (
          <div className="summary-row summary-row--sub" key={e.id}>
            <span>{e.name}</span>
            <span>{formatUsd(e.price)}</span>
          </div>
        ))}
      {totals.groupDiscount > 0 && (
        <div className="summary-row summary-row--sub summary-row--off">
          <span>Descuento por grupo ({Math.round((totals.groupDiscountRate ?? 0) * 100)}%)</span>
          <span>−{formatUsd(totals.groupDiscount)}</span>
        </div>
      )}
      {(totals.offerDiscount ?? 0) > 0 && (
        <div className="summary-row summary-row--sub summary-row--off">
          <span>Oferta especial ({Math.round(totals.offerPct ?? 0)}%)</span>
          <span>−{formatUsd(totals.offerDiscount ?? 0)}</span>
        </div>
      )}
      {couponCode && (
        <div className="summary-row summary-row--sub summary-row--off">
          <span>
            Cupón {couponCode}
            {onRemoveCoupon && (
              <button type="button" className="summary-coupon__remove" onClick={onRemoveCoupon}>
                Quitar
              </button>
            )}
          </span>
          <span>−{formatUsd(couponDiscount)}</span>
        </div>
      )}

      <div className="summary-row summary-row--total">
        <span>Total</span>
        <span>{formatUsd(totals.total)}</span>
      </div>
      <p className="summary-bob">
        Aprox. Bs {usdToBob(totals.total).toLocaleString('es-BO')} · sin cargos ocultos
        {baseSubtotal > totals.total ? ` · ahorras ${formatUsd(baseSubtotal - totals.total)}` : ''}
      </p>

      {!couponCode && (
        <div className="summary-coupon">
          {open ? (
            <>
              <div className="summary-coupon__form">
                <input
                  type="text"
                  className="summary-coupon__input"
                  placeholder="Código de cupón"
                  aria-label="Código de cupón"
                  value={input}
                  autoFocus
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void applyCoupon();
                    }
                  }}
                />
                <button type="button" className="summary-coupon__btn" onClick={() => void applyCoupon()} disabled={checking}>
                  {checking ? '…' : 'Aplicar'}
                </button>
              </div>
            </>
          ) : (
            <button type="button" className="summary-coupon__toggle" onClick={() => setOpen(true)}>
              <Icon name="tag" size={15} /> Tengo un cupón de descuento
            </button>
          )}
        </div>
      )}
      {message && (
        <p className={`summary-coupon__msg${message.ok ? ' is-ok' : ' is-error'}`} role="status">
          {message.text}
        </p>
      )}

      <ul className="summary-perks">
        <li>
          <Icon name="shield-check" size={16} /> Reserva ahora, paga después
        </li>
        {cancel && (
          <li>
            <Icon name="rotate-ccw" size={16} /> {cancel}
          </li>
        )}
        <li>
          <Icon name="ticket" size={16} /> Voucher digital al instante
        </li>
      </ul>
    </aside>
  );
}
