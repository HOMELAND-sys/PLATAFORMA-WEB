'use client';

import { useMemo, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { Physics2DPlugin } from 'gsap/Physics2DPlugin';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { onIntroReveal, prefersReducedMotion } from '@/lib/intro';
import {
  ALTIPLANO,
  CONDOR_PATH,
  CONDOR_RUFF,
  CONFETTI_COLORS,
  CORDILLERA,
  ILLIMANI,
  areaPath,
  circlePath,
  flatAreaPath,
  linePath,
  ridgePoints,
  scallopPath,
  snowCaps,
  topoRings,
} from './voucher-art';
import { seededRandom, type BookingStatus } from './voucher-data';

gsap.registerPlugin(
  useGSAP,
  DrawSVGPlugin,
  MorphSVGPlugin,
  MotionPathPlugin,
  Physics2DPlugin,
  ScrambleTextPlugin,
  ScrollTrigger,
  SplitText,
);

/* ---------------- Escena (viewBox 1600×440, anclada abajo) ---------------- */
const W = 1600;
const GROUND = 382;
const BOTTOM = 440;

const far = ridgePoints(ALTIPLANO, { width: W, base: GROUND - 6, amp: 150 });
const back = ridgePoints(CORDILLERA, { width: W, base: GROUND - 2, amp: 215 });
const front = ridgePoints(ILLIMANI, { width: W, base: GROUND + 2, amp: 262 });

const RIDGES = [
  { key: 'far', d: areaPath(far, BOTTOM), flat: flatAreaPath(far, GROUND, BOTTOM), fill: '#5e7732', depth: 8 },
  { key: 'back', d: areaPath(back, BOTTOM), flat: flatAreaPath(back, GROUND, BOTTOM), fill: '#3b4c24', depth: 16 },
  { key: 'front', d: areaPath(front, BOTTOM), flat: flatAreaPath(front, GROUND, BOTTOM), fill: '#232d13', depth: 28 },
] as const;

/** El sol asoma entre las cumbres, a la derecha del Illimani. */
const SUN = { x: 1010, y: 172 };

const SNOW_BACK = snowCaps(CORDILLERA, back, 0.84, 0.26);
const SNOW_FRONT = snowCaps(ILLIMANI, front, 0.76, 0.3);
const FRONT_EDGE = linePath(front);

/* ---------------- Cielo (viewBox 1600×900, slice) ---------------- */
const SKY_TOPO = topoRings({ count: 7, cx: 800, cy: 520, r0: 170, step: 78, sx: 1.45, sy: 0.72, seed: 2 });
const STARS = (() => {
  const rnd = seededRandom('homeland-stars');
  return Array.from({ length: 46 }, () => ({
    x: Math.round(rnd() * 1600),
    y: Math.round(rnd() * 520),
    r: Math.round((0.8 + rnd() * 1.7) * 10) / 10,
  }));
})();
const CONDOR_FLIGHTS = [
  'M-140 600C180 500 420 640 760 545S1260 450 1760 575',
  'M1760 500C1430 575 1120 440 820 515S330 590 -140 505',
];

/* ---------------- Insignia ---------------- */
const BADGE = 160;
const C = BADGE / 2;
const ROSETTE = scallopPath(C, C, 54, 16, 5.5);
const ROSETTE_START = circlePath(C, C, 30, 32);

const RING_TEXT: Record<BookingStatus, string> = {
  pendiente_pago: 'RESERVA REGISTRADA · HOMELAND TOURS · BOLIVIA · ',
  confirmada: 'RESERVA CONFIRMADA · HOMELAND TOURS · BOLIVIA · ',
  completada: 'VIAJE COMPLETADO · HOMELAND TOURS · BOLIVIA · ',
  cancelada: 'RESERVA CANCELADA · HOMELAND TOURS · BOLIVIA · ',
};

interface VoucherHeroProps {
  status: BookingStatus;
  code: string;
  firstName?: string;
}

export default function VoucherHero({ status, code, firstName }: VoucherHeroProps) {
  const root = useRef<HTMLElement>(null);
  const cancelled = status === 'cancelada';
  const ringId = useMemo(() => `vh-ring-${code.replace(/\W/g, '')}`, [code]);

  useGSAP(
    (_ctx, contextSafe) => {
      const el = root.current;
      if (!el || !contextSafe || prefersReducedMotion()) return;
      const q = gsap.utils.selector(el);

      const title = q('.vh__title')[0] as HTMLElement | undefined;
      const codeEl = q('.vh__code-value')[0] as HTMLElement | undefined;
      let split: SplitText | null = null;

      const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });

      /* 1 · Amanecer: estrellas, curvas de nivel y sol */
      tl.from(q('.vh__star'), { opacity: 0, duration: 1.4, stagger: { each: 0.015, from: 'random' } }, 0)
        .from(q('.vh__topo path'), { drawSVG: '0%', duration: 2.6, stagger: 0.1, ease: 'power1.inOut' }, 0)
        .from(q('.vh__sun'), { y: 150, duration: 2.6, ease: 'power2.out' }, 0.05)
        .from(q('.vh__sun-glow'), { opacity: 0, scale: 0.4, transformOrigin: '50% 50%', duration: 2.4 }, 0.05);

      /* 2 · La cordillera se eleva (MorphSVG desde una línea plana) */
      RIDGES.forEach((r, i) => {
        tl.from(q(`.vh__ridge--${r.key}`), { morphSVG: r.flat, duration: 1.7, ease: 'expo.out' }, 0.15 + i * 0.16);
      });
      tl.from(q('.vh__edge'), { drawSVG: '50% 50%', duration: 1.4, ease: 'power2.inOut' }, 0.55)
        .from(q('.vh__snow'), { opacity: 0, y: 14, duration: 0.9, stagger: 0.06, ease: 'back.out(2)' }, 1.0)
        .from(q('.vh__reflection'), { opacity: 0, duration: 1.4 }, 0.9);

      /* 3 · Insignia: aparece, se festonea (morph) y dibuja el check */
      tl.from(q('.vh__badge'), { scale: 0, rotation: -140, duration: 1, ease: 'back.out(1.6)' }, 0.3)
        .from(q('.vh__rosette'), { morphSVG: ROSETTE_START, duration: 1.3, ease: 'elastic.out(1, 0.42)' }, 0.62)
        .from(q('.vh__badge-core'), { scale: 0, transformOrigin: '50% 50%', duration: 0.7, ease: 'back.out(2.4)' }, 0.75)
        .from(q('.vh__mark path'), { drawSVG: '0%', duration: 0.55, stagger: 0.12, ease: 'power2.inOut' }, 1.02)
        .from(q('.vh__ring-text'), { opacity: 0, duration: 0.8 }, 0.95);

      if (!cancelled) tl.add(contextSafe(() => burst(q('.vh__confetti')[0] as HTMLElement)), 1.15);

      /* 4 · Título letra a letra y código que se "descifra" */
      if (title) {
        gsap.set(title, { autoAlpha: 0 });
        tl.add(
          contextSafe(() => {
            split = SplitText.create(title, { type: 'words,chars' });
            gsap.set(title, { autoAlpha: 1 });
            gsap.from(split.chars, {
              opacity: 0,
              yPercent: 70,
              rotationX: -95,
              transformPerspective: 600,
              transformOrigin: '50% 100% -12px',
              duration: 0.9,
              stagger: 0.022,
              ease: 'back.out(2)',
              onComplete: () => {
                split?.revert();
                split = null;
              },
            });
          }),
          0.55,
        );
      }
      tl.from(q('.vh__code'), { autoAlpha: 0, y: 14, duration: 0.7 }, 0.85);
      if (codeEl) {
        tl.to(
          codeEl,
          { duration: 1.3, scrambleText: { text: code, chars: 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789', speed: 0.6 }, ease: 'none' },
          0.9,
        );
      }
      tl.from(q('.vh__lead'), { autoAlpha: 0, y: 18, duration: 0.9 }, 1.15);

      /* 5 · Bucles ambientales: arrancan con la escena y se pausan fuera de pantalla */
      const loops: gsap.core.Animation[] = [];
      tl.add(
        contextSafe(() => {
          loops.push(
            gsap.to(q('.vh__ring'), { rotation: 360, svgOrigin: `${C} ${C}`, duration: 26, repeat: -1, ease: 'none' }),
            gsap.to(q('.vh__rays'), { rotation: 360, svgOrigin: `${SUN.x} ${SUN.y}`, duration: 90, repeat: -1, ease: 'none' }),
            gsap.fromTo(
              q('.vh__ripple'),
              { scale: 1, opacity: 0.5 },
              { scale: 1.8, opacity: 0, duration: 2.8, repeat: -1, stagger: 1.4, ease: 'power1.out' },
            ),
            gsap.fromTo(
              q('.vh__star--twinkle'),
              { opacity: 1 },
              {
                opacity: 0.15,
                duration: 'random(0.9, 2.2)',
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut',
                stagger: { each: 0.3, from: 'random' },
              },
            ),
            gsap.to(q('.vh__shimmer'), { x: 60, duration: 5, repeat: -1, yoyo: true, ease: 'sine.inOut', stagger: 0.7 }),
          );
          if (cancelled) return;
          q('.vh__condor').forEach((condor, i) => {
            const path = q(`.vh__flight--${i}`)[0] as unknown as SVGPathElement;
            const wing = condor.querySelector('.vh__condor-body');
            loops.push(
              gsap.to(condor, {
                motionPath: { path, align: path, alignOrigin: [0.5, 0.5] },
                duration: 30 + i * 8,
                delay: i * 7,
                repeat: -1,
                ease: 'none',
              }),
              gsap.to(condor, {
                rotation: i ? -7 : 7,
                transformOrigin: '50% 50%',
                duration: 3.2,
                repeat: -1,
                yoyo: true,
                ease: 'sine.inOut',
              }),
              gsap.to(wing, {
                scaleY: 0.6,
                transformOrigin: '50% 50%',
                duration: 0.9,
                repeat: -1,
                yoyo: true,
                repeatDelay: 2.4,
                ease: 'sine.inOut',
              }),
            );
          });
        }),
        1.5,
      );

      ScrollTrigger.create({
        trigger: el,
        start: 'top bottom',
        end: 'bottom top',
        onToggle: (self) => loops.forEach((t) => (self.isActive ? t.resume() : t.pause())),
      });

      /* 6 · Parallax de profundidad con el puntero */
      const cleanups: Array<() => void> = [];
      if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        const layers = q('[data-depth]').map((node) => ({
          node,
          to: gsap.quickTo(node, 'x', { duration: 1.2, ease: 'power3.out' }),
          depth: Number((node as HTMLElement).dataset.depth) || 0,
        }));
        const onMove = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          const nx = (e.clientX - r.left) / r.width - 0.5;
          layers.forEach((l) => l.to(-nx * l.depth));
        };
        const onLeave = () => layers.forEach((l) => l.to(0));
        el.addEventListener('pointermove', onMove);
        el.addEventListener('pointerleave', onLeave);
        cleanups.push(() => {
          el.removeEventListener('pointermove', onMove);
          el.removeEventListener('pointerleave', onLeave);
        });
      }

      let alive = true;
      const unsubscribe = onIntroReveal(() => {
        void document.fonts.ready.then(() => {
          if (alive) tl.play();
        });
      });

      return () => {
        alive = false;
        unsubscribe();
        split?.revert();
        cleanups.forEach((fn) => fn());
        el.querySelectorAll('.vh__piece').forEach((n) => n.remove());
      };
    },
    { scope: root, dependencies: [status, code], revertOnUpdate: true },
  );

  const headline =
    status === 'cancelada' ? (
      <>
        Tu reserva fue <em>cancelada</em>
      </>
    ) : status === 'completada' ? (
      <>
        ¡Gracias por viajar <em>con nosotros!</em>
      </>
    ) : status === 'confirmada' ? (
      <>
        ¡Tu aventura está <em>confirmada!</em>
      </>
    ) : (
      <>
        ¡Tu aventura está <em>reservada!</em>
      </>
    );

  const hi = firstName ? `, ${firstName}` : '';
  const lead =
    status === 'cancelada'
      ? 'Este voucher ya no es válido. Si fue un error, escribinos por WhatsApp y lo resolvemos.'
      : status === 'confirmada'
        ? `Todo listo${hi}. Mostrá este voucher en el punto de encuentro y preparate para el Altiplano.`
        : status === 'completada'
          ? `Esperamos que la experiencia haya sido inolvidable${hi}. ¡Te esperamos en tu próxima aventura!`
          : `Gracias${hi}. Guardamos tu lugar — completá el pago para confirmarlo. Tu voucher queda siempre en “Mis reservas”.`;

  return (
    <section className={`vh${cancelled ? ' vh--cancelled' : ''}`} ref={root}>
      {/* Cielo: estrellas, curvas de nivel y cóndores */}
      <svg className="vh__sky" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <g data-depth="4">
          {STARS.map((s, i) => (
            <circle key={i} className={`vh__star${i % 3 === 0 ? ' vh__star--twinkle' : ''}`} cx={s.x} cy={s.y} r={s.r} />
          ))}
        </g>
        <g className="vh__topo" data-depth="10">
          {SKY_TOPO.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
        {CONDOR_FLIGHTS.map((d, i) => (
          <path key={i} className={`vh__flight vh__flight--${i}`} d={d} />
        ))}
        {!cancelled &&
          CONDOR_FLIGHTS.map((_, i) => (
            <g key={i} className="vh__condor" transform={`translate(${i ? 1700 : -200} 0) scale(${i ? 1.25 : 1.7})`}>
              <g className="vh__condor-body">
                <path d={CONDOR_PATH} />
                <path d={CONDOR_RUFF} fill="#f4f6ec" opacity="0.85" />
              </g>
            </g>
          ))}
      </svg>

      {/* Cordillera sobre el salar */}
      <svg className="vh__range" viewBox={`0 0 ${W} ${BOTTOM}`} preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <defs>
          <radialGradient id="vh-sun" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#fff8dc" />
            <stop offset="0.55" stopColor="#f3d27a" />
            <stop offset="1" stopColor="#e3b23c" />
          </radialGradient>
          <radialGradient id="vh-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#f7dc8c" stopOpacity="0.75" />
            <stop offset="0.45" stopColor="#e3b23c" stopOpacity="0.22" />
            <stop offset="1" stopColor="#e3b23c" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="vh-reflect" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="1" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <mask id="vh-reflect-mask" maskUnits="userSpaceOnUse" x="0" y={GROUND} width={W} height={BOTTOM - GROUND}>
            <rect x="0" y={GROUND} width={W} height={BOTTOM - GROUND} fill="url(#vh-reflect)" />
          </mask>
        </defs>

        <g data-depth="6">
          <circle className="vh__sun-glow" cx={SUN.x} cy={SUN.y} r="320" fill="url(#vh-glow)" />
          <g className="vh__rays" opacity="0.07">
            {Array.from({ length: 24 }, (_, i) => (
              <path
                key={i}
                d={`M${SUN.x} ${SUN.y}L${SUN.x - 5} ${SUN.y - 420}L${SUN.x + 5} ${SUN.y - 420}Z`}
                fill="#fff6d0"
                transform={`rotate(${i * 15} ${SUN.x} ${SUN.y})`}
              />
            ))}
          </g>
          <circle className="vh__sun" cx={SUN.x} cy={SUN.y} r="52" fill="url(#vh-sun)" />
        </g>

        {RIDGES.map((r) => (
          <g key={r.key} data-depth={r.depth}>
            <path className={`vh__ridge vh__ridge--${r.key}`} d={r.d} fill={r.fill} />
            {r.key === 'back' && SNOW_BACK.map((d, i) => <path key={i} className="vh__snow" d={d} fill="#e9eedd" opacity="0.8" />)}
            {r.key === 'front' && (
              <>
                {SNOW_FRONT.map((d, i) => (
                  <path key={i} className="vh__snow" d={d} fill="#f6f8ee" />
                ))}
                <path className="vh__edge" d={FRONT_EDGE} />
              </>
            )}
          </g>
        ))}

        {/* Salar de Uyuni: suelo del color de la página + reflejo espejado */}
        <rect x="0" y={GROUND} width={W} height={BOTTOM - GROUND} fill="var(--bg, #fafbf4)" />
        <g className="vh__reflection" mask="url(#vh-reflect-mask)" data-depth="28">
          <path d={RIDGES[2].d} fill="#3b4c24" opacity="0.16" transform={`translate(0 ${GROUND * 1.45}) scale(1 -0.45)`} />
        </g>
        {[0, 1, 2].map((i) => (
          <path key={i} className="vh__shimmer" d={`M${380 + i * 260} ${GROUND + 14 + i * 12}h${180 - i * 30}`} />
        ))}
      </svg>

      <div className="container vh__content">
        <div className="vh__badge-wrap">
          <div className="vh__confetti" aria-hidden="true" />
          <span className="vh__ripple" />
          <span className="vh__ripple" />
          <svg className="vh__badge" viewBox={`0 0 ${BADGE} ${BADGE}`} width={BADGE} height={BADGE} aria-hidden="true">
            <defs>
              <path id={ringId} d={`M${C} ${C}m-66 0a66 66 0 1 1 132 0a66 66 0 1 1 -132 0`} />
            </defs>
            <g className="vh__ring">
              <text className="vh__ring-text">
                <textPath href={`#${ringId}`} textLength={2 * Math.PI * 66 - 6} lengthAdjust="spacing">
                  {RING_TEXT[status]}
                </textPath>
              </text>
            </g>
            <path className="vh__rosette" d={ROSETTE} />
            <circle className="vh__badge-core" cx={C} cy={C} r="40" />
            <circle cx={C} cy={C} r="35" fill="none" stroke="rgba(255,255,255,.22)" strokeDasharray="2 4" />
            <g className="vh__mark">
              {cancelled ? (
                <>
                  <path d={`M${C - 14} ${C - 14}L${C + 14} ${C + 14}`} />
                  <path d={`M${C + 14} ${C - 14}L${C - 14} ${C + 14}`} />
                </>
              ) : (
                <path d={`M${C - 18} ${C + 1}L${C - 5} ${C + 14}L${C + 19} ${C - 13}`} />
              )}
            </g>
          </svg>
        </div>

        <div className="vh__code">
          <span>Voucher</span>
          <strong className="vh__code-value">{code}</strong>
        </div>

        <h1 className="vh__title">{headline}</h1>
        <p className="vh__lead">{lead}</p>
      </div>
    </section>
  );
}

