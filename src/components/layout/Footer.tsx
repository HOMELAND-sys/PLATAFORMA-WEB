import Link from 'next/link';
import HomelandLogo from '@/components/brand/HomelandLogo';
import Icon from '@/components/ui/Icon';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <HomelandLogo className="footer-logo" height={56} />
        <div className="footer-grid">
          <div className="footer-col">
            <h4>NOSOTROS</h4>
            <ul className="footer-contact">
              <li>
                <Icon name="phone" size={18} className="ic" />
                <span>
                  <a href="tel:+59176012345">
                    <strong>Phone:</strong> (+591) 760 12345
                  </a>
                  <small>(WhatsApp)</small>
                  <span className="schedule">Lun–Vie, 9am–12pm / 14:00–18:00</span>
                </span>
              </li>
              <li>
                <Icon name="mobile" size={18} className="ic" />
                <span>
                  <a href="tel:+59176012345">
                    <strong>Mobile:</strong> (+591) 760 12345
                  </a>
                  <small>(WhatsApp)</small>
                </span>
              </li>
              <li>
                <Icon name="mail" size={18} className="ic" />
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
