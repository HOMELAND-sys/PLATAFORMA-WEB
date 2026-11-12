'use client';
import { useState, type FormEvent } from 'react';
import { coupons, deleteCoupon, saveCoupon } from '@/lib/admin/commerce';
import { messageOf } from '@/lib/admin/core';
import { useAdminData } from '@/lib/admin/hooks';
import type { CouponRow } from '@/lib/admin/types';
import { Field, LoadState, Modal, Notice, Pill } from './AdminShared';
export default function CouponsTab(){
  const list=useAdminData(coupons);
  const [search,setSearch]=useState('');
  const [editing,setEditing]=useState<CouponRow|null|undefined>();
  const [error,setError]=useState('');
  const [ok,setOk]=useState('');
  const [busy,setBusy]=useState(false);
  const filtered=list.data?.filter(c=>c.code.toLowerCase().includes(search.toLowerCase()))??[];
  async function remove(c:CouponRow){if(!window.confirm(`¿Eliminar el cupón ${c.code}? Las reservas anteriores conservarán el descuento.`))return;setBusy(true);setError('');try{await deleteCoupon(c.code);setOk('Cupón eliminado.');await list.reload();}catch(err){setError(messageOf(err));}finally{setBusy(false);}}
  return <><div className="ops-toolbar"><button className="btn btn--primary" onClick={()=>setEditing(null)}>Añadir cupón</button></div><div className="admin-card"><Field label="Buscar código"><input type="search" value={search} onChange={e=>setSearch(e.target.value)}/></Field></div><Notice error={error} success={ok}/><LoadState loading={list.loading} error={list.error} empty={!filtered.length} onRetry={()=>void list.reload()} label="No hay cupones registrados."/>{!list.loading&&!list.error&&<table className="ops-ledger"><thead><tr><th>Código</th><th>Descuento</th><th>Vigencia</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{filtered.map(c=><tr key={c.code}><td data-label="Código"><strong>{c.code}</strong></td><td data-label="Descuento">{c.discount_pct}%</td><td data-label="Vigencia">{c.valid_from||'Sin inicio'} · {c.valid_to||'Sin fin'}</td><td data-label="Estado"><Pill tone={c.active?'green':'gray'}>{c.active?'Activo':'Inactivo'}</Pill></td><td data-label="Acciones"><div className="ops-actions"><button className="btn btn--ghost btn--sm" disabled={busy} onClick={()=>setEditing(c)}>Editar</button><button className="btn btn--ghost btn--sm" disabled={busy} onClick={()=>void remove(c)}>Eliminar</button></div></td></tr>)}</tbody></table>}{editing!==undefined&&<CouponForm coupon={editing} onClose={()=>setEditing(undefined)} onSaved={()=>{setEditing(undefined);setOk('Cupón guardado.');void list.reload();}}/>}</>;
}
function CouponForm({coupon,onClose,onSaved}:{coupon:CouponRow|null;onClose:()=>void;onSaved:()=>void}){
  const [form,setForm]=useState<CouponRow>(coupon??{code:'',discount_pct:10,active:true,valid_from:null,valid_to:null});
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function save(e:FormEvent){e.preventDefault();setBusy(true);setError('');try{const code=form.code.trim().toUpperCase();if(!/^[A-Z0-9_-]{2,40}$/.test(code))throw new Error('Usa un código de 2 a 40 letras, números, guiones o guiones bajos.');await saveCoupon({...form,code},Boolean(coupon));onSaved();}catch(err){setError(messageOf(err));}finally{setBusy(false);}}
  return <Modal title={coupon?'Editar cupón':'Añadir cupón'} onClose={()=>{if(!busy)onClose();}}><form onSubmit={save}><Notice error={error}/><fieldset className="ops-fieldset" disabled={busy}><div className="ops-grid"><Field label="Código"><input required readOnly={Boolean(coupon)} maxLength={40} value={form.code} onChange={e=>setForm(old=>({...old,code:e.target.value.toUpperCase()}))}/></Field><Field label="Descuento (%)"><input required type="number" min={0} max={100} value={form.discount_pct} onChange={e=>setForm(old=>({...old,discount_pct:Number(e.target.value)}))}/></Field><Field label="Válido desde (opcional)"><input type="date" max={form.valid_to??undefined} value={form.valid_from??''} onChange={e=>setForm(old=>({...old,valid_from:e.target.value||null}))}/></Field><Field label="Válido hasta (opcional)"><input type="date" min={form.valid_from??undefined} value={form.valid_to??''} onChange={e=>setForm(old=>({...old,valid_to:e.target.value||null}))}/></Field></div><div className="ops-toolbar"><label className="ops-check"><input type="checkbox" checked={form.active} onChange={e=>setForm(old=>({...old,active:e.target.checked}))}/>Cupón activo</label></div><div className="ops-actions"><button className="btn btn--primary" disabled={busy}>{busy?'Guardando…':'Guardar cupón'}</button><button type="button" className="btn btn--ghost" disabled={busy} onClick={onClose}>Cancelar</button></div></fieldset></form></Modal>;
}
