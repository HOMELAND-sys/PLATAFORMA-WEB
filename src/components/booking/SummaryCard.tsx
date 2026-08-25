'use client';

import { useState } from 'react';
import { checkCoupon } from '@/lib/api';
import { formatUsd, usdToBob } from '@/lib/pricing';
import { getSupabase } from '@/lib/supabase';
import type { BookingSelection, Tour } from '@/lib/types';

interface SummaryCardProps {
  tour?: Tour;
  selection: BookingSelection | null;
  paxCount: number;
  couponCode: string | null;
  couponDiscount: number;
  totals: { groupDiscount: number; groupDiscountRate?: number; coupon: number; total: number };
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
        <span>📅 Fechas</span>
        <span style={{ textAlign: 'right' }}>
          {selection?.date
            ? new Date(`${selection.date}T12:00:00`).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })
            : 'Fecha a confirmar'}
          <br />
          <small className="text-muted">{tour?.duration ?? '3 días · 2 noches'}</small>
        </span>
      </div>
      <div className="summary-row">
        <span>👥 Pasajeros</span>
        <span>
          {paxCount} Adulto{paxCount > 1 ? 's' : ''}
        </span>
      </div>

      <div className="divider" style={{ margin: '16px 0' }}></div>

      <div className="summary-coupon">
        <label className="summary-coupon__label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
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
          {paxCount} Adulto{paxCount > 1 ? 's' : ''} @ US$ {selection?.perPerson ?? 299}
        </span>
        <span>{formatUsd(baseSubtotal)}</span>
      </div>
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
      <div className="summary-row summary-row--total">
        <span>Total</span>
        <span>{formatUsd(totals.total)}</span>
      </div>
      <p className="text-small" style={{ textAlign: 'right', color: 'var(--ink-500)', margin: '4px 0 0' }}>
        ≈ BOB {usdToBob(totals.total).toLocaleString('es-BO')}
      </p>

      <div className="summary-cta">
        <p className="text-small" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2 4 6v6c0 5 4 9 8 10 4-1 8-5 8-10V6l-8-4z" />
          </svg>
          Pago seguro y encriptado
        </p>
        <p className="text-small" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          Confirmación instantánea
        </p>
      </div>
    </div>
  );
}
