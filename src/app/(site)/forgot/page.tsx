'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import { getSupabase } from '@/lib/supabase';

function ForgotForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/bookings';

  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    // La respuesta en pantalla es idéntica exista o no la cuenta (RF-03).
    try {
      await getSupabase().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset?next=${encodeURIComponent(next)}`,
      });
    } finally {
      setSent(true);
      setBusy(false);
    }
  };

  return (
    <>
      <section className="page-header page-header--tight">
        <div className="container">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Recuperar contraseña' }]} />
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
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <path d="M21 12a9 9 0 11-9-9" />
                    <path d="M21 3v6h-6" />
                  </svg>
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
                  <a href={`/login?next=${encodeURIComponent(next)}`}>← Volver a iniciar sesión</a>
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
