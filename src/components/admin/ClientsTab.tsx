'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  fetchAdminClients,
  fetchClientBookings,
  type AdminClientRow,
  type ClientBooking,
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
    ? new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

const initialsOf = (name: string): string =>
  (name || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export default function ClientsTab() {
  const [clients, setClients] = useState<AdminClientRow[] | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AdminClientRow | null>(null);
  const [history, setHistory] = useState<ClientBooking[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAdminClients(getSupabase())
      .then(setClients)
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'No se pudieron cargar los clientes.');
        setClients([]);
      });
  }, []);

  const filtered = useMemo(() => {
    if (!clients) return [];
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => `${c.full_name} ${c.email ?? ''} ${c.phone}`.toLowerCase().includes(q));
  }, [clients, search]);

  const openDetail = (c: AdminClientRow) => {
    setSelected(c);
    setHistory(null);
    fetchClientBookings(getSupabase(), c.id)
      .then(setHistory)
      .catch(() => setHistory([]));
  };

  if (clients === null && !error) {
    return <p style={{ color: 'var(--ink-500)' }}>Cargando clientes…</p>;
  }

  return (
    <>
      <div className="admin-header">
        <div>
          <h1>Clientes</h1>
          <p>
            {filtered.length} {filtered.length === 1 ? 'cuenta registrada' : 'cuentas registradas'}
          </p>
        </div>
      </div>

      <div className="admin-filters">
        <input
          type="search"
          placeholder="Buscar por nombre o email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <div className="admin-alert admin-alert--error">{error}</div>}

      <div className="admin-table-wrap">
        <table className="admin-table admin-table--cards">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Registro</th>
              <th>Reservas</th>
              <th>Total gastado</th>
              <th>Última reserva</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="is-clickable" onClick={() => openDetail(c)}>
                <td className="cell-strong" data-label="Cliente">
                  <span className="admin-entity">
                    <span className="admin-avatar">{initialsOf(c.full_name)}</span>
                    <span className="admin-entity__meta">
                      {c.full_name || 'Sin nombre'}
                      <span className="cell-sub">{c.email ?? '—'}</span>
                    </span>
                  </span>
                </td>
                <td data-label="Registro">{fmtDateTime(c.created_at)}</td>
                <td data-label="Reservas">{c.reservations_count}</td>
                <td className="cell-strong" data-label="Total gastado">{formatUsd(c.total_spent)}</td>
                <td data-label="Última reserva">{fmtDateTime(c.last_reservation_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="admin-empty">
            <strong>Sin resultados</strong>
            Todavía no hay cuentas que coincidan.
          </div>
        )}
      </div>

      {selected && (
        <ClientDrawer
          client={selected}
          history={history}
          onClose={() => {
            setSelected(null);
            setHistory(null);
          }}
        />
      )}
    </>
  );
}

function ClientDrawer({
  client,
  history,
  onClose,
}: {
  client: AdminClientRow;
  history: ClientBooking[] | null;
  onClose: () => void;
}) {
  const spent = (history ?? []).reduce(
    (s, b) => s + (b.status === 'confirmada' || b.status === 'completada' ? b.total : 0),
    0,
  );

  return (
    <>
      <div className="admin-scrim" onClick={onClose}></div>
      <div className="admin-drawer" role="dialog" aria-label={`Cliente ${client.full_name}`}>
        <div className="admin-drawer__head">
          <h3>{client.full_name || 'Cliente'}</h3>
          <button className="admin-side__logout" onClick={onClose} title="Cerrar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="admin-drawer__body">
          <div>
            <div className="drawer-row">
              <small>Email</small>
              <strong>{client.email ?? '—'}</strong>
            </div>
            <div className="drawer-row">
              <small>Teléfono</small>
              <strong>{client.phone || '—'}</strong>
            </div>
            <div className="drawer-row">
              <small>Registrado</small>
              <strong>{fmtDateTime(client.created_at)}</strong>
            </div>
            <div className="drawer-row">
              <small>Reservas</small>
              <strong>{client.reservations_count}</strong>
            </div>
            <div className="drawer-row">
              <small>Total gastado</small>
              <strong>{formatUsd(client.total_spent)}</strong>
            </div>
          </div>

          <div>
            <h4 style={{ margin: '0 0 8px', fontSize: '0.85rem', color: 'var(--ink-500)' }}>
              HISTORIAL DE RESERVAS
            </h4>
            {history === null && <p className="af-hint">Cargando historial…</p>}
            {history !== null && history.length === 0 && (
              <p className="af-hint">Este cliente todavía no tiene reservas.</p>
            )}
            {history !== null && history.length > 0 && (
              <>
                {history.map((b) => {
                  const meta = STATUS_META[b.status];
                  return (
                    <div className="drawer-row" key={b.id}>
                      <small>
                        <span className="cell-strong">{b.code}</span>
                        <br />
                        {b.tour_title}
                        <br />
                        {fmtDate(b.tour_date)}
                      </small>
                      <strong>
                        {formatUsd(b.total)}
                        <br />
                        <span className={`badge-status ${meta.cls}`} style={{ marginTop: 4 }}>
                          <span className="dot"></span>
                          {meta.label}
                        </span>
                      </strong>
                    </div>
                  );
                })}
                <div className="drawer-row">
                  <small>Gastado (pagado)</small>
                  <strong>{formatUsd(spent)}</strong>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
