'use client';

import { useState, type FormEvent } from 'react';
import type { Offer, OfferInput } from '@/lib/admin/types';
import { products, messageOf, saveRow } from '@/lib/admin/core';
import { useAdminData } from '@/lib/admin/hooks';
import { operatorDay, shiftDay } from '@/lib/admin/format';
import { validateOffer } from '@/lib/admin/validation';
import { Field, LoadState, Modal, Notice } from './AdminShared';
export const offerKinds: Record<string, string> = { limited: 'Oferta por tiempo limitado', early_bird: 'Reserva anticipada', last_minute: 'Última hora' };

export default function OfferForm({ offer, onClose, onSaved }: {
  offer: Offer | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const catalog = useAdminData(products);
  const [form, setForm] = useState<OfferInput>(offer ? {
    name: offer.name,
    tour_ids: offer.tour_ids,
    kind: offer.kind,
    discount_pct: offer.discount_pct,
    activity_from: offer.activity_from,
    activity_to: offer.activity_to,
    weekdays: offer.weekdays,
    start_times: offer.start_times,
    booking_notice_days: offer.booking_notice_days,
    seats_limit: offer.seats_limit,
    status: offer.status
  } : {
    name: '',
    tour_ids: [],
    kind: 'limited',
    discount_pct: 10,
    activity_from: operatorDay(),
    activity_to: shiftDay(operatorDay(), 30),
    weekdays: null,
    start_times: null,
    booking_notice_days: null,
    seats_limit: null,
    status: 'active'
  });
  const [times, setTimes] = useState(offer?.start_times?.join(', ') || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = <K extends keyof OfferInput>(key: K, value: OfferInput[K]) => setForm(old => ({ ...old, [key]: value }));
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      validateOffer(form, offer?.seats_sold ?? 0);
      const hours = [...new Set(times.split(/[\s,;]+/).filter(Boolean))];
      if (hours.some(t => !/^([01]\d|2[0-3]):[0-5]\d$/.test(t)))
        throw new Error('Las horas deben tener formato HH:MM.');
      if (!form.tour_ids.length)
        throw new Error('Selecciona al menos un tour.');
      if (!form.name.trim())
        throw new Error('El nombre interno es obligatorio.');
      if (form.weekdays?.length === 0)
        throw new Error('Selecciona algún día o desactiva el filtro semanal.');
      if (form.seats_limit !== null && form.seats_limit < (offer?.seats_sold ?? 0))
        throw new Error('El límite no puede ser menor que las plazas vendidas.');
      await saveRow('special_offers', {
        ...form,
        name: form.name.trim(),
        start_times: hours.length ? hours : null,
        booking_notice_days: form.kind === 'limited' ? null : form.booking_notice_days
      }, offer?.id);
      onSaved();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }
  return <Modal
    title={offer ? 'Editar oferta especial' : 'Crear oferta especial'}
    onClose={() => {
      if (!busy)
        onClose();
    }}
    wide
  >
    <LoadState
      loading={catalog.loading}
      error={catalog.error}
      empty={Boolean(catalog.data && !catalog.data.length)}
      onRetry={() => void catalog.reload()}
      label="Primero crea un producto."
    />
    {catalog.data && !catalog.loading && !catalog.error && catalog.data.length > 0
      && <form onSubmit={save}>
        <Notice error={error} />
        <fieldset disabled={busy} className="ops-fieldset">
          <div className="ops-grid">
            <Field label="Nombre interno">
              <input
                required
                value={form.name}
                maxLength={180}
                onChange={e => set('name', e.target.value)}
              />
            </Field>
            <Field label="Tipo de oferta">
              <select value={form.kind} onChange={e => setForm(old => ({ ...old, kind: e.target.value as OfferInput['kind'], booking_notice_days: e.target.value === 'limited' ? null : old.booking_notice_days ?? 7 }))}>
                {Object.entries(offerKinds).map(([k, v]) => <option key={k} value={k}>
                  {v}
                </option>)}
              </select>
            </Field>
            <Field label="Actividad desde">
              <input
                required
                type="date"
                max={form.activity_to}
                value={form.activity_from}
                onChange={e => set('activity_from', e.target.value)}
              />
            </Field>
            <Field label="Actividad hasta">
              <input
                required
                type="date"
                min={form.activity_from}
                value={form.activity_to}
                onChange={e => set('activity_to', e.target.value)}
              />
            </Field>
            <Field label="Descuento (%)">
              <input
                required
                type="number"
                min={1}
                max={90}
                value={form.discount_pct}
                onChange={e => set('discount_pct', Number(e.target.value))}
              />
            </Field>
            {form.kind !== 'limited'
              && <Field label={form.kind === 'early_bird' ? 'Aviso mínimo antes del viaje (días)' : 'Solo dentro de estos días antes del viaje'}>
                <input
                  required
                  type="number"
                  min={1}
                  max={3660}
                  value={form.booking_notice_days ?? ''}
                  onChange={e => set('booking_notice_days', Number(e.target.value))}
                />
              </Field>}
            <Field label="Plazas con descuento (vacío = sin límite)">
              <input
                type="number"
                min={Math.max(1, offer?.seats_sold ?? 0)}
                max={1000000}
                value={form.seats_limit ?? ''}
                onChange={e => set('seats_limit', e.target.value === '' ? null : Number(e.target.value))}
              />
            </Field>
            <Field label="Estado">
              <select value={form.status} onChange={e => set('status', e.target.value as 'active' | 'paused')}>
                <option value="active">Activa</option>
                <option value="paused">Pausada</option>
              </select>
            </Field>
            <Field label="Horas opcionales (HH:MM, separadas por comas)" wide>
              <input
                value={times}
                placeholder="Todas las horas"
                onChange={e => setTimes(e.target.value)}
              />
            </Field>
          </div>
          <section>
            <h3>Productos incluidos</h3>
            <div className="ops-grid">
              {catalog.data.map(t => <label className="ops-check" key={t.id}>
                <input
                  type="checkbox"
                  checked={form.tour_ids.includes(t.id)}
                  onChange={e => set('tour_ids', e.target.checked ? [...form.tour_ids, t.id] : form.tour_ids.filter(id => id !== t.id))}
                />
                {t.title}
                {!t.active ? ' (inactivo)' : ''}
              </label>)}
            </div>
          </section>
          <section>
            <label className="ops-check"><input
              type="checkbox"
              checked={form.weekdays !== null}
              onChange={e => set('weekdays', e.target.checked ? [0, 1, 2, 3, 4, 5, 6] : null)}
            />Limitar a días de semana</label>
            {form.weekdays !== null
              && <div className="ops-toolbar">
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((label, i) => <label className="ops-check" key={i}>
                  <input
                    type="checkbox"
                    checked={form.weekdays?.includes(i) ?? false}
                    onChange={e => set('weekdays', e.target.checked ? [...(form.weekdays ?? []), i] : (form.weekdays ?? []).filter(n => n !== i))}
                  />
                  {label}
                </label>)}
              </div>}
          </section>
          <p className="ops-form-note">{offer?.seats_sold ?? 0} plazas vendidas. Las condiciones se expresan en hora de Bolivia. El estado caducada se calcula a partir de la fecha de fin.</p>
          <div className="ops-actions">
            <button className="btn btn--primary" disabled={busy}>
              {busy ? 'Guardando…' : 'Guardar oferta'}
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
