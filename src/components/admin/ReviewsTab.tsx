'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { messageOf, products } from '@/lib/admin/core';
import { useAdminData } from '@/lib/admin/hooks';
import {
  REVIEW_SOURCE_LABEL,
  createReview,
  deleteReview,
  reviews,
  setReviewReply,
  setReviewStatus,
  validateReview,
  type AdminReview,
  type ReviewInput,
  type ReviewSource,
  type ReviewStatus,
} from '@/lib/admin/reviews';
import AdminIcon from './AdminIcon';
import { useConfirm } from './ConfirmDialog';
import { Field, LoadState, Metrics, Modal, Notice, Pill } from './AdminShared';
import ProductOptions from './ProductOptions';

const STATUS_TABS: { key: ReviewStatus; label: string; empty: string }[] = [
  { key: 'pending', label: 'Por revisar', empty: 'No hay reseñas esperando revisión.' },
  { key: 'published', label: 'Publicadas', empty: 'Todavía no publicaste ninguna reseña.' },
  { key: 'hidden', label: 'Ocultas', empty: 'No hay reseñas ocultas.' },
];

const STATUS_TONE: Record<ReviewStatus, 'amber' | 'green' | 'gray'> = {
  pending: 'amber',
  published: 'green',
  hidden: 'gray',
};
const STATUS_LABEL: Record<ReviewStatus, string> = { pending: 'Por revisar', published: 'Publicada', hidden: 'Oculta' };

const EMPTY_INPUT: ReviewInput = {
  tour_id: null,
  author_name: '',
  author_country: '',
  rating: 5,
  title: '',
  body: '',
  source: 'google',
  travel_date: null,
  status: 'published',
};

const day = (iso: string | null) =>
  iso ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

