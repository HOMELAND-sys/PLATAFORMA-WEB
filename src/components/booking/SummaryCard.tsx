'use client';

import { useState } from 'react';
import { checkCoupon } from '@/lib/api';
import { formatUsd, usdToBob } from '@/lib/pricing';
import { getSupabase } from '@/lib/supabase';
import type { BookingSelection, Tour } from '@/lib/types';
import Icon from '@/components/ui/Icon';

interface SummaryCardProps {
  tour?: Tour;
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
}: SummaryCardProps) {
  const [input, setInput] = useState('');
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const [checking, setChecking] = useState(false);

  const children = selection?.children ?? 0;
  const adults = selection?.adults ?? Math.max(0, paxCount - children);
  const perPerson = selection?.perPerson ?? 0;

  const applyCoupon = async () => {
    const code = input.trim().toUpperCase();
    if (!code) {
      setMessage({ text: 'Ingresá un código de cupón.', ok: false });
      return;
    }
    setChecking(true);
    try {
      const coupon = await checkCoupon(getSupabase(), code);
      if (coupon.valid) {
        onApplyCoupon(coupon.code, coupon.discount_pct);
        setMessage({ text: `✓ Cupón "${coupon.code}" aplicado — ${coupon.discount_pct}% de descuento.`, ok: true });
      } else {
        setMessage({ text: '✕ El cupón no existe, no está activo o venció.', ok: false });
      }
    } catch {
      setMessage({ text: '✕ No pudimos validar el cupón. Volvé a intentarlo.', ok: false });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="summary-card">
      <h3>Resumen de tu aventura</h3>

      <div className="summary-tour">
        <div
          className="summary-tour__img"
          style={{ backgroundImage: `url('${tour?.image ?? '/assets/uyuni-salt.jpg'}')` }}
        ></div>
        <div>
          <div className="summary-tour__name">{tour?.title ?? 'Salar de Uyuni 3-Day Adventure'}</div>
          <div className="summary-tour__meta">
            {tour?.duration ?? '3 Days · 2 Nights'} · {tour?.typeLabel ?? 'Adventure'}
          </div>
        </div>
      </div>

      <div className="summary-row">
        <span className="icon-inline">
          <Icon name="calendar" size={16} /> Fechas
        </span>
        <span style={{ textAlign: 'right' }}>
          {selection?.date
            ? new Date(`${selection.date}T12:00:00`).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })
            : 'Fecha a confirmar'}
          {selection?.startTime ? ` · ${selection.startTime}` : ''}
          <br />
          <small className="text-muted">{tour?.duration ?? '3 días · 2 noches'}</small>
        </span>
      </div>
      <div className="summary-row">
        <span className="icon-inline">
          <Icon name="users" size={16} /> Pasajeros
        </span>
        <span>
          {adults} Adulto{adults !== 1 ? 's' : ''}
          {children > 0 ? ` · ${children} Niño${children !== 1 ? 's' : ''}` : ''}
        </span>
      </div>

      <div className="divider" style={{ margin: '16px 0' }}></div>

      <div className="summary-coupon">
        <label className="summary-coupon__label">
          <Icon name="tag" size={15} />
          ¿Tenés un cupón?
        </label>
        <div className="summary-coupon__form">
          <input
            type="text"
            className="summary-coupon__input"
            placeholder="Código de cupón"
            value={input}
            disabled={Boolean(couponCode)}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="button"
            className="summary-coupon__btn"
            onClick={() => void applyCoupon()}
            disabled={Boolean(couponCode) || checking}
          >
            {checking ? '…' : 'Aplicar'}
          </button>
        </div>
        {message && (
          <p
            className="summary-coupon__msg"
            style={{ display: 'block', color: message.ok ? 'var(--green-700)' : 'var(--danger)' }}
          >
            {message.text}
          </p>
        )}
      </div>

      <div className="summary-row">
        <span>
          {paxCount} viajero{paxCount > 1 ? 's' : ''} × US$ {perPerson}
        </span>
        <span>{formatUsd(baseSubtotal)}</span>
      </div>
      {children > 0 && tour?.priceChild != null && (
        <p className="text-small" style={{ color: 'var(--ink-500)', margin: '2px 0 0' }}>
          Tarifa niño de referencia: US$ {tour.priceChild}. La reserva online aplica la tarifa de
          adulto (US$ {perPerson}) a todos los viajeros.
        </p>
      )}
      {couponCode && (
        <div className="summary-row summary-row--sub">
          <span>Cupón ({couponCode})</span>
          <span style={{ color: 'var(--green-700)' }}>-US$ {couponDiscount}</span>
        </div>
      )}
      {totals.groupDiscount > 0 && (
        <div className="summary-row summary-row--sub">
          <span>Descuento grupo ({Math.round((totals.groupDiscountRate ?? 0) * 100)}%)</span>
          <span style={{ color: 'var(--green-700)' }}>-US$ {totals.groupDiscount}</span>
        </div>
      )}
      {(totals.offerDiscount ?? 0) > 0 && (
        <div className="summary-row summary-row--sub">
          <span>Oferta especial ({Math.round(totals.offerPct ?? 0)}%)</span>
          <span style={{ color: 'var(--green-700)' }}>-{formatUsd(totals.offerDiscount ?? 0)}</span>
        </div>
      )}
      <div className="summary-row summary-row--total">
        <span>Total</span>
        <span>{formatUsd(totals.total)}</span>
      </div>
      <p className="text-small" style={{ textAlign: 'right', color: 'var(--ink-500)', margin: '4px 0 0' }}>
        ≈ BOB {usdToBob(totals.total).toLocaleString('es-BO')}
      </p>

      <div className="summary-cta">
        <p className="text-small" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <Icon name="shield-check" size={15} />
          Pago seguro y encriptado
        </p>
        <p className="text-small" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="clock" size={15} />
          Confirmación instantánea
        </p>
      </div>
    </div>
  );
}
