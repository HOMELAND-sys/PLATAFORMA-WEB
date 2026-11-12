'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import { useAuth } from '@/context/AuthContext';
import { getSupabase } from '@/lib/supabase';
import Icon from '@/components/ui/Icon';

function loginErrorMessage(message: string): string {
  if (/email not confirmed/i.test(message)) {
    return 'Tu email aún no fue verificado. Revisá tu bandeja de entrada (y spam) y hací click en el enlace de confirmación.';
  }
  return 'Correo o contraseña incorrectos.';
}

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/bookings';
  const { session } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpFactorId, setTotpFactorId] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (session && !totpFactorId) {
    return (
      <div className="auth-alert auth-alert--success">
        <Icon name="check-circle" size={20} />
        <span>Ya iniciaste sesión. <Link href={next}>Continuar</Link></span>
      </div>
    );
  }

  const finishLogin = () => {
    window.location.href = next;
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const sb = getSupabase();
      const { data, error: signInError } = await sb.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError(loginErrorMessage(signInError.message));
        return;
      }
      // 2FA (RF-20): si el admin tiene TOTP activo, pedir el código del app
      const { data: factors } = await sb.auth.mfa.listFactors();
      const totp = factors?.totp?.find((f) => f.status === 'verified');
      if (totp) {
        setTotpFactorId(totp.id);
      } else {
        finishLogin();
      }
    } catch {
      setError('No se pudo iniciar sesión. Intentá de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  const submitTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !totpFactorId) return;
    setBusy(true);
    setError(null);
    try {
      const sb = getSupabase();
      const { error: mfaError } = await sb.auth.mfa.challengeAndVerify({
        factorId: totpFactorId,
        code: totpCode.trim(),
      });
      if (mfaError) {
        setError('Código de verificación inválido.');
        return;
      }
      finishLogin();
    } catch {
      setError('No se pudo verificar el código. Intentá de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <section className="page-header page-header--tight">
        <div className="container">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Iniciar sesión' }]} />
          <h1>
            Iniciar <em>sesión</em>
          </h1>
        </div>
      </section>

      <section className="auth-page" style={{ padding: '0 0 80px' }}>
        <div className="auth-shell">
          <div className="auth-card">
            <h1>
              {totpFactorId ? (
                <>
                  Verificación en <em>dos pasos</em>
                </>
              ) : (
                <>
                  Bienvenido de <em>nuevo</em>
                </>
              )}
            </h1>
            <p>
              {totpFactorId
                ? 'Ingresá el código de 6 dígitos de tu aplicación de autenticación.'
                : 'Iniciá sesión para reservar tours, ver tus reservas y seguir su estado.'}
            </p>

            {error && (
              <div className="auth-alert auth-alert--error" role="alert">
                <Icon name="alert" size={20} />
                <span>{error}</span>
              </div>
            )}

            {totpFactorId ? (
              <form onSubmit={submitTotp}>
                <div className="field">
                  <label className="field__label" htmlFor="totpCode">
                    Código de la app <span className="req">*</span>
                  </label>
                  <input
                    id="totpCode"
                    className="input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    maxLength={6}
                    required
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
                  {busy ? 'Verificando…' : 'Verificar e ingresar'}
                </button>
              </form>
            ) : (
              <form onSubmit={submitPassword}>
                <div className="field">
                  <label className="field__label" htmlFor="loginEmail">
                    Correo electrónico <span className="req">*</span>
                  </label>
                  <input
                    id="loginEmail"
                    className="input"
                    type="email"
                    autoComplete="email"
                    placeholder="tu@email.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="loginPassword">
                    Contraseña <span className="req">*</span>
                  </label>
                  <input
                    id="loginPassword"
                    className="input"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
                  {busy ? 'Ingresando…' : 'Iniciar sesión'}
                </button>
              </form>
            )}

            {!totpFactorId && (
              <div className="auth-links">
                <a href={`/forgot?next=${encodeURIComponent(next)}`}>¿Olvidaste tu contraseña?</a>
                <span>
                  ¿No tenés cuenta?{' '}
                  <a href={`/register?next=${encodeURIComponent(next)}`}>Crear cuenta</a>
                </span>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
