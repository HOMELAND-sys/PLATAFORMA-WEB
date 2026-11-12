'use client';

import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Icon, { type IconProps } from './Icon';
import { prefersReducedMotion } from '@/lib/intro';

gsap.registerPlugin(useGSAP, DrawSVGPlugin, ScrollTrigger);

/* Si el alto de la página cambia (datos que llegan después), recalcula los disparadores. */
let watchingLayout = false;
function watchLayout() {
  if (watchingLayout || typeof ResizeObserver === 'undefined') return;
  watchingLayout = true;
  let pending = 0;
  new ResizeObserver(() => {
    window.clearTimeout(pending);
    pending = window.setTimeout(() => ScrollTrigger.refresh(), 200);
  }).observe(document.body);
}

/**
 * Icono que se "dibuja" al entrar en pantalla: los trazos se trazan con DrawSVG
 * y la capa duotono aparece con un pequeño rebote.
 */
export default function DrawIcon({ delay = 0, ...props }: IconProps & { delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || prefersReducedMotion()) return;
      watchLayout();
      const strokes = el.querySelectorAll('.hi-line > *');
      const tone = el.querySelectorAll('.hi-tone');

      gsap
        .timeline({
          delay,
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        })
        .from(strokes, { drawSVG: '0%', duration: 1.1, stagger: 0.12, ease: 'power2.inOut' })
        .from(
          tone,
          { opacity: 0, scale: 0.6, transformOrigin: '50% 50%', duration: 0.7, ease: 'back.out(2)', clearProps: 'opacity,transform' },
          0.45,
        );
    },
    { scope: ref },
  );

  return (
    <span ref={ref} className="draw-icon">
      <Icon {...props} />
    </span>
  );
}
