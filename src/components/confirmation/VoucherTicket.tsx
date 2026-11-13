'use client';

import { useMemo, useRef, useSyncExternalStore } from 'react';
import QRCode from 'qrcode';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { CustomEase } from 'gsap/CustomEase';
import { CustomWiggle } from 'gsap/CustomWiggle';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { Physics2DPlugin } from 'gsap/Physics2DPlugin';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import HomelandLogo from '@/components/brand/HomelandLogo';
import { LOGO_SYMBOL } from '@/components/brand/logo-paths';
import Icon from '@/components/ui/Icon';
import type { MyBooking } from '@/lib/api';
import { onIntroReveal, prefersReducedMotion } from '@/lib/intro';
import {
  BRAND,
  CONDOR_PATH,
  CORDILLERA,
  ILLIMANI,
  JEEP,
  PIN_PATH,
  areaPath,
  flatAreaPath,
  guilloche,
  ridgePoints,
  snowCaps,
  waveLines,
} from './voucher-art';
import {
  DIFFICULTY_LABEL,
  SITE_ORIGIN,
  STATUS_META,
  TONE_INK,
  TOUR_TYPE_LABEL,
  addDays,
  barcodeBars,
  bob,
  dateParts,
  durationDays,
  fmtDate,
  fmtRange,
  initials,
  leadPassenger,
  meetingTime,
  money,
  parseRoute,
  paxSplit,
  priceBreakdown,
  seededRandom,
  voucherUrl,
} from './voucher-data';

gsap.registerPlugin(
  useGSAP,
  CustomEase,
  CustomWiggle,
  DrawSVGPlugin,
  MorphSVGPlugin,
  MotionPathPlugin,
  Physics2DPlugin,
  ScrambleTextPlugin,
);

/* ---------------- Geometría fija ---------------- */
const HEAD_RIDGE_PTS = ridgePoints(ILLIMANI, { width: 800, base: 72, amp: 46 });
const HEAD_RIDGE = areaPath(HEAD_RIDGE_PTS, 80);
const HEAD_RIDGE_FLAT = flatAreaPath(HEAD_RIDGE_PTS, 72, 80);

const ROUTE_D = 'M36 98C86 44 150 40 210 40S334 44 384 98';
const ROUTE_HILLS = areaPath(ridgePoints(CORDILLERA, { x: 64, width: 292, base: 104, amp: 44 }), 106);

const GUILLOCHE = [
  guilloche(300, 300, 120, 45, 70, 1.25),
  guilloche(300, 300, 105, 30, 52, 1.25),
  guilloche(300, 300, 96, 36, 30, 1.25),
];
const STUB_WAVES = waveLines(320, 40, 9, 16, 9, 120);

/* Mini paisaje del talón */
const STUB_BACK_PTS = ridgePoints(CORDILLERA, { width: 300, base: 202, amp: 92 });
const STUB_FRONT_PTS = ridgePoints(ILLIMANI, { x: -10, width: 320, base: 206, amp: 78 });
const STUB_BACK = areaPath(STUB_BACK_PTS, 214);
const STUB_FRONT = areaPath(STUB_FRONT_PTS, 214);
const STUB_BACK_FLAT = flatAreaPath(STUB_BACK_PTS, 202, 214);
const STUB_FRONT_FLAT = flatAreaPath(STUB_FRONT_PTS, 206, 214);
const STUB_SNOW = snowCaps(ILLIMANI, STUB_FRONT_PTS, 0.8, 0.3);
const STUB_STARS = (() => {
  const rnd = seededRandom('stub-sky');
  return Array.from({ length: 22 }, () => ({
    x: Math.round(rnd() * 300),
    y: Math.round(8 + rnd() * 100),
    r: Math.round((0.6 + rnd() * 1.1) * 10) / 10,
  }));
})();

const noopSubscribe = () => () => undefined;

const COLORS = [BRAND.deep, BRAND.forest, BRAND.moss, BRAND.olive, BRAND.green, BRAND.ink];
const SYMBOL_VIEWBOX = '22.5 14.5 44 42';

interface VoucherTicketProps {
  booking: MyBooking;
}

