'use client';

import { useConfirm } from './ConfirmDialog';
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createCategory, type AdminTour, type CategoryRow } from '@/lib/api';
import { getSupabase } from '@/lib/supabase';
import { DIFFICULTY_LABELS, slugifyTour } from '@/lib/tour-form';
import { adminTourMoney as tourMoney } from '@/lib/admin/money';
import { changeTourVisibility, tourMenuFocusIndex, tourMenuPosition } from '@/lib/admin/tour-actions';
import AdminIcon from './AdminIcon';
import TourEditor from './TourEditor';
import EmptyState from './EmptyState';
import { copyAdminTourForm, makeAdminTourForm, type AdminTourForm } from '@/lib/admin/tour-editor';
import { catalogForAdmin, deleteTour, isDraftTour } from '@/lib/admin/catalog';
import { messageOf } from '@/lib/admin/core';
const STATUS_FILTERS = [

  { id: 'all', label: 'Todos los tours' },
  { id: 'active', label: 'Activos' },

  { id: 'featured', label: 'Destacados' },
  { id: 'inactive', label: 'Inactivos' },

] as const;
type StatusFilter = typeof STATUS_FILTERS[number]['id'];
type SortKey = 'title' | 'price' | 'destination';
const searchText = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const errorMessage = messageOf;

