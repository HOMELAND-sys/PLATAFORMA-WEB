'use client';

import { useContactForm } from '@/lib/use-contact-form';
import FormCompanyContact from './FormCompanyContact';
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
  const { submitted, busy, error, handleSubmit } = useContactForm('customize');

  return (
    <div className="form-page-wrap">
      <div className="form-page-wrap__bg">
        <img src="/assets/rainbow-mountain.jpg" alt="" />
      </div>

      <section className="form-hero">
        <div className="container">
          <Breadcrumbs light items={[{ label: 'Inicio', href: '/' }, { label: 'Personalizar viaje' }]} />
          <h1>
            ¡Hablemos de tu próxima <em>aventura!</em>
          </h1>
          <p>
            Cuanto más sepamos sobre ti y lo que te imaginas, más inolvidable será tu viaje. Completa el
            formulario y nos pondremos en contacto en menos de 24 horas.
          </p>
        </div>
      </section>

      <section className="form-page">
        <div className="container form-page__layout">
          <form className="form-card" onSubmit={handleSubmit} aria-busy={busy}>
            <div aria-hidden="true" style={{ position: 'absolute', left: -10000 }}><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
            {error && <div className="auth-alert auth-alert--error" role="alert">{error}</div>}
            {submitted && (
              <div className="success-banner" role="status">✓ Consulta recibida. Nuestro equipo revisará tu viaje y se pondrá en contacto contigo.</div>
            )}
            <h2>¡Hablemos de tu próxima aventura!</h2>
            <p>
              Como nos interesa saber más sobre ti y es importante que tu experiencia de viaje sea inolvidable,
              necesitamos los siguientes datos:
            </p>

            <h4 className="form-section-title">Información personal</h4>
            <div className="form-row">
              <div className="field">
                <label className="field__label">
                  Nombre <span className="req">*</span>
                </label>
                <input className="input" name="first_name" aria-label="Nombre" type="text" placeholder="Ej. Juan" required />
              </div>
              <div className="field">
                <label className="field__label">
                  Apellido <span className="req">*</span>
                </label>
                <input className="input" name="last_name" aria-label="Apellido" type="text" placeholder="Ej. Pérez" required />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label className="field__label">
                  Elige tu país <span className="req">*</span>
                </label>
                <select name="country" aria-label="País" className="select" required>
                  {COUNTRIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="field__label">
                  Ciudad <span className="req">*</span>
                </label>
                <input className="input" name="city" aria-label="Ciudad" type="text" placeholder="Ej. Buenos Aires" required />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label className="field__label">
                  Número de pasajeros <span className="req">*</span>
                </label>
                <input className="input" name="passengers" aria-label="Número de pasajeros" type="number" min={1} max={20} placeholder="Ej. 2" required />
              </div>
              <div className="field">
                <label className="field__label">
                  Días de viaje <span className="req">*</span>
                </label>
                <input className="input" name="days" aria-label="Días de viaje" type="number" min={1} max={30} placeholder="Ej. 7" required />
              </div>
            </div>

            <h4 className="form-section-title">Fechas del viaje</h4>
            <div className="form-row form-row--3">
              <div className="field">
                <label className="field__label">
                  Fecha de inicio del viaje <span className="req">*</span>
                </label>
                <input className="input" name="start_date" aria-label="Fecha de inicio" type="date" required />
              </div>
              <div className="field">
                <label className="field__label">Fecha alternativa</label>
                <input className="input" name="alternative_date" aria-label="Fecha alternativa" type="date" />
                <div className="field__hint">Por si tu primera opción no está disponible</div>
              </div>
              <div className="field">
                <label className="field__label">
                  Fecha de regreso del viaje <span className="req">*</span>
                </label>
                <input className="input" name="end_date" aria-label="Fecha de regreso" type="date" required />
              </div>
            </div>

            <h4 className="form-section-title">Contacto</h4>
            <div className="form-row">
              <div className="field">
                <label className="field__label">
                  Correo electrónico <span className="req">*</span>
                </label>
                <input className="input" name="email" aria-label="Correo electrónico" type="email" placeholder="tu@correo.com" required />
              </div>
              <div className="field">
                <label className="field__label">
                  Reconfirmar correo electrónico <span className="req">*</span>
                </label>
                <input className="input" name="confirm_email" aria-label="Reconfirmar correo electrónico" type="email" placeholder="tu@correo.com" required />
              </div>
            </div>
            <div className="form-row">
              <div className="field">
                <label className="field__label">
                  Número de teléfono <span className="req">*</span>
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select name="phone_code" aria-label="Código de país" className="select" style={{ width: 110 }}>
                    {PHONE_CODES.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.flag} {p.code}
                      </option>
                    ))}
                  </select>
                  <input className="input" name="phone" aria-label="Número de teléfono" type="tel" placeholder="Tu número de teléfono" required />
                </div>
              </div>
              <div className="field">
                <label className="field__label">Interés en viajar</label>
                <input className="input" name="interests" aria-label="Intereses del viaje" type="text" placeholder="Ej. Aventura, cultura, fotografía..." />
              </div>
            </div>

            <h4 className="form-section-title">Alojamiento y servicios</h4>
            <div className="field" style={{ marginBottom: 16 }}>
              <label className="field__label">Categoría de hotel</label>
              <input className="input" name="hotel" aria-label="Categoría de hotel" type="text" placeholder="Ej. Estándar 3 estrellas, B&B familiar..." />
            </div>
            <div className="field" style={{ marginBottom: 16 }}>
              <label className="field__label">Mensaje adicional</label>
              <textarea
                name="message" aria-label="Mensaje adicional" maxLength={2000} className="textarea"
                rows={5}
                placeholder="Cuéntanos más sobre tu viaje soñado, expectativas, ocasión especial, etc."
              ></textarea>
            </div>

            <h4 className="form-section-title">Tipo de tour</h4>
            <div className="radio-pills" style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 24 }}>
              <span className="radio-pill">
                <input type="radio" name="tour_type" value="Compartido" aria-label="Excursiones compartidas" defaultChecked /> Excursiones compartidas
              </span>
              <span className="radio-pill">
                <input type="radio" name="tour_type" value="Privado" aria-label="Tours privados" /> Tours privados
              </span>
            </div>

            <label className="checkbox" style={{ marginBottom: 20 }}>
              <input type="checkbox" required />
              <span style={{ fontSize: '0.88rem' }}>
                Acepto recibir información sobre mi viaje y ofertas de Homeland Tours.
              </span>
            </label>

            <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={busy || submitted}>
              {busy ? 'Enviando…' : submitted ? 'Consulta enviada' : 'Enviar consulta'}
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

              <FormCompanyContact />

              <div className="aside-divider"></div>

              <p style={{ fontSize: '0.85rem', color: 'var(--ink-300)', textAlign: 'center', margin: 0 }}>
                <Icon name="lock" size={16} style={{ marginRight: 4 }} />
                <strong style={{ color: 'var(--white)' }}>Reserva segura y atención directa</strong>
              </p>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
