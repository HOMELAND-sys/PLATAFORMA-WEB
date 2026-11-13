import { messageOf } from './core';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm?: () => Promise<unknown> | unknown;
}

export interface ConfirmationState {
  options: ConfirmOptions | null;
  busy: boolean;
  error: string;
}

export const CLOSED_CONFIRMATION: ConfirmationState = {
  options: null,
  busy: false,
  error: '',
};

export function trapConfirmationFocus(
  event: Pick<KeyboardEvent, 'key' | 'shiftKey' | 'preventDefault'>,
  dialog: HTMLDialogElement | null,
): void {
  if (event.key !== 'Tab' || !dialog) return;
  const controls = Array.from(dialog.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
  const first = controls[0];
  const last = controls.at(-1);
  if (!first) {
    event.preventDefault();
    dialog.focus();
  } else if (!dialog.contains(document.activeElement)) {
    event.preventDefault();
    first.focus();
  } else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {
    event.preventDefault();
    first.focus();
  }
}

export function createConfirmationController(onChange: (state: ConfirmationState) => void) {
  let request: { options: ConfirmOptions; resolve: (accepted: boolean) => void } | null = null;
  let busy = false;

  function finish(accepted: boolean, notify = true) {
    const pending = request;
    request = null;
    busy = false;
    if (notify) onChange(CLOSED_CONFIRMATION);
    pending?.resolve(accepted);
  }

  function ask(options: ConfirmOptions): Promise<boolean> {
    // Un segundo clic nunca sustituye la confirmación que ya está abierta.
    if (request) return Promise.resolve(false);
    return new Promise(resolve => {
      request = { options, resolve };
      onChange({ options, busy: false, error: '' });
    });
  }

  async function accept(): Promise<void> {
    if (!request || busy) return;
    const pending = request;
    busy = true;
    onChange({ options: pending.options, busy: true, error: '' });
    try {
      await pending.options.onConfirm?.();
      if (request === pending) finish(true);
    } catch (error) {
      if (request !== pending) return;
      busy = false;
      onChange({ options: pending.options, busy: false, error: messageOf(error) });
    }
  }

  function cancel() {
    if (!busy) finish(false);
  }

  return { ask, accept, cancel, dispose: () => finish(false, false) };
}
