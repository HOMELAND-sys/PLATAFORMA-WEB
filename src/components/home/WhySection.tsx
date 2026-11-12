import Reveal from '@/components/ui/Reveal';
import DrawIcon from '@/components/ui/DrawIcon';

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
                <DrawIcon name="chat" size={32} />
              </div>
              <h3>De viajeros para viajeros</h3>
              <p>Conocemos cada rincón de Bolivia porque vivimos aquí. Te llevamos a los lugares que recomendaríamos a un amigo.</p>
            </article>
          </Reveal>

          <Reveal>
            <article className="why-card">
              <div className="why-card__icon">
                <DrawIcon name="shield-check" size={32} delay={0.12} />
              </div>
              <h3>Reserva sin preocupaciones</h3>
              <p>Políticas de cancelación flexibles y confirmación inmediata. Tu inversión está protegida mientras planificas.</p>
            </article>
          </Reveal>

          <Reveal>
            <article className="why-card">
              <div className="why-card__icon">
                <DrawIcon name="sparkle" size={32} delay={0.24} />
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
