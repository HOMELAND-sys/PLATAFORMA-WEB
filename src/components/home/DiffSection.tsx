import DrawIcon from '@/components/ui/DrawIcon';

export default function DiffSection() {
  return (
    <section className="section section-dark diff">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow center" style={{ color: 'var(--ink-900)' }}>
            Lo que nos hace diferentes
          </p>
          <h2>¿Por qué viajar con Homeland Tours?</h2>
        </div>

        <div className="diff__grid">
          <article className="diff-card">
            <div className="diff-card__icon">
              <DrawIcon name="compass" size={34} />
            </div>
            <h3>Cero estrés, 100% aventura</h3>
            <p>Toda la logística resuelta. Vos solo preocupate por disfrutar.</p>
          </article>

          <article className="diff-card">
            <div className="diff-card__icon">
              <DrawIcon name="award" size={34} delay={0.1} />
            </div>
            <h3>Guías locales certificados</h3>
            <p>Nacidos en la región, hablan inglés y español, conocen cada leyenda.</p>
          </article>

          <article className="diff-card">
            <div className="diff-card__icon">
              <DrawIcon name="users" size={34} delay={0.2} />
            </div>
            <h3>Grupos pequeños, impacto grande</h3>
            <p>Máximo 12 personas por salida. Más conexión con el lugar y sus habitantes.</p>
          </article>

          <article className="diff-card">
            <div className="diff-card__icon">
              <DrawIcon name="leaf" size={34} delay={0.3} />
            </div>
            <h3>Turismo responsable</h3>
            <p>Apoyamos comunidades locales y minimizamos nuestra huella ambiental.</p>
          </article>
        </div>
      </div>
    </section>
  );
}
