'use client';

import { Suspense } from 'react';
import AdminPanel from '@/components/admin/AdminPanel';

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-500)' }}>
          Cargando panel…
        </div>
      }
    >
      <AdminPanel />
    </Suspense>
  );
}
