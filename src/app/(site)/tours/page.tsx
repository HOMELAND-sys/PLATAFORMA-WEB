import type { Metadata } from 'next';
import { Suspense } from 'react';
import ToursContent from '@/components/tours/ToursContent';
import { getSupabaseServer } from '@/lib/supabase';
import { fetchActiveTours, fetchCategories, fetchOpenDates } from '@/lib/api';

export const metadata: Metadata = {
  title: 'Tours y experiencias en Bolivia',
  description:
    'Todos los tours de Homeland Tours: Salar de Uyuni, Sajama, Toro Toro, La Paz, lago Titicaca y Amazonía. Filtra por fecha, duración y tipo de servicio y reserva online.',
  alternates: { canonical: '/tours' },
};

// Catálogo y cupos desde Supabase: los cambios se ven en menos de un minuto.
export const revalidate = 30;

export default async function ToursPage() {
  const sb = getSupabaseServer();
  const [tours, categories, openDates] = await Promise.all([
    fetchActiveTours(sb),
    fetchCategories(sb),
    fetchOpenDates(sb),
  ]);
  return (
    <Suspense fallback={<div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>Cargando tours…</div>}>
      <ToursContent tours={tours} categories={categories} openDates={openDates} />
    </Suspense>
  );
}
