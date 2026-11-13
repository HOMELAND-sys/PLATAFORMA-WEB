'use client';

import { useState, type FormEvent } from 'react';
import { products, messageOf, saveRow } from '@/lib/admin/core';
import { agencies } from '@/lib/admin/commerce';
import { bookings } from '@/lib/admin/bookings';
import { useAdminData } from '@/lib/admin/hooks';
import { dateLabel, operatorDay } from '@/lib/admin/format';
import type { Transfer, TransferInput } from '@/lib/admin/types';
import { validateTransfer } from '@/lib/admin/validation';
import { Field, LoadState, Modal, Notice } from './AdminShared';

export default function TransferForm({ kind, transfer, onClose, onSaved }: {
  kind: 'pase' | 'endoso';
  transfer: Transfer | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<TransferInput>(transfer ? {
    kind: transfer.kind,
    agency_id: transfer.agency_id,
    reservation_id: transfer.reservation_id,
    travel_date: transfer.travel_date,
    tour_id: transfer.tour_id,
    service: transfer.service,
    pax: transfer.pax,
    names: transfer.names,
    amount: transfer.amount,
    currency: transfer.currency,
    status: transfer.status,
    notes: transfer.notes
  } : {
    kind,
    agency_id: '',
    reservation_id: null,
    travel_date: operatorDay(),
    tour_id: null,
    service: '',
    pax: 1,
    names: '',
    amount: 0,
    currency: 'BOB',
    status: 'pendiente',
    notes: ''
  });
  const catalog = useAdminData(async () => {
    const [partners, tours, reservations] = await Promise.all([agencies(), products(), bookings()]);
    return { partners, tours, reservations };
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = <K extends keyof TransferInput>(key: K, value: TransferInput[K]) => setForm(old => ({ ...old, [key]: value }));
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      validateTransfer(form);
      if (!form.service.trim())
        throw new Error('El servicio es obligatorio.');
      await saveRow('agency_transfers', { ...form, service: form.service.trim() }, transfer?.id);
      onSaved();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }
  return <Modal
    title={`${transfer ? 'Editar' : 'Añadir'} ${kind}`}
    onClose={() => {
      if (!busy)
        onClose();
    }}
    wide
  >
    <p className="ops-form-note">
      {kind === 'pase' ? 'La agencia envía pasajeros y Homeland opera. La agencia nos debe.' : 'Homeland envía pasajeros a otro operador. Nosotros le debemos.'}
    </p>
    <LoadState
      loading={catalog.loading}
      error={catalog.error}
      empty={Boolean(catalog.data && !catalog.data.partners.length)}
      onRetry={() => void catalog.reload()}
      label="Crea primero una agencia en Clientes → Agencias."
    />
    {catalog.data && !catalog.loading && !catalog.error && catalog.data.partners.length > 0
      && <form onSubmit={save}>
        <Notice error={error} />
        <fieldset disabled={busy} className="ops-fieldset">
          <div className="ops-grid">
            <Field label={kind === 'pase' ? 'Agencia que nos debe' : 'Operador al que debemos'}>
              <select
                required
                value={form.agency_id}
                onChange={e => set('agency_id', e.target.value)}
              >
                <option value="">Seleccionar cliente</option>
                {catalog.data.partners.filter(a => a.active || a.id === form.agency_id).map(a => <option key={a.id} value={a.id}>
                  {a.company}
                  {!a.active ? ' (inactiva)' : ''}
                </option>)}
              </select>
            </Field>
            <Field label="Reserva vinculada (opcional)">
              <select value={form.reservation_id ?? ''} onChange={e => {
                const r = catalog.data?.reservations.find(b => b.id === e.target.value);
                setForm(old => ({
                  ...old, reservation_id: r?.id ?? null, ...(r ? {
                    travel_date: r.date_row?.date || old.travel_date,
                    tour_id: r.tour_id,
                    service: r.tour?.title || old.service,
                    pax: r.pax,
                    names: r.passengers.map(p => p.name).join('\n')
                  } : {})
                }));
              }}>
                <option value="">Sin reserva</option>
                {catalog.data.reservations.map(r => <option key={r.id} value={r.id}>{r.code} · {r.client_name} · {dateLabel(r.date_row?.date || '')}</option>)}
              </select>
            </Field>
            <Field label="Fecha de viaje">
              <input
                required
                type="date"
                value={form.travel_date}
                onChange={e => set('travel_date', e.target.value)}
              />
            </Field>
            <Field label="Tour (opcional)">
              <select value={form.tour_id ?? ''} onChange={e => {
                const t = catalog.data?.tours.find(t => t.id === e.target.value);
                setForm(old => ({ ...old, tour_id: t?.id ?? null, service: t?.title ?? old.service }));
              }}>
                <option value="">Servicio externo / sin tour</option>
                {catalog.data.tours.map(t => <option key={t.id} value={t.id}>
                  {t.title}
                </option>)}
              </select>
            </Field>
            <Field label="Servicio">
              <input
                required
                value={form.service}
                onChange={e => set('service', e.target.value)}
              />
            </Field>
            <Field label="Nº PAX">
              <input
                required
                type="number"
                min={1}
                max={10000}
                value={form.pax}
                onChange={e => set('pax', Number(e.target.value))}
              />
            </Field>
            <Field label="Nombres de pasajeros" wide>
              <textarea
                value={form.names}
                onChange={e => set('names', e.target.value)}
                placeholder="Un nombre por línea"
              />
            </Field>
            <Field label={`Monto (${form.currency === 'BOB' ? 'Bs.' : 'USD'})`}>
              <input
                required
                type="number"
                min={0}
                max={99999999.99}
                step="0.01"
                value={form.amount}
                onChange={e => set('amount', Number(e.target.value))}
              />
            </Field>
            <Field label="Moneda">
              <select value={form.currency} onChange={e => set('currency', e.target.value as 'BOB' | 'USD')}>
                <option value="BOB">BOB · Bolivianos</option>
                <option value="USD">USD · Dólares</option>
              </select>
            </Field>
            <Field label="Estado">
              <select value={form.status} onChange={e => set('status', e.target.value as 'pendiente' | 'pagado')}>
                <option value="pendiente">Pendiente</option>
                <option value="pagado">Pagado</option>
              </select>
            </Field>
            <Field label="Notas" wide>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)} />
            </Field>
          </div>
          <div className="ops-actions">
            <button disabled={busy} className="btn btn--primary">
              {busy ? 'Guardando…' : 'Guardar registro'}
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              disabled={busy}
              onClick={onClose}
            >Cancelar</button>
          </div>
        </fieldset>
      </form>}
  </Modal>;
}