/* ---------------- Confeti con Physics2D (colores del aguayo) ---------------- */
const SHAPES = ['rect', 'tri', 'diamond', 'dot', 'strip'] as const;

function burst(container: HTMLElement | undefined) {
  if (!container) return;
  const pieces: HTMLElement[] = [];
  for (let i = 0; i < 96; i++) {
    const p = document.createElement('i');
    p.className = `vh__piece vh__piece--${SHAPES[i % SHAPES.length]}`;
    p.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    container.appendChild(p);
    pieces.push(p);
  }
  pieces.forEach((p) => {
    const duration = gsap.utils.random(2.4, 3.8);
    gsap.set(p, { scale: gsap.utils.random(0.6, 1.25), rotation: gsap.utils.random(0, 360) });
    gsap.to(p, {
      duration,
      physics2D: { velocity: gsap.utils.random(320, 820), angle: gsap.utils.random(195, 345), gravity: 760, friction: 0.012 },
      rotation: `+=${gsap.utils.random(-900, 900)}`,
      rotationX: gsap.utils.random(-720, 720),
      transformPerspective: 400,
      ease: 'none',
      onComplete: () => p.remove(),
    });
    gsap.to(p, { opacity: 0, duration: 0.6, delay: duration - 0.6, ease: 'power1.in' });
  });
}
