'use client';

import Link from 'next/link';
import { useBooking } from '@/context/BookingContext';
import { getTourBySlug } from '@/data/tours';
import { formatBob, formatUsd, usdToBob } from '@/lib/pricing';

export default function ConfirmationContent() {
  const { result } = useBooking();
  const tour = result ? getTourBySlug(result.selection.tourSlug) : getTourBySlug('salar-de-uyuni-3-day-adventure');
  const fallback = !result || !tour;

  const bookingId = result?.id ?? 'HT-25A7X9';
  const passengerName = result?.passenger.name || 'Juan Pérez';
  const date = result?.selection.date
    ? new Date(`${result.selection.date}T12:00:00`)
    : new Date('2025-05-24T12:00:00');
  const dateStr = date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  const pax = result?.selection.pax ?? 2;
  const totalUsd = result?.total ?? 195;

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
            ¡Tu aventura está <em>reservada!</em>
          </h1>
          <p>
            Gracias por elegir Homeland Tours. Te enviamos el voucher a <strong>{result?.passenger.name ? 'tu email' : 'juan.perez@email.com'}</strong>.
            ¡No vemos la hora de recibirte en Bolivia!
          </p>
        </div>
      </section>

      <section className="container confirm-page">
        {fallback && (
          <p style={{ textAlign: 'center', color: 'var(--ink-500)', marginBottom: 24 }}>
            No se encontró una reserva activa: se muestra un voucher de ejemplo.{' '}
            <Link href="/tours" style={{ textDecoration: 'underline', color: 'var(--green-700)' }}>
              Explorar tours
            </Link>
          </p>
        )}

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
            <h2 className="voucher-ticket__title">{tour?.title ?? 'Salar de Uyuni 3-Day Adventure'}</h2>

            <div
              className="voucher-ticket__tour-img"
              style={{ backgroundImage: `url('${tour?.image ?? '/assets/uyuni-salt.jpg'}')` }}
            ></div>
          </div>

          <div className="voucher-ticket__perf"></div>

          <div className="voucher-ticket__right">
            <div className="voucher-ticket__top">
              <div>
                <small>Reserva</small>
                <strong>{bookingId}</strong>
              </div>
              <div>
                <small>Fecha emisión</small>
                <strong>{dateStr}</strong>
              </div>
              <div>
                <small>Estado</small>
                <strong className="voucher-ticket__status">
                  <span className="dot"></span> Confirmado
                </strong>
              </div>
            </div>

            <div className="voucher-ticket__details">
              <div className="voucher-ticket__detail">
                <small>PASAJERO</small>
                <strong>{passengerName}</strong>
              </div>
              <div className="voucher-ticket__detail">
                <small>PARTIDA</small>
                <strong>{dateStr}</strong>
                <span>07:30 AM · {tour?.startEnd ?? 'Uyuni'}</span>
              </div>
              <div className="voucher-ticket__detail voucher-ticket__detail--arrow">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
              <div className="voucher-ticket__detail">
                <small>REGRESO</small>
                <strong>{dateStr}</strong>
                <span>18:00 · {tour?.startEnd ?? 'Uyuni'}</span>
              </div>
            </div>

            <div className="voucher-ticket__divider"></div>

            <div className="voucher-ticket__bottom">
              <div className="voucher-ticket__qr-block">
                <div className="voucher-ticket__qr">
                  <svg viewBox="0 0 33 33" xmlns="http://www.w3.org/2000/svg">
                    <rect width="33" height="33" fill="white" />
                    <g fill="#0c0f0d">
                      <rect x="0" y="0" width="7" height="7" />
                      <rect x="1" y="1" width="5" height="5" fill="white" />
                      <rect x="2" y="2" width="3" height="3" />
                      <rect x="26" y="0" width="7" height="7" />
                      <rect x="27" y="1" width="5" height="5" fill="white" />
                      <rect x="28" y="2" width="3" height="3" />
                      <rect x="0" y="26" width="7" height="7" />
                      <rect x="1" y="27" width="5" height="5" fill="white" />
                      <rect x="2" y="28" width="3" height="3" />
                      <rect x="9" y="0" width="1" height="1" />
                      <rect x="11" y="0" width="1" height="1" />
                      <rect x="13" y="0" width="2" height="1" />
                      <rect x="16" y="0" width="1" height="1" />
                      <rect x="19" y="0" width="1" height="1" />
                      <rect x="22" y="0" width="1" height="1" />
                      <rect x="24" y="0" width="1" height="1" />
                      <rect x="0" y="9" width="1" height="1" />
                      <rect x="2" y="9" width="2" height="1" />
                      <rect x="5" y="9" width="1" height="2" />
                      <rect x="7" y="9" width="1" height="1" />
                      <rect x="10" y="9" width="1" height="1" />
                      <rect x="13" y="9" width="1" height="2" />
                      <rect x="16" y="9" width="2" height="1" />
                      <rect x="20" y="9" width="1" height="1" />
                      <rect x="22" y="9" width="1" height="2" />
                      <rect x="25" y="9" width="1" height="1" />
                      <rect x="0" y="11" width="2" height="1" />
                      <rect x="3" y="11" width="1" height="2" />
                      <rect x="6" y="11" width="1" height="1" />
                      <rect x="9" y="11" width="1" height="1" />
                      <rect x="12" y="11" width="1" height="1" />
                      <rect x="15" y="11" width="1" height="2" />
                      <rect x="18" y="11" width="1" height="1" />
                      <rect x="21" y="11" width="1" height="1" />
                      <rect x="24" y="11" width="1" height="1" />
                      <rect x="27" y="11" width="1" height="1" />
                      <rect x="0" y="14" width="1" height="2" />
                      <rect x="3" y="14" width="1" height="1" />
                      <rect x="6" y="14" width="1" height="2" />
                      <rect x="9" y="14" width="2" height="1" />
                      <rect x="13" y="14" width="1" height="1" />
                      <rect x="16" y="14" width="1" height="1" />
                      <rect x="19" y="14" width="1" height="2" />
                      <rect x="22" y="14" width="1" height="1" />
                      <rect x="25" y="14" width="1" height="1" />
                      <rect x="0" y="17" width="2" height="1" />
                      <rect x="4" y="17" width="1" height="1" />
                      <rect x="7" y="17" width="1" height="2" />
                      <rect x="10" y="17" width="1" height="1" />
                      <rect x="13" y="17" width="1" height="1" />
                      <rect x="16" y="17" width="1" height="2" />
                      <rect x="19" y="17" width="1" height="1" />
                      <rect x="22" y="17" width="1" height="1" />
                      <rect x="25" y="17" width="1" height="2" />
                      <rect x="0" y="20" width="1" height="1" />
                      <rect x="3" y="20" width="2" height="1" />
                      <rect x="6" y="20" width="1" height="1" />
                      <rect x="9" y="20" width="1" height="1" />
                      <rect x="12" y="20" width="1" height="2" />
                      <rect x="15" y="20" width="1" height="1" />
                      <rect x="18" y="20" width="1" height="1" />
                      <rect x="21" y="20" width="1" height="1" />
                      <rect x="24" y="20" width="1" height="1" />
                      <rect x="9" y="22" width="1" height="1" />
                      <rect x="11" y="22" width="2" height="1" />
                      <rect x="14" y="22" width="1" height="1" />
                      <rect x="17" y="22" width="1" height="1" />
                      <rect x="20" y="22" width="2" height="1" />
                      <rect x="24" y="22" width="1" height="1" />
                    </g>
                  </svg>
                </div>
                <small>
                  Escaneá para
                  <br />
                  verificar
                </small>
              </div>

              <div className="voucher-ticket__info-block">
                <div className="voucher-ticket__info-row">
                  <small>Pasajeros</small>
                  <strong>
                    {pax} Adulto{pax > 1 ? 's' : ''}
                  </strong>
                </div>
                <div className="voucher-ticket__info-row">
                  <small>Duración</small>
                  <strong>{tour?.duration ?? '3 días · 2 noches'}</strong>
                </div>
                <div className="voucher-ticket__info-row">
                  <small>Total pagado</small>
                  <strong className="voucher-ticket__price">{formatBob(usdToBob(totalUsd))}</strong>
                </div>
              </div>
            </div>

            <div className="voucher-ticket__barcode">
              <div className="voucher-ticket__barcode-lines"></div>
              <small>{bookingId} · BOLETA ELECTRÓNICA · NO VÁLIDO COMO FACTURA</small>
            </div>
          </div>

          <div className="voucher-ticket__notch voucher-ticket__notch--top"></div>
          <div className="voucher-ticket__notch voucher-ticket__notch--bottom"></div>
        </div>

        <div className="voucher-actions">
          <button className="btn btn--primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Descargar voucher PDF
          </button>
          <button className="btn btn--ghost">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            Reenviar por email
          </button>
          <Link href="/" className="btn btn--ghost">
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
                <strong>{tour?.title ?? 'Salar de Uyuni 3-Day'}</strong>
              </div>
              <div className="confirm-list__row">
                <small>Fechas</small>
                <strong>{dateStr}</strong>
              </div>
              <div className="confirm-list__row">
                <small>Pasajeros</small>
                <strong>
                  {pax} Adulto{pax > 1 ? 's' : ''}
                </strong>
              </div>
              <div className="confirm-list__row">
                <small>Punto de encuentro</small>
                <strong>Homeland Tours Office · {tour?.startEnd ?? 'Uyuni'}</strong>
              </div>
              <div className="confirm-list__row">
                <small>Hora de inicio</small>
                <strong>07:30 AM</strong>
              </div>
            </div>
          </div>

          <div className="confirm-card">
            <h3>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="1" y="4" width="22" height="16" rx="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
              Transacción de pago
            </h3>
            <div className="confirm-list">
              <div className="confirm-list__row">
                <small>Pasarela</small>
                <strong style={{ color: 'var(--green-700)' }}>Zwap</strong>
              </div>
              <div className="confirm-list__row">
                <small>ID Transacción</small>
                <strong>{result?.transactionId ?? 'ZW-8F7G-H4K2-9P1Z'}</strong>
              </div>
              <div className="confirm-list__row">
                <small>Pagado el</small>
                <strong>{dateStr} — 10:42 AM</strong>
              </div>
              <div className="confirm-list__row">
                <small>Total</small>
                <strong style={{ color: 'var(--green-700)' }}>
                  {formatBob(usdToBob(totalUsd))} ({formatUsd(totalUsd)})
                </strong>
              </div>
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
                  <strong>Email enviado</strong>
                  <p>Voucher enviado a tu correo con todos los detalles.</p>
                </div>
              </li>
              <li className="next-item">
                <span className="next-item__num">2</span>
                <div>
                  <strong>Guía asignado</strong>
                  <p>Nuestro equipo prepara tu aventura con un guía local.</p>
                </div>
              </li>
              <li className="next-item">
                <span className="next-item__num">3</span>
                <div>
                  <strong>Recordatorio 24h</strong>
                  <p>Vas a recibir un recordatorio 24 horas antes del tour.</p>
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
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <div>
              <h4>Pago 100% seguro</h4>
              <p>Procesado vía Zwap con encriptación 256-bit.</p>
            </div>
          </div>
          <div className="trust-strip__item">
            <svg className="trust-strip__icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
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
