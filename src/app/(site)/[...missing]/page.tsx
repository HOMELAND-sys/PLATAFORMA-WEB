import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Página no encontrada',
  robots: { index: false },
};

/**
 * Cualquier ruta que no exista cae aquí y se resuelve con el 404 del sitio,
 * dentro de su layout (cabecera, pie y estilos).
 */
export default function MissingPage() {
  notFound();
}
