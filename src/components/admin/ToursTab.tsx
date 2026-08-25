'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  buildTourPayload,
  fetchCategories,
  fetchToursForAdmin,
  uploadToBucket,
  type AdminTour,
  type CategoryRow,
  type TourFormData,
} from '@/lib/api';
import { getSupabase } from '@/lib/supabase';
import type { Difficulty, ItineraryDay, TourExtra, TourInfo } from '@/lib/types';

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const toLines = (arr: string[]) => (arr ?? []).join('\n');
const fromLines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);

const emptyForm = (): TourFormData => ({
  slug: '',
  title: '',
  image: '',
  gallery: [],
  badge: '',
  badge_variant: null,
  primary_category_slug: '',
  category_slugs: [],
  duration: '',
  difficulty: 'Easy',
  activity_label: '',
  type_label: '',
  destination: '',
  start_end: '',
  best_season: '',
  max_altitude: '',
  price_group: 0,
  price_semi: null,
  price_private: null,
  summary: [],
  highlights: [],
  itinerary: [],
  included: [],
  not_included: [],
  what_to_bring: [],
  info: { cancellation: '', health: '', transport: '', meeting: '' },
  extras: [],
  featured: false,
  active: true,
});

export default function ToursTab() {
  const [tours, setTours] = useState<AdminTour[] | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [editing, setEditing] = useState<AdminTour | 'new' | null>(null);
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');

  const load = useCallback(() => {
    Promise.all([fetchToursForAdmin(getSupabase()), fetchCategories(getSupabase())])
      .then(([t, c]) => {
        setTours(t);
        setCategories(c);
      })
      .catch(() => setTours([]));
  }, []);

  useEffect(load, [load]);

  const toggleActive = async (t: AdminTour) => {
    const { error: e } = await getSupabase().from('tours').update({ active: !t.active }).eq('id', t.id);
    if (e) setError(e.message);
    else setOkMsg(t.active ? `“${t.title}” desactivado: no se muestra en el sitio.` : `“${t.title}” activado.`);
    load();
  };

  const remove = async (t: AdminTour) => {
    const sb = getSupabase();
    if (t.reservation_count > 0) {
      if (!window.confirm(`“${t.title}” tiene ${t.reservation_count} reserva(s). No se puede eliminar: se desactiva (queda oculto del sitio pero conserva sus reservas).`)) return;
      const { error: e } = await sb.from('tours').update({ active: false }).eq('id', t.id);
      if (e) setError(e.message);
      else setOkMsg(`“${t.title}” desactivado por tener reservas.`);
      load();
      return;
    }
    if (!window.confirm(`¿Eliminar definitivamente “${t.title}”? Sin reservas asociadas, se borra del catálogo.`)) return;
    const { error: e } = await sb.from('tours').delete().eq('id', t.id);
    if (e) setError(e.message);
    else setOkMsg(`“${t.title}” eliminado.`);
    load();
  };

  if (tours === null) return <p style={{ color: 'var(--ink-500)' }}>Cargando tours…</p>;

  return (
    <>
      <div className="admin-header">
        <div>
          <h1>Tours</h1>
          <p>{tours.length} tours · {tours.filter((t) => t.active).length} activos</p>
        </div>
        <div className="admin-header__actions">
          <button className="btn btn--primary btn--sm" onClick={() => setEditing('new')}>
            + Nuevo tour
          </button>
        </div>
      </div>

      {error && <div className="admin-alert admin-alert--error">{error}</div>}
      {okMsg && <div className="admin-alert admin-alert--ok">{okMsg}</div>}

      <div className="admin-tour-grid">
        {tours.map((t) => (
          <div key={t.id} className={`admin-tour-card${t.active ? '' : ' is-inactive'}`}>
            <div className="admin-tour-card__img" style={{ backgroundImage: `url('${t.image}')` }}></div>
            <div className="admin-tour-card__body">
              <h4>{t.title}</h4>
              <div className="admin-tour-card__meta">
                {t.duration} · {t.destination} · {t.reservation_count} reserva(s)
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span className={`badge-status ${t.active ? 'badge-status--green' : 'badge-status--gray'}`}>
                  {t.active ? 'Activo' : 'Inactivo'}
                </span>
                {t.featured && <span className="badge-status badge-status--amber">Destacado</span>}
              </div>
              <div className="admin-tour-card__actions">
                <button className="btn btn--primary btn--sm" onClick={() => setEditing(t)}>
                  Editar
                </button>
                <button className="btn btn--ghost btn--sm" onClick={() => void toggleActive(t)}>
                  {t.active ? 'Desactivar' : 'Activar'}
                </button>
                <button className="btn btn--ghost btn--sm" onClick={() => void remove(t)}>
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <TourEditor
          tour={editing === 'new' ? null : editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </>
  );
}

function TourEditor({
  tour,
  categories,
  onClose,
  onSaved,
}: {
  tour: AdminTour | null;
  categories: CategoryRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [data, setData] = useState<TourFormData>(() =>
    tour
      ? {
          ...tour,
          badge: tour.badge ?? '',
          badge_variant: tour.badge_variant,
          price_group: tour.price_group,
          price_semi: tour.price_semi,
          price_private: tour.price_private,
          primary_category_slug: tour.primary_category_slug,
          category_slugs: tour.category_slugs,
        }
      : emptyForm(),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = <K extends keyof TourFormData>(key: K, value: TourFormData[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const updateItinerary = (i: number, key: keyof ItineraryDay, value: ItineraryDay[typeof key]) =>
    setData((d) => ({
      ...d,
      itinerary: d.itinerary.map((day, j) => (j === i ? ({ ...day, [key]: value } as ItineraryDay) : day)),
    }));

  const updateBring = (i: number, key: 'emoji' | 'title' | 'detail', value: string) =>
    setData((d) => ({
      ...d,
      what_to_bring: d.what_to_bring.map((it, j) => (j === i ? { ...it, [key]: value } : it)),
    }));

  const updateExtra = (i: number, key: keyof TourExtra, value: TourExtra[typeof key]) =>
    setData((d) => ({ ...d, extras: d.extras.map((x, j) => (j === i ? { ...x, [key]: value } : x)) }));

  const setInfo = (key: keyof TourInfo, value: string) =>
    setData((d) => ({ ...d, info: { ...d.info, [key]: value } }));

  const slugLocked = Boolean(tour && tour.reservation_count > 0);

  const uploadImage = async (file: File, target: 'main' | 'gallery') => {
    const sb = getSupabase();
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const path = `${slugify(data.slug) || 'tour'}/${Date.now()}-${safe}`;
    const url = await uploadToBucket(sb, 'tours', path, file);
    if (target === 'main') set('image', url);
    else set('gallery', [...data.gallery, url]);
  };

  const save = async () => {
    if (!data.title.trim()) {
      setError('El título es obligatorio.');
      return;
    }
    if (!data.slug.trim()) {
      setError('El slug (URL) es obligatorio.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const sb = getSupabase();
      const payload = buildTourPayload(
        {
          ...data,
          slug: data.slug.trim(),
          extras: data.extras.map((e) => ({ ...e, id: e.id || slugify(e.name) || `extra-${Math.random().toString(36).slice(2, 7)}` })),
          itinerary: data.itinerary.map((d, i) => ({ ...d, day: i + 1 })),
        },
        categories,
      );
      let err: Error | null = null;
      if (tour) {
        const { error: e } = await sb.from('tours').update(payload).eq('id', tour.id);
        err = e ? new Error(e.message) : null;
      } else {
        const { error: e } = await sb.from('tours').insert(payload);
        err = e ? new Error(e.message) : null;
      }
      if (err) throw err;
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="admin-scrim" onClick={onClose}></div>
      <div className="admin-drawer" style={{ width: 'min(720px, 100vw)' }} role="dialog" aria-label="Editor de tour">
        <div className="admin-drawer__head">
          <h3>{tour ? 'Editar tour' : 'Nuevo tour'}</h3>
          <button className="admin-side__logout" onClick={onClose} title="Cerrar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="admin-drawer__body">
          {error && <div className="admin-alert admin-alert--error">{error}</div>}

          <div className="admin-form">
            <div className="af-field">
              <label>Título</label>
              <input value={data.title} onChange={(e) => set('title', e.target.value)} placeholder="Salar de Uyuni 3-Day Adventure" />
            </div>

            <div className="admin-form__row">
              <div className="af-field">
                <label>
                  Slug (URL) {slugLocked && <small>— bloqueado: tiene reservas</small>}
                </label>
                <input
                  value={data.slug}
                  disabled={slugLocked}
                  onChange={(e) => set('slug', slugify(e.target.value))}
                  placeholder="salar-de-uyuni"
                />
              </div>
              <div className="af-field">
                <label>Badge <small>(opcional)</small></label>
                <input value={data.badge} onChange={(e) => set('badge', e.target.value)} placeholder="Bestseller" />
              </div>
            </div>

            <div className="admin-form__row">
              <div className="af-field">
                <label>Categoría principal</label>
                <select
                  value={data.primary_category_slug}
                  onChange={(e) => set('primary_category_slug', e.target.value)}
                >
                  <option value="">—</option>
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="af-field">
                <label>Variante de badge</label>
                <select
                  value={data.badge_variant ?? ''}
                  onChange={(e) => set('badge_variant', (e.target.value || null) as TourFormData['badge_variant'])}
                >
                  <option value="">—</option>
                  <option value="popular">popular</option>
                  <option value="adventure">adventure</option>
                  <option value="cultural">cultural</option>
                </select>
              </div>
            </div>

            <div className="af-field">
              <label>Categorías (filtros del listado)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {categories.map((c) => {
                  const on = data.category_slugs.includes(c.slug);
                  return (
                    <label key={c.slug} className="af-toggle" style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 999 }}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() =>
                          set(
                            'category_slugs',
                            on
                              ? data.category_slugs.filter((s) => s !== c.slug)
                              : [...data.category_slugs, c.slug],
                          )
                        }
                      />
                      {c.label}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="af-field">
              <label>Imagen principal</label>
              <div className="af-upload">
                {data.image && <img className="af-upload__preview" src={data.image} alt="" />}
                <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadImage(f, 'main').catch((err) => setError(err.message)); }} />
              </div>
            </div>

            <div className="af-field">
              <label>Galería</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {data.gallery.map((g, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img className="af-upload__preview" src={g} alt="" />
                    <button
                      type="button"
                      onClick={() => set('gallery', data.gallery.filter((_, j) => j !== i))}
                      style={{
                        position: 'absolute', top: -6, right: -6, width: 22, height: 22,
                        borderRadius: '50%', border: 0, background: 'var(--danger)', color: '#fff', cursor: 'pointer',
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (files.length) void Promise.all(files.map((f) => uploadImage(f, 'gallery'))).catch((err) => setError(err.message));
                  }}
                />
              </div>
            </div>

            <div className="admin-form__row">
              <div className="af-field">
                <label>Duración</label>
                <input value={data.duration} onChange={(e) => set('duration', e.target.value)} placeholder="3 Days · 2 Nights" />
              </div>
              <div className="af-field">
                <label>Dificultad</label>
                <select value={data.difficulty} onChange={(e) => set('difficulty', e.target.value as Difficulty)}>
                  <option>Easy</option>
                  <option>Moderate</option>
                  <option>Challenging</option>
                </select>
              </div>
            </div>

            <div className="admin-form__row">
              <div className="af-field">
                <label>Destino</label>
                <input value={data.destination} onChange={(e) => set('destination', e.target.value)} placeholder="Salar de Uyuni" />
              </div>
              <div className="af-field">
                <label>Partida / regreso</label>
                <input value={data.start_end} onChange={(e) => set('start_end', e.target.value)} placeholder="Uyuni → Uyuni" />
              </div>
            </div>

            <div className="admin-form__row">
              <div className="af-field">
                <label>Mejor época</label>
                <input value={data.best_season} onChange={(e) => set('best_season', e.target.value)} />
              </div>
              <div className="af-field">
                <label>Altitud máx.</label>
                <input value={data.max_altitude} onChange={(e) => set('max_altitude', e.target.value)} />
              </div>
            </div>

            <div className="admin-form__row">
              <div className="af-field">
                <label>Actividad</label>
                <input value={data.activity_label} onChange={(e) => set('activity_label', e.target.value)} placeholder="Salt Flats" />
              </div>
              <div className="af-field">
                <label>Tipo</label>
                <input value={data.type_label} onChange={(e) => set('type_label', e.target.value)} placeholder="Adventure" />
              </div>
            </div>

            <div className="admin-form__row">
              <div className="af-field">
                <label>Precio grupo (USD) <small>· 0 = consultar</small></label>
                <input type="number" min={0} value={data.price_group ?? 0} onChange={(e) => set('price_group', Number(e.target.value))} />
              </div>
              <div className="af-field">
                <label>Precio semiprivado <small>· vacío = no se ofrece</small></label>
                <input
                  type="number"
                  min={0}
                  value={data.price_semi ?? ''}
                  onChange={(e) => set('price_semi', e.target.value === '' ? null : Number(e.target.value))}
                />
              </div>
            </div>
            <div className="admin-form__row">
              <div className="af-field">
                <label>Precio privado <small>· vacío = no se ofrece</small></label>
                <input
                  type="number"
                  min={0}
                  value={data.price_private ?? ''}
                  onChange={(e) => set('price_private', e.target.value === '' ? null : Number(e.target.value))}
                />
              </div>
              <div className="af-field" style={{ justifyContent: 'flex-end' }}>
                <div style={{ display: 'flex', gap: 16 }}>
                  <label className="af-toggle">
                    <input type="checkbox" checked={data.featured} onChange={(e) => set('featured', e.target.checked)} />
                    Destacado en home
                  </label>
                  <label className="af-toggle">
                    <input type="checkbox" checked={data.active} onChange={(e) => set('active', e.target.checked)} />
                    Activo
                  </label>
                </div>
              </div>
            </div>

            <div className="af-field">
              <label>Resumen <small>(una línea por párrafo)</small></label>
              <textarea rows={4} value={toLines(data.summary)} onChange={(e) => set('summary', fromLines(e.target.value))} />
            </div>

            <div className="af-field">
              <label>Highlights <small>(una línea por ítem)</small></label>
              <textarea rows={5} value={toLines(data.highlights)} onChange={(e) => set('highlights', fromLines(e.target.value))} />
            </div>

            <div className="af-field">
              <label>Itinerario</label>
              <div className="af-list">
                {data.itinerary.map((day, i) => (
                  <div className="af-list__item" key={i}>
                    <div className="af-list__head">
                      <span>Día {i + 1}</span>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => set('itinerary', data.itinerary.filter((_, j) => j !== i))}>
                        Quitar
                      </button>
                    </div>
                    <input placeholder="Título del día" value={day.title} onChange={(e) => updateItinerary(i, 'title', e.target.value)} />
                    <textarea rows={3} placeholder="Descripción" value={day.description} onChange={(e) => updateItinerary(i, 'description', e.target.value)} />
                    <input placeholder="Actividades (separadas por coma)" value={(day.activities ?? []).join(', ')} onChange={(e) => updateItinerary(i, 'activities', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} />
                    <div className="admin-form__row">
                      <input placeholder="Comidas (separadas por coma)" value={(day.meals ?? []).join(', ')} onChange={(e) => updateItinerary(i, 'meals', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} />
                      <input placeholder="Alojamiento (opcional)" value={day.stay ?? ''} onChange={(e) => updateItinerary(i, 'stay', e.target.value || undefined)} />
                    </div>
                  </div>
                ))}
                <button type="button" className="btn btn--ghost btn--sm af-list__add" onClick={() => set('itinerary', [...data.itinerary, { day: data.itinerary.length + 1, title: '', description: '', activities: [], meals: [] }])}>
                  + Agregar día
                </button>
              </div>
            </div>

            <div className="af-field">
              <label>Incluye <small>(una línea por ítem)</small></label>
              <textarea rows={4} value={toLines(data.included)} onChange={(e) => set('included', fromLines(e.target.value))} />
            </div>
            <div className="af-field">
              <label>No incluye <small>(una línea por ítem)</small></label>
              <textarea rows={3} value={toLines(data.not_included)} onChange={(e) => set('not_included', fromLines(e.target.value))} />
            </div>

            <div className="af-field">
              <label>Qué llevar</label>
              <div className="af-list">
                {data.what_to_bring.map((item, i) => (
                  <div className="af-list__item" key={i}>
                    <div className="af-list__head">
                      <span>Ítem {i + 1}</span>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => set('what_to_bring', data.what_to_bring.filter((_, j) => j !== i))}>
                        Quitar
                      </button>
                    </div>
                    <div className="admin-form__row">
                      <input placeholder="Emoji (🧥)" value={item.emoji} onChange={(e) => updateBring(i, 'emoji', e.target.value)} style={{ maxWidth: 80 }} />
                      <input placeholder="Título (Ropa abrigada)" value={item.title} onChange={(e) => updateBring(i, 'title', e.target.value)} />
                    </div>
                    <input placeholder="Detalle" value={item.detail} onChange={(e) => updateBring(i, 'detail', e.target.value)} />
                  </div>
                ))}
                <button type="button" className="btn btn--ghost btn--sm af-list__add" onClick={() => set('what_to_bring', [...data.what_to_bring, { emoji: '🎒', title: '', detail: '' }])}>
                  + Agregar ítem
                </button>
              </div>
            </div>

            <div className="af-field">
              <label>Información práctica</label>
              <div className="af-list">
                <div className="af-field">
                  <label>Punto de encuentro</label>
                  <input value={data.info.meeting} onChange={(e) => setInfo('meeting', e.target.value)} />
                </div>
                <div className="af-field">
                  <label>Cancelación</label>
                  <textarea rows={2} value={data.info.cancellation} onChange={(e) => setInfo('cancellation', e.target.value)} />
                </div>
                <div className="af-field">
                  <label>Salud / altitud</label>
                  <textarea rows={2} value={data.info.health} onChange={(e) => setInfo('health', e.target.value)} />
                </div>
                <div className="af-field">
                  <label>Transporte</label>
                  <textarea rows={2} value={data.info.transport} onChange={(e) => setInfo('transport', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="af-field">
              <label>Extras</label>
              <div className="af-list">
                {data.extras.map((x, i) => (
                  <div className="af-list__item" key={i}>
                    <div className="af-list__head">
                      <span>{x.name || `Extra ${i + 1}`}</span>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => set('extras', data.extras.filter((_, j) => j !== i))}>
                        Quitar
                      </button>
                    </div>
                    <div className="admin-form__row">
                      <input placeholder="Nombre (Hotel en Uyuni)" value={x.name} onChange={(e) => updateExtra(i, 'name', e.target.value)} />
                      <input placeholder="Subtítulo (2 noches, desayuno)" value={x.sub} onChange={(e) => updateExtra(i, 'sub', e.target.value)} />
                    </div>
                    <div className="admin-form__row">
                      <input type="number" min={0} placeholder="Precio (0 = gratuito)" value={x.price} onChange={(e) => updateExtra(i, 'price', Number(e.target.value))} />
                      <select value={x.kind} onChange={(e) => updateExtra(i, 'kind', e.target.value as TourExtra['kind'])}>
                        <option value="paid">Pago</option>
                        <option value="free">Gratuito</option>
                        <option value="pay-on-site">Pago en sitio</option>
                      </select>
                    </div>
                  </div>
                ))}
                <button type="button" className="btn btn--ghost btn--sm af-list__add" onClick={() => set('extras', [...data.extras, { id: '', name: '', sub: '', price: 0, kind: 'paid' }])}>
                  + Agregar extra
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="admin-drawer__foot">
          <button className="btn btn--primary" disabled={saving} onClick={() => void save()}>
            {saving ? 'Guardando…' : tour ? 'Guardar cambios' : 'Crear tour'}
          </button>
          <button className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </>
  );
}
