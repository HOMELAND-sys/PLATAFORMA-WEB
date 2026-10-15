'use client';

import { useId, useMemo, useState } from 'react';
import { dashboardDate, daysInRange, operatorDay, shiftDay, type DashboardBooking, type DashboardRange } from '@/lib/admin-dashboard';

export const BOOKING_STATES = [
  { id: 'pendiente_pago', label: 'Pendientes', color: '#dfa53e', badge: 'amber' },
  { id: 'confirmada', label: 'Confirmadas', color: '#6b7954', badge: 'green' },
  { id: 'completada', label: 'Completadas', color: '#7b9aaa', badge: 'blue' },
  { id: 'cancelada', label: 'Canceladas', color: '#d8795b', badge: 'red' },
] as const;

interface SeriesPoint { label: string; current: number; previous: number }

export function BookingChart({ activity, range }: { activity: DashboardBooking[]; range: DashboardRange }) {
  const [grouping, setGrouping] = useState('auto');
  const [hovered, setHovered] = useState<number | null>(null);
  const id = useId();
  const totalDays = daysInRange(range);
  const step = grouping === 'weekly' || (grouping === 'auto' && totalDays > 31) ? 7 : 1;
  const points = useMemo(() => {
    const result: SeriesPoint[] = Array.from({ length: Math.ceil(totalDays / step) }, (_, index) => ({ label: shiftDay(range.from, index * step), current: 0, previous: 0 }));
    const previousFrom = shiftDay(range.from, -totalDays);
    for (const booking of activity) {
      const day = operatorDay(new Date(booking.created_at));
      const current = day >= range.from;
      const index = Math.floor((Date.parse(day) - Date.parse(current ? range.from : previousFrom)) / 86400000 / step);
      if (result[index]) result[index][current ? 'current' : 'previous'] += 1;
    }
    return result;
  }, [activity, range.from, totalDays, step]);
  const maxValue = Math.max(4, ...points.flatMap((point) => [point.current, point.previous]));
  const ceiling = Math.ceil(maxValue / 4) * 4;
  const left = 34, right = 472, top = 18, bottom = 222;
  const x = (index: number) => points.length === 1 ? (left + right) / 2 : left + index / (points.length - 1) * (right - left);
  const y = (value: number) => bottom - value / ceiling * (bottom - top);
  const line = (key: 'current' | 'previous') => points.map((point, index) => {
    if (!index) return `M ${x(index)} ${y(point[key])}`;
    const middle = (x(index - 1) + x(index)) / 2;
    return `C ${middle} ${y(points[index - 1][key])} ${middle} ${y(point[key])} ${x(index)} ${y(point[key])}`;
  }).join(' ');
  const selected = hovered === null ? null : points[hovered];
  const selectedX = hovered === null ? 0 : x(hovered);
  const tooltipX = Math.max(left, Math.min(right - 146, selectedX - 73));
  const tooltipY = selected ? Math.max(4, y(selected.current) - 78) : 0;
  const hasBookings = points.some((point) => point.current || point.previous);

  return <>
    <div className="dash-card__heading"><h2>Reservas en el tiempo</h2><select className="dash-select" aria-label="Agrupar gráfico de reservas" value={grouping} onChange={(event) => { setGrouping(event.target.value); setHovered(null); }}><option value="auto">{totalDays > 31 ? 'Semanal' : 'Diario'}</option><option value="daily">Por día</option><option value="weekly">Por semana</option></select></div>
    <div className="dash-chart-legend"><span><i />Este período</span><span><i />Período anterior</span></div>
    <div className="dash-line-chart">
      <svg viewBox="0 0 490 258" role="img" aria-labelledby={`${id}-title`} onMouseLeave={() => setHovered(null)}>
        <title id={`${id}-title`}>Reservas {step === 7 ? 'por semana' : 'por día'} del {dashboardDate(range.from)} al {dashboardDate(range.to)}, comparadas con los {totalDays} días anteriores.</title>
        <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#859268" stopOpacity=".23" /><stop offset="100%" stopColor="#b6ba99" stopOpacity=".025" /></linearGradient></defs>
        {Array.from({ length: 5 }, (_, index) => <g key={index}><line x1={left} x2={right} y1={y(index * ceiling / 4)} y2={y(index * ceiling / 4)} stroke="#efeee9" /><text x="23" y={y(index * ceiling / 4) + 3} textAnchor="end">{index * ceiling / 4}</text></g>)}
        <path d={`${line('current')} L ${x(points.length - 1)} ${bottom} L ${x(0)} ${bottom} Z`} fill={`url(#${id})`} />
        <path d={line('previous')} fill="none" stroke="#c9c8bf" strokeWidth="1.6" strokeDasharray="3 5" />
        <path d={line('current')} fill="none" stroke="#68794f" strokeWidth="2" />
        {points.map((point, index) => <g key={point.label}>
          {(index === 0 || index === points.length - 1 || index % Math.max(1, Math.ceil(points.length / 6)) === 0) && <text x={x(index)} y="248" textAnchor="middle">{dashboardDate(point.label)}</text>}
          <circle cx={x(index)} cy={y(point.current)} r={points.length > 60 ? 1.8 : 3.1} fill="#68794f" />
          <circle cx={x(index)} cy={y(point.current)} r="9" fill="transparent" tabIndex={0} role="img" aria-label={`${dashboardDate(point.label)}: ${point.current} reservas; período anterior: ${point.previous}`} onFocus={() => setHovered(index)} onBlur={() => setHovered(null)} onMouseEnter={() => setHovered(index)} />
        </g>)}
        {selected && <g className="dash-chart-tooltip" pointerEvents="none"><line x1={selectedX} x2={selectedX} y1={top} y2={bottom} stroke="#6b7954" strokeOpacity=".2" strokeDasharray="3 4" /><rect x={tooltipX} y={tooltipY} width="146" height="66" rx="9" fill="white" stroke="#e9e7df" /><text x={tooltipX + 12} y={tooltipY + 18}>{dashboardDate(selected.label)}</text><text x={tooltipX + 12} y={tooltipY + 36}>Reservas: {selected.current}</text><text x={tooltipX + 12} y={tooltipY + 52}>Anterior: {selected.previous}</text><circle cx={selectedX} cy={y(selected.current)} r="5" fill="#68794f" stroke="white" strokeWidth="2" /></g>}
      </svg>
      {!hasBookings && <span className="dash-chart-empty">Aún no hay reservas en este período</span>}
    </div>
  </>;
}

