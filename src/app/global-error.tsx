'use client';

import { useEffect } from 'react';

/** Último recurso: falla del layout raíz. No depende de estilos ni contextos. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'system-ui, sans-serif',
          background: '#f6f8f1',
          color: '#232d13',
          textAlign: 'center',
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 460 }}>
          <h1 style={{ fontSize: '1.7rem', margin: '0 0 10px' }}>Algo no salió bien</h1>
          <p style={{ margin: '0 0 22px', lineHeight: 1.6, color: '#4b5540' }}>
            No pudimos cargar el sitio. Inténtalo de nuevo en un momento.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              border: 0,
              borderRadius: 999,
              padding: '12px 26px',
              fontWeight: 700,
              fontSize: '1rem',
              background: '#75953e',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            Intentar de nuevo
          </button>
        </div>
      </body>
    </html>
  );
}
