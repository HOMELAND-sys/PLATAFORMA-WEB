'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import { useAuth } from '@/context/AuthContext';
import { cancelBooking, fetchMyBookings, type MyBooking } from '@/lib/api';
import { getSupabase } from '@/lib/supabase';
import { formatUsd } from '@/lib/pricing';

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

  useEffect(() => {
    if (!authLoading && !session) {
      router.replace('/login?next=/bookings');
    }
  }, [authLoading, session, router]);

  const load = () => {
    fetchMyBookings(getSupabase())
      .then(setBookings)
      .catch(() => setBookings([]));
  };

  useEffect(() => {
    if (session) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const handleCancel = async (b: MyBooking) => {
    if (!window.confirm(`¿Cancelar la reserva ${b.code}? El cupo queda libre de inmediato.`)) return;
    setCancellingId(b.id);
    setError('');
    try {
      await cancelBooking(getSupabase(), b.id);
      load();
    } catch {
      setError('No pudimos cancelar la reserva. Volvé a intentarlo.');
    } finally {
      setCancellingId(null);
    }
  };

  if (!authLoading && !session) return null;

  return (
    <>
      <section className="page-header">
        <div className="container">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Mis reservas' }]} />
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
              <p style={{ color: 'var(--ink-500)', marginBottom: 16 }}>Todavía no tenés reservas.</p>
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
                        <strong>{b.code}</strong> · {fmtDate(b.tour_date)} · {b.pax}{' '}
                        {b.pax === 1 ? 'pasajero' : 'pasajeros'} · {formatUsd(b.total)}
                      </p>
                    </div>
                    <div className="booking-row__actions">
                      <Link className="btn btn--primary btn--sm" href={`/confirmation?code=${b.code}`}>
                        Ver voucher
                      </Link>
                      {b.status === 'pendiente_pago' && (
                        <button
                          className="btn btn--ghost btn--sm"
                          onClick={() => handleCancel(b)}
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
    </>
  );
}
