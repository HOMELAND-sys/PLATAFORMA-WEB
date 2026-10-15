'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getSupabase } from '@/lib/supabase';
import { DASHBOARD_PERIODS, dashboardDate, operatorDay, shiftDay, type DashboardPeriod } from '@/lib/admin-dashboard';
import AdminBrand from './AdminBrand';
import AdminIcon from './AdminIcon';
import DashboardTab from './DashboardTab';
import ReservasTab from './ReservasTab';
import ToursTab from './ToursTab';
import AvailabilityTab from './AvailabilityTab';
import ClientsTab from './ClientsTab';
import ReportsTab from './ReportsTab';
import PaymentTab from './PaymentTab';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'tours', label: 'Tours', icon: 'tours' },
  { id: 'disponibilidad', label: 'Disponibilidad', icon: 'calendar' },
  { id: 'reservas', label: 'Reservas', icon: 'ticket' },
  { id: 'clientes', label: 'Clientes', icon: 'users' },
  { id: 'reportes', label: 'Reportes', icon: 'chart' },
  { id: 'pago', label: 'Configuración de pago', icon: 'settings' },
] as const;

export default function AdminPanel() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { session, profile, isAdmin, loading, signOut } = useAuth();
  const requestedTab = searchParams.get('tab') ?? 'dashboard';
  const tab = NAV_ITEMS.some((item) => item.id === requestedTab) ? requestedTab : 'dashboard';
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [period, setPeriod] = useState<DashboardPeriod>('30d');
  const [customFrom, setCustomFrom] = useState(() => shiftDay(operatorDay(), -29));
  const [customTo, setCustomTo] = useState(() => operatorDay());
  const searchRef = useRef<HTMLInputElement>(null);
  const range = useMemo(() => {
    if (period === 'custom') return { from: customFrom, to: customTo };
    const days = DASHBOARD_PERIODS.find((item) => item.id === period)?.days ?? 30;
    return { from: shiftDay(operatorDay(), 1 - days), to: operatorDay() };
  }, [period, customFrom, customTo]);

  useEffect(() => {
    if (loading) return;
    if (!session) router.replace('/login?next=/admin');
    else if (profile && !isAdmin) router.replace('/');
  }, [loading, session, profile, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    getSupabase().from('reservations').select('id', { count: 'exact', head: true })
      .eq('status', 'pendiente_pago')
      .then(({ count, error }) => { if (active) setPendingCount(error ? null : count ?? 0); });
    return () => { active = false; };
  }, [tab, isAdmin]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [tab]);

  if (loading || !session || !isAdmin) {
    return <div className="admin-access" role="status"><span className="admin-access__spinner" />Verificando acceso…</div>;
  }

  const initials = (profile?.full_name || 'Admin').split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  return (
    <div className={`admin-layout${mobileOpen ? ' admin-layout--menu-open' : ''}`}>
      <a className="admin-skip" href="#admin-content">Ir al contenido</a>
      {mobileOpen && <button className="admin-menu-backdrop" aria-label="Cerrar menú" onClick={() => setMobileOpen(false)} />}
      <aside className="admin-side" id="admin-navigation">
        <Link className="admin-side__brand" href="/admin" aria-label="Homeland Tours · Dashboard"><AdminBrand /></Link>
        <button className="admin-mobile-close" onClick={() => setMobileOpen(false)} aria-label="Cerrar menú"><AdminIcon name="close" /></button>
        <nav className="admin-nav" aria-label="Administración">
          {NAV_ITEMS.map((item) => (
            <Link key={item.id} href={`/admin?tab=${item.id}`} className={tab === item.id ? 'is-active' : ''} aria-current={tab === item.id ? 'page' : undefined}>
              <AdminIcon name={item.icon} size={23} />
              <span className="admin-nav__text">{item.label}</span>
              {item.id === 'reservas' && (pendingCount ?? 0) > 0 && <span className="admin-nav__badge" title={`${pendingCount} pendientes de pago`}>{pendingCount}</span>}
            </Link>
          ))}
        </nav>
        <div className="admin-side__journey"><span>AUTHENTIC JOURNEYS.</span><span>LOCAL HEARTS.</span></div>
        <Link href="/" className="admin-side__site"><AdminIcon name="external" size={15} /> Visitar sitio web</Link>
      </aside>

      <div className="admin-workspace">
        <header className="admin-topbar">
          <button className="admin-mobile-toggle" onClick={() => setMobileOpen((open) => !open)} aria-label="Abrir menú de administración" aria-controls="admin-navigation" aria-expanded={mobileOpen}><AdminIcon name="menu" /></button>
          <form className="admin-search" role="search" onSubmit={(event) => {
            event.preventDefault();
            router.push(`/admin?tab=reservas&q=${encodeURIComponent(search.trim())}`);
          }}>
            <button type="submit" aria-label="Buscar"><AdminIcon name="search" /></button>
            <input ref={searchRef} aria-label="Buscar reservas, clientes o tours" type="search" placeholder="Buscar reservas, clientes, tours…" value={search} onChange={(event) => setSearch(event.target.value)} />
            <kbd>Ctrl K</kbd>
          </form>
          <div className="admin-topbar__actions">
            {tab === 'dashboard' && <div className="admin-date-picker">
              <AdminIcon name="calendar" size={19} />
              <span>{dashboardDate(range.from)} – {dashboardDate(range.to)}</span>
              <select aria-label="Período del dashboard" value={period} onChange={(event) => setPeriod(event.target.value as DashboardPeriod)}>
                {DASHBOARD_PERIODS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
              <AdminIcon name="chevron" size={16} />
            </div>}
            <Link className="admin-notification" href="/admin?tab=reservas&status=pendiente_pago" aria-label={`Ver reservas pendientes de pago${pendingCount === null ? '' : `: ${pendingCount}`}`}>
              <AdminIcon name="bell" size={23} />
              {(pendingCount ?? 0) > 0 && <span>{pendingCount! > 99 ? '99+' : pendingCount}</span>}
            </Link>
            <details className="admin-account">
              <summary><span className="admin-account__avatar">{initials}</span><span className="admin-account__name"><strong>{profile?.full_name || 'Admin'}</strong><small>Administrador</small></span><AdminIcon name="chevron" size={16} /></summary>
              <div className="admin-account__menu"><small>{session.user.email}</small><Link href="/">Visitar sitio web <AdminIcon name="external" size={16} /></Link><button onClick={() => void signOut().then(() => router.replace('/'))}>Cerrar sesión <AdminIcon name="logout" size={17} /></button></div>
            </details>
          </div>
        </header>

        <main className="admin-main" id="admin-content">
          {tab === 'dashboard' && period === 'custom' && <div className="admin-custom-range">
            <label>Desde <input type="date" value={customFrom} max={customTo} onChange={(event) => { if (event.target.value && event.target.value <= customTo) setCustomFrom(event.target.value); }} /></label>
            <label>Hasta <input type="date" value={customTo} min={customFrom} onChange={(event) => { if (event.target.value && event.target.value >= customFrom) setCustomTo(event.target.value); }} /></label>
          </div>}
          {tab === 'dashboard' && <DashboardTab range={range} />}
          {tab === 'reservas' && <ReservasTab />}
          {tab === 'tours' && <ToursTab />}
          {tab === 'disponibilidad' && <AvailabilityTab />}
          {tab === 'pago' && <PaymentTab />}
          {tab === 'clientes' && <ClientsTab />}
          {tab === 'reportes' && <ReportsTab />}
        </main>
      </div>
    </div>
  );
}
