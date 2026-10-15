'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getSupabase } from '@/lib/supabase';
import { dashboardDate, dashboardMoney, fetchDashboardData, operatorDay, type DashboardData, type DashboardRange } from '@/lib/admin-dashboard';
import AdminIcon from './AdminIcon';
import { BOOKING_STATES, BookingChart, StatusChart } from './DashboardCharts';

function Trend({ current, previous }: { current: number; previous: number }) {
  if (!previous) return <span className="dash-metric__note">{current ? 'Sin base de comparación' : 'Sin cambios frente al período anterior'}</span>;
  const change = Math.round((current - previous) / previous * 100);
  return <span className="dash-metric__note"><b className={change < 0 ? 'is-down' : 'is-up'}>{change > 0 ? '↑' : change < 0 ? '↓' : '—'} {Math.abs(change)}%</b> vs. período anterior</span>;
}

function EmptyState({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="dash-empty"><AdminIcon name="tours" size={30} /><strong>{title}</strong><p>{children}</p></div>;
}

export default function DashboardTab({ range }: { range: DashboardRange }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError('');
    fetchDashboardData(getSupabase(), range, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setData(result); })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) setError(err && typeof err === 'object' && 'message' in err ? String(err.message) : 'No se pudo cargar el dashboard.');
      });
    return () => controller.abort();
  }, [range.from, range.to, revision]);

  const metrics = useMemo(() => {
    if (!data) return null;
    const current = data.activity.filter((booking) => operatorDay(new Date(booking.created_at)) >= range.from);
    const previous = data.activity.filter((booking) => operatorDay(new Date(booking.created_at)) < range.from);
    const previousPaid = previous.filter((booking) => ['confirmada', 'completada'].includes(booking.status));
    const previousRevenue = previousPaid.reduce((sum, booking) => sum + Number(booking.total), 0);
    const discounted = current.filter((booking) => booking.status !== 'cancelada' && Number(booking.group_discount) > 0);
    const occupied = data.overview.occupancy.reduce((sum, departure) => sum + departure.occupied, 0);
    const capacity = data.overview.occupancy.reduce((sum, departure) => sum + departure.capacity, 0);
    return { current, previous, previousPaid, previousRevenue, discounted, occupied, capacity };
  }, [data, range.from]);

  const kpis = data?.overview.kpis;
  const tourMap = new Map(data?.tours.map((tour) => [tour.id, tour]));
  const topTours = data?.overview.top_tours ?? [];
  const departures = data?.overview.occupancy ?? [];
  const stale = data?.overview.stale_pending ?? [];

  return <>
    <div className="admin-header dash-page-heading">
      <div><h1>Dashboard</h1><p>Una mirada a tus reservas, ingresos y próximas aventuras.</p></div>
      <button className="dash-refresh" onClick={() => setRevision((value) => value + 1)} aria-label="Actualizar dashboard" title="Actualizar dashboard" disabled={!data && !error}><AdminIcon name="refresh" size={17} /><span>Actualizar</span></button>
    </div>

    {error && <div className="admin-alert admin-alert--error" role="alert"><strong>No pudimos cargar los datos.</strong><p>{error}</p><button className="btn btn--ghost btn--sm" onClick={() => setRevision((value) => value + 1)}>Reintentar</button></div>}
    {!data && !error && <div role="status" className="dash-loading"><span className="admin-sr-only">Cargando métricas…</span><div className="dash-metrics">{Array.from({ length: 5 }, (_, index) => <div className="dash-metric dash-skeleton" key={index} />)}</div><div className="dash-skeleton dash-loading__chart" /></div>}

    {data && kpis && metrics && <>
      <div className="dash-metrics">
        <article className="dash-metric"><span className="dash-metric__icon dash-metric__icon--sage"><AdminIcon name="users" size={25} /></span><div><h2>Reservas del período</h2><strong>{kpis.reservations_total}</strong><Trend current={kpis.reservations_total} previous={metrics.previous.length} /></div></article>
        <article className="dash-metric"><span className="dash-metric__icon dash-metric__icon--gold"><AdminIcon name="money" size={26} /></span><div><h2>Ingresos confirmados</h2><strong>{dashboardMoney(kpis.confirmed_revenue)}</strong><Trend current={kpis.confirmed_revenue} previous={metrics.previousRevenue} /></div></article>
        <article className="dash-metric"><span className="dash-metric__icon dash-metric__icon--blue"><AdminIcon name="occupancy" size={26} /></span><div><h2>Tasa de ocupación</h2><strong>{metrics.capacity ? `${Math.round(metrics.occupied / metrics.capacity * 100)}%` : '—'}</strong><span className="dash-metric__note">{metrics.capacity ? `${metrics.occupied} de ${metrics.capacity} plazas · próximos 7 días` : 'Sin salidas en los próximos 7 días'}</span></div></article>
        <article className="dash-metric"><span className="dash-metric__icon dash-metric__icon--terracotta"><AdminIcon name="tag" size={26} /></span><div><h2>Valor medio por reserva</h2><strong>{dashboardMoney(kpis.avg_ticket)}</strong><Trend current={kpis.avg_ticket} previous={metrics.previousPaid.length ? metrics.previousRevenue / metrics.previousPaid.length : 0} /></div></article>
        <article className="dash-metric"><span className="dash-metric__icon dash-metric__icon--olive"><AdminIcon name="discount" size={26} /></span><div><h2>Descuentos de grupo</h2><strong>{dashboardMoney(metrics.discounted.reduce((sum, booking) => sum + Number(booking.group_discount), 0))}</strong><span className="dash-metric__note">{metrics.discounted.length} reservas · {metrics.discounted.reduce((sum, booking) => sum + booking.pax, 0)} viajeros</span></div></article>
      </div>

      <div className="dash-grid">
        <section className="dash-card dash-card--timeline"><BookingChart activity={data.activity} range={range} /></section>

        <section className="dash-card dash-card--status"><div className="dash-card__heading"><h2>Estado de las reservas</h2></div><StatusChart bookings={metrics.current} /><Link href="/admin?tab=reservas" className="dash-card__link">Ver todas las reservas <AdminIcon name="arrow" size={16} /></Link></section>

        <section className="dash-card dash-card--tours"><div className="dash-card__heading"><h2>Tours más vendidos</h2><span className="dash-period-chip">Este período</span></div>
          {topTours.length === 0 ? <EmptyState title="La próxima aventura está por llegar">El ranking aparecerá cuando recibas reservas.</EmptyState> : <ol className="dash-ranking">{topTours.map((tour, index) => {
            const share = kpis.reservations_total ? Math.round(tour.reservations / kpis.reservations_total * 100) : 0;
            return <li key={tour.tour_id}><Link href={`/admin?tab=reservas&q=${encodeURIComponent(tour.tour_title)}`}><span className={`dash-ranking__rank dash-ranking__rank--${index + 1}`}>{index + 1}</span><img src={tourMap.get(tour.tour_id)?.image || '/assets/andes-mountains.jpg'} alt="" width="48" height="48" loading="lazy" /><div className="dash-ranking__info"><strong title={tour.tour_title}>{tour.tour_title}</strong><div className="dash-ranking__bar"><span style={{ width: `${share}%` }} /></div><small>{tour.reservations} {tour.reservations === 1 ? 'reserva' : 'reservas'}</small></div><span className="dash-ranking__share">{share}%</span></Link></li>;
          })}</ol>}
        </section>

        <section className="dash-card dash-card--departures"><div className="dash-card__heading"><h2>Próximas salidas</h2><Link href="/admin?tab=disponibilidad">Ver todas</Link></div>
          {departures.length === 0 ? <EmptyState title="Nuevos destinos por descubrir">Abre fechas para tus próximos tours.<Link href="/admin?tab=disponibilidad">Gestionar disponibilidad <AdminIcon name="arrow" size={15} /></Link></EmptyState> : <ul className="dash-departures">{departures.slice(0, 4).map((departure) => {
            const date = new Date(`${departure.date}T12:00:00Z`);
            const tour = tourMap.get(departure.tour_id);
            return <li key={`${departure.tour_id}-${departure.date}`}><Link href={`/admin?tab=disponibilidad&tour=${departure.tour_id}`}><img src={tour?.image || '/assets/andes-mountains.jpg'} alt="" width="46" height="50" loading="lazy" /><time dateTime={departure.date}><span>{date.toLocaleDateString('es-BO', { month: 'short', timeZone: 'America/La_Paz' }).replace('.', '')}</span><strong>{date.getUTCDate()}</strong></time><div><strong>{departure.tour_title}</strong><small>{tour?.destination || 'Bolivia'}</small><span className={`dash-departures__pax${departure.free <= 0 ? ' is-full' : ''}`}>{departure.occupied} / {departure.capacity} viajeros <AdminIcon name="users" size={14} /></span></div></Link></li>;
          })}</ul>}
          <div className="dash-departures__footer"><i />Agenda de los próximos 7 días</div>
        </section>

        <section className="dash-card dash-card--recent"><div className="dash-card__heading"><h2>Reservas recientes</h2><Link href="/admin?tab=reservas">Ver todas <AdminIcon name="arrow" size={14} /></Link></div>
          {metrics.current.length === 0 ? <EmptyState title="Todo listo para tu primera reserva">Las reservas de este período aparecerán aquí.</EmptyState> : <div className="dash-recent-scroll"><table className="dash-recent-table"><thead><tr><th>Código</th><th>Viajero</th><th>Tour</th><th>Pax</th><th>Descuento</th><th>Total (USD)</th><th>Estado</th><th>Fecha</th></tr></thead><tbody>{metrics.current.slice(0, 5).map((booking) => {
            const state = BOOKING_STATES.find((item) => item.id === booking.status)!;
            const discount = Number(booking.group_discount) + Number(booking.coupon_discount);
            return <tr key={booking.id}><td><Link href={`/admin?tab=reservas&booking=${booking.id}`}>{booking.code}</Link></td><td>{booking.profile?.full_name || 'Sin nombre'}</td><td title={booking.tour?.title}>{booking.tour?.title || 'Tour no disponible'}</td><td>{booking.pax}</td><td>{discount ? dashboardMoney(discount) : '—'}</td><td><strong>{dashboardMoney(Number(booking.total))}</strong></td><td><span className={`badge-status badge-status--${state.badge}`}>{state.label === 'Pendientes' ? 'Pendiente de pago' : state.label === 'Confirmadas' ? 'Confirmada' : state.label === 'Completadas' ? 'Completada' : 'Cancelada'}</span></td><td>{new Date(booking.created_at).toLocaleString('es-BO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/La_Paz' })}</td></tr>;
          })}</tbody></table></div>}
        </section>
      </div>

      {stale.length > 0 && <aside className="dash-pending-note"><span className="dash-pending-note__icon"><AdminIcon name="bell" size={20} /></span><div><strong>{stale.length} {stale.length === 1 ? 'reserva necesita' : 'reservas necesitan'} tu atención</strong><span>Pagos pendientes desde hace más de 7 días · {dashboardMoney(stale.reduce((sum, booking) => sum + Number(booking.total), 0))} por cobrar</span></div><Link href="/admin?tab=reservas&status=pendiente_pago">Revisar reservas <AdminIcon name="arrow" size={16} /></Link></aside>}
      <footer className="dash-footer"><span><i />Tu operación, de un vistazo.</span><span>{kpis.clients_new} clientes nuevos · {kpis.clients_total} clientes registrados</span></footer>
    </>}
  </>;
}
