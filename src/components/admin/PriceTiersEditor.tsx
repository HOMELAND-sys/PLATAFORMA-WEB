'use client';

import { TIER_TYPES, type AdminTourForm } from '@/lib/admin/tour-editor';
import type { PriceTier, TourType } from '@/lib/types';
import AdminIcon from './AdminIcon';

interface Props {
  data: AdminTourForm;
  onChange: <K extends keyof AdminTourForm>(key: K, value: AdminTourForm[K]) => void;
}

const MAX_PAX = 8;

/** Texto del tramo: «2 viajeros», «3–4 viajeros», «8 o más». */
function rangeLabel(tiers: PriceTier[], index: number): string {
  const sorted = [...tiers].sort((a, b) => a.min - b.min);
  const tier = sorted[index];
  const next = sorted[index + 1];
  if (!tier || !Number.isInteger(tier.min)) return '';
  if (!next) return tier.min >= MAX_PAX ? `${tier.min} viajeros` : `${tier.min} o más viajeros`;
  const last = next.min - 1;
  return last <= tier.min ? `${tier.min} ${tier.min === 1 ? 'viajero' : 'viajeros'}` : `${tier.min} a ${last} viajeros`;
}

/**
 * Precio por persona según el tamaño del grupo. Sin tramos, la modalidad
 * cobra su precio fijo y aplican los descuentos generales por grupo.
 */
export default function PriceTiersEditor({ data, onChange }: Props) {
  const setTiers = (type: TourType, tiers: PriceTier[]) => {
    const next = { ...data.price_tiers };
    if (tiers.length) next[type] = tiers;
    else delete next[type];
    onChange('price_tiers', next);
  };

  return (
    <section className="tour-editor__section tier-editor">
      <h4>
        Precio por tamaño de grupo <small>Opcional</small>
      </h4>
      <p className="tour-editor__hint">
        Úsalo cuando el precio por persona baja al sumar viajeros (habitual en servicios privados). Si una
        modalidad no tiene tramos, se cobra su precio fijo.
      </p>
      {TIER_TYPES.map(({ type, label, priceKey }) => {
        const base = data[priceKey];
        const tiers = data.price_tiers[type] ?? [];
        if (base === null && tiers.length === 0) return null;
        const usedMins = new Set(tiers.map((tier) => tier.min));
        const nextMin = Array.from({ length: MAX_PAX }, (_, i) => i + 1).find(
          (n) => n >= Math.max(1, data.min_pax || 1) && !usedMins.has(n),
        );
        return (
          <div className="tier-editor__group" key={type}>
            <div className="tier-editor__head">
              <strong>{label}</strong>
              <span>
                {tiers.length === 0
                  ? `Precio fijo${base !== null ? `: US$ ${base}` : ''}`
                  : `${tiers.length} ${tiers.length === 1 ? 'tramo' : 'tramos'}`}
              </span>
            </div>
            {tiers.length > 0 && (
              <div className="tier-editor__rows">
                <div className="tier-editor__row tier-editor__row--head" aria-hidden="true">
                  <span>Desde (viajeros)</span>
                  <span>Precio por persona (USD)</span>
                  <span>Aplica a</span>
                  <span />
                </div>
                {tiers.map((tier, index) => (
                  <div className="tier-editor__row" key={index}>
                    <input
                      type="number"
                      min={1}
                      max={MAX_PAX}
                      step={1}
                      aria-label={`${label}: tramo ${index + 1}, desde cuántos viajeros`}
                      value={Number.isNaN(tier.min) ? '' : tier.min}
                      onChange={(e) =>
                        setTiers(
                          type,
                          tiers.map((t, i) => (i === index ? { ...t, min: e.target.value === '' ? NaN : Number(e.target.value) } : t)),
                        )
                      }
                    />
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      aria-label={`${label}: tramo ${index + 1}, precio por persona`}
                      value={Number.isNaN(tier.price) ? '' : tier.price}
                      onChange={(e) =>
                        setTiers(
                          type,
                          tiers.map((t, i) => (i === index ? { ...t, price: e.target.value === '' ? NaN : Number(e.target.value) } : t)),
                        )
                      }
                    />
                    <span className="tier-editor__range">{rangeLabel(tiers, [...tiers].sort((a, b) => a.min - b.min).indexOf(tier))}</span>
                    <button
                      type="button"
                      className="tier-editor__remove"
                      aria-label={`${label}: quitar tramo ${index + 1}`}
                      onClick={() => setTiers(type, tiers.filter((_, i) => i !== index))}
                    >
                      <AdminIcon name="close" size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              className="tier-editor__add"
              disabled={nextMin === undefined}
              onClick={() =>
                setTiers(type, [
                  ...tiers,
                  { min: nextMin ?? MAX_PAX, price: tiers.length ? tiers[tiers.length - 1].price : (base ?? 0) },
                ])
              }
            >
              <AdminIcon name="plus" size={13} /> Añadir tramo
            </button>
          </div>
        );
      })}
    </section>
  );
}