function StarsRow({ value }: { value: number }) {
  return (
    <span className="rvw-stars" role="img" aria-label={`${value} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= value ? 'is-on' : ''}>
          <AdminIcon name="star-solid" size={15} />
        </span>
      ))}
    </span>
  );
}

export default function ReviewsTab() {
  const confirm = useConfirm();
  const list = useAdminData(reviews);
  const catalog = useAdminData(products);
  const [tab, setTab] = useState<ReviewStatus>('pending');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [replyId, setReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [adding, setAdding] = useState(false);
  const [input, setInput] = useState<ReviewInput>(EMPTY_INPUT);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const all = useMemo(() => list.data ?? [], [list.data]);
  const byStatus = useMemo(() => {
    const out: Record<ReviewStatus, AdminReview[]> = { pending: [], published: [], hidden: [] };
    for (const r of all) out[r.status]?.push(r);
    return out;
  }, [all]);
  const verified = byStatus.published.filter((r) => r.source !== 'manual');
  const average = verified.length ? verified.reduce((sum, r) => sum + r.rating, 0) / verified.length : null;
  const rows = byStatus[tab];
  const active = STATUS_TABS.find((t) => t.key === tab) ?? STATUS_TABS[0];

  async function run(id: string, action: () => Promise<void>, done: string) {
    setBusyId(id);
    setError('');
    setOk('');
    try {
      await action();
      setOk(done);
      await list.reload();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setBusyId(null);
    }
  }

  async function remove(r: AdminReview) {
    await confirm({
      title: 'Eliminar reseña',
      message: `¿Eliminar la reseña de ${r.author_name}? Esta acción no se puede deshacer. Si solo quieres quitarla del sitio, ocúltala.`,
      confirmLabel: 'Eliminar reseña',
      destructive: true,
      onConfirm: () => run(r.id, () => deleteReview(r.id), 'Reseña eliminada.'),
    });
  }

  async function saveReply(r: AdminReview) {
    await run(r.id, () => setReviewReply(r.id, replyText), replyText.trim() ? 'Respuesta guardada.' : 'Respuesta eliminada.');
    setReplyId(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const problem = validateReview(input);
    if (problem) {
      setFormError(problem);
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await createReview(input);
      setAdding(false);
      setInput(EMPTY_INPUT);
      setOk('Reseña añadida.');
      setTab(input.status);
      await list.reload();
    } catch (err) {
      setFormError(messageOf(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="admin-header">
        <div>
          <h1>Reseñas</h1>
          <p>Revisa lo que opinan tus viajeros, decide qué se publica en el sitio y responde.</p>
        </div>
        <button className="btn btn--primary" onClick={() => { setFormError(''); setAdding(true); }}>
          <AdminIcon name="plus" size={16} /> Añadir reseña
        </button>
      </div>

      <Metrics
        items={[
          { label: 'Por revisar', value: byStatus.pending.length },
          { label: 'Publicadas', value: byStatus.published.length },
          {
            label: 'Valoración verificada',
            value: average === null ? 'Sin datos' : `${average.toLocaleString('es-BO', { maximumFractionDigits: 1 })} / 5`,
          },
        ]}
      />
      <p className="ops-form-note">
        La valoración que ve el público usa solo reseñas verificadas (reservas del sitio, Google o Tripadvisor).
        Las cargadas a mano se muestran como testimonios, sin nota.
      </p>

      <div className="ops-tabs" aria-label="Estado de las reseñas">
        {STATUS_TABS.map((t) => (
          <button key={t.key} className={tab === t.key ? 'is-active' : ''} onClick={() => setTab(t.key)}>
            {t.label} ({byStatus[t.key].length})
          </button>
        ))}
      </div>

      <Notice error={error} success={ok} />
      <LoadState
        loading={list.loading}
        error={list.error}
        empty={!rows.length}
        onRetry={() => void list.reload()}
        label={active.empty}
        emptyTitle="Nada por aquí"
      />

      {!list.loading && !list.error && rows.length > 0 && (
        <div className="rvw-list">
          {rows.map((r) => (
            <article className="admin-card rvw-card" key={r.id}>
              <header className="rvw-card__head">
                <div>
                  <strong>{r.author_name}</strong>
                  {r.author_country && <span className="rvw-card__country"> · {r.author_country}</span>}
                  <div className="rvw-card__meta">
                    <StarsRow value={r.rating} />
                    <span>{r.tour ? r.tour.title : 'Testimonio general'}</span>
                    {r.travel_date && <span>Viajó el {day(r.travel_date)}</span>}
                    {r.reservation?.code && <span>Reserva {r.reservation.code}</span>}
                  </div>
                </div>
                <div className="rvw-card__pills">
                  <Pill tone={r.source === 'manual' ? 'gray' : 'green'}>{REVIEW_SOURCE_LABEL[r.source]}</Pill>
                  <Pill tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Pill>
                </div>
              </header>
              {r.title && <h3 className="rvw-card__title">{r.title}</h3>}
              <p className="rvw-card__body">{r.body}</p>
              <small className="rvw-card__date">Recibida el {day(r.created_at)}</small>

              {r.admin_reply && replyId !== r.id && (
                <blockquote className="rvw-card__reply">
                  <strong>Respuesta de Homeland Tours</strong>
                  {r.admin_reply}
                </blockquote>
              )}
              {replyId === r.id && (
                <div className="rvw-card__replybox">
                  <Field label="Respuesta pública" wide>
                    <textarea
                      rows={3}
                      maxLength={1000}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Agradece la opinión y responde con datos concretos."
                    />
                  </Field>
                  <div className="ops-actions">
                    <button className="btn btn--ghost btn--sm" onClick={() => setReplyId(null)}>
                      Cancelar
                    </button>
                    <button className="btn btn--primary btn--sm" disabled={busyId === r.id} onClick={() => void saveReply(r)}>
                      Guardar respuesta
                    </button>
                  </div>
                </div>
              )}

              <footer className="rvw-card__actions">
                {r.status !== 'published' && (
                  <button
                    className="btn btn--primary btn--sm"
                    disabled={busyId === r.id}
                    onClick={() => void run(r.id, () => setReviewStatus(r.id, 'published'), 'Reseña publicada en el sitio.')}
                  >
                    Publicar
                  </button>
                )}
                {r.status !== 'hidden' && (
                  <button
                    className="btn btn--ghost btn--sm"
                    disabled={busyId === r.id}
                    onClick={() => void run(r.id, () => setReviewStatus(r.id, 'hidden'), 'Reseña oculta: ya no se ve en el sitio.')}
                  >
                    Ocultar
                  </button>
                )}
                {replyId !== r.id && (
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={() => {
                      setReplyId(r.id);
                      setReplyText(r.admin_reply ?? '');
                    }}
                  >
                    {r.admin_reply ? 'Editar respuesta' : 'Responder'}
                  </button>
                )}
                <button className="btn btn--ghost btn--sm rvw-card__delete" disabled={busyId === r.id} onClick={() => void remove(r)}>
                  Eliminar
                </button>
              </footer>
            </article>
          ))}
        </div>
      )}

      {adding && (
        <Modal title="Añadir reseña" onClose={() => setAdding(false)}>
          <form onSubmit={submit}>
            <Notice error={formError} />
            <p className="ops-form-note">
              Para traer una opinión real de Google o Tripadvisor, o un testimonio que te enviaron por otro canal.
              Copia el texto tal cual lo escribió la persona.
            </p>
            <fieldset disabled={saving} className="ops-fieldset">
              <div className="ops-grid">
                <Field label="Origen">
                  <select value={input.source} onChange={(e) => setInput((old) => ({ ...old, source: e.target.value as ReviewSource }))}>
                    <option value="google">Google</option>
                    <option value="tripadvisor">Tripadvisor</option>
                    <option value="manual">Testimonio directo (sin nota pública)</option>
                  </select>
                </Field>
                <Field label="Tour">
                  <select value={input.tour_id ?? ''} onChange={(e) => setInput((old) => ({ ...old, tour_id: e.target.value || null }))}>
                    <option value="">General (toda la operadora)</option>
                    {catalog.data && <ProductOptions products={catalog.data} />}
                  </select>
                </Field>
                <Field label="Nombre de quien opina">
                  <input required maxLength={80} value={input.author_name} onChange={(e) => setInput((old) => ({ ...old, author_name: e.target.value }))} />
                </Field>
                <Field label="País (opcional)">
                  <input maxLength={60} value={input.author_country} onChange={(e) => setInput((old) => ({ ...old, author_country: e.target.value }))} />
                </Field>
                <Field label="Valoración">
                  <select value={input.rating} onChange={(e) => setInput((old) => ({ ...old, rating: Number(e.target.value) }))}>
                    {[5, 4, 3, 2, 1].map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? 'estrella' : 'estrellas'}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Fecha del viaje (opcional)">
                  <input type="date" value={input.travel_date ?? ''} onChange={(e) => setInput((old) => ({ ...old, travel_date: e.target.value || null }))} />
                </Field>
                <Field label="Título (opcional)" wide>
                  <input maxLength={120} value={input.title} onChange={(e) => setInput((old) => ({ ...old, title: e.target.value }))} />
                </Field>
                <Field label="Texto de la reseña" wide>
                  <textarea required rows={5} maxLength={2000} value={input.body} onChange={(e) => setInput((old) => ({ ...old, body: e.target.value }))} />
                </Field>
              </div>
              <label className="ops-check">
                <input
                  type="checkbox"
                  checked={input.status === 'published'}
                  onChange={(e) => setInput((old) => ({ ...old, status: e.target.checked ? 'published' : 'pending' }))}
                />
                Publicar en el sitio al guardar
              </label>
              <div className="ops-actions">
                <button type="button" className="btn btn--ghost" onClick={() => setAdding(false)}>
                  Cancelar
                </button>
                <button className="btn btn--primary" disabled={saving}>
                  {saving ? 'Guardando…' : 'Guardar reseña'}
                </button>
              </div>
            </fieldset>
          </form>
        </Modal>
      )}
    </>
  );
}
