'use client';

import { useEffect } from 'react';

// RF-22: embudo de visitas y conversiones.
// NEXT_PUBLIC_PLAUSIBLE_DOMAIN=homeland.tours  → Plausible
// NEXT_PUBLIC_GA_ID=G-XXXX                     → GA4
// Sin ninguna de las dos, no inyecta nada.

declare global {
  interface Window {
    plausible?: (event: string, opts?: { props?: Record<string, unknown> }) => void;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export function Analytics() {
  useEffect(() => {
    const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
    const gaId = process.env.NEXT_PUBLIC_GA_ID;

    if (plausibleDomain) {
      const s = document.createElement('script');
      s.defer = true;
      s.src = 'https://plausible.io/js/script.js';
      s.setAttribute('data-domain', plausibleDomain);
      document.head.appendChild(s);
      (window as Window).plausible = (event, opts) => {
        window.dispatchEvent(
          new CustomEvent('plausible:track', { detail: { name: event, props: opts?.props } }),
        );
      };
    }

    if (gaId) {
      const s = document.createElement('script');
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
      document.head.appendChild(s);
      const init = document.createElement('script');
      init.textContent = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`;
      document.head.appendChild(init);
      (window as Window).gtag = (...args: unknown[]) => {
        (window as Window).dataLayer?.push(...(args as [unknown][]));
      };
    }
  }, []);

  return null;
}
