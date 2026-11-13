'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import Icon, { type IconName } from '@/components/ui/Icon';
import TourCard from '@/components/ui/TourCard';
import AvailabilityCalendar from '@/components/tour-detail/AvailabilityCalendar';
import { ReviewCard, Stars } from '@/components/reviews/ReviewCards';
import { GROUP_DISCOUNT_MAX_PAX, money, tiersFor } from '@/lib/pricing';
import { useBooking } from '@/context/BookingContext';
import { useFavorites } from '@/context/FavoritesContext';
import { useSite } from '@/context/SiteContext';
import {
  clientTotals,
  fetchTourAvailability,
  offerAppliesToSelection,
  reviewStats,
  tourThumb,
  type ReviewRow,
  type TourDateFree,
} from '@/lib/api';
import { getSupabase } from '@/lib/supabase';
import { cancellationShort, whatsappUrl } from '@/lib/site';
import {
  bringIcon,
  DIFFICULTY_LABEL,
  DIFFICULTY_LEVEL,
  fmtDate,
  fmtTime,
  groupByHead,
  includeIcon,
  plural,
  serviceKind,
  SERVICE_LABEL,
  TYPE_HINT,
  TYPE_LABEL,
  TYPE_SHORT,
} from '@/lib/tour-display';
import { track } from '@/lib/analytics';
import type { Tour, TourType } from '@/lib/types';
import '@/styles/tour-detail-v3.css';

interface Props {
  tour: Tour;
  mightLike: Tour[];
  reviews: ReviewRow[];
  testimonials: ReviewRow[];
}

