import type { ConfirmOptions } from './confirmation';

export async function changeTourVisibility(
  tour: { title: string; active: boolean },
  confirm: (options: ConfirmOptions) => Promise<boolean>,
  apply: () => Promise<void>,
): Promise<boolean> {
  if (!tour.active) {
    await apply();
    return true;
  }
  return confirm({
    title: 'Desactivar tour',
    message: `Se ocultará del catálogo público el tour “${tour.title}”. Las reservas y el historial se conservarán.`,
    confirmLabel: 'Desactivar',
    destructive: true,
    onConfirm: apply,
  });
}

export function tourMenuPosition(
  anchor: { top: number; bottom: number; right: number },
  menu: { width: number; height: number },
  viewport: { width: number; height: number },
): { top: number; left: number } {
  const margin = 12;
  const gap = 5;
  const width = Math.min(menu.width, Math.max(0, viewport.width - margin * 2));
  const height = Math.min(menu.height, Math.max(0, viewport.height - margin * 2));
  const below = anchor.bottom + gap;
  const preferredTop = below + height <= viewport.height - margin ? below : anchor.top - gap - height;
  return {
    top: Math.max(margin, Math.min(preferredTop, viewport.height - margin - height)),
    left: Math.max(margin, Math.min(anchor.right - width, viewport.width - margin - width)),
  };
}

export function tourMenuFocusIndex(key: string, current: number, count: number): number | null {
  if (!count) return null;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  if (key === 'ArrowDown') return (current + 1 + count) % count;
  if (key === 'ArrowUp') return (current - 1 + count) % count;
  return null;
}
