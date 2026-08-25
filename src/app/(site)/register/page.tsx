'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import { getSupabase } from '@/lib/supabase';

function RegisterForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/bookings';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingAccount, setExistingAccount] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

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
    if (!consent) {
      setError('Debés aceptar el aviso de privacidad para continuar.');
      return;
    }

    setBusy(true);
    try {
      const sb = getSupabase();
      const { data, error: signUpError } = await sb.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName.trim() } },
      });
      if (signUpError) {
        if (/already registered|already been registered|already exists/i.test(signUpError.message)) {
          setExistingAccount(true);
          setError('Ya existe una cuenta con este email.');
        } else {
          setExistingAccount(false);
          setError(signUpError.message);
        }
        return;
      }
      setExistingAccount(false);
      if (data.session) {
        // Verificación de email deshabilitada: sesión inmediata.
        window.location.href = next;
        return;
      }
      setDone(true);
    } catch {
      setError('No se pudo crear la cuenta. Intentá de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <section className="auth-page">
        <div className="auth-shell">
          <div className="auth-card">
            <div className="auth-alert auth-alert--success" style={{ marginBottom: 16 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M21 12a9 9 0 11-9-9" />
                <path d="M21 3v6h-6" />
              </svg>
              <span>
                <strong style={{ display: 'block', marginBottom: 4 }}>¡Cuenta creada!</strong>
                Te enviamos un email de verificación a <strong>{email}</strong>. Abrilo y hací click
                en el enlace para activar tu cuenta; después podés iniciar sesión y reservar.
              </span>
            </div>
            <p style={{ color: 'var(--ink-500)', fontSize: '0.88rem' }}>
              ¿No llegó el email? Revisá la carpeta de spam o{' '}
              <a href={`/forgot?next=${encodeURIComponent(next)}`}>pedí una recuperación</a>.
            </p>
            <Link className="btn btn--primary btn--block" href={`/login?next=${encodeURIComponent(next)}`}>
              Ir a iniciar sesión
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="page-header page-header--tight">
        <div className="container">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Crear cuenta' }]} />
          <h1>
            Crear <em>cuenta</em>
          </h1>
        </div>
      </section>

      <section className="auth-page" style={{ padding: '0 0 80px' }}>
        <div className="auth-shell">
          <div className="auth-card">
            <h1>
              Empezá a <em>reservar</em>
            </h1>
            <p>Con tu cuenta reservás de forma segura, guardás tus datos y seguís el estado de cada reserva.</p>

            {error && (
              <div className="auth-alert auth-alert--error" role="alert">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>
                  {error}
                  {existingAccount && (
                    <>
                      {' '}
                      Si la olvidaste, podés{' '}
                      <a href={`/forgot?next=${encodeURIComponent(next)}`}>recuperar tu contraseña</a>.
                    </>
                  )}
                </span>
              </div>
            )}

            <form onSubmit={submit}>
              <div className="field">
                <label className="field__label" htmlFor="regName">
                  Nombre completo <span className="req">*</span>
                </label>
                <input
                  id="regName"
                  className="input"
                  type="text"
                  autoComplete="name"
                  placeholder="Ej. María Fernanda López"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="regEmail">
                  Correo electrónico <span className="req">*</span>
                </label>
                <input
                  id="regEmail"
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
                <label className="field__label" htmlFor="regPassword">
                  Contraseña <span className="req">*</span>
                </label>
                <input
                  id="regPassword"
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  minLength={8}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="regConfirm">
                  Repetir contraseña <span className="req">*</span>
                </label>
                <input
                  id="regConfirm"
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  minLength={8}
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </div>

              <label className="checkbox" style={{ marginBottom: 20 }}>
                <input
                  type="checkbox"
                  required
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span style={{ fontSize: '0.85rem' }}>
                  Acepto el aviso de privacidad: mis datos (nombre, email, teléfono y datos de
                  pasajeros) se usan solo para operar mis reservas, según la Ley 045 de Protección de
                  Datos Personales. <span className="req">*</span>
                </span>
              </label>

              <button type="submit" className="btn btn--primary btn--block" disabled={busy}>
                {busy ? 'Creando cuenta…' : 'Crear cuenta'}
              </button>
            </form>

            <div className="auth-links">
              <span>
                ¿Ya tenés cuenta?{' '}
                <a href={`/login?next=${encodeURIComponent(next)}`}>Iniciar sesión</a>
              </span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
