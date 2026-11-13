'use client';

import { useState } from 'react';
import { CONTACT_FIELDS, listContactRequests, setContactStatus, type ContactRequest } from '@/lib/contact';
import { useAdminData } from '@/lib/admin/hooks';
import { telHref } from '@/lib/site';
import { LoadState, Notice, Pill } from './AdminShared';

export default function ContactRequestsTab() {
  const list = useAdminData(listContactRequests);
  const [status, setStatus] = useState<ContactRequest['status']>('new');
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const rows = (list.data ?? []).filter((row) => row.status === status);
  async function update(row: ContactRequest) {
    setBusyId(row.id);
    setError('');
    try {
      await setContactStatus(row.id, row.status === 'new' ? 'contacted' : 'new');
      await list.reload();
    } catch {
      setError('No se pudo actualizar la consulta. Intenta de nuevo.');
    } finally {
      setBusyId('');
    }
  }
  return <>
    <div className="admin-header"><div><h1>Consultas</h1><p>Solicitudes de viajes a medida y alianzas comerciales. Últimas 200 consultas.</p></div></div>
    <div className="ops-tabs" aria-label="Estado de las consultas">
      <button className={status === 'new' ? 'is-active' : ''} onClick={() => setStatus('new')}>Por atender</button>
      <button className={status === 'contacted' ? 'is-active' : ''} onClick={() => setStatus('contacted')}>Atendidas</button>
    </div>
    <Notice error={error} />
    <LoadState loading={list.loading} error={list.error} empty={!rows.length} onRetry={() => void list.reload()} label="No hay consultas en este estado." />
    {!list.loading && !list.error && <div className="rvw-list">{rows.map((row) => <article className="admin-card rvw-card" key={row.id}>
      <header className="rvw-card__head"><div><h2>{row.full_name}</h2><p>{new Date(row.created_at).toLocaleString('es-BO', { timeZone: 'America/La_Paz' })}</p></div><Pill tone={row.source === 'business' ? 'amber' : 'green'}>{row.source === 'business' ? 'Alianza comercial' : 'Viaje a medida'}</Pill></header>
      <p><a href={`mailto:${encodeURIComponent(row.email)}`}>{row.email}</a> · <a href={telHref(row.phone)}>{row.phone}</a></p>
      <dl>{Object.entries(row.details).filter(([key]) => key in CONTACT_FIELDS).map(([key, value]) => <div key={key} style={{ marginBottom: 10 }}><dt><strong>{CONTACT_FIELDS[key]}</strong></dt><dd style={{ margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{String(value)}</dd></div>)}</dl>
      <button className="btn btn--ghost btn--sm" disabled={Boolean(busyId)} onClick={() => void update(row)}>{busyId === row.id ? 'Guardando…' : row.status === 'new' ? 'Marcar atendida' : 'Volver a pendientes'}</button>
    </article>)}</div>}
  </>;
}
