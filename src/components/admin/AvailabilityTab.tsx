'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchTourDates, fetchToursForAdmin, type AdminTour, type TourDateFree } from '@/lib/api';
import { getSupabase } from '@/lib/supabase';

const fmtDate = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

export default function AvailabilityTab() {
  const [tours, setTours] = useState<AdminTour[] | null>(null);
  const [tourId, setTourId] = useState('');
  const [dates, setDates] = useState<TourDateFree[] | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newCapacity, setNewCapacity] = useState(8);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCapacity, setEditCapacity] = useState(0);
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');

  const sb = getSupabase();

  useEffect(() => {
    fetchToursForAdmin(sb)
      .then((t) => {
        setTours(t);
        if (t.length) setTourId((prev) => prev || t[0].id);
      })
      .catch(() => setTours([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadDates = useCallback(() => {
    if (!tourId) return;
    fetchTourDates(sb, tourId)
      .then(setDates)
      .catch(() => setDates([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourId]);

  useEffect(loadDates, [loadDates]);

  const addDate = async () => {
    if (!newDate) {
      setError('Elegí una fecha.');
      return;
    }
    setError('');
    setOkMsg('');
    try {
      const { error: e } = await sb.from('tour_dates').insert({ tour_id: tourId, date: newDate, capacity: newCapacity });
      if (e) throw e;
      setNewDate('');
      setOkMsg('Fecha abierta.');
      loadDates();
    } catch (err) {
      setError(err instanceof Error ? (err.message.includes('duplicate') ? 'Esa fecha ya está abierta.' : err.message) : 'No se pudo abrir la fecha.');
    }
  };

  const saveEdit = async (row: TourDateFree) => {
    setError('');
    setOkMsg('');
    try {
      const { error: e } = await sb.from('tour_dates').update({ capacity: editCapacity }).eq('id', row.id);
      if (e) throw e;
      setEditingId(null);
      setOkMsg('Capacidad actualizada.');
      loadDates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar.');
      setEditingId(null);
    }
  };

  const removeDate = async (row: TourDateFree) => {
    if (!window.confirm(`¿Cerrar la fecha ${fmtDate(row.date)}?`)) return;
    setError('');
    try {
      const { error: e } = await sb.from('tour_dates').delete().eq('id', row.id);
      if (e) throw e;
      setOkMsg('Fecha cerrada.');
      loadDates();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message.toLowerCase().includes('active')
            ? 'No se puede cerrar: tiene reservas activas. Cancelá o completá esas reservas primero.'
            : err.message
          : 'No se pudo cerrar la fecha.',
      );
    }
  };

  if (tours === null) return <p style={{ color: 'var(--ink-500)' }}>Cargando…</p>;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <div className="admin-header">
        <div>
          <h1>Disponibilidad</h1>
          <p>Abrí fechas con cupo por tour. Las fechas cerradas no se muestran en el sitio.</p>
        </div>
        <div className="admin-header__actions">
          <select value={tourId} onChange={(e) => setTourId(e.target.value)} style={{ height: 38, border: '1px solid var(--border)', borderRadius: 9, padding: '0 10px', fontSize: '0.9rem', fontFamily: 'inherit' }}>
            {tours.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="admin-card">
        <h3>Abrir una fecha</h3>
        <div className="admin-filters" style={{ marginBottom: 0 }}>
          <input type="date" min={today} value={newDate} onChange={(e) => setNewDate(e.target.value)} style={{ flex: '0 1 220px', minWidth: 160 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--ink-500)' }}>Cupo</label>
            <input
              type="number"
              min={1}
              value={newCapacity}
              onChange={(e) => setNewCapacity(Math.max(1, Number(e.target.value)))}
              style={{ flex: '0 1 100px', minWidth: 80 }}
            />
          </div>
          <button className="btn btn--primary btn--sm" onClick={() => void addDate()}>
            Abrir fecha
          </button>
        </div>
      </div>

      {error && <div className="admin-alert admin-alert--error">{error}</div>}
      {okMsg && <div className="admin-alert admin-alert--ok">{okMsg}</div>}

      <div className="admin-card">
        <h3>Fechas abiertas</h3>
        {dates === null ? (
          <p style={{ color: 'var(--ink-500)' }}>Cargando…</p>
        ) : dates.length === 0 ? (
          <div className="admin-empty">
            <strong>Sin fechas abiertas</strong>
            Este tour todavía no tiene disponibilidad publicada.
          </div>
        ) : (
          dates.map((d) => (
            <div className="avail-row" key={d.id}>
              <span className="avail-row__date">{fmtDate(d.date)}</span>
              <div className={`avail-row__meter${d.free === 0 ? ' is-full' : ''}`}>
                <span style={{ width: `${d.capacity === 0 ? 0 : Math.min(100, (d.occupied / d.capacity) * 100)}%` }}></span>
              </div>
              <span className="avail-row__num">
                {d.occupied}/{d.capacity} ocupados · {d.free === 0 ? 'Agotado' : `${d.free} libres`}
              </span>
              {editingId === d.id ? (
                <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input
                    type="number"
                    min={1}
                    value={editCapacity}
                    onChange={(e) => setEditCapacity(Math.max(1, Number(e.target.value)))}
                    style={{ width: 70, height: 34, border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px' }}
                  />
                  <button className="btn btn--primary btn--sm" onClick={() => void saveEdit(d)}>
                    Guardar
                  </button>
                  <button className="btn btn--ghost btn--sm" onClick={() => setEditingId(null)}>
                    Cancelar
                  </button>
                </span>
              ) : (
                <span style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={() => {
                      setEditingId(d.id);
                      setEditCapacity(d.capacity);
                    }}
                  >
                    Cupo
                  </button>
                  <button className="btn btn--ghost btn--sm" onClick={() => void removeDate(d)}>
                    Cerrar
                  </button>
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}
