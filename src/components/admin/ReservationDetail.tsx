'use client';

import { useMemo, useState } from 'react';
import type { Booking } from '@/lib/admin/types';
import type { ConfirmOptions } from '@/lib/admin/confirmation';
import { auditFor, bookingPatch, bookingStatus, checkIn } from '@/lib/admin/bookings';
import { openVoucher } from '@/lib/admin/exports';
import { useAdminData } from '@/lib/admin/hooks';
import { messageOf } from '@/lib/admin/core';
import { bob, dateLabel, methodLabels, participantSummary, sourceLabels, statusLabels, ticketState, timeLabel, usd, } from '@/lib/admin/format';
import { EXCHANGE_RATE_BOB } from '@/lib/pricing';
import { Field, LoadState, Modal, Notice, Pill } from './AdminShared';
import { useConfirm } from './ConfirmDialog';
interface Props {
  booking: Booking;
  onClose: () => void;
  onSaved: () => Promise<void>;
  description?: boolean;
}

export default function ReservationDetail({ booking: b, onClose, onSaved, description = false }: Props) {
  const confirm = useConfirm();
  const audit = useAdminData(() => auditFor(b.id), [b.id]);
  const [reason, setReason] = useState('');
  const [cancel, setCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [showDescription, setShowDescription] = useState(description);
  const timeline = useMemo(() => {
    const events: {
      label: string;
      time: string;
    }[] = [{ label: 'Reserva creada', time: b.created_at }];
    const milestones = [

      ['Pago confirmado', b.paid_at],

      ['Voucher enviado (registro manual)', b.voucher_sent_at],

      ['Check-in aceptado', b.checked_in_at],

      ['Cancelación', b.cancelled_at],

      ['Viaje completado', b.completed_at],

    ];
    for (const [label, time] of milestones) {
      if (time)
        events.push({ label: label!, time });
    }
    for (const item of audit.data ?? []) {
      if (item.action === 'INSERT' || item.action === 'status_change')
        continue;
      const before = item.before ?? {};
      const after = item.after ?? {};
      const labels: string[] = [];
      if (before.status !== after.status) {
        labels.push(`Estado: ${statusLabels[String(before.status)] || before.status} → ${statusLabels[String(after.status)] || after.status}`);
      }
      if (before.refund_pending === true && after.refund_pending === false)
        labels.push('Reembolso registrado como realizado');
      if (before.internal_notes !== after.internal_notes)
        labels.push('Notas internas actualizadas');
      if (labels.length)
        events.push({ label: labels.join(' · '), time: item.created_at });
    }
    return events.sort((a, c) => a.time.localeCompare(c.time));
  }, [b, audit.data]);
  async function act(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    setError('');
    setOk('');
    try {
      await action();
      setOk(message);
      await onSaved();
      await audit.reload();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }
  async function confirmAction(options: ConfirmOptions, action: () => Promise<unknown>, message: string) {
    await confirm({ ...options, onConfirm: () => act(action, message) });
  }
  const adjustment = Number(b.total) - (Number(b.subtotal) - Number(b.group_discount) - Number(b.coupon_discount) - Number(b.offer_discount ?? 0));
  const phone = b.client_phone.replace(/\D/g, '');
  const whatsapp = phone.length >= 7
    ? `https://wa.me/${phone}?text=${encodeURIComponent(`Hola ${b.client_name}, te contactamos de Homeland Tours sobre tu reserva ${b.code}.`)}`
    : '';
  const prices = [

    ['Subtotal', usd(b.subtotal)],

    ['Oferta especial', usd(-Number(b.offer_discount ?? 0))],

    ['Descuento de grupo', usd(-b.group_discount)],

    ...(Number(b.coupon_discount) > 0 ? [[`Cupón ${b.coupon_code || ''}`.trim(), usd(-b.coupon_discount)]] : []),

    ...(Math.abs(adjustment) > .001 ? [['Ajuste manual', usd(adjustment)]] : []),

    ['Total', usd(b.total)],

    ['Equivalente BOB', bob(Math.round(Number(b.total) * EXCHANGE_RATE_BOB))],

    ['Pago', `${b.paid_at ? 'Pagado' : 'Pendiente'} · ${methodLabels[b.payment_method]}`],

  ];
  return (<Modal
    title={`Reserva ${b.code}`}
    onClose={() => {
      if (!busy)
        onClose();
    }}
    wide
  >
    <Notice error={error} success={ok} />
    <div className="ops-toolbar">
      <Pill tone={b.status === 'cancelada' ? 'red' : b.status === 'pendiente_pago' ? 'amber' : 'green'}>
        {statusLabels[b.status]}
      </Pill>
      <span className="ops-muted">Canal: {sourceLabels[b.source]}</span>
    </div>
    <div className="ops-detail">
      <section>
        <h3>Viajero</h3>
        <p>
          <strong>
            {b.client_name}
          </strong>
        </p>
        <p className="ops-wrap">
          {b.client_email || 'Sin email'}
        </p>
        <p>{b.client_phone || 'Sin teléfono'} · {b.client_country || 'Sin país'}</p>
        {whatsapp
          && (<a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--ghost btn--sm"
          >
            Contactar por WhatsApp
          </a>)}
      </section>
      <section>
        <h3>Servicio</h3>
        <p>
          <strong>
            {b.tour?.title}
          </strong>
        </p>
        <p>{dateLabel(b.date_row?.date || '')} · {b.date_row?.start_time?.slice(0, 5) || 'Sin hora'} (Bolivia)</p>
        <p>{b.tour_type === 'group' ? 'Compartido' : b.tour_type === 'semi' ? 'Semiprivado' : 'Privado'} · {b.pax} pax</p>
        <p>
          {participantSummary(b.adults ?? b.pax, b.children)}
        </p>
        <button className="btn btn--ghost btn--sm" onClick={() => setShowDescription(!showDescription)}>
          Descripción del servicio
        </button>
      </section>
    </div>
    {showDescription
      && (<section className="admin-card">
        <h3>Descripción</h3>
        {b.tour?.summary?.length
          ? b.tour.summary.map((text, index) => <p key={index}>
            {text}
          </p>)
          : <p>Sin descripción registrada.</p>}
        <strong>Incluye</strong>
        <ul>
          {b.tour?.included?.map((text, index) => <li key={index}>
            {text}
          </li>)}
        </ul>
        <p>
          {b.tour?.meeting_point || 'Punto de encuentro por coordinar.'}
        </p>
      </section>)}
    <section>
      <h3>Pasajeros</h3>
      {b.passengers.length ? b.passengers.map(passenger => (<div className="drawer-row" key={passenger.id}>
        <small>{passenger.position}. {passenger.is_lead ? 'Titular' : 'Pasajero'}</small>
        <div className="ops-passenger ops-wrap">
          <strong>
            {passenger.name}
          </strong>
          <span className="cell-sub">
            {passenger.doc || 'Sin documento'} · {passenger.country} · {passenger.meal}
          </span>
        </div>
      </div>)) : <p className="ops-muted">No hay pasajeros registrados.</p>}
    </section>
    <section>
      <h3>Precio y pago</h3>
      {prices.map(([label, value]) => (<div className="drawer-row" key={label}>
        <small>
          {label}
        </small>
        <strong>
          {value}
        </strong>
      </div>))}
      <p className="ops-muted">Cambio de referencia del sitio: 1 USD = {EXCHANGE_RATE_BOB} BOB.</p>
      {b.extras.length > 0 && <p className="ops-muted">Extras: {b.extras.map(extra => extra.name).join(', ')}</p>}
    </section>
    {b.internal_notes && <section>
      <h3>Notas internas</h3>
      <p className="ops-wrap">
        {b.internal_notes}
      </p>
    </section>}
    {b.cancellation_reason && <p className="admin-alert admin-alert--error">Motivo de cancelación: {b.cancellation_reason}</p>}
    <section>
      <h3>Línea de tiempo</h3>
      <ol className="ops-timeline">
        {timeline.map((item, index) => <li key={index}>
          {item.label}
          <small>
            {timeLabel(item.time)}
          </small>
        </li>)}
      </ol>
      <LoadState
        loading={audit.loading}
        error={audit.error}
        empty={false}
        onRetry={() => void audit.reload()}
      />
    </section>
    <section>
      <h3>Acciones</h3>
      <div className="ops-actions">
        {b.status === 'pendiente_pago'
          && (<button
            className="btn btn--primary btn--sm"
            disabled={busy}
            onClick={() => void confirmAction({
              title: 'Confirmar pago recibido',
              message: `¿Recibiste ${usd(b.total)} por ${methodLabels[b.payment_method]} para la reserva ${b.code}?`,
              confirmLabel: 'Confirmar pago',
            }, () => bookingStatus(b.id, 'confirmada'), 'Pago confirmado.')}
          >
            Confirmar pago manualmente
          </button>)}
        <button
          className="btn btn--ghost btn--sm"
          disabled={busy}
          onClick={() => void act(() => openVoucher(b), 'Voucher descargado. Puedes adjuntarlo al contactar al viajero.')}
        >
          Abrir / descargar voucher
        </button>
        {b.status !== 'cancelada'
          && (<button
            className="btn btn--ghost btn--sm"
            disabled={busy}
            onClick={() => void confirmAction({
              title: 'Registrar envío de voucher',
              message: 'Confirma que ya entregaste o reenviaste el voucher al viajero. Esta acción registra el envío realizado.',
              confirmLabel: 'Registrar envío',
            }, () => bookingPatch(b.id, { voucher_sent_at: new Date().toISOString() }), 'Envío registrado.')}
          >
            Registrar envío de voucher
          </button>)}
        {ticketState(b) === 'Válido'
          && (<button
            className="btn btn--primary btn--sm"
            disabled={busy}
            onClick={() => void act(() => checkIn(b.code), 'Check-in aceptado.')}
          >
            Marcar check-in
          </button>)}
        {b.status === 'confirmada'
          && (<button
            className="btn btn--ghost btn--sm"
            disabled={busy}
            onClick={() => void confirmAction({
              title: 'Completar viaje',
              message: `¿El viaje de la reserva ${b.code} ya se realizó?`,
              confirmLabel: 'Marcar completada',
            }, () => bookingStatus(b.id, 'completada'), 'Viaje completado.')}
          >
            Marcar completada
          </button>)}
        {['pendiente_pago', 'confirmada'].includes(b.status)
          && (<button
            className="btn btn--ghost btn--sm"
            disabled={busy}
            onClick={() => setCancel(!cancel)}
          >
            Cancelar / reembolso
          </button>)}
        {b.refund_pending
          && (<button
            className="btn btn--ghost btn--sm"
            disabled={busy}
            onClick={() => void confirmAction({
              title: 'Registrar reembolso realizado',
              message: 'Confirma que ya devolviste el dinero por fuera del sistema. Se marcará el reembolso como realizado.',
              confirmLabel: 'Registrar reembolso',
            }, () => bookingPatch(b.id, { refund_pending: false }), 'Reembolso registrado como realizado.')}
          >
            Registrar reembolso realizado
          </button>)}
      </div>
      {b.refund_pending && <p className="admin-alert admin-alert--error">Reembolso pendiente: la devolución del dinero se realiza manualmente.</p>}
      {cancel
        && (<form onSubmit={event => {
          event.preventDefault();
          void confirmAction({

            title: 'Cancelar reserva',

            message: `¿Cancelar ${b.code}? Se liberará el cupo.${b.status === 'confirmada' ? ' El reembolso quedará pendiente hasta registrar la devolución.' : ''}`,

            confirmLabel: 'Cancelar reserva',

            destructive: true,

          }, async () => {
            await bookingStatus(b.id, 'cancelada', reason.trim());
            setCancel(false);
          }, 'Reserva cancelada.');
        }}>
          <Field label="Motivo de cancelación obligatorio">
            <textarea
              required
              value={reason}
              onChange={event => setReason(event.target.value)}
            />
          </Field>
          <div className="ops-actions">
            <button className="btn btn--primary" disabled={busy || !reason.trim()}>Confirmar cancelación</button>
          </div>
        </form>)}
      <p className="ops-form-note">Para reenviar, descarga el PDF y adjúntalo por WhatsApp o email. Registra el envío después de entregarlo.</p>
    </section>
  </Modal>);
}
