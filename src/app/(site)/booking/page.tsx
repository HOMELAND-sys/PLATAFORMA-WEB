import type { Metadata } from 'next';
import { Suspense } from 'react';
import BookingContent from '@/components/booking/BookingContent';

export const metadata: Metadata = {
  title: 'Completar reserva',
};

export default function BookingPage() {
  return (
    <Suspense
      fallback={<div style={{ padding: '80px 0', textAlign: 'center' }}>Cargando reserva…</div>}
    >
      <BookingContent />
    </Suspense>
  );
}
