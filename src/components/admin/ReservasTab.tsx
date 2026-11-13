'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { bookings } from '@/lib/admin/bookings';
import { useAdminData } from '@/lib/admin/hooks';
import { messageOf, products } from '@/lib/admin/core';
import { downloadCsv, exportTable, openVoucher } from '@/lib/admin/exports';
import { dateLabel, flag, initials, methodLabels, operatorDay, shiftDay, sourceLabels, statusLabels, usd, validDay } from '@/lib/admin/format';
import { Field, LoadState, Metrics, Notice, Pill } from './AdminShared';
import ManualBookingForm from './ManualBookingForm';
import ReservationDetail from './ReservationDetail';
import TicketScanner from './TicketScanner';
import ProductOptions from './ProductOptions';

export default function ReservasTab() {
  const params = useSearchParams();
  const list = useAdminData(bookings);
  const catalog = useAdminData(products);
  const [search, setSearch] = useState(params.get('q') || '');
  const [status, setStatus] = useState(params.get('status') || '');
  const [tour, setTour] = useState('');
  const [from, setFrom] = useState(validDay(params.get('travel')) || '');
  const [to, setTo] = useState(validDay(params.get('travel')) || '');
  const [dateMode, setDateMode] = useState('travel');
  const [payment, setPayment] = useState('');
  const [voucher, setVoucher] = useState('');
  const [source, setSource] = useState('');
  const [sort, setSort] = useState('purchase');
  const [selected, setSelected] = useState<string | null>(params.get('booking'));
  const [description, setDescription] = useState(false);
  const [manual, setManual] = useState(false);
  const [scanner, setScanner] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setSearch(params.get('q') || '');
    setStatus(params.get('status') || '');
    setSelected(params.get('booking'));
    const travel = validDay(params.get('travel'));
    if (travel) {
      setFrom(travel);
      setTo(travel);
      setDateMode('travel');
    }
  }, [params]);
  useEffect(() => setPage(1), [search, status, tour, from, to, dateMode, payment, voucher, source, sort]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (list.data ?? []).filter(b => {
      const day = dateMode === 'travel' ? b.date_row?.date || '' : operatorDay(new Date(b.created_at));
      return (params.get('alert') !== 'stale' || b.status === 'pendiente_pago' && Date.parse(b.created_at) < Date.now() - 86400000)
        && (!q || `${b.code} ${b.client_name} ${b.client_email} ${b.client_phone} ${b.client_country} ${b.passengers.map(p => p.name).join(' ')} ${b.tour?.title}`.toLowerCase().includes(q))
        && (!status || b.status === status)
        && (!tour || b.tour_id === tour)
        && (!from || day >= from)
        && (!to || day <= to)
        && (!source || b.source === source)
        && (!payment || (payment === 'paid' ? Boolean(b.paid_at) : payment === 'pending' ? !b.paid_at && b.status !== 'cancelada' : b.refund_pending))
        && (!voucher || (voucher === 'sent' ? Boolean(b.voucher_sent_at) : !b.voucher_sent_at));
    }).sort((a, b) => sort === 'travel' ? `${a.date_row?.date} ${a.date_row?.start_time || ''}`.localeCompare(`${b.date_row?.date} ${b.date_row?.start_time || ''}`) : b.created_at.localeCompare(a.created_at));
  }, [list.data, search, status, tour, from, to, dateMode, payment, voucher, source, sort, params]);
  const tourOptions = catalog.data ?? [];
  const pages = Math.max(1, Math.ceil(filtered.length / 20));
  const currentPage = Math.min(page, pages);
  const current = filtered.slice((currentPage - 1) * 20, currentPage * 20);
  const selectedBooking = list.data?.find(b => b.id === selected);
  async function voucherFor(id: string) {
    const b = list.data?.find(x => x.id === id);
    if (!b)
      return;
    setBusy(true);
    setError('');
    try {
      await openVoucher(b);
      setOk(`Voucher ${b.code} descargado.`);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusy(false);
    }
  }
  function exportRows(format: 'csv' | 'pdf') {
    setError('');
    try {
      const head = [
        'Código',
        'Viajero',
        'Email',
        'Teléfono',
        'País',
        'Tour',
        'Viaje',
        'Hora Bolivia',
        'Pax',
        'Adultos',
        'Niños',
        'Total USD',
        'Estado',
        'Pago',
        'Método',
        'Canal',
        'Voucher',
        'Compra'
      ];
      const rows = filtered.map(b => [
        b.code,
        b.client_name,
        b.client_email,
        b.client_phone,
        b.client_country,
        b.tour?.title || '',
        b.date_row?.date || '',
        b.date_row?.start_time?.slice(0, 5) || 'Sin hora',
        b.pax,
        b.adults ?? b.pax,
        b.children,
        Number(b.total),
        statusLabels[b.status],
        b.paid_at ? 'Pagado' : 'Pendiente',
        methodLabels[b.payment_method],
        sourceLabels[b.source],
        b.voucher_sent_at ? 'Enviado' : 'Sin enviar',
        b.created_at
      ]);
      const totals = [
        'TOTAL ACTIVAS',
        `${filtered.length} reservas`,
        '',
        '',
        '',
        '',
        '',
        '',
        filtered.filter(b => b.status !== 'cancelada').reduce((s, b) => s + b.pax, 0),
        filtered.filter(b => b.status !== 'cancelada').reduce((s, b) => s + (b.adults ?? b.pax), 0),
        filtered.filter(b => b.status !== 'cancelada').reduce((s, b) => s + b.children, 0),
        filtered.filter(b => b.status !== 'cancelada').reduce((s, b) => s + Number(b.total), 0),
        '',
        '',
        '',
        '',
        '',
        ''
      ];
      const notes = `Rango ${dateMode === 'travel' ? 'de viaje' : 'de compra'}: ${from || 'sin inicio'} a ${to || 'sin fin'} · ${statusLabels[status] || 'Todos los estados'} · ${sourceLabels[source] || 'Todos los canales'} · búsqueda: ${search || 'ninguna'} · pago: ${payment || 'todos'} · voucher: ${voucher || 'todos'} · producto: ${tourOptions.find(product => product.id === tour)?.title || 'todos'}`;
      if (format === 'csv')
        downloadCsv(`reservas-${operatorDay()}.csv`, [[notes], head, ...rows, totals]);
      else
        exportTable('Reservas', head, [...rows, totals], `reservas-${operatorDay()}.pdf`, notes);
      setOk(`${filtered.length} reservas exportadas con los filtros actuales.`);
    } catch (err) {
      setError(messageOf(err));
    }
  }
  function shortcut(offset: number) {
    const d = shiftDay(operatorDay(), offset);
    setFrom(d);
    setTo(d);
    setDateMode('travel');
  }
  return <>
    <div className="admin-header">
      <div>
        <h1>Reservas</h1>
        <p>{filtered.length} reservas · {usd(filtered.filter(b => b.status !== 'cancelada').reduce((s, b) => s + Number(b.total), 0))} en activas</p>
      </div>
      <div className="admin-header__actions">
        <button
          className="btn btn--ghost"
          disabled={!list.data || busy}
          onClick={() => setScanner(true)}
        >Escanear tickets</button>
        <button className="btn btn--primary" onClick={() => setManual(true)}>Añadir reserva manual</button>
      </div>
    </div>
    {list.data
      && <Metrics items={[
        { label: 'Nuevas hoy', value: list.data.filter(b => operatorDay(new Date(b.created_at)) === operatorDay()).length },
        { label: 'Pagos pendientes', value: list.data.filter(b => b.status === 'pendiente_pago').length },
        { label: 'Viajes confirmados', value: list.data.filter(b => b.status === 'confirmada').length },
        { label: 'Vouchers enviados', value: list.data.filter(b => b.voucher_sent_at).length }
      ]} />}
    <div className="admin-card">
      <div className="ops-grid">
        <Field label="Buscar código, viajero o tour" wide>
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="HT-XXXXX, nombre o email"
          />
        </Field>
        <Field label="Tour">
          <select
            value={tour}
            disabled={catalog.loading || Boolean(catalog.error)}
            onChange={e => setTour(e.target.value)}
          >
            <option value="">Todos los tours</option>
            <ProductOptions products={tourOptions} />
          </select>
        </Field>
        <Field label="Estado de reserva">
          <select value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">Todos los estados</option>
            {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>
              {v}
            </option>)}
          </select>
        </Field>
        <Field label="Filtrar fechas de">
          <select value={dateMode} onChange={e => setDateMode(e.target.value)}>
            <option value="travel">Viaje</option>
            <option value="purchase">Compra</option>
          </select>
        </Field>
        <Field label="Desde">
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={e => setFrom(e.target.value)}
          />
        </Field>
        <Field label="Hasta">
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={e => setTo(e.target.value)}
          />
        </Field>
        <Field label="Estado de pago">
          <select value={payment} onChange={e => setPayment(e.target.value)}>
            <option value="">Todos los pagos</option>
            <option value="pending">Pendiente</option>
            <option value="paid">Pagado</option>
            <option value="refund">Reembolso pendiente</option>
          </select>
        </Field>
        <Field label="Estado de voucher">
          <select value={voucher} onChange={e => setVoucher(e.target.value)}>
            <option value="">Todos</option>
            <option value="sent">Enviado</option>
            <option value="unsent">Sin enviar</option>
          </select>
        </Field>
        <Field label="Canal">
          <select value={source} onChange={e => setSource(e.target.value)}>
            <option value="">Todos los canales</option>
            {Object.entries(sourceLabels).map(([k, v]) => <option key={k} value={k}>
              {v}
            </option>)}
          </select>
        </Field>
        <Field label="Orden">
          <select value={sort} onChange={e => setSort(e.target.value)}>
            <option value="purchase">Fecha de compra (recientes primero)</option>
            <option value="travel">Fecha y hora de viaje (ascendente)</option>
          </select>
        </Field>
      </div>
      <div className="ops-toolbar">
        <button className="btn btn--ghost btn--sm" onClick={() => shortcut(0)}>Hoy</button>
        <button className="btn btn--ghost btn--sm" onClick={() => shortcut(1)}>Mañana</button>
        <button className="btn btn--ghost btn--sm" onClick={() => {
          setFrom('');
          setTo('');
          setSearch('');
          setTour('');
          setStatus('');
          setPayment('');
          setVoucher('');
          setSource('');
        }}>Limpiar filtros</button>
        <button className="btn btn--ghost btn--sm" onClick={() => void list.reload()}>Actualizar</button>
        <button
          className="btn btn--ghost btn--sm"
          disabled={!filtered.length || list.loading || Boolean(list.error)}
          onClick={() => exportRows('csv')}
        >Descargar reservas CSV</button>
        <button
          className="btn btn--ghost btn--sm"
          disabled={!filtered.length || list.loading || Boolean(list.error)}
          onClick={() => exportRows('pdf')}
        >Descargar PDF</button>
      </div>
    </div>
    <LoadState
      loading={catalog.loading}
      error={catalog.error}
      empty={false}
      onRetry={() => void catalog.reload()}
    />
    <Notice error={error} success={ok} />
    <LoadState
      emptyImage="bookings"
      emptyAction={{ label: 'Añadir reserva manual', onClick: () => setManual(true) }}
      loading={list.loading}
      error={list.error}
      empty={!filtered.length}
      onRetry={() => void list.reload()}
      label="Las reservas web y de oficina aparecerán aquí."
    />
    {!list.loading && !list.error
      && current.map(b => <article key={b.id} className="ops-booking">
        <div>
          <button className="btn btn--ghost btn--sm ops-booking__code" onClick={() => {
            setSelected(b.id);
            setDescription(false);
          }}>
            {b.code}
          </button>
          <div className="admin-entity">
            <span className="admin-avatar">
              {initials(b.client_name)}
            </span>
            <span className="admin-entity__meta">
              <strong>
                {b.client_name}
              </strong>
              <span className="cell-sub">
                {b.client_email || 'Sin email'}
              </span>
              <span className="cell-sub">{b.client_phone || 'Sin teléfono'}</span>
              <span className="cell-sub">{flag(b.client_country)} {b.client_country || 'Sin país'}</span>
            </span>
          </div>
        </div>
        <div>
          <strong>
            {b.tour?.title}
          </strong>
          <p>{dateLabel(b.date_row?.date || '')} · {b.date_row?.start_time?.slice(0, 5) || 'Sin hora'} (Bolivia)</p>
          <p>{b.pax} pax · {sourceLabels[b.source]}</p>
          <Pill tone={b.status === 'cancelada' ? 'red' : b.status === 'pendiente_pago' ? 'amber' : 'green'}>
            {statusLabels[b.status]}
          </Pill>
        </div>
        <div>
          <strong className="ops-booking__price">
            {usd(b.total)}
          </strong>
          <p>
            <Pill tone={b.paid_at ? 'green' : 'amber'}>
              {b.paid_at ? 'Pagado' : 'Pago pendiente'}
            </Pill>
          </p>
          <p>
            {methodLabels[b.payment_method]}
          </p>
          <small className="ops-muted">
            {b.voucher_sent_at ? 'Voucher enviado' : 'Voucher sin enviar'}
            {b.checked_in_at ? ' · Check-in realizado' : ''}
          </small>
        </div>
        <div className="ops-booking__actions">
          <button
            className="btn btn--ghost btn--sm"
            disabled={busy}
            onClick={() => void voucherFor(b.id)}
          >Voucher</button>
          <button className="btn btn--ghost btn--sm" onClick={() => {
            setSelected(b.id);
            setDescription(true);
          }}>Descripción</button>
          <button className="btn btn--primary btn--sm" onClick={() => {
            setSelected(b.id);
            setDescription(false);
          }}>Ver reserva</button>
        </div>
      </article>)}
    {filtered.length > 20
      && <div className="ops-pagination">
        <button
          className="btn btn--ghost btn--sm"
          disabled={currentPage === 1}
          onClick={() => setPage(currentPage - 1)}
        >Anterior</button>
        <span>{currentPage} de {pages} · {filtered.length} reservas</span>
        <button
          className="btn btn--ghost btn--sm"
          disabled={currentPage === pages}
          onClick={() => setPage(currentPage + 1)}
        >Siguiente</button>
      </div>}
    {selectedBooking
      && <ReservationDetail
        key={selectedBooking.id}
        booking={selectedBooking}
        description={description}
        onClose={() => setSelected(null)}
        onSaved={list.reload}
      />}
    {manual
      && <ManualBookingForm onClose={() => setManual(false)} onSaved={id => {
        setManual(false);
        setSelected(id);
        setOk('Reserva manual creada.');
        void list.reload();
      }} />}
    {scanner && list.data && <TicketScanner onClose={() => setScanner(false)} onSaved={list.reload} />}
  </>;
}
