'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import ReservasTab from '@/components/admin/ReservasTab';
import ToursTab from '@/components/admin/ToursTab';
import AvailabilityTab from '@/components/admin/AvailabilityTab';
import PaymentTab from '@/components/admin/PaymentTab';

const TABS = [
  {
    id: 'reservas',
    label: 'Reservas',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    id: 'tours',
    label: 'Tours',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
  {
    id: 'disponibilidad',
    label: 'Disponibilidad',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    id: 'pago',
    label: 'Pago',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="1" y="4" width="22" height="16" rx="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
      </svg>
    ),
  },
];

export default function AdminPanel() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { session, profile, isAdmin, loading, signOut } = useAuth();
  const tab = searchParams.get('tab') ?? 'reservas';

  // RF-12: solo sesión admin entra. Sin sesión → login; con sesión no admin → home.
  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace('/login?next=/admin');
      return;
    }
    if (profile && !isAdmin) {
      router.replace('/');
    }
  }, [loading, session, profile, isAdmin, router]);

  if (loading || !session) {
    return <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-500)' }}>Verificando acceso…</div>;
  }

  if (!isAdmin) {
    return <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-500)' }}>Verificando acceso…</div>;
  }

  const initials = (profile?.full_name || profile?.role || 'A')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="admin-layout">
      <aside className="admin-side">
        <div className="admin-side__brand">
          <div className="admin-side__mark">H</div>
          <div>
            <strong>HOMELAND</strong>
            <small>Panel admin</small>
          </div>
        </div>
        <nav className="admin-nav">
          {TABS.map((t) => (
            <Link
              key={t.id}
              href={`/admin?tab=${t.id}`}
              className={tab === t.id ? 'is-active' : ''}
            >
              {t.icon}
              {t.label}
            </Link>
          ))}
        </nav>
        <div className="admin-side__foot">
          <div className="admin-side__avatar">{initials}</div>
          <div className="admin-side__user">
            <strong>{profile?.full_name || 'Admin'}</strong>
            <small>{session.user.email}</small>
          </div>
          <button
            className="admin-side__logout"
            title="Cerrar sesión"
            onClick={() =>
              void signOut().then(() => router.replace('/'))
            }
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        {tab === 'reservas' && <ReservasTab />}
        {tab === 'tours' && <ToursTab />}
        {tab === 'disponibilidad' && <AvailabilityTab />}
        {tab === 'pago' && <PaymentTab />}
      </main>
    </div>
  );
}
