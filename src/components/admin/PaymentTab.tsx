'use client';

import { useEffect, useState } from 'react';
import { fetchPaymentSettings, upsertSetting, uploadToBucket, type PaymentSettings } from '@/lib/api';
import { getSupabase } from '@/lib/supabase';

export default function PaymentTab() {
  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [link, setLink] = useState('');
  const [instructions, setInstructions] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');

  useEffect(() => {
    fetchPaymentSettings(getSupabase())
      .then((s) => {
        setSettings(s);
        setLink(s.link ?? '');
        setInstructions(s.instructions ?? '');
        setQrUrl(s.qrUrl ?? '');
      })
      .catch(() => setSettings({ link: null, qrUrl: null, instructions: null }));
  }, []);

  const save = async () => {
    setSaving(true);
    setError('');
    setOkMsg('');
    try {
      const sb = getSupabase();
      await upsertSetting(sb, 'payment_link', link.trim() || null);
      await upsertSetting(sb, 'payment_instructions', instructions.trim() || null);
      await upsertSetting(sb, 'payment_qr_url', qrUrl.trim() || null);
      setOkMsg('Configuración guardada. Los nuevos vouchers ya la usan.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  const uploadQr = async (file: File) => {
    setError('');
    try {
      const url = await uploadToBucket(getSupabase(), 'payment', `qr-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`, file);
      setQrUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir el QR.');
    }
  };

  return (
    <>
      <div className="admin-header">
        <div>
          <h1>Pago</h1>
          <p>
            Configuración global de pago (RF-08): enlace, QR e instrucciones. Aparecen en el voucher de
            cada reserva.
          </p>
        </div>
        <div className="admin-header__actions">
          <button className="btn btn--primary" disabled={saving} onClick={() => void save()}>
            {saving ? 'Guardando…' : 'Guardar configuración'}
          </button>
        </div>
      </div>

      {error && <div className="admin-alert admin-alert--error">{error}</div>}
      {okMsg && <div className="admin-alert admin-alert--ok">{okMsg}</div>}

      <div className="admin-card">
        <div className="admin-form">
          <div className="af-field">
            <label>Enlace de pago <small>(botón “Pagar” del voucher)</small></label>
            <input
              type="url"
              placeholder="https://pago.mioperadora.com/homeland"
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
          </div>

          <div className="af-field">
            <label>Imagen del QR <small>(se muestra en el voucher)</small></label>
            <div className="af-upload">
              {qrUrl && <img className="af-upload__preview" src={qrUrl} alt="QR de pago" />}
              <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadQr(f); }} />
              {qrUrl && (
                <button className="btn btn--ghost btn--sm" onClick={() => setQrUrl('')}>
                  Quitar QR
                </button>
              )}
            </div>
          </div>

          <div className="af-field">
            <label>Instrucciones de pago <small>(texto breve que se muestra en el voucher)</small></label>
            <textarea
              rows={3}
              placeholder="Ej: aboná el 50% para confirmar. Consultas por WhatsApp al +591 760 12345."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="admin-card">
        <h3>¿Cómo se ve en el voucher?</h3>
        <p style={{ color: 'var(--ink-500)', fontSize: '0.9rem', margin: '0 0 12px' }}>
          {link || qrUrl
            ? 'El voucher muestra el botón de pago y/o el QR, y las instrucciones que definas.'
            : 'Sin enlace ni QR, el voucher ofrece el fallback de WhatsApp para coordinar el pago.'}
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className={`badge-status ${link ? 'badge-status--green' : 'badge-status--gray'}`}>
            <span className="dot"></span>
            {link ? 'Enlace activo' : 'Sin enlace'}
          </span>
          <span className={`badge-status ${qrUrl ? 'badge-status--green' : 'badge-status--gray'}`}>
            <span className="dot"></span>
            {qrUrl ? 'QR cargado' : 'Sin QR'}
          </span>
          <span className={`badge-status ${instructions ? 'badge-status--green' : 'badge-status--gray'}`}>
            <span className="dot"></span>
            {instructions ? 'Con instrucciones' : 'Sin instrucciones'}
          </span>
        </div>
      </div>
    </>
  );
}
