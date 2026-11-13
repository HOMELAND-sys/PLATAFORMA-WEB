'use client';

import { useState } from 'react';
import PaymentTab from './PaymentTab';
import CompanyPolicies from './CompanyPolicies';
import CouponsTab from './CouponsTab';

export default function SettingsTab() {
  const [tab, setTab] = useState('payment');
  return <>
    <div className="admin-header">
      <div>
        <h1>Configuraciones</h1>
        <p>Empresa, cobros, políticas y cupones de Homeland Tours.</p>
      </div>
    </div>
    <div className="ops-tabs" aria-label="Secciones de configuración">
      {[['payment', 'Pago'], ['company', 'Empresa'], ['policies', 'Políticas'], ['coupons', 'Cupones']].map(([key, label]) => <button
        key={key}
        className={tab === key ? 'is-active' : ''}
        onClick={() => setTab(key)}
      >
        {label}
      </button>)}
    </div>
    {tab === 'payment' && <PaymentTab />}
    {(tab === 'company' || tab === 'policies') && <CompanyPolicies key={tab} mode={tab} />}
    {tab === 'coupons' && <CouponsTab />}
  </>;
}
