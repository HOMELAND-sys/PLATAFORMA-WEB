'use client';

import { useState } from 'react';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import CalendarScheduler from '@/components/forms/CalendarScheduler';
import Icon from '@/components/ui/Icon';

const STATES = [
  'Selecciona', 'La Paz', 'Cochabamba', 'Santa Cruz', 'Oruro',
  'Potosí', 'Chuquisaca', 'Tarija', 'Beni', 'Pando', 'Otro',
];

const COUNTRY_CODES = ['+591', '+54', '+34', '+1', '+52', '+56', '+51'];

export default function BusinessContent() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
          <form className="form-card" onSubmit={handleSubmit}>
            {submitted && (
              <div className="success-banner">
                ✓ ¡Reunión agendada! Te enviaremos un email de confirmación.
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
                <input className="input" type="text" placeholder="Nombre" required />
              </div>
              <div className="field">
                <label className="field__label">
                  Apellido <span className="req">*</span>
                </label>
                <input className="input" type="text" placeholder="Apellido" required />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label className="field__label">
                  Número de contacto <span className="req">*</span>
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select className="select" style={{ width: 100 }}>
                    {COUNTRY_CODES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <input className="input" type="tel" placeholder="712 34567" required />
                </div>
              </div>
              <div className="field">
                <label className="field__label">
                  Dirección de correo electrónico <span className="req">*</span>
                </label>
                <input className="input" type="email" placeholder="ejemplo@empresa.com" required />
              </div>
            </div>

            <h4 className="form-section-title">Información de la empresa</h4>
            <div className="field" style={{ marginBottom: 16 }}>
              <label className="field__label">
                Empresa <span className="req">*</span>
              </label>
              <input className="input" type="text" placeholder="Nombre de empresa" required />
            </div>
            <div className="field" style={{ marginBottom: 16 }}>
              <label className="field__label">
                Dirección <span className="req">*</span>
              </label>
              <input className="input" type="text" placeholder="Av. Principal #123, Edificio Torre, Piso 4" required />
            </div>
            <div className="form-row form-row--3">
              <div className="field">
                <label className="field__label">
                  Ciudad <span className="req">*</span>
                </label>
                <input className="input" type="text" placeholder="Ciudad" required />
              </div>
              <div className="field">
                <label className="field__label">Estado / Provincia</label>
                <select className="select">
                  {STATES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="field__label">Código postal</label>
                <input className="input" type="text" placeholder="0000" />
              </div>
            </div>
            <div className="field" style={{ marginBottom: 16 }}>
              <label className="field__label">
                País <span className="req">*</span>
              </label>
              <input className="input" type="text" defaultValue="Bolivia" required />
            </div>

            <h4 className="form-section-title">Agendemos una reunión de negocios</h4>
            <CalendarScheduler />

            <h4 className="form-section-title">¿Qué servicios te interesan u ofrecer?</h4>
            <div className="field" style={{ marginBottom: 16 }}>
              <label className="field__label">Cuéntanos brevemente</label>
              <textarea
                className="textarea"
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

            <button type="submit" className="btn btn--primary btn--lg btn--block">
              Agendar reunión
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

              <div className="aside-contact">
                <p style={{ fontSize: '0.9rem', lineHeight: 1.7 }}>
                  <a href="mailto:partners@homeland.tours" className="aside-link">
                    partners@homeland.tours
                  </a>
                  <br />
                  <a href="mailto:aliados@homeland.tours" className="aside-link">
                    aliados@homeland.tours
                  </a>
                </p>

                <h4 style={{ color: 'var(--white)', fontSize: '0.85rem', margin: '18px 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Equipo de alianzas
                </h4>
                <p style={{ fontSize: '0.92rem', color: 'var(--white)', fontWeight: 500, margin: '0 0 16px' }}>
                  Lunes a viernes, 9:00 a 18:00.
                </p>

                <h4 style={{ color: 'var(--white)', fontSize: '0.85rem', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  WhatsApp B2B
                </h4>
                <p style={{ fontSize: '1.3rem', color: 'var(--accent-400)', fontWeight: 600, margin: 0 }}>
                  <Icon name="whatsapp" size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} />
                  +591 760-12346
                </p>
              </div>

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
