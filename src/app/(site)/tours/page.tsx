import type { Metadata } from 'next';
import { Suspense } from 'react';
import ToursContent from '@/components/tours/ToursContent';

export const metadata: Metadata = {
  title: 'Tours & Packages',
};

export default function ToursPage() {
  return (
    <Suspense fallback={<div style={{ padding: '80px 0', textAlign: 'center' }}>Cargando tours…</div>}>
      <ToursContent />
    </Suspense>
  );
}
