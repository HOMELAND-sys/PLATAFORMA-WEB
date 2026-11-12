'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { setting, saveSetting, messageOf } from '@/lib/admin/core';
import { useAdminData } from '@/lib/admin/hooks';
import { Field, LoadState, Notice } from './AdminShared';
export interface CompanySettings { name:string; phones:string; whatsapp:string; email:string; address:string; facebook:string; instagram:string; tiktok:string; website:string; license:string }
export interface PolicySettings { free_cancellation_hours:number; default_cutoff_hours:number; policy_text:string }
const defaultCompany:CompanySettings={name:'Homeland Tours',phones:'',whatsapp:'',email:'',address:'',facebook:'',instagram:'',tiktok:'',website:'',license:''};
const defaultPolicies:PolicySettings={free_cancellation_hours:24,default_cutoff_hours:12,policy_text:''};
export default function CompanyPolicies({mode}:{mode:'company'|'policies'}){
  const load=useAdminData(async()=>{const [company,policies]=await Promise.all([setting('company',defaultCompany),setting('policies',defaultPolicies)]);return {company,policies};});
  const [company,setCompany]=useState(defaultCompany);
  const [policies,setPolicies]=useState(defaultPolicies);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [ok,setOk]=useState('');
  useEffect(()=>{if(load.data){setCompany({...defaultCompany,...load.data.company});setPolicies({...defaultPolicies,...load.data.policies});}},[load.data]);
  async function save(e:FormEvent){e.preventDefault();setError('');setOk('');setBusy(true);try{if(mode==='company'&&!company.name.trim())throw new Error('El nombre comercial es obligatorio.');await saveSetting(mode,mode==='company'?company:policies);setOk('Configuración guardada.');}catch(err){setError(messageOf(err));}finally{setBusy(false);}}
  return <><LoadState loading={load.loading} error={load.error} empty={false} onRetry={()=>void load.reload()}/>{load.data&&!load.error&&<form className="admin-card" onSubmit={save}><Notice error={error} success={ok}/><h3>{mode==='company'?'Datos de la empresa':'Políticas operativas'}</h3><fieldset disabled={busy} className="ops-fieldset"><div className="ops-grid">{mode==='company'?<>{([['name','Nombre comercial'],['phones','Teléfonos'],['whatsapp','WhatsApp con código de país'],['email','Email'],['address','Dirección'],['license','Licencia / registro de turismo'],['facebook','Facebook (URL)'],['instagram','Instagram (URL)'],['tiktok','TikTok (URL)'],['website','Sitio web (URL)']] as const).map(([key,label])=><Field key={key} label={label}><input required={key==='name'} type={key==='email'?'email':['facebook','instagram','tiktok','website'].includes(key)?'url':key==='whatsapp'?'tel':'text'} value={company[key]} onChange={e=>setCompany(old=>({...old,[key]:e.target.value}))}/></Field>)}</>:<><Field label="Cancelación gratis por defecto (horas)"><input required type="number" min={0} max={8760} value={policies.free_cancellation_hours} onChange={e=>setPolicies(old=>({...old,free_cancellation_hours:Number(e.target.value)}))}/></Field><Field label="Hora límite por defecto (horas antes)"><input required type="number" min={0} max={8760} value={policies.default_cutoff_hours} onChange={e=>setPolicies(old=>({...old,default_cutoff_hours:Number(e.target.value)}))}/></Field><Field label="Texto de política" wide><textarea value={policies.policy_text} onChange={e=>setPolicies(old=>({...old,policy_text:e.target.value}))}/></Field></>}</div>{mode==='policies'&&<p className="ops-form-note">Valores de referencia para productos nuevos. Los tours y franjas existentes conservan sus valores; puedes actualizarlos en Productos o Disponibilidad.</p>}<div className="ops-actions"><button className="btn btn--primary" disabled={busy}>{busy?'Guardando…':'Guardar cambios'}</button></div></fieldset></form>}</>;
}
