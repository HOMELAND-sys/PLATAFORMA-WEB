'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';

export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  role: 'client' | 'admin';
  created_at: string;
}

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (patch: { full_name?: string; phone?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (sessionId: string | null) => {
    if (!sessionId) {
      setProfile(null);
      return;
    }
    const { data, error } = await getSupabase()
      .from('profiles')
      .select('id, full_name, phone, role, created_at')
      .eq('id', sessionId)
      .maybeSingle();
    if (!error) setProfile((data as Profile | null) ?? null);
  }, []);

  useEffect(() => {
    const sb = getSupabase();
    let active = true;

    sb.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);
        void loadProfile(data.session?.user.id ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setLoading(false);
      });

    const { data: sub } = sb.auth.onAuthStateChange((_event, newSession) => {
      if (!active) return;
      setSession(newSession);
      void loadProfile(newSession?.user.id ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refreshProfile = useCallback(async () => {
    await loadProfile(session?.user.id ?? null);
  }, [loadProfile, session]);

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  const updateProfile = useCallback(
    async (patch: { full_name?: string; phone?: string }) => {
      if (!session) return;
      const { error } = await getSupabase().from('profiles').update(patch).eq('id', session.user.id);
      if (!error) await loadProfile(session.user.id);
    },
    [loadProfile, session],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      isAdmin: profile?.role === 'admin',
      loading,
      refreshProfile,
      signOut,
      updateProfile,
    }),
    [session, profile, loading, refreshProfile, signOut, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}

/** Solo permite rutas internas como destino post-login (evita open redirect). */
export function safeNext(raw: string | null, fallback = '/bookings'): string {
  if (!raw) return fallback;
  // Rechaza control/espacios (p. ej. %09, que el navegador elimina y convierte
  // /%09/evil en //evil), protocol-relative // y backslash en cualquier posición.
  if (/[\u0000-\u0020\u007f]/.test(raw)) return fallback;
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return fallback;
  try {
    const origin = typeof location !== 'undefined' ? location.origin : 'http://localhost';
    const url = new URL(raw, origin);
    if (url.origin !== origin) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

/** Traduce los errores de Supabase Auth a español claro, sin filtrar detalles técnicos. */
export function authErrorMessage(message: string, fallback: string): string {
  const m = message.toLowerCase();
  if (/rate limit|too many|over_request|429/.test(m)) {
    return 'Demasiados intentos seguidos. Esperá unos minutos e intentá de nuevo.';
  }
  if (/weak password|password should be at least|password.*at least \d/.test(m)) {
    return 'La contraseña es demasiado débil: usá al menos 8 caracteres combinando letras y números.';
  }
  if (/different from the old|same as the old|new password should be different/.test(m)) {
    return 'La contraseña nueva debe ser distinta de la anterior.';
  }
  if (/invalid email|unable to validate email|email address.*invalid|invalid.*email address/.test(m)) {
    return 'El correo electrónico no es válido. Revisalo e intentá de nuevo.';
  }
  if (/signups not allowed|signup.*disabled|signups are disabled/.test(m)) {
    return 'El registro de cuentas nuevas está deshabilitado por el momento. Escribinos por WhatsApp y te ayudamos.';
  }
  if (/already registered|already been registered|already exists|user already/.test(m)) {
    return 'Ya existe una cuenta con este email. Iniciá sesión o recuperá tu contraseña.';
  }
  if (/email not confirmed|not confirmed|confirmation pending|verify your email|email.*not.*verified/.test(m)) {
    return 'Tu cuenta todavía no está confirmada. Revisá tu correo (y la carpeta de spam) y abrí el enlace de verificación.';
  }
  if (/session_not_found|auth session missing|invalid claim|token.*expired|expired.*token|invalid token|refresh_token/.test(m)) {
    return 'Tu enlace o sesión venció. Pedí uno nuevo e intentá de nuevo.';
  }
  if (/failed to fetch|network|load failed/.test(m)) {
    return 'No hay conexión con el servidor. Revisá tu internet e intentá de nuevo.';
  }
  return fallback;
}
