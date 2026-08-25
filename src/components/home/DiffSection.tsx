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
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <h3>Cero estrés, 100% aventura</h3>
            <p>Toda la logística resuelta. Vos solo preocupate por disfrutar.</p>
          </article>

          <article className="diff-card">
            <div className="diff-card__icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="12" cy="8" r="6" />
                <path d="M9 14l-2 8 5-3 5 3-2-8" />
              </svg>
            </div>
            <h3>Guías locales certificados</h3>
            <p>Nacidos en la región, hablan inglés y español, conocen cada leyenda.</p>
          </article>

          <article className="diff-card">
            <div className="diff-card__icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
            </div>
            <h3>Grupos pequeños, impacto grande</h3>
            <p>Máximo 12 personas por salida. Más conexión con el lugar y sus habitantes.</p>
          </article>

          <article className="diff-card">
            <div className="diff-card__icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M12 2 4 6v6c0 5 4 9 8 10 4-1 8-5 8-10V6l-8-4z" />
              </svg>
            </div>
            <h3>Turismo responsable</h3>
            <p>Apoyamos comunidades locales y minimizamos nuestra huella ambiental.</p>
          </article>
        </div>
      </div>
    </section>
  );
}
