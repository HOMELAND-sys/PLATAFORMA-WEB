// Coordinación entre la animación de entrada del logotipo (LogoIntro) y las
// animaciones de página (p. ej. el Hero), que esperan a que la cortina se abra.

export const INTRO_REVEAL_EVENT = 'homeland:intro-reveal';

declare global {
  interface Window {
    __htIntroRevealed?: boolean;
  }
}

/** Ejecuta `cb` cuando la página empieza a revelarse (o de inmediato si no hay intro). */
export function onIntroReveal(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  if (window.__htIntroRevealed || !document.querySelector('[data-intro]')) {
    cb();
    return () => undefined;
  }
  const handler = () => cb();
  window.addEventListener(INTRO_REVEAL_EVENT, handler, { once: true });
  return () => window.removeEventListener(INTRO_REVEAL_EVENT, handler);
}

export function emitIntroReveal() {
  if (window.__htIntroRevealed) return;
  window.__htIntroRevealed = true;
  window.dispatchEvent(new Event(INTRO_REVEAL_EVENT));
}

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
