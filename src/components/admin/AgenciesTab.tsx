'use client';

import { useConfirm } from './ConfirmDialog';
import Link from 'next/link';
import { useState } from 'react';
import { agencies, transfers } from '@/lib/admin/commerce';
import { bookings } from '@/lib/admin/bookings';
import { deleteRow, messageOf } from '@/lib/admin/core';
import { useAdminData } from '@/lib/admin/hooks';
import { bob, dateLabel, usd, statusLabels } from '@/lib/admin/format';
import type { Agency } from '@/lib/admin/types';
import { Field, LoadState, Metrics, Modal, Notice, Pill } from './AdminShared';
import AgencyForm, { companyTypes } from './AgencyForm';
import EmptyState from './EmptyState';

export default function AgenciesTab() {
  const confirm = useConfirm();
  const list = useAdminData(agencies);
  const [search, setSearch] = useState('');
  const [active, setActive] = useState('');
  const [editing, setEditing] = useState<Agency | null | undefined>();
  const [detail, setDetail] = useState<Agency | null>(null);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const filtered = list.data?.filter(a => (!active || a.active === (active === 'yes')) && `${a.company} ${a.contact} ${a.phone} ${a.email}`.toLowerCase().includes(search.trim().toLowerCase())) ?? [];
  async function remove(a: Agency) {
    await confirm({

      title: 'Eliminar agencia',

      message: '¿Eliminar ' + a.company + '? Si tiene movimientos vinculados, puedes desactivarla desde Editar.',

      confirmLabel: 'Eliminar agencia',

      destructive: true,

      onConfirm: async () => {
        setBusy(true);
        setError('');
        try {
          await deleteRow('agencies', a.id);
          setOk('Agencia eliminada.');
          await list.reload();
        } catch (err) {
          setError(messageOf(err));
        } finally {
          setBusy(false);
        }
      },

    });
  }
  return <>
    <div className="admin-header">
      <div>
        <h1>Agencias de viaje</h1>
        <p>Contactos comerciales y cuentas por cobrar o pagar.</p>
      </div>
      <button className="btn btn--primary" onClick={() => setEditing(null)}>Añadir agencia</button>
    </div>
    <div className="admin-card">
      <div className="ops-grid">
        <Field label="Buscar empresa o contacto">
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </Field>
        <Field label="Estado">
          <select value={active} onChange={e => setActive(e.target.value)}>
            <option value="">Todas</option>
            <option value="yes">Activas</option>
            <option value="no">Inactivas</option>
          </select>
        </Field>
      </div>
    </div>
    <Notice error={error} success={ok} />
    <LoadState
      emptyImage="agencies"
      emptyAction={{ label: 'Añadir agencia', onClick: () => setEditing(null) }}
      loading={list.loading}
      error={list.error}
      empty={!filtered.length}
      onRetry={() => void list.reload()}
      label="Añade una agencia para registrar pases y endosos."
    />
    {!list.loading && !list.error
      && <table className="ops-ledger">
        <thead>
          <tr>
            <th>Empresa</th>
            <th>Contacto</th>
            <th>Teléfono / email</th>
            <th>Tipo</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(a => <tr key={a.id}>
            <td data-label="Empresa">
              <button className="btn btn--ghost btn--sm" onClick={() => setDetail(a)}>
                {a.company}
              </button>
            </td>
            <td data-label="Contacto">
              {a.contact || '—'}
            </td>
            <td data-label="Contactar">
              <span className="ops-wrap">
                {a.phone}
                <br />
                {a.email}
              </span>
            </td>
            <td data-label="Tipo">
              {companyTypes[a.company_type]}
            </td>
            <td data-label="Estado">
              <Pill tone={a.active ? 'green' : 'gray'}>
                {a.active ? 'Activa' : 'Inactiva'}
              </Pill>
            </td>
            <td data-label="Acciones">
              <div className="ops-actions">
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => setEditing(a)}
                  disabled={busy}
                >Editar</button>
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => void remove(a)}
                  disabled={busy}
                >Eliminar</button>
              </div>
            </td>
          </tr>)}
        </tbody>
      </table>}
    {editing !== undefined
      && <AgencyForm
        agency={editing}
        onClose={() => setEditing(undefined)}
        onSaved={() => {
          setEditing(undefined);
          setOk('Agencia guardada.');
          void list.reload();
        }}
      />}
    {detail && <AgencyDetail agency={detail} onClose={() => setDetail(null)} />}
  </>;
}
function AgencyDetail({ agency: a, onClose }: {
  agency: Agency;
  onClose: () => void;
}) {
  const history = useAdminData(async () => {
    const [moves, reservations] = await Promise.all([transfers(), bookings()]);
    return { moves: moves.filter(t => t.agency_id === a.id), reservations: reservations.filter(r => r.agency_id === a.id) };
  }, [a.id]);
  const sum = (kind: 'pase' | 'endoso', currency: 'BOB' | 'USD') => (history.data?.moves ?? []).filter(t => t.kind === kind && t.currency === currency && t.status === 'pendiente').reduce((s, t) => s + Number(t.amount), 0);
  return <Modal
    title={a.company}
    onClose={onClose}
    wide
  >
    <p>{a.contact} · {a.phone}</p>
    <p className="ops-wrap">{a.email} · {a.address}</p>
    {a.other_contacts.map((c, i) => <p className="ops-form-note" key={i}>{c.name} · {c.phone} · {c.email}</p>)}
    {a.notes && <p className="ops-wrap">
      {a.notes}
    </p>}
    <LoadState
      loading={history.loading}
      error={history.error}
      empty={false}
      onRetry={() => void history.reload()}
    />
    {history.data
      && <>
        <Metrics items={[
          { label: 'Pases · nos debe (BOB)', value: bob(sum('pase', 'BOB')) },
          { label: 'Endosos · debemos (BOB)', value: bob(sum('endoso', 'BOB')) },
          { label: 'Pases pendientes (USD)', value: usd(sum('pase', 'USD')) },
          { label: 'Endosos pendientes (USD)', value: usd(sum('endoso', 'USD')) }
        ]} />
        <p className="ops-form-note">Los saldos corresponden a pases y endosos. Las reservas vinculadas se muestran por separado para evitar contar dos veces una deuda.</p>
        <section>
          <h3>Reservas vinculadas</h3>
          {!history.data.reservations.length
            && <EmptyState
              compact
              title="Sin reservas vinculadas"
              text="Las reservas de esta agencia aparecerán aquí."
              action={{ label: 'Ver reservas', href: '/admin?tab=reservas' }}
            />}
          {history.data.reservations.map(r => <div className="drawer-row" key={r.id}>
            <small>
              <Link href={`/admin?tab=reservas&booking=${r.id}`}>{r.code} · {r.tour?.title}</Link>
              <br />
              {dateLabel(r.date_row?.date || '')}
            </small>
            <strong>
              {usd(r.total)}
              <span className="cell-sub">
                {statusLabels[r.status]}
              </span>
            </strong>
          </div>)}
        </section>
        <section>
          <h3>Pases y endosos</h3>
          {!history.data.moves.length
            && <EmptyState
              compact
              title="Sin movimientos registrados"
              text="Registra los pases o endosos de esta agencia."
              action={{ label: 'Ver pases', href: '/admin?tab=pases' }}
            />}
          {history.data.moves.map(t => <div className="drawer-row" key={t.id}>
            <small><Link href={`/admin?tab=${t.kind === 'pase' ? 'pases' : 'endosos'}&agency=${a.id}`}>
              {t.kind === 'pase' ? 'Pase · por cobrar' : 'Endoso · por pagar'}
            </Link><br />{dateLabel(t.travel_date)} · {t.service} · {t.pax} pax</small>
            <strong>
              {t.currency === 'BOB' ? bob(t.amount) : usd(t.amount)}
              <span className="cell-sub">
                {t.status === 'pagado' ? 'Pagado' : 'Pendiente'}
              </span>
            </strong>
          </div>)}
        </section>
      </>}
  </Modal>;
}
