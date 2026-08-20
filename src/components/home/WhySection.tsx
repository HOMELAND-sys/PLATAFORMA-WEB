import Reveal from '@/components/ui/Reveal';

export default function WhySection() {
  return (
    <section className="section why">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">¿Por qué reservar con Homeland Tours?</p>
          <h2>De viajeros para viajeros, con corazón local</h2>
          <p>
            No somos una plataforma global. Somos un operador 100% boliviano, con gente de aquí diseñando las
            experiencias que nos gustaría vivir a nosotros.
          </p>
        </div>

        <div className="why__grid">
          <Reveal>
            <article className="why-card">
              <div className="why-card__icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
              </div>
              <h3>De viajeros para viajeros</h3>
              <p>Conocemos cada rincón de Bolivia porque vivimos aquí. Te llevamos a los lugares que recomendaríamos a un amigo.</p>
            </article>
          </Reveal>

          <Reveal>
            <article className="why-card">
              <div className="why-card__icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M9 12l2 2 4-4" />
                  <path d="M12 2 4 6v6c0 5 4 9 8 10 4-1 8-5 8-10V6l-8-4z" />
                </svg>
              </div>
              <h3>Reserva sin preocupaciones</h3>
              <p>Políticas de cancelación flexibles y confirmación inmediata. Tu inversión está protegida mientras planificas.</p>
            </article>
          </Reveal>

          <Reveal>
            <article className="why-card">
              <div className="why-card__icon">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <circle cx="12" cy="8" r="6" />
                  <path d="M9 14l-2 8 5-3 5 3-2-8" />
                </svg>
              </div>
              <h3>Experiencias auténticas</h3>
              <p>Los mejores tours con operadores locales seleccionados. Comida real, hospedaje familiar y guías que hablan tu idioma.</p>
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
