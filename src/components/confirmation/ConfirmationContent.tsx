'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useBooking } from '@/context/BookingContext';
import { useAuth } from '@/context/AuthContext';
import { fetchBookingByCode, fetchPaymentSettings, type MyBooking, type PaymentSettings } from '@/lib/api';
import { getSupabase } from '@/lib/supabase';
import { prefersReducedMotion } from '@/lib/intro';
import Icon from '@/components/ui/Icon';
import DrawIcon from '@/components/ui/DrawIcon';
import VoucherHero from './VoucherHero';
import VoucherTicket from './VoucherTicket';
import {
  SUPPORT_PHONE,
  bob,
  buildIcs,
  downloadBlob,
  leadPassenger,
  departureTime,
  money,
  whatsAppUrl,
} from './voucher-data';

gsap.registerPlugin(useGSAP, DrawSVGPlugin, MorphSVGPlugin, ScrollTrigger);

export default function ConfirmationContent() {
  const { result, hydrated } = useBooking();
  const searchParams = useSearchParams();
  const { session, loading: authLoading } = useAuth();
  const code = (searchParams.get('code') ?? result?.code ?? '').toUpperCase();

  const [booking, setBooking] = useState<MyBooking | null>(null);
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    // Espera la hidratación del contexto (result.code) y de la sesión (RLS)
    // antes de consultar; reinicia los estados en cada cambio de código para
    // que un notFound previo no persista al recargar /confirmation.
    if (!hydrated || authLoading) return;
    setNotFound(false);
    setBooking(null);
    setSettings(null);
    setLoading(true);
    if (!code) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    let active = true;
    (async () => {
      const [b, s] = await Promise.all([
        fetchBookingByCode(getSupabase(), code).catch(() => null),
        fetchPaymentSettings(getSupabase()).catch(() => null),
      ]);
      if (!active) return;
      if (!b) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setBooking(b);
      setSettings(s);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [code, hydrated, authLoading]);

  if (loading) return <VoucherLoading />;

  if (notFound || !booking) {
    return (
      <div className="form-hero form-hero--sm" style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.8rem', marginBottom: 8 }}>No encontramos esa reserva</h1>
        <p style={{ color: 'var(--ink-500)', marginBottom: 24 }}>
          {authLoading
            ? 'Un momento…'
            : !session
              ? 'Inicia sesión para ver tu voucher.'
              : 'Verifica el código de la reserva o vuelve al catálogo.'}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          {!session ? (
            <Link className="btn btn--primary" href="/login?next=/confirmation">
              Iniciar sesión
            </Link>
          ) : (
            <Link className="btn btn--primary" href="/bookings">
              Ver mis reservas
            </Link>
          )}
          <Link className="btn btn--ghost" href="/tours">
            Explorar tours
          </Link>
        </div>
      </div>
    );
  }

  return <VoucherPage booking={booking} settings={settings} />;
}

/* ------------------------------------------------------------------ */

function VoucherPage({ booking: b, settings }: { booking: MyBooking; settings: PaymentSettings | null }) {
  const root = useRef<HTMLDivElement>(null);
  const paid = b.status === 'confirmada' || b.status === 'completada';
  const cancelled = b.status === 'cancelada';
  const lead = leadPassenger(b);
  const info = b.tour_info ?? {};
  const time = departureTime(b);
  const hasPayment = Boolean(settings?.link || settings?.qrUrl);

  /* Paso activo de la línea de tiempo según el estado. */
  const stepDone = b.status === 'completada' ? 4 : b.status === 'confirmada' ? 2 : 0;

  useGSAP(
    () => {
      const el = root.current;
      if (!el || prefersReducedMotion()) return;
      const q = gsap.utils.selector(el);

      /* Revelado al hacer scroll */
      gsap.set(q('.reveal-up'), { autoAlpha: 0, y: 34 });
      ScrollTrigger.batch(q('.reveal-up'), {
        start: 'top 90%',
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.12, ease: 'power3.out', clearProps: 'transform' }),
      });

      /* Línea de pasos: el trazo avanza hasta el paso actual */
      const line = q('.steps__bar')[0];
      if (q('.steps')[0]) {
        if (line)
          gsap.from(line, {
            scaleX: 0,
            transformOrigin: '0% 50%',
            duration: 1.6,
            ease: 'power2.inOut',
            scrollTrigger: { trigger: q('.steps')[0], start: 'top 82%', once: true },
          });
        gsap.from(q('.steps__item'), {
          autoAlpha: 0,
          y: 20,
          duration: 0.8,
          stagger: 0.15,
          ease: 'power2.inOut',
          scrollTrigger: { trigger: q('.steps')[0], start: 'top 82%', once: true },
        });
        gsap.from(q('.steps__dot'), {
          scale: 0,
          duration: 0.6,
          stagger: 0.18,
          ease: 'back.out(2.6)',
          scrollTrigger: { trigger: q('.steps')[0], start: 'top 82%', once: true },
        });
      }

      /* QR de pago: brillo que lo recorre */
      const sheen = q('.pay-card__sheen')[0];
      if (sheen) {
        gsap.fromTo(
          sheen,
          { xPercent: -140 },
          { xPercent: 140, duration: 1.6, ease: 'power2.inOut', repeat: -1, repeatDelay: 2.8, delay: 1 },
        );
      }
    },
    { scope: root, dependencies: [b.code] },
  );

  const downloadQr = async (url: string) => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('fetch failed');
      downloadBlob(await res.blob(), 'image/png', 'qr-de-pago-homeland-tours.png');
    } catch {
      window.open(url, '_blank', 'noopener');
    }
  };

  const steps = [
    {
      icon: 'card' as const,
      title: paid ? 'Pago recibido' : 'Completa el pago',
      text: paid ? 'Tu operadora ya registró el pago.' : 'Con el QR o el enlace de pago de este voucher.',
    },
    { icon: 'badge-check' as const, title: 'Confirmación', text: 'Te avisamos por email cuando pase a “Confirmada”.' },
    { icon: 'bell' as const, title: 'Recordatorio', text: 'Recibís un aviso antes de la fecha del tour.' },
    { icon: 'ticket' as const, title: 'Check-in', text: 'Muestra el QR del voucher en el punto de encuentro.' },
  ];

  const infoCards = [
    { icon: 'pin' as const, title: 'Punto de encuentro', text: info.meeting || `${b.tour_start_end || 'A confirmar'}. Te enviamos la dirección exacta por email.`, extra: time ? `Presentarse ${time}` : null },
    { icon: 'rotate-ccw' as const, title: 'Cancelación', text: info.cancellation },
    { icon: 'altitude' as const, title: 'Salud y altitud', text: info.health },
    { icon: 'route' as const, title: 'Transporte', text: info.transport },
  ].filter((c) => c.text);

  return (
    <div className="voucher-page" ref={root}>
      <VoucherHero status={b.status} code={b.code} firstName={lead?.name.split(' ')[0]} />

      <section className="container confirm-page">
        <VoucherTicket booking={b} />

        <div className="voucher-actions">
          <PdfButton booking={b} settings={settings} />
          {!cancelled && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => downloadBlob(buildIcs(b), 'text/calendar;charset=utf-8', `homeland-${b.code}.ics`)}
            >
              <Icon name="calendar" size={17} /> Agregar al calendario
            </button>
          )}
          <a className="btn btn--ghost" href={whatsAppUrl(b)} target="_blank" rel="noopener noreferrer">
            <Icon name="whatsapp" size={17} /> WhatsApp
          </a>
          <Link href="/bookings" className="btn btn--ghost">
            <Icon name="ticket" size={17} /> Mis reservas
          </Link>
        </div>

        {/* ---------- Pago pendiente ---------- */}
        {!paid && !cancelled && (
          <section className="pay-card reveal-up">
            <div className="pay-card__body">
              <span className="pay-card__eyebrow">
                <span className="pay-card__pulse" /> Paso siguiente
              </span>
              <h3>
                Asegurá tu lugar pagando <em>{money(b.total)}</em>
              </h3>
              <p className="pay-card__bob">≈ {bob(b.total)}</p>
              <p>
                {settings?.instructions ||
                  (hasPayment
                    ? 'Pagá con el QR o el enlace. Apenas lo registremos, tu voucher cambia a “Confirmada” y te avisamos por email.'
                    : 'El operador aún no configuró el pago en línea. Escríbenos por WhatsApp y lo coordinamos al instante.')}
              </p>
              <div className="pay-card__actions">
                {settings?.link && (
                  <a className="btn btn--primary" href={settings.link} target="_blank" rel="noopener noreferrer">
                    <Icon name="card" size={17} /> Pagar con enlace
                  </a>
                )}
                {settings?.qrUrl && (
                  <button type="button" className="btn btn--ghost" onClick={() => void downloadQr(settings.qrUrl!)}>
                    <Icon name="qr" size={17} /> Descargar QR
                  </button>
                )}
                {!hasPayment && (
                  <a className="btn btn--primary" href={whatsAppUrl(b)} target="_blank" rel="noopener noreferrer">
                    <Icon name="whatsapp" size={17} /> Coordinar por WhatsApp
                  </a>
                )}
              </div>
            </div>
            {settings?.qrUrl && (
              <div className="pay-card__qr">
                <div className="pay-card__qr-img">
                  <img src={settings.qrUrl} alt="QR de pago" />
                  <span className="pay-card__sheen" />
                </div>
                <small>Escanea para pagar</small>
              </div>
            )}
          </section>
        )}

        {/* ---------- Próximos pasos ---------- */}
        {!cancelled && (
          <section className="steps reveal-up">
            <h3 className="confirm-title">
              <span>¿Qué sigue?</span>
            </h3>
            <div className="steps__track">
              <div className="steps__line" aria-hidden="true">
                {stepDone > 0 && <span className="steps__bar" style={{ width: `${(Math.min(3, stepDone) / 3) * 100}%` }} />}
              </div>
              <ol className="steps__list">
                {steps.map((s, i) => (
                  <li key={s.title} className={`steps__item${i < stepDone ? ' is-done' : i === stepDone ? ' is-current' : ''}`}>
                    <span className="steps__dot">
                      {i < stepDone ? <Icon name="check" size={18} strokeWidth={2.6} /> : <Icon name={s.icon} size={19} />}
                    </span>
                    <strong>{s.title}</strong>
                    <p>{s.text}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}

        {/* ---------- Información del viaje ---------- */}
        {infoCards.length > 0 && (
          <section className="trip-info">
            <h3 className="confirm-title reveal-up">
              <span>Antes de viajar</span>
            </h3>
            <div className="trip-info__grid">
              {infoCards.map((c, i) => (
                <article className="trip-info__card reveal-up" key={c.title}>
                  <span className="trip-info__icon">
                    <DrawIcon name={c.icon} size={26} delay={i * 0.08} />
                  </span>
                  <h4>{c.title}</h4>
                  <p>{c.text}</p>
                  {c.extra && <span className="trip-info__tag">{c.extra}</span>}
                </article>
              ))}
            </div>
          </section>
        )}

        <div className="trust-strip reveal-up">
          <div className="trust-strip__item">
            <Icon name="shield-check" size={24} className="trust-strip__icon" />
            <div>
              <h4>Operador local & confiable</h4>
              <p>100% boliviano, owned & operated.</p>
            </div>
          </div>
          <div className="trust-strip__item">
            <Icon name="rotate-ccw" size={24} className="trust-strip__icon" />
            <div>
              <h4>Pago según te quede cómodo</h4>
              <p>Enlace, QR o coordinado por WhatsApp.</p>
            </div>
          </div>
          <div className="trust-strip__item">
            <Icon name="star-solid" size={24} className="trust-strip__icon" />
            <div>
              <h4>Mejor precio garantizado</h4>
              <p>Sin cargos ocultos, siempre.</p>
            </div>
          </div>
          <div className="trust-strip__item">
            <Icon name="chat" size={24} className="trust-strip__icon" />
            <div>
              <h4>¿Necesitas ayuda?</h4>
              <p>
                24/7 · <strong>{SUPPORT_PHONE}</strong>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------
   Botón "Descargar PDF": la flecha rebota mientras se genera y se
   transforma (MorphSVG) en un check al terminar.
   ------------------------------------------------------------------ */
const ARROW = 'M12 4.5V15M7.2 10.4 12 15.2l4.8-4.8';
const CHECK = 'M5.2 12.6 9.8 17.2 18.8 7.4';

function PdfButton({ booking, settings }: { booking: MyBooking; settings: PaymentSettings | null }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');

  const { contextSafe } = useGSAP({ scope: ref });

  const run = contextSafe(async () => {
    if (state === 'busy') return;
    const el = ref.current;
    const arrow = el?.querySelector('.pdf-btn__arrow') ?? null;
    const tray = el?.querySelector('.pdf-btn__tray') ?? null;
    const reduce = prefersReducedMotion();
    setState('busy');
    const bounce = !reduce && arrow ? gsap.to(arrow, { y: 2.4, duration: 0.32, repeat: -1, yoyo: true, ease: 'sine.inOut' }) : null;
    try {
      const { generateVoucherPdf } = await import('./voucher-pdf');
      await generateVoucherPdf(booking, settings);
      bounce?.kill();
      setState('done');
      if (!reduce && arrow && tray) {
        gsap
          .timeline()
          .to(arrow, { y: 0, duration: 0.15 })
          .to(arrow, { morphSVG: CHECK, duration: 0.5, ease: 'back.out(2)' })
          .to(tray, { opacity: 0, scaleX: 0.3, transformOrigin: '50% 50%', duration: 0.3 }, '<')
          .to(arrow, { morphSVG: ARROW, duration: 0.45, ease: 'power2.inOut' }, '+=2')
          .to(tray, { opacity: 1, scaleX: 1, duration: 0.3 }, '<')
          .add(() => setState('idle'));
      } else {
        window.setTimeout(() => setState('idle'), 2400);
      }
    } catch (err) {
      console.error('[voucher] PDF', err);
      bounce?.kill();
      if (arrow) gsap.set(arrow, { y: 0 });
      setState('error');
      window.setTimeout(() => setState('idle'), 3000);
    }
  });

  return (
    <button
      ref={ref}
      type="button"
      className={`btn btn--primary pdf-btn pdf-btn--${state}`}
      onClick={() => void run()}
      aria-busy={state === 'busy'}
    >
      <svg className="pdf-btn__icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path className="pdf-btn__arrow" d={ARROW} />
        <path className="pdf-btn__tray" d="M5 19.5h14" />
      </svg>
      <span>
        {state === 'busy'
          ? 'Generando PDF…'
          : state === 'done'
            ? '¡Voucher descargado!'
            : state === 'error'
              ? 'No se pudo generar'
              : 'Descargar voucher PDF'}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */

function VoucherLoading() {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.to('.vl__needle', { rotation: 360, svgOrigin: '24 24', duration: 1.6, repeat: -1, ease: 'power2.inOut' });
      gsap.from('.vl__ring', { drawSVG: '0%', duration: 1.2, ease: 'power2.inOut' });
    },
    { scope: ref },
  );
  return (
    <div className="voucher-loading" ref={ref}>
      <svg viewBox="0 0 48 48" width="56" height="56" aria-hidden="true">
        <circle className="vl__ring" cx="24" cy="24" r="20" />
        <path className="vl__needle" d="M24 9 28 24 24 39 20 24Z" />
        <circle cx="24" cy="24" r="2.4" fill="var(--white)" />
      </svg>
      <p>Preparando tu voucher…</p>
    </div>
  );
}
