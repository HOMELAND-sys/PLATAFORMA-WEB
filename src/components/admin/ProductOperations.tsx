'use client';

import type { AdminTourForm } from '@/lib/admin/tour-editor';
import { Field } from './AdminShared';
interface Props {
  data: AdminTourForm;
  onChange: <K extends keyof AdminTourForm>(key: K, value: AdminTourForm[K]) => void;
}

export default function ProductOperations({ data, onChange: set }: Props) {
  return <>
    <section className="tour-editor__section">
      <h4>Precios</h4>
      <div className="tour-editor__field-grid">
        {(['price_group', 'price_semi', 'price_private', 'price_child'] as const).map((key, index) => <Field key={key} label={['Grupo (USD)', 'Semiprivado (USD)', 'Privado (USD)', 'Niño (USD)'][index]}>
          <input
            type="number"
            min={0}
            max={99999999.99}
            step="0.01"
            value={data[key] ?? ''}
            placeholder="No disponible"
            onChange={e => set(key, e.target.value === '' ? null : Number(e.target.value))}
          />
        </Field>)}
      </div>
      <p className="tour-editor__hint">Precio base 0: consultar. Tarifas vacías: modalidad no disponible.</p>
    </section>
    <section className="tour-editor__section">
      <h4>Participantes</h4>
      <div className="tour-editor__field-grid">
        <Field label="Mínimo de participantes">
          <input
            required
            type="number"
            min={1}
            max={8}
            step={1}
            value={Number.isNaN(data.min_pax) ? '' : data.min_pax}
            onChange={e => set('min_pax', e.target.value === '' ? NaN : Number(e.target.value))}
          />
        </Field>
        <Field label="Edad máxima del niño">
          <input
            required
            type="number"
            min={0}
            max={17}
            step={1}
            value={Number.isNaN(data.child_age_max) ? '' : data.child_age_max}
            onChange={e => set('child_age_max', e.target.value === '' ? NaN : Number(e.target.value))}
          />
        </Field>
      </div>
    </section>
    <section className="tour-editor__section">
      <h4>Horarios y hora límite</h4>
      <div className="tour-editor__field-grid">
        <Field label="Horas por defecto (HH:MM)">
          <input
            value={data.default_start_times.join(',')}
            onChange={e => set('default_start_times', e.target.value.split(','))}
            placeholder="08:00,14:30"
          />
        </Field>
        <Field label="Límite de reserva (horas)">
          <input
            required
            type="number"
            min={0}
            max={8760}
            step={1}
            value={Number.isNaN(data.default_cutoff_hours) ? '' : data.default_cutoff_hours}
            onChange={e => set('default_cutoff_hours', e.target.value === '' ? NaN : Number(e.target.value))}
          />
        </Field>
      </div>
    </section>
    <section className="tour-editor__section">
      <h4>Políticas</h4>
      <div className="tour-editor__field-grid">
        <Field label="Cancelación gratis (horas)">
          <input
            required
            type="number"
            min={0}
            max={8760}
            step={1}
            value={Number.isNaN(data.free_cancellation_hours) ? '' : data.free_cancellation_hours}
            onChange={e => set('free_cancellation_hours', e.target.value === '' ? NaN : Number(e.target.value))}
          />
        </Field>
        <Field label="Idiomas (separados por comas)">
          <input value={data.languages.join(',')} onChange={e => set('languages', e.target.value.split(','))} />
        </Field>
      </div>
      <div className="ops-toolbar">
        <label className="ops-check"><input
          type="checkbox"
          checked={data.pay_later}
          onChange={e => set('pay_later', e.target.checked)}
        />Pago posterior</label>
        <label className="ops-check"><input
          type="checkbox"
          checked={data.pickup_included}
          onChange={e => set('pickup_included', e.target.checked)}
        />Recogida incluida</label>
      </div>
    </section>
    <section className="tour-editor__section">
      <h4>Punto de encuentro</h4>
      <Field label="Dirección e indicaciones">
        <textarea
          rows={3}
          value={data.meeting_point}
          onChange={e => set('meeting_point', e.target.value)}
        />
      </Field>
      <div className="tour-editor__field-grid">
        <Field label="Latitud">
          <input
            type="number"
            min={-90}
            max={90}
            step="0.000001"
            value={data.meeting_lat ?? ''}
            onChange={e => set('meeting_lat', e.target.value === '' ? null : Number(e.target.value))}
          />
        </Field>
        <Field label="Longitud">
          <input
            type="number"
            min={-180}
            max={180}
            step="0.000001"
            value={data.meeting_lng ?? ''}
            onChange={e => set('meeting_lng', e.target.value === '' ? null : Number(e.target.value))}
          />
        </Field>
      </div>
    </section>
  </>;
}
