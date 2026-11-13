'use client';

import { useEffect, useRef, useState } from 'react';
import type { Booking } from '@/lib/admin/types';
import { ticketCode, ticketState, dateLabel } from '@/lib/admin/format';
import { checkIn, ticketByCode } from '@/lib/admin/bookings';
import { messageOf } from '@/lib/admin/core';
import EmptyState from './EmptyState';
import { Field, Modal, Notice, Pill } from './AdminShared';
interface Detector {
  detect: (source: HTMLVideoElement) => Promise<{
    rawValue: string;
  }[]>;
}
type DetectorConstructor = new (options: {
  formats: string[];
}) => Detector;

export default function TicketScanner({ onClose, onSaved }: {
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const running = useRef(false);
  const lookup = useRef(0);
  const [input, setInput] = useState('');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState('');
  const [cameraNote, setCameraNote] = useState('');
  const [camera, setCamera] = useState(false);
  const [starting, setStarting] = useState(false);
  const [busy, setBusy] = useState(false);
  async function inspect(raw: string) {
    const request = ++lookup.current;
    const code = ticketCode(raw);
    setInput(raw);
    setBooking(null);
    setError('');
    setBusy(false);
    if (!code) {
      setError('Código inválido. Introduce HT-XXXXX o la URL del voucher.');
      return;
    }
    setBusy(true);
    try {
      const found = await ticketByCode(code);
      if (request !== lookup.current)
        return;
      if (!found) {
        setError('Código no encontrado. Revisa el ticket.');
        return;
      }
      setBooking(found);
    } catch (err) {
      if (request === lookup.current)
        setError(messageOf(err));
    } finally {
      if (request === lookup.current)
        setBusy(false);
    }
  }
  useEffect(() => () => {
    lookup.current++;
    running.current = false;
    stream.current?.getTracks().forEach(t => t.stop());
  }, []);
  async function start() {
    if (running.current || busy)
      return;
    const Ctor = (window as unknown as {
      BarcodeDetector?: DetectorConstructor;
    }).BarcodeDetector;
    if (!Ctor) {
      setCameraNote('Este navegador no permite leer QR con BarcodeDetector. Introduce el código del ticket abajo.');
      return;
    }
    try {
      running.current = true;
      setStarting(true);
      setCameraNote('');
      const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
      if (!running.current) {
        media.getTracks().forEach(t => t.stop());
        return;
      }
      stream.current = media;
      setCamera(true);
      if (video.current) {
        video.current.srcObject = media;
        await video.current.play();
      }
      const detector = new Ctor({ formats: ['qr_code'] });
      const read = async () => {
        if (!running.current || !video.current)
          return;
        try {
          const results = await detector.detect(video.current);
          if (!running.current)
            return;
          if (results[0]) {
            void inspect(results[0].rawValue);
            stop();
            return;
          }
        }
        catch {
          if (running.current)
            setCameraNote('No se pudo leer el QR. Acércalo o introduce el código.');
        }
        if (running.current)
          window.setTimeout(() => void read(), 450);
      };
      void read();
    } catch (err) {
      stop();
      setCameraNote(`No se pudo abrir la cámara. ${messageOf(err)} Puedes introducir el código.`);
    } finally {
      setStarting(false);
    }
  }
  function stop() {
    running.current = false;
    stream.current?.getTracks().forEach(t => t.stop());
    stream.current = null;
    setCamera(false);
  }
  async function accept() {
    if (!booking || busy)
      return;
    setBusy(true);
    setError('');
    try {
      const result = await checkIn(booking.code);
      setBooking({ ...booking, checked_in_at: result.checked_in_at });
      await onSaved();
    } catch (err) {
      setError(messageOf(err));
      try {
        setBooking(await ticketByCode(booking.code));
      }
      catch {
        setBooking(null);
      }
    } finally {
      setBusy(false);
    }
  }
  const state = booking ? ticketState(booking) : '';
  return <Modal title="Escanear tickets" onClose={() => {
    if (!busy)
      onClose();
  }}>
    <p className="ops-form-note">La cámara y el check-in usan la fecha de Bolivia. El código también se puede escribir sin cámara.</p>
    {!camera && !starting && !booking && !busy && !error
      && <EmptyState
        compact
        image="scanner"
        title="Listo para validar tickets"
        text="Activa la cámara para leer el QR o introduce el código del voucher."
        action={{ label: 'Activar cámara', onClick: () => void start() }}
      />}
    {starting && <p role="status">Abriendo cámara…</p>}
    <video
      ref={video}
      className="ops-video"
      playsInline
      muted
      hidden={!camera}
    />
    {(camera || booking || busy || error)
      && <div className="ops-toolbar">
        <button
          className="btn btn--ghost"
          disabled={starting || busy}
          onClick={() => camera ? stop() : void start()}
        >
          {camera ? 'Detener cámara' : 'Activar cámara'}
        </button>
      </div>}
    {cameraNote && <p role="status" className="ops-form-note">
      {cameraNote}
    </p>}
    <form onSubmit={e => {
      e.preventDefault();
      void inspect(input);
    }}>
      <Field label="Código o URL del voucher">
        <input
          required
          disabled={busy}
          value={input}
          onChange={e => {
            lookup.current++;
            setInput(e.target.value);
            setBooking(null);
            setError('');
          }}
          placeholder="HT-XXXXX"
        />
      </Field>
      <div className="ops-actions">
        <button className="btn btn--primary" disabled={busy}>
          {busy ? 'Validando...' : 'Validar ticket'}
        </button>
      </div>
    </form>
    <Notice error={error} />
    {booking
      && <section>
        <Pill tone={state === 'Válido' ? 'green' : state === 'Cancelada' ? 'red' : 'amber'}>
          {state}
        </Pill>
        <h3>{booking.code} · {booking.client_name}</h3>
        <p>{booking.tour?.title} · {dateLabel(booking.date_row?.date || '')} · {booking.date_row?.start_time?.slice(0, 5) || 'Sin hora'} · {booking.pax} pax</p>
        <button
          className="btn btn--primary"
          disabled={busy || state !== 'Válido'}
          onClick={() => void accept()}
        >
          {busy ? 'Aceptando…' : 'Aceptar ticket'}
        </button>
      </section>}
  </Modal>;
}
