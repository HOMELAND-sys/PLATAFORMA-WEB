'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import HomelandLogo from '@/components/brand/HomelandLogo';
import Icon from '@/components/ui/Icon';
import Reveal from '@/components/ui/Reveal';
import { fetchCategories, type CategoryRow } from '@/lib/api';
import { getSupabase } from '@/lib/supabase';
import { FOOTER_CTA } from '@/data/site-photos';

// Datos de contacto que ya existen en el proyecto (WhatsAppFab, voucher-data, footer anterior).
const WHATSAPP_URL = 'https://wa.me/59176012345';
const PHONE_TEL = 'tel:+59176012345';
const PHONE_LABEL = '(+591) 760 12345';
const EMAIL = 'info@homeland.tours';
const SCHEDULE = 'Lun–Vie, 9am–12pm / 14:00–18:00';

interface CompanyLinks {
  facebook?: string;
  instagram?: string;
  tiktok?: string;
}

function safeUrl(url?: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return mobile;
}

function FooterCol({ title, mobile, children }: { title: string; mobile: boolean; children: ReactNode }) {
  if (mobile) {
    return (
      <details className="footer-col footer-col--acc">
        <summary>
          {title}
          <Icon name="chevron-down" size={16} className="footer-col__chev" />
        </summary>
        <div className="footer-col__body">{children}</div>
      </details>
    );
  }
  return (
    <div className="footer-col">
      <h4>{title}</h4>
      <div className="footer-col__body">{children}</div>
    </div>
  );
}

const SOCIAL_GLYPHS: Record<string, ReactNode> = {
  facebook: (
    <path d="M13.4 21v-6.9h2.3l.4-2.7h-2.7V9.7c0-.8.2-1.3 1.3-1.3h1.5V6c-.3 0-1.2-.1-2.2-.1-2.2 0-3.6 1.3-3.6 3.7v2H8.1v2.7h2.3V21h3Z" />
  ),
  instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="17.2" cy="6.8" r="1.2" />
    </>
  ),
  tiktok: (
    <path d="M16.6 3c.4 2.3 1.9 3.8 4.1 4v2.9c-1.6 0-3-.5-4.1-1.4v6.3a5.8 5.8 0 1 1-5-5.7v3a2.8 2.8 0 1 0 2 2.7V3h3Z" />
  ),
};

