'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
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
  offerAppliesToSelection,
  type TourDateFree,
} from '@/lib/api';
import { getSupabase } from '@/lib/supabase';
import { formatUsd, GROUP_DISCOUNT_MAX_PAX } from '@/lib/pricing';
import { track } from '@/lib/analytics';
import type { MealOption, Tour, TourExtra, TourType } from '@/lib/types';
import Icon from '@/components/ui/Icon';

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

const fmtTripDate = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

export default function BookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selection, setSelection, setResult, hydrated } = useBooking();
  // El slug de la URL manda; si falta (p. ej. carrito del header), usa el de la selección.
  const slug = searchParams.get('slug') || selection?.tourSlug || '';
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

  // Viajeros: adultos y niños por separado (la reserva online cobra tarifa de adulto a todos).
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const pax = adults + children;
  const [passengers, setPassengers] = useState<PassengerData[]>([
    { name: '', doc: '', country: '', meal: 'Normal' },
  ]);

  // Cupón (aplicado desde el resumen)
  const [couponApplied, setCouponApplied] = useState<{ code: string; discountPct: number } | null>(null);

  // Envío
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [fullDates, setFullDates] = useState<TourDateFree[]>([]);

  // Cupo real de la franja elegida (se revalida al entrar y al cambiar viajeros).
  const [slotFree, setSlotFree] = useState<number | null>(null);
  const [slotGone, setSlotGone] = useState(false);

  // Login gate (RF-06): la reserva se asocia a la cuenta. Sin slug no hay
  // reserva que retomar: se muestra el carrito vacío en vez de redirigir.
  useEffect(() => {
    if (!authLoading && !session && slug) {
      router.replace(`/login?next=${encodeURIComponent(`/booking?slug=${slug}`)}`);
    }
  }, [authLoading, session, router, slug]);

  // El tour se lee del catálogo (la base es la cuenta única de verdad).
  // Al cambiar el slug se resetea el error y se reintenta la carga.
  const initializedRef = useRef<string | null>(null);
  useEffect(() => {
    initializedRef.current = null;
    setTour(null);
    setLoadError(false);
    setSelectedType(null);
    setSelectedExtras([]);
    setSlotFree(null);
    setSlotGone(false);
    if (!slug) return;
    let active = true;
    fetchActiveTourBySlug(getSupabase(), slug)
      .then((t) => {
        if (!active) return;
        if (!t) {
          setLoadError(true);
          return;
        }
        setTour(t);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  // Restaura la selección (fecha, horario, viajeros, extras) aunque llegue
  // después de la carga del tour (p. ej. tras recargar /booking o entrar directo).
  useEffect(() => {
    if (!tour || !selection || selection.tourSlug !== tour.slug) return;
    if (initializedRef.current === tour.slug) return;
    initializedRef.current = tour.slug;
    const c = selection.children ?? 0;
    const a = selection.adults ?? Math.max(1, selection.pax - c);
    setAdults(a);
    setChildren(c);
    setSelectedType(selection.tourType);
    setSelectedExtras(tour.extras.filter((e) => selection.extras.includes(e.id)));
    setPassengers(
      Array.from({ length: a + c }, () => ({
        name: '',
        doc: '',
        country: '',
        meal: 'Normal' as MealOption,
      })),
    );
  }, [tour, selection]);

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

  // La oferta solo se aplica si es la que eligió el usuario (selection.offerId)
  // y cumple las condiciones de la RPC para la fecha/franja/pax actuales
  // (p. ej. cupos promocionales al cambiar la cantidad de viajeros).
  const applicableOffer = useMemo(() => {
    if (!tour?.offer || !selection?.date || selection.offerId !== tour.offer.id) return null;
    return offerAppliesToSelection(tour.offer, {
      tourId: tour.id,
      date: selection.date,
      startTime: selection.startTime ?? null,
      pax,
    })
      ? tour.offer
      : null;
  }, [tour, selection?.date, selection?.offerId, selection?.startTime, pax]);
  const offerPct = applicableOffer?.discount_pct ?? 0;
  const offerId = applicableOffer?.id ?? null;

  // Mantiene la selección (contexto/sessionStorage) sincronizada con los cambios.
  useEffect(() => {
    if (!tour || !selectedType) return;
    const extraIds = selectedExtras.map((e) => e.id);
    const perPerson = tour.tourTypes[selectedType] ?? 0;
    const extrasTotal = selectedExtras.filter((e) => e.kind === 'paid').reduce((s, e) => s + e.price, 0);
    setSelection({
      tourSlug: tour.slug,
      tourType: selectedType,
      date: selection?.date ?? '',
      pax,
      extras: extraIds,
      perPerson,
      extrasTotal,
      subtotal: perPerson * pax + extrasTotal,
      tourDateId: selection?.tourDateId ?? null,
      offerId,
      offerPct,
      adults,
      children,
      startTime: selection?.startTime ?? null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour, selectedType, selectedExtras, adults, children]);

  const tourTypes = useMemo(() => {
    if (!tour) return [];
    return (['group', 'semi', 'private'] as TourType[])
      .filter((t) => tour.tourTypes[t] >= 0)
      .map((t) => ({ id: t, label: TYPE_LABELS[t], price: tour.tourTypes[t] }));
  }, [tour]);

  const selectedTypeData = tourTypes.find((t) => t.id === selectedType);
  const selectedPrice = selectedTypeData?.price ?? 0;

  const totals = tour && selectedType
    ? clientTotals(tour, selectedType, pax, selectedExtras.map((e) => e.id), couponApplied?.discountPct ?? 0, offerPct)
    : null;
  const total = totals?.total ?? 0;

  // Revalida el cupo de la franja elegida (pudo cambiar desde que se eligió).
  useEffect(() => {
    if (!tour?.id || !selection?.tourDateId) {
      setSlotFree(null);
      setSlotGone(false);
      return;
    }
    let active = true;
    fetchTourAvailability(getSupabase(), tour.id)
      .then((rows) => {
        if (!active) return;
        const slot = rows.find((r) => r.id === selection.tourDateId);
        if (!slot || slot.bookable === false || slot.blocked) {
          setSlotGone(true);
          setSlotFree(null);
        } else {
          setSlotGone(false);
          setSlotFree(slot.free);
        }
      })
      .catch(() => {
        if (active) {
          setSlotFree(null);
          setSlotGone(false);
        }
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour?.id, selection?.tourDateId]);

  const noDate = !selection?.date || !selection?.tourDateId;
  const slotShort = slotFree !== null && slotFree < pax;
  const cannotSubmit = submitting || !selectedType || noDate || slotGone || slotShort;

  const toggleExtra = (extra: SelectedExtra) => {
    setSelectedExtras((prev) =>
      prev.some((e) => e.id === extra.id) ? prev.filter((e) => e.id !== extra.id) : [...prev, extra],
    );
  };

  const syncPassengers = (n: number) => {
    setPassengers((prev) =>
      n <= prev.length
        ? prev.slice(0, n)
        : [...prev, ...Array.from({ length: n - prev.length }, () => ({ name: '', doc: '', country: '', meal: 'Normal' as MealOption }))],
    );
  };

  const changeAdults = (n: number) => {
    const a = Math.max(1, Math.min(GROUP_DISCOUNT_MAX_PAX - children, n));
    setAdults(a);
    syncPassengers(a + children);
  };

  const changeChildren = (n: number) => {
    const c = Math.max(0, Math.min(GROUP_DISCOUNT_MAX_PAX - adults, n));
    setChildren(c);
    syncPassengers(adults + c);
  };

  const removePassenger = () => {
    if (children > 0) changeChildren(children - 1);
    else changeAdults(adults - 1);
  };

  const updatePassenger = (index: number, field: keyof PassengerData, value: string) => {
    setPassengers((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFullDates([]);

    if (!tour?.id || !session || !selectedType) return;
    if (!selection?.date || !selection?.tourDateId) {
      setFormError('Elige una fecha y un horario en la ficha del tour antes de confirmar.');
      return;
    }
    if (slotGone || slotShort) {
      setFormError('La franja elegida ya no tiene cupo para tus viajeros. Cambia la fecha u horario, o quita viajeros.');
      return;
    }

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
        children,
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
        tourDateId: selection.tourDateId ?? null,
        offerId,
        contactName: booker.fullName.trim(),
        contactPhone: booker.phone.trim(),
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
      const { code, detail } = bookingErrorInfo(message);
      if (code === 'date_full') {
        setFormError('Vaya, esa fecha se llenó mientras reservabas. Elige otra fecha disponible:');
        const avail = await fetchTourAvailability(getSupabase(), tour.id).catch(() => null);
        if (avail) setFullDates(avail.filter((a) => a.free > 0).slice(0, 5));
      } else if (code === 'coupon_invalid') {
        setCouponApplied(null);
        setFormError('El cupón no existe, no está activo o venció.');
      } else if (code === 'not_authenticated') {
        router.replace(`/login?next=${encodeURIComponent(`/booking?slug=${slug}`)}`);
      } else if (code === 'date_not_open' || code === 'date_past') {
        setFormError('La fecha seleccionada no está disponible. Vuelve al tour para elegir una fecha válida.');
      } else if (code === 'cutoff_passed') {
        setFormError('La hora límite de reserva para esa salida ya pasó. Elige otra fecha u horario disponible.');
      } else if (code === 'slot_blocked') {
        setFormError('Esa salida fue bloqueada por la operatora. Elige otra fecha u horario disponible.');
      } else if (code === 'offer_invalid' || code === 'offer_full') {
        if (selection) setSelection({ ...selection, offerId: null, offerPct: 0 });
        setFormError(
          code === 'offer_full'
            ? 'Se agotaron las plazas con descuento de esta oferta. Quitamos el descuento; revisá el nuevo total antes de confirmar.'
            : 'La oferta de descuento ya no aplica a esta salida. Quitamos el descuento; revisá el nuevo total antes de confirmar.',
        );
      } else if (code === 'invalid_passengers') {
        setFormError(
          /adult/i.test(detail)
            ? 'Debe haber al menos un adulto en la reserva. Ajusta la cantidad de adultos y niños.'
            : 'Revisa los datos de los viajeros: falta el nombre de alguno o no coincide con la cantidad de plazas.',
        );
      } else if (code === 'invalid_contact') {
        setFormError('Revisa el nombre y el teléfono de contacto.');
      } else if (code === 'invalid_pax') {
        setFormError('La cantidad de viajeros no es válida para este tour (revisa el mínimo y el máximo de plazas).');
      } else if (code === 'tour_type_unavailable') {
        setFormError('Ese tipo de tour no está disponible para esta fecha. Elige otro tipo (compartido, semiprivado o privado).');
      } else {
        setFormError('No pudimos crear la reserva. Vuelve a intentarlo.');
      }
      setSubmitting(false);
    }
  };

  // Sin slug ni selección: carrito vacío amable (no es un error de tour).
  if (!slug) {
    if (!hydrated) {
      return (
        <div className="form-hero form-hero--sm" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--ink-500)' }}>Cargando tu carrito…</p>
        </div>
      );
    }
    return (
      <div className="form-hero form-hero--sm" style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.8rem', marginBottom: 8 }}>Tu carrito está vacío</h1>
        <p style={{ color: 'var(--ink-500)' }}>
          Todavía no elegiste ninguna aventura. Explora los tours y arma tu viaje a Bolivia.
        </p>
        <div style={{ marginTop: 24 }}>
          <Link className="btn btn--primary" href="/tours">
            Explorar tours
          </Link>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="form-hero form-hero--sm" style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.8rem', marginBottom: 8 }}>Tour no encontrado</h1>
        <p style={{ color: 'var(--ink-500)' }}>
          El tour que buscas no está disponible. Vuelve al catálogo para elegir otra aventura.
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
          <Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'Tours', href: '/tours' }, { label: 'Reservar' }]} />
          <h1>Reserva tu aventura</h1>
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
            <div className="form-card__section booking-trip">
              <div className="booking-trip__head">
                <h3 className="booking-trip__title">Tu salida</h3>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => router.push(`/tours/${tour.slug}`)}
                >
                  <Icon name="calendar" size={15} /> Cambiar fecha u horario
                </button>
              </div>
              {selection?.date ? (
                <p className="booking-trip__when">
                  <Icon name="calendar" size={16} />
                  {fmtTripDate(selection.date)}
                  {selection.startTime ? ` · ${selection.startTime} hs` : ''}
                </p>
              ) : (
                <p className="booking-trip__when booking-trip__when--pending">
                  <Icon name="calendar" size={16} />
                  Fecha pendiente: elegí una fecha y un horario en la ficha del tour.
                </p>
              )}
              <div className="booking-trip__pax">
                <div className="field">
                  <label>Adultos</label>
                  <div className="pax-control">
                    <button type="button" disabled={adults <= 1} onClick={() => changeAdults(adults - 1)} aria-label="Restar adulto">−</button>
                    <span>{adults}</span>
                    <button type="button" disabled={pax >= GROUP_DISCOUNT_MAX_PAX} onClick={() => changeAdults(adults + 1)} aria-label="Sumar adulto">+</button>
                  </div>
                </div>
                <div className="field">
                  <label>Niños{tour.childAgeMax ? ` · hasta ${tour.childAgeMax} años` : ''}</label>
                  <div className="pax-control">
                    <button type="button" disabled={children <= 0} onClick={() => changeChildren(children - 1)} aria-label="Restar niño">−</button>
                    <span>{children}</span>
                    <button type="button" disabled={pax >= GROUP_DISCOUNT_MAX_PAX} onClick={() => changeChildren(children + 1)} aria-label="Sumar niño">+</button>
                  </div>
                </div>
              </div>
              {tour.priceChild != null && children > 0 && (
                <p className="form-note">
                  Tarifa niño de referencia: US$ {tour.priceChild}. La reserva online aplica la tarifa de adulto a todos los viajeros.
                </p>
              )}
              {slotGone && (
                <div className="error-alert">Esa salida ya no está disponible. Cambia la fecha u horario.</div>
              )}
              {!slotGone && slotShort && (
                <div className="error-alert">
                  La franja elegida tiene {slotFree} cupo{slotFree === 1 ? '' : 's'} y no alcanza para {pax} viajeros. Quita viajeros o cambia de horario.
                </div>
              )}
            </div>

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
                    · {adults} adulto{adults !== 1 ? 's' : ''}
                    {children > 0 ? ` · ${children} niño${children !== 1 ? 's' : ''}` : ''} · {tour.duration}
                  </span>
                </label>
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
                      <button type="button" onClick={() => removePassenger()}>
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
                coordinas con la operatora — nada se cobra automáticamente.
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
                  <span className="icon-inline">
                    <Icon name="card" size={17} /> Enlace de pago
                  </span>
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
                  <span className="icon-inline">
                    <Icon name="qr" size={17} /> QR
                  </span>
                  <small>Escanea el QR del voucher</small>
                </label>
              </div>
            </div>

            {formError && <div className="error-alert">{formError}</div>}

            {fullDates.length > 0 && (
              <div className="full-dates">
                {fullDates.map((d) => (
                  <div key={d.id} className="full-dates__row">
                    <strong>
                      {new Date(d.date + 'T12:00:00').toLocaleDateString('es-ES', {
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

            <button className="form-card__submit" type="submit" disabled={cannotSubmit}>
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
              offerDiscount: totals?.offerDiscount ?? 0,
              offerPct,
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
              disabled={cannotSubmit}
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
