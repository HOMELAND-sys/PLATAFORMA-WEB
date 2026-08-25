'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useBooking } from '@/context/BookingContext';
import { useAuth } from '@/context/AuthContext';
import { fetchCategories } from '@/lib/api';
import { getSupabase } from '@/lib/supabase';
import type { CategoryRow } from '@/lib/api';

interface HeaderProps {
  activeNav?: 'tours' | 'customize' | 'business' | null;
  withDropdown?: boolean;
}

const ALL_CATEGORY: CategoryRow & { id: 'all' } = {
  id: 'all',
  slug: 'all',
  label: 'All tours',
  emoji: '🌎',
  image: null,
  position: 0,
};

export default function Header({ activeNav = null, withDropdown = false }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const { selection } = useBooking();
  const { session, profile, isAdmin, signOut } = useAuth();
  const cartCount = selection ? Math.max(1, selection.pax ?? 1) : 0;

  const [categories, setCategories] = useState<CategoryRow[]>([]);

  useEffect(() => {
    let active = true;
    fetchCategories(getSupabase())
      .then((cats) => {
        if (active) setCategories(cats);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const allCategories = [ALL_CATEGORY, ...categories];
  const firstName = (profile?.full_name || session?.user.email || 'Cuenta').split(' ')[0];
  const initials = (profile?.full_name || 'C')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header
      className="site-header"
      style={scrolled ? { boxShadow: 'var(--shadow-md)' } : undefined}
    >
      <div className="container site-header__inner">
        <Link className="brand" href="/" aria-label="Ir al inicio — Homeland Tours">
          <img
            src="/assets/full_trimmed_transparent_black.png"
            alt="Homeland Tours — Bolivian Tour Operator"
            className="brand__logo"
          />
        </Link>

        <nav className={`nav${menuOpen ? ' is-open' : ''}`} id="primaryNav">
          {withDropdown ? (
            <div className="nav-item has-dropdown">
              <Link href="/tours" className={activeNav === 'tours' ? 'active' : ''}>
                Explorar tours{' '}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </Link>
              <div className="nav-dropdown">
                {categories.map((cat) => (
                  <Link key={cat.slug} href={`/tours?cat=${cat.slug}`} onClick={() => setMenuOpen(false)}>
                    <span className="nav-dropdown__icon">{cat.emoji}</span> {cat.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <Link
              href="/tours"
              className={activeNav === 'tours' ? 'active' : ''}
              onClick={() => setMenuOpen(false)}
            >
              Explorar tours
            </Link>
          )}
          <Link
            href="/customize"
            className={activeNav === 'customize' ? 'active' : ''}
            onClick={() => setMenuOpen(false)}
          >
            Personalizar viaje
          </Link>
          <Link
            href="/business"
            className={activeNav === 'business' ? 'active' : ''}
            onClick={() => setMenuOpen(false)}
          >
            Empresas
          </Link>
        </nav>

        <div className="header-actions">
          <a className="lang-pill" href="#" aria-label="Cambiar idioma">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
            </svg>
            <span>ES</span>
          </a>
          <a className="icon-btn" href="#" aria-label="Favoritos">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </a>

          {session ? (
            <div className="account" ref={accountRef}>
              <button
                className="account__btn"
                aria-label={`Cuenta: ${firstName}`}
                aria-expanded={accountOpen}
                onClick={() => setAccountOpen((v) => !v)}
              >
                <span className="account__avatar" aria-hidden="true">
                  {initials}
                </span>
                <span className="account__name">{firstName}</span>
              </button>
              {accountOpen && (
                <div className="account__menu" role="menu">
                  <div className="account__menu-label" title={profile?.full_name || undefined}>
                    {profile?.full_name || session.user.email}
                  </div>
                  <Link className="account__item" href="/bookings" onClick={() => setAccountOpen(false)}>
                    🎫 Mis reservas
                  </Link>
                  {isAdmin && (
                    <Link className="account__item" href="/admin" onClick={() => setAccountOpen(false)}>
                      ⚙️ Panel de administración
                    </Link>
                  )}
                  <button
                    className="account__item account__item--danger"
                    role="menuitem"
                    onClick={async () => {
                      setAccountOpen(false);
                      await signOut();
                      window.location.href = '/';
                    }}
                  >
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              className="icon-btn"
              href="/login"
              aria-label="Mi cuenta — iniciar sesión"
              title="Iniciar sesión"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </Link>
          )}

          <Link
            className={`icon-btn icon-btn--cart${cartCount > 0 ? ' has-items' : ''}`}
            href="/booking"
            aria-label={cartCount > 0 ? `Carrito: ${cartCount} ${cartCount === 1 ? 'persona' : 'personas'}` : 'Carrito de compras'}
            title="Carrito de compras"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {cartCount > 0 && <span className="icon-btn__badge">{cartCount}</span>}
          </Link>
          <Link className="btn btn--gold btn--sm" href={session ? '/bookings' : '/login?next=%2Fbookings'}>
            My Bookings
          </Link>
          <button
            className="menu-toggle"
            aria-label="Abrir menú"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
