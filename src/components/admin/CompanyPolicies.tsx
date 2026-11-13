'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { setting, saveSetting, messageOf } from '@/lib/admin/core';
import { useAdminData } from '@/lib/admin/hooks';
import { Field, LoadState, Notice } from './AdminShared';

export interface CompanySettings {
  name: string;
  phones: string;
  whatsapp: string;
  email: string;
  address: string;
  facebook: string;
  instagram: string;
  tiktok: string;
  website: string;
  license: string;
}

export interface PolicySettings {
  free_cancellation_hours: number;
  default_cutoff_hours: number;
  cancellation_fee_pct: number;
  policy_text: string;
}
const defaultCompany: CompanySettings = {
  name: 'Homeland Tours',
  phones: '',
  whatsapp: '',
  email: '',
  address: '',
  facebook: '',
  instagram: '',
  tiktok: '',
  website: '',
  license: ''
};
const defaultPolicies: PolicySettings = { free_cancellation_hours: 48, default_cutoff_hours: 24, cancellation_fee_pct: 10, policy_text: '' };

/** Qué cambia en el sitio público al completar cada dato de la empresa. */
const COMPANY_HINTS: Partial<Record<keyof CompanySettings, string>> = {
  whatsapp: 'Con código de país, por ejemplo +591 70000000. Activa los botones de WhatsApp del sitio y del voucher.',
  phones: 'Se muestran en el pie del sitio y en el voucher. Separa varios con comas.',
  email: 'Aparece en el pie, en «Sobre nosotros» y en la política de privacidad.',
  address: 'Dirección de la oficina: pie del sitio y documentos legales.',
  license: 'Se muestra junto a «Operadora local» y en los términos y condiciones.',
};

export default function CompanyPolicies({ mode }: {
  mode: 'company' | 'policies';
}) {
  const load = useAdminData(async () => {
    const [company, policies] = await Promise.all([setting('company', defaultCompany), setting('policies', defaultPolicies)]);
    return { company, policies };
  });
  const [company, setCompany] = useState(defaultCompany);
  const [policies, setPolicies] = useState(defaultPolicies);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  useEffect(() => {
    if (load.data) {
      setCompany({ ...defaultCompany, ...load.data.company });
      setPolicies({ ...defaultPolicies, ...load.data.policies });
    }
  }, [load.data]);
  async function save(e: FormEvent) {
    e.preventDefault();
    setError('');
    setOk('');
    setBusy(true);
    try {
      if (mode === 'company' && !company.name.trim())
        throw new Error('El nombre comercial es obligatorio.');
      if (mode === 'company' && company.whatsapp.trim() && company.whatsapp.replace(/\D/g, '').length < 8)
        throw new Error('El WhatsApp debe incluir el código de país y el número completo.');
      if (mode === 'policies' && !(policies.cancellation_fee_pct >= 0 && policies.cancellation_fee_pct <= 100))
        throw new Error('El cargo por cancelación debe estar entre 0 y 100 %.');
      await saveSetting(mode, mode === 'company' ? company : policies);
      setOk('Configuración guardada.');
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }
  return <>
    <LoadState
      loading={load.loading}
      error={load.error}
      empty={false}
      onRetry={() => void load.reload()}
    />
    {load.data && !load.error
      && <form className="admin-card" onSubmit={save}>
        <Notice error={error} success={ok} />
        <h3>
          {mode === 'company' ? 'Datos de la empresa' : 'Políticas operativas'}
        </h3>
        <fieldset disabled={busy} className="ops-fieldset">
          <div className="ops-grid">
            {mode === 'company' ? <>
              {([
                ['name', 'Nombre comercial'],
                ['phones', 'Teléfonos'],
                ['whatsapp', 'WhatsApp con código de país'],
                ['email', 'Email'],
                ['address', 'Dirección'],
                ['license', 'Licencia / registro de turismo'],
                ['facebook', 'Facebook (URL)'],
                ['instagram', 'Instagram (URL)'],
                ['tiktok', 'TikTok (URL)'],
                ['website', 'Sitio web (URL)']
              ] as const).map(([key, label]) => <Field key={key} label={label}>
                <input
                  required={key === 'name'}
                  type={key === 'email' ? 'email' : ['facebook', 'instagram', 'tiktok', 'website'].includes(key) ? 'url' : key === 'whatsapp' ? 'tel' : 'text'}
                  value={company[key]}
                  onChange={e => setCompany(old => ({ ...old, [key]: e.target.value }))}
                />
                {COMPANY_HINTS[key] && <small className="ops-field__hint">{COMPANY_HINTS[key]}</small>}
              </Field>)}
            </> : <>
              <Field label="Cancelación gratis por defecto (horas)">
                <input
                  required
                  type="number"
                  min={0}
                  max={8760}
                  value={policies.free_cancellation_hours}
                  onChange={e => setPolicies(old => ({ ...old, free_cancellation_hours: Number(e.target.value) }))}
                />
              </Field>
              <Field label="Hora límite por defecto (horas antes)">
                <input
                  required
                  type="number"
                  min={0}
                  max={8760}
                  value={policies.default_cutoff_hours}
                  onChange={e => setPolicies(old => ({ ...old, default_cutoff_hours: Number(e.target.value) }))}
                />
              </Field>
              <Field label="Cargo administrativo al cancelar a tiempo (%)">
                <input
                  required
                  type="number"
                  min={0}
                  max={100}
                  step="0.5"
                  value={policies.cancellation_fee_pct}
                  onChange={e => setPolicies(old => ({ ...old, cancellation_fee_pct: Number(e.target.value) }))}
                />
              </Field>
              <Field label="Texto de política" wide>
                <textarea value={policies.policy_text} onChange={e => setPolicies(old => ({ ...old, policy_text: e.target.value }))} />
              </Field>
            </>}
          </div>
          {mode === 'policies'
            && <p className="ops-form-note">El plazo y el cargo se muestran en la política de cancelación del sitio, en los términos y al cancelar una reserva. Para productos nuevos sirven de valor inicial: los tours y franjas existentes conservan los suyos y puedes actualizarlos en Productos o Disponibilidad.</p>}
          {mode === 'company' && !company.whatsapp.trim()
            && <p className="ops-form-note ops-form-note--warn">Falta el número de WhatsApp: mientras esté vacío, el sitio oculta los botones de WhatsApp y ofrece el formulario de contacto.</p>}
          <div className="ops-actions">
            <button className="btn btn--primary" disabled={busy}>
              {busy ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </fieldset>
      </form>}
  </>;
}
