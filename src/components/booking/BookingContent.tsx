'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import SummaryCard from '@/components/booking/SummaryCard';
import { useBooking } from '@/context/BookingContext';
import { useAuth } from '@/context/AuthContext';
import {
  bookingErrorInfo,
  clientTotals,
  createBooking,
  fetchActiveTourBySlug,
  fetchTourAvailability,
  type TourDateFree,
} from '@/lib/api';
import { getSupabase } from '@/lib/supabase';
import { formatUsd } from '@/lib/pricing';
import { track } from '@/lib/analytics';
import type { MealOption, Tour, TourExtra, TourType } from '@/lib/types';

interface BookerData {
  fullName: string;
  email: string;
  phone: string;
}

interface PassengerData {
  name: string;
  doc: string;
  country: string;
  meal: MealOption;
}

type SelectedExtra = TourExtra;

const MEALS: MealOption[] = ['Normal', 'Vegetariano', 'Vegano', 'Sin gluten'];

const TYPE_LABELS: Record<TourType, string> = {
  group: 'Tour compartido',
  semi: 'Tour semiprivado',
  private: 'Tour privado',
};

export default function BookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = searchParams.get('slug') ?? '';
  const { selection, setSelection, setResult } = useBooking();
  const { session, profile, loading: authLoading, updateProfile } = useAuth();

  const [tour, setTour] = useState<Tour | null>(null);
  const [loadError, setLoadError] = useState(false);

  // Sección 1: datos del reservante (viene de la cuenta; email no editable)
  const [booker, setBooker] = useState<BookerData>({ fullName: '', email: '', phone: '' });
  const [bookerTouched, setBookerTouched] = useState(false);

  // Sección 2: tipo de tour y extras
  const [selectedType, setSelectedType] = useState<TourType | null>(null);
  const [selectedExtras, setSelectedExtras] = useState<SelectedExtra[]>([]);

  // Sección 3: método de pago (link / QR) — el voucher usa la configuración global
  const [paymentMethod, setPaymentMethod] = useState<'link' | 'qr'>('link');

  // PAX y pasajeros
  const [pax, setPax] = useState(1);
  const [passengers, setPassengers] = useState<PassengerData[]>([
    { name: '', doc: '', country: '', meal: 'Normal' },
  ]);

  // Cupón (aplicado desde el resumen)
  const [couponApplied, setCouponApplied] = useState<{ code: string; discountPct: number } | null>(null);

  // Envío
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [fullDates, setFullDates] = useState<TourDateFree[]>([]);

  // Login gate (RF-06): la reserva se asocia a la cuenta.
  useEffect(() => {
    if (!authLoading && !session) {
      router.replace(`/login?next=/booking?slug=${encodeURIComponent(slug)}`);
    }
  }, [authLoading, session, router, slug]);

  // El tour se lee del catálogo (la base es la cuenta única de verdad).
  useEffect(() => {
    if (!slug) {
      setLoadError(true);
      return;
    }
    let active = true;
    fetchActiveTourBySlug(getSupabase(), slug)
      .then((t) => {
        if (!active) return;
        if (!t) {
          setLoadError(true);
          return;
        }
        setTour(t);
        if (selection) {
          setSelectedType(selection.tourType);
          setPax(selection.pax);
          if (t) {
            const extras = t.extras.filter((e) => selection.extras.includes(e.id));
            setSelectedExtras(extras);
          }
          setPassengers(
            Array.from({ length: selection.pax }, () => ({
              name: '',
              doc: '',
              country: '',
              meal: 'Normal' as MealOption,
            })),
          );
        }
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Precarga los datos del reservante desde la cuenta.
  useEffect(() => {
    if (session && !bookerTouched) {
      setBooker({
        fullName: profile?.full_name || session.user.email || '',
        email: session.user.email ?? '',
        phone: profile?.phone || '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, profile]);

  // Mantiene la selección (contexto/localStorage) sincronizada con los cambios.
  useEffect(() => {
    if (!tour || !selectedType) return;
    const extraIds = selectedExtras.map((e) => e.id);
    const perPerson = tour.tourTypes[selectedType] ?? 0;
    setSelection({
      tourSlug: tour.slug,
      tourType: selectedType,
      date: selection?.date ?? '',
      pax,
      extras: extraIds,
      perPerson,
      extrasTotal: selectedExtras.filter((e) => e.kind === 'paid').reduce((s, e) => s + e.price, 0),
      subtotal: perPerson * pax + selectedExtras.filter((e) => e.kind === 'paid').reduce((s, e) => s + e.price, 0),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour, selectedType, selectedExtras, pax]);

  const tourTypes = useMemo(() => {
    if (!tour) return [];
    return (['group', 'semi', 'private'] as TourType[])
      .filter((t) => tour.tourTypes[t] >= 0)
      .map((t) => ({ id: t, label: TYPE_LABELS[t], price: tour.tourTypes[t] }));
  }, [tour]);

  const selectedTypeData = tourTypes.find((t) => t.id === selectedType);
  const selectedPrice = selectedTypeData?.price ?? 0;

  const totals = tour && selectedType
    ? clientTotals(tour, selectedType, pax, selectedExtras.map((e) => e.id), couponApplied?.discountPct ?? 0)
    : null;
  const total = totals?.total ?? 0;

  const toggleExtra = (extra: SelectedExtra) => {
    setSelectedExtras((prev) =>
      prev.some((e) => e.id === extra.id) ? prev.filter((e) => e.id !== extra.id) : [...prev, extra],
    );
  };

  const setPaxSafe = (n: number) => {
    const clamped = Math.max(1, Math.min(8, n));
    setPax(clamped);
    setPassengers((prev) =>
      clamped <= prev.length
        ? prev.slice(0, clamped)
        : [...prev, ...Array.from({ length: clamped - prev.length }, () => ({ name: '', doc: '', country: '', meal: 'Normal' as MealOption }))],
    );
  };

  const removePassenger = (index: number) => setPaxSafe(pax - 1);

  const updatePassenger = (index: number, field: keyof PassengerData, value: string) => {
    setPassengers((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFullDates([]);

    if (!tour?.id || !session || !selection?.date || !selectedType) return;

    if (!booker.fullName.trim() || !booker.phone.trim()) {
      setFormError('Completa tu nombre y teléfono.');
      return;
    }
    if (passengers.some((p) => !p.name.trim() || !p.doc.trim() || !p.country.trim())) {
      setFormError('Completa nombre, documento y nacionalidad de cada viajero.');
      return;
    }

    setSubmitting(true);
    track('booking_submitted', { tour: tour.slug, total });

    try {
      const created = await createBooking(getSupabase(), {
        tourId: tour.id,
        date: selection.date,
        tourType: selectedType,
        pax,
        extraIds: selectedExtras.map((x) => x.id),
        passengers: passengers.map((p, i) => ({
          name: p.name.trim(),
          doc: p.doc.trim(),
          country: p.country.trim(),
          meal: p.meal,
          isLead: i === 0,
        })),
        couponCode: couponApplied?.code ?? null,
        paymentMethod,
      });

      setResult({
        code: created.reservation.code,
        reservationId: created.reservation.id,
        createdAt: created.reservation.created_at,
      });

      if (booker.phone.trim() && profile && profile.phone !== booker.phone.trim()) {
        void updateProfile({ phone: booker.phone.trim() });
      }

      track('booking_created', { code: created.reservation.code, total });
      router.push('/confirmation');
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      const { code } = bookingErrorInfo(message);
      if (code === 'date_full') {
        setFormError('Vaya, esa fecha se llenó mientras reservabas. Elegí otra fecha disponible:');
        const avail = await fetchTourAvailability(getSupabase(), tour.id).catch(() => null);
        if (avail) setFullDates(avail.filter((a) => a.free > 0).slice(0, 5));
      } else if (code === 'coupon_invalid') {
        setCouponApplied(null);
        setFormError('El cupón no existe, no está activo o venció.');
      } else if (code === 'not_authenticated') {
        router.replace(`/login?next=/booking?slug=${encodeURIComponent(slug)}`);
      } else if (code === 'date_not_open' || code === 'date_past') {
        setFormError('La fecha seleccionada no está disponible. Volvé al tour para elegir una fecha válida.');
      } else {
        setFormError('No pudimos crear la reserva. Volvé a intentarlo.');
      }
      setSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <div className="form-hero form-hero--sm" style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.8rem', marginBottom: 8 }}>Tour no encontrado</h1>
        <p style={{ color: 'var(--ink-500)' }}>
          El tour que buscás no está disponible. Volvé al catálogo para elegir otra aventura.
        </p>
        <div style={{ marginTop: 24 }}>
          <button className="btn btn--primary" onClick={() => router.push('/tours')}>
            Ver todos los tours
          </button>
        </div>
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="form-hero form-hero--sm" style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--ink-500)' }}>Cargando tour…</p>
      </div>
    );
  }

  // Si todavía no hay sesión, el gate de arriba redirige a /login.
  if (!session) return null;

  return (
    <div className="form-page">
      <div className="form-hero">
        <div className="container">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Tours', href: '/tours' }, { label: 'Reservar' }]} />
          <h1>Reservá tu aventura</h1>
          <p>{tour.title} · {tour.duration} · {tour.destination}</p>
        </div>
      </div>

      <div className="container booking-layout">
        <div className="booking-stepper">
          <div className="step is-active">
            <span className="step-badge">1</span>
            Datos y reserva
          </div>
          <div className="step is-pending">
            <span className="step-badge">2</span>
            Voucher y pago
          </div>
        </div>

        <div className="booking-form-wrap">
          <form onSubmit={handleSubmit} className="form-card">
            <div className="form-card__section">
              <div className="form-card__section-title">
                <span className="section-num">1</span>
                Datos del reservante
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="fullName">Nombre completo</label>
                  <input
                    id="fullName"
                    type="text"
                    placeholder="Tu nombre y apellido"
                    value={booker.fullName}
                    onChange={(e) => {
                      setBookerTouched(true);
                      setBooker({ ...booker, fullName: e.target.value });
                    }}
                  />
                </div>
                <div className="field">
                  <label htmlFor="phone">Teléfono / WhatsApp</label>
                  <input
                    id="phone"
                    type="tel"
                    placeholder="+591 7XX XXX XX"
                    value={booker.phone}
                    onChange={(e) => setBooker({ ...booker, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="email">Correo electrónico</label>
                <input id="email" type="email" value={booker.email} readOnly className="input--readonly" />
                <small style={{ color: 'var(--ink-500)' }}>
                  Usamos tu cuenta ({booker.email}) para el voucher y la comunicación.
                </small>
              </div>
            </div>

            <div className="form-card__section">
              <div className="form-card__section-title">
                <span className="section-num">2</span>
                Tipo de tour y extras
              </div>
              <div className="field">
                <label>Tipo de tour</label>
                <div className="radio-row">
                  {tourTypes.map((t) => (
                    <label key={t.id} className={`radio-pill${selectedType === t.id ? ' is-active' : ''}`}>
                      <input
                        type="radio"
                        name="tourType"
                        value={t.id}
                        checked={selectedType === t.id}
                        onChange={() => setSelectedType(t.id)}
                      />
                      <span>{t.label}</span>
                      <small>{t.price === 0 ? 'Consultar' : formatUsd(t.price)}/pax</small>
                    </label>
                  ))}
                </div>
              </div>

              <div className="field">
                <label>Extras disponibles</label>
                <div className="extras-grid">
                  {tour.extras.map((extra) => (
                    <label
                      key={extra.id}
                      className={`extra-option${selectedExtras.some((e) => e.id === extra.id) ? ' is-active' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedExtras.some((e) => e.id === extra.id)}
                        onChange={() => toggleExtra(extra)}
                      />
                      <div className="extra-option__body">
                        <strong>{extra.name}</strong>
                        <small>{extra.sub}</small>
                      </div>
                      <span className="extra-option__price">
                        {extra.kind === 'paid' ? `+${formatUsd(extra.price)}` : 'Gratuito'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="field">
                <label>
                  Viajeros: <strong>{pax}</strong>
                  <span style={{ color: 'var(--ink-500)' }}>
                    {' '}
                    · {pax === 1 ? 'persona' : 'personas'} · {tour.duration}
                  </span>
                </label>
                <div className="pax-control">
                  <button type="button" disabled={pax <= 1} onClick={() => setPaxSafe(pax - 1)}>
                    −
                  </button>
                  <span>{pax}</span>
                  <button type="button" disabled={pax >= 8} onClick={() => setPaxSafe(pax + 1)}>
                    +
                  </button>
                </div>
                {pax >= 3 && (
                  <span className="form-note">Descuento por grupo aplicado automáticamente ({totals ? Math.round(totals.groupDiscountRate * 100) : 0}%)</span>
                )}
              </div>

              {passengers.map((p, idx) => (
                <div className="passenger-form" key={idx}>
                  <div className="passenger-header">
                    <span>
                      Viajero {idx + 1}
                      {idx === 0 && (
                        <em style={{ marginLeft: 8, fontSize: 12, color: 'var(--accent-600)' }}>(reservante)</em>
                      )}
                    </span>
                    {passengers.length > 1 && (
                      <button type="button" onClick={() => removePassenger(idx)}>
                        Quitar
                      </button>
                    )}
                  </div>
                  <div className="field-row">
                    <div className="field">
                      <label>Nombre completo</label>
                      <input
                        type="text"
                        placeholder="Nombre y apellido"
                        value={p.name}
                        onChange={(e) => updatePassenger(idx, 'name', e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label>Número de documento</label>
                      <input
                        type="text"
                        placeholder="Carnet / Pasaporte"
                        value={p.doc}
                        onChange={(e) => updatePassenger(idx, 'doc', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="field-row">
                    <div className="field">
                      <label>Nacionalidad</label>
                      <input
                        type="text"
                        placeholder="Ej: Argentina"
                        value={p.country}
                        onChange={(e) => updatePassenger(idx, 'country', e.target.value)}
                      />
                    </div>
                    <div className="field">
                      <label>Tipo de comida</label>
                      <select value={p.meal} onChange={(e) => updatePassenger(idx, 'meal', e.target.value as MealOption)}>
                        {MEALS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="form-card__section">
              <div className="form-card__section-title">
                <span className="section-num">3</span>
                Método de pago
              </div>
              <div className="form-note" style={{ marginBottom: 12 }}>
                Al confirmar vas a recibir un voucher con el enlace de pago o el QR del pago. El pago lo
                coordinás con la operatora — nada se cobra automáticamente.
              </div>
              <div className="radio-row">
                <label className={`radio-pill${paymentMethod === 'link' ? ' is-active' : ''}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="link"
                    checked={paymentMethod === 'link'}
                    onChange={() => setPaymentMethod('link')}
                  />
                  <span>💳 Enlace de pago</span>
                  <small>Botón para pagar desde el voucher</small>
                </label>
                <label className={`radio-pill${paymentMethod === 'qr' ? ' is-active' : ''}`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="qr"
                    checked={paymentMethod === 'qr'}
                    onChange={() => setPaymentMethod('qr')}
                  />
                  <span>📱 QR</span>
                  <small>Escaneá el QR del voucher</small>
                </label>
              </div>
            </div>

            {formError && <div className="error-alert">{formError}</div>}

            {fullDates.length > 0 && (
              <div className="full-dates">
                {fullDates.map((d) => (
                  <div key={d.id} className="full-dates__row">
                    <strong>
                      {new Date(d.date + 'T12:00:00').toLocaleDateString('es-BY', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                    </strong>
                    <span>
                      {d.free} {d.free === 1 ? 'lugar' : 'lugares'} libres
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button className="form-card__submit" type="submit" disabled={submitting || !selectedType}>
              {submitting ? 'Procesando…' : 'Continuar →'}
            </button>
            <button className="form-card__cancel" type="button" onClick={() => router.push(`/tours/${slug}`)}>
              ← Volver al tour
            </button>
          </form>

          <SummaryCard
            tour={tour}
            selection={selection}
            paxCount={pax}
            couponCode={couponApplied?.code ?? null}
            couponDiscount={totals?.couponDiscount ?? 0}
            totals={{
              groupDiscount: totals?.groupDiscount ?? 0,
              groupDiscountRate: totals?.groupDiscountRate,
              coupon: totals?.couponDiscount ?? 0,
              total,
            }}
            baseSubtotal={totals?.subtotal ?? 0}
            onApplyCoupon={(code, discountPct) => setCouponApplied({ code, discountPct })}
          />
        </div>
      </div>

      <div className="booking-bottom-bar">
        <div className="booking-bottom-bar__inner">
          <div className="booking-bottom-bar__total">
            <span>
              Total
              <br />
              <strong>{formatUsd(total)}</strong>
            </span>
          </div>
          <div className="booking-bottom-bar__actions">
            <button className="btn btn--ghost" onClick={() => router.push(`/tours/${slug}`)}>
              Volver al tour
            </button>
            <button
              className="btn btn--primary"
              disabled={submitting || !selectedType}
              onClick={() => {
                const form = document.querySelector<HTMLFormElement>('.form-card');
                form?.requestSubmit();
              }}
            >
              {submitting ? 'Procesando…' : 'Continuar →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
