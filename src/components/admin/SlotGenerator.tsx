'use client';
import { useState, type FormEvent } from 'react';
import { generateSlots } from '@/lib/admin/slots';
import { messageOf } from '@/lib/admin/core';
import { operatorDay, shiftDay } from '@/lib/admin/format';
import type { Product } from '@/lib/admin/types';
import { Field, Modal, Notice } from './AdminShared';
export default function SlotGenerator({ products, onClose, onSaved }: { products: Product[]; onClose: () => void; onSaved: (count: number) => void }) {
  const [tour, setTour] = useState(products[0]?.id ?? '');
  const [from, setFrom] = useState(operatorDay());
  const [to, setTo] = useState(shiftDay(operatorDay(), 6));
  const [days, setDays] = useState([0,1,2,3,4,5,6]);
  const [times, setTimes] = useState(products[0]?.default_start_times.join(', ') || '08:00');
  const [capacity, setCapacity] = useState(8);
  const [cutoff, setCutoff] = useState(products[0]?.default_cutoff_hours ?? 12);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const hours = [...new Set(times.split(/[\s,;]+/).filter(Boolean))];
      if (!hours.length || hours.some(t => !/^([01]\d|2[0-3]):[0-5]\d$/.test(t))) throw new Error('Usa horas HH:MM separadas por comas.');
      if (!days.length) throw new Error('Selecciona al menos un día de semana.');
      const count = await generateSlots({ p_tour_id: tour, p_from: from, p_to: to, p_weekdays: days, p_start_times: hours, p_capacity: capacity, p_cutoff: cutoff });
      onSaved(count);
    } catch (err) { setError(messageOf(err)); } finally { setBusy(false); }
  }
  return <Modal title="Crear franjas en lote" onClose={() => { if (!busy) onClose(); }}><form onSubmit={save}><Notice error={error}/><div className="ops-grid"><Field label="Producto" wide><select required value={tour} onChange={e => { setTour(e.target.value); const p=products.find(t=>t.id===e.target.value); setCutoff(p?.default_cutoff_hours??12); setTimes(p?.default_start_times.join(', ') || '08:00'); }}>{products.map(t=><option key={t.id} value={t.id}>{t.code ? `${t.code} · ` : ''}{t.title}</option>)}</select></Field><Field label="Desde"><input required type="date" value={from} max={to} onChange={e=>setFrom(e.target.value)}/></Field><Field label="Hasta"><input required type="date" min={from} max={from ? shiftDay(from,366) : undefined} value={to} onChange={e=>setTo(e.target.value)}/></Field><Field label="Horas de inicio (HH:MM)" wide><input required value={times} placeholder="08:00, 14:30" onChange={e=>setTimes(e.target.value)}/></Field><Field label="Capacidad por franja"><input required type="number" min={1} max={10000} value={capacity} onChange={e=>setCapacity(Number(e.target.value))}/></Field><Field label="Hora límite (horas antes)"><input required type="number" min={0} max={8760} value={cutoff} onChange={e=>setCutoff(Number(e.target.value))}/></Field></div><p className="ops-form-note">Días de semana · hora de Bolivia (America/La_Paz).</p><div className="ops-days">{['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map((day,i)=><label className="ops-check" key={i}><input type="checkbox" checked={days.includes(i)} onChange={e=>setDays(old=>e.target.checked?[...old,i]:old.filter(x=>x!==i))}/>{day}</label>)}</div><p className="ops-form-note">Las franjas que ya existen se conservan. Una salida sin hora se interpreta como medianoche para calcular el límite.</p><div className="ops-actions"><button className="btn btn--primary" disabled={busy || !products.length}>{busy?'Creando…':'Crear franjas'}</button><button type="button" className="btn btn--ghost" disabled={busy} onClick={onClose}>Cancelar</button></div></form></Modal>;
}
