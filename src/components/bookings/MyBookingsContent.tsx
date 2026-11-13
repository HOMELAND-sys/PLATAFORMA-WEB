'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import Icon, { type IconName } from '@/components/ui/Icon';
import { useAuth } from '@/context/AuthContext';
import { useSite } from '@/context/SiteContext';
import {
  cancelBooking,
  fetchMyBookings,
  fetchMyReviews,
  submitReview,
  type MyBooking,
  type ReviewRow,
} from '@/lib/api';
import { getSupabase } from '@/lib/supabase';
import { formatUsd } from '@/lib/pricing';
import { paxSplit } from '@/components/confirmation/voucher-data';

type TabKey = 'upcoming' | 'past' | 'cancelled';

const STATUS_META: Record<MyBooking['status'], { label: string; cls: string }> = {
  pendiente_pago: { label: 'Pendiente de pago', cls: 'bk-status--amber' },
  confirmada: { label: 'Confirmada', cls: 'bk-status--green' },
  completada: { label: 'Completada', cls: 'bk-status--green' },
  cancelada: { label: 'Cancelada', cls: 'bk-status--red' },
};

const TABS: { key: TabKey; label: string; icon: IconName; empty: string }[] = [
  { key: 'upcoming', label: 'Próximas', icon: 'calendar', empty: 'No tienes viajes próximos.' },
  { key: 'past', label: 'Anteriores', icon: 'check-circle', empty: 'Aún no tienes viajes realizados.' },
  { key: 'cancelled', label: 'Canceladas', icon: 'x-circle', empty: 'No tienes reservas canceladas.' },
];

const RATING_LABEL = ['', 'Muy mala', 'Mala', 'Regular', 'Buena', 'Excelente'];

