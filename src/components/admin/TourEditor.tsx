'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { buildTourPayload, resizeImageForUpload, uploadToBucket, type AdminTour, type CategoryRow, type TourFormData } from '@/lib/api';
import { getSupabase } from '@/lib/supabase';
import { GROUP_DISCOUNT_TIERS } from '@/lib/pricing';
import { cleanTourLines, DIFFICULTY_LABELS, makeTourForm, slugifyTour, tourMoney } from '@/lib/tour-form';
import type { Difficulty, ItineraryDay, TourExtra, TourInfo } from '@/lib/types';
import AdminIcon from './AdminIcon';

type EditorTab = 'content' | 'itinerary' | 'details';
const EDITOR_TABS = [{ id: 'content', label: 'Contenido' }, { id: 'itinerary', label: 'Itinerario' }, { id: 'details', label: 'Configuración' }] as const;
const messageOf = (error: unknown) => error && typeof error === 'object' && 'message' in error ? String(error.message) : 'No se pudo guardar el tour.';

interface Props {
  tour: AdminTour | null;
  initialData: TourFormData | null;
  categories: CategoryRow[];
  busy: boolean;
  onClose: () => void;
  onSaved: (id: string) => Promise<void>;
  onDuplicate: (data: TourFormData) => void;
  onToggleActive: () => void;
}

