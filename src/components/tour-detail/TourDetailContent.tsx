'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import Icon from '@/components/ui/Icon';
import TourCard from '@/components/ui/TourCard';
import AvailabilityModal from '@/components/tour-detail/AvailabilityModal';
import { calcAvailabilityTotal, GROUP_DISCOUNT_MAX_PAX } from '@/lib/pricing';
import { useBooking } from '@/context/BookingContext';
import { fetchTourAvailability } from '@/lib/api';
import type { TourDateFree } from '@/lib/api';
import { getSupabase } from '@/lib/supabase';
import { reviews as staticReviews } from '@/data/reviews';
import type { Tour, TourType } from '@/lib/types';

function fmtRating(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export default function TourDetailContent({ tour, mightLike }: { tour: Tour; mightLike: Tour[] }) {
  const router = useRouter();
  const { setSelection } = useBooking();
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [date, setDate] = useState('');
  const [tourType, setTourType] = useState<TourType>('group');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [startTime, setStartTime] = useState('');
  const [extraIds, setExtraIds] = useState<string[]>([]);
  const [availability, setAvailability] = useState<TourDateFree[] | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [allReviews, setAllReviews] = useState(false);
  const asideRef = useRef<HTMLElement>(null);

  const pax = adults + children;
  const gallery = tour.gallery.length > 0 ? tour.gallery : [tour.image];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightbox !== null) setLightbox(null);
        else setModalOpen(false);
      }
      if (lightbox !== null && e.key === 'ArrowRight') setLightbox((lightbox + 1) % gallery.length);
      if (lightbox !== null && e.key === 'ArrowLeft')
        setLightbox((lightbox - 1 + gallery.length) % gallery.length);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    document.body.style.overflow = lightbox !== null ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [lightbox]);

  useEffect(() => {
    setModalOpen(false);
    setLightbox(null);
    setDate('');
    setAdults(2);
    setChildren(0);
    setStartTime(tour.defaultStartTimes?.[0] ?? '');
    setSaved(false);
    setAllReviews(false);
  }, [tour.slug, tour.defaultStartTimes]);

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

  const offerPct = tour.offerPct ?? 0;
  const hasOffer = offerPct > 0;
  const finalPrice = hasOffer ? Math.round(tour.price * (1 - offerPct / 100)) : tour.price;
  const rating = typeof tour.rating === 'number' ? tour.rating : null;
  const reviewCount =
    typeof tour.reviewCount === 'number' && tour.reviewCount > 0 ? tour.reviewCount : null;
  const languages = (tour.languages ?? []).filter(Boolean);
  const freeCancelHours = tour.freeCancellationHours ?? 0;
  const startTimes = (tour.defaultStartTimes ?? []).filter(Boolean);
  const mosaicThumbs = gallery.slice(1, 5);
  const extraPhotos = gallery.length - 5;
  const hasMap = typeof tour.meetingLat === 'number' && typeof tour.meetingLng === 'number';
  const mapSrc = hasMap
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${tour.meetingLng! - 0.01},${tour.meetingLat! - 0.008},${tour.meetingLng! + 0.01},${tour.meetingLat! + 0.008}&layer=mapnik&marker=${tour.meetingLat},${tour.meetingLng}`
    : '';
  const staticAvg = staticReviews.reduce((s, r) => s + r.stars, 0) / staticReviews.length;
  const summaryRating = rating ?? staticAvg;
  const summaryCount = reviewCount ?? staticReviews.length;
  const shownReviews = allReviews ? staticReviews : staticReviews.slice(0, 4);

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

  const handlePaxFromModal = (n: number) => {
    const c = Math.min(children, Math.max(0, n - 1));
    setChildren(c);
    setAdults(n - c);
  };

  const openAvailability = () => {
    if (date) setModalOpen(true);
    else asideRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: tour.title, url });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
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
          <div className="detail-header__row">
            <h1>{tour.title}</h1>
            <div className="detail-header__actions">
              <button className="detail-action" onClick={handleShare}>
                <Icon name="share" size={16} /> {copied ? 'Enlace copiado' : 'Compartir'}
              </button>
              <button
                className={`detail-action${saved ? ' is-saved' : ''}`}
                aria-pressed={saved}
                onClick={() => setSaved((s) => !s)}
              >
                <Icon name="heart" size={16} /> {saved ? 'Guardado' : 'Guardar'}
              </button>
            </div>
          </div>
          <div className="detail-meta">
            {rating !== null && (
              <span className="rating-inline">
                <Icon name="star-solid" size={15} />
                <strong>{fmtRating(rating)}</strong>
                {reviewCount !== null && <span>({reviewCount.toLocaleString('es-ES')} reseñas)</span>}
              </span>
            )}
            <span>
              <Icon name="pin" size={15} /> {tour.destination}
            </span>
            {freeCancelHours > 0 && <span className="badge-soft">Cancelación gratis</span>}
          </div>
        </div>
      </section>

      <section className="container">
        <div className={`mosaic${gallery.length < 5 ? ' mosaic--simple' : ''}`}>
          <button
            className="mosaic__main"
            onClick={() => setLightbox(0)}
            aria-label="Ver foto 1 en grande"
          >
            <img src={gallery[0]} alt={tour.title} />
          </button>
          {mosaicThumbs.map((img, i) => (
            <button
              key={img}
              className="mosaic__thumb"
              onClick={() => setLightbox(i + 1)}
              aria-label={`Ver foto ${i + 2} en grande`}
            >
              <img src={img} alt={`${tour.title} — foto ${i + 2}`} loading="lazy" />
              {i === mosaicThumbs.length - 1 && extraPhotos > 0 && (
                <span className="mosaic__more">+{extraPhotos} fotos</span>
              )}
            </button>
          ))}
        </div>

        <div className="detail-layout">
          <div className="detail-main">
            <div className="detail-section">
              <h2>Sobre esta actividad</h2>
              <div className="about-rows">
                <div className="about-row">
                  <Icon name="clock" size={20} />
                  <div>
                    <span className="about-row__label">Duración</span>
                    <span className="about-row__value">{tour.duration}</span>
                  </div>
                </div>
                <div className="about-row">
                  <Icon name="calendar" size={20} />
                  <div>
                    <span className="about-row__label">Inicio / Fin</span>
                    <span className="about-row__value">{tour.startEnd}</span>
                  </div>
                </div>
                {languages.length > 0 && (
                  <div className="about-row">
                    <Icon name="globe" size={20} />
                    <div>
                      <span className="about-row__label">Idiomas</span>
                      <span className="about-row__value">{languages.join(', ')}</span>
                    </div>
                  </div>
                )}
                {tour.pickupIncluded && (
                  <div className="about-row">
                    <Icon name="pin" size={20} />
                    <div>
                      <span className="about-row__label">Recogida</span>
                      <span className="about-row__value">Incluida en el hotel</span>
                    </div>
                  </div>
                )}
                {freeCancelHours > 0 && (
                  <div className="about-row">
                    <Icon name="rotate-ccw" size={20} />
                    <div>
                      <span className="about-row__label">Cancelación</span>
                      <span className="about-row__value">Gratis hasta {freeCancelHours} h antes</span>
                    </div>
                  </div>
                )}
                {tour.payLater && (
                  <div className="about-row">
                    <Icon name="shield-check" size={20} />
                    <div>
                      <span className="about-row__label">Pago</span>
                      <span className="about-row__value">Reserva ahora y paga después</span>
                    </div>
                  </div>
                )}
                <div className="about-row">
                  <Icon name="users" size={20} />
                  <div>
                    <span className="about-row__label">Grupo</span>
                    <span className="about-row__value">
                      {tour.minPax ? `Desde ${tour.minPax} personas` : tour.typeLabel}
                    </span>
                  </div>
                </div>
                <div className="about-row">
                  <Icon name="compass" size={20} />
                  <div>
                    <span className="about-row__label">Actividad</span>
                    <span className="about-row__value">{tour.activityLabel}</span>
                  </div>
                </div>
                <div className="about-row">
                  <Icon name="altitude" size={20} />
                  <div>
                    <span className="about-row__label">Altitud máx.</span>
                    <span className="about-row__value">{tour.maxAltitude}</span>
                  </div>
                </div>
                <div className="about-row">
                  <Icon name="sun" size={20} />
                  <div>
                    <span className="about-row__label">Mejor temporada</span>
                    <span className="about-row__value">{tour.bestSeason}</span>
                  </div>
                </div>
              </div>
              <div className="tour-summary">
                {tour.summary.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>

            <div className="detail-section">
              <h2>Highlights</h2>
              <ul className="highlights-list">
                {tour.highlights.map((h) => (
                  <li key={h}>
                    <Icon name="check-circle" size={18} /> {h}
                  </li>
                ))}
              </ul>
            </div>

            <div className="detail-section">
              <h2>Itinerario día a día</h2>
              <ol className="itinerary timeline">
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
                                <span key={m}>
                                  <Icon name="meal" size={14} /> {m}
                                </span>
                              ))}
                              {day.stay && (
                                <span>
                                  <Icon name="bed" size={14} /> {day.stay}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="itinerary__chevron">
                            <Icon name="chevron-down" size={20} />
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

            <div className="detail-section">
              <h2>¿Qué incluye y qué no?</h2>
              <div className="included-grid">
                <div>
                  <h4 className="included-head included-head--yes">
                    <Icon name="check-circle" size={20} /> Incluido
                  </h4>
                  <ul className="included-list included-list--yes">
                    {tour.included.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="included-head included-head--no">
                    <Icon name="x-circle" size={20} /> No incluido
                  </h4>
                  <ul className="included-list included-list--no">
                    {tour.notIncluded.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h2>¿Qué llevar?</h2>
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

            <div className="detail-section">
              <h2>Punto de encuentro</h2>
              <p className="detail-section__lead">{tour.meetingPoint ?? tour.info.meeting}</p>
              {hasMap && (
                <iframe
                  className="meeting-map"
                  src={mapSrc}
                  title={`Mapa del punto de encuentro: ${tour.meetingPoint ?? tour.title}`}
                  loading="lazy"
                />
              )}
            </div>

            <div className="detail-section">
              <h2>Información importante</h2>
              <div className="info-blocks">
                <div>
                  <h4>Política de cancelación</h4>
                  <p>{tour.info.cancellation}</p>
                </div>
                <div>
                  <h4>Altitud y salud</h4>
                  <p>{tour.info.health}</p>
                </div>
                <div>
                  <h4>Grupo y transporte</h4>
                  <p>{tour.info.transport}</p>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h2>Reseñas de viajeros</h2>
              <div className="review-summary">
                <div>
                  <div className="review-summary__num">{fmtRating(summaryRating)}</div>
                  <div className="review-summary__stars">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Icon key={i} name="star-solid" size={16} />
                    ))}
                  </div>
                  <p className="review-summary__count">
                    {summaryCount.toLocaleString('es-ES')} reseñas
                  </p>
                </div>
                <div className="review-summary__breakdown">
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const n = staticReviews.filter((r) => r.stars === stars).length;
                    const pct = Math.round((n / staticReviews.length) * 100);
                    return (
                      <div className="review-bar" key={stars}>
                        <span className="review-bar__label">{stars}★</span>
                        <span className="review-bar__track">
                          <span className="review-bar__fill" style={{ width: `${pct}%` }} />
                        </span>
                        <span>{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="review-cards">
                {shownReviews.map((r) => (
                  <article className="review-card" key={r.name + r.date}>
                    <div className="review-card__head">
                      <img src={r.avatar} alt="" loading="lazy" />
                      <div>
                        <strong>{r.name}</strong>
                        <span>{r.date}</span>
                      </div>
                    </div>
                    <div className="review-card__stars">
                      {Array.from({ length: r.stars }, (_, i) => (
                        <Icon key={i} name="star-solid" size={13} />
                      ))}
                    </div>
                    <h4>{r.title}</h4>
                    <p>{r.text}</p>
                  </article>
                ))}
              </div>
              {staticReviews.length > 4 && (
                <button className="btn btn--ghost btn--sm" onClick={() => setAllReviews((v) => !v)}>
                  {allReviews ? 'Ver menos reseñas' : `Ver las ${staticReviews.length} reseñas`}
                </button>
              )}
            </div>

            <div className="might-like">
              <div className="flex-between" style={{ marginBottom: 24 }}>
                <h3 style={{ margin: 0 }}>También te puede interesar</h3>
                <Link className="btn btn--ghost btn--sm" href="/tours">
                  Ver todos los tours <Icon name="arrow-right" size={16} />
                </Link>
              </div>
              <div className="featured-grid">
                {mightLike.map((t) => (
                  <TourCard key={t.slug} tour={t} />
                ))}
              </div>
            </div>
          </div>

          <aside className="detail-aside" ref={asideRef}>
            <div className="booking-card booking-card--v2">
              <div className="booking-card__head">
                <h3 className="booking-card__title">Reservá tu aventura</h3>
                <div className="booking-card__guarantee">
                  <Icon name="shield-check" size={15} />
                  <span>Best Price Guarantee</span>
                </div>
              </div>

              <div className="booking-card__price-box">
                <span className="booking-card__from">Desde</span>
                <strong className="booking-card__price">US$ {finalPrice}</strong>
                {hasOffer && <s className="booking-card__was">US$ {tour.price}</s>}
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
                <div className="booking-card__row">
                  <div className="booking-card__field">
                    <label>Adultos</label>
                    <div className="stepper">
                      <button
                        type="button"
                        disabled={adults <= 1}
                        onClick={() => setAdults((a) => a - 1)}
                        aria-label="Restar adulto"
                      >
                        <Icon name="minus" size={15} />
                      </button>
                      <span>{adults}</span>
                      <button
                        type="button"
                        disabled={pax >= GROUP_DISCOUNT_MAX_PAX}
                        onClick={() => setAdults((a) => a + 1)}
                        aria-label="Sumar adulto"
                      >
                        <Icon name="plus" size={15} />
                      </button>
                    </div>
                  </div>
                  <div className="booking-card__field">
                    <label>Niños{tour.childAgeMax ? ` · hasta ${tour.childAgeMax} años` : ''}</label>
                    <div className="stepper">
                      <button
                        type="button"
                        disabled={children <= 0}
                        onClick={() => setChildren((c) => c - 1)}
                        aria-label="Restar niño"
                      >
                        <Icon name="minus" size={15} />
                      </button>
                      <span>{children}</span>
                      <button
                        type="button"
                        disabled={pax >= GROUP_DISCOUNT_MAX_PAX}
                        onClick={() => setChildren((c) => c + 1)}
                        aria-label="Sumar niño"
                      >
                        <Icon name="plus" size={15} />
                      </button>
                    </div>
                  </div>
                </div>

                {tour.priceChild != null && children > 0 && (
                  <p className="booking-card__note">Tarifa niños: US$ {tour.priceChild} por persona.</p>
                )}

                <div className="booking-card__field">
                  <label>Fecha</label>
                  {availability === null || availability.length === 0 ? (
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

                {startTimes.length > 0 && (
                  <div className="booking-card__field">
                    <label>Horario de salida</label>
                    <select
                      className="select"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    >
                      {startTimes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
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
                  <Icon name="rotate-ccw" size={17} />
                  {freeCancelHours > 0
                    ? `Cancelación gratis hasta ${freeCancelHours}h antes`
                    : 'Cancelación gratis hasta 48h antes'}
                </li>
                <li>
                  <Icon name="check-circle" size={17} />
                  Confirmación instantánea
                </li>
                <li>
                  <Icon name="pin" size={17} />
                  Operador local 100% boliviano
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </section>

      <div className="detail-bar">
        <div className="detail-bar__price">
          <small>Desde</small>
          <strong>US$ {finalPrice}</strong>
          <span>por persona</span>
        </div>
        <button
          className="btn--v2-check detail-bar__cta"
          type="button"
          disabled={availability !== null && availability.length === 0}
          onClick={openAvailability}
        >
          Ver disponibilidad
        </button>
      </div>

      {lightbox !== null && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label="Galería de fotos">
          <div className="lightbox__scrim" onClick={() => setLightbox(null)} />
          <img
            className="lightbox__img"
            src={gallery[lightbox]}
            alt={`${tour.title} — foto ${lightbox + 1}`}
          />
          <button
            className="lightbox__close"
            aria-label="Cerrar galería"
            onClick={() => setLightbox(null)}
          >
            <Icon name="close" size={22} />
          </button>
          <button
            className="lightbox__nav lightbox__nav--prev"
            aria-label="Anterior"
            onClick={() => setLightbox((lightbox - 1 + gallery.length) % gallery.length)}
          >
            <Icon name="chevron-left" size={22} />
          </button>
          <button
            className="lightbox__nav lightbox__nav--next"
            aria-label="Siguiente"
            onClick={() => setLightbox((lightbox + 1) % gallery.length)}
          >
            <Icon name="chevron-right" size={22} />
          </button>
          <span className="lightbox__count">
            {lightbox + 1} / {gallery.length}
          </span>
        </div>
      )}

      <AvailabilityModal
        open={modalOpen}
        tour={tour}
        tourType={tourType}
        pax={pax}
        extraIds={extraIds}
        total={total}
        onClose={() => setModalOpen(false)}
        onTourTypeChange={setTourType}
        onPaxChange={handlePaxFromModal}
        onToggleExtra={toggleExtra}
        onAddToCart={handleAddToCart}
      />
    </>
  );
}