const fmtDate = (d: string) =>
  d
    ? new Date(`${d}T12:00:00`).toLocaleDateString('es-ES', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Fecha por confirmar';

/** Momento de inicio del tour (hora local del navegador; suficiente para avisos). */
function startOf(b: MyBooking): Date | null {
  if (!b.tour_date) return null;
  const time = b.tour_start_time ? b.tour_start_time.slice(0, 5) : '08:00';
  const d = new Date(`${b.tour_date}T${time}:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function tabOf(b: MyBooking, now: number): TabKey {
  if (b.status === 'cancelada') return 'cancelled';
  if (b.status === 'completada') return 'past';
  const start = startOf(b);
  // Una reserva vigente cuya fecha ya pasó se muestra entre las anteriores.
  if (start && start.getTime() + 36 * 3600 * 1000 < now) return 'past';
  return 'upcoming';
}

function countdown(b: MyBooking, now: number): string | null {
  const start = startOf(b);
  if (!start) return null;
  const days = Math.floor((start.getTime() - now) / 86_400_000);
  if (start.getTime() < now) return null;
  if (days === 0) return 'Es hoy';
  if (days === 1) return 'Es mañana';
  return `Faltan ${days} días`;
}

export default function MyBookingsContent() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const { policies } = useSite();
  const [bookings, setBookings] = useState<MyBooking[] | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [tab, setTab] = useState<TabKey>('upcoming');
  const [tabTouched, setTabTouched] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [cancelTarget, setCancelTarget] = useState<MyBooking | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [reviewTarget, setReviewTarget] = useState<MyBooking | null>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [sendingReview, setSendingReview] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    if (!authLoading && !session) router.replace('/login?next=/bookings');
  }, [authLoading, session, router]);

  const userId = session?.user.id;
  const load = useCallback(() => {
    if (!userId) return;
    const sb = getSupabase();
    fetchMyBookings(sb, userId)
      .then(setBookings)
      .catch(() => {
        setBookings([]);
        setError('No pudimos cargar tus reservas. Actualiza la página para intentarlo de nuevo.');
      });
    fetchMyReviews(sb, userId).then(setReviews);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => {
    const out: Record<TabKey, MyBooking[]> = { upcoming: [], past: [], cancelled: [] };
    for (const b of bookings ?? []) out[tabOf(b, now)].push(b);
    // Próximas: primero la salida más cercana.
    out.upcoming.sort((a, b) => (a.tour_date || '9999').localeCompare(b.tour_date || '9999'));
    out.past.sort((a, b) => (b.tour_date || '').localeCompare(a.tour_date || ''));
    return out;
  }, [bookings, now]);

  // Si no hay próximas, se abre la primera pestaña con contenido.
  useEffect(() => {
    if (tabTouched || !bookings) return;
    if (grouped.upcoming.length > 0) setTab('upcoming');
    else if (grouped.past.length > 0) setTab('past');
    else if (grouped.cancelled.length > 0) setTab('cancelled');
  }, [bookings, grouped, tabTouched]);

  const reviewByReservation = useMemo(() => {
    const map = new Map<string, ReviewRow>();
    for (const r of reviews) if (r.reservation_id) map.set(r.reservation_id, r);
    return map;
  }, [reviews]);

  const dialogOpen = Boolean(cancelTarget || reviewTarget);
  const closeDialogs = useCallback(() => {
    setCancelTarget(null);
    setReviewTarget(null);
  }, []);

  // Diálogos: foco atrapado, fondo inerte, Escape para cerrar y foco de vuelta.
  useEffect(() => {
    if (!dialogOpen) return;
    const panel = panelRef.current;
    const trigger = (document.activeElement as HTMLElement | null) ?? null;
    const focusables = () =>
      panel
        ? Array.from(
            panel.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
          ).filter((el) => !el.hasAttribute('disabled'))
        : [];
    (focusables()[0] ?? panel)?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const bg = backgroundRef.current;
    bg?.setAttribute('inert', '');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeDialogs();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        panel?.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || active === panel)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      bg?.removeAttribute('inert');
      trigger?.focus();
    };
  }, [dialogOpen, closeDialogs]);

  const openCancel = (b: MyBooking) => {
    setCancelReason('');
    setCancelTarget(b);
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    const b = cancelTarget;
    const reason = cancelReason.trim();
    setCancelTarget(null);
    setCancellingId(b.id);
    setError('');
    setNotice('');
    try {
      await cancelBooking(getSupabase(), b.id, reason || 'Cancelada por el cliente');
      setNotice(`Cancelamos la reserva ${b.code}. El lugar quedó libre.`);
      load();
    } catch {
      setError('No pudimos cancelar la reserva. Vuelve a intentarlo.');
    } finally {
      setCancellingId(null);
    }
  };

  const openReview = (b: MyBooking) => {
    setRating(0);
    setHoverRating(0);
    setReviewTitle('');
    setReviewBody('');
    setReviewError('');
    setReviewTarget(b);
  };

  const sendReview = async () => {
    if (!reviewTarget) return;
    const body = reviewBody.trim();
    if (rating < 1) {
      setReviewError('Elige de 1 a 5 estrellas.');
      return;
    }
    if (body.length < 20) {
      setReviewError('Cuéntanos un poco más: al menos 20 caracteres.');
      return;
    }
    setSendingReview(true);
    setReviewError('');
    try {
      const saved = await submitReview(getSupabase(), {
        reservationId: reviewTarget.id,
        rating,
        title: reviewTitle.trim(),
        body,
      });
      setReviews((prev) => [...prev, saved]);
      setReviewTarget(null);
      setNotice('¡Gracias! Recibimos tu reseña y la publicaremos después de revisarla.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      setReviewError(
        msg.includes('already_reviewed')
          ? 'Ya enviaste una reseña para este viaje.'
          : msg.includes('reservation_not_completed')
            ? 'Podrás opinar cuando el viaje figure como completado.'
            : 'No pudimos guardar tu reseña. Vuelve a intentarlo.',
      );
    } finally {
      setSendingReview(false);
    }
  };

  if (!authLoading && !session) return null;

  const list = grouped[tab];
  const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0];
  const freeHours = policies.free_cancellation_hours;
  const cancelStart = cancelTarget ? startOf(cancelTarget) : null;
  const cancelInTime = cancelStart ? cancelStart.getTime() - now >= freeHours * 3600 * 1000 : true;
  const shownRating = hoverRating || rating;

  return (
    <>
      <div ref={backgroundRef}>
        <section className="page-header">
          <div className="container">
            <Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'Mis reservas' }]} />
            <h1>
              Mis <em>reservas</em>
            </h1>
            <p>Tus viajes, vouchers y pagos en un solo lugar.</p>
          </div>
        </section>

        <section className="section-tight bookings-section">
          <div className="container mb-wrap">
            {error && (
              <div className="error-alert" role="alert">
                {error}
              </div>
            )}
            {notice && (
              <div className="ht-note mb-notice" role="status">
                <Icon name="check-circle" size={18} />
                <span>{notice}</span>
              </div>
            )}

            {bookings === null ? (
              <div className="bookings-list" aria-busy="true">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="ht-skel" style={{ height: 132, borderRadius: 18 }} />
                ))}
              </div>
            ) : bookings.length === 0 ? (
              <div className="ht-empty">
                <span className="ht-empty__icon">
                  <Icon name="ticket" size={30} />
                </span>
                <h2>Todavía no tienes reservas</h2>
                <p>Cuando reserves un tour, aquí verás tu voucher, el estado del pago y los detalles de la salida.</p>
                <Link className="btn btn--primary" href="/tours">
                  Explorar tours <Icon name="arrow-right" size={16} />
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-tabs" role="tablist" aria-label="Reservas por estado">
                  {TABS.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      role="tab"
                      aria-selected={tab === t.key}
                      className={`mb-tab${tab === t.key ? ' is-active' : ''}`}
                      onClick={() => {
                        setTab(t.key);
                        setTabTouched(true);
                      }}
                    >
                      <Icon name={t.icon} size={16} />
                      {t.label}
                      <span className="mb-tab__count">{grouped[t.key].length}</span>
                    </button>
                  ))}
                </div>

                {list.length === 0 ? (
                  <div className="ht-empty ht-empty--sm">
                    <p>{activeTab.empty}</p>
                    {tab === 'upcoming' && (
                      <Link className="btn btn--primary btn--sm" href="/tours">
                        Buscar un tour
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="bookings-list">
                    {list.map((b) => {
                      const meta = STATUS_META[b.status] ?? STATUS_META.pendiente_pago;
                      const review = reviewByReservation.get(b.id);
                      const left = tab === 'upcoming' ? countdown(b, now) : null;
                      const cancellable =
                        (b.status === 'pendiente_pago' || b.status === 'confirmada') && tab === 'upcoming';
                      return (
                        <article className="mb-card" key={b.id}>
                          <Link className="mb-card__media" href={`/tours/${b.tour_slug}`} tabIndex={-1} aria-hidden="true">
                            <img src={b.tour_image} alt="" loading="lazy" />
                          </Link>
                          <div className="mb-card__body">
                            <div className="mb-card__head">
                              <h3>
                                <Link href={`/tours/${b.tour_slug}`}>{b.tour_title}</Link>
                              </h3>
                              <span className={`bk-status ${meta.cls}`}>
                                <span className="dot"></span>
                                {meta.label}
                              </span>
                            </div>
                            <ul className="mb-card__facts">
                              <li>
                                <Icon name="calendar" size={15} />
                                {fmtDate(b.tour_date)}
                                {b.tour_start_time ? ` · ${b.tour_start_time.slice(0, 5)} h` : ''}
                              </li>
                              <li>
                                <Icon name="users" size={15} />
                                {paxSplit(b)}
                              </li>
                              <li>
                                <Icon name="ticket" size={15} />
                                <strong>{b.code}</strong>
                              </li>
                            </ul>

                            {b.status === 'pendiente_pago' && tab === 'upcoming' && (
                              <p className="mb-card__hint mb-card__hint--amber">
                                <Icon name="info" size={15} /> Tu lugar está apartado. Completa el pago con las
                                instrucciones de tu voucher para confirmar la reserva.
                              </p>
                            )}
                            {b.status === 'confirmada' && tab === 'upcoming' && (
                              <p className="mb-card__hint">
                                <Icon name="check-circle" size={15} /> Pago registrado. Lleva tu voucher y tu documento
                                el día de la salida.
                              </p>
                            )}
                            {b.status === 'cancelada' && (
                              <p className="mb-card__hint mb-card__hint--muted">
                                {b.refund_pending
                                  ? 'Reembolso en proceso: te avisaremos cuando esté hecho.'
                                  : b.cancellation_reason
                                    ? `Motivo: ${b.cancellation_reason}`
                                    : 'Reserva cancelada.'}
                              </p>
                            )}
                            {b.status === 'completada' && review && (
                              <p className="mb-card__hint">
                                <Icon name="star-solid" size={15} />{' '}
                                {review.status === 'published'
                                  ? 'Tu reseña está publicada. ¡Gracias por compartirla!'
                                  : review.status === 'hidden'
                                    ? 'Recibimos tu reseña. ¡Gracias por tu opinión!'
                                    : 'Recibimos tu reseña: la publicaremos después de revisarla.'}
                              </p>
                            )}
                          </div>

                          <div className="mb-card__side">
                            <div className="mb-card__total">
                              {left && <span className="mb-card__left">{left}</span>}
                              <strong>{formatUsd(b.total)}</strong>
                              <small>Total de la reserva</small>
                            </div>
                            <div className="mb-card__actions">
                              <Link className="btn btn--primary btn--sm" href={`/confirmation?code=${b.code}`}>
                                Ver voucher
                              </Link>
                              {b.status === 'completada' && !review && (
                                <button type="button" className="btn btn--dark btn--sm" onClick={() => openReview(b)}>
                                  <Icon name="star" size={15} /> Dejar reseña
                                </button>
                              )}
                              {(b.status === 'cancelada' || b.status === 'completada') && (
                                <Link className="btn btn--ghost btn--sm" href={`/tours/${b.tour_slug}`}>
                                  Reservar de nuevo
                                </Link>
                              )}
                              {cancellable && (
                                <button
                                  type="button"
                                  className="btn btn--ghost btn--sm"
                                  onClick={() => openCancel(b)}
                                  disabled={cancellingId === b.id}
                                >
                                  {cancellingId === b.id ? 'Cancelando…' : 'Cancelar'}
                                </button>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}

                <p className="mb-foot">
                  ¿Necesitas cambiar una fecha o tienes dudas con un pago? Revisa la{' '}
                  <Link href="/politica-de-cancelacion">política de cancelación</Link> o las{' '}
                  <Link href="/preguntas-frecuentes">preguntas frecuentes</Link>.
                </p>
              </>
            )}
          </div>
        </section>
      </div>

      {cancelTarget && (
        <div className="cancel-modal" role="dialog" aria-modal="true" aria-labelledby="cancelTitle">
          <div className="cancel-modal__overlay" onClick={() => setCancelTarget(null)} />
          <div className="cancel-modal__panel" ref={panelRef} tabIndex={-1}>
            <h3 id="cancelTitle">¿Cancelar la reserva {cancelTarget.code}?</h3>
            <p>
              {cancelTarget.tour_title} · {fmtDate(cancelTarget.tour_date)}
            </p>
            <div className={`mb-policy${cancelInTime ? '' : ' mb-policy--late'}`}>
              <Icon name={cancelInTime ? 'check-circle' : 'alert'} size={18} />
              <span>
                {cancelTarget.status === 'pendiente_pago'
                  ? 'Aún no registramos un pago para esta reserva: al cancelar, el lugar queda libre y no hay cargos.'
                  : cancelInTime
                    ? `Estás dentro del plazo de ${freeHours} horas: te reembolsamos el total pagado${
                        policies.cancellation_fee_pct > 0
                          ? ` menos un cargo administrativo del ${policies.cancellation_fee_pct} %`
                          : ''
                      }.`
                    : `Faltan menos de ${freeHours} horas para la salida: según la política de cancelación no corresponde devolución.`}
              </span>
            </div>
            <label htmlFor="cancelReason">Motivo (opcional)</label>
            <textarea
              id="cancelReason"
              rows={3}
              maxLength={300}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Cuéntanos brevemente por qué cancelas…"
            />
            <div className="cancel-modal__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setCancelTarget(null)}>
                Conservar reserva
              </button>
              <button type="button" className="btn cancel-modal__confirm" onClick={confirmCancel}>
                Sí, cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {reviewTarget && (
        <div className="cancel-modal" role="dialog" aria-modal="true" aria-labelledby="reviewTitle">
          <div className="cancel-modal__overlay" onClick={() => setReviewTarget(null)} />
          <div className="cancel-modal__panel mb-review" ref={panelRef} tabIndex={-1}>
            <h3 id="reviewTitle">¿Qué tal estuvo tu viaje?</h3>
            <p>
              {reviewTarget.tour_title} · {fmtDate(reviewTarget.tour_date)}
            </p>

            <div className="mb-stars" role="radiogroup" aria-label="Valoración">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={`${n} ${n === 1 ? 'estrella' : 'estrellas'}`}
                  className={`mb-star${n <= shownRating ? ' is-on' : ''}`}
                  onMouseEnter={() => setHoverRating(n)}
                  onMouseLeave={() => setHoverRating(0)}
                  onFocus={() => setHoverRating(n)}
                  onBlur={() => setHoverRating(0)}
                  onClick={() => setRating(n)}
                >
                  <Icon name="star-solid" size={30} />
                </button>
              ))}
              <span className="mb-stars__label">{RATING_LABEL[shownRating] || 'Elige una valoración'}</span>
            </div>

            <label htmlFor="reviewHeadline">Título (opcional)</label>
            <input
              id="reviewHeadline"
              type="text"
              maxLength={120}
              value={reviewTitle}
              onChange={(e) => setReviewTitle(e.target.value)}
              placeholder="Lo mejor del viaje en una frase"
            />
            <label htmlFor="reviewBody">Tu experiencia</label>
            <textarea
              id="reviewBody"
              rows={5}
              maxLength={2000}
              value={reviewBody}
              onChange={(e) => setReviewBody(e.target.value)}
              placeholder="¿Qué te gustó? ¿Cómo fueron el guía, el transporte y la organización?"
            />
            <small className="mb-review__help">
              Se publicará con tu nombre y la inicial de tu apellido, después de que la revisemos.
            </small>
            {reviewError && (
              <div className="error-alert" role="alert">
                {reviewError}
              </div>
            )}
            <div className="cancel-modal__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setReviewTarget(null)}>
                Ahora no
              </button>
              <button type="button" className="btn btn--primary" onClick={sendReview} disabled={sendingReview}>
                {sendingReview ? 'Enviando…' : 'Enviar reseña'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
