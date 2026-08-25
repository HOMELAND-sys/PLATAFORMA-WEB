// Eventos de embudo (RF-22): inicio de reserva, reserva creada, pago visto.
// Funciona con Plausible o GA4; sin configuración no hace nada.

declare global {
  interface Window {
    plausible?: (event: string, opts?: { props?: Record<string, unknown> }) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

export function track(event: string, props?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  try {
    if (window.plausible) {
      window.plausible(event, props ? { props } : undefined);
    }
    if (window.gtag) {
      window.gtag('event', event, props ?? {});
    }
  } catch {
    // La analítica nunca debe romper el flujo.
  }
}
