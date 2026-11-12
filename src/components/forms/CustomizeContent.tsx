'use client';

import { useState } from 'react';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import Icon from '@/components/ui/Icon';

const COUNTRIES = [
  'Afganistán', 'Alemania', 'Argentina', 'Australia', 'Bolivia', 'Brasil',
  'Canadá', 'Chile', 'Colombia', 'Ecuador', 'España', 'Estados Unidos',
  'Francia', 'México', 'Perú', 'Reino Unido', 'Uruguay', 'Otro',
];

const PHONE_CODES = [
  { flag: '🇧🇴', code: '+591' },
  { flag: '🇦🇷', code: '+54' },
  { flag: '🇪🇸', code: '+34' },
  { flag: '🇺🇸', code: '+1' },
  { flag: '🇲🇽', code: '+52' },
  { flag: '🇨🇱', code: '+56' },
  { flag: '🇵🇪', code: '+51' },
];

export default function CustomizeContent() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="form-page-wrap">
      <div className="form-page-wrap__bg">
        <img src="/assets/rainbow-mountain.jpg" alt="" />
      </div>

      <section className="form-hero">
        <div className="container">
          <Breadcrumbs light items={[{ label: 'Home', href: '/' }, { label: 'Personalizar viaje' }]} />
          <h1>
            ¡Hablemos de tu próxima <em>aventura!</em>
          </h1>
          <p>
            Cuanto más sepamos sobre vos y lo que te imaginás, más inolvidable será tu viaje. Completá el
            formulario y nos pondremos en contacto en menos de 24 horas.
          </p>
        </div>
      </section>

      <section className="form-page">
        <div className="container form-page__layout">
          <form className="form-card" onSubmit={handleSubmit}>
            {submitted && (
              <div className="success-banner">✓ ¡Gracias! Te contactaremos en menos de 24 horas.</div>
            )}
            <h2>¡Hablemos de tu próxima aventura!</h2>
            <p>
              Como nos interesa saber más sobre vos y es importante que tu experiencia de viaje sea inolvidable,
              necesitamos los siguientes datos:
            </p>

            <h4 className="form-section-title">Información personal</h4>
            <div className="form-row">
              <div className="field">
                <label className="field__label">
                  Nombre <span className="req">*</span>
                </label>
                <input className="input" type="text" placeholder="Ej. Juan" required />
              </div>
              <div className="field">
                <label className="field__label">
                  Apellido <span className="req">*</span>
                </label>
                <input className="input" type="text" placeholder="Ej. Pérez" required />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label className="field__label">
                  Elige tu país <span className="req">*</span>
                </label>
                <select className="select" required>
                  {COUNTRIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="field__label">
                  Ciudad <span className="req">*</span>
                </label>
                <input className="input" type="text" placeholder="Ej. Buenos Aires" required />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label className="field__label">
                  Número de pasajeros <span className="req">*</span>
                </label>
                <input className="input" type="number" min={1} max={20} placeholder="Ej. 2" required />
              </div>
              <div className="field">
                <label className="field__label">
                  Días de viaje <span className="req">*</span>
                </label>
                <input className="input" type="number" min={1} max={30} placeholder="Ej. 7" required />
              </div>
            </div>

            <h4 className="form-section-title">Fechas del viaje</h4>
            <div className="form-row form-row--3">
              <div className="field">
                <label className="field__label">
                  Fecha de inicio del viaje <span className="req">*</span>
                </label>
                <input className="input" type="date" required />
              </div>
              <div className="field">
                <label className="field__label">Fecha alternativa</label>
                <input className="input" type="date" />
                <div className="field__hint">Por si tu primera opción no está disponible</div>
              </div>
              <div className="field">
                <label className="field__label">
                  Fecha de regreso del viaje <span className="req">*</span>
                </label>
                <input className="input" type="date" required />
              </div>
            </div>

            <h4 className="form-section-title">Contacto</h4>
            <div className="form-row">
              <div className="field">
                <label className="field__label">
                  Correo electrónico <span className="req">*</span>
                </label>
                <input className="input" type="email" placeholder="tu@correo.com" required />
              </div>
              <div className="field">
                <label className="field__label">
                  Reconfirmar correo electrónico <span className="req">*</span>
                </label>
                <input className="input" type="email" placeholder="tu@correo.com" required />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label className="field__label">
                  Número de teléfono <span className="req">*</span>
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select className="select" style={{ width: 110 }}>
                    {PHONE_CODES.map((p) => (
                      <option key={p.code}>
                        {p.flag} {p.code}
                      </option>
                    ))}
                  </select>
                  <input className="input" type="tel" placeholder="(591) 555-0123" required />
                </div>
              </div>
              <div className="field">
                <label className="field__label">Interés en viajar</label>
                <input className="input" type="text" placeholder="Ej. Aventura, cultura, fotografía..." />
              </div>
            </div>

            <h4 className="form-section-title">Alojamiento y servicios</h4>
            <div className="field" style={{ marginBottom: 16 }}>
              <label className="field__label">Categoría de hotel</label>
              <input className="input" type="text" placeholder="Ej. Estándar 3 estrellas, B&B familiar..." />
            </div>
            <div className="field" style={{ marginBottom: 16 }}>
              <label className="field__label">Mensaje adicional</label>
              <textarea
                className="textarea"
                rows={5}
                placeholder="Contanos más sobre tu viaje soñado, expectativas, ocasión especial, etc."
              ></textarea>
            </div>

            <h4 className="form-section-title">Tipo de tour</h4>
            <div className="radio-pills" style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 24 }}>
              <span className="radio-pill">
                <input type="radio" name="tourType" defaultChecked /> Excursiones compartidas
              </span>
              <span className="radio-pill">
                <input type="radio" name="tourType" /> Tours privados
              </span>
            </div>

            <label className="checkbox" style={{ marginBottom: 20 }}>
              <input type="checkbox" required />
              <span style={{ fontSize: '0.88rem' }}>
                Acepto recibir información sobre mi viaje y ofertas de Homeland Tours.
              </span>
            </label>

            <button type="submit" className="btn btn--primary btn--lg btn--block">
              Entregar
              <Icon name="send" size={18} />
            </button>
          </form>

          <aside>
            <div className="aside-card">
              <h3>Contáctanos</h3>
              <p>
                Intentaremos responder a todas las consultas sobre nuestros viajes lo antes posible; sin embargo,
                algunas respuestas pueden tardar hasta 24 horas.
              </p>

              <div className="aside-contact">
                <p style={{ fontSize: '0.9rem', lineHeight: 1.7 }}>
                  <a href="mailto:bookings@homeland.tours" className="aside-link">
                    bookings@homeland.tours
                  </a>
                  <br />
                  <a href="mailto:request@homeland.tours" className="aside-link">
                    request@homeland.tours
                  </a>
                </p>

                <h4 style={{ color: 'var(--white)', fontSize: '0.85rem', margin: '18px 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Nuestro horario de apertura
                </h4>
                <p style={{ fontSize: '0.92rem', color: 'var(--white)', fontWeight: 500, margin: '0 0 16px' }}>
                  De lunes a sábado, de 7:00 a 22:00.
                </p>

                <h4 style={{ color: 'var(--white)', fontSize: '0.85rem', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Envíanos un mensaje por WhatsApp
                </h4>
                <p style={{ fontSize: '1.3rem', color: 'var(--accent-400)', fontWeight: 600, margin: 0 }}>
                  <Icon name="whatsapp" size={18} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} />
                  +591 760-12345
                </p>
              </div>

              <div className="aside-divider"></div>

              <p style={{ fontSize: '0.85rem', color: 'var(--ink-300)', textAlign: 'center', margin: 0 }}>
                <Icon name="lock" size={16} style={{ marginRight: 4 }} />
                <strong style={{ color: 'var(--white)' }}>Pagos seguros con Zwap</strong>
              </p>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