export default function ToursTab() {
  const confirm = useConfirm();
  const searchParams = useSearchParams();
  const requestedSearch = searchParams.get('q') ?? '';
  const [tours, setTours] = useState<AdminTour[] | null>(null);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorSeed, setEditorSeed] = useState<AdminTourForm | null>(null);
  const [editorSequence, setEditorSequence] = useState(0);
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');
  const [search, setSearch] = useState(requestedSearch);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [destination, setDestination] = useState('');
  const [duration, setDuration] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [category, setCategory] = useState('');
  const [extraFilters, setExtraFilters] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [bookingFilter, setBookingFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('title');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [sortEnabled, setSortEnabled] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState<{
    id: string;
    top: number;
    left: number;
  } | null>(null);
  const [showCatForm, setShowCatForm] = useState(false);
  const [catLabel, setCatLabel] = useState('');
  const [catEmoji, setCatEmoji] = useState('');
  const [savingCat, setSavingCat] = useState(false);
  const mounted = useRef(true);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);
  const menuFocusLast = useRef(false);
  const menuId = useId();
  const closeMenu = useCallback((restoreFocus = true) => {
    setMenu(null);
    if (restoreFocus && menuTriggerRef.current?.isConnected) {
      menuTriggerRef.current.focus({ preventScroll: true });
    }
  }, []);
  const load = useCallback(async () => {
    setError('');
    try {
      const { tours: rows, categories: cats } = await catalogForAdmin();
      if (!mounted.current)
        return;
      setTours(rows);
      setCategories(cats);
      return true;
    } catch (err) {
      if (mounted.current) {
        setError(errorMessage(err));
        setTours((previous) => previous ?? []);
      }
      return false;
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
    };
  }, [load]);
  useEffect(() => {
    setSearch(requestedSearch);
  }, [requestedSearch]);
  useEffect(() => {
    setPage(1);
  }, [search, status, destination, duration, difficulty, category, minPrice, maxPrice, bookingFilter, pageSize]);
  useLayoutEffect(() => {
    if (!menu) return;
    const position = () => {
      const trigger = menuTriggerRef.current;
      const element = menuRef.current;
      if (!trigger?.isConnected) {
        closeMenu(false);
        return;
      }
      if (!element) return;
      const anchor = trigger.getBoundingClientRect();
      const bounds = element.getBoundingClientRect();
      const next = tourMenuPosition(anchor, bounds, { width: window.innerWidth, height: window.innerHeight });
      setMenu(current => current && current.id === menu.id
        ? current.top === next.top && current.left === next.left ? current : { ...current, ...next }
        : current);
    };
    position();
    const items = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)');
    const first = menuFocusLast.current ? items?.[items.length - 1] : items?.[0];
    first?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (!menuRef.current?.contains(event.target) && !menuTriggerRef.current?.contains(event.target)) closeMenu(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        event.preventDefault();
        closeMenu();
      }
    };
    const scroll = (event: Event) => {
      if (event.target instanceof Node && menuRef.current?.contains(event.target)) return;
      position();
    };
    document.addEventListener('pointerdown', outside);
    window.addEventListener('keydown', escape);
    window.addEventListener('resize', position);
    window.addEventListener('scroll', scroll, true);
    return () => {
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('keydown', escape);
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', scroll, true);
    };
  }, [menu?.id, closeMenu]);
  const openMenu = (id: string, trigger: HTMLButtonElement, last = false) => {
    menuTriggerRef.current = trigger;
    menuFocusLast.current = last;
    if (menu?.id === id) {
      const items = menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)');
      (last ? items?.[items.length - 1] : items?.[0])?.focus({ preventScroll: true });
    } else {
      setMenu({ id, top: 0, left: 0 });
    }
  };
  const menuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeMenu();
      return;
    }
    if (event.key === 'Tab') {
      closeMenu();
      return;
    }
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? []);
    const next = tourMenuFocusIndex(event.key, items.indexOf(document.activeElement as HTMLElement), items.length);
    if (next !== null) {
      event.preventDefault();
      items[next]?.focus({ preventScroll: true });
    } else if (event.key === ' ' && event.target instanceof HTMLAnchorElement) {
      event.preventDefault();
      event.target.click();
    }
  };
  const categoryNames = useMemo(() => new Map(categories.map((cat) => [cat.slug, cat.label])), [categories]);
  const destinations = useMemo(() => [...new Set(tours?.map((tour) => tour.destination).filter(Boolean))].sort(), [tours]);
  const durations = useMemo(() => [...new Set(tours?.map((tour) => tour.duration).filter(Boolean))].sort(), [tours]);
  const filtered = useMemo(() => {
    const query = searchText(search.trim());
    const rows = (tours ?? []).filter((tour) => {
      if (status === 'active' && !tour.active || status === 'inactive' && tour.active || status === 'featured' && !tour.featured)
        return false;
      if (destination && tour.destination !== destination || duration && tour.duration !== duration || difficulty && tour.difficulty !== difficulty)
        return false;
      if (category && tour.primary_category_slug !== category && !tour.category_slugs.includes(category))
        return false;
      if (minPrice && Number(tour.price_group ?? 0) < Number(minPrice) || maxPrice && Number(tour.price_group ?? 0) > Number(maxPrice))
        return false;
      if (bookingFilter === 'with' && !tour.reservation_count || bookingFilter === 'without' && tour.reservation_count > 0)
        return false;
      return !query || searchText(`${tour.title} ${tour.destination} ${tour.type_label} ${categoryNames.get(tour.primary_category_slug) ?? ''}`).includes(query);
    });
    if (sortEnabled)
      rows.sort((a, b) => {
        const comparison = sortKey === 'price' ? Number(a.price_group ?? 0) - Number(b.price_group ?? 0) : a[sortKey].localeCompare(b[sortKey], 'es');
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    return rows;
  }, [
    tours,
    search,
    status,
    destination,
    duration,
    difficulty,
    category,
    minPrice,
    maxPrice,
    bookingFilter,
    categoryNames,
    sortKey,
    sortDirection,
    sortEnabled
  ]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const editingTour = tours?.find((tour) => tour.id === editingId) ?? null;
  const hasFilters = Boolean(search || destination || duration || difficulty || category || minPrice || maxPrice || bookingFilter || status !== 'all');
  const openTour = (id: string) => {
    setEditorSeed(null);
    setEditingId(id);
    setMenu(null);
  };
  const closeEditor = useCallback(() => setEditingId(null), []);
  const createTour = () => {
    setEditorSeed(null);
    setEditorSequence((value) => value + 1);
    setEditingId('new');
  };
  const duplicate = (data: AdminTourForm) => {
    setEditorSeed(copyAdminTourForm(data, (tours ?? []).map((tour) => tour.slug)));
    setEditorSequence((value) => value + 1);
    setEditingId('new');
    setMenu(null);
  };
  const toggleTour = async (tour: AdminTour, field: 'active' | 'featured'): Promise<'saved' | 'cancelled' | 'failed'> => {
    if (busyIds.has(tour.id)) return 'cancelled';
    const apply = async () => {
      setBusyIds(previous => new Set(previous).add(tour.id));
      setError('');
      setOkMsg('');
      try {
        const { error: updateError } = await getSupabase().from('tours').update({ [field]: !tour[field] }).eq('id', tour.id).select('id').single();
        if (updateError) throw updateError;
        setTours(rows => rows?.map(row => row.id === tour.id ? { ...row, [field]: !tour[field] } : row) ?? []);
        setOkMsg(field === 'active' ? (tour.active ? 'Tour desactivado.' : 'Tour activado.') : (tour.featured ? 'Tour retirado de destacados.' : 'Tour añadido a destacados.'));
        window.dispatchEvent(new Event('admin-data-changed'));
      } finally {
        setBusyIds(previous => {
          const next = new Set(previous);
          next.delete(tour.id);
          return next;
        });
      }
    };
    try {
      const accepted = field === 'active' ? await changeTourVisibility(tour, confirm, apply) : (await apply(), true);
      return accepted ? 'saved' : 'cancelled';
    } catch (err) {
      setError(errorMessage(err));
      return 'failed';
    }
  };
  const remove = async (tour: AdminTour) => {
    if (busyIds.has(tour.id))
      return;
    setMenu(null);
    if (tour.reservation_count > 0) {
      if (tour.active) await toggleTour(tour, 'active');
      return;
    }
    await confirm({

      title: 'Eliminar tour',

      message: '¿Eliminar definitivamente “' + tour.title + '”? Esta acción no se puede deshacer.',

      confirmLabel: 'Eliminar tour',

      destructive: true,

      onConfirm: async () => {
        setError('');
        setOkMsg('');
        setBusyIds(previous => new Set(previous).add(tour.id));
        try {
          await deleteTour(tour.id);
          if (editingId === tour.id)
            setEditingId(null);
          setOkMsg('Tour eliminado.');
          await load();
        } catch (err) {
          setError(errorMessage(err));
        } finally {
          setBusyIds(previous => {
            const next = new Set(previous);
            next.delete(tour.id);
            return next;
          });
        }
      },

    });
  };
  const addCategory = async () => {
    const label = catLabel.trim(), slug = slugifyTour(label);
    if (!slug || savingCat)
      return;
    if (categories.some((cat) => cat.slug === slug)) {
      setError('Esta categoría ya existe.');
      return;
    }
    setSavingCat(true);
    setError('');
    try {
      await createCategory(getSupabase(), { slug, label, emoji: catEmoji.trim(), position: Math.max(0, ...categories.map((cat) => cat.position)) + 1 });
      setCatLabel('');
      setCatEmoji('');
      setShowCatForm(false);
      setOkMsg('Categoría creada.');
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSavingCat(false);
    }
  };
  const clearFilters = () => {
    setSearch('');
    setStatus('all');
    setDestination('');
    setDuration('');
    setDifficulty('');
    setCategory('');
    setMinPrice('');
    setMaxPrice('');
    setBookingFilter('');
  };
  const sortBy = (key: SortKey) => {
    setSortDirection(sortEnabled && sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc');
    setSortKey(key);
    setSortEnabled(true);
  };
  const menuTour = tours?.find((tour) => tour.id === menu?.id);
  return <div className={`tours-manager${editingId ? ' tours-manager--editing' : ''}`}>
    <div className="tours-catalog" inert={Boolean(editingId)}>
      <div className="admin-header tours-heading">
        <div>
          <h1>Gestión de tours</h1>
          <p>Crea, edita y organiza tus tours, tarifas y contenido.</p>
        </div>
        <button className="tours-create" onClick={createTour}><AdminIcon name="plus" size={16} />Crear nuevo tour</button>
      </div>
      <div className="tours-metrics">
        {[

          {
            label: 'Tours activos',
            value: tours?.filter((tour) => tour.active).length,
            icon: 'tours',
            color: 'olive',
            detail: 'En el catálogo público'
          },

          {
            label: 'Tours destacados',
            value: tours?.filter((tour) => tour.featured).length,
            icon: 'star',
            color: 'gold',
            detail: 'En la portada'
          },

          { label: 'Destinos', value: destinations.length, icon: 'pin', color: 'blue', detail: 'Destinos disponibles' },

          {
            label: 'Tours inactivos',
            value: tours?.filter((tour) => !tour.active).length,
            icon: 'document',
            color: 'terracotta',
            detail: 'Fuera del catálogo'
          },

        ].map((metric) => <article className="tours-metric" key={metric.label}>
          <span className={`dash-metric__icon dash-metric__icon--${metric.color}`}>
            <AdminIcon name={metric.icon} size={25} />
          </span>
          <div>
            <h2>
              {metric.label}
            </h2>
            <strong>
              {tours ? metric.value : '—'}
            </strong>
            <small>
              {metric.detail}
            </small>
          </div>
        </article>)}
      </div>
      {error
        && <div className="admin-alert admin-alert--error" role="alert">
          {error}
          <button className="btn btn--ghost btn--sm" onClick={() => {
            setError('');
            void load();
          }}>Reintentar</button>
          <button
            className="tours-alert-close"
            onClick={() => setError('')}
            aria-label="Cerrar error"
          >
            <AdminIcon name="close" size={15} />
          </button>
        </div>}
      {okMsg
        && <div className="tours-feedback" role="status">
          <AdminIcon name="checkCircle" size={15} />
          {okMsg}
          <button onClick={() => setOkMsg('')} aria-label="Cerrar aviso">
            <AdminIcon name="close" size={13} />
          </button>
        </div>}
      <section className="tours-filters" aria-label="Filtros de tours">
        <div className="tours-filter-top">
          <div
            className="tours-status-tabs"
            role="group"
            aria-label="Estado de los tours"
          >
            {STATUS_FILTERS.map((filter) => <button
              key={filter.id}
              aria-pressed={status === filter.id}
              onClick={() => setStatus(filter.id)}
            >
              {filter.label}
            </button>)}
          </div>
          <button
            className="tours-category-button"
            onClick={() => setShowCatForm((value) => !value)}
            aria-expanded={showCatForm}
          ><AdminIcon name="plus" size={13} />Categoría</button>
        </div>
        <div className="tours-filter-row">
          <label className="tours-search">
            <AdminIcon name="search" size={16} />
            <input
              type="search"
              aria-label="Buscar tours"
              placeholder="Buscar tours…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <select
            aria-label="Filtrar por destino"
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
          >
            <option value="">Destino · Todos</option>
            {destinations.map((value) => <option key={value}>
              {value}
            </option>)}
          </select>
          <select
            aria-label="Filtrar por duración"
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
          >
            <option value="">Duración · Todas</option>
            {durations.map((value) => <option key={value}>
              {value}
            </option>)}
          </select>
          <select
            aria-label="Filtrar por dificultad"
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value)}
          >
            <option value="">Dificultad · Todas</option>
            {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => <option key={value} value={value}>
              {label}
            </option>)}
          </select>
          <select
            aria-label="Filtrar por categoría"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="">Categoría · Todas</option>
            {categories.map((cat) => <option key={cat.slug} value={cat.slug}>
              {cat.label}
            </option>)}
          </select>
          <button
            className={`tours-more-filters${extraFilters ? ' is-active' : ''}`}
            aria-expanded={extraFilters}
            onClick={() => setExtraFilters((value) => !value)}
          ><AdminIcon name="filter" size={15} />Filtros</button>
        </div>
        {extraFilters
          && <div className="tours-extra-filters">
            <label>Precio mínimo (USD)<input
              type="number"
              min="0"
              value={minPrice}
              onChange={(event) => setMinPrice(event.target.value)}
              placeholder="Sin mínimo"
            /></label>
            <label>Precio máximo (USD)<input
              type="number"
              min="0"
              value={maxPrice}
              onChange={(event) => setMaxPrice(event.target.value)}
              placeholder="Sin máximo"
            /></label>
            <label>Reservas<select value={bookingFilter} onChange={(event) => setBookingFilter(event.target.value)}>
              <option value="">Todas</option>
              <option value="with">Con reservas</option>
              <option value="without">Sin reservas</option>
            </select></label>
          </div>}
        {hasFilters
          && <div className="tours-filter-summary">
            <span>{filtered.length} {filtered.length === 1 ? 'tour encontrado' : 'tours encontrados'}</span>
            <button onClick={clearFilters}>Limpiar filtros <AdminIcon name="close" size={12} /></button>
          </div>}
      </section>
      {showCatForm
        && <form className="tours-category-form" onSubmit={(event) => {
          event.preventDefault();
          void addCategory();
        }}>
          <label>Nombre de la categoría<input
            value={catLabel}
            onChange={(event) => setCatLabel(event.target.value)}
            placeholder="Gastronomía"
            required
          /></label>
          <label>Emoji<input
            value={catEmoji}
            onChange={(event) => setCatEmoji(event.target.value)}
            placeholder="Opcional"
          /></label>
          <button className="btn btn--primary btn--sm" disabled={savingCat}>
            {savingCat ? 'Creando…' : 'Crear categoría'}
          </button>
        </form>}
      <div className="tours-table-wrap">
        <table className="tours-table">
          <colgroup>
            <col className="tours-col-name" />
            <col className="tours-col-destination" />
            <col className="tours-col-duration" />
            <col className="tours-col-price" />
            <col className="tours-col-difficulty" />
            <col className="tours-col-category" />
            <col className="tours-col-toggle" />
            <col className="tours-col-toggle" />
            <col className="tours-col-menu" />
          </colgroup>
          <thead>
            <tr>
              <th aria-sort={sortEnabled && sortKey === 'title' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}>
                <button onClick={() => sortBy('title')}>Tour {sortEnabled && sortKey === 'title' && <AdminIcon name="chevron" size={11} />}</button>
              </th>
              <th>
                <button onClick={() => sortBy('destination')}>Destino</button>
              </th>
              <th>Duración</th>
              <th>
                <button onClick={() => sortBy('price')}>Precio (USD)</button>
              </th>
              <th>Dificultad</th>
              <th>Categoría</th>
              <th>Activo</th>
              <th>Destacado</th>
              <th>
                <span className="admin-sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((tour) => <tr
              key={tour.id}
              className={editingId === tour.id ? 'is-selected' : ''}
              onClick={() => openTour(tour.id)}
            >
              <td>
                <button
                  className="tours-row-identity"
                  onClick={() => openTour(tour.id)}
                  aria-label={`Editar ${tour.title}`}
                >
                  <span className={`tours-row-select${editingId === tour.id ? ' is-selected' : ''}`}>
                    {editingId === tour.id && <AdminIcon name="check" size={11} />}
                  </span>
                  <img
                    src={tour.image || '/assets/andes-mountains.jpg'}
                    alt=""
                    width="64"
                    height="56"
                    loading="lazy"
                  />
                  <span>
                    <strong>
                      {tour.title}
                    </strong>
                    {isDraftTour(tour) && <span className="tours-draft-badge">Borrador</span>}
                    <small>ID: {tour.id.slice(0, 8)}</small>
                  </span>
                </button>
              </td>
              <td data-label="Destino" title={tour.destination}>
                {tour.destination || '—'}
              </td>
              <td data-label="Duración">
                {tour.duration || '—'}
              </td>
              <td data-label="Precio (USD)" className="tours-cell-price">
                {tourMoney(tour.price_group)}
              </td>
              <td data-label="Dificultad">
                <span className={`tours-difficulty tours-difficulty--${tour.difficulty.toLowerCase()}`}>
                  {DIFFICULTY_LABELS[tour.difficulty]}
                </span>
              </td>
              <td data-label="Categoría" title={categoryNames.get(tour.primary_category_slug)}>
                {categoryNames.get(tour.primary_category_slug) || tour.type_label || '—'}
              </td>
              {(['active', 'featured'] as const).map((field) => <td key={field} data-label={field === 'active' ? 'Activo' : 'Destacado'}>
                <button
                  className="tours-switch"
                  role="switch"
                  aria-checked={tour[field]}
                  aria-label={`${field === 'active' ? 'Activo' : 'Destacado'}: ${tour.title}`}
                  disabled={busyIds.has(tour.id)}
                  onClick={(event) => {
                    event.stopPropagation();
                    void toggleTour(tour, field);
                  }}
                >
                  <span />
                </button>
              </td>)}
              <td>
                <button
                  data-tour-menu-trigger
                  className="tours-row-menu-trigger"
                  aria-label={`Acciones de ${tour.title}`}
                  aria-expanded={menu?.id === tour.id}
                  aria-haspopup="menu"
                  id={menuId + '-' + tour.id}
                  aria-controls={menu?.id === tour.id ? menuId : undefined}
                  onClick={event => {
                    event.stopPropagation();
                    if (menu?.id === tour.id) closeMenu();
                    else openMenu(tour.id, event.currentTarget);
                  }}
                  onKeyDown={event => {
                    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                      event.preventDefault();
                      event.stopPropagation();
                      openMenu(tour.id, event.currentTarget, event.key === 'ArrowUp');
                    }
                  }}
                >
                  <AdminIcon name="more" size={17} />
                </button>
              </td>
            </tr>)}
          </tbody>
        </table>
        {tours === null && <div className="tours-empty" role="status"><span className="admin-access__spinner" />Cargando catálogo…</div>}
        {tours !== null && !error && pageRows.length === 0
          && <EmptyState
            image="generic"
            title={hasFilters ? 'No encontramos tours con estos filtros' : 'Tu próxima aventura empieza aquí'}
            text={hasFilters ? 'Prueba con otro destino o limpia los filtros.' : 'Crea tu primer tour y prepara nuevas experiencias para tus viajeros.'}
            action={{ label: hasFilters ? 'Limpiar filtros' : 'Crear nuevo tour', onClick: hasFilters ? clearFilters : createTour }}
          />}
      </div>
      <footer className="tours-pagination">
        <span>
          {filtered.length ? `Mostrando ${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filtered.length)} de ${filtered.length} tours` : '0 tours'}
        </span>
        <nav aria-label="Páginas de tours">
          <button
            aria-label="Página anterior"
            disabled={currentPage === 1}
            onClick={() => setPage(currentPage - 1)}
          >
            <AdminIcon name="left" size={15} />
          </button>
          {Array.from({ length: totalPages }, (_, index) => index + 1).filter((number) => number === 1 || number === totalPages || Math.abs(number - currentPage) <= 1).map((number, index, numbers) => <span key={number}>
            {index > 0 && number - numbers[index - 1] > 1 && <i>…</i>}
            <button
              aria-label={`Página ${number}`}
              aria-current={currentPage === number ? 'page' : undefined}
              onClick={() => setPage(number)}
            >
              {number}
            </button>
          </span>)}
          <button
            aria-label="Página siguiente"
            disabled={currentPage === totalPages}
            onClick={() => setPage(currentPage + 1)}
          >
            <AdminIcon name="right" size={15} />
          </button>
        </nav>
        <label>Por página<select
          aria-label="Tours por página"
          value={pageSize}
          onChange={(event) => setPageSize(Number(event.target.value))}
        >
          {[5, 10, 20, 50].map((value) => <option key={value}>
            {value}
          </option>)}
        </select></label>
      </footer>
    </div>
    {editingId
      && <TourEditor
        key={`${editingId}-${editorSequence}`}
        tour={editingTour}
        initialData={editorSeed}
        categories={categories}
        busy={editingTour ? busyIds.has(editingTour.id) : false}
        onClose={closeEditor}
        onDuplicate={duplicate}
        onToggleActive={async () => {
          if (editingTour && await toggleTour(editingTour, 'active') === 'failed')
            throw new Error('No se pudo cambiar el estado. Revisa la conexión y vuelve a intentarlo.');
        }}
        onSaved={async (id) => {
          if (!await load())
            throw new Error('El tour se guardó, pero no se pudo actualizar el catálogo. Reintenta guardar para actualizarlo.');
          setEditorSeed(null);
          setEditingId(id);
          setEditorSequence(value => value + 1);
          setOkMsg('Los cambios del tour se guardaron.');
        }}
      />}
    {menu && menuTour && createPortal(
      <div
        id={menuId}
        className="tours-row-menu"
        ref={menuRef}
        role="menu"
        aria-labelledby={menuId + '-' + menuTour.id}
        style={{ top: menu.top, left: menu.left }}
        onKeyDown={menuKeyDown}
      >
        <button role="menuitem" tabIndex={-1} onClick={() => openTour(menuTour.id)}>
          <AdminIcon name="document" size={15} />Editar tour
        </button>
        <button role="menuitem" tabIndex={-1} onClick={() => duplicate(makeAdminTourForm(menuTour))}>
          <AdminIcon name="copy" size={15} />Duplicar
        </button>
        <Link role="menuitem" tabIndex={-1} href={'/admin?tab=disponibilidad&tour=' + menuTour.id} onClick={() => setMenu(null)}>
          <AdminIcon name="calendar" size={15} />Gestionar salidas
        </Link>
        <button
          role="menuitem"
          tabIndex={-1}
          onClick={() => {
            closeMenu();
            void toggleTour(menuTour, 'active');
          }}
          disabled={busyIds.has(menuTour.id)}
        >
          <AdminIcon name="power" size={15} />
          {menuTour.active ? 'Desactivar' : 'Activar'}
        </button>
        <button role="menuitem" tabIndex={-1} className="is-danger" onClick={() => void remove(menuTour)}>
          <AdminIcon name="trash" size={15} />
          {menuTour.reservation_count ? 'Retirar del catálogo' : 'Eliminar tour'}
        </button>
      </div>,
      document.body,
    )}
  </div>;
}