export default function Footer() {
  const mobile = useIsMobile();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [social, setSocial] = useState<CompanyLinks>({});

  useEffect(() => {
    let active = true;
    fetchCategories(getSupabase())
      .then((cats) => {
        if (active) setCategories(cats);
      })
      .catch(() => undefined);
    // Redes sociales: solo las que la operatora configuró en Ajustes (settings.company).
    const loadSocial = async () => {
      try {
        const { data, error } = await getSupabase()
          .from('settings')
          .select('value')
          .eq('key', 'company')
          .maybeSingle();
        if (!active || error || !data) return;
        const value = data.value as CompanyLinks | null;
        if (value && typeof value === 'object') setSocial(value);
      } catch {
        // sin redes configuradas: la fila simplemente no se muestra
      }
    };
    void loadSocial();
    return () => {
      active = false;
    };
  }, []);

  const socialLinks = (['facebook', 'instagram', 'tiktok'] as const)
    .map((key) => ({ key, url: safeUrl(social[key]) }))
    .filter((s): s is { key: 'facebook' | 'instagram' | 'tiktok'; url: string } => Boolean(s.url));

  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      {/* ---------- Banda CTA con fotografía real ---------- */}
      <section className="footer-cta" aria-label="Invitación a reservar">
        <img
          className="footer-cta__bg"
          src={FOOTER_CTA.src}
          alt={FOOTER_CTA.alt}
          loading="lazy"
          decoding="async"
        />
        <div className="footer-cta__overlay" aria-hidden="true" />
        <div className="container footer-cta__inner">
          <Reveal>
            <p className="footer-cta__eyebrow">Bolivia te espera</p>
            <h2 className="footer-cta__title">
              ¿Listo para tu próxima <em>aventura</em>?
            </h2>
            <p className="footer-cta__sub">
              Salar de Uyuni, Amazonía, Cordillera y más: viajes auténticos diseñados por gente de
              aquí, con operadores locales y precio justo.
            </p>
            <div className="footer-cta__actions">
              <Link className="btn btn--primary btn--lg" href="/tours">
                Ver tours <Icon name="arrow-right" size={17} />
              </Link>
              <a
                className="btn btn--outline-white btn--lg"
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon name="whatsapp" size={18} /> Escríbenos por WhatsApp
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- Cuerpo ---------- */}
      <div className="footer-body">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand-col">
              <HomelandLogo className="footer-logo" height={92} />
              <p className="footer-brand__text">
                <strong>Authentic journeys. Local hearts.</strong>
                Operador 100% boliviano: viajes auténticos diseñados por gente de aquí.
              </p>
              {socialLinks.length > 0 && (
                <div className="footer-social" aria-label="Redes sociales">
                  {socialLinks.map(({ key, url }) => (
                    <a
                      key={key}
                      className="footer-social__btn"
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={key === 'facebook' ? 'Facebook' : key === 'instagram' ? 'Instagram' : 'TikTok'}
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                        {SOCIAL_GLYPHS[key]}
                      </svg>
                    </a>
                  ))}
                </div>
              )}
            </div>

            <FooterCol title="Explorar" mobile={mobile}>
              <ul className="footer-links">
                <li>
                  <Link href="/tours">Todos los tours</Link>
                </li>
                {categories.map((cat) => (
                  <li key={cat.slug}>
                    <Link href={`/tours?cat=${cat.slug}`}>{cat.label}</Link>
                  </li>
                ))}
                <li>
                  <Link href="/customize">Personalizar viaje</Link>
                </li>
              </ul>
            </FooterCol>

            <FooterCol title="Empresa" mobile={mobile}>
              <ul className="footer-links">
                <li>
                  <Link href="/#nosotros">Sobre nosotros</Link>
                </li>
                <li>
                  <Link href="/#nuestra-diferencia">Nuestra diferencia</Link>
                </li>
                <li>
                  <Link href="/customize">Formulario de reserva</Link>
                </li>
                <li>
                  <Link href="/bookings">Mis reservas</Link>
                </li>
              </ul>
            </FooterCol>

            <FooterCol title="Contacto" mobile={mobile}>
              <ul className="footer-contact">
                <li>
                  <Icon name="whatsapp" size={17} className="ic" />
                  <span>
                    <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                      WhatsApp
                    </a>
                    <small>Respuesta rápida en horario de oficina</small>
                  </span>
                </li>
                <li>
                  <Icon name="phone" size={17} className="ic" />
                  <span>
                    <a href={PHONE_TEL}>{PHONE_LABEL}</a>
                    <small className="schedule">{SCHEDULE}</small>
                  </span>
                </li>
                <li>
                  <Icon name="mail" size={17} className="ic" />
                  <span>
                    <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
                  </span>
                </li>
              </ul>
            </FooterCol>
          </div>

          {/* ---------- Sellos de confianza (los que ya usa el sitio) ---------- */}
          <div className="footer-trust" aria-label="Garantías Homeland Tours">
            <div className="footer-trust__item">
              <Icon name="shield-check" size={22} />
              <span>
                <strong>Pago seguro</strong>
                <small>Zwap, enlace o QR</small>
              </span>
            </div>
            <div className="footer-trust__item">
              <Icon name="rotate-ccw" size={22} />
              <span>
                <strong>Cancelación gratuita</strong>
                <small>En tours seleccionados · consultá condiciones</small>
              </span>
            </div>
            <div className="footer-trust__item">
              <Icon name="badge-check" size={22} />
              <span>
                <strong>Operador local</strong>
                <small>100% boliviano</small>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Barra inferior ---------- */}
      <div className="footer-bottom">
        <div className="container footer-bottom__inner">
          <span className="footer-copyright">
            © {year} Homeland Tours. Todos los derechos reservados.
          </span>
          <div className="footer-bottom__right">
            <span className="footer-locale" title="Idioma y moneda del sitio">
              <Icon name="globe" size={15} /> ES · US$
            </span>
            <div className="footer-payments" aria-label="Métodos de pago aceptados">
              <span className="pay-badge pay-badge--visa" aria-label="Visa">VISA</span>
              <span className="pay-badge pay-badge--mastercard" aria-label="Mastercard">MC</span>
              <span className="pay-badge pay-badge--paypal" aria-label="PayPal">PayPal</span>
              <span className="pay-badge pay-badge--zwap" aria-label="Zwap">Zwap</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}