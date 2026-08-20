import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-col">
            <h4>NOSOTROS</h4>
            <ul className="footer-contact">
              <li>
                <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <span>
                  <a href="tel:+59176012345">
                    <strong>Phone:</strong> (+591) 760 12345
                  </a>
                  <small>(WhatsApp)</small>
                  <span className="schedule">Lun–Vie, 9am–12pm / 14:00–18:00</span>
                </span>
              </li>
              <li>
                <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
                <span>
                  <a href="tel:+59176012345">
                    <strong>Mobile:</strong> (+591) 760 12345
                  </a>
                  <small>(WhatsApp)</small>
                </span>
              </li>
              <li>
                <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <span>
                  <strong>Mail:</strong> <a href="mailto:info@homeland.tours">info@homeland.tours</a>
                </span>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>INFORMACIÓN</h4>
            <ul className="footer-links">
              <li>
                <Link href="/business">Sobre nosotros</Link>
              </li>
              <li>
                <Link href="/business">Nuestra diferencia</Link>
              </li>
              <li>
                <Link href="/business">Preguntas frecuentes</Link>
              </li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>RECURSOS</h4>
            <ul className="footer-links">
              <li>
                <a href="#">Condiciones de reserva</a>
              </li>
              <li>
                <a href="#">Cancelaciones y reembolsos</a>
              </li>
              <li>
                <a href="#">Política de privacidad</a>
              </li>
              <li>
                <Link href="/customize">Formulario de reserva</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span className="footer-copyright">© 2026 HOMELAND TOURS. Todos los derechos reservados</span>
          <div className="footer-payments" aria-label="Métodos de pago aceptados">
            <span className="pay-badge pay-badge--visa" aria-label="Visa">VISA</span>
            <span className="pay-badge pay-badge--mastercard" aria-label="Mastercard">MC</span>
            <span className="pay-badge pay-badge--paypal" aria-label="PayPal">PayPal</span>
            <span className="pay-badge pay-badge--zwap" aria-label="Zwap">Zwap</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
