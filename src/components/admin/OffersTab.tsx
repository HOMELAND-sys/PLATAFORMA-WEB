'use client';
import { useState } from 'react';
import { offers } from '@/lib/admin/commerce';
import { products, deleteRow, messageOf, saveRow } from '@/lib/admin/core';
import { useAdminData } from '@/lib/admin/hooks';
import { dateLabel, operatorDay } from '@/lib/admin/format';
import type { Offer } from '@/lib/admin/types';
import { Field, LoadState, Notice, Pill } from './AdminShared';
import OfferForm, { offerKinds } from './OfferForm';
export default function OffersTab(){
  const list=useAdminData(async()=>{const [rows,tours]=await Promise.all([offers(),products()]);return {rows,tours};});
  const [search,setSearch]=useState('');
  const [status,setStatus]=useState('');
  const [editing,setEditing]=useState<Offer|null|undefined>();
  const [error,setError]=useState('');
  const [ok,setOk]=useState('');
  const [busy,setBusy]=useState(false);
  const state=(o:Offer)=>o.activity_to<operatorDay()?'expired':o.status;
  const filtered=list.data?.rows.filter(o=>(!status||state(o)===status)&&o.name.toLowerCase().includes(search.trim().toLowerCase()))??[];
  async function toggle(o:Offer){setError('');setBusy(true);try{await saveRow('special_offers',{status:o.status==='active'?'paused':'active'},o.id);setOk('Estado de oferta actualizado.');await list.reload();}catch(err){setError(messageOf(err));}finally{setBusy(false);}}
  async function remove(o:Offer){if(!window.confirm(`¿Eliminar la oferta ${o.name}? Las reservas existentes mantienen su precio.`))return;setError('');setBusy(true);try{await deleteRow('special_offers',o.id);setOk('Oferta eliminada.');await list.reload();}catch(err){setError(messageOf(err));}finally{setBusy(false);}}
  return <><div className="admin-header"><div><h1>Ofertas especiales</h1><p>Descuentos por temporada, anticipación o plazas de última hora.</p></div><button className="btn btn--primary" onClick={()=>setEditing(null)}>Crear oferta</button></div><div className="admin-card"><div className="ops-grid"><Field label="Buscar nombre interno"><input type="search" value={search} onChange={e=>setSearch(e.target.value)}/></Field><Field label="Estado"><select value={status} onChange={e=>setStatus(e.target.value)}><option value="">Todos</option><option value="active">Activa</option><option value="paused">Pausada</option><option value="expired">Caducada</option></select></Field></div></div><Notice error={error} success={ok}/><LoadState emptyImage="offers" emptyAction={{label:'Crear oferta',onClick:()=>setEditing(null)}} loading={list.loading} error={list.error} empty={!filtered.length} onRetry={()=>void list.reload()} label="Crea una oferta para tus productos."/>{!list.loading&&!list.error&&<table className="ops-ledger"><thead><tr><th>Oferta</th><th>Actividad</th><th>Productos</th><th>Descuento</th><th>Plazas vendidas</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{filtered.map(o=><tr key={o.id}><td data-label="Oferta"><span><strong>{o.name}</strong><span className="cell-sub">{offerKinds[o.kind]}{o.kind!=='limited'?` · ${o.booking_notice_days} días`:''}</span></span></td><td data-label="Actividad"><span>{dateLabel(o.activity_from)}<br/>{dateLabel(o.activity_to)}<span className="cell-sub">{o.weekdays?o.weekdays.map(i=>['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][i]).join(', '):'Todos los días'} · {o.start_times?.join(', ')||'Todas las horas'}</span></span></td><td data-label="Productos">{o.tour_ids.map(id=>list.data?.tours.find(t=>t.id===id)?.title||'Producto no disponible').join(', ')}</td><td data-label="Descuento"><strong>{o.discount_pct}%</strong></td><td data-label="Plazas">{o.seats_sold}{o.seats_limit!==null?` / ${o.seats_limit}`:' · sin límite'}</td><td data-label="Estado"><Pill tone={state(o)==='active'?'green':'gray'}>{state(o)==='expired'?'Caducada':o.status==='active'?'Activa':'Pausada'}</Pill></td><td data-label="Acciones"><div className="ops-actions"><button className="btn btn--ghost btn--sm" disabled={busy} onClick={()=>setEditing(o)}>Editar</button><button className="btn btn--ghost btn--sm" disabled={busy||state(o)==='expired'} onClick={()=>void toggle(o)}>{o.status==='active'?'Pausar':'Activar'}</button><button className="btn btn--ghost btn--sm" disabled={busy} onClick={()=>void remove(o)}>Eliminar</button></div></td></tr>)}</tbody></table>}{editing!==undefined&&<OfferForm offer={editing} onClose={()=>setEditing(undefined)} onSaved={()=>{setEditing(undefined);setOk('Oferta guardada.');void list.reload();}}/>}</>;
}
