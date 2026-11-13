'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  type AdminClientRow,
  type ClientBooking,
} from '@/lib/api';
import { clients as fetchClients, clientBookings } from '@/lib/admin/clients';
import { messageOf } from '@/lib/admin/core';
import { formatUsd } from '@/lib/pricing';
import Icon from '@/components/ui/Icon';
import AgenciesTab from './AgenciesTab';
import EmptyState from './EmptyState';

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pendiente_pago: { label: 'Pendiente de pago', cls: 'badge-status--amber' },
  confirmada: { label: 'Confirmada', cls: 'badge-status--green' },
  completada: { label: 'Completada', cls: 'badge-status--green' },
  cancelada: { label: 'Cancelada', cls: 'badge-status--red' },
};

const fmtDate = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString('es-ES', { timeZone: 'America/La_Paz', day: '2-digit', month: 'short', year: 'numeric' });

const fmtDateTime = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString('es-ES', { timeZone: 'America/La_Paz', day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

const initialsOf = (name: string): string =>
  (name || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

function TravelersTab() {
  const params=useSearchParams();
  const historyRequest=useRef(0);
  const [historyError,setHistoryError]=useState('');
  const [clients, setClients] = useState<AdminClientRow[] | null>(null);
  const [search, setSearch] = useState(params.get('q')||'');
  useEffect(()=>setSearch(params.get('q')||''),[params]);
  const [selected, setSelected] = useState<AdminClientRow | null>(null);
  const [history, setHistory] = useState<ClientBooking[] | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setClients(null); setError('');
    fetchClients()
      .then(rows => { if (active) setClients(rows); })
      .catch((e) => {
        if (!active) return;
        setError(messageOf(e));
        setClients([]);
      });
    return () => { active = false; historyRequest.current++; };
  }, [revision]);

  const filtered = useMemo(() => {
    if (!clients) return [];
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => `${c.full_name} ${c.email ?? ''} ${c.phone}`.toLowerCase().includes(q));
  }, [clients, search]);

  const openDetail = (c: AdminClientRow) => {
    setSelected(c);
    setHistory(null); setHistoryError('');
    const request=++historyRequest.current;
    clientBookings(c.id)
      .then(rows=>{if(request===historyRequest.current)setHistory(rows);})
      .catch(()=>{if(request===historyRequest.current){setHistoryError('No se pudo cargar el historial. Cierra la ficha y vuelve a abrirla.');setHistory([]);}});
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

      {error && <div className="admin-alert admin-alert--error" role="alert">{error} <button className="btn btn--ghost btn--sm" onClick={() => setRevision(value => value + 1)}>Reintentar</button></div>}

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
              <tr key={c.id} className="is-clickable" tabIndex={0} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openDetail(c); } }} onClick={() => openDetail(c)}>
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
        {!error && filtered.length === 0 && (
          <EmptyState image="generic" title="Sin resultados" text="Todavía no hay cuentas que coincidan." action={{label:'Limpiar búsqueda',onClick:()=>setSearch('')}}/>

        )}
      </div>

      {selected && (
        <ClientDrawer
          client={selected}
          history={history}
          error={historyError}
          onClose={() => {
            historyRequest.current++; setSelected(null);
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
  error,
  onClose,
}: {
  client: AdminClientRow;
  history: ClientBooking[] | null;
  error: string;
  onClose: () => void;
}) {
  const spent = (history ?? []).reduce(
    (s, b) => s + (b.status === 'confirmada' || b.status === 'completada' ? Number(b.total) : 0),
    0,
  );

  return (
    <>
      <div className="admin-scrim" onClick={onClose}></div>
      <div className="admin-drawer" role="dialog" aria-label={`Cliente ${client.full_name}`}>
        <div className="admin-drawer__head">
          <h3>{client.full_name || 'Cliente'}</h3>
          <button className="admin-side__logout" onClick={onClose} title="Cerrar">
            <Icon name="close" size={18} />
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
            {error && <div className="admin-alert admin-alert--error" role="alert">{error}</div>}
            {history === null && <p className="af-hint">Cargando historial…</p>}
            {!error && history !== null && history.length === 0 && (
              <EmptyState compact title="Sin reservas" text="Este cliente todavía no tiene reservas." action={{label:'Ver reservas',href:'/admin?tab=reservas'}}/>
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

export default function ClientsTab() {
  const [tab, setTab] = useState('travelers');
  return <><div className="ops-tabs" aria-label="Tipo de cliente"><button className={tab==='travelers'?'is-active':''} onClick={()=>setTab('travelers')}>Viajeros</button><button className={tab==='agencies'?'is-active':''} onClick={()=>setTab('agencies')}>Agencias</button></div>{tab==='travelers'?<TravelersTab/>:<AgenciesTab/>}</>;
}
