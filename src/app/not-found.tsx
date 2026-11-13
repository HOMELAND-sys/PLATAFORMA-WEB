import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Página no encontrada',
  robots: { index: false },
};

/**
 * 404 de respaldo. Las rutas inexistentes las atiende `(site)/[...missing]`
 * con el diseño completo; esta versión no depende de estilos del sitio.
 */
export default function NotFound() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        textAlign: 'center',
        background: '#fafbf4',
        color: '#141a0e',
      }}
    >
      <div style={{ maxWidth: 480 }}>
        <h1 style={{ fontSize: '1.9rem', margin: '0 0 10px' }}>No encontramos esa página</h1>
        <p style={{ margin: '0 0 22px', lineHeight: 1.6, color: '#4b5540' }}>
          Puede que el enlace haya cambiado. Desde el inicio puedes volver a explorar los tours.
        </p>
        <Link className="btn btn--primary" href="/">
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