export default function VoucherTicket({ booking: b }: VoucherTicketProps) {
  const root = useRef<HTMLDivElement>(null);
  const stampTl = useRef<gsap.core.Timeline | null>(null);

  const meta = STATUS_META[b.status] ?? STATUS_META.pendiente_pago;
  const ink = TONE_INK[meta.tone];
  const paid = b.status === 'confirmada' || b.status === 'completada';
  const cancelled = b.status === 'cancelada';
  const route = parseRoute(b.tour_start_end, b.tour_destination);
  const endDate = addDays(b.tour_date, durationDays(b.tour_duration) - 1);
  const dFrom = dateParts(b.tour_date);
  const dTo = dateParts(endDate);
  const lead = leadPassenger(b);
  const price = priceBreakdown(b);
  const missingPax = Math.max(0, b.pax - b.passengers.length);
  const time = meetingTime(b.tour_info?.meeting);
  const issued = new Date(b.created_at);
  const discount = price.groupDiscount + price.couponDiscount;

  // Origen estable en SSR/hidratación y real en el cliente → sin desajustes en el QR.
  const origin = useSyncExternalStore(noopSubscribe, () => window.location.origin, () => SITE_ORIGIN);

  const qr = useMemo(() => {
    const code = QRCode.create(voucherUrl(b.code, origin), { errorCorrectionLevel: 'M' });
    const n = code.modules.size;
    const inFinder = (r: number, c: number) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
    const cells: Array<{ r: number; c: number; d: number }> = [];
    const mid = (n - 1) / 2;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (code.modules.get(r, c) && !inFinder(r, c)) cells.push({ r, c, d: Math.hypot(r - mid, c - mid) });
      }
    }
    return { n, cells, finders: [[0, 0], [n - 7, 0], [0, n - 7]] as const };
  }, [b.code, origin]);

  const bars = useMemo(() => barcodeBars(b.code, 220), [b.code]);
  const uid = b.code.replace(/\W/g, '');

  useGSAP(
    (_ctx, contextSafe) => {
      const el = root.current;
      if (!el || !contextSafe || prefersReducedMotion()) return;
      const q = gsap.utils.selector(el);
      const ticket = q('.vt')[0] as HTMLElement;
      const tilt = q('.vt-tilt')[0] as HTMLElement;
      const amountEl = q('.vt__amount-num')[0] as HTMLElement | undefined;
      const bobEl = q('.vt__amount-bob')[0] as HTMLElement | undefined;
      const codeEl = q('.vt__code-big')[0] as HTMLElement | undefined;

      CustomWiggle.create('vt-shake', { wiggles: 7, type: 'easeOut' });
      CustomEase.create('vt-print', 'M0,0 C0.2,0 0.3,0.18 0.42,0.36 0.56,0.58 0.66,0.82 1,1');

      /* ---------- Sello: timeline reutilizable (clic = volver a sellar) ---------- */
      const stamp = q('.vt__stamp')[0];
      const stampSvg = q('.vt__stamp-ink')[0];
      const splash = q('.vt__splash')[0];
      const impact = contextSafe(() => {
        const host = q('.vt__drops')[0] as HTMLElement | undefined;
        if (!host) return;
        for (let i = 0; i < 10; i++) {
          const dot = document.createElement('i');
          dot.className = 'vt__drop';
          host.appendChild(dot);
          gsap.fromTo(
            dot,
            { x: 0, y: 0, scale: gsap.utils.random(0.4, 1.1), opacity: 0.85 },
            {
              physics2D: { velocity: gsap.utils.random(90, 220), angle: gsap.utils.random(0, 360), gravity: 260 },
              opacity: 0,
              duration: gsap.utils.random(0.5, 0.9),
              ease: 'power1.in',
              onComplete: () => dot.remove(),
            },
          );
        }
      });
      const sTl = gsap
        .timeline({ paused: true })
        .fromTo(
          stamp,
          { autoAlpha: 0, scale: 2.9, rotation: -46, y: -40 },
          { autoAlpha: 1, scale: 1, rotation: -13, y: 0, duration: 0.46, ease: 'power4.in', immediateRender: false },
        )
        .to(stampSvg, { scale: 0.93, duration: 0.07, yoyo: true, repeat: 1, ease: 'power1.inOut', transformOrigin: '50% 50%' })
        .add(impact, '<')
        .fromTo(splash, { scale: 0.6, opacity: 0.55 }, { scale: 1.7, opacity: 0, duration: 0.7, ease: 'power2.out' }, '<')
        .fromTo(tilt, { x: 0 }, { x: 6, duration: 0.6, ease: 'vt-shake', clearProps: 'x' }, '<')
        .fromTo(tilt, { rotationZ: 0 }, { rotationZ: 0.6, duration: 0.6, ease: 'vt-shake' }, '<');
      stampTl.current = sTl;
      gsap.set(stamp, { autoAlpha: 0 });

      /* ---------- Impresión del voucher ---------- */
      const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
      const head = q('.vt-printer__head')[0];
      const routePath = q('.vt__route-line')[0] as unknown as SVGPathElement;

      gsap.set(ticket, { clipPath: 'inset(0% 0% 100% 0%)' });
      gsap.set(q('.vt__jeep'), { autoAlpha: 0 });

      tl.fromTo(q('.vt-printer'), { autoAlpha: 0, scaleX: 0.6 }, { autoAlpha: 1, scaleX: 1, duration: 0.45, ease: 'back.out(2)' }, 0)
        .to(ticket, { clipPath: 'inset(0% 0% 0% 0%)', duration: 2.1, ease: 'vt-print' }, 0.35)
        .fromTo(head, { top: '0%', autoAlpha: 1 }, { top: '100%', duration: 2.1, ease: 'vt-print' }, 0.35)
        .to(head, { autoAlpha: 0, duration: 0.3 }, 2.4)
        .from(tilt, { y: -26, duration: 2.3, ease: 'power2.out' }, 0.35)
        .to(q('.vt-printer'), { autoAlpha: 0, y: -10, duration: 0.5 }, 2.45)
        .set(ticket, { clearProps: 'clipPath' }, 2.5);

      /* Encabezado: foto, cordillera que se eleva, título */
      tl.from(q('.vt__photo'), { scale: 1.25, duration: 3, ease: 'power2.out' }, 0.3)
        .from(q('.vt__head-ridge path'), { morphSVG: HEAD_RIDGE_FLAT, duration: 1.3, ease: 'expo.out' }, 0.7)
        .from(q('.vt__head-top > *, .vt__eyebrow, .vt__title, .vt__chip'), { y: 18, autoAlpha: 0, duration: 0.8, stagger: 0.06 }, 0.45)
        .from(q('.vt__band'), { scaleX: 0, transformOrigin: '0% 50%', duration: 1.1, ease: 'power2.inOut' }, 0.75);

      /* Ruta: colinas, trazo punteado que se dibuja, pines y el 4x4 */
      tl.from(q('.vt__route-hills'), { opacity: 0, y: 10, duration: 0.8 }, 0.9)
        .from(q('.vt__route-line'), { drawSVG: '0%', duration: 1.5, ease: 'power2.inOut' }, 1.0)
        .from(q('.vt__pin'), { scale: 0, transformOrigin: '50% 100%', duration: 0.6, stagger: 0.5, ease: 'back.out(3)' }, 1.0)
        .from(q('.vt__route-label'), { opacity: 0, y: 6, duration: 0.6 }, 1.7)
        .from(q('.vt__stop'), { autoAlpha: 0, y: 14, duration: 0.7, stagger: 0.12 }, 0.95)
        .to(q('.vt__jeep'), { autoAlpha: 1, duration: 0.3, ease: 'none' }, 1.15)
        .to(
          q('.vt__jeep'),
          {
            duration: 2.2,
            ease: 'power1.inOut',
            motionPath: {
              path: routePath,
              align: routePath,
              alignOrigin: [0.5, 0.94],
              autoRotate: true,
              start: 0,
              end: 0.5,
            },
          },
          1.15,
        )
        .to(q('.vt__jeep-body'), { y: -3, duration: 0.14, repeat: 3, yoyo: true, ease: 'sine.inOut' }, 3.3)
        .fromTo(
          q('.vt__dust'),
          { scale: 0.2, opacity: 0.7 },
          { scale: 1.6, opacity: 0, x: (i: number) => -10 - i * 7, duration: 0.9, stagger: 0.08, transformOrigin: '50% 50%' },
          3.3,
        );

      /* Datos */
      tl.from(q('.vt__fact'), { autoAlpha: 0, y: 16, duration: 0.7, stagger: 0.08 }, 1.25)
        .from(q('.vt__pax-row'), { autoAlpha: 0, x: -18, duration: 0.6, stagger: 0.08 }, 1.45)
        .from(q('.vt__avatar'), { scale: 0, duration: 0.6, stagger: 0.08, ease: 'back.out(2.5)' }, 1.5)
        .from(q('.vt__guilloche path'), { drawSVG: '0%', duration: 3.2, stagger: 0.25, ease: 'power1.inOut' }, 0.8)
        .from(q('.vt__total > *'), { autoAlpha: 0, y: 14, duration: 0.7, stagger: 0.1 }, 1.7);

      if (amountEl) {
        const counter = { v: 0 };
        amountEl.textContent = money(0);
        if (bobEl) bobEl.textContent = `≈ ${bob(0)}`;
        tl.to(
          counter,
          {
            v: price.total,
            duration: 1.8,
            ease: 'power3.out',
            onUpdate: () => {
              const v = Math.round(counter.v);
              amountEl.textContent = money(v);
              if (bobEl) bobEl.textContent = `≈ ${bob(v)}`;
            },
            onComplete: () => {
              amountEl.textContent = money(price.total);
              if (bobEl) bobEl.textContent = `≈ ${bob(price.total)}`;
            },
          },
          1.8,
        );
      }

      /* Talón: código que se descifra, QR desde el centro, barras y holograma */
      tl.from(q('.vt__waves path'), { drawSVG: '0%', duration: 2, stagger: 0.06, ease: 'power2.inOut' }, 0.6)
        .from(q('.vt__stub-head > *, .vt__stub-fact'), { autoAlpha: 0, y: 12, duration: 0.6, stagger: 0.06 }, 0.9)
        .from(q('.vt__qr-frame'), { scale: 0.7, autoAlpha: 0, duration: 0.7, ease: 'back.out(2)' }, 1.1)
        .from(q('.vt__qr-finder'), { scale: 0, transformOrigin: '50% 50%', duration: 0.6, stagger: 0.1, ease: 'back.out(2.2)' }, 1.25)
        .from(
          q('.vt__qr-cell'),
          {
            scale: 0,
            transformOrigin: '50% 50%',
            duration: 0.45,
            ease: 'back.out(3)',
            stagger: (_i: number, t: Element) => Number((t as SVGElement).dataset.d) * 0.045,
          },
          1.35,
        )
        .from(q('.vt__qr-corner'), { scale: 1.6, autoAlpha: 0, duration: 0.5, stagger: 0.06 }, 1.5)
        .fromTo(
          q('.vt__scan'),
          { top: '4%', autoAlpha: 0 },
          { top: '92%', autoAlpha: 1, duration: 0.9, repeat: 3, yoyo: true, ease: 'sine.inOut' },
          2.3,
        )
        .to(q('.vt__scan'), { autoAlpha: 0, duration: 0.3 }, 5.95)
        .from(q('.vt__bar'), { scaleY: 0, transformOrigin: '50% 100%', duration: 0.5, stagger: { amount: 0.7, from: 'center' } }, 1.7)
        .from(q('.vt__holo'), { scale: 0, rotation: -180, duration: 1, ease: 'elastic.out(1, 0.5)' }, 2.2)
        .from(q('.vt__stub-star'), { opacity: 0, scale: 0, transformOrigin: '50% 50%', duration: 0.5, stagger: { each: 0.04, from: 'random' } }, 1.5)
        .from(q('.vt__stub-sun, .vt__stub-glow'), { y: 60, duration: 1.8, ease: 'power2.out' }, 1.6)
        .from(q('.vt__stub-ridge--back'), { morphSVG: STUB_BACK_FLAT, duration: 1.4, ease: 'expo.out' }, 1.75)
        .from(q('.vt__stub-ridge--front'), { morphSVG: STUB_FRONT_FLAT, duration: 1.4, ease: 'expo.out' }, 1.9)
        .from(q('.vt__stub-snow'), { opacity: 0, y: 6, duration: 0.6, stagger: 0.05 }, 2.5)
        .from(q('.vt__stub-motto'), { autoAlpha: 0, y: 10, duration: 0.8 }, 2.4)
        .from(q('.vt__stub-condor'), { x: -70, autoAlpha: 0, duration: 3, ease: 'power2.out' }, 2);

      if (codeEl) {
        tl.to(
          codeEl,
          { duration: 1.5, scrambleText: { text: b.code, chars: 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789', speed: 0.7, revealDelay: 0.3 }, ease: 'none' },
          1.0,
        );
      }

      /* ¡Sello! */
      tl.add(() => void sTl.restart(), 3.1);

      /* ---------- Inclinación 3D + brillo que sigue al puntero ---------- */
      const cleanups: Array<() => void> = [];
      if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        const rx = gsap.quickTo(tilt, 'rotationX', { duration: 0.7, ease: 'power3.out' });
        const ry = gsap.quickTo(tilt, 'rotationY', { duration: 0.7, ease: 'power3.out' });
        const mx = gsap.quickTo(ticket, '--mx', { duration: 0.5, ease: 'power2.out' });
        const my = gsap.quickTo(ticket, '--my', { duration: 0.5, ease: 'power2.out' });
        const glow = gsap.quickTo(ticket, '--shine', { duration: 0.5, ease: 'power2.out' });
        const onMove = (e: PointerEvent) => {
          const r = ticket.getBoundingClientRect();
          const nx = gsap.utils.clamp(0, 1, (e.clientX - r.left) / r.width);
          const ny = gsap.utils.clamp(0, 1, (e.clientY - r.top) / r.height);
          rx((0.5 - ny) * 7);
          ry((nx - 0.5) * 9);
          mx(nx * 100);
          my(ny * 100);
          glow(1);
        };
        const onLeave = () => {
          rx(0);
          ry(0);
          glow(0);
        };
        el.addEventListener('pointermove', onMove);
        el.addEventListener('pointerleave', onLeave);
        cleanups.push(() => {
          el.removeEventListener('pointermove', onMove);
          el.removeEventListener('pointerleave', onLeave);
        });
      }

      let alive = true;
      const unsubscribe = onIntroReveal(() => {
        gsap.delayedCall(0.75, () => alive && tl.play());
      });

      return () => {
        alive = false;
        unsubscribe();
        cleanups.forEach((fn) => fn());
        stampTl.current = null;
      };
    },
    { scope: root, dependencies: [b.code, b.status, origin], revertOnUpdate: true },
  );

  const restamp = () => {
    if (stampTl.current && !prefersReducedMotion()) stampTl.current.restart();
  };

  return (
    <div className={`vt-stage vt-tone--${meta.tone}`} ref={root} style={{ ['--ink' as string]: ink.hex }}>
      <div className="vt-printer" aria-hidden="true">
        <span className="vt-printer__slot" />
        <span className="vt-printer__led" />
        <span className="vt-printer__label">Imprimiendo voucher…</span>
      </div>

      <div className="vt-tilt">
        <span className="vt-printer__head" aria-hidden="true" />
        <article className="vt" aria-label={`Voucher de viaje ${b.code}`}>
          {/* ================= Cuerpo principal ================= */}
          <div className="vt__main">
            <svg className="vt__guilloche" viewBox="0 0 600 600" aria-hidden="true">
              {GUILLOCHE.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </svg>

            <BrandBand id={b.code} />

            <header className="vt__head">
              <div className="vt__photo" style={{ backgroundImage: `url('${b.tour_image || '/assets/uyuni-mirror.jpg'}')` }} />
              <div className="vt__photo-shade" />
              <svg className="vt__head-ridge" viewBox="0 0 800 80" preserveAspectRatio="none" aria-hidden="true">
                <path d={HEAD_RIDGE} />
              </svg>

              <div className="vt__head-top">
                <HomelandLogo height={42} className="vt__logo" />
                <div className="vt__doc">
                  <small>Voucher de viaje</small>
                  <strong>Nº {b.code}</strong>
                </div>
              </div>

              <div className="vt__head-body">
                <span className="vt__eyebrow">
                  <Icon name="pin" size={14} /> {b.tour_destination || route.highlight}
                </span>
                <h2 className="vt__title">{b.tour_title}</h2>
                <div className="vt__chips">
                  <span className="vt__chip">
                    <Icon name="clock" size={13} /> {b.tour_duration}
                  </span>
                  <span className="vt__chip">
                    <Icon name="users" size={13} /> {TOUR_TYPE_LABEL[b.tour_type] ?? b.tour_type}
                  </span>
                  {b.tour_max_altitude && (
                    <span className="vt__chip">
                      <Icon name="altitude" size={13} /> {b.tour_max_altitude}
                    </span>
                  )}
                  {b.tour_difficulty && (
                    <span className="vt__chip">
                      <Icon name="mountain" size={13} /> {DIFFICULTY_LABEL[b.tour_difficulty] ?? b.tour_difficulty}
                    </span>
                  )}
                </div>
              </div>
            </header>

            {/* ---------- Ruta ---------- */}
            <section className="vt__route">
              <div className="vt__stop">
                <small>Salida</small>
                <div className="vt__date">
                  <strong>{dFrom.day}</strong>
                  <span>
                    {dFrom.month}
                    <em>{dFrom.weekday}</em>
                  </span>
                </div>
                <p>
                  {route.origin}
                  {time && <span> · {time}</span>}
                </p>
              </div>

              <svg className="vt__route-svg" viewBox="0 0 420 120" aria-hidden="true">
                <defs>
                  <mask id={`route-dash-${uid}`} maskUnits="userSpaceOnUse">
                    <path d={ROUTE_D} fill="none" stroke="#fff" strokeWidth="6" strokeDasharray="1 7" strokeLinecap="round" />
                  </mask>
                </defs>
                <path className="vt__route-hills" d={ROUTE_HILLS} />
                <path className="vt__route-ground" d="M8 106H412" />
                <path className="vt__route-line" d={ROUTE_D} mask={`url(#route-dash-${uid})`} />
                <g className="vt__pin" transform="translate(36 98)">
                  <path d={PIN_PATH} />
                  <circle cy="-12.8" r="3.2" />
                </g>
                <g className="vt__pin vt__pin--end" transform="translate(384 98)">
                  <path d={PIN_PATH} />
                  <circle cy="-12.8" r="3.2" />
                </g>
                <text className="vt__route-label" x="210" y="18" textAnchor="middle">
                  {route.highlight}
                </text>
                <g className="vt__jeep" transform="translate(196 26)">
                  <g className="vt__jeep-body">
                    <path className="vt__jeep-rack" d={JEEP.rack} />
                    <path className="vt__jeep-shell" d={JEEP.body} />
                    <path className="vt__jeep-glass" d={JEEP.windows} />
                    {JEEP.wheels.map(([cx, cy]) => (
                      <g key={cx}>
                        <circle className="vt__jeep-wheel" cx={cx} cy={cy} r="2.7" />
                        <circle className="vt__jeep-hub" cx={cx} cy={cy} r="1" />
                      </g>
                    ))}
                  </g>
                  {[0, 1, 2].map((i) => (
                    <circle key={i} className="vt__dust" cx="1" cy="12" r="2.4" />
                  ))}
                </g>
              </svg>

              <div className="vt__stop vt__stop--end">
                <small>Regreso</small>
                <div className="vt__date">
                  <strong>{dTo.day}</strong>
                  <span>
                    {dTo.month}
                    <em>{dTo.weekday}</em>
                  </span>
                </div>
                <p>{route.end}</p>
              </div>
            </section>

            {/* ---------- Datos clave ---------- */}
            <section className="vt__facts">
              <div className="vt__fact">
                <small>Titular</small>
                <strong>{lead?.name ?? '—'}</strong>
                <span>{[lead?.doc, lead?.country].filter(Boolean).join(' · ') || 'Datos a completar'}</span>
              </div>
              <div className="vt__fact">
                <small>Pasajeros</small>
                <strong>{paxSplit(b)}</strong>
                <span>Tour {TOUR_TYPE_LABEL[b.tour_type]?.toLowerCase() ?? ''}</span>
              </div>
              <div className="vt__fact">
                <small>Fechas</small>
                <strong>{fmtRange(b.tour_date, endDate)}</strong>
                <span>{b.tour_duration}</span>
              </div>
              <div className="vt__fact">
                <small>Emitido</small>
                <strong>{fmtDate(b.created_at.slice(0, 10))}</strong>
                <span>{issued.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} hs</span>
              </div>
            </section>

            {/* ---------- Pasajeros ---------- */}
            <section className="vt__pax">
              <h3>
                <Icon name="users" size={16} /> Pasajeros
                <span>{b.pax}</span>
              </h3>
              <ul>
                {b.passengers.map((p, i) => (
                  <li className="vt__pax-row" key={p.id}>
                    <span className="vt__avatar" style={{ background: COLORS[i % COLORS.length] }}>
                      {initials(p.name)}
                    </span>
                    <div className="vt__pax-name">
                      <strong>
                        {p.name}
                        {p.is_lead && <em>Titular</em>}
                      </strong>
                      <span>{[p.doc && `Doc. ${p.doc}`, p.country].filter(Boolean).join(' · ') || '—'}</span>
                    </div>
                    <span className="vt__pax-meal">
                      <Icon name="meal" size={14} /> {p.meal || 'Normal'}
                    </span>
                  </li>
                ))}
                {missingPax > 0 && (
                  <li className="vt__pax-row vt__pax-row--ghost">
                    <span className="vt__avatar">+{missingPax}</span>
                    <div className="vt__pax-name">
                      <strong>
                        {missingPax} pasajero{missingPax > 1 ? 's' : ''} sin datos
                      </strong>
                      <span>Completalos antes del check-in</span>
                    </div>
                  </li>
                )}
              </ul>
            </section>

            {/* ---------- Total ---------- */}
            <footer className="vt__total">
              <div className="vt__amount">
                <small>{paid ? 'Total pagado' : cancelled ? 'Total' : 'Total a pagar'}</small>
                <strong className="vt__amount-num">{money(price.total)}</strong>
                <span className="vt__amount-bob">≈ {bob(price.total)}</span>
                {discount > 0 && <span className="vt__amount-save">Incluye −{money(discount)} de descuento</span>}
              </div>
              <div className={`vt__paystate vt__paystate--${meta.tone}`}>
                <span className="vt__paystate-dot" />
                <div>
                  <strong>{meta.label}</strong>
                  <small>
                    {paid && b.paid_at
                      ? `Pagado el ${fmtDate(b.paid_at.slice(0, 10))}`
                      : `Pago por ${b.payment_method === 'qr' ? 'QR' : 'enlace'}`}
                  </small>
                </div>
              </div>
            </footer>

            {/* ---------- Sello de goma ---------- */}
            <button
              type="button"
              className="vt__stamp"
              onClick={restamp}
              aria-label={`Sello: ${meta.stamp}. Clic para volver a sellar`}
              title="¡Volver a sellar!"
            >
              <span className="vt__splash" />
              <span className="vt__drops" />
              <Stamp id={b.code} label={meta.stamp} sub={meta.stampSub} date={fmtDate(b.created_at.slice(0, 10))} color={ink.hex} />
            </button>
          </div>

          {/* ================= Talón ================= */}
          <aside className="vt__stub">
            <svg className="vt__waves" viewBox="0 0 320 200" preserveAspectRatio="none" aria-hidden="true">
              {STUB_WAVES.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </svg>

            <div className="vt__stub-head">
              <svg className="vt__symbol" viewBox={SYMBOL_VIEWBOX} aria-hidden="true">
                <path d={LOGO_SYMBOL.outer} />
                <path d={LOGO_SYMBOL.inner} />
                <path d={LOGO_SYMBOL.h} />
              </svg>
              <div>
                <small>Pase de abordaje</small>
                <span>Check-in · Admite {b.pax}</span>
              </div>
            </div>

            <div className="vt__code-big">{b.code}</div>

            <div className="vt__qr-frame">
              <svg className="vt__qr" viewBox={`-1.5 -1.5 ${qr.n + 3} ${qr.n + 3}`} role="img" aria-label={`Código QR del voucher ${b.code}`}>
                {qr.finders.map(([x, y]) => (
                  <g className="vt__qr-finder" key={`${x}-${y}`}>
                    <path
                      fillRule="evenodd"
                      d={`M${x + 1.6} ${y}h3.8a1.6 1.6 0 0 1 1.6 1.6v3.8a1.6 1.6 0 0 1-1.6 1.6h-3.8a1.6 1.6 0 0 1-1.6-1.6v-3.8a1.6 1.6 0 0 1 1.6-1.6ZM${x + 1.9} ${y + 1}h3.2a.9.9 0 0 1 .9.9v3.2a.9.9 0 0 1-.9.9h-3.2a.9.9 0 0 1-.9-.9v-3.2a.9.9 0 0 1 .9-.9Z`}
                    />
                    <rect x={x + 2} y={y + 2} width="3" height="3" rx="0.8" />
                  </g>
                ))}
                {qr.cells.map(({ r, c, d }) => (
                  <rect key={`${r}-${c}`} className="vt__qr-cell" data-d={d.toFixed(2)} x={c + 0.05} y={r + 0.05} width="0.9" height="0.9" rx="0.26" />
                ))}
              </svg>
              <span className="vt__scan" />
              {['tl', 'tr', 'bl', 'br'].map((p) => (
                <span key={p} className={`vt__qr-corner vt__qr-corner--${p}`} />
              ))}
            </div>
            <p className="vt__qr-hint">Mostrá este código en el punto de encuentro</p>

            <dl className="vt__stub-facts">
              <div className="vt__stub-fact">
                <dt>Fecha</dt>
                <dd>
                  {dFrom.day} {dFrom.month} {dFrom.year}
                </dd>
              </div>
              <div className="vt__stub-fact">
                <dt>Presentarse</dt>
                <dd>{time ?? 'A confirmar'}</dd>
              </div>
              <div className="vt__stub-fact">
                <dt>Pax</dt>
                <dd>{String(b.pax).padStart(2, '0')}</dd>
              </div>
            </dl>

            <div className="vt__holo" aria-hidden="true">
              <svg viewBox={SYMBOL_VIEWBOX}>
                <path d={LOGO_SYMBOL.outer} />
                <path d={LOGO_SYMBOL.inner} />
                <path d={LOGO_SYMBOL.h} />
              </svg>
            </div>

            <div className="vt__stub-art" aria-hidden="true">
              <svg viewBox="0 0 300 214" preserveAspectRatio="xMidYMax slice">
                {STUB_STARS.map((s, i) => (
                  <circle key={i} className="vt__stub-star" cx={s.x} cy={s.y} r={s.r} />
                ))}
                <defs>
                  <radialGradient id={`stub-glow-${uid}`}>
                    <stop offset="0" stopColor="#eaeee2" stopOpacity="0.5" />
                    <stop offset="1" stopColor="#9ab26e" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <circle className="vt__stub-glow" cx="214" cy="128" r="58" fill={`url(#stub-glow-${uid})`} />
                <circle className="vt__stub-sun" cx="214" cy="128" r="17" />
                <path className="vt__stub-ridge vt__stub-ridge--back" d={STUB_BACK} />
                <path className="vt__stub-ridge vt__stub-ridge--front" d={STUB_FRONT} />
                {STUB_SNOW.map((d, i) => (
                  <path key={i} className="vt__stub-snow" d={d} />
                ))}
                <g className="vt__stub-condor">
                  <path d={CONDOR_PATH} transform="translate(60 74) scale(0.7)" />
                </g>
              </svg>
              <p className="vt__stub-motto">Bolivia te espera</p>
            </div>

            <div className="vt__barcode">
              <svg viewBox="0 0 220 40" preserveAspectRatio="none" aria-hidden="true">
                {bars.map(([x, w], i) => (
                  <rect key={i} className="vt__bar" x={x} y="0" width={w} height="40" />
                ))}
              </svg>
              <small>{b.code} · Boleta electrónica · No válido como factura</small>
            </div>
          </aside>
        </article>
      </div>
    </div>
  );
}

/* Cinta de marca: el símbolo Homeland repetido sobre la gama de verdes. */
function BrandBand({ id }: { id: string }) {
  const pid = `brand-band-${id.replace(/\W/g, '')}`;
  return (
    <svg className="vt__band" aria-hidden="true">
      <defs>
        <pattern id={pid} width="28" height="14" patternUnits="userSpaceOnUse">
          <rect width="28" height="14" fill={BRAND.deep} />
          <rect width="28" height="1.6" fill={BRAND.green} />
          <rect y="12.4" width="28" height="1.6" fill={BRAND.green} />
          <rect y="1.6" width="28" height="0.7" fill={BRAND.sage} />
          <rect y="11.7" width="28" height="0.7" fill={BRAND.sage} />
          <g transform="translate(3.32 -1.52) scale(0.24)" fill={BRAND.sage}>
            <path d={LOGO_SYMBOL.outer} />
            <path d={LOGO_SYMBOL.inner} />
            <path d={LOGO_SYMBOL.h} />
          </g>
          <circle cx="3.5" cy="7" r="0.9" fill={BRAND.green} />
          <circle cx="24.5" cy="7" r="0.9" fill={BRAND.green} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${pid})`} />
    </svg>
  );
}

/* ------------------------------------------------------------------
   Sello de goma con textura de tinta (feTurbulence + displacement)
   ------------------------------------------------------------------ */
function Stamp({ id, label, sub, date, color }: { id: string; label: string; sub: string; date: string; color: string }) {
  const k = id.replace(/\W/g, '');
  const star = (cx: number, cy: number, r: number) => {
    const pts = Array.from({ length: 10 }, (_, i) => {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 ? r * 0.45 : r;
      return `${(cx + Math.cos(a) * rr).toFixed(2)} ${(cy + Math.sin(a) * rr).toFixed(2)}`;
    });
    return `M${pts.join('L')}Z`;
  };
  return (
    <svg className="vt__stamp-ink" viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <filter id={`ink-${k}`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="11" result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -2.4 0 0 0 1.9" result="holes" />
          <feComposite in="SourceGraphic" in2="holes" operator="in" result="inked" />
          <feTurbulence type="turbulence" baseFrequency="0.04" numOctaves="2" seed="4" result="warp" />
          <feDisplacementMap in="inked" in2="warp" scale="3.2" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <mask id={`band-${k}`} maskUnits="userSpaceOnUse">
          <rect width="200" height="200" fill="#fff" />
          <rect x="10" y="80" width="180" height="40" fill="#000" />
        </mask>
        <path id={`top-${k}`} d="M36 100A64 64 0 0 1 164 100" />
        <path id={`bot-${k}`} d="M27 100A73 73 0 0 0 173 100" />
      </defs>
      <g filter={`url(#ink-${k})`} fill={color} stroke={color}>
        <g mask={`url(#band-${k})`} fill="none">
          <circle cx="100" cy="100" r="92" strokeWidth="5" />
          <circle cx="100" cy="100" r="84" strokeWidth="1.6" />
          <circle cx="100" cy="100" r="50" strokeWidth="1.6" />
        </g>
        <text className="vt__stamp-ring" stroke="none">
          <textPath href={`#top-${k}`} startOffset="50%" textAnchor="middle">
            HOMELAND TOURS
          </textPath>
        </text>
        <text className="vt__stamp-ring" stroke="none">
          <textPath href={`#bot-${k}`} startOffset="50%" textAnchor="middle">
            BOLIVIA · {date.split(' ').pop()}
          </textPath>
        </text>
        <path d={star(41.4, 132.5, 4.6)} stroke="none" />
        <path d={star(158.6, 132.5, 4.6)} stroke="none" />
        <path d={star(39.3, 71.7, 3.4)} stroke="none" />
        <path d={star(160.7, 71.7, 3.4)} stroke="none" />
        <rect x="12" y="81" width="176" height="38" rx="3" fill="none" strokeWidth="3" />
        <text className="vt__stamp-label" x="100" y="108" textAnchor="middle" stroke="none">
          {label}
        </text>
        <text className="vt__stamp-date" x="100" y="72" textAnchor="middle" stroke="none">
          {date.toUpperCase()}
        </text>
        <text className="vt__stamp-sub" x="100" y="135" textAnchor="middle" stroke="none">
          {sub}
        </text>
      </g>
    </svg>
  );
}