export function StatusChart({ bookings }: { bookings: DashboardBooking[] }) {
  const states = BOOKING_STATES.map((state) => ({ ...state, count: bookings.filter((booking) => booking.status === state.id).length }));
  const total = bookings.length;
  const circumference = 2 * Math.PI * 66;
  let offset = 0;
  return <div className="dash-status-chart">
    <svg viewBox="0 0 180 180" role="img" aria-label={`${total} reservas: ${states.map((state) => `${state.count} ${state.label.toLowerCase()}`).join(', ')}`}>
      <circle cx="90" cy="90" r="66" fill="none" stroke="#f2f0e9" strokeWidth="27" />
      {states.map((state) => {
        const length = total ? state.count / total * circumference : 0;
        const start = offset;
        offset += length;
        return <circle key={state.id} cx="90" cy="90" r="66" fill="none" stroke={state.color} strokeWidth="27" strokeDasharray={`${Math.max(0, length - 2)} ${circumference}`} strokeDashoffset={-start} transform="rotate(-90 90 90)"><title>{state.label}: {state.count}</title></circle>;
      })}
      <text x="90" y="75" textAnchor="middle" className="dash-donut-label">Total</text><text x="90" y="103" textAnchor="middle" className="dash-donut-total">{total}</text><text x="90" y="121" textAnchor="middle" className="dash-donut-label">reservas</text>
    </svg>
    <ul>{states.map((state) => <li key={state.id}><i style={{ background: state.color }} /><div><span>{state.label}</span><small>{state.count} <span>({total ? Math.round(state.count / total * 100) : 0}%)</span></small></div></li>)}</ul>
  </div>;
}
