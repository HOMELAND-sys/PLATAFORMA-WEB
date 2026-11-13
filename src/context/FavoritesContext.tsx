'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const KEY = 'ht.favorites.v1';

interface FavoritesValue {
  slugs: string[];
  count: number;
  hydrated: boolean;
  has: (slug: string) => boolean;
  toggle: (slug: string) => void;
}

const FavoritesContext = createContext<FavoritesValue>({
  slugs: [],
  count: 0,
  hydrated: false,
  has: () => false,
  toggle: () => undefined,
});

/** Favoritos del visitante: se guardan en este dispositivo, sin necesidad de cuenta. */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [slugs, setSlugs] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) setSlugs(parsed.filter((s): s is string => typeof s === 'string'));
    } catch {
      // almacenamiento no disponible: los favoritos viven solo en memoria
    }
    setHydrated(true);
  }, []);

  // Mantiene sincronizadas varias pestañas abiertas.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY) return;
      try {
        const parsed: unknown = e.newValue ? JSON.parse(e.newValue) : [];
        if (Array.isArray(parsed)) setSlugs(parsed.filter((s): s is string => typeof s === 'string'));
      } catch {
        // valor ajeno: se ignora
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const toggle = useCallback((slug: string) => {
    setSlugs((prev) => {
      const next = prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug];
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // sin almacenamiento: se conserva en memoria
      }
      return next;
    });
  }, []);

  const value = useMemo<FavoritesValue>(
    () => ({ slugs, count: slugs.length, hydrated, has: (slug) => slugs.includes(slug), toggle }),
    [slugs, hydrated, toggle],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesValue {
  return useContext(FavoritesContext);
}
