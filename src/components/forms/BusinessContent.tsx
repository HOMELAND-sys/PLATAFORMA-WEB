'use client';

import { useState } from 'react';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import CalendarScheduler from '@/components/forms/CalendarScheduler';

const STATES = [
  'Seleccioná', 'La Paz', 'Cochabamba', 'Santa Cruz', 'Oruro',
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
          <Breadcrumbs light items={[{ label: 'Home', href: '/' }, { label: 'Empresas' }]} />
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
              <label className="field__label">Contanos brevemente</label>
              <textarea
                className="textarea"
                rows={5}
                placeholder="Ej. Somos una agencia de viajes en Buenos Aires interesada en ofrecer tours a Bolivia a nuestros clientes. Buscamos tarifas especiales para grupos de 10+..."
              ></textarea>
            </div>

            <label className="checkbox" style={{ marginBottom: 20 }}>
              <input type="checkbox" required />
              <span style={{ fontSize: '0.88rem' }}>
                Acepto los{' '}
                <a href="#" style={{ color: 'var(--green-700)', textDecoration: 'underline' }}>
                  términos y condiciones
                </a>{' '}
                y la{' '}
                <a href="#" style={{ color: 'var(--green-700)', textDecoration: 'underline' }}>
                  política de privacidad
                </a>
                .
              </span>
            </label>

            <button type="submit" className="btn btn--primary btn--lg btn--block">
              Agendar reunión
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </button>
          </form>

          <aside>
            <div className="aside-card">
              <h3>Alianzas comerciales</h3>
              <p>
                ¿Tenés una agencia, operador turístico o empresa interesada en ofrecer Bolivia a tus clientes?
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
                <p style={{ fontSize: '1.3rem', color: 'var(--gold-400)', fontWeight: 600, margin: 0 }}>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }}
                  >
                    <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 4.9L2 22l5.3-1.4c1.4.7 3 1.2 4.7 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2z" />
                  </svg>
                  +591 760-12346
                </p>
              </div>

              <div className="aside-divider"></div>

              <h4 style={{ color: 'var(--white)', fontSize: '0.95rem', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                ¿Qué tipo de alianza buscás?
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.88rem', color: 'var(--ink-200)', lineHeight: 1.8 }}>
                <li>✓ Agencias de viaje (B2B)</li>
                <li>✓ Operadores turísticos</li>
                <li>✓ Hoteles y lodges</li>
                <li>✓ Guías independientes</li>
                <li>✓ Transporte turístico</li>
                <li>✓ Empresas de aventura</li>
              </ul>

              <div className="aside-divider"></div>

              <p style={{ fontSize: '0.85rem', color: 'var(--ink-300)', textAlign: 'center', margin: 0 }}>
                💳 <strong style={{ color: 'var(--white)' }}>Pagos con Zwap</strong>
              </p>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
