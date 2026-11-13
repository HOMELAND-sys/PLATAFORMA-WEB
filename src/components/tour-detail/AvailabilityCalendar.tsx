'use client';

import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/ui/Icon';

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  /** Mayor cupo libre entre las salidas de ese día. */
  free: number;
}

interface Props {
  days: CalendarDay[];
  pax: number;
  value: string;
  onChange: (date: string) => void;
}

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const pad = (n: number) => String(n).padStart(2, '0');
const ym = (iso: string) => iso.slice(0, 7);

/** Calendario mensual con las fechas realmente abiertas a la venta. */
export default function AvailabilityCalendar({ days, pax, value, onChange }: Props) {
  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);
  const months = useMemo(() => [...new Set(days.map((d) => ym(d.date)))].sort(), [days]);
  const firstMonth = months[0] ?? '';
  const lastMonth = months[months.length - 1] ?? '';
  const [month, setMonth] = useState(value ? ym(value) : firstMonth);

  useEffect(() => {
    if (value) setMonth(ym(value));
    else if (firstMonth && (!month || month < firstMonth)) setMonth(firstMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, firstMonth]);

  const cells = useMemo(() => {
    if (!month) return [];
    const [y, m] = month.split('-').map(Number);
    const first = new Date(Date.UTC(y, m - 1, 1));
    const lead = (first.getUTCDay() + 6) % 7; // lunes = 0
    const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const out: (string | null)[] = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= count; d += 1) out.push(`${y}-${pad(m)}-${pad(d)}`);
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [month]);

  const shift = (delta: number) => {
    const [y, m] = month.split('-').map(Number);
    const next = new Date(Date.UTC(y, m - 1 + delta, 1));
    setMonth(`${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}`);
  };

  if (!month) return null;
  const [y, m] = month.split('-').map(Number);

  return (
    <div className="td-cal">
      <div className="td-cal__head">
        <button
          type="button"
          className="td-cal__nav"
          onClick={() => shift(-1)}
          disabled={month <= firstMonth}
          aria-label="Mes anterior"
        >
          <Icon name="chevron-left" size={18} />
        </button>
        <strong aria-live="polite">
          {MONTHS[m - 1]} {y}
        </strong>
        <button
          type="button"
          className="td-cal__nav"
          onClick={() => shift(1)}
          disabled={month >= lastMonth}
          aria-label="Mes siguiente"
        >
          <Icon name="chevron-right" size={18} />
        </button>
      </div>
      <div className="td-cal__grid td-cal__grid--head" aria-hidden="true">
        {WEEKDAYS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="td-cal__grid" role="grid" aria-label={`Fechas disponibles en ${MONTHS[m - 1]} de ${y}`}>
        {cells.map((iso, i) => {
          if (!iso) return <span key={`e${i}`} className="td-cal__cell td-cal__cell--empty" />;
          const info = byDate.get(iso);
          const day = Number(iso.slice(8));
          if (!info) {
            return (
              <span key={iso} className="td-cal__cell td-cal__cell--off" aria-disabled="true">
                {day}
              </span>
            );
          }
          const enough = info.free >= pax;
          const few = enough && info.free <= 4;
          return (
            <button
              key={iso}
              type="button"
              role="gridcell"
              className={`td-cal__cell td-cal__cell--on${value === iso ? ' is-selected' : ''}${
                enough ? '' : ' is-short'
              }${few ? ' is-few' : ''}`}
              disabled={!enough}
              aria-pressed={value === iso}
              aria-label={`${day} de ${MONTHS[m - 1]}: ${
                enough ? `${info.free} ${info.free === 1 ? 'lugar libre' : 'lugares libres'}` : 'cupo insuficiente'
              }`}
              title={enough ? `${info.free} ${info.free === 1 ? 'lugar libre' : 'lugares libres'}` : 'Cupo insuficiente para tu grupo'}
              onClick={() => onChange(iso)}
            >
              {day}
            </button>
          );
        })}
      </div>
      <div className="td-cal__legend">
        <span>
          <i className="td-cal__dot td-cal__dot--on" /> Disponible
        </span>
        <span>
          <i className="td-cal__dot td-cal__dot--few" /> Últimos lugares
        </span>
      </div>
    </div>
  );
}
