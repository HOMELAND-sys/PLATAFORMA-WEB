'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { jsPDF } from 'jspdf';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import { useBooking } from '@/context/BookingContext';
import { useAuth } from '@/context/AuthContext';
import { fetchBookingByCode, fetchPaymentSettings, type MyBooking, type PaymentSettings } from '@/lib/api';
import { getSupabase } from '@/lib/supabase';
import { formatUsd, usdToBob } from '@/lib/pricing';

const WHATSAPP_NUMBER = '59176012345';

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pendiente_pago: { label: 'Pendiente de pago', cls: 'status--amber' },
  confirmada: { label: 'Confirmada', cls: 'status--green' },
  completada: { label: 'Completada', cls: 'status--green' },
  cancelada: { label: 'Cancelada', cls: 'status--red' },
};

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function durationDays(duration: string): number {
  const m = duration.match(/(\d+)/);
  return m ? Math.max(1, parseInt(m[1], 10)) : 1;
}

const fmtDate = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

export default function ConfirmationContent() {
  const { result } = useBooking();
  const searchParams = useSearchParams();
  const { session, loading: authLoading } = useAuth();
  const code = (searchParams.get('code') ?? result?.code ?? '').toUpperCase();

  const [booking, setBooking] = useState<MyBooking | null>(null);
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!code) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    let active = true;
    (async () => {
      const b = await fetchBookingByCode(getSupabase(), code).catch(() => null);
      if (!active) return;
      if (!b) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setBooking(b);
      setSettings(await fetchPaymentSettings(getSupabase()).catch(() => null));
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [code]);

  const whatsAppUrl = (b: MyBooking) =>
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
      `Hola! Tengo la reserva ${b.code} de "${b.tour_title}" para el ${fmtDate(b.tour_date)} con ${b.pax} pasajero(s). Quiero coordinar el pago.`,
    )}`;

  const downloadPdf = (b: MyBooking) => {
    const doc = new jsPDF();
    const meta = STATUS_META[b.status] ?? STATUS_META.pendiente_pago;
    let y = 20;
    const line = (label: string, value: string, size = 10) => {
      doc.setFontSize(size);
      doc.text(label, 16, y);
      doc.text(value, 120, y);
      y += 7;
    };
    doc.setFontSize(16);
    doc.text('HOMELAND.TOURS', 16, y);
    y += 6;
    doc.setFontSize(9);
    doc.text('BOLIVIAN TOUR OPERATOR — TRAVEL VOUCHER', 16, y);
    y += 10;
    doc.setFontSize(12);
    doc.text(b.tour_title, 16, y, { maxWidth: 180 });
    y += 10;
    line('Reserva', b.code);
    line('Fecha emisión', fmtDate(b.created_at.slice(0, 10)));
    line('Estado', meta.label);
    line('Fecha del tour', fmtDate(b.tour_date));
    line('Duración', b.tour_duration);
    line('Pasajeros', b.passengers.map((p) => p.name).join(', '));
    line('Total', `${formatUsd(b.total)} (≈ BOB ${usdToBob(b.total).toLocaleString('es-BO')})`);
    if (settings?.link) line('Enlace de pago', settings.link, 8);
    if (settings?.instructions) {
      y += 2;
      doc.setFontSize(9);
      doc.text(doc.splitTextToSize(`Instrucciones: ${settings.instructions}`, 180), 16, y);
    }
    doc.setFontSize(8);
    doc.text(`${b.code} · BOLETA ELECTRÓNICA · NO VÁLIDO COMO FACTURA`, 16, 285);
    doc.save(`voucher-${b.code}.pdf`);
  };

  if (loading) {
    return (
      <div className="form-hero form-hero--sm" style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--ink-500)' }}>Cargando tu voucher…</p>
      </div>
    );
  }

  if (notFound || !booking) {
    return (
      <div className="form-hero form-hero--sm" style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.8rem', marginBottom: 8 }}>No encontramos esa reserva</h1>
        <p style={{ color: 'var(--ink-500)', marginBottom: 24 }}>
          {authLoading
            ? 'Un momento…'
            : !session
              ? 'Iniciá sesión para ver tu voucher.'
              : 'Verificá el código de la reserva o volvé al catálogo.'}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          {!session ? (
            <Link className="btn btn--primary" href="/login?next=/confirmation">
              Iniciar sesión
            </Link>
          ) : (
            <Link className="btn btn--primary" href="/bookings">
              Ver mis reservas
            </Link>
          )}
          <Link className="btn btn--ghost" href="/tours">
            Explorar tours
          </Link>
        </div>
      </div>
    );
  }

  const meta = STATUS_META[booking.status] ?? STATUS_META.pendiente_pago;
  const paid = booking.status === 'confirmada' || booking.status === 'completada';
  const lead = booking.passengers.find((p) => p.is_lead) ?? booking.passengers[0];
  const otherPax = booking.pax - booking.passengers.length;
  const endDate = addDays(booking.tour_date, durationDays(booking.tour_duration) - 1);
  const hasPayment = Boolean(settings?.link || settings?.qrUrl);

  return (
    <>
      <section className="confirm-hero">
        <div className="container">
          <div className="confirm-hero__check">
            <div className="confirm-check">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>
          <h1>
            {booking.status === 'cancelada' ? (
              <>
                Tu reserva fue <em>cancelada</em>
              </>
            ) : (
              <>
                ¡Tu aventura está <em>reservada!</em>
              </>
            )}
          </h1>
          <p>
            Gracias por elegir Homeland Tours. Tu voucher <strong>{booking.code}</strong> está asociado a tu
            cuenta — podés verlo cuando quieras desde “Mis reservas”.
          </p>
        </div>
      </section>

      <section className="container confirm-page">
        <div className="voucher-ticket">
          <div className="voucher-ticket__left">
            <div className="voucher-ticket__brand">
              <div className="voucher-ticket__brand-mark">H</div>
              <div>
                <strong>HOMELAND.TOURS</strong>
                <small>BOLIVIAN TOUR OPERATOR</small>
              </div>
            </div>

            <div className="voucher-ticket__label">TRAVEL VOUCHER</div>
            <h2 className="voucher-ticket__title">{booking.tour_title}</h2>

            <div
              className="voucher-ticket__tour-img"
              style={{ backgroundImage: `url('${booking.tour_image}')` }}
            ></div>
          </div>

          <div className="voucher-ticket__perf"></div>

          <div className="voucher-ticket__right">
            <div className="voucher-ticket__top">
              <div>
                <small>Reserva</small>
                <strong>{booking.code}</strong>
              </div>
              <div>
                <small>Fecha emisión</small>
                <strong>{fmtDate(booking.created_at.slice(0, 10))}</strong>
              </div>
              <div>
                <small>Estado</small>
                <strong className={`voucher-ticket__status ${meta.cls}`}>
                  <span className="dot"></span> {meta.label}
                </strong>
              </div>
            </div>

            <div className="voucher-ticket__details">
              <div className="voucher-ticket__detail">
                <small>PASAJERO</small>
                <strong>{lead?.name ?? '—'}</strong>
                {booking.passengers.length > 1 && <span>+ {booking.passengers.length - 1} más</span>}
                {otherPax > 0 && <span>{otherPax} adulto(s) sin datos</span>}
              </div>
              <div className="voucher-ticket__detail">
                <small>PARTIDA</small>
                <strong>{fmtDate(booking.tour_date)}</strong>
                <span>{booking.tour_start_end || 'Punto de encuentro a confirmar'}</span>
              </div>
              <div className="voucher-ticket__detail voucher-ticket__detail--arrow">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
              <div className="voucher-ticket__detail">
                <small>REGRESO</small>
                <strong>{fmtDate(endDate)}</strong>
                <span>{booking.tour_duration}</span>
              </div>
            </div>

            <div className="voucher-ticket__divider"></div>

            <div className="voucher-ticket__bottom">
              {settings?.qrUrl && (
                <div className="voucher-ticket__qr-block">
                  <div className="voucher-ticket__qr">
                    <img src={settings.qrUrl} alt="QR de pago" />
                  </div>
                  <small>
                    Escaneá para
                    <br />
                    pagar
                  </small>
                </div>
              )}

              <div className="voucher-ticket__info-block">
                <div className="voucher-ticket__info-row">
                  <small>Pasajeros</small>
                  <strong>
                    {booking.pax} Adulto{booking.pax > 1 ? 's' : ''}
                  </strong>
                </div>
                <div className="voucher-ticket__info-row">
                  <small>Duración</small>
                  <strong>{booking.tour_duration}</strong>
                </div>
                <div className="voucher-ticket__info-row">
                  <small>{paid ? 'Total pagado' : 'Total a pagar'}</small>
                  <strong className="voucher-ticket__price">
                    {formatUsd(booking.total)} <span className="text-muted">(≈ BOB {usdToBob(booking.total).toLocaleString('es-BO')})</span>
                  </strong>
                </div>
              </div>
            </div>

            <div className="voucher-ticket__barcode">
              <div className="voucher-ticket__barcode-lines"></div>
              <small>{booking.code} · BOLETA ELECTRÓNICA · NO VÁLIDO COMO FACTURA</small>
            </div>
          </div>

          <div className="voucher-ticket__notch voucher-ticket__notch--top"></div>
          <div className="voucher-ticket__notch voucher-ticket__notch--bottom"></div>
        </div>

        <div className="voucher-actions">
          {settings?.link && booking.status !== 'cancelada' && (
            <a className="btn btn--primary" href={settings.link} target="_blank" rel="noopener noreferrer">
              💳 Pagar con enlace
            </a>
          )}
          <button className="btn btn--primary" onClick={() => downloadPdf(booking)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Descargar voucher PDF
          </button>
          <a className="btn btn--ghost" href={whatsAppUrl(booking)} target="_blank" rel="noopener noreferrer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.33 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            WhatsApp
          </a>
          <Link href="/tours" className="btn btn--ghost">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12l9-9 9 9" />
              <path d="M9 21V12h6v9" />
            </svg>
            Volver al inicio
          </Link>
        </div>

        <div className="confirm-grid">
          <div className="confirm-card">
            <h3>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Resumen de reserva
            </h3>
            <div className="confirm-list">
              <div className="confirm-list__row">
                <small>Tour</small>
                <strong>{booking.tour_title}</strong>
              </div>
              <div className="confirm-list__row">
                <small>Fechas</small>
                <strong>
                  {fmtDate(booking.tour_date)}
                  {endDate !== booking.tour_date && ` → ${fmtDate(endDate)}`}
                </strong>
              </div>
              <div className="confirm-list__row">
                <small>Pasajeros</small>
                <strong>
                  {booking.pax} Adulto{booking.pax > 1 ? 's' : ''}
                </strong>
              </div>
              <div className="confirm-list__row">
                <small>Nombres</small>
                <strong>{booking.passengers.map((p) => p.name).join(', ') || '—'}</strong>
              </div>
              <div className="confirm-list__row">
                <small>Punto de encuentro</small>
                <strong>{booking.tour_start_end || 'A confirmar'}</strong>
              </div>
            </div>
          </div>

          <div className="confirm-card">
            <h3>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="1" y="4" width="22" height="16" rx="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
              Pago
            </h3>
            <div className="confirm-list">
              {paid ? (
                <>
                  <div className="confirm-list__row">
                    <small>Estado del pago</small>
                    <strong style={{ color: 'var(--green-700)' }}>Pagado</strong>
                  </div>
                  {booking.paid_at && (
                    <div className="confirm-list__row">
                      <small>Confirmado el</small>
                      <strong>{new Date(booking.paid_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="confirm-list__row">
                    <small>Estado del pago</small>
                    <strong style={{ color: 'var(--accent-600)' }}>Pendiente</strong>
                  </div>
                  <div className="confirm-list__row">
                    <small>Modalidad</small>
                    <strong>{booking.payment_method === 'qr' ? 'QR' : 'Enlace de pago'}</strong>
                  </div>
                </>
              )}
              {settings?.instructions && (
                <div className="confirm-list__row">
                  <small>Instrucciones</small>
                  <strong style={{ fontWeight: 500, textAlign: 'right', maxWidth: '70%' }}>
                    {settings.instructions}
                  </strong>
                </div>
              )}
              <div className="confirm-list__row">
                <small>Total</small>
                <strong style={{ color: paid ? 'var(--green-700)' : 'inherit' }}>
                  {formatUsd(booking.total)}
                </strong>
              </div>
              {!hasPayment && booking.status !== 'cancelada' && (
                <p className="text-small" style={{ color: 'var(--ink-500)', margin: '8px 0 0' }}>
                  El operador aún no configuró el pago en línea. Usá WhatsApp para coordinar.
                </p>
              )}
            </div>
          </div>

          <div className="confirm-card">
            <h3>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <polyline points="9 11 12 14 22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              ¿Qué sigue?
            </h3>
            <ul className="next-list">
              <li className="next-item">
                <span className="next-item__num">1</span>
                <div>
                  <strong>{paid ? 'Reserva confirmada' : 'Pagá con tu voucher'}</strong>
                  <p>
                    {paid
                      ? 'Tu operatora ya confirmó tu reserva. ¡Prepará las maletas!'
                      : 'Usá el enlace o el QR de este voucher para completar el pago.'}
                  </p>
                </div>
              </li>
              <li className="next-item">
                <span className="next-item__num">2</span>
                <div>
                  <strong>Confirmación de la operatora</strong>
                  <p>Te confirmamos por email cuando la reserva pasa a “Confirmada”.</p>
                </div>
              </li>
              <li className="next-item">
                <span className="next-item__num">3</span>
                <div>
                  <strong>Recordatorio</strong>
                  <p>Vas a recibir un recordatorio antes de la fecha del tour.</p>
                </div>
              </li>
              <li className="next-item">
                <span className="next-item__num">4</span>
                <div>
                  <strong>Check-in</strong>
                  <p>Mostrá tu voucher en el punto de encuentro.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="trust-strip">
          <div className="trust-strip__item">
            <svg className="trust-strip__icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M9 12l2 2 4-4" />
              <path d="M12 2 4 6v6c0 5 4 9 8 10 4-1 8-5 8-10V6l-8-4z" />
            </svg>
            <div>
              <h4>Operador local & confiable</h4>
              <p>100% boliviano, owned & operated.</p>
            </div>
          </div>
          <div className="trust-strip__item">
            <svg className="trust-strip__icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M21 12a9 9 0 1 1-9-9" />
              <path d="M21 3v6h-6" />
            </svg>
            <div>
              <h4>Pago según te quede cómodo</h4>
              <p>Enlace, QR o coordinado por WhatsApp.</p>
            </div>
          </div>
          <div className="trust-strip__item">
            <svg className="trust-strip__icon" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <div>
              <h4>Best Price Guarantee</h4>
              <p>Sin cargos ocultos, siempre.</p>
            </div>
          </div>
          <div className="trust-strip__item">
            <svg className="trust-strip__icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.33 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            <div>
              <h4>¿Necesitas ayuda?</h4>
              <p>
                24/7 · <strong>+591 760 12345</strong>
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
