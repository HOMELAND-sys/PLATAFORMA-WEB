'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import { useAuth, safeNext, authErrorMessage } from '@/context/AuthContext';
import { getSupabase } from '@/lib/supabase';
import Icon from '@/components/ui/Icon';

function ResetForm() {
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get('next'), '/login');
  const { session, loading } = useAuth();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [linkChecked, setLinkChecked] = useState(false);

  useEffect(() => {
    // Si llegó por el enlace del email, el cliente canjea el código y crea sesión.
    if (loading || session) return undefined;
    // Margen para que onAuthStateChange canjee el token de la URL antes de marcar el enlace como inválido.
    const t = setTimeout(() => {
      getSupabase()
        .auth.getSession()
        .then(({ data }) => {
          if (!data.session) setLinkChecked(true);
        })
        .catch(() => setLinkChecked(true));
    }, 800);
    return () => clearTimeout(t);
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
        setError(authErrorMessage(updateError.message, 'No se pudo actualizar la contraseña. Intentá de nuevo.'));
        return;
      }
      await getSupabase().auth.signOut();
      setDone(true);
    } catch {
      setError('No hay conexión con el servidor. Revisá tu internet e intentá de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <section className="page-header page-header--tight">
        <div className="container">
          <Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'Nueva contraseña' }]} />
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
                  <Icon name="check-circle" size={20} />
                  <span>
                    <strong style={{ display: 'block', marginBottom: 4 }}>Contraseña actualizada</strong>
                    Ya podés iniciar sesión con tu contraseña nueva.
                  </span>
                </div>
                <Link className="btn btn--primary btn--block" href={`/login?next=${encodeURIComponent(next)}`}>
                  Iniciar sesión
                </Link>
              </>
            ) : !loading && !session && linkChecked ? (
              <>
                <div className="auth-alert auth-alert--error" style={{ marginBottom: 16 }}>
                  <Icon name="alert" size={20} />
                  <span>
                    Este enlace de recuperación no es válido o ya venció (duración: 24 h). Pedí uno
                    nuevo desde <a href={`/forgot?next=${encodeURIComponent(next)}`}>“¿Olvidaste tu contraseña?”</a>.
                  </span>
                </div>
              </>
            ) : session ? (
              <>
                <h1>
                  Elegí una contraseña <em>nueva</em>
                </h1>
                <p>Debe tener al menos 8 caracteres.</p>

                {error && (
                  <div className="auth-alert auth-alert--error" role="alert">
                    <Icon name="alert" size={20} />
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
            ) : (
              <p style={{ color: 'var(--ink-500)', fontSize: '0.9rem' }}>
                Verificando tu enlace de recuperación…
              </p>
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
