'use client';

import { useState, type FormEvent } from 'react';
import { submitContactRequest, type ContactSource } from './contact';

export function useContactForm(source: ContactSource) {
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || submitted) return;
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      await submitContactRequest(source, data);
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar tu consulta. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  }
  return { submitted, busy, error, handleSubmit };
}
