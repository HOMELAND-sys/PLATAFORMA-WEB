'use client';

import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { CLOSED_CONFIRMATION, createConfirmationController, trapConfirmationFocus, type ConfirmOptions, } from '@/lib/admin/confirmation';
type Confirm = (options: ConfirmOptions) => Promise<boolean>;
const ConfirmContext = createContext<Confirm | null>(null);
interface Props {
  options: ConfirmOptions;
  busy: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ options, busy, error, onConfirm, onCancel }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog?.showModal();
    cancelRef.current?.focus();
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus();
    };
  }, []);
  useEffect(() => {
    if (busy)
      dialogRef.current?.focus();
    else
      cancelRef.current?.focus();
  }, [busy]);
  return (<dialog
    ref={dialogRef}
    className="admin-confirm"
    role="alertdialog"
    aria-modal="true"
    aria-labelledby={`${id}-title`}
    aria-describedby={`${id}-message`}
    aria-busy={busy}
    tabIndex={-1}
    onCancel={event => {
      event.preventDefault();
      if (!busy)
        onCancel();
    }}
    onKeyDown={event => trapConfirmationFocus(event, dialogRef.current)}
  >
    <h2 id={`${id}-title`}>
      {options.title}
    </h2>
    <p id={`${id}-message`}>
      {options.message}
    </p>
    {error && <p className="admin-alert admin-alert--error" role="alert">
      {error}
    </p>}
    {busy && <p className="ops-muted" role="status">Procesando…</p>}
    <div className="admin-confirm__actions">
      <button
        ref={cancelRef}
        type="button"
        className="btn btn--ghost"
        disabled={busy}
        onClick={onCancel}
      >
        {options.cancelLabel ?? 'Volver'}
      </button>
      <button
        type="button"
        className={`btn btn--primary${options.destructive ? ' admin-confirm__danger' : ''}`}
        disabled={busy}
        onClick={onConfirm}
      >
        {busy ? 'Procesando…' : options.confirmLabel ?? 'Confirmar'}
      </button>
    </div>
  </dialog>);
}

export function ConfirmProvider({ children }: {
  children: ReactNode;
}) {
  const [state, setState] = useState(CLOSED_CONFIRMATION);
  const [controller] = useState(() => createConfirmationController(setState));
  useEffect(() => () => controller.dispose(), [controller]);
  return (<ConfirmContext.Provider value={controller.ask}>
    {children}
    {state.options
      && (<ConfirmDialog
        options={state.options}
        busy={state.busy}
        error={state.error}
        onConfirm={() => void controller.accept()}
        onCancel={controller.cancel}
      />)}
  </ConfirmContext.Provider>);
}

export function useConfirm(): Confirm {
  const confirm = useContext(ConfirmContext);
  if (!confirm)
    throw new Error('useConfirm requiere ConfirmProvider en el panel admin.');
  return confirm;
}
