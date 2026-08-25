import type { Metadata } from 'next';
import { Suspense } from 'react';
import ConfirmationContent from '@/components/confirmation/ConfirmationContent';

export const metadata: Metadata = {
  title: '¡Tu aventura está reservada!',
};

export default function ConfirmationPage() {
  return (
    <Suspense
      fallback={<div style={{ padding: '80px 0', textAlign: 'center' }}>Cargando voucher…</div>}
    >
      <ConfirmationContent />
    </Suspense>
  );
}
