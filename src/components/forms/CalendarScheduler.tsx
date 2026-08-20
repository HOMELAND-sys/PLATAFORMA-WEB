'use client';

import { useMemo, useState } from 'react';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const WEEKDAYS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
const TIME_SLOTS = ['9:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];

export default function CalendarScheduler() {
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const cells = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();

    const out: { date: Date; day: number; otherMonth: boolean }[] = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      out.push({ date: new Date(year, month - 1, prevDays - i), day: prevDays - i, otherMonth: true });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      out.push({ date: new Date(year, month, d), day: d, otherMonth: false });
    }
    const remaining = (7 - (out.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      out.push({ date: new Date(year, month + 1, i), day: i, otherMonth: true });
    }
    return out;
  }, [viewDate]);

  const selectDay = (date: Date) => {
    setSelectedDay(date);
    setSelectedTime(null);
  };

  const selectedLabel = selectedDay
    ? `${WEEKDAYS[selectedDay.getDay()]} ${selectedDay.getDate()} ${MONTHS[selectedDay.getMonth()].slice(0, 3)}`
    : 'Seleccioná un día';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 32, alignItems: 'start', marginTop: 12 }}>
      <div className="biz-calendar">
        <div className="biz-cal__head">
          <button
            type="button"
            className="biz-cal__nav"
            aria-label="Mes anterior"
            onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <span className="biz-cal__title">
            {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
          </span>
          <button
            type="button"
            className="biz-cal__nav"
            aria-label="Mes siguiente"
            onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
        <div className="biz-cal__weekdays">
          {WEEKDAYS.map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>
        <div className="biz-cal__days">
          {cells.map((cell, i) => {
            const isPast = cell.date < today;
            const isToday = cell.date.toDateString() === today.toDateString();
            const isSelected = selectedDay?.toDateString() === cell.date.toDateString();
            return (
              <button
                type="button"
                key={i}
                className={`biz-cal__day${cell.otherMonth ? ' is-other-month' : ''}${isToday ? ' is-today' : ''}${isSelected ? ' is-selected' : ''}`}
                disabled={cell.otherMonth || isPast}
                onClick={() => selectDay(cell.date)}
              >
                {cell.day}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p style={{ fontSize: '0.92rem', color: 'var(--ink-700)', margin: '0 0 12px' }}>
          Horarios disponibles ·{' '}
          <span style={{ fontWeight: 600, color: 'var(--ink-900)' }}>{selectedLabel}</span>
          {selectedTime && (
            <span style={{ fontWeight: 600, color: 'var(--green-700)' }}> — {selectedTime} seleccionado</span>
          )}
        </p>
        <div className="biz-times">
          {TIME_SLOTS.map((slot) => (
            <button
              type="button"
              key={slot}
              className={`biz-time${!selectedDay ? ' is-disabled' : ''}${selectedTime === slot ? ' is-selected' : ''}`}
              disabled={!selectedDay}
              onClick={() => setSelectedTime(slot)}
            >
              {slot}
            </button>
          ))}
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--ink-500)', margin: '14px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          Las reuniones duran aprox. 45 min. Confirmaremos por email.
        </p>
        <p style={{ fontSize: '0.8rem', color: 'var(--ink-500)', margin: '6px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
          🕒 America/La Paz (UTC-4)
        </p>
      </div>
    </div>
  );
}