function fmtRating(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export default function TourDetailContent({ tour, mightLike, reviews, testimonials }: Props) {
  const router = useRouter();
  const { setSelection, selection, hydrated } = useBooking();
  const { has, toggle, hydrated: favHydrated } = useFavorites();
  const { company } = useSite();

  const types = tour.availableTypes;
  const minPax = Math.max(1, tour.minPax ?? 1);

  const [lightbox, setLightbox] = useState<number | null>(null);
  const [date, setDate] = useState('');
  const [tourType, setTourType] = useState<TourType>(types[0] ?? 'group');
  const [adults, setAdults] = useState(Math.max(2, minPax));
  const [children, setChildren] = useState(0);
  const [startTime, setStartTime] = useState('');
  const [tourDateId, setTourDateId] = useState<string | null>(null);
  const [extraIds, setExtraIds] = useState<string[]>([]);
  const [availability, setAvailability] = useState<TourDateFree[] | null>(null);
  const [calOpen, setCalOpen] = useState(false);
  const [needDate, setNeedDate] = useState(false);
  const [copied, setCopied] = useState(false);
  const [allReviews, setAllReviews] = useState(false);
  const [openDays, setOpenDays] = useState<number[]>(() =>
    tour.itinerary.length <= 3 ? tour.itinerary.map((d) => d.day) : [tour.itinerary[0]?.day ?? 1],
  );
  const asideRef = useRef<HTMLElement>(null);
  const restoredRef = useRef<string | null>(null);

  const pax = adults + children;
  const gallery = useMemo(() => {
    const list = tour.gallery.length > 0 ? tour.gallery : [tour.image];
    return [...new Set(list)];
  }, [tour.gallery, tour.image]);
  const saved = favHydrated && has(tour.slug);

  /* ---------- Teclado y bloqueo de scroll de la galería ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightbox !== null) setLightbox(null);
        else setCalOpen(false);
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

  /* ---------- Restaura la selección guardada del mismo tour ---------- */
  useEffect(() => {
    if (!hydrated) return;
    if (restoredRef.current === tour.slug) return;
    restoredRef.current = tour.slug;
    const prev = selection && selection.tourSlug === tour.slug ? selection : null;
    const prevType = prev?.tourType && types.includes(prev.tourType) ? prev.tourType : (types[0] ?? 'group');
    const c = prev?.children ?? 0;
    const a = prev?.adults ?? Math.max(2, minPax);
    setTourType(prevType);
    setChildren(c);
    setAdults(Math.max(a, Math.max(1, minPax - c)));
    setExtraIds(prev?.extras ?? []);
    setDate(prev?.date ?? '');
    setTourDateId(prev?.tourDateId ?? null);
    setStartTime(prev?.startTime ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, tour.slug]);

  /* ---------- Disponibilidad real ---------- */
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

  const slotsByDate = useMemo(() => {
    const m = new Map<string, TourDateFree[]>();
    for (const s of availability ?? []) {
      if (s.bookable === false || s.blocked || s.free <= 0) continue;
      const arr = m.get(s.date) ?? [];
      arr.push(s);
      m.set(s.date, arr);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => (a.start_time ?? '').localeCompare(b.start_time ?? ''));
    }
    return m;
  }, [availability]);

  const calendarDays = useMemo(
    () =>
      [...slotsByDate.entries()]
        .map(([d, slots]) => ({ date: d, free: Math.max(...slots.map((s) => s.free)) }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [slotsByDate],
  );

  const loadingDates = availability === null;
  const hasDates = calendarDays.length > 0;
  const nextDate = calendarDays.find((d) => d.free >= pax)?.date ?? null;
  const selectedSlots = date ? (slotsByDate.get(date) ?? []) : [];
  const bookableSlots = selectedSlots.filter((s) => s.free >= pax);
  const currentSlot = selectedSlots.find((s) => s.id === tourDateId) ?? null;

  // Mantiene la franja válida ante cambios de fecha o de viajeros.
  useEffect(() => {
    if (availability === null) return;
    if (!date) {
      setTourDateId(null);
      return;
    }
    const slots = slotsByDate.get(date) ?? [];
    const current = slots.find((s) => s.id === tourDateId);
    if (current && current.free >= pax) return;
    const pick = slots.find((s) => s.free >= pax) ?? null;
    setTourDateId(pick?.id ?? null);
    setStartTime(pick?.start_time ? fmtTime(pick.start_time) : '');
  }, [availability, date, pax, slotsByDate, tourDateId]);

  const pickDate = (d: string) => {
    setDate(d);
    setNeedDate(false);
    const pick = (slotsByDate.get(d) ?? []).find((s) => s.free >= pax) ?? null;
    setTourDateId(pick?.id ?? null);
    setStartTime(pick?.start_time ? fmtTime(pick.start_time) : '');
    setCalOpen(false);
  };

  /* ---------- Oferta y totales (mismo cálculo que la base) ---------- */
  const applicableOffer = useMemo(() => {
    const o = tour.offer;
    if (!o || !date || !currentSlot) return null;
    return offerAppliesToSelection(o, {
      tourId: tour.id,
      date,
      startTime: currentSlot.start_time ?? null,
      pax,
    })
      ? o
      : null;
  }, [tour.offer, tour.id, date, currentSlot, pax]);
  const offerPct = applicableOffer?.discount_pct ?? 0;

  const totals = useMemo(
    () => clientTotals(tour, tourType, pax, extraIds, 0, offerPct, children),
    [tour, tourType, pax, extraIds, offerPct, children],
  );
  const tiers = tiersFor(tour, tourType);
  const activeTier = [...tiers].reverse().find((t) => t.min <= pax) ?? null;
  const headlinePrice = date ? totals.perPerson : tour.price;
  const hasPrice = tour.price > 0 && types.length > 0;

  /* ---------- Datos derivados de contenido ---------- */
  const rating = typeof tour.rating === 'number' && tour.rating > 0 ? tour.rating : null;
  const stats = reviewStats(reviews);
  const shownReviews = allReviews ? reviews : reviews.slice(0, 4);
  const languages = (tour.languages ?? []).filter(Boolean);
  const cancel = cancellationShort(tour.freeCancellationHours ?? 0);
  const kind = serviceKind(tour);
  const included = groupByHead(tour.included ?? []);
  const meeting = (tour.meetingPoint || tour.info?.meeting || '').trim();
  const hasMap = typeof tour.meetingLat === 'number' && typeof tour.meetingLng === 'number';
  const mapSrc = hasMap
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${tour.meetingLng! - 0.01},${tour.meetingLat! - 0.008},${tour.meetingLng! + 0.01},${tour.meetingLat! + 0.008}&layer=mapnik&marker=${tour.meetingLat},${tour.meetingLng}`
    : '';
  const wa = whatsappUrl(
    company,
    `Hola, quisiera consultar fechas para "${tour.title}" (${plural(pax, 'persona', 'personas')}).`,
  );

  const facts: { icon: IconName; label: string; value: string; level?: 1 | 2 | 3 }[] = [
    { icon: 'clock', label: 'Duración', value: tour.duration },
    ...(tour.departures ? [{ icon: 'calendar' as IconName, label: 'Salidas', value: tour.departures }] : []),
    ...(tour.startEnd ? [{ icon: 'route' as IconName, label: 'Inicio y fin', value: tour.startEnd }] : []),
    {
      icon: 'gauge',
      label: 'Exigencia física',
      value: DIFFICULTY_LABEL[tour.difficulty] ?? tour.difficulty,
      level: DIFFICULTY_LEVEL[tour.difficulty],
    },
    ...(languages.length > 0 ? [{ icon: 'globe' as IconName, label: 'Guía en', value: languages.join(' · ') }] : []),
    {
      icon: 'group',
      label: 'Viajeros',
      value: minPax > 1 ? `Desde ${minPax} personas` : `Hasta ${GROUP_DISCOUNT_MAX_PAX} por reserva`,
    },
    ...(tour.maxAltitude ? [{ icon: 'altitude' as IconName, label: 'Altitud máxima', value: tour.maxAltitude }] : []),
    ...(tour.bestSeason ? [{ icon: 'sun' as IconName, label: 'Mejor temporada', value: tour.bestSeason }] : []),
  ];

  /* ---------- Acciones ---------- */
  const changeAdults = (n: number) => setAdults(Math.max(1, Math.min(GROUP_DISCOUNT_MAX_PAX - children, n)));
  const changeChildren = (n: number) => setChildren(Math.max(0, Math.min(GROUP_DISCOUNT_MAX_PAX - adults, n)));
  const belowMin = pax < minPax;

  const handleReserve = () => {
    if (!date || !tourDateId) {
      setNeedDate(true);
      setCalOpen(true);
      asideRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (belowMin) return;
    setSelection({
      tourSlug: tour.slug,
      tourType,
      date,
      pax,
      extras: extraIds,
      perPerson: totals.perPerson,
      extrasTotal: totals.extrasTotal,
      subtotal: totals.subtotal,
      tourDateId,
      offerId: applicableOffer?.id ?? null,
      offerPct,
      adults,
      children,
      startTime: startTime || null,
    });
    track('booking_started', { tour: tour.slug, pax, total: totals.total });
    router.push(`/booking?slug=${encodeURIComponent(tour.slug)}`);
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: tour.title, url });
        return;
      } catch {
        // el usuario cerró el diálogo: se intenta copiar el enlace
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // portapapeles no disponible
    }
  };

  const toggleDay = (day: number) =>
    setOpenDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));

  const galleryCount = Math.min(gallery.length, 5);

  return (
    <div className="td">
      {/* ================= Encabezado ================= */}
      <header className="td-head">
        <div className="container">
          <Breadcrumbs
            light
            items={[{ label: 'Inicio', href: '/' }, { label: 'Tours', href: '/tours' }, { label: tour.title }]}
          />
          <div className="td-head__pills ht-pills">
            {kind && (
              <span className={`ht-pill ht-pill--${kind}`}>
                <Icon name={kind === 'private' ? 'flag' : 'group'} size={15} /> {SERVICE_LABEL[kind]}
              </span>
            )}
            {tour.activityLabel && (
              <span className="ht-pill">
                <Icon name="hiker" size={15} /> {tour.activityLabel}
              </span>
            )}
            <span className="ht-pill">
              <Icon name="clock" size={15} /> {tour.duration}
            </span>
          </div>
          <div className="td-head__row">
            <h1>{tour.title}</h1>
            <div className="td-head__actions">
              <button type="button" className="td-action" onClick={handleShare}>
                <Icon name={copied ? 'check' : 'share'} size={16} /> {copied ? 'Enlace copiado' : 'Compartir'}
              </button>
              <button
                type="button"
                className={`td-action${saved ? ' is-on' : ''}`}
                aria-pressed={saved}
                onClick={() => toggle(tour.slug)}
              >
                <Icon name="heart" size={16} /> {saved ? 'Guardado' : 'Guardar'}
              </button>
            </div>
          </div>
          <div className="td-head__meta">
            {rating !== null && (
              <a className="td-head__rating" href="#resenas">
                <Icon name="star-solid" size={16} />
                <strong>{fmtRating(rating)}</strong>
                <span>
                  ({plural(stats.count || (tour.reviewCount ?? 0), 'reseña', 'reseñas')})
                </span>
              </a>
            )}
            <span>
              <Icon name="pin" size={16} /> {tour.destination}
            </span>
            {tour.code && <span className="td-head__code">Cód. {tour.code}</span>}
          </div>
        </div>
      </header>

      {/* ================= Galería ================= */}
      <section className="container">
        <div className={`td-gallery td-gallery--${galleryCount}`}>
          {gallery.slice(0, 5).map((img, i) => (
            <button
              key={img}
              type="button"
              className="td-gallery__item"
              onClick={() => setLightbox(i)}
              aria-label={`Ver foto ${i + 1} de ${gallery.length} en grande`}
            >
              <img
                src={i === 0 ? img : tourThumb(img)}
                alt={i === 0 ? tour.title : ''}
                loading={i === 0 ? 'eager' : 'lazy'}
                fetchPriority={i === 0 ? 'high' : 'auto'}
              />
            </button>
          ))}
          {gallery.length > 1 && (
            <button type="button" className="td-gallery__all" onClick={() => setLightbox(0)}>
              <Icon name="camera" size={16} /> Ver las {gallery.length} fotos
            </button>
          )}
        </div>
      </section>

      <section className="container td-layout">
        <div className="td-main">
          {/* ---------- Datos rápidos ---------- */}
          <ul className="td-facts" aria-label="Datos del tour">
            {facts.map((f) => (
              <li key={f.label} className="td-fact">
                <span className="td-fact__icon">
                  <Icon name={f.icon} size={20} />
                </span>
                <span className="td-fact__text">
                  <small>{f.label}</small>
                  <strong>{f.value}</strong>
                  {f.level && (
                    <span className={`td-level td-level--${f.level}`} aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>

          {/* ---------- La experiencia ---------- */}
          <section className="td-section">
            <h2 className="ht-bar">
              <Icon name="sparkle" size={19} /> La experiencia
            </h2>
            <div className="td-lead">
              {tour.summary.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            {tour.highlights.length > 0 && (
              <ul className="td-highlights">
                {tour.highlights.map((h) => (
                  <li key={h}>
                    <Icon name="check-circle" size={19} />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* ---------- Itinerario ---------- */}
          {tour.itinerary.length > 0 && (
            <section className="td-section">
              <h2 className="ht-bar">
                <Icon name="route" size={19} /> Itinerario
              </h2>
              <ol className="td-days">
                {tour.itinerary.map((day) => {
                  const open = openDays.includes(day.day);
                  return (
                    <li key={day.day} className={`td-day${open ? ' is-open' : ''}`}>
                      <button
                        type="button"
                        className="td-day__head"
                        aria-expanded={open}
                        onClick={() => toggleDay(day.day)}
                      >
                        <span className="td-day__badge">
                          Día <b>{day.day}</b>
                        </span>
                        <span className="td-day__title">{day.title}</span>
                        <Icon name="chevron-down" size={20} className="td-day__chev" />
                      </button>
                      {open && (
                        <div className="td-day__body">
                          <p>{day.description}</p>
                          {day.activities.length > 0 && (
                            <ul className="td-day__stops">
                              {day.activities.map((a) => (
                                <li key={a}>{a}</li>
                              ))}
                            </ul>
                          )}
                          {(day.meals.length > 0 || day.stay) && (
                            <div className="td-day__chips">
                              {day.meals.map((m) => (
                                <span key={m} className="td-chip">
                                  <Icon name="meal" size={14} /> {m}
                                </span>
                              ))}
                              {day.stay && (
                                <span className="td-chip td-chip--stay">
                                  <Icon name="bed" size={14} /> {day.stay}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          {/* ---------- Incluye / no incluye ---------- */}
          {(included.length > 0 || tour.notIncluded.length > 0) && (
            <section className="td-section">
              <h2 className="ht-bar">
                <Icon name="clipboard" size={19} /> Incluye / no incluye
              </h2>
              <div className="td-incl">
                <div className="td-incl__col">
                  {included.map((g, i) => (
                    <div key={`${g.head ?? 'x'}-${i}`} className="td-incl__group">
                      <span className="td-incl__mark td-incl__mark--yes">
                        <Icon name="check" size={14} strokeWidth={2.6} />
                      </span>
                      <div>
                        {g.head ? (
                          <>
                            <strong className="td-incl__head">
                              <Icon name={includeIcon(g.head)} size={15} /> {g.head}
                            </strong>
                            <ul>
                              {g.items.map((it) => (
                                <li key={it}>{it}</li>
                              ))}
                            </ul>
                          </>
                        ) : (
                          <span className="td-incl__single">{g.items[0]}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {tour.notIncluded.length > 0 && (
                  <div className="td-incl__col td-incl__col--no">
                    <strong className="td-incl__no-title">No incluye</strong>
                    {tour.notIncluded.map((item) => (
                      <div key={item} className="td-incl__group">
                        <span className="td-incl__mark td-incl__mark--no">
                          <Icon name="close" size={13} strokeWidth={2.6} />
                        </span>
                        <span className="td-incl__single">{item}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ---------- Precio por persona ---------- */}
          {hasPrice && (
            <section className="td-section" id="precios">
              <h2 className="ht-bar">
                <Icon name="tag" size={19} /> Precio por persona
              </h2>
              {types.map((t) => {
                const list = tiersFor(tour, t);
                return (
                  <div key={t} className="td-prices">
                    <div className="td-prices__service">
                      <strong>{TYPE_LABEL[t]}</strong>
                      <span>{TYPE_HINT[t]}</span>
                    </div>
                    {list.length > 0 ? (
                      <div className="td-prices__table" role="table" aria-label={`Precios de ${TYPE_LABEL[t]}`}>
                        <div className="td-prices__row td-prices__row--head" role="row">
                          <span role="columnheader">Viajeros</span>
                          <span role="columnheader">Precio por persona</span>
                        </div>
                        {list.map((tier, i) => {
                          const next = list[i + 1];
                          const label =
                            !next ? `${tier.min}+ personas` : next.min - tier.min > 1 ? `${tier.min}–${next.min - 1} personas` : plural(tier.min, 'persona', 'personas');
                          const current = t === tourType && activeTier?.min === tier.min;
                          return (
                            <div key={tier.min} className={`td-prices__row${current ? ' is-current' : ''}`} role="row">
                              <span role="cell">{label}</span>
                              <span role="cell">
                                <b>{money(tier.price)}</b> USD
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="td-prices__flat">
                        <b>US$ {money(tour.tourTypes[t])}</b>
                        <span>por persona</span>
                      </div>
                    )}
                  </div>
                );
              })}
              <p className="td-fineprint">
                {tour.priceChild != null
                  ? `Niños hasta ${tour.childAgeMax ?? 11} años: US$ ${money(Number(tour.priceChild))} por persona. `
                  : ''}
                Precios en dólares estadounidenses. El total exacto de tu grupo aparece al elegir fecha y viajeros.
              </p>
            </section>
          )}

          {/* ---------- Qué llevar ---------- */}
          {tour.whatToBring.length > 0 && (
            <section className="td-section">
              <h2 className="ht-bar">
                <Icon name="backpack" size={19} /> ¿Qué debes llevar?
              </h2>
              <ul className="td-bring">
                {tour.whatToBring.map((item) => (
                  <li key={item.title}>
                    <span className="td-bring__icon">
                      <Icon name={bringIcon(item.title)} size={17} />
                    </span>
                    <span>
                      <strong>{item.title}</strong>
                      {item.detail && <small>{item.detail}</small>}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ---------- Punto de encuentro ---------- */}
          {(meeting || hasMap) && (
            <section className="td-section">
              <h2 className="ht-bar">
                <Icon name="pin" size={19} /> Punto de encuentro
              </h2>
              {meeting && (
                <p className="td-meeting">
                  <Icon name={tour.pickupIncluded ? 'van' : 'pin'} size={20} />
                  <span>{meeting}</span>
                </p>
              )}
              {hasMap && (
                <iframe
                  className="td-map"
                  src={mapSrc}
                  title={`Mapa del punto de encuentro de ${tour.title}`}
                  loading="lazy"
                />
              )}
            </section>
          )}

          {/* ---------- Información importante ---------- */}
          {(tour.info?.cancellation || tour.info?.health || tour.info?.transport) && (
            <section className="td-section">
              <h2 className="ht-bar">
                <Icon name="info" size={19} /> Antes de reservar
              </h2>
              <div className="td-info">
                {tour.info?.cancellation && (
                  <article className="td-info__card">
                    <span className="td-info__icon">
                      <Icon name="rotate-ccw" size={20} />
                    </span>
                    <h3>Cancelaciones</h3>
                    <p>{tour.info.cancellation}</p>
                    <Link href="/politica-de-cancelacion">Ver política completa</Link>
                  </article>
                )}
                {tour.info?.health && (
                  <article className="td-info__card">
                    <span className="td-info__icon">
                      <Icon name="altitude" size={20} />
                    </span>
                    <h3>Salud y altitud</h3>
                    <p>{tour.info.health}</p>
                  </article>
                )}
                {tour.info?.transport && (
                  <article className="td-info__card">
                    <span className="td-info__icon">
                      <Icon name="van" size={20} />
                    </span>
                    <h3>Transporte y servicio</h3>
                    <p>{tour.info.transport}</p>
                  </article>
                )}
              </div>
            </section>
          )}

          {/* ---------- Reseñas ---------- */}
          <section className="td-section" id="resenas">
            {reviews.length > 0 ? (
              <>
                <h2 className="ht-bar">
                  <Icon name="star" size={19} /> Reseñas de este tour
                </h2>
                <div className="td-rv-summary">
                  <div className="td-rv-summary__score">
                    <b>{fmtRating(stats.avg)}</b>
                    <Stars value={stats.avg} size={17} />
                    <span>{plural(stats.count, 'reseña verificada', 'reseñas verificadas')}</span>
                  </div>
                  <div className="td-rv-summary__bars">
                    {[5, 4, 3, 2, 1].map((s) => {
                      const n = stats.dist[s - 1];
                      const pct = stats.count ? Math.round((n / stats.count) * 100) : 0;
                      return (
                        <div key={s} className="td-rv-bar">
                          <span>{s}</span>
                          <i>
                            <b style={{ width: `${pct}%` }} />
                          </i>
                          <span>{n}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="rv-grid">
                  {shownReviews.map((r) => (
                    <ReviewCard key={r.id} review={r} />
                  ))}
                </div>
                {reviews.length > 4 && (
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setAllReviews((v) => !v)}>
                    {allReviews ? 'Ver menos reseñas' : `Ver las ${reviews.length} reseñas`}
                  </button>
                )}
              </>
            ) : (
              testimonials.length > 0 && (
                <>
                  <h2 className="ht-bar">
                    <Icon name="chat" size={19} /> Viajeros que confiaron en Homeland Tours
                  </h2>
                  <p className="td-fineprint td-fineprint--top">
                    Este tour todavía no tiene reseñas propias. Estas son opiniones de viajeros sobre otras
                    experiencias con nosotros.
                  </p>
                  <div className="rv-grid">
                    {testimonials.slice(0, 4).map((r) => (
                      <ReviewCard key={r.id} review={r} />
                    ))}
                  </div>
                </>
              )
            )}
          </section>
        </div>

        {/* ================= Tarjeta de reserva ================= */}
        <aside className="td-aside" ref={asideRef} id="reservar">
          <div className="td-book">
            <div className="td-book__price">
              {hasPrice ? (
                <>
                  <span>{date ? 'Tu precio' : 'Desde'}</span>
                  <strong>US$ {money(headlinePrice)}</strong>
                  <span>por persona</span>
                </>
              ) : (
                <strong className="td-book__ask">Precio a consultar</strong>
              )}
              {offerPct > 0 && <em className="td-book__offer">Oferta −{offerPct}%</em>}
            </div>

            {types.length > 1 && (
              <div className="td-field">
                <span className="td-field__label">Tipo de servicio</span>
                <div className="td-seg" role="radiogroup" aria-label="Tipo de servicio">
                  {types.map((t) => (
                    <button
                      key={t}
                      type="button"
                      role="radio"
                      aria-checked={tourType === t}
                      className={`td-seg__btn${tourType === t ? ' is-on' : ''}`}
                      onClick={() => setTourType(t)}
                    >
                      <b>{TYPE_SHORT[t]}</b>
                      <small>US$ {money(tiersFor(tour, t).length ? Math.min(...tiersFor(tour, t).map((x) => x.price)) : tour.tourTypes[t])}</small>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="td-field">
              <span className="td-field__label">Viajeros</span>
              <div className="td-pax">
                <div className="td-pax__row">
                  <span>
                    <b>Adultos</b>
                    <small>Desde {(tour.childAgeMax ?? 11) + 1} años</small>
                  </span>
                  <div className="stepper">
                    <button type="button" disabled={adults <= 1 || pax <= minPax} onClick={() => changeAdults(adults - 1)} aria-label="Quitar un adulto">
                      <Icon name="minus" size={15} />
                    </button>
                    <span aria-live="polite">{adults}</span>
                    <button type="button" disabled={pax >= GROUP_DISCOUNT_MAX_PAX} onClick={() => changeAdults(adults + 1)} aria-label="Añadir un adulto">
                      <Icon name="plus" size={15} />
                    </button>
                  </div>
                </div>
                <div className="td-pax__row">
                  <span>
                    <b>Niños</b>
                    <small>Hasta {tour.childAgeMax ?? 11} años</small>
                  </span>
                  <div className="stepper">
                    <button type="button" disabled={children <= 0 || pax <= minPax} onClick={() => changeChildren(children - 1)} aria-label="Quitar un niño">
                      <Icon name="minus" size={15} />
                    </button>
                    <span aria-live="polite">{children}</span>
                    <button type="button" disabled={pax >= GROUP_DISCOUNT_MAX_PAX} onClick={() => changeChildren(children + 1)} aria-label="Añadir un niño">
                      <Icon name="plus" size={15} />
                    </button>
                  </div>
                </div>
              </div>
              {pax >= GROUP_DISCOUNT_MAX_PAX && (
                <p className="td-hint">
                  ¿Son más de {GROUP_DISCOUNT_MAX_PAX}? <Link href="/customize">Pide un viaje a medida</Link>.
                </p>
              )}
            </div>

            <div className="td-field">
              <span className="td-field__label">Fecha</span>
              {loadingDates ? (
                <div className="ht-skel" style={{ height: 50 }} />
              ) : hasDates ? (
                <>
                  <button
                    type="button"
                    className={`td-date${date ? ' has-value' : ''}${needDate ? ' is-error' : ''}`}
                    aria-expanded={calOpen}
                    onClick={() => setCalOpen((v) => !v)}
                  >
                    <Icon name="calendar" size={18} />
                    <span>{date ? fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long' }) : 'Elige una fecha'}</span>
                    <Icon name="chevron-down" size={17} className="td-date__chev" />
                  </button>
                  {needDate && !date && <p className="td-hint td-hint--error">Elige una fecha para continuar.</p>}
                  {calOpen && <AvailabilityCalendar days={calendarDays} pax={pax} value={date} onChange={pickDate} />}
                  {!date && !calOpen && nextDate && (
                    <button type="button" className="td-next" onClick={() => pickDate(nextDate)}>
                      Próxima salida: <b>{fmtDate(nextDate, { weekday: 'short', day: 'numeric', month: 'short' })}</b>
                    </button>
                  )}
                </>
              ) : (
                <div className="ht-note ht-note--warn">
                  <Icon name="calendar" size={18} />
                  <span>
                    <strong>Fechas a consultar.</strong> Todavía no hay salidas abiertas para reservar online.
                  </span>
                </div>
              )}
            </div>

            {date && bookableSlots.length > 0 && (bookableSlots.length > 1 || bookableSlots[0].start_time) && (
              <div className="td-field">
                <span className="td-field__label">Hora de salida</span>
                <div className="slot-chips" role="radiogroup" aria-label="Hora de salida">
                  {bookableSlots.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      role="radio"
                      aria-checked={tourDateId === s.id}
                      className={`slot-chip${tourDateId === s.id ? ' is-active' : ''}`}
                      onClick={() => {
                        setTourDateId(s.id);
                        setStartTime(s.start_time ? fmtTime(s.start_time) : '');
                      }}
                    >
                      <strong>{s.start_time ? fmtTime(s.start_time) : 'Horario único'}</strong>
                      <small>{plural(s.free, 'lugar', 'lugares')}</small>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {date && selectedSlots.length > 0 && bookableSlots.length === 0 && (
              <p className="td-hint td-hint--error">
                No hay cupo para {plural(pax, 'viajero', 'viajeros')} en esta fecha. Prueba con otra fecha o con menos viajeros.
              </p>
            )}
            {belowMin && (
              <p className="td-hint td-hint--error">Este tour se reserva desde {minPax} personas.</p>
            )}

            {hasPrice && hasDates && (
              <div className="td-total">
                <div className="td-total__row">
                  <span>
                    {totals.childrenCount > 0 && totals.childPrice !== totals.perPerson
                      ? `${adults} × US$ ${money(totals.perPerson)} + ${totals.childrenCount} × US$ ${money(totals.childPrice)}`
                      : `${pax} × US$ ${money(totals.perPerson)}`}
                  </span>
                  <span>US$ {money(totals.subtotal)}</span>
                </div>
                {totals.groupDiscount > 0 && (
                  <div className="td-total__row td-total__row--off">
                    <span>Descuento por grupo ({Math.round(totals.groupDiscountRate * 100)}%)</span>
                    <span>−US$ {money(totals.groupDiscount)}</span>
                  </div>
                )}
                {totals.offerDiscount > 0 && (
                  <div className="td-total__row td-total__row--off">
                    <span>Oferta especial ({offerPct}%)</span>
                    <span>−US$ {money(totals.offerDiscount)}</span>
                  </div>
                )}
                <div className="td-total__row td-total__row--sum">
                  <span>Total</span>
                  <strong>US$ {money(totals.total)}</strong>
                </div>
                {totals.tiered && activeTier && tiers.length > 1 && (
                  <p className="td-total__tip">
                    <Icon name="tag" size={14} /> Precio para grupos de {activeTier.min}
                    {tiers[tiers.length - 1].min === activeTier.min ? ' o más' : ''}.{' '}
                    <a href="#precios">Ver tabla</a>
                  </p>
                )}
              </div>
            )}

            {hasDates || loadingDates ? (
              <button
                type="button"
                className="td-cta"
                onClick={handleReserve}
                disabled={loadingDates || belowMin || (Boolean(date) && !tourDateId)}
              >
                Reservar ahora <Icon name="arrow-right" size={18} />
              </button>
            ) : wa ? (
              <a className="td-cta td-cta--wa" href={wa} target="_blank" rel="noopener noreferrer">
                <Icon name="whatsapp" size={19} /> Consultar fechas por WhatsApp
              </a>
            ) : (
              <Link className="td-cta" href={`/customize?tour=${encodeURIComponent(tour.slug)}`}>
                Solicitar una fecha <Icon name="arrow-right" size={18} />
              </Link>
            )}

            <ul className="td-perks">
              {tour.payLater !== false && (
                <li>
                  <Icon name="shield-check" size={17} /> Reserva ahora y paga después
                </li>
              )}
              {cancel && (
                <li>
                  <Icon name="rotate-ccw" size={17} /> {cancel}
                </li>
              )}
              <li>
                <Icon name="ticket" size={17} /> Voucher digital al instante
              </li>
            </ul>
          </div>

          {wa && (hasDates || loadingDates) && (
            <a className="td-help" href={wa} target="_blank" rel="noopener noreferrer">
              <Icon name="whatsapp" size={20} />
              <span>
                <b>¿Dudas sobre este tour?</b>
                <small>Escríbenos por WhatsApp</small>
              </span>
              <Icon name="arrow-right" size={16} />
            </a>
          )}
        </aside>
      </section>

      {/* ================= Relacionados ================= */}
      {mightLike.length > 0 && (
        <section className="container td-related">
          <div className="flex-between">
            <h2>También te puede interesar</h2>
            <Link className="btn btn--ghost btn--sm" href="/tours">
              Ver todos los tours <Icon name="arrow-right" size={16} />
            </Link>
          </div>
          <div className="td-related__grid">
            {mightLike.map((t) => (
              <TourCard key={t.slug} tour={t} />
            ))}
          </div>
        </section>
      )}

      {/* ================= Barra fija móvil ================= */}
      <div className="td-bar">
        <div className="td-bar__price">
          {hasPrice ? (
            <>
              <small>{date ? fmtDate(date, { day: 'numeric', month: 'short' }) + ' · total' : 'Desde'}</small>
              <strong>US$ {money(date ? totals.total : tour.price)}</strong>
            </>
          ) : (
            <strong>A consultar</strong>
          )}
        </div>
        <button
          type="button"
          className="td-cta"
          onClick={() => {
            if (date && tourDateId) handleReserve();
            else {
              if (hasDates) setCalOpen(true);
              asideRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }}
        >
          {date && tourDateId ? 'Reservar ahora' : hasDates ? 'Ver fechas' : 'Consultar'}
        </button>
      </div>

      {/* ================= Visor de fotos ================= */}
      {lightbox !== null && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label="Galería de fotos">
          <div className="lightbox__scrim" onClick={() => setLightbox(null)} />
          <img className="lightbox__img" src={gallery[lightbox]} alt={`${tour.title} — foto ${lightbox + 1}`} />
          <button className="lightbox__close" aria-label="Cerrar galería" onClick={() => setLightbox(null)}>
            <Icon name="close" size={22} />
          </button>
          {gallery.length > 1 && (
            <>
              <button
                className="lightbox__nav lightbox__nav--prev"
                aria-label="Foto anterior"
                onClick={() => setLightbox((lightbox - 1 + gallery.length) % gallery.length)}
              >
                <Icon name="chevron-left" size={22} />
              </button>
              <button
                className="lightbox__nav lightbox__nav--next"
                aria-label="Foto siguiente"
                onClick={() => setLightbox((lightbox + 1) % gallery.length)}
              >
                <Icon name="chevron-right" size={22} />
              </button>
            </>
          )}
          <span className="lightbox__count">
            {lightbox + 1} / {gallery.length}
          </span>
        </div>
      )}
    </div>
  );
}
