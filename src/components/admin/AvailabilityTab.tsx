'use client';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { products } from '@/lib/admin/core';
import { messageOf } from '@/lib/admin/core';
import { slots, updateSlots } from '@/lib/admin/slots';
import { useAdminData } from '@/lib/admin/hooks';
import { dateLabel, operatorDay, shiftDay, validDay } from '@/lib/admin/format';
import { Field, LoadState, Notice } from './AdminShared';
import SlotGenerator from './SlotGenerator';
import SlotRow, { slotState } from './SlotRow';
export default function AvailabilityTab() {
  const params = useSearchParams();
  const [from,setFrom]=useState(validDay(params.get('date')) || operatorDay());
  const [to,setTo]=useState(validDay(params.get('date')) || shiftDay(operatorDay(),6));
  const [tour,setTour]=useState(params.get('tour') || '');
  const [option,setOption]=useState('');
  const [state,setState]=useState('');
  const [selected,setSelected]=useState<string[]>([]);
  const [calendar,setCalendar]=useState(false);
  const [generating,setGenerating]=useState(false);
  const [blocked,setBlocked]=useState('');
  const [capacity,setCapacity]=useState('');
  const [cutoff,setCutoff]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [ok,setOk]=useState('');
  const catalog=useAdminData(products);
  const month=from.slice(0,7);
  const monthFrom=`${month}-01`;
  const nextMonth=month ? new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7)),1)).toISOString().slice(0,10) : operatorDay();
  const queryFrom=calendar?monthFrom:from;
  const queryTo=calendar?shiftDay(nextMonth,-1):to;
  const list=useAdminData(()=>slots(queryFrom,queryTo,tour),[queryFrom,queryTo,tour]);
  const filtered=useMemo(()=>(list.data??[]).filter(s=>(params.get('alert')!=='almost-full'||s.occupied/s.capacity>=.8)&&(!option || (s.start_time?.slice(0,5) || 'none')===option)&&(!state||slotState(s)===state)),[list.data,option,state,params]);
  useEffect(()=>{setSelected(ids=>ids.filter(id=>filtered.some(s=>s.id===id)));},[filtered]);
  useEffect(()=>{ const date=validDay(params.get('date')); if(date){setFrom(date);setTo(date);} setTour(params.get('tour')||''); },[params]);
  const group=new Map<string,typeof filtered>();
  for(const s of filtered) group.set(s.date,[...(group.get(s.date)??[]),s]);
  const times=[...new Set((list.data??[]).map(s=>s.start_time?.slice(0,5)||'none'))].sort();
  const dayIndex=monthFrom?new Date(`${monthFrom}T12:00:00Z`).getUTCDay():0;
  const calendarStart=shiftDay(monthFrom,-((dayIndex+6)%7));
  async function bulk() {
    setBusy(true);setError('');setOk('');
    try { await updateSlots(selected,{...(blocked?{blocked:blocked==='yes'}:{}),...(capacity?{capacity:Number(capacity)}:{}),...(cutoff!==''?{cutoff:Number(cutoff)}:{})});setOk(`${selected.length} franjas actualizadas.`);await list.reload();setSelected([]); }
    catch(err){setError(messageOf(err));}finally{setBusy(false);}
  }
  function shortcut(offset:number,days=1){const day=shiftDay(operatorDay(),offset);setFrom(day);setTo(shiftDay(day,days-1));setCalendar(false);}
  return <><div className="admin-header"><div><h1>Disponibilidad</h1><p>Franjas, cupos y hora límite · hora de Bolivia. Bloquear conserva las reservas existentes.</p></div><div className="admin-header__actions"><button className="btn btn--ghost" onClick={()=>setCalendar(!calendar)}>{calendar?'Vista de franjas':'Vista de calendario'}</button><button className="btn btn--primary" disabled={!catalog.data?.length} onClick={()=>setGenerating(true)}>Crear franjas</button></div></div><div className="admin-card"><div className="ops-grid"><Field label="Desde"><input type="date" required value={from} max={to} onChange={e=>{if(e.target.value)setFrom(e.target.value);}}/></Field><Field label="Hasta"><input type="date" required value={to} min={from} onChange={e=>{if(e.target.value)setTo(e.target.value);}}/></Field><Field label="Producto"><select value={tour} onChange={e=>setTour(e.target.value)}><option value="">Todos los productos</option>{catalog.data?.map(t=><option key={t.id} value={t.id}>{t.code?`${t.code} · `:''}{t.title}</option>)}</select></Field><Field label="Opción (hora de salida)"><select value={option} onChange={e=>setOption(e.target.value)}><option value="">Todas las horas</option>{times.map(t=><option key={t} value={t}>{t==='none'?'Sin hora':t}</option>)}</select></Field><Field label="Estado"><select value={state} onChange={e=>setState(e.target.value)}><option value="">Todos los estados</option>{['Reservable','No se puede reservar','Bloqueada','Agotada'].map(s=><option key={s}>{s}</option>)}</select></Field></div><div className="ops-toolbar"><button className="btn btn--ghost btn--sm" onClick={()=>shortcut(0)}>Hoy</button><button className="btn btn--ghost btn--sm" onClick={()=>shortcut(1)}>Mañana</button><button className="btn btn--ghost btn--sm" onClick={()=>shortcut(0,7)}>Próximos 7 días</button><button className="btn btn--ghost btn--sm" onClick={()=>void list.reload()}>Actualizar</button></div></div><Notice error={error} success={ok}/><LoadState emptyImage={calendar ? 'calendar' : 'availability'} emptyAction={catalog.data?.length ? { label: 'Crear franjas', onClick: () => setGenerating(true) } : { label: 'Ver productos', href: '/admin?tab=tours' }} loading={catalog.loading||list.loading} error={catalog.error||list.error} empty={!filtered.length} onRetry={()=>{void catalog.reload();void list.reload();}} label="Crea franjas o amplía los filtros para ver disponibilidad."/>{!list.loading&&!list.error&&catalog.data&&<>{calendar?<div className="admin-card"><div className="ops-toolbar"><button className="btn btn--ghost btn--sm" aria-label="Mes anterior" onClick={()=>{const d=new Date(`${monthFrom}T12:00:00Z`);d.setUTCMonth(d.getUTCMonth()-1);const next=d.toISOString().slice(0,10);setFrom(next);setTo(shiftDay(monthFrom,-1));}}>←</button><strong>{new Date(`${monthFrom}T12:00:00Z`).toLocaleDateString('es-BO',{month:'long',year:'numeric',timeZone:'America/La_Paz'})}</strong><button className="btn btn--ghost btn--sm" aria-label="Mes siguiente" onClick={()=>{setFrom(nextMonth);const d=new Date(`${nextMonth}T12:00:00Z`);d.setUTCMonth(d.getUTCMonth()+1);setTo(shiftDay(d.toISOString().slice(0,10),-1));}}>→</button></div><div className="ops-calendar">{['L','M','X','J','V','S','D'].map((d,i)=><small key={i}>{d}</small>)}{Array.from({length:42},(_,i)=>{const day=shiftDay(calendarStart,i);const items=group.get(day)??[];const booked=items.reduce((s,x)=>s+x.occupied,0);const cap=items.reduce((s,x)=>s+x.capacity,0);return <button key={day} className={`${day===operatorDay()?'is-today ':''}${day.slice(0,7)!==month?'is-outside':''}`} onClick={()=>{setFrom(day);setTo(day);setCalendar(false);}} aria-label={`${dateLabel(day)}, ${booked} de ${cap} reservados`}><b>{Number(day.slice(-2))}</b><small>{items.length} franjas</small>{cap>0&&<><div className="ops-meter"><span style={{width:`${Math.min(100,booked/cap*100)}%`}}/></div><small>{booked}/{cap} pax</small></>}</button>;})}</div></div>:<><div className="ops-toolbar"><label className="ops-check"><input type="checkbox" checked={filtered.length>0&&selected.length===filtered.length} onChange={e=>setSelected(e.target.checked?filtered.map(s=>s.id):[])}/>Seleccionar todo ({filtered.length})</label><span className="ops-muted">{selected.length} seleccionadas</span></div>{selected.length>0&&<form className="admin-card" onSubmit={e=>{e.preventDefault();void bulk();}}><div className="ops-grid"><Field label="Bloqueo"><select value={blocked} onChange={e=>setBlocked(e.target.value)}><option value="">Sin cambiar</option><option value="yes">Bloquear</option><option value="no">Desbloquear</option></select></Field><Field label="Nuevo cupo total"><input type="number" min={1} placeholder="Sin cambiar" value={capacity} onChange={e=>setCapacity(e.target.value)}/></Field><Field label="Hora límite (horas)"><input type="number" min={0} placeholder="Sin cambiar" value={cutoff} onChange={e=>setCutoff(e.target.value)}/></Field></div><div className="ops-toolbar"><button className="btn btn--primary btn--sm" disabled={busy||(!blocked&&!capacity&&cutoff==='')}>{busy?'Guardando…':'Aplicar a seleccionadas'}</button><button type="button" className="btn btn--ghost btn--sm" onClick={()=>setSelected([])} disabled={busy}>Cancelar</button></div></form>}{[...group].map(([day,items])=><section className="ops-day-group" key={day}><h3>{dateLabel(day,true)}</h3>{items.map(s=><SlotRow key={s.id} slot={s} product={catalog.data?.find(t=>t.id===s.tour_id)} checked={selected.includes(s.id)} onSelect={()=>setSelected(ids=>ids.includes(s.id)?ids.filter(id=>id!==s.id):[...ids,s.id])} onSaved={list.reload} onError={err=>setError(messageOf(err))}/>)}</section>)}</>}</>}{generating&&catalog.data&&<SlotGenerator products={catalog.data} onClose={()=>setGenerating(false)} onSaved={n=>{setGenerating(false);setOk(`${n} franjas creadas. Las existentes se conservaron; ajusta el rango si no aparecen.`);void list.reload();}}/>}</>;
}