export default function TourEditor({ tour, initialData, categories, busy, onClose, onSaved, onDuplicate, onToggleActive }: Props) {
  const [data, setData] = useState<TourFormData>(() => initialData ? structuredClone(initialData) : makeTourForm(tour));
  const baseline = useRef(JSON.stringify(initialData ?? makeTourForm(tour)));
  const savedFlags = useRef({ active: tour?.active, featured: tour?.featured });
  const [tab, setTab] = useState<EditorTab>('content');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(false);
  const [overlay, setOverlay] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const mainUploadRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const disabled = saving || uploading || busy;
  const disabledRef = useRef(disabled);
  const dirty = JSON.stringify(data) !== baseline.current;
  const slugLocked = Boolean(tour?.reservation_count);
  const media = [...new Set([data.image, ...data.gallery].filter(Boolean))];
  const set = <K extends keyof TourFormData>(key: K, value: TourFormData[K]) => setData((previous) => ({ ...previous, [key]: value }));

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 1279px)');
    const update = () => setOverlay(query.matches);
    update(); query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!tour) return;
    const changes: Partial<Pick<TourFormData, 'active' | 'featured'>> = {};
    if (savedFlags.current.active !== tour.active) changes.active = tour.active;
    if (savedFlags.current.featured !== tour.featured) changes.featured = tour.featured;
    savedFlags.current = { active: tour.active, featured: tour.featured };
    if (Object.keys(changes).length) {
      baseline.current = JSON.stringify({ ...JSON.parse(baseline.current), ...changes });
      setData((previous) => ({ ...previous, ...changes }));
    }
  }, [tour?.active, tour?.featured]);
  useEffect(() => {
    if (!overlay) return;
    const previous = document.activeElement;
    panelRef.current?.querySelector<HTMLInputElement>('input:not([type="file"])')?.focus();
    const keys = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).closest('dialog')) return;
      if (event.key === 'Escape' && !disabledRef.current) onClose();
      if (event.key !== 'Tab') return;
      const nodes = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled):not([type="file"]), select:not(:disabled), textarea:not(:disabled), a[href], summary') ?? []).filter((element) => element.getClientRects().length && element.tabIndex >= 0);
      if (event.shiftKey && document.activeElement === nodes[0]) { event.preventDefault(); nodes.at(-1)?.focus(); }
      else if (!event.shiftKey && document.activeElement === nodes.at(-1)) { event.preventDefault(); nodes[0]?.focus(); }
    };
    document.addEventListener('keydown', keys);
    return () => { document.removeEventListener('keydown', keys); if (previous instanceof HTMLElement && document.contains(previous)) previous.focus(); };
  }, [overlay, onClose]);

  const upload = async (files: File[], target: 'main' | 'gallery') => {
    if (disabled || !files.length) return;
    if (files.some((file) => !file.type.startsWith('image/'))) { setError('Selecciona archivos de imagen para la galería.'); return; }
    setError(''); setUploading(true);
    try {
      const results = await Promise.allSettled(files.map(async (file) => {
        const optimized = await resizeImageForUpload(file);
        const path = `${slugifyTour(data.slug) || 'tour'}/${crypto.randomUUID()}-${optimized.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`;
        return uploadToBucket(getSupabase(), 'tours', path, optimized);
      }));
      const urls = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
      if (urls.length) setData((previous) => target === 'main'
        ? { ...previous, image: urls[0] }
        : { ...previous, image: previous.image || urls[0], gallery: [...new Set([...previous.gallery, ...(previous.image ? urls : urls.slice(1))])] });
      const failure = results.find((result) => result.status === 'rejected');
      if (failure?.status === 'rejected') setError(messageOf(failure.reason));
    } finally { setUploading(false); }
  };

  const save = async () => {
    if (!data.title.trim()) { setError('El título es obligatorio.'); setTab('content'); return; }
    if (!data.slug.trim()) { setError('La URL del tour es obligatoria.'); setTab('details'); return; }
    if ([data.price_group, data.price_private, data.price_semi, ...data.extras.map((extra) => extra.price)].some((price) => price !== null && (!Number.isFinite(price) || price < 0))) { setError('Los precios deben ser números iguales o mayores que cero.'); return; }
    setError(''); setSaving(true);
    try {
      const cleaned: TourFormData = {
        ...data, title: data.title.trim(), slug: data.slug.trim(),
        summary: cleanTourLines(data.summary), highlights: cleanTourLines(data.highlights),
        included: cleanTourLines(data.included), not_included: cleanTourLines(data.not_included),
        itinerary: data.itinerary.map((day, index) => ({ ...day, day: index + 1, activities: cleanTourLines(day.activities ?? []), meals: cleanTourLines(day.meals ?? []) })),
        extras: data.extras.map((extra) => ({ ...extra, id: extra.id || crypto.randomUUID() })),
      };
      const payload = buildTourPayload(cleaned, categories);
      const query = tour ? getSupabase().from('tours').update(payload).eq('id', tour.id) : getSupabase().from('tours').insert(payload);
      const { data: saved, error: saveError } = await query.select('id').single();
      if (saveError) throw saveError;
      setData(cleaned); baseline.current = JSON.stringify(cleaned);
      await onSaved(String(saved.id));
    } catch (err) { setError(messageOf(err)); }
    finally { setSaving(false); }
  };
  const updateDay = (index: number, patch: Partial<ItineraryDay>) => setData((previous) => ({ ...previous, itinerary: previous.itinerary.map((day, number) => number === index ? { ...day, ...patch } : day) }));
  const updateExtra = (index: number, patch: Partial<TourExtra>) => setData((previous) => ({ ...previous, extras: previous.extras.map((extra, number) => number === index ? { ...extra, ...patch } : extra) }));
  const setInfo = (key: keyof TourInfo, value: string) => setData((previous) => ({ ...previous, info: { ...previous.info, [key]: value } }));
  const setMainImage = (url: string) => setData((previous) => ({ ...previous, image: url, gallery: media.filter((image) => image !== url) }));
  const removeImage = (url: string) => {
    const remaining = media.filter((image) => image !== url);
    setData((previous) => ({ ...previous, image: remaining[0] ?? '', gallery: remaining.slice(1) }));
  };

  return <>
    <button className="tour-editor-backdrop" onClick={onClose} aria-label="Cerrar editor de tour" disabled={disabled} />
    <aside className="tour-editor" ref={panelRef} role={overlay ? 'dialog' : undefined} aria-modal={overlay || undefined} aria-label="Editor de tour">
      <header className="tour-editor__heading"><h2>{tour ? 'Editar tour' : 'Nuevo tour'}</h2><button onClick={onClose} disabled={disabled} aria-label="Cerrar editor"><AdminIcon name="close" size={19} /></button></header>
      <div className="tour-editor__body">
        <div className="tour-editor__identity"><button className="tour-editor__cover" onClick={() => mainUploadRef.current?.click()} aria-label="Cambiar imagen principal" disabled={disabled}><img src={data.image || '/assets/andes-mountains.jpg'} alt={data.title || 'Imagen del tour'} width="84" height="74" /><span><AdminIcon name="upload" size={15} /></span></button><input ref={mainUploadRef} className="tour-main-upload" type="file" accept="image/*" aria-label="Subir imagen principal" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload([file], 'main'); event.currentTarget.value = ''; }} /><div><h3>{data.title || 'Una nueva aventura'}</h3><small>{tour ? `ID: ${tour.id.slice(0, 8)}` : 'Nuevo tour · sin guardar'}</small><label className={`tour-editor__status${data.active ? ' is-active' : ''}`}><AdminIcon name="tours" size={12} /><select aria-label="Estado del tour" value={data.active ? 'active' : 'inactive'} disabled={disabled} onChange={(event) => set('active', event.target.value === 'active')}><option value="active">Activo</option><option value="inactive">Inactivo</option></select></label></div></div>

        {error && <div className="admin-alert admin-alert--error" role="alert">{error}</div>}
        <fieldset className="tour-editor__basics" disabled={disabled}><legend className="admin-sr-only">Datos del tour</legend><label>Título<input aria-label="Título del tour" value={data.title} placeholder="Nombre de la experiencia" onChange={(event) => { const title = event.target.value; setData((previous) => ({ ...previous, title, ...(!tour && (!previous.slug || previous.slug === slugifyTour(previous.title)) ? { slug: slugifyTour(title) } : {}) })); }} /></label><label>Precio base (USD)<input aria-label="Precio base (USD)" type="number" min="0" step="0.01" value={data.price_group ?? ''} onChange={(event) => set('price_group', event.target.value === '' ? null : Number(event.target.value))} /></label><label>Duración<input aria-label="Duración del tour" value={data.duration} placeholder="3 días / 2 noches" onChange={(event) => set('duration', event.target.value)} /></label><label>Destino<input value={data.destination} onChange={(event) => set('destination', event.target.value)} placeholder="Salar de Uyuni" /></label><label>Dificultad<select value={data.difficulty} onChange={(event) => set('difficulty', event.target.value as Difficulty)}>{Object.entries(DIFFICULTY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Tipo de experiencia<input value={data.type_label} onChange={(event) => set('type_label', event.target.value)} placeholder="Aventura" /></label></fieldset>

        <div className="tour-editor__tabs" role="tablist" aria-label="Secciones del editor">{EDITOR_TABS.map((item) => <button key={item.id} role="tab" id={`${id}-${item.id}-tab`} aria-selected={tab === item.id} aria-controls={`${id}-${item.id}`} onClick={() => setTab(item.id)}>{item.label}</button>)}</div>
        <fieldset className="tour-editor__panel" disabled={disabled} role="tabpanel" id={`${id}-${tab}`} aria-labelledby={`${id}-${tab}-tab`}>
          {tab === 'content' && <>
            <section className="tour-editor__section tour-editor__gallery"><h4>Galería de imágenes <small>{media.length} {media.length === 1 ? 'imagen' : 'imágenes'}</small></h4><div className={`tour-gallery${dragging ? ' is-dragging' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={(event) => { if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setDragging(false); }} onDrop={(event) => { event.preventDefault(); setDragging(false); void upload(Array.from(event.dataTransfer.files), 'gallery'); }}>
              <label className="tour-gallery__upload"><AdminIcon name="upload" size={22} /><strong>{uploading ? 'Subiendo imágenes…' : 'Arrastra tus fotos aquí'}</strong><span>o haz clic para subir</span><small>JPG, PNG, WebP o SVG</small><input type="file" accept="image/*" multiple aria-label="Añadir imágenes a la galería" disabled={disabled} onChange={(event) => { void upload(Array.from(event.target.files ?? []), 'gallery'); event.currentTarget.value = ''; }} /></label>
              {media.map((image, index) => <div className="tour-gallery__image" key={image}><button className="tour-gallery__make-main" onClick={() => setMainImage(image)} disabled={disabled} aria-label={`Usar imagen ${index + 1} como principal`} title="Usar como imagen principal"><img src={image} alt={`Galería del tour, imagen ${index + 1}`} width="78" height="68" /></button><button className="tour-gallery__remove" onClick={() => removeImage(image)} disabled={disabled} aria-label={`Quitar imagen ${index + 1}`}><AdminIcon name="close" size={10} /></button>{image === data.image && <span className="tour-gallery__main">Principal</span>}</div>)}
            </div>{uploading && <p className="tour-editor__upload-status" role="status">Preparando y guardando las imágenes…</p>}</section>

            <div className="tour-editor__inclusions"><EditableList label="Incluye" items={data.included} onChange={(items) => set('included', items)} icon="checkCircle" disabled={disabled} /><EditableList label="No incluye" items={data.not_included} onChange={(items) => set('not_included', items)} icon="crossCircle" disabled={disabled} /></div>

            <section className="tour-editor__discounts"><h4>Descuentos por pasajeros <small>Aplicados en la reserva</small></h4>{GROUP_DISCOUNT_TIERS.map((tier, index) => <div key={tier.minPax}><span className="tour-discount-icon"><AdminIcon name="users" size={17} /></span><span>{tier.minPax}{GROUP_DISCOUNT_TIERS[index + 1] ? `–${GROUP_DISCOUNT_TIERS[index + 1].minPax - 1}` : '+'} pasajeros</span><strong>{Math.round(tier.rate * 100)}% descuento</strong><AdminIcon name="checkCircle" size={16} /></div>)}</section>

            <details className="tour-editor__extra"><summary>Resumen y puntos destacados<AdminIcon name="chevron" size={14} /></summary><label>Resumen<textarea rows={4} value={data.summary.join('\n')} onChange={(event) => set('summary', event.target.value.split('\n'))} placeholder="Una línea por párrafo" /></label><label>Puntos destacados<textarea rows={4} value={data.highlights.join('\n')} onChange={(event) => set('highlights', event.target.value.split('\n'))} placeholder="Una experiencia por línea" /></label></details>
          </>}

          {tab === 'itinerary' && <>
            <section className="tour-editor__section"><h4>Itinerario <small>{data.itinerary.length} días</small></h4><div className="tour-editor__day-list">{data.itinerary.map((day, index) => <details className="tour-editor__day" key={index} open={index === 0}><summary><span>Día {index + 1}</span>{day.title || 'Una nueva experiencia'}<AdminIcon name="chevron" size={13} /></summary><label>Título del día<input value={day.title} onChange={(event) => updateDay(index, { title: event.target.value })} /></label><label>Descripción<textarea rows={3} value={day.description} onChange={(event) => updateDay(index, { description: event.target.value })} /></label><label>Actividades<input value={(day.activities ?? []).join(', ')} onChange={(event) => updateDay(index, { activities: event.target.value.split(',').map((value) => value.trim()) })} placeholder="Separadas por coma" /></label><label>Comidas<input value={(day.meals ?? []).join(', ')} onChange={(event) => updateDay(index, { meals: event.target.value.split(',').map((value) => value.trim()) })} placeholder="Desayuno, almuerzo…" /></label><label>Alojamiento<input value={day.stay ?? ''} onChange={(event) => updateDay(index, { stay: event.target.value || undefined })} /></label><button className="tour-editor__remove-item" onClick={() => set('itinerary', data.itinerary.filter((_, number) => number !== index))}><AdminIcon name="trash" size={12} />Quitar día</button></details>)}</div><button className="tour-editor__add" onClick={() => set('itinerary', [...data.itinerary, { day: data.itinerary.length + 1, title: '', description: '', activities: [], meals: [] }])}><AdminIcon name="plus" size={13} />Añadir día al itinerario</button></section>
            <section className="tour-editor__section"><h4>Qué llevar</h4>{data.what_to_bring.map((item, index) => <div className="tour-editor__bring" key={index}><div><input aria-label={`Emoji del artículo ${index + 1}`} value={item.emoji} onChange={(event) => set('what_to_bring', data.what_to_bring.map((value, number) => number === index ? { ...value, emoji: event.target.value } : value))} /><input aria-label={`Nombre del artículo ${index + 1}`} value={item.title} placeholder="Ropa abrigada" onChange={(event) => set('what_to_bring', data.what_to_bring.map((value, number) => number === index ? { ...value, title: event.target.value } : value))} /><button aria-label={`Quitar artículo ${index + 1}`} onClick={() => set('what_to_bring', data.what_to_bring.filter((_, number) => number !== index))}><AdminIcon name="close" size={14} /></button></div><input aria-label={`Detalle del artículo ${index + 1}`} value={item.detail} placeholder="Detalle" onChange={(event) => set('what_to_bring', data.what_to_bring.map((value, number) => number === index ? { ...value, detail: event.target.value } : value))} /></div>)}<button className="tour-editor__add" onClick={() => set('what_to_bring', [...data.what_to_bring, { emoji: '🎒', title: '', detail: '' }])}><AdminIcon name="plus" size={13} />Añadir artículo</button></section>
          </>}

          {tab === 'details' && <>
            <section className="tour-editor__section"><h4>Tarifas y visibilidad</h4><div className="tour-editor__field-grid"><label>Semiprivado (USD)<input type="number" min="0" step="0.01" value={data.price_semi ?? ''} onChange={(event) => set('price_semi', event.target.value === '' ? null : Number(event.target.value))} placeholder="No disponible" /></label><label>Privado (USD)<input type="number" min="0" step="0.01" value={data.price_private ?? ''} onChange={(event) => set('price_private', event.target.value === '' ? null : Number(event.target.value))} placeholder="No disponible" /></label></div><label className="tour-editor__featured"><span><AdminIcon name="star" size={16} />Destacar en la portada</span><input type="checkbox" role="switch" aria-label="Destacar en la portada" checked={data.featured} onChange={(event) => set('featured', event.target.checked)} /></label><p className="tour-editor__hint">Precio base 0: consultar. Tarifas vacías: modalidad no disponible.</p></section>
            <section className="tour-editor__section"><h4>Categorías</h4><label>Categoría principal<select value={data.primary_category_slug} onChange={(event) => set('primary_category_slug', event.target.value)}><option value="">Sin categoría</option>{categories.map((cat) => <option key={cat.slug} value={cat.slug}>{cat.label}</option>)}</select></label><div className="tour-editor__categories">{categories.map((cat) => <label key={cat.slug}><input type="checkbox" checked={data.category_slugs.includes(cat.slug)} onChange={() => set('category_slugs', data.category_slugs.includes(cat.slug) ? data.category_slugs.filter((slug) => slug !== cat.slug) : [...data.category_slugs, cat.slug])} />{cat.label}</label>)}</div></section>
            <section className="tour-editor__section"><h4>Información del tour</h4><label>URL del tour {slugLocked && <small>· protegida porque tiene reservas</small>}<input value={data.slug} disabled={slugLocked} onChange={(event) => set('slug', slugifyTour(event.target.value))} placeholder="salar-de-uyuni" /></label><div className="tour-editor__field-grid"><label>Etiqueta<input value={data.badge} onChange={(event) => set('badge', event.target.value)} placeholder="Más vendido" /></label><label>Estilo de etiqueta<select value={data.badge_variant ?? ''} onChange={(event) => set('badge_variant', (event.target.value || null) as TourFormData['badge_variant'])}><option value="">Sin estilo</option><option value="popular">Popular</option><option value="adventure">Aventura</option><option value="cultural">Cultural</option></select></label><label>Actividad<input value={data.activity_label} onChange={(event) => set('activity_label', event.target.value)} /></label><label>Partida y regreso<input value={data.start_end} onChange={(event) => set('start_end', event.target.value)} /></label><label>Mejor época<input value={data.best_season} onChange={(event) => set('best_season', event.target.value)} /></label><label>Altitud máxima<input value={data.max_altitude} onChange={(event) => set('max_altitude', event.target.value)} /></label></div></section>
            <section className="tour-editor__section"><h4>Información práctica</h4>{([{ key: 'meeting', label: 'Punto de encuentro' }, { key: 'cancellation', label: 'Cancelación' }, { key: 'health', label: 'Salud y altitud' }, { key: 'transport', label: 'Transporte' }] as const).map((item) => <label key={item.key}>{item.label}<textarea rows={2} value={data.info[item.key]} onChange={(event) => setInfo(item.key, event.target.value)} /></label>)}</section>
            <section className="tour-editor__section"><h4>Extras opcionales</h4>{data.extras.map((extra, index) => <div className="tour-editor__extra-item" key={index}><label>Nombre del extra<input value={extra.name} onChange={(event) => updateExtra(index, { name: event.target.value })} /></label><label>Descripción<input value={extra.sub} onChange={(event) => updateExtra(index, { sub: event.target.value })} /></label><div className="tour-editor__field-grid"><label>Precio (USD)<input type="number" min="0" step="0.01" value={extra.price} onChange={(event) => updateExtra(index, { price: Number(event.target.value) })} /></label><label>Modalidad<select value={extra.kind} onChange={(event) => updateExtra(index, { kind: event.target.value as TourExtra['kind'] })}><option value="paid">De pago</option><option value="free">Gratuito</option><option value="pay-on-site">Pago en destino</option></select></label></div><button className="tour-editor__remove-item" onClick={() => set('extras', data.extras.filter((_, number) => number !== index))}><AdminIcon name="trash" size={12} />Quitar extra</button></div>)}<button className="tour-editor__add" onClick={() => set('extras', [...data.extras, { id: '', name: '', sub: '', price: 0, kind: 'paid' }])}><AdminIcon name="plus" size={13} />Añadir extra</button></section>
          </>}
        </fieldset>
      </div>
      <footer className="tour-editor__footer"><span className="tour-editor__save-state">{saving ? 'Guardando…' : uploading ? 'Subiendo imágenes…' : dirty ? 'Cambios sin guardar' : tour ? 'Cambios guardados' : 'Listo para crear'}</span><div><button onClick={() => setPreview(true)} disabled={disabled} aria-label="Vista previa del tour" title="Vista previa"><AdminIcon name="eye" size={14} /><span>Vista previa</span></button><button onClick={() => onDuplicate(data)} disabled={disabled || !data.title.trim()} aria-label="Duplicar tour" title="Duplicar"><AdminIcon name="copy" size={14} /><span>Duplicar</span></button><button className="tour-editor__deactivate" onClick={onToggleActive} disabled={disabled || !tour} aria-label={tour?.active ? 'Desactivar tour' : 'Activar tour'} title={tour?.active ? 'Desactivar' : 'Activar'}><AdminIcon name="power" size={14} /><span>{tour?.active ? 'Desactivar' : 'Activar'}</span></button><button className="tour-editor__save" onClick={() => void save()} disabled={disabled}><AdminIcon name="save" size={14} />{saving ? 'Guardando…' : tour ? 'Guardar cambios' : 'Crear tour'}</button></div></footer>
      {preview && <TourPreview data={data} onClose={() => setPreview(false)} />}
    </aside>
  </>;
}

function EditableList({ label, items, onChange, icon, disabled }: { label: string; items: string[]; onChange: (items: string[]) => void; icon: string; disabled: boolean }) {
  return <section className={`tour-line-list${icon === 'crossCircle' ? ' tour-line-list--excluded' : ''}`}><h4>{label}</h4>{items.map((item, index) => <div key={index}><AdminIcon name={icon} size={12} /><input aria-label={`${label}, elemento ${index + 1}`} value={item} disabled={disabled} placeholder="Escribe un servicio" onChange={(event) => onChange(items.map((value, number) => number === index ? event.target.value : value))} /><button aria-label={`Quitar de ${label.toLowerCase()}, elemento ${index + 1}`} onClick={() => onChange(items.filter((_, number) => number !== index))} disabled={disabled}><AdminIcon name="close" size={10} /></button></div>)}<button className="tour-editor__add" onClick={() => onChange([...items, ''])} disabled={disabled}><AdminIcon name="plus" size={11} />Añadir</button></section>;
}

function TourPreview({ data, onClose }: { data: TourFormData; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog className="tour-preview" ref={ref} aria-labelledby={id} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}><div><header><span>Vista previa · cambios actuales</span><button aria-label="Cerrar vista previa" onClick={onClose}><AdminIcon name="close" size={19} /></button></header><img className="tour-preview__image" src={data.image || '/assets/andes-mountains.jpg'} alt={data.title} /><div className="tour-preview__body"><span className="tour-preview__destination"><AdminIcon name="pin" size={14} />{data.destination || 'Bolivia'} · {data.duration || 'Duración por definir'}</span><h2 id={id}>{data.title || 'Tu próxima aventura'}</h2><p className="tour-preview__price">{data.price_group ? `Desde US$ ${tourMoney(data.price_group)} por persona` : 'Precio a consultar'}</p>{cleanTourLines(data.summary).map((paragraph, index) => <p key={index}>{paragraph}</p>)}{data.highlights.length > 0 && <ul>{cleanTourLines(data.highlights).map((line, index) => <li key={index}>{line}</li>)}</ul>}<div><section><h3>Incluye</h3><ul>{cleanTourLines(data.included).map((line, index) => <li key={index}>{line}</li>)}</ul></section><section><h3>No incluye</h3><ul>{cleanTourLines(data.not_included).map((line, index) => <li key={index}>{line}</li>)}</ul></section></div></div></div></dialog>;
}
