'use client';

import { useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { CustomEase } from 'gsap/CustomEase';
import HomelandLogo from './HomelandLogo';
import { emitIntroReveal, prefersReducedMotion } from '@/lib/intro';

gsap.registerPlugin(useGSAP, DrawSVGPlugin, CustomEase);

const INTRO_SEEN_KEY = 'homeland-intro-seen';

function introSeen() {
  try {
    return window.sessionStorage.getItem(INTRO_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function markIntroSeen() {
  try {
    window.sessionStorage.setItem(INTRO_SEEN_KEY, '1');
  } catch {
    // Sin sessionStorage la intro volverá a salir; no rompe la navegación.
  }
}

/* ------------------------------------------------------------------
   Perfiles de cordillera: [x 0..1, altura 0..1].
   El frontal evoca el Illimani (triple cumbre sobre La Paz).
   ------------------------------------------------------------------ */
type Ridge = ReadonlyArray<readonly [number, number]>;

const FRONT_RIDGE: Ridge = [
  [0, 0.16], [0.04, 0.27], [0.08, 0.2], [0.13, 0.4], [0.17, 0.31], [0.22, 0.48], [0.26, 0.39],
  [0.3, 0.6], [0.34, 0.5], [0.385, 0.77], [0.415, 0.69], [0.448, 0.94], [0.478, 0.82], [0.508, 1],
  [0.538, 0.85], [0.568, 0.96], [0.605, 0.66], [0.645, 0.74], [0.69, 0.5], [0.73, 0.59], [0.78, 0.37],
  [0.83, 0.45], [0.88, 0.25], [0.93, 0.31], [1, 0.13],
];

const BACK_RIDGE: Ridge = [
  [0, 0.32], [0.06, 0.5], [0.11, 0.37], [0.19, 0.72], [0.25, 0.52], [0.32, 0.86], [0.37, 0.64],
  [0.43, 0.92], [0.49, 0.7], [0.55, 0.88], [0.61, 0.6], [0.69, 0.8], [0.75, 0.5], [0.82, 0.66],
  [0.89, 0.42], [0.95, 0.5], [1, 0.3],
];

/** Línea base de la cordillera durante la construcción (fracción del alto de la ventana). */
const BASE = 0.84;
/** Amplitud de los picos, en vmin. */
const AMP_VMIN = 14;

const f1 = (n: number) => Math.round(n * 10) / 10;

/** clip-path inicial (SSR) equivalente al que luego calcula JS en píxeles. */
const SSR_FRONT_CLIP = `polygon(0 0, 100% 0, ${[...FRONT_RIDGE]
  .reverse()
  .map(([x, h]) => `${f1(x * 100)}% calc(${BASE * 100}% - ${f1(h * AMP_VMIN)}vmin)`)
  .join(', ')})`;

/* Curvas de nivel topográficas, deterministas (idénticas en SSR y cliente). */
function closedCurve(p: Array<[number, number]>) {
  const n = p.length;
  let d = `M${f1(p[0][0])} ${f1(p[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = p[(i - 1 + n) % n];
    const p1 = p[i];
    const p2 = p[(i + 1) % n];
    const p3 = p[(i + 2) % n];
    d += `C${f1(p1[0] + (p2[0] - p0[0]) / 6)} ${f1(p1[1] + (p2[1] - p0[1]) / 6)} ${f1(p2[0] - (p3[0] - p1[0]) / 6)} ${f1(
      p2[1] - (p3[1] - p1[1]) / 6,
    )} ${f1(p2[0])} ${f1(p2[1])}`;
  }
  return `${d}Z`;
}

const TOPO_RINGS = Array.from({ length: 9 }, (_, k) => {
  const base = 150 + k * 80;
  const pts: Array<[number, number]> = [];
  const N = 28;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const noise = Math.sin(a * 3 + k * 0.7) * 0.07 + Math.sin(a * 5 - k * 1.3) * 0.045 + Math.cos(a * 2 + k) * 0.05;
    const r = base * (1 + noise);
    pts.push([800 + Math.cos(a) * r * 1.3, 430 + Math.sin(a) * r * 0.8]);
  }
  // Cada curva arranca en un ángulo distinto y alterna sentido: el trazo se reparte por toda la escena.
  const start = (k * 11) % N;
  const ordered = [...pts.slice(start), ...pts.slice(0, start)];
  return closedCurve(k % 2 ? ordered.reverse() : ordered);
});

function ridgePoints(ridge: Ridge, base: number, amp: number, width: number) {
  return ridge.map(([x, h]) => [x * width, base - h * amp] as const);
}

function clipFromPoints(points: ReadonlyArray<readonly [number, number]>, width: number) {
  const edge = [...points]
    .reverse()
    .map(([x, y]) => `${f1(x)}px ${f1(y)}px`)
    .join(', ');
  return `polygon(0px 0px, ${f1(width)}px 0px, ${edge})`;
}

function lineFromPoints(points: ReadonlyArray<readonly [number, number]>) {
  return `M${points.map(([x, y]) => `${f1(x)} ${f1(y)}`).join('L')}`;
}

export default function LogoIntro() {
  const [done, setDone] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;

      if (introSeen()) {
        emitIntroReveal();
        setDone(true);
        return;
      }
      markIntroSeen();

      el.style.animation = 'none'; // desactiva el failsafe CSS: JS toma el control

      const q = gsap.utils.selector(el);
      const front = q('.intro__front')[0] as HTMLDivElement;
      const back = q('.intro__back')[0] as HTMLDivElement;
      const edgeFront = el.querySelector('.intro__edge-front') as SVGPathElement;
      const edgeBack = el.querySelector('.intro__edge-back') as SVGPathElement;
      const logoWrap = q('.intro__logo')[0] as HTMLDivElement;
      const logoSvg = logoWrap.querySelector('svg') as SVGSVGElement;
      const backLogo = q('.intro__back-logo')[0] as HTMLDivElement;

      let finished = false;
      let capTimer = 0;
      const finish = () => {
        if (finished) return;
        finished = true;
        window.clearTimeout(capTimer);
        emitIntroReveal();
        setDone(true);
      };

      if (prefersReducedMotion()) {
        gsap.set(logoWrap, { autoAlpha: 1 });
        emitIntroReveal();
        gsap.to(el, { autoAlpha: 0, duration: 0.45, delay: 0.5, ease: 'power1.out', onComplete: finish });
        return;
      }

      const view = () => ({
        w: window.innerWidth,
        h: window.innerHeight,
        amp: (Math.min(window.innerWidth, window.innerHeight) * AMP_VMIN) / 100,
      });

      const frontState = { base: view().h * BASE };
      const backState = { base: view().h + view().amp + 4 };

      const renderFront = () => {
        const { w, amp } = view();
        const pts = ridgePoints(FRONT_RIDGE, frontState.base, amp, w);
        front.style.clipPath = clipFromPoints(pts, w);
        edgeFront.setAttribute('d', lineFromPoints(pts));
      };
      const renderBack = () => {
        const { w, amp } = view();
        const pts = ridgePoints(BACK_RIDGE, backState.base, amp, w);
        back.style.clipPath = clipFromPoints(pts, w);
        edgeBack.setAttribute('d', lineFromPoints(pts));
      };
      renderFront();
      renderBack();

      /* ---------- Estados iniciales ---------- */
      const outer = logoSvg.querySelector('.hl-outer');
      const inner = logoSvg.querySelector('.hl-inner');
      const strokes = logoSvg.querySelectorAll('.hl-stroke');
      const fills = logoSvg.querySelectorAll('.hl-fill');
      const hLetter = logoSvg.querySelector('.hl-h');
      const glyphs = logoSvg.querySelectorAll('.hl-glyph:not(.hl-dot)');
      const dot = logoSvg.querySelector('.hl-dot');
      const tags = logoSvg.querySelectorAll('.hl-tag');
      const topo = q('.intro__topo path');

      gsap.set(logoWrap, { autoAlpha: 1 });
      gsap.set(strokes, { drawSVG: '0%' });
      gsap.set(fills, { opacity: 0 });
      gsap.set(outer, { rotation: -110, svgOrigin: '44 35.35' });
      gsap.set(inner, { rotation: 120, svgOrigin: '44 35.35' });
      gsap.set(hLetter, { y: 21 });
      gsap.set(glyphs, { opacity: 0, y: 5.5 });
      gsap.set(dot, { opacity: 0, y: -16 });
      gsap.set(tags, { opacity: 0 });
      gsap.set(topo, { drawSVG: '0%' });
      gsap.set(edgeFront, { drawSVG: '0%' });

      const ease = CustomEase.create('ht-glide', 'M0,0 C0.18,0 0.12,1 1,1');

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, onComplete: finish });
      // La intro completa queda por debajo de 3 s; el tope duro cubre pestañas estranguladas.
      tl.timeScale(1.3);
      capTimer = window.setTimeout(() => {
        tl.kill();
        finish();
      }, 3200);

      /* ---------- 1. Paisaje: curvas de nivel + cordillera ---------- */
      tl.to(topo, { drawSVG: '100%', duration: 2.4, stagger: 0.07, ease: 'power1.inOut' }, 0)
        .to('.intro__glow', { opacity: 1, scale: 1, duration: 2, ease: 'power2.out' }, 0)
        .to(edgeFront, { drawSVG: '100%', duration: 1.35, ease: 'power2.inOut' }, 0.05)
        .to('.intro__hills', { opacity: 1, duration: 0.9, ease: 'power1.out' }, 0.75);

      /* ---------- 2. Símbolo: medias lunas que giran y se dibujan ---------- */
      tl.to(outer, { rotation: 0, duration: 1.35, ease: 'expo.out' }, 0.15)
        .to(inner, { rotation: 0, duration: 1.35, ease: 'expo.out' }, 0.25)
        .to(strokes, { drawSVG: '100%', duration: 1.05, stagger: 0.1, ease: 'power2.inOut' }, 0.15)
        .to(fills, { opacity: 1, duration: 0.55, stagger: 0.08, ease: 'power2.out' }, 0.95)
        .to(strokes, { opacity: 0, duration: 0.5 }, 1.15)
        /* ---------- 3. La H emerge ---------- */
        .to(hLetter, { y: 0, duration: 0.95, ease: 'expo.out' }, 1.05)
        /* ---------- 4. Wordmark letra a letra ---------- */
        .to(glyphs, { opacity: 1, y: 0, duration: 0.75, stagger: 0.035, ease: 'expo.out' }, 1.25)
        .to(dot, { opacity: 1, y: 0, duration: 0.75, ease: 'bounce.out' }, 1.62)
        .to(tags, { opacity: 0.92, duration: 0.35, stagger: 0.018, ease: 'none' }, 1.6);

      /* ---------- 5. Salida: el logo vuela al header y la cordillera se eleva ---------- */
      const flight = () => {
        const from = logoSvg.getBoundingClientRect();
        const target = document.querySelector<SVGSVGElement | HTMLElement>('.site-header .brand__logo');
        const to = target?.getBoundingClientRect();
        if (!to || to.width === 0 || to.bottom < 0 || from.width === 0) return null;
        return { x: to.left - from.left, y: to.top - from.top, scale: to.width / from.width, rect: to };
      };
      let path: ReturnType<typeof flight> = null;

      tl.addLabel('exit', 2.3)
        .add(() => {
          el.classList.add('is-unlocked');
          path = flight();
          if (path) {
            const r = path.rect;
            gsap.set(backLogo, { left: r.left, top: r.top, width: r.width, height: r.height, autoAlpha: 1 });
          }
        }, 'exit')
        .to('.intro__glow', { opacity: 0, duration: 0.8 }, 'exit')
        .to(topo, { opacity: 0, duration: 0.7 }, 'exit')
        .to(
          logoWrap,
          {
            x: () => path?.x ?? 0,
            y: () => path?.y ?? -60,
            scale: () => path?.scale ?? 0.6,
            autoAlpha: () => (path ? 1 : 0),
            duration: 0.95,
            ease,
          },
          'exit',
        )
        .to(frontState, { base: () => -12, duration: 1.15, ease: 'power3.inOut', onUpdate: renderFront }, 'exit+=0.18')
        .to(backState, { base: () => -12, duration: 1.15, ease: 'power3.inOut', onUpdate: renderBack }, 'exit+=0.42')
        .add(() => emitIntroReveal(), 'exit+=0.45')
        .from(
          document.querySelectorAll('.site-header .nav > *, .site-header .header-actions > *'),
          {
            y: -14,
            autoAlpha: 0,
            duration: 0.8,
            stagger: 0.045,
            ease: 'power3.out',
            immediateRender: false,
            clearProps: 'transform,opacity,visibility',
          },
          'exit+=1.05',
        )
        .add(() => el.classList.add('is-revealed'), 'exit+=1.5');

      /* Clic / tecla: salta la intro de inmediato. */
      const skip = () => {
        tl.kill();
        finish();
      };
      el.addEventListener('pointerdown', skip);
      window.addEventListener('keydown', skip);
      return () => {
        window.clearTimeout(capTimer);
        el.removeEventListener('pointerdown', skip);
        window.removeEventListener('keydown', skip);
      };
    },
    { scope: root },
  );

  if (done) return null;

  return (
    <div className="intro" ref={root} data-intro aria-hidden="true">
      <noscript>
        <style>{'.intro{display:none!important}'}</style>
      </noscript>

      {/* Capa trasera: segunda cordillera (más clara) */}
      <div className="intro__back">
        <div className="intro__hills" />
        <div className="intro__back-logo">
          <HomelandLogo height={44} />
        </div>
      </div>

      {/* Capa frontal: cielo, curvas de nivel y logotipo */}
      <div className="intro__front" style={{ clipPath: SSR_FRONT_CLIP }}>
        <div className="intro__glow" />
        <svg className="intro__topo" viewBox="0 0 1600 940" preserveAspectRatio="xMidYMid slice">
          {TOPO_RINGS.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </svg>

        <div className="intro__stage">
          <div className="intro__logo">
            <HomelandLogo animatedId="intro-logo" height={200} />
          </div>
        </div>

      </div>

      <svg className="intro__edges">
        <path className="intro__edge-back" />
        <path className="intro__edge-front" />
      </svg>
    </div>
  );
}
