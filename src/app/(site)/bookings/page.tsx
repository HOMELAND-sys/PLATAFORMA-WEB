'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import { useAuth } from '@/context/AuthContext';
import { cancelBooking, fetchMyBookings, type MyBooking } from '@/lib/api';
import { getSupabase } from '@/lib/supabase';
import { formatUsd } from '@/lib/pricing';
import { paxSplit } from '@/components/confirmation/voucher-data';

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pendiente_pago: { label: 'Pendiente de pago', cls: 'bk-status--amber' },
  confirmada: { label: 'Confirmada', cls: 'bk-status--green' },
  completada: { label: 'Completada', cls: 'bk-status--green' },
  cancelada: { label: 'Cancelada', cls: 'bk-status--red' },
};

const fmtDate = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

export default function MyBookingsPage() {
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<MyBooking[] | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [cancelTarget, setCancelTarget] = useState<MyBooking | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const cancelPanelRef = useRef<HTMLDivElement>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !session) {
      router.replace('/login?next=/bookings');
    }
  }, [authLoading, session, router]);

  const load = () => {
    if (!session) return;
    fetchMyBookings(getSupabase(), session.user.id)
      .then(setBookings)
      .catch(() => setBookings([]));
  };

  useEffect(() => {
    if (session) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Diálogo de cancelación: foco atrapado (Tab/Shift+Tab), fondo inerte,
  // Escape para cerrar y devolución del foco al botón que lo abrió.
  useEffect(() => {
    if (!cancelTarget) return;
    const panel = cancelPanelRef.current;
    const trigger = (document.activeElement as HTMLElement | null) ?? null;
    const focusables = () =>
      panel
        ? Array.from(
            panel.querySelectorAll<HTMLElement>(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
            ),
          ).filter((el) => !el.hasAttribute('disabled'))
        : [];
    (focusables()[0] ?? panel)?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const bg = backgroundRef.current;
    bg?.setAttribute('inert', '');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCancelTarget(null);
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
  }, [cancelTarget]);

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
    try {
      await cancelBooking(getSupabase(), b.id, reason || 'Cancelada por el cliente');
      load();
    } catch {
      setError('No pudimos cancelar la reserva. Vuelve a intentarlo.');
    } finally {
      setCancellingId(null);
    }
  };

  if (!authLoading && !session) return null;

  return (
    <>
      <div ref={backgroundRef}>
      <section className="page-header">
        <div className="container">
          <Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'Mis reservas' }]} />
          <h1>
            Mis <em>reservas</em>
          </h1>
          <p>Seguimiento de tus reservas y vouchers. Los estados los actualiza la operatora.</p>
        </div>
      </section>

      <section className="section-tight bookings-section">
        <div className="container">
          {error && <div className="error-alert">{error}</div>}

          {bookings === null ? (
            <p style={{ textAlign: 'center', color: 'var(--ink-500)', padding: '40px 0' }}>Cargando tus reservas…</p>
          ) : bookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0' }}>
              <p style={{ color: 'var(--ink-500)', marginBottom: 16 }}>Todavía no tienes reservas.</p>
              <Link className="btn btn--primary" href="/tours">
                Explorar tours
              </Link>
            </div>
          ) : (
            <div className="bookings-list">
              {bookings.map((b) => {
                const meta = STATUS_META[b.status] ?? STATUS_META.pendiente_pago;
                return (
                  <div className="booking-row" key={b.id}>
                    <img className="booking-row__img" src={b.tour_image} alt={b.tour_title} />
                    <div className="booking-row__body">
                      <div className="booking-row__head">
                        <h3>{b.tour_title}</h3>
                        <span className={`bk-status ${meta.cls}`}>
                          <span className="dot"></span>
                          {meta.label}
                        </span>
                      </div>
                      <p className="booking-row__meta">
                        <strong>{b.code}</strong> · {fmtDate(b.tour_date)}
                        {b.tour_start_time ? ` · ${b.tour_start_time.slice(0, 5)} hs` : ''} · {paxSplit(b)} ·{' '}
                        {formatUsd(b.total)}
                      </p>
                    </div>
                    <div className="booking-row__actions">
                      <Link className="btn btn--primary btn--sm" href={`/confirmation?code=${b.code}`}>
                        Ver voucher
                      </Link>
                      {(b.status === 'pendiente_pago' || b.status === 'confirmada') && (
                        <button
                          className="btn btn--ghost btn--sm"
                          onClick={() => openCancel(b)}
                          disabled={cancellingId === b.id}
                        >
                          {cancellingId === b.id ? 'Cancelando…' : 'Cancelar'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
      </div>

      {cancelTarget && (
        <div className="cancel-modal" role="dialog" aria-modal="true" aria-labelledby="cancelTitle">
          <div className="cancel-modal__overlay" onClick={() => setCancelTarget(null)} />
          <div className="cancel-modal__panel" ref={cancelPanelRef} tabIndex={-1}>
            <h3 id="cancelTitle">¿Cancelar la reserva {cancelTarget.code}?</h3>
            <p>El cupo queda libre de inmediato.</p>
            <label htmlFor="cancelReason">Motivo (opcional)</label>
            <textarea
              id="cancelReason"
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Cuéntanos brevemente por qué cancelas…"
            />
            <div className="cancel-modal__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setCancelTarget(null)}>
                Volver
              </button>
              <button type="button" className="btn cancel-modal__confirm" onClick={confirmCancel}>
                Cancelar reserva
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
