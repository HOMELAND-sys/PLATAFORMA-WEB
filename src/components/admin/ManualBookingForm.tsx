'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { products, messageOf } from '@/lib/admin/core';
import { agencies } from '@/lib/admin/commerce';
import { slots } from '@/lib/admin/slots';
import { manualBooking } from '@/lib/admin/bookings';
import { useAdminData } from '@/lib/admin/hooks';
import { operatorDay, dateLabel, usd, sourceLabels, methodLabels } from '@/lib/admin/format';
import { calcBookingTotals, EXCHANGE_RATE_BOB } from '@/lib/pricing';
import type { BookingSource, TourType } from '@/lib/types';
import { Field, LoadState, Modal, Notice } from './AdminShared';
const emptyPassenger = () => ({ name: '', doc: '', country: '', meal: 'Normal' });

export default function ManualBookingForm({ onClose, onSaved }: {
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const catalog = useAdminData(async () => {
    const [tours, partners] = await Promise.all([products(), agencies()]);
    return { tours: tours.filter(t => t.active), partners: partners.filter(a => a.active) };
  });
  const [source, setSource] = useState<Exclude<BookingSource, 'web'>>('oficina');
  const [agency, setAgency] = useState('');
  const [tour, setTour] = useState('');
  const [date, setDate] = useState(operatorDay());
  const [slot, setSlot] = useState('');
  const [type, setType] = useState<TourType>('group');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('Bolivia');
  const [passengers, setPassengers] = useState([emptyPassenger()]);
  const [override, setOverride] = useState(false);
  const [total, setTotal] = useState('');
  const [paid, setPaid] = useState(false);
  const [method, setMethod] = useState('efectivo');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const list = useAdminData(() => tour ? slots(date, date, tour) : Promise.resolve([]), [tour, date]);
  const product = catalog.data?.tours.find(t => t.id === tour);
  const pax = adults + children;
  useEffect(() => {
    setPassengers(old => Array.from({ length: Math.min(8, Math.max(0, pax)) }, (_, i) => old[i] ?? emptyPassenger()));
  }, [pax]);
  useEffect(() => {
    setSlot('');
  }, [tour, date]);
  const price = product?.[`price_${type}`];
  const calculated = useMemo(() => calcBookingTotals(Number(price ?? 0) * adults + Number(product?.price_child ?? price ?? 0) * children, pax), [price, product, adults, children, pax]);
  async function save(e: FormEvent) {
    e.preventDefault();
    if (busy)
      return;
    setError('');
    setBusy(true);
    try {
      if (list.loading || list.error || catalog.loading || catalog.error)
        throw new Error('Espera a que se carguen los productos y la disponibilidad.');
      if (!product || price === null || price === undefined)
        throw new Error('Elige un producto y modalidad con precio disponible.');
      if (pax < product.min_pax || pax > 8 || pax < 1)
        throw new Error(`Esta reserva requiere entre ${product.min_pax} y 8 participantes.`);
      const selected = list.data?.find(s => s.id === slot);
      if (!selected?.bookable || selected.free < pax)
        throw new Error('Selecciona una franja reservable con cupo suficiente.');
      const result = await manualBooking({
        p_slot_id: slot,
        p_tour_type: type,
        p_adults: adults,
        p_children: children,
        p_contact_name: name.trim(),
        p_contact_email: email.trim() || null,
        p_contact_phone: phone.trim(),
        p_contact_country: country.trim(),
        p_passengers: passengers.map(p => ({ ...p, country: p.country.trim() || country.trim() })),
        p_source: source,
        p_agency_id: source === 'agencia' ? agency : null,
        p_total: override ? Number(total) : null,
        p_paid: paid,
        p_payment_method: method,
        p_notes: notes.trim() || null
      });
      onSaved(result.id);
    } catch (err) {
      setError(messageOf(err));
      void list.reload();
    } finally {
      setBusy(false);
    }
  }
  return <Modal
    title="Añadir reserva manual"
    onClose={() => {
      if (!busy)
        onClose();
    }}
    wide
  >
    <LoadState
      loading={catalog.loading}
      error={catalog.error}
      empty={Boolean(catalog.data && !catalog.data.tours.length)}
      onRetry={() => void catalog.reload()}
      label="Primero crea y activa un producto."
    />
    {catalog.data && catalog.data.tours.length > 0
      && <form onSubmit={save}>
        <Notice error={error} />
        <fieldset disabled={busy} className="ops-fieldset">
          <div className="ops-grid">
            <Field label="Canal">
              <select value={source} onChange={e => setSource(e.target.value as typeof source)}>
                {Object.entries(sourceLabels).filter(([k]) => k !== 'web').map(([k, v]) => <option key={k} value={k}>
                  {v}
                </option>)}
              </select>
            </Field>
            {source === 'agencia'
              && <Field label="Agencia">
                <select
                  required
                  value={agency}
                  onChange={e => setAgency(e.target.value)}
                >
                  <option value="">Seleccionar agencia</option>
                  {catalog.data.partners.map(a => <option key={a.id} value={a.id}>
                    {a.company}
                  </option>)}
                </select>
              </Field>}
            <Field label="Producto">
              <select
                required
                value={tour}
                onChange={e => setTour(e.target.value)}
              >
                <option value="">Seleccionar producto</option>
                {catalog.data.tours.map(t => <option key={t.id} value={t.id}>
                  {t.title}
                </option>)}
              </select>
            </Field>
            <Field label="Fecha de viaje">
              <input
                required
                type="date"
                min={operatorDay()}
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </Field>
            <Field label="Franja · cupo libre">
              <select
                required
                value={slot}
                disabled={list.loading}
                onChange={e => setSlot(e.target.value)}
              >
                <option value="">
                  {list.loading ? 'Cargando…' : 'Seleccionar salida'}
                </option>
                {list.data?.map(s => <option
                  key={s.id}
                  value={s.id}
                  disabled={!s.bookable || s.free < pax}
                >{dateLabel(s.date)} · {s.start_time?.slice(0, 5) || 'Sin hora'} · {s.free} libres de {s.capacity}{s.blocked ? ' · Bloqueada' : !s.bookable ? ' · No reservable' : ''}</option>)}
              </select>
            </Field>
            <Field label="Modalidad">
              <select value={type} onChange={e => setType(e.target.value as TourType)}>
                {(['group', 'semi', 'private'] as const).map((k, i) => <option
                  key={k}
                  value={k}
                  disabled={Boolean(product && product[`price_${k}`] === null)}
                >
                  {['Compartido', 'Semiprivado', 'Privado'][i]}
                </option>)}
              </select>
            </Field>
            <Field label="Adultos">
              <input
                required
                type="number"
                min={0}
                max={8 - children}
                value={adults}
                onChange={e => setAdults(Number(e.target.value))}
              />
            </Field>
            <Field label={`Niños (hasta ${product?.child_age_max ?? 11} años)`}>
              <input
                required
                type="number"
                min={0}
                max={8 - adults}
                value={children}
                onChange={e => setChildren(Number(e.target.value))}
              />
            </Field>
            <Field label="Nombre de contacto">
              <input
                required
                maxLength={180}
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </Field>
            <Field label="Email (opcional)">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </Field>
            <Field label="Teléfono con código de país">
              <input
                required
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </Field>
            <Field label="País">
              <input
                required
                value={country}
                onChange={e => setCountry(e.target.value)}
                placeholder="Bolivia"
              />
            </Field>
          </div>
          <LoadState
            loading={list.loading && Boolean(tour)}
            error={list.error}
            empty={Boolean(tour && list.data && !list.data.length)}
            onRetry={() => void list.reload()}
            label="No hay franjas para esta fecha. Ábrelas en Disponibilidad."
          />
          <section>
            <h3>Pasajeros · {pax} de máximo 8</h3>
            {passengers.map((p, i) => <div className="admin-card" key={i}>
              <div className="ops-grid">
                <Field label={`Pasajero ${i + 1} · nombre`}>
                  <input
                    required
                    value={p.name}
                    onChange={e => setPassengers(old => old.map((x, n) => n === i ? { ...x, name: e.target.value } : x))}
                  />
                </Field>
                <Field label="Documento">
                  <input value={p.doc} onChange={e => setPassengers(old => old.map((x, n) => n === i ? { ...x, doc: e.target.value } : x))} />
                </Field>
                <Field label="País (vacío = contacto)">
                  <input value={p.country} onChange={e => setPassengers(old => old.map((x, n) => n === i ? { ...x, country: e.target.value } : x))} />
                </Field>
                <Field label="Comida">
                  <select value={p.meal} onChange={e => setPassengers(old => old.map((x, n) => n === i ? { ...x, meal: e.target.value } : x))}>
                    {['Normal', 'Vegetariano', 'Vegano', 'Sin gluten'].map(v => <option key={v}>
                      {v}
                    </option>)}
                  </select>
                </Field>
              </div>
            </div>)}
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => setPassengers(old => old.map((p, i) => i === 0 ? { ...p, name, country } : p))}
            >Usar contacto como primer pasajero</button>
          </section>
          <section>
            <h3>Precio y pago</h3>
            <p className="ops-form-note">Tarifas en USD, igual que las reservas web. Subtotal {usd(calculated.base)} · descuento grupo {usd(calculated.groupDiscount)} · total {usd(calculated.total)}. Equivalente Bs. {Math.round(calculated.total * EXCHANGE_RATE_BOB)} (1 USD = {EXCHANGE_RATE_BOB} BOB).</p>
            <label className="ops-check"><input
              type="checkbox"
              checked={override}
              onChange={e => {
                setOverride(e.target.checked);
                setTotal(String(calculated.total));
              }}
            />Sobrescribir total</label>
            <div className="ops-grid">
              {override
                && <Field label="Total acordado (USD)">
                  <input
                    required
                    type="number"
                    min={0}
                    max={99999999.99}
                    step="0.01"
                    value={total}
                    onChange={e => setTotal(e.target.value)}
                  />
                </Field>}
              <Field label="Estado de pago inicial">
                <select value={paid ? 'paid' : 'pending'} onChange={e => setPaid(e.target.value === 'paid')}>
                  <option value="pending">Pendiente</option>
                  <option value="paid">Pagado</option>
                </select>
              </Field>
              <Field label="Método">
                <select value={method} onChange={e => setMethod(e.target.value)}>
                  {Object.entries(methodLabels).map(([k, v]) => <option key={k} value={k}>
                    {v}
                  </option>)}
                </select>
              </Field>
              <Field label="Notas internas" wide>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} />
              </Field>
            </div>
          </section>
          <div className="ops-actions">
            <button className="btn btn--primary" disabled={busy || !slot || list.loading || Boolean(list.error) || catalog.loading || Boolean(catalog.error) || !product}>
              {busy ? 'Guardando…' : 'Crear reserva'}
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={onClose}
              disabled={busy}
            >Cancelar</button>
          </div>
        </fieldset>
      </form>}
  </Modal>;
}
