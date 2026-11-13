'use client';

import { useContactForm } from '@/lib/use-contact-form';
import FormCompanyContact from './FormCompanyContact';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import CalendarScheduler from '@/components/forms/CalendarScheduler';
import Icon from '@/components/ui/Icon';

const STATES = [
  'Selecciona', 'La Paz', 'Cochabamba', 'Santa Cruz', 'Oruro',
  'Potosí', 'Chuquisaca', 'Tarija', 'Beni', 'Pando', 'Otro',
];

const COUNTRY_CODES = ['+591', '+54', '+34', '+1', '+52', '+56', '+51'];

export default function BusinessContent() {
  const { submitted, busy, error, handleSubmit } = useContactForm('business');

  return (
    <div className="biz-page">
      <div className="biz-page__bg">
        <img src="/assets/lapaz-city.jpg" alt="" />
      </div>

      <section className="form-hero">
        <div className="container">
          <Breadcrumbs light items={[{ label: 'Inicio', href: '/' }, { label: 'Empresas' }]} />
          <h1>
            Formulario de <em>aliado comercial</em>
          </h1>
          <p>Por favor, ingresá un número de teléfono válido. Te contactaremos en menos de 24 horas hábiles.</p>
        </div>
      </section>

      <section className="form-page">
        <div className="container form-page__layout">
          <form className="form-card" onSubmit={handleSubmit} aria-busy={busy}>
            <div aria-hidden="true" style={{ position: 'absolute', left: -10000 }}><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
            {error && <div className="auth-alert auth-alert--error" role="alert">{error}</div>}
            {submitted && (
              <div className="success-banner" role="status">
                ✓ Solicitud recibida. Te contactaremos para confirmar la reunión.
              </div>
            )}
            <h2>Formulario de aliado comercial</h2>
            <p>Por favor, ingresá un número de teléfono válido. Te contactaremos en menos de 24 horas hábiles.</p>

            <h4 className="form-section-title">Tu información</h4>
            <div className="form-row">
              <div className="field">
                <label className="field__label">
                  Nombre <span className="req">*</span>
                </label>
                <input className="input" name="first_name" aria-label="Nombre" type="text" placeholder="Nombre" required />
              </div>
              <div className="field">
                <label className="field__label">
                  Apellido <span className="req">*</span>
                </label>
                <input className="input" name="last_name" aria-label="Apellido" type="text" placeholder="Apellido" required />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label className="field__label">
                  Número de contacto <span className="req">*</span>
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select name="phone_code" aria-label="Código de país" className="select" style={{ width: 100 }}>
                    {COUNTRY_CODES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <input className="input" name="phone" aria-label="Número de contacto" type="tel" placeholder="712 34567" required />
                </div>
              </div>
              <div className="field">
                <label className="field__label">
                  Dirección de correo electrónico <span className="req">*</span>
                </label>
                <input className="input" name="email" aria-label="Correo electrónico" type="email" placeholder="ejemplo@empresa.com" required />
              </div>
            </div>

            <h4 className="form-section-title">Información de la empresa</h4>
            <div className="field" style={{ marginBottom: 16 }}>
              <label className="field__label">
                Empresa <span className="req">*</span>
              </label>
              <input className="input" name="company" aria-label="Empresa" type="text" placeholder="Nombre de empresa" required />
            </div>
            <div className="field" style={{ marginBottom: 16 }}>
              <label className="field__label">
                Dirección <span className="req">*</span>
              </label>
              <input className="input" name="address" aria-label="Dirección" type="text" placeholder="Av. Principal #123, Edificio Torre, Piso 4" required />
            </div>
            <div className="form-row form-row--3">
              <div className="field">
                <label className="field__label">
                  Ciudad <span className="req">*</span>
                </label>
                <input className="input" name="city" aria-label="Ciudad" type="text" placeholder="Ciudad" required />
              </div>
              <div className="field">
                <label className="field__label">Estado / Provincia</label>
                <select name="province" aria-label="Estado o provincia" className="select">
                  {STATES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="field__label">Código postal</label>
                <input className="input" name="postal_code" aria-label="Código postal" type="text" placeholder="0000" />
              </div>
            </div>
            <div className="field" style={{ marginBottom: 16 }}>
              <label className="field__label">
                País <span className="req">*</span>
              </label>
              <input className="input" name="country" aria-label="País" type="text" defaultValue="Bolivia" required />
            </div>

            <h4 className="form-section-title">Agendemos una reunión de negocios</h4>
            <CalendarScheduler />

            <h4 className="form-section-title">¿Qué servicios te interesan u ofrecer?</h4>
            <div className="field" style={{ marginBottom: 16 }}>
              <label className="field__label">Cuéntanos brevemente</label>
              <textarea
                name="message" aria-label="Servicios de interés" maxLength={2000} className="textarea"
                rows={5}
                placeholder="Ej. Somos una agencia de viajes en Buenos Aires interesada en ofrecer tours a Bolivia a nuestros clientes. Buscamos tarifas especiales para grupos de 10+..."
              ></textarea>
            </div>

            <label className="checkbox" style={{ marginBottom: 20 }}>
              <input type="checkbox" required />
              <span style={{ fontSize: '0.88rem' }}>
                Acepto los términos y condiciones y la política de privacidad.
              </span>
            </label>

            <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={busy || submitted}>
              {busy ? 'Enviando…' : submitted ? 'Solicitud enviada' : 'Solicitar reunión'}
              <Icon name="calendar" size={18} />
            </button>
          </form>

          <aside>
            <div className="aside-card">
              <h3>Alianzas comerciales</h3>
              <p>
                ¿Tienes una agencia, operador turístico o empresa interesada en ofrecer Bolivia a tus clientes?
                Agendemos una reunión para evaluar la alianza.
              </p>

              <FormCompanyContact />

              <div className="aside-divider"></div>

              <h4 style={{ color: 'var(--white)', fontSize: '0.95rem', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                ¿Qué tipo de alianza buscas?
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.88rem', color: 'var(--ink-200)', lineHeight: 1.8 }}>
                <li className="icon-inline"><Icon name="check" size={15} /> Agencias de viaje (B2B)</li>
                <li className="icon-inline"><Icon name="check" size={15} /> Operadores turísticos</li>
                <li className="icon-inline"><Icon name="check" size={15} /> Hoteles y lodges</li>
                <li className="icon-inline"><Icon name="check" size={15} /> Guías independientes</li>
                <li className="icon-inline"><Icon name="check" size={15} /> Transporte turístico</li>
                <li className="icon-inline"><Icon name="check" size={15} /> Empresas de aventura</li>
              </ul>

              <div className="aside-divider"></div>

              <p style={{ fontSize: '0.85rem', color: 'var(--ink-300)', textAlign: 'center', margin: 0 }}>
                <Icon name="card" size={16} style={{ marginRight: 4 }} />
                <strong style={{ color: 'var(--white)' }}>Pagos con Zwap</strong>
              </p>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
