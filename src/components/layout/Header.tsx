'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useBooking } from '@/context/BookingContext';
import { useAuth } from '@/context/AuthContext';
import { fetchCategories } from '@/lib/api';
import { getSupabase } from '@/lib/supabase';
import type { CategoryRow } from '@/lib/api';
import HomelandLogo from '@/components/brand/HomelandLogo';
import Icon, { type IconName } from '@/components/ui/Icon';

/** Icono propio por categoría (fallback al emoji de la base de datos). */
const CATEGORY_ICONS: Record<string, IconName> = {
  'lapaz-city': 'cable-car',
  'lapaz-top': 'sparkle',
  uyuni: 'salt-flat',
  amazon: 'palm',
  trekking: 'altitude',
  'bolivia-top': 'gate',
  peru: 'llama',
  all: 'globe',
};

interface HeaderProps {
  activeNav?: 'tours' | 'customize' | 'business' | null;
  withDropdown?: boolean;
}

const ALL_CATEGORY: CategoryRow & { id: 'all' } = {
  id: 'all',
  slug: 'all',
  label: 'Todos los tours',
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
          <HomelandLogo className="brand__logo" height={44} />
        </Link>

        <nav className={`nav${menuOpen ? ' is-open' : ''}`} id="primaryNav">
          {withDropdown ? (
            <div className="nav-item has-dropdown">
              <Link href="/tours" className={activeNav === 'tours' ? 'active' : ''}>
                Explorar tours <Icon name="chevron-down" size={14} className="nav-caret" />
              </Link>
              <div className="nav-dropdown">
                {categories.map((cat) => (
                  <Link key={cat.slug} href={`/tours?cat=${cat.slug}`} onClick={() => setMenuOpen(false)}>
                    <span className="nav-dropdown__icon">
                      {CATEGORY_ICONS[cat.slug] ? <Icon name={CATEGORY_ICONS[cat.slug]} size={20} /> : cat.emoji}
                    </span>{' '}
                    {cat.label}
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
          <button
            type="button"
            className="lang-pill"
            disabled
            title="Próximamente"
            aria-label="Cambiar idioma (próximamente)"
          >
            <Icon name="globe" size={17} />
            <span>ES</span>
          </button>
          <button
            type="button"
            className="icon-btn"
            disabled
            title="Próximamente"
            aria-label="Favoritos (próximamente)"
          >
            <Icon name="heart" size={21} />
          </button>

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
                    <Icon name="ticket" size={18} /> Mis reservas
                  </Link>
                  {isAdmin && (
                    <Link className="account__item" href="/admin" onClick={() => setAccountOpen(false)}>
                      <Icon name="settings" size={18} /> Panel de administración
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
                    <Icon name="logout" size={18} /> Cerrar sesión
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
              <Icon name="user" size={21} />
            </Link>
          )}

          <Link
            className={`icon-btn icon-btn--cart${cartCount > 0 ? ' has-items' : ''}`}
            href={selection?.tourSlug ? `/booking?slug=${encodeURIComponent(selection.tourSlug)}` : '/booking'}
            aria-label={cartCount > 0 ? `Carrito: ${cartCount} ${cartCount === 1 ? 'persona' : 'personas'}` : 'Carrito de compras'}
            title="Carrito de compras"
          >
            <Icon name="bag" size={21} />
            {cartCount > 0 && <span className="icon-btn__badge">{cartCount}</span>}
          </Link>
          <Link className="btn btn--gold btn--sm" href={session ? '/bookings' : '/login?next=%2Fbookings'}>
            Mis reservas
          </Link>
          <button
            className="menu-toggle"
            aria-label="Abrir menú"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <Icon name={menuOpen ? 'close' : 'menu'} size={22} />
          </button>
        </div>
      </div>
    </header>
  );
}
