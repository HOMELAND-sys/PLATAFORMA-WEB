'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import AdminIcon from './AdminIcon';
import EmptyState, { type EmptyAction, type EmptyImage } from './EmptyState';

export function Notice({ error, success }: {
  error?: string;
  success?: string;
}) {
  return <>
    {error && <div className="admin-alert admin-alert--error" role="alert">
      {error}
    </div>}
    {success && <div className="admin-alert admin-alert--ok" role="status">
      {success}
    </div>}
  </>;
}

export function LoadState({ loading, error, empty, onRetry, label = 'No hay registros con estos filtros.', emptyImage = 'generic', emptyTitle = 'Sin resultados', emptyAction }: {
  loading: boolean;
  error: string;
  empty: boolean;
  onRetry: () => void;
  label?: string;
  emptyImage?: EmptyImage;
  emptyTitle?: string;
  emptyAction?: EmptyAction;
}) {
  if (loading)
    return <div className="admin-empty" role="status">Cargando datos…</div>;
  if (error)
    return <div className="admin-alert admin-alert--error" role="alert">{error} <button className="btn btn--ghost btn--sm" onClick={onRetry}>Reintentar</button></div>;
  return empty ? <EmptyState
    image={emptyImage}
    title={emptyTitle}
    text={label}
    action={emptyAction ?? { label: 'Actualizar', onClick: onRetry }}
  /> : null;
}

export function Field({ label, children, wide = false }: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return <label className={`ops-field${wide ? ' ops-field--wide' : ''}`}>
    <span>
      {label}
    </span>
    {children}
  </label>;
}

export function Modal({ title, onClose, children, wide = false }: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
    };
  }, []);
  return <dialog
    ref={ref}
    className={`ops-modal${wide ? ' ops-modal--wide' : ''}`}
    aria-labelledby={id}
    onCancel={e => {
      e.preventDefault();
      onClose();
    }}
    onClick={e => {
      if (e.target === ref.current)
        onClose();
    }}
  >
    <div className="ops-modal__inner">
      <header className="ops-modal__head">
        <h2 id={id}>
          {title}
        </h2>
        <button
          type="button"
          className="btn btn--ghost btn--sm"
          onClick={onClose}
          aria-label="Cerrar panel"
        >
          <AdminIcon name="close" />
        </button>
      </header>
      <div className="ops-modal__body">
        {children}
      </div>
    </div>
  </dialog>;
}

export function Pill({ children, tone = 'green' }: {
  children: ReactNode;
  tone?: 'green' | 'amber' | 'red' | 'gray';
}) {
  return <span className={`badge-status badge-status--${tone}`}>
    <span className="dot" />
    {children}
  </span>;
}

export function Metrics({ items }: {
  items: {
    label: string;
    value: ReactNode;
  }[];
}) {
  return <div className="ops-metrics">
    {items.map(item => <article className="admin-card" key={item.label}>
      <small>
        {item.label}
      </small>
      <strong>
        {item.value}
      </strong>
    </article>)}
  </div>;
}
