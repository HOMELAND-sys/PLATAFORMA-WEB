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
import { useSite } from '@/context/SiteContext';
import { cancellationShort, primaryPhone, socialUrl, telHref, whatsappUrl } from '@/lib/site';

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

const SOCIAL_LABEL = { facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok' } as const;

export default function Footer() {
  const mobile = useIsMobile();
  const { company, policies } = useSite();
  const [categories, setCategories] = useState<CategoryRow[]>([]);

  useEffect(() => {
    let active = true;
    fetchCategories(getSupabase())
      .then((cats) => {
        if (active) setCategories(cats);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const wa = whatsappUrl(company, 'Hola, quisiera información sobre sus tours.');
  const phone = primaryPhone(company);
  const socialLinks = (['facebook', 'instagram', 'tiktok'] as const)
    .map((key) => ({ key, url: socialUrl(key, company[key]) }))
    .filter((s): s is { key: 'facebook' | 'instagram' | 'tiktok'; url: string } => Boolean(s.url));
  const hasContact = Boolean(wa || phone || company.email || company.address);
  const cancelLabel = cancellationShort(policies.free_cancellation_hours);
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      {/* ---------- Banda CTA con fotografía real ---------- */}
      <section className="footer-cta" aria-label="Invitación a reservar">
        <img className="footer-cta__bg" src={FOOTER_CTA.src} alt={FOOTER_CTA.alt} loading="lazy" decoding="async" />
        <div className="footer-cta__overlay" aria-hidden="true" />
        <div className="container footer-cta__inner">
          <Reveal>
            <p className="footer-cta__eyebrow">Bolivia te espera</p>
            <h2 className="footer-cta__title">
              ¿Listo para tu próxima <em>aventura</em>?
            </h2>
            <p className="footer-cta__sub">
              Elige tu tour, reserva tu fecha en minutos y nosotros nos ocupamos del resto: transporte,
              guías locales y todos los detalles.
            </p>
            <div className="footer-cta__actions">
              <Link className="btn btn--primary btn--lg" href="/tours">
                Ver tours <Icon name="arrow-right" size={17} />
              </Link>
              {wa ? (
                <a className="btn btn--outline-white btn--lg" href={wa} target="_blank" rel="noopener noreferrer">
                  <Icon name="whatsapp" size={18} /> Escríbenos por WhatsApp
                </a>
              ) : (
                <Link className="btn btn--outline-white btn--lg" href="/customize">
                  <Icon name="route" size={18} /> Arma tu viaje a medida
                </Link>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- Cuerpo ---------- */}
      <div className="footer-body">
        <div className="container">
          <div className="footer-grid footer-grid--5">
            <div className="footer-brand-col">
              <HomelandLogo className="footer-logo" height={92} />
              <p className="footer-brand__text">
                <strong>Viajes auténticos. Corazón local.</strong>
                Operadora de turismo boliviana: diseñamos y operamos cada salida con gente de aquí.
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
                      aria-label={SOCIAL_LABEL[key]}
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
              </ul>
            </FooterCol>

            <FooterCol title="Homeland Tours" mobile={mobile}>
              <ul className="footer-links">
                <li>
                  <Link href="/nosotros">Sobre nosotros</Link>
                </li>
                <li>
                  <Link href="/customize">Viaje a medida</Link>
                </li>
                <li>
                  <Link href="/business">Empresas y agencias</Link>
                </li>
                <li>
                  <Link href="/bookings">Mis reservas</Link>
                </li>
                <li>
                  <Link href="/favoritos">Mis favoritos</Link>
                </li>
              </ul>
            </FooterCol>

            <FooterCol title="Ayuda" mobile={mobile}>
              <ul className="footer-links">
                <li>
                  <Link href="/preguntas-frecuentes">Preguntas frecuentes</Link>
                </li>
                <li>
                  <Link href="/politica-de-cancelacion">Política de cancelación</Link>
                </li>
                <li>
                  <Link href="/terminos">Términos y condiciones</Link>
                </li>
                <li>
                  <Link href="/privacidad">Privacidad</Link>
                </li>
              </ul>
            </FooterCol>

            <FooterCol title="Contacto" mobile={mobile}>
              {hasContact ? (
                <ul className="footer-contact">
                  {wa && (
                    <li>
                      <Icon name="whatsapp" size={17} className="ic" />
                      <span>
                        <a href={wa} target="_blank" rel="noopener noreferrer">
                          WhatsApp
                        </a>
                        <small>Te respondemos en horario de oficina</small>
                      </span>
                    </li>
                  )}
                  {phone && (
                    <li>
                      <Icon name="phone" size={17} className="ic" />
                      <span>
                        <a href={telHref(phone)}>{phone}</a>
                      </span>
                    </li>
                  )}
                  {company.email && (
                    <li>
                      <Icon name="mail" size={17} className="ic" />
                      <span>
                        <a href={`mailto:${company.email}`}>{company.email}</a>
                      </span>
                    </li>
                  )}
                  {company.address && (
                    <li>
                      <Icon name="pin" size={17} className="ic" />
                      <span>{company.address}</span>
                    </li>
                  )}
                </ul>
              ) : (
                <ul className="footer-links">
                  <li>
                    <Link href="/customize">Escríbenos tu consulta</Link>
                  </li>
                </ul>
              )}
            </FooterCol>
          </div>

          <div className="footer-trust" aria-label="Garantías Homeland Tours">
            <div className="footer-trust__item">
              <Icon name="shield-check" size={22} />
              <span>
                <strong>Reserva segura</strong>
                <small>Pago con enlace o QR y voucher al instante</small>
              </span>
            </div>
            <div className="footer-trust__item">
              <Icon name="rotate-ccw" size={22} />
              <span>
                <strong>Cancelación flexible</strong>
                <small>{cancelLabel ? `${cancelLabel} · consulta las condiciones` : 'Consulta las condiciones de cada tour'}</small>
              </span>
            </div>
            <div className="footer-trust__item">
              <Icon name="badge-check" size={22} />
              <span>
                <strong>Operadora local</strong>
                <small>
                  100 % boliviana{company.license ? ` · Licencia ${company.license}` : ''}
                </small>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Barra inferior ---------- */}
      <div className="footer-bottom">
        <div className="container footer-bottom__inner">
          <span className="footer-copyright">
            © {year} {company.name || 'Homeland Tours'}. Todos los derechos reservados.
          </span>
          <div className="footer-bottom__right">
            <nav className="footer-legal" aria-label="Información legal">
              <Link href="/terminos">Términos</Link>
              <Link href="/privacidad">Privacidad</Link>
              <Link href="/politica-de-cancelacion">Cancelaciones</Link>
            </nav>
            <span className="footer-locale" title="Idioma y moneda del sitio">
              <Icon name="globe" size={15} /> Español · US$
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
