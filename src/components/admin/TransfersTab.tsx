'use client';

import { useConfirm } from './ConfirmDialog';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { agencies, transfers } from '@/lib/admin/commerce';
import { deleteRow, messageOf, saveRow } from '@/lib/admin/core';
import { useAdminData } from '@/lib/admin/hooks';
import { downloadCsv, exportTable } from '@/lib/admin/exports';
import { bob, dateLabel, operatorDay, usd } from '@/lib/admin/format';
import type { Transfer } from '@/lib/admin/types';
import { Field, LoadState, Metrics, Notice, Pill } from './AdminShared';
import TransferForm from './TransferForm';

export default function TransfersTab({ kind }: {
  kind: 'pase' | 'endoso';
}) {
  const confirm = useConfirm();
  const params = useSearchParams();
  const list = useAdminData(async () => {
    const [rows, partners] = await Promise.all([transfers(kind), agencies()]);
    return { rows, partners };
  }, [kind]);
  const [agency, setAgency] = useState(params.get('agency') || '');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [currency, setCurrency] = useState('BOB');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState<Transfer | null | undefined>();
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const title = kind === 'pase' ? 'Pases' : 'Endosos';
  useEffect(() => setAgency(params.get('agency') || ''), [params]);
  const filtered = (list.data?.rows ?? []).filter(t => (!agency || t.agency_id === agency) && (!from || t.travel_date >= from) && (!to || t.travel_date <= to) && t.currency === currency
    && (!status || t.status === status));
  const money = currency === 'BOB' ? bob : usd;
  async function change(row: Transfer) {
    const next = row.status === 'pagado' ? 'pendiente' : 'pagado';
    await confirm({

      title: 'Actualizar estado de pago',

      message: '¿Marcar como ' + next + ' el ' + kind + ' de ' + row.service + ' por ' + money(row.amount) + '?',

      confirmLabel: next === 'pagado' ? 'Marcar pagado' : 'Marcar pendiente',

      onConfirm: async () => {
        setBusy(true);
        setError('');
        try {
          await saveRow('agency_transfers', { status: next }, row.id);
          setOk('Estado actualizado.');
          await list.reload();
        } catch (err) {
          setError(messageOf(err));
        } finally {
          setBusy(false);
        }
      },

    });
  }
  async function remove(row: Transfer) {
    await confirm({

      title: 'Eliminar ' + kind,

      message: '¿Eliminar el ' + kind + ' de ' + row.service + '?',

      confirmLabel: 'Eliminar ' + kind,

      destructive: true,

      onConfirm: async () => {
        setBusy(true);
        setError('');
        try {
          await deleteRow('agency_transfers', row.id);
          setOk('Registro eliminado.');
          await list.reload();
        } catch (err) {
          setError(messageOf(err));
        } finally {
          setBusy(false);
        }
      },

    });
  }
  function exportData(format: 'csv' | 'pdf') {
    setError('');
    try {
      const names = new Map(list.data?.partners.map(a => [a.id, a.company]));
      const head = [
        'Fecha de viaje',
        'Agencia',
        'Servicio',
        'Nº PAX',
        'Nombres',
        `Monto (${currency === 'BOB' ? 'Bs.' : 'USD'})`,
        'Estado'
      ];
      const rows = filtered.map(t => [
        t.travel_date,
        names.get(t.agency_id) || '',
        t.service,
        t.pax,
        t.names,
        Number(t.amount),
        t.status === 'pagado' ? 'Pagado' : 'Pendiente'
      ]);
      const totals = ['TOTAL', '', '', filtered.reduce((s, t) => s + t.pax, 0), '', filtered.reduce((s, t) => s + Number(t.amount), 0), ''];
      const notes = `${kind === 'pase' ? 'Agencias nos deben' : 'Debemos a operadores'} · ${names.get(agency) || 'Todos los clientes'} · ${from || 'sin inicio'} a ${to || 'sin fin'} · ${currency} · ${status || 'todos los estados'} · pagado: ${money(filtered.filter(t => t.status === 'pagado').reduce((s, t) => s + Number(t.amount), 0))} · pendiente: ${money(filtered.filter(t => t.status === 'pendiente').reduce((s, t) => s + Number(t.amount), 0))}`;
      if (format === 'csv')
        downloadCsv(`${kind}-${operatorDay()}.csv`, [[notes], head, ...rows, totals]);
      else
        exportTable(`Reporte de ${title}`, head, [...rows, totals], `${kind}-${operatorDay()}.pdf`, notes);
      setOk(`${filtered.length} registros exportados.`);
    } catch (err) {
      setError(messageOf(err));
    }
  }
  return <>
    <div className="admin-header">
      <div>
        <h1>Reportes {title.toLowerCase()}</h1>
        <p>
          {kind === 'pase' ? 'La agencia nos envía pasajeros, Homeland opera y la agencia nos debe.' : 'Enviamos pasajeros a otro operador y nosotros le debemos.'}
        </p>
      </div>
      <div className="admin-header__actions">
        <button
          className="btn btn--ghost"
          disabled={!filtered.length || list.loading || Boolean(list.error)}
          onClick={() => exportData('csv')}
        >Exportar CSV</button>
        <button
          className="btn btn--ghost"
          disabled={!filtered.length || list.loading || Boolean(list.error)}
          onClick={() => exportData('pdf')}
        >Exportar PDF</button>
        <button className="btn btn--primary" onClick={() => setEditing(null)}>Añadir {kind}</button>
      </div>
    </div>
    <div className="admin-card">
      <div className="ops-grid">
        <Field label="Filtrar por clientes">
          <select value={agency} onChange={e => setAgency(e.target.value)}>
            <option value="">Todas las agencias</option>
            {list.data?.partners.map(a => <option key={a.id} value={a.id}>
              {a.company}
            </option>)}
          </select>
        </Field>
        <Field label="Desde · viaje">
          <input
            type="date"
            max={to || undefined}
            value={from}
            onChange={e => setFrom(e.target.value)}
          />
        </Field>
        <Field label="Hasta · viaje">
          <input
            type="date"
            min={from || undefined}
            value={to}
            onChange={e => setTo(e.target.value)}
          />
        </Field>
        <Field label="Moneda">
          <select value={currency} onChange={e => setCurrency(e.target.value)}>
            <option value="BOB">BOB · Bs.</option>
            <option value="USD">USD · US$</option>
          </select>
        </Field>
        <Field label="Estado">
          <select value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="pagado">Pagado</option>
          </select>
        </Field>
      </div>
      <div className="ops-toolbar">
        <button className="btn btn--ghost btn--sm" onClick={() => void list.reload()}>Actualizar</button>
      </div>
    </div>
    <Notice error={error} success={ok} />
    <LoadState
      emptyImage="transfers"
      emptyAction={{ label: kind === 'pase' ? 'Añadir pase' : 'Añadir endoso', onClick: () => setEditing(null) }}
      loading={list.loading}
      error={list.error}
      empty={!filtered.length}
      onRetry={() => void list.reload()}
      label={`Todavía no hay ${title.toLowerCase()} en este rango.`}
    />
    {!list.loading && !list.error
      && <>
        <Metrics items={[
          { label: 'Total PAX', value: filtered.reduce((s, t) => s + t.pax, 0) },
          { label: 'Monto total', value: money(filtered.reduce((s, t) => s + Number(t.amount), 0)) },
          { label: 'Pagado', value: money(filtered.filter(t => t.status === 'pagado').reduce((s, t) => s + Number(t.amount), 0)) },
          { label: kind === 'pase' ? 'Pendiente por cobrar' : 'Pendiente por pagar', value: money(filtered.filter(t => t.status === 'pendiente').reduce((s, t) => s + Number(t.amount), 0)) }
        ]} />
        <table className="ops-ledger">
          <thead>
            <tr>
              <th>Fecha de viaje</th>
              <th>Cliente / servicio</th>
              <th>Nº PAX</th>
              <th>Nombres</th>
              <th>Monto ({currency === 'BOB' ? 'Bs.' : 'USD'})</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => <tr key={t.id}>
              <td data-label="Viaje">
                {dateLabel(t.travel_date)}
              </td>
              <td data-label="Servicio">
                <span>
                  {t.service}
                  <span className="cell-sub">
                    {list.data?.partners.find(a => a.id === t.agency_id)?.company}
                  </span>
                  {t.reservation_id && <a className="cell-sub" href={`/admin?tab=reservas&booking=${t.reservation_id}`}>Ver reserva vinculada</a>}
                </span>
              </td>
              <td data-label="Nº PAX">
                {t.pax}
              </td>
              <td data-label="Nombres">
                <span style={{ whiteSpace: 'pre-line' }}>
                  {t.names || '—'}
                </span>
              </td>
              <td data-label="Monto">
                {money(t.amount)}
              </td>
              <td data-label="Estado">
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  disabled={busy}
                  onClick={() => void change(t)}
                  title="Cambiar estado"
                >
                  <Pill tone={t.status === 'pagado' ? 'green' : 'amber'}>
                    {t.status === 'pagado' ? 'Pagado' : 'Pendiente'}
                  </Pill>
                </button>
              </td>
              <td data-label="Acciones">
                <div className="ops-actions">
                  <button
                    className="btn btn--ghost btn--sm"
                    disabled={busy}
                    onClick={() => setEditing(t)}
                  >Editar</button>
                  <button
                    className="btn btn--ghost btn--sm"
                    disabled={busy}
                    onClick={() => void remove(t)}
                  >Eliminar</button>
                </div>
              </td>
            </tr>)}
          </tbody>
        </table>
      </>}
    {editing !== undefined
      && <TransferForm
        kind={kind}
        transfer={editing}
        onClose={() => setEditing(undefined)}
        onSaved={() => {
          setEditing(undefined);
          setOk('Registro guardado.');
          void list.reload();
        }}
      />}
  </>;
}
