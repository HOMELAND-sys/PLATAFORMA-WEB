'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import { useAuth } from '@/context/AuthContext';
import { getSupabase } from '@/lib/supabase';

function ResetForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/login';
  const { session, loading } = useAuth();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Si llegó por el enlace del email, el cliente ya canjeó el código y tiene sesión.
    if (!loading && !session) {
      // Espera un tick: onAuthStateChange puede tardar un instante en canjear el token de la URL.
      const t = setTimeout(() => {
        getSupabase()
          .auth.getSession()
          .then(({ data }) => {
            if (!data.session) setDone(false);
          });
      }, 800);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [loading, session]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setBusy(true);
    try {
      const { error: updateError } = await getSupabase().auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      await getSupabase().auth.signOut();
      setDone(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <section className="page-header page-header--tight">
        <div className="container">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Nueva contraseña' }]} />
          <h1>
            Nueva <em>contraseña</em>
          </h1>
        </div>
      </section>

      <section className="auth-page" style={{ padding: '0 0 80px' }}>
        <div className="auth-shell">
          <div className="auth-card">
            {done ? (
              <>
                <div className="auth-alert auth-alert--success" style={{ marginBottom: 16 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <path d="M21 12a9 9 0 11-9-9" />
                    <path d="M21 3v6h-6" />
                  </svg>
                  <span>
                    <strong style={{ display: 'block', marginBottom: 4 }}>Contraseña actualizada</strong>
                    Ya podés iniciar sesión con tu contraseña nueva.
                  </span>
                </div>
                <Link className="btn btn--primary btn--block" href={`/login?next=${encodeURIComponent(next)}`}>
                  Iniciar sesión
                </Link>
              </>
            ) : !loading && !session ? (
              <>
                <div className="auth-alert auth-alert--error" style={{ marginBottom: 16 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>
                    Este enlace de recuperación no es válido o ya venció (duración: 24 h). Pedí uno
                    nuevo desde <a href={`/forgot?next=${encodeURIComponent(next)}`}>“¿Olvidaste tu contraseña?”</a>.
                  </span>
                </div>
              </>
            ) : (
              <>
                <h1>
                  Elegí una contraseña <em>nueva</em>
                </h1>
                <p>Debe tener al menos 8 caracteres.</p>

                {error && (
                  <div className="auth-alert auth-alert--error" role="alert">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={submit}>
                  <div className="field">
                    <label className="field__label" htmlFor="resetPassword">
                      Nueva contraseña <span className="req">*</span>
                    </label>
                    <input
                      id="resetPassword"
                      className="input"
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label className="field__label" htmlFor="resetConfirm">
                      Repetir contraseña <span className="req">*</span>
                    </label>
                    <input
                      id="resetConfirm"
                      className="input"
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      required
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
                    {busy ? 'Guardando…' : 'Actualizar contraseña'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

export default function ResetPage() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}
