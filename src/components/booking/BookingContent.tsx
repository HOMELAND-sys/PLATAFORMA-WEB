'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import SummaryCard from '@/components/booking/SummaryCard';
import { getTourBySlug } from '@/data/tours';
import { bookingService } from '@/lib/services/bookingService';
import { useBooking } from '@/context/BookingContext';
import { calcBookingTotals, getGroupDiscountLabel, getGroupDiscountRate, GROUP_DISCOUNT_MAX_PAX } from '@/lib/pricing';
import type { Passenger } from '@/lib/types';

const COUNTRY_CODES = ['+591', '+54', '+34', '+1', '+52'];
const NATIONALITIES = [
  'Bolivia', 'Argentina', 'Brasil', 'Chile', 'Colombia', 'España',
  'Estados Unidos', 'México', 'Perú', 'Otro',
];

function makePassenger(num: number, lead = false): Passenger {
  return {
    id: `pax-${num}-${Date.now()}`,
    name: '',
    doc: '',
    country: '',
    meal: 'Vegetariana',
    isLead: lead,
  };
}

export default function BookingContent() {
  const router = useRouter();
  const { selection, setResult } = useBooking();
  const tour = getTourBySlug(selection?.tourSlug ?? 'salar-de-uyuni-3-day-adventure');
  const fallback = !selection || !tour;

  const [leadName, setLeadName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneCode, setPhoneCode] = useState('+591');
  const [phone, setPhone] = useState('');
  const [nationality, setNationality] = useState('Bolivia');
  const [passengers, setPassengers] = useState<Passenger[]>(() => [
    makePassenger(1, true),
    makePassenger(2),
  ]);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const pax = selection?.pax ?? passengers.length;

  useEffect(() => {
    if (selection?.pax) {
      const target = Math.min(selection.pax, GROUP_DISCOUNT_MAX_PAX);
      setPassengers((prev) => {
        if (target > prev.length) {
          return [...prev, ...Array.from({ length: target - prev.length }, (_, i) => makePassenger(prev.length + i + 1))];
        }
        if (target < prev.length) {
          return prev.slice(0, target);
        }
        return prev;
      });
    }
  }, [selection?.pax]);

  const updatePassenger = (id: string, field: keyof Passenger, value: string) => {
    setPassengers((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const removePassenger = (id: string) => {
    setPassengers((prev) => prev.filter((p) => p.id !== id));
  };

  const addPassenger = () => {
    setPassengers((prev) => [...prev, makePassenger(prev.length + 1)]);
  };

  const effectivePax = selection?.pax ?? passengers.length;
  const perPersonPrice = selection?.perPerson ?? (tour ? tour.price : 299);
  const baseSubtotal = selection?.subtotal ?? perPersonPrice * effectivePax;

  const totals = useMemo(() => {
    const paxCount = passengers.length;
    const t = calcBookingTotals(baseSubtotal, paxCount, couponDiscount);
    return { groupDiscount: t.groupDiscount, groupDiscountRate: t.groupDiscountRate, coupon: t.couponDiscount, total: t.total };
  }, [baseSubtotal, passengers.length, couponDiscount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const selectionToSend = selection ?? {
        tourSlug: tour?.slug ?? 'salar-de-uyuni-3-day-adventure',
        tourType: 'group' as const,
        date: '',
        pax,
        extras: [],
        perPerson: tour?.price ?? 299,
        extrasTotal: 0,
        subtotal: baseSubtotal,
      };
      const result = await bookingService.createBooking(
        selectionToSend,
        passengers[0] ?? makePassenger(1, true),
        totals.total,
      );
      setResult(result);
      router.push('/confirmation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <section className="booking-hero">
        <div className="container">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Booking & Checkout' }]} />
          <h1>
            Completá tu <em>Reserva</em>
          </h1>
          <p>¡Casi listo! Por favor, completá tus datos y realizá el pago seguro para confirmar tu aventura.</p>
        </div>
      </section>

      <section className="container">
        {fallback && (
          <div
            className="discount-banner"
            style={{ marginTop: 24 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2 4 6v6c0 5 4 9 8 10 4-1 8-5 8-10V6l-8-4z" />
            </svg>
            <span>
              No hay un tour seleccionado: se muestra el <strong>Salar de Uyuni 3-Day Adventure</strong> como
              ejemplo. Elegí tu aventura en <Link href="/tours" style={{ textDecoration: 'underline' }}>Tours</Link>.
            </span>
          </div>
        )}

        <div className="stepper" style={{ marginTop: 32 }}>
          <div className="step is-done">
            <div className="step__num">✓</div>
            <div className="step__text">
              <span className="step__title">Fechas & Pasajeros</span>
              <span className="step__sub">
                {selection?.date ? new Date(`${selection.date}T12:00:00`).toLocaleDateString('es-ES') : 'Fecha a definir'}
              </span>
            </div>
          </div>
          <div className="step__line"></div>
          <div className="step is-active">
            <div className="step__num">2</div>
            <div className="step__text">
              <span className="step__title">Datos del Reservante</span>
              <span className="step__sub">Tu información</span>
            </div>
          </div>
          <div className="step__line"></div>
          <div className="step">
            <div className="step__num">3</div>
            <div className="step__text">
              <span className="step__title">Pago</span>
              <span className="step__sub">Seguro & local</span>
            </div>
          </div>
          <div className="step__line"></div>
          <div className="step">
            <div className="step__num">4</div>
            <div className="step__text">
              <span className="step__title">Confirmación</span>
              <span className="step__sub">¡Estás listo!</span>
            </div>
          </div>
        </div>

        <div className="booking-layout">
          <form onSubmit={handleSubmit}>
            <div className="form-section">
              <h2>
                <span className="num">1</span> Datos del Reservante
              </h2>
              <p>Información de la persona que realiza la reserva y el pago.</p>

              <div className="form-grid">
                <div className="field field--full">
                  <label className="field__label">
                    Nombre completo (como figura en ID o pasaporte) <span className="req">*</span>
                  </label>
                  <input
                    className="input"
                    type="text"
                    placeholder="Ej. María Fernanda López"
                    required
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label className="field__label">
                    Correo electrónico <span className="req">*</span>
                  </label>
                  <input
                    className="input"
                    type="email"
                    placeholder="maria.lopez@email.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label className="field__label">
                    WhatsApp / Teléfono <span className="req">*</span>
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select className="select" style={{ width: 100 }} value={phoneCode} onChange={(e) => setPhoneCode(e.target.value)}>
                      {COUNTRY_CODES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                    <input
                      className="input"
                      type="tel"
                      placeholder="712 34567"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>
                <div className="field">
                  <label className="field__label">
                    Nacionalidad <span className="req">*</span>
                  </label>
                  <select className="select" required value={nationality} onChange={(e) => setNationality(e.target.value)}>
                    {NATIONALITIES.map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label className="field__label">
                    Cantidad de pasajeros <span className="req">*</span>
                  </label>
                  <select
                    className="select"
                    value={pax}
                    onChange={(e) => {
                      const target = Math.min(Number(e.target.value), GROUP_DISCOUNT_MAX_PAX);
                      setPassengers((prev) => {
                        if (target > prev.length) {
                          return [...prev, ...Array.from({ length: target - prev.length }, (_, i) => makePassenger(prev.length + i + 1))];
                        }
                        if (target < prev.length) {
                          return prev.slice(0, target);
                        }
                        return prev;
                      });
                    }}
                  >
                    {Array.from({ length: GROUP_DISCOUNT_MAX_PAX }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n} Pasajero{n > 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field field--full">
                  <label className="field__label">Requerimientos especiales (opcional)</label>
                  <textarea
                    className="textarea"
                    placeholder="Necesidades dietarias, accesibilidad, celebraciones, alergias, etc."
                  ></textarea>
                </div>
              </div>

              {totals.groupDiscount > 0 && (
                <div className="discount-banner">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                    <line x1="7" y1="7" x2="7.01" y2="7" />
                  </svg>
                  <span>
                    <strong>¡Descuento por grupo aplicado!</strong> Viajas con {passengers.length} pasajero
                    {passengers.length > 1 ? 's' : ''} y obtenés {getGroupDiscountLabel(passengers.length)} automáticamente.{' '}
                    <span style={{ float: 'right' }}>
                      Descuento: <strong>-US$ {totals.groupDiscount}</strong>
                    </span>
                  </span>
                </div>
              )}
            </div>

            <div className="form-section">
              <h2>
                <span className="num">2</span> Información de los Pasajeros
              </h2>
              <p>Detalles de cada persona que participa del tour. Necesarios para permisos y registro.</p>

              <div id="passengersContainer">
                {passengers.map((p, i) => (
                  <div className="passenger" key={p.id}>
                    <div className="passenger__head">
                      <h4>
                        👤 Pasajero {i + 1}
                        {i === 0 ? ' (Reservante)' : ''}
                      </h4>
                      {i > 0 && (
                        <span className="passenger__remove" onClick={() => removePassenger(p.id)}>
                          Quitar
                        </span>
                      )}
                    </div>
                    <div className="form-grid form-grid--pax">
                      <div className="field">
                        <label className="field__label">
                          Nombre completo <span className="req">*</span>
                        </label>
                        <input
                          className="input"
                          type="text"
                          placeholder="Nombre completo"
                          required
                          value={p.name}
                          onChange={(e) => updatePassenger(p.id, 'name', e.target.value)}
                        />
                      </div>
                      <div className="field">
                        <label className="field__label">
                          Doc / Pasaporte <span className="req">*</span>
                        </label>
                        <input
                          className="input"
                          type="text"
                          placeholder="ID / Pasaporte"
                          required
                          value={p.doc}
                          onChange={(e) => updatePassenger(p.id, 'doc', e.target.value)}
                        />
                      </div>
                      <div className="field field--country">
                        <label className="field__label">
                          País <span className="req">*</span>
                        </label>
                        <input
                          className="input"
                          type="text"
                          placeholder="País"
                          required
                          value={p.country}
                          onChange={(e) => updatePassenger(p.id, 'country', e.target.value)}
                        />
                      </div>
                      <div className="field field--meal">
                        <label className="field__label">
                          Alimentación <span className="req">*</span>
                        </label>
                        <select
                          className="select"
                          required
                          value={p.meal}
                          onChange={(e) => updatePassenger(p.id, 'meal', e.target.value)}
                        >
                          <option>Vegetariana</option>
                          <option>Normal</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="divider-or">o agregá un nuevo pasajero</div>
              <button type="button" className="btn btn--ghost btn--sm" onClick={addPassenger}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Agregar otro pasajero
              </button>
            </div>

            <div className="form-section">
              <h2>
                <span className="num">3</span> Método de Pago
              </h2>
              <p style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span>Todos los pagos son procesados de forma segura a través de</span>
                <strong style={{ color: 'var(--green-700)', fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>
                  + Zwap
                </strong>
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10, marginTop: 16 }}>
                <label className="radio-pill" style={{ justifyContent: 'center', padding: 14 }}>
                  <input type="radio" name="pay" defaultChecked /> 💳 Tarjeta de crédito / débito
                </label>
              </div>

              <p
                style={{
                  marginTop: 20,
                  padding: 14,
                  background: 'var(--green-50)',
                  border: '1px solid var(--green-300)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.88rem',
                  color: 'var(--green-800)',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'start',
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ flexShrink: 0, marginTop: 2 }}
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Al continuar serás redirigido a la plataforma segura de Zwap para completar el pago de tu reserva.
              </p>
            </div>

            <div className="form-section">
              <label className="checkbox">
                <input type="checkbox" required />
                <span style={{ fontSize: '0.88rem' }}>
                  He leído y acepto los{' '}
                  <a href="#" style={{ color: 'var(--green-700)', textDecoration: 'underline' }}>
                    Términos de Servicio
                  </a>{' '}
                  y{' '}
                  <a href="#" style={{ color: 'var(--green-700)', textDecoration: 'underline' }}>
                    Condiciones
                  </a>{' '}
                  de Homeland Tours. <span className="req">*</span>
                </span>
              </label>
            </div>

            <button type="submit" className="btn btn--primary btn--lg btn--block" style={{ marginTop: 16 }} disabled={submitting}>
              {submitting ? 'Procesando…' : 'Continuar con el pago'}
              {!submitting && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </form>

          <aside>
            <SummaryCard
              tour={tour}
              selection={selection}
              paxCount={pax}
              couponCode={couponCode}
              couponDiscount={totals.coupon}
              totals={totals}
              baseSubtotal={baseSubtotal}
              onApplyCoupon={(code, discount) => {
                setCouponCode(code);
                setCouponDiscount(discount);
              }}
            />
          </aside>
        </div>
      </section>
    </>
  );
}
