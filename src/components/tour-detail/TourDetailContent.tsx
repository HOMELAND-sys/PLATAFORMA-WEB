'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import TourCard from '@/components/ui/TourCard';
import AvailabilityModal from '@/components/tour-detail/AvailabilityModal';
import { calcAvailabilityTotal, GROUP_DISCOUNT_MAX_PAX } from '@/lib/pricing';
import { useBooking } from '@/context/BookingContext';
import { fetchTourAvailability } from '@/lib/api';
import type { TourDateFree } from '@/lib/api';
import { getSupabase } from '@/lib/supabase';
import type { Tour, TourType } from '@/lib/types';

const TABS = [
  { id: 'itinerary', label: 'Itinerario' },
  { id: 'included', label: '¿Qué incluye?' },
  { id: 'bring', label: '¿Qué llevar?' },
  { id: 'info', label: 'Información importante' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function TourDetailContent({ tour, mightLike }: { tour: Tour; mightLike: Tour[] }) {
  const router = useRouter();
  const { setSelection } = useBooking();
  const [activeImg, setActiveImg] = useState(0);
  const [activeTab, setActiveTab] = useState<TabId>('itinerary');
  const [modalOpen, setModalOpen] = useState(false);
  const [date, setDate] = useState('');
  const [tourType, setTourType] = useState<TourType>('group');
  const [pax, setPax] = useState(2);
  const [extraIds, setExtraIds] = useState<string[]>([]);
  const [availability, setAvailability] = useState<TourDateFree[] | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    setModalOpen(false);
    setActiveImg(0);
    setActiveTab('itinerary');
  }, [tour.slug]);

  // Disponibilidad real (RF-05): fechas abiertas con cupo libre.
  useEffect(() => {
    if (!tour.id) return;
    let active = true;
    setAvailability(null);
    fetchTourAvailability(getSupabase(), tour.id)
      .then((dates) => {
        if (active) setAvailability(dates);
      })
      .catch(() => {
        if (active) setAvailability([]);
      });
    return () => {
      active = false;
    };
  }, [tour.id]);

  const total = useMemo(
    () => calcAvailabilityTotal(tour, tourType, pax, extraIds),
    [tour, tourType, pax, extraIds],
  );

  const handleAddToCart = () => {
    setSelection({
      tourSlug: tour.slug,
      tourType,
      date,
      pax,
      extras: extraIds,
      perPerson: total.perPerson,
      extrasTotal: total.extrasTotal,
      subtotal: total.subtotal,
    });
    router.push('/booking');
  };

  const toggleExtra = (id: string) => {
    setExtraIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <>
      <section className="detail-header">
        <div className="container">
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Tours & Packages', href: '/tours' },
              { label: tour.title },
            ]}
          />
          <h1>{tour.title}</h1>
          <div className="detail-meta">
            <span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>{' '}
              {tour.destination}
            </span>
          </div>
        </div>
      </section>

      <section className="container">
        <div className="detail-layout">
          <div className="detail-main">
            <div className="gallery">
              <div className="gallery__thumbs">
                {tour.gallery.map((img, i) => (
                  <div
                    key={img}
                    className={`thumb${activeImg === i ? ' is-active' : ''}`}
                    style={{ backgroundImage: `url('${img}')` }}
                    onClick={() => setActiveImg(i)}
                    role="button"
                    aria-label={`Imagen ${i + 1}`}
                  ></div>
                ))}
              </div>
              <div className="gallery__main">
                <img src={tour.gallery[activeImg]} alt={tour.title} />
                <div className="gallery__overlay-actions">
                  <button className="gallery__action" aria-label="Compartir">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" />
                    </svg>
                    Compartir
                  </button>
                  <button className="gallery__action" aria-label="Añadir a lista de deseos">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    Guardar
                  </button>
                </div>
                <button
                  className="gallery__nav gallery__nav--prev"
                  aria-label="Anterior"
                  onClick={() => setActiveImg((i) => (i - 1 + tour.gallery.length) % tour.gallery.length)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <button
                  className="gallery__nav gallery__nav--next"
                  aria-label="Siguiente"
                  onClick={() => setActiveImg((i) => (i + 1) % tour.gallery.length)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="info-strip">
              <div className="info-strip__item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <div>
                  <div className="info-strip__item-label">Destino</div>
                  <div className="info-strip__item-value">{tour.destination}</div>
                </div>
              </div>
              <div className="info-strip__item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                <div>
                  <div className="info-strip__item-label">Inicio / Fin</div>
                  <div className="info-strip__item-value">{tour.startEnd}</div>
                </div>
              </div>
              <div className="info-strip__item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M12 2v20M4 7l8-5 8 5" />
                </svg>
                <div>
                  <div className="info-strip__item-label">Mejor temporada</div>
                  <div className="info-strip__item-value">{tour.bestSeason}</div>
                </div>
              </div>
              <div className="info-strip__item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <circle cx="12" cy="8" r="6" />
                  <path d="M9 14l-2 8 5-3 5 3-2-8" />
                </svg>
                <div>
                  <div className="info-strip__item-label">Tipo de tour</div>
                  <div className="info-strip__item-value">{tour.typeLabel}</div>
                </div>
              </div>
              <div className="info-strip__item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M2 20h20M5 20l3-10h8l3 10M9 10V4h6v6" />
                </svg>
                <div>
                  <div className="info-strip__item-label">Actividad</div>
                  <div className="info-strip__item-value">{tour.activityLabel}</div>
                </div>
              </div>
              <div className="info-strip__item">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M2 20l3-10h14l3 10M5 20l5-15h4l5 15" />
                </svg>
                <div>
                  <div className="info-strip__item-label">Altitud máx.</div>
                  <div className="info-strip__item-value">{tour.maxAltitude}</div>
                </div>
              </div>
            </div>

            <div className="tour-summary">
              <h3>Resumen del viaje</h3>
              {tour.summary.map((p, i) => (
                <p key={i}>{p}</p>
              ))}

              <h3 style={{ marginTop: 32 }}>Highlights</h3>
              <ul className="highlights-list">
                {tour.highlights.map((h) => (
                  <li key={h}>
                    <span>✓</span> {h}
                  </li>
                ))}
              </ul>
            </div>

            <div className="tabs">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  className={`tab${activeTab === tab.id ? ' is-active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'itinerary' && (
              <div className="tab-panel is-active">
                <h3>Itinerario día a día</h3>
                <p>Días de exploración profunda del altiplano boliviano.</p>
                <ol className="itinerary">
                  {tour.itinerary.map((day) => (
                    <li className="itinerary__item" key={day.day}>
                      <details className="itinerary__details" open={day.day === 1}>
                        <summary className="itinerary__summary">
                          <div className="itinerary__day">
                            DÍA
                            <strong>{String(day.day).padStart(2, '0')}</strong>
                          </div>
                          <div className="itinerary__head-content">
                            <h4>{day.title}</h4>
                            <div className="itinerary__meals">
                              {day.meals.map((m) => (
                                <span key={m}>🍽 {m}</span>
                              ))}
                              {day.stay && <span>🏨 {day.stay}</span>}
                            </div>
                          </div>
                          <span className="itinerary__chevron">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M6 9l6 6 6-6" />
                            </svg>
                          </span>
                        </summary>
                        <div className="itinerary__body">
                          <p>{day.description}</p>
                          <div className="itinerary__activities">
                            <h5>Actividades del día</h5>
                            <ul>
                              {day.activities.map((a) => (
                                <li key={a}>{a}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </details>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {activeTab === 'included' && (
              <div className="tab-panel is-active">
                <h3>¿Qué incluye y qué no?</h3>
                <p>Todo lo que necesitás saber sobre qué está cubierto en el precio.</p>
                <div className="included-grid">
                  <div>
                    <h4 style={{ color: 'var(--green-700)', marginBottom: 8 }}>✓ Incluido</h4>
                    <ul className="included-list included-list--yes">
                      {tour.included.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 style={{ color: 'var(--danger)', marginBottom: 8 }}>✕ No incluido</h4>
                    <ul className="included-list included-list--no">
                      {tour.notIncluded.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'bring' && (
              <div className="tab-panel is-active">
                <h3>¿Qué llevar?</h3>
                <p>Recomendaciones para disfrutar el tour con total comodidad.</p>
                <div className="what-to-bring">
                  {tour.whatToBring.map((item) => (
                    <details className="bring-item" key={item.title}>
                      <summary>
                        <span className="bring-emoji" aria-hidden="true">
                          {item.emoji}
                        </span>
                        <span className="bring-title">{item.title}</span>
                        <span className="bring-chevron">+</span>
                      </summary>
                      <div className="bring-detail">{item.detail}</div>
                    </details>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'info' && (
              <div className="tab-panel is-active">
                <h3>Información importante</h3>
                <p>Antes de reservar, leé estos detalles para que tu experiencia sea perfecta.</p>
                <h4 style={{ marginTop: 20 }}>Política de cancelación</h4>
                <p>{tour.info.cancellation}</p>
                <h4 style={{ marginTop: 20 }}>Altitud y salud</h4>
                <p>{tour.info.health}</p>
                <h4 style={{ marginTop: 20 }}>Grupo y transporte</h4>
                <p>{tour.info.transport}</p>
                <h4 style={{ marginTop: 20 }}>Punto de encuentro</h4>
                <p>{tour.info.meeting}</p>
              </div>
            )}

            <div className="might-like">
              <div className="flex-between" style={{ marginBottom: 24 }}>
                <h3 style={{ margin: 0 }}>También te puede interesar</h3>
                <Link className="btn btn--ghost btn--sm" href="/tours">
                  Ver todos los tours →
                </Link>
              </div>
              <div className="featured-grid">
                {mightLike.map((t) => (
                  <TourCard key={t.slug} tour={t} />
                ))}
              </div>
            </div>
          </div>

          <aside className="detail-aside">
            <div className="booking-card booking-card--v2">
              <div className="booking-card__head">
                <h3 className="booking-card__title">Reservá tu aventura</h3>
                <div className="booking-card__guarantee">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M9 12l2 2 4-4" />
                    <path d="M21 12c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  </svg>
                  <span>Best Price Guarantee</span>
                </div>
              </div>

              <div className="booking-card__price-box">
                <span className="booking-card__from">Desde</span>
                <strong className="booking-card__price">US$ {tour.price}</strong>
                <span className="booking-card__per">por persona</span>
              </div>

              <p className="booking-card__availability">
                <span className="dot"></span> Disponibilidad limitada
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (date) setModalOpen(true);
                }}
              >
                <div className="booking-card__field">
                  <label>Fecha</label>
                  {availability === null ? (
                    <input type="date" disabled value={date} onChange={(e) => setDate(e.target.value)} />
                  ) : availability.length === 0 ? (
                    <input type="date" disabled value={date} onChange={(e) => setDate(e.target.value)} />
                  ) : (
                    <select
                      className="select"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                    >
                      <option value="" disabled>
                        Elegí una fecha…
                      </option>
                      {availability.map((d) => (
                        <option key={d.id} value={d.free > 0 ? d.date : ''} disabled={d.free <= 0}>
                          {new Date(`${d.date}T12:00:00`).toLocaleDateString('es-ES', {
                            weekday: 'short',
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                          {d.free > 0 ? ` · ${d.free} cupo${d.free > 1 ? 's' : ''} libre${d.free > 1 ? 's' : ''}` : ' · Agotado'}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {availability !== null && availability.length === 0 && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--ink-500)', margin: '8px 0 12px' }}>
                    No hay fechas abiertas por el momento. Consultanos por WhatsApp.
                  </p>
                )}

                <button
                  className="btn--v2-check"
                  type="submit"
                  disabled={availability !== null && availability.length === 0}
                >
                  Ver disponibilidad
                </button>
              </form>

              <div className="booking-card__divider"></div>

              <ul className="booking-card__perks">
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                  Cancelación gratis hasta 48h antes
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  Confirmación instantánea
                </li>
                <li>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  Operador local 100% boliviano
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </section>

      <AvailabilityModal
        open={modalOpen}
        tour={tour}
        tourType={tourType}
        pax={pax}
        extraIds={extraIds}
        total={total}
        onClose={() => setModalOpen(false)}
        onTourTypeChange={setTourType}
        onPaxChange={setPax}
        onToggleExtra={toggleExtra}
        onAddToCart={handleAddToCart}
      />
    </>
  );
}
