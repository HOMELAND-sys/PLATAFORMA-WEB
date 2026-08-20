'use client';

import type { Difficulty } from '@/lib/types';

export interface FilterState {
  category?: string;
  mode: 'shared' | 'private';
  duration: string;
  difficulties: Difficulty[];
  maxPrice: number;
}

interface FilterPanelProps {
  open: boolean;
  filters: FilterState;
  onChange: (f: FilterState) => void;
  onClose: () => void;
}

export default function FilterPanel({ open, filters, onChange, onClose }: FilterPanelProps) {
  const toggleDifficulty = (d: Difficulty) => {
    const has = filters.difficulties.includes(d);
    onChange({
      ...filters,
      difficulties: has ? filters.difficulties.filter((x) => x !== d) : [...filters.difficulties, d],
    });
  };

  return (
    <aside className={`filter-panel${open ? ' is-open' : ''}`}>
      <button className="filter-panel__close" onClick={onClose}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
      <h3>Filtros</h3>

      <div className="filter-group">
        <h4>Modalidad</h4>
        <label className="radio-pills" style={{ display: 'flex' }}>
          <span className="radio-pill">
            <input
              type="radio"
              name="mode"
              value="shared"
              checked={filters.mode === 'shared'}
              onChange={() => onChange({ ...filters, mode: 'shared' })}
            />{' '}
            Tour compartido
          </span>
          <span className="radio-pill">
            <input
              type="radio"
              name="mode"
              value="private"
              checked={filters.mode === 'private'}
              onChange={() => onChange({ ...filters, mode: 'private' })}
            />{' '}
            Tour privado
          </span>
        </label>
      </div>

      <div className="filter-group">
        <h4>Duración</h4>
        <select
          className="select"
          value={filters.duration}
          onChange={(e) => onChange({ ...filters, duration: e.target.value })}
        >
          <option value="any">Cualquier duración</option>
          <option value="half-day">Medio día</option>
          <option value="1-day">1 día</option>
          <option value="2-3-days">2-3 días</option>
          <option value="4-plus">4+ días</option>
        </select>
      </div>

      <div className="filter-group">
        <h4>Dificultad</h4>
        <label className="filter-check">
          <input
            type="checkbox"
            checked={filters.difficulties.includes('Easy')}
            onChange={() => toggleDifficulty('Easy')}
          />{' '}
          Fácil
        </label>
        <label className="filter-check">
          <input
            type="checkbox"
            checked={filters.difficulties.includes('Moderate')}
            onChange={() => toggleDifficulty('Moderate')}
          />{' '}
          Moderado
        </label>
        <label className="filter-check">
          <input
            type="checkbox"
            checked={filters.difficulties.includes('Challenging')}
            onChange={() => toggleDifficulty('Challenging')}
          />{' '}
          Desafiante
        </label>
      </div>

      <div className="filter-group">
        <h4>Presupuesto (USD)</h4>
        <input
          type="range"
          min="50"
          max="1000"
          value={filters.maxPrice}
          onChange={(e) => onChange({ ...filters, maxPrice: Number(e.target.value) })}
          className="range-slider"
        />
        <div className="flex-between" style={{ fontSize: '0.85rem', color: 'var(--ink-500)' }}>
          <span>$50</span>
          <span>Hasta ${filters.maxPrice}</span>
        </div>
      </div>

      <button className="btn btn--primary btn--block" onClick={onClose}>
        Aplicar filtros
      </button>
    </aside>
  );
}
