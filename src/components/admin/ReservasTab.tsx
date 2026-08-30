'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchAdminBookings,
  updateReservationStatus,
  type AdminBooking,
} from '@/lib/api';
import { getSupabase } from '@/lib/supabase';
import { formatUsd } from '@/lib/pricing';

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pendiente_pago: { label: 'Pendiente de pago', cls: 'badge-status--amber' },
  confirmada: { label: 'Confirmada', cls: 'badge-status--green' },
  completada: { label: 'Completada', cls: 'badge-status--green' },
  cancelada: { label: 'Cancelada', cls: 'badge-status--red' },
};

const fmtDate = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

const fmtDateTime = (d: string | null) =>
  d
    ? new Date(d).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

export default function ReservasTab() {
  const [bookings, setBookings] = useState<AdminBooking[] | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('todas');
  const [tourFilter, setTourFilter] = useState('todos');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selected, setSelected] = useState<AdminBooking | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');
  const [cancelMode, setCancelMode] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const load = useCallback(() => {
    fetchAdminBookings(getSupabase())
      .then(setBookings)
      .catch(() => setBookings([]));
  }, []);

  useEffect(load, [load]);

  const tourOptions = useMemo(() => {
    if (!bookings) return [] as { slug: string; title: string }[];
    const seen = new Map<string, string>();
    for (const b of bookings) if (b.tour_slug) seen.set(b.tour_slug, b.tour_title);
    return [...seen.entries()].map(([slug, title]) => ({ slug, title }));
  }, [bookings]);

  const filtered = useMemo(() => {
    if (!bookings) return [];
    const q = search.trim().toLowerCase();
    return bookings.filter((b) => {
      if (status !== 'todas' && b.status !== status) return false;
      if (tourFilter !== 'todos' && b.tour_slug !== tourFilter) return false;
      if (dateFrom && b.tour_date < dateFrom) return false;
      if (dateTo && b.tour_date > dateTo) return false;
      if (q) {
        const hay = `${b.code} ${b.client_name} ${b.client_email} ${b.tour_title}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [bookings, search, status, tourFilter, dateFrom, dateTo]);

  const changeStatus = async (next: 'confirmada' | 'completada' | 'cancelada') => {
    if (!selected) return;
    if (next === 'cancelada') {
      if (!cancelReason.trim()) {
        setError('La cancelación requiere un motivo.');
        return;
      }
      if (!window.confirm(`¿Cancelar la reserva ${selected.code}? El cupo queda libre de inmediato.`)) return;
    }
    setBusy(true);
    setError('');
    setOkMsg('');
    try {
      await updateReservationStatus(getSupabase(), selected.id, next, cancelReason.trim() || undefined);
      setOkMsg('Estado actualizado.');
      setCancelMode(false);
      setCancelReason('');
      load();
      const { data } = await getSupabase()
        .from('reservations')
        .select('*, tour:reservations_tour_id_fkey (slug, title), date_row:reservations_tour_date_id_fkey (date)')
        .eq('id', selected.id)
        .maybeSingle();
      if (data) {
        // Recarga el drawer con el estado nuevo (manteniendo pasajeros del fetch previo).
        setSelected((prev) => (prev ? { ...prev, ...data, passengers: prev.passengers, client_name: prev.client_name, client_email: prev.client_email } : prev));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el estado.');
    } finally {
      setBusy(false);
    }
  };

  if (bookings === null) {
    return <p style={{ color: 'var(--ink-500)' }}>Cargando reservas…</p>;
  }

  const totalFiltered = filtered.reduce((s, b) => s + (b.status !== 'cancelada' ? b.total : 0), 0);

  return (
    <>
      <div className="admin-header">
        <div>
          <h1>Reservas</h1>
          <p>
            {filtered.length} {filtered.length === 1 ? 'reserva' : 'reservas'} ·{' '}
            {formatUsd(totalFiltered)} en activas
          </p>
        </div>
      </div>

      <div className="admin-filters">
        <input
          type="search"
          placeholder="Buscar por código, cliente o tour…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="todas">Todos los estados</option>
          <option value="pendiente_pago">Pendiente de pago</option>
          <option value="confirmada">Confirmada</option>
          <option value="completada">Completada</option>
          <option value="cancelada">Cancelada</option>
        </select>
        <select value={tourFilter} onChange={(e) => setTourFilter(e.target.value)} title="Tour">
          <option value="todos">Todos los tours</option>
          {tourOptions.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.title}
            </option>
          ))}
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title="Desde" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} title="Hasta" />
      </div>

      {error && <div className="admin-alert admin-alert--error">{error}</div>}
      {okMsg && <div className="admin-alert admin-alert--ok">{okMsg}</div>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Cliente</th>
              <th>Tour</th>
              <th>Fecha</th>
              <th>Pax</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Creada</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => {
              const meta = STATUS_META[b.status];
              return (
                <tr key={b.id} className="is-clickable" onClick={() => { setSelected(b); setError(''); setCancelMode(false); setCancelReason(''); }}>
                  <td className="cell-strong">{b.code}</td>
                  <td>
                    {b.client_name || '—'}
                    <span className="cell-sub">{b.client_email}</span>
                  </td>
                  <td>
                    {b.tour_title}
                    <span className="cell-sub">{fmtDate(b.tour_date)}</span>
                  </td>
                  <td>{fmtDate(b.tour_date)}</td>
                  <td>{b.pax}</td>
                  <td className="cell-strong">{formatUsd(b.total)}</td>
                  <td>
                    <span className={`badge-status ${meta.cls}`}>
                      <span className="dot"></span>
                      {meta.label}
                    </span>
                  </td>
                  <td>{fmtDateTime(b.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="admin-empty">
            <strong>Sin resultados</strong>
            Probá con otros filtros.
          </div>
        )}
      </div>

      {selected && (
        <ReservationDrawer
          booking={selected}
          busy={busy}
          cancelMode={cancelMode}
          cancelReason={cancelReason}
          onCancelReason={setCancelReason}
          onToggleCancel={() => setCancelMode((v) => !v)}
          onClose={() => setSelected(null)}
          onChangeStatus={changeStatus}
        />
      )}
    </>
  );
}

function ReservationDrawer({
  booking,
  busy,
  cancelMode,
  cancelReason,
  onCancelReason,
  onToggleCancel,
  onClose,
  onChangeStatus,
}: {
  booking: AdminBooking;
  busy: boolean;
  cancelMode: boolean;
  cancelReason: string;
  onCancelReason: (v: string) => void;
  onToggleCancel: () => void;
  onClose: () => void;
  onChangeStatus: (s: 'confirmada' | 'completada' | 'cancelada') => void;
}) {
  const meta = STATUS_META[booking.status];
  const canCancel = booking.status === 'pendiente_pago' || booking.status === 'confirmada';

  return (
    <>
      <div className="admin-scrim" onClick={onClose}></div>
      <div className="admin-drawer" role="dialog" aria-label={`Reserva ${booking.code}`}>
        <div className="admin-drawer__head">
          <h3>Reserva {booking.code}</h3>
          <button className="admin-side__logout" onClick={onClose} title="Cerrar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="admin-drawer__body">
          <span className={`badge-status ${meta.cls}`}>
            <span className="dot"></span>
            {meta.label}
          </span>

          {booking.refund_pending && booking.status === 'cancelada' && (
            <div className="admin-alert admin-alert--error">
              ⚠ Reembolso manual pendiente: la reserva estaba confirmada y pagada.
            </div>
          )}
          {booking.cancellation_reason && (
            <div className="drawer-row">
              <small>Motivo cancelación</small>
              <strong>{booking.cancellation_reason}</strong>
            </div>
          )}

          <div>
            <div className="drawer-row">
              <small>Cliente</small>
              <strong>
                {booking.client_name || '—'}
                <br />
                <span style={{ fontWeight: 400, color: 'var(--ink-500)' }}>{booking.client_email}</span>
              </strong>
            </div>
            <div className="drawer-row">
              <small>Tour</small>
              <strong>{booking.tour_title}</strong>
            </div>
            <div className="drawer-row">
              <small>Fecha del tour</small>
              <strong>{fmtDate(booking.tour_date)}</strong>
            </div>
            <div className="drawer-row">
              <small>Tipo</small>
              <strong>
                {booking.tour_type === 'group'
                  ? 'Tour compartido'
                  : booking.tour_type === 'semi'
                    ? 'Tour semiprivado'
                    : 'Tour privado'}{' '}
                · {booking.pax} pax
              </strong>
            </div>
            <div className="drawer-row">
              <small>Modo de pago</small>
              <strong>{booking.payment_method === 'qr' ? 'QR' : 'Enlace'}</strong>
            </div>
            <div className="drawer-row">
              <small>Subtotal</small>
              <strong>{formatUsd(booking.subtotal)}</strong>
            </div>
            {booking.group_discount > 0 && (
              <div className="drawer-row">
                <small>Desc. grupo</small>
                <strong>-{formatUsd(booking.group_discount)}</strong>
              </div>
            )}
            {booking.coupon_discount > 0 && (
              <div className="drawer-row">
                <small>Cupón {booking.coupon_code}</small>
                <strong>-{formatUsd(booking.coupon_discount)}</strong>
              </div>
            )}
            <div className="drawer-row">
              <small>Total</small>
              <strong>{formatUsd(booking.total)}</strong>
            </div>
            <div className="drawer-row">
              <small>Creada</small>
              <strong>{fmtDateTime(booking.created_at)}</strong>
            </div>
            {booking.paid_at && (
              <div className="drawer-row">
                <small>Paga­da (confirmada)</small>
                <strong>{fmtDateTime(booking.paid_at)}</strong>
              </div>
            )}
            {booking.completed_at && (
              <div className="drawer-row">
                <small>Completada</small>
                <strong>{fmtDateTime(booking.completed_at)}</strong>
              </div>
            )}
          </div>

          <div>
            <h4 style={{ margin: '0 0 8px', fontSize: '0.85rem', color: 'var(--ink-500)' }}>PASAJEROS</h4>
            {booking.passengers.map((p) => (
              <div className="drawer-row" key={p.id}>
                <small>
                  {p.position}. {p.is_lead ? 'Reservante' : 'Pasajero'}
                </small>
                <strong>
                  {p.name}
                  <br />
                  <span style={{ fontWeight: 400, color: 'var(--ink-500)' }}>
                    {p.doc} · {p.country} · {p.meal}
                  </span>
                </strong>
              </div>
            ))}
          </div>

          {booking.extras.length > 0 && (
            <div>
              <h4 style={{ margin: '0 0 8px', fontSize: '0.85rem', color: 'var(--ink-500)' }}>EXTRAS</h4>
              {booking.extras.map((e, i) => (
                <div className="drawer-row" key={i}>
                  <small>{e.kind === 'paid' ? 'Pago' : 'Gratuito'}</small>
                  <strong>
                    {e.name}
                    {e.kind === 'paid' && ` · ${formatUsd(e.price)}`}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </div>

        {cancelMode && canCancel && (
          <div style={{ padding: '0 18px 12px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Motivo de cancelación *</label>
            <textarea
              className="af-field"
              style={{
                border: '1px solid var(--border)',
                borderRadius: 9,
                padding: '10px 12px',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                minHeight: 64,
                marginTop: 6,
              }}
              value={cancelReason}
              onChange={(e) => onCancelReason(e.target.value)}
              placeholder="Ej: el cliente pidió mover la fecha"
            />
          </div>
        )}

        <div className="admin-drawer__foot">
          {booking.status === 'pendiente_pago' && (
            <>
              <button className="btn btn--primary btn--sm" disabled={busy} onClick={() => onChangeStatus('confirmada')}>
                Confirmar pago
              </button>
              <button className="btn btn--ghost btn--sm" disabled={busy} onClick={onToggleCancel}>
                Cancelar reserva
              </button>
            </>
          )}
          {cancelMode && canCancel && (
            <button
              className="btn btn--sm"
              style={{ background: 'var(--danger)', color: '#fff', borderColor: 'var(--danger)' }}
              disabled={busy || !cancelReason.trim()}
              onClick={() => onChangeStatus('cancelada')}
            >
              {busy ? '…' : 'Confirmar cancelación'}
            </button>
          )}
          {booking.status === 'confirmada' && (
            <>
              <button className="btn btn--primary btn--sm" disabled={busy} onClick={() => onChangeStatus('completada')}>
                Marcar completada
              </button>
              <button className="btn btn--ghost btn--sm" disabled={busy} onClick={onToggleCancel}>
                Cancelar reserva
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
