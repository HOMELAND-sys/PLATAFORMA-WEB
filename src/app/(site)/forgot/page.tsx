'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import { safeNext, authErrorMessage } from '@/context/AuthContext';
import { getSupabase } from '@/lib/supabase';
import Icon from '@/components/ui/Icon';

function ForgotForm() {
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get('next'));

  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    // La respuesta en pantalla es idéntica exista o no la cuenta (RF-03).
    try {
      const { error: resetError } = await getSupabase().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset?next=${encodeURIComponent(next)}`,
      });
      if (resetError) {
        setError(authErrorMessage(resetError.message, 'No se pudo enviar el enlace. Intentá de nuevo en unos minutos.'));
        return;
      }
      setSent(true);
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
          <Breadcrumbs items={[{ label: 'Inicio', href: '/' }, { label: 'Recuperar contraseña' }]} />
          <h1>
            Recuperar <em>contraseña</em>
          </h1>
        </div>
      </section>

      <section className="auth-page" style={{ padding: '0 0 80px' }}>
        <div className="auth-shell">
          <div className="auth-card">
            {sent ? (
              <>
                <div className="auth-alert auth-alert--success" style={{ marginBottom: 16 }}>
                  <Icon name="check-circle" size={20} />
                  <span>
                    <strong style={{ display: 'block', marginBottom: 4 }}>Revisá tu email</strong>
                    Si existe una cuenta para <strong>{email}</strong>, te enviamos un enlace para
                    elegir una contraseña nueva. El enlace es válido por 24 horas.
                  </span>
                </div>
                <Link className="btn btn--ghost btn--block" href={`/login?next=${encodeURIComponent(next)}`}>
                  Volver a iniciar sesión
                </Link>
              </>
            ) : (
              <>
                <h1>
                  ¿Olvidaste tu <em>contraseña?</em>
                </h1>
                <p>Te enviamos un enlace por email para elegir una contraseña nueva.</p>
                {error && (
                  <div className="auth-alert auth-alert--error" role="alert">
                    <Icon name="alert" size={20} />
                    <span>{error}</span>
                  </div>
                )}
                <form onSubmit={submit}>
                  <div className="field">
                    <label className="field__label" htmlFor="forgotEmail">
                      Correo electrónico <span className="req">*</span>
                    </label>
                    <input
                      id="forgotEmail"
                      className="input"
                      type="email"
                      autoComplete="email"
                      placeholder="tu@email.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
                    {busy ? 'Enviando…' : 'Enviar enlace de recuperación'}
                  </button>
                </form>
                <div className="auth-links">
                  <a href={`/login?next=${encodeURIComponent(next)}`} className="icon-inline">
                    <Icon name="arrow-left" size={15} /> Volver a iniciar sesión
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

export default function ForgotPage() {
  return (
    <Suspense fallback={null}>
      <ForgotForm />
    </Suspense>
  );
}
