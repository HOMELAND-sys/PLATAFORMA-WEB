import type { IconName } from '@/components/ui/Icon';
import type { Difficulty, Tour, TourType } from '@/lib/types';

/** Textos e iconos compartidos para mostrar un tour (tarjeta, ficha, reserva). */

export const TYPE_LABEL: Record<TourType, string> = {
  group: 'Tour compartido',
  semi: 'Tour semiprivado',
  private: 'Tour privado',
};

export const TYPE_SHORT: Record<TourType, string> = {
  group: 'Compartido',
  semi: 'Semiprivado',
  private: 'Privado',
};

export const TYPE_HINT: Record<TourType, string> = {
  group: 'Viajas con otros viajeros en un grupo reducido.',
  semi: 'Grupo pequeño, con más flexibilidad y atención.',
  private: 'Solo tu grupo, a tu ritmo, con vehículo y guía exclusivos.',
};

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  Easy: 'Exigencia baja',
  Moderate: 'Exigencia media',
  Challenging: 'Exigencia alta',
};

export const DIFFICULTY_LEVEL: Record<Difficulty, 1 | 2 | 3> = {
  Easy: 1,
  Moderate: 2,
  Challenging: 3,
};

export type ServiceKind = 'private' | 'group';
export const SERVICE_LABEL: Record<ServiceKind, string> = {
  private: 'Tour privado',
  group: 'Tour grupal',
};

/** Etiqueta de servicio cuando el producto se vende de una sola forma. */
export function serviceKind(tour: Pick<Tour, 'availableTypes'>): ServiceKind | null {
  const types = tour.availableTypes ?? [];
  if (types.length === 0) return null;
  if (types.every((t) => t === 'private')) return 'private';
  if (types.every((t) => t !== 'private')) return 'group';
  return null;
}

/** Icono para cada comida del itinerario. */
export function mealIcon(): IconName {
  return 'meal';
}

/**
 * "Transporte privado: cómoda unidad…" → { head, text }. Así se agrupan los
 * incluidos por categoría, como en los itinerarios impresos de Homeland.
 */
export function splitLabel(item: string): { head: string | null; text: string } {
  const m = item.match(/^([^:]{2,32}):\s+(.+)$/);
  if (!m) return { head: null, text: item };
  const text = m[2].trim();
  return { head: m[1].trim(), text: text.charAt(0).toUpperCase() + text.slice(1) };
}

export function groupByHead(items: string[]): { head: string | null; items: string[] }[] {
  const groups: { head: string | null; items: string[] }[] = [];
  for (const raw of items) {
    const { head, text } = splitLabel(raw);
    const last = groups[groups.length - 1];
    if (head && last && last.head === head) last.items.push(text);
    else groups.push({ head, items: [text] });
  }
  return groups;
}

const INCLUDE_ICONS: [RegExp, IconName][] = [
  [/transporte|traslado|recojo|bus|veh[ií]culo/i, 'route'],
  [/hospedaje|alojamiento|hotel|hostal|noche/i, 'bed'],
  [/entrada|ingreso|boleto|ticket/i, 'ticket'],
  [/gu[ií]a|personal/i, 'award'],
  [/aliment|comida|desayuno|almuerzo|cena|agua/i, 'meal'],
  [/equipo|casco|linterna/i, 'backpack'],
  [/foto/i, 'eye'],
];

export function includeIcon(text: string): IconName {
  return INCLUDE_ICONS.find(([re]) => re.test(text))?.[1] ?? 'check-circle';
}

const BRING_ICONS: [RegExp, IconName][] = [
  [/ropa|chaqueta|abrig|calcet|muda|gorro|chalina|traje/i, 'backpack'],
  [/calzado|zapat|bota/i, 'route'],
  [/gafas|sol|bloqueador|protector|gorra|sombrero/i, 'sun'],
  [/agua|botella/i, 'meal'],
  [/c[aá]mara|foto/i, 'eye'],
  [/dinero|efectivo/i, 'money'],
  [/repelente/i, 'leaf'],
  [/documento|pasaporte|carnet/i, 'document'],
];

export function bringIcon(text: string): IconName {
  return BRING_ICONS.find(([re]) => re.test(text))?.[1] ?? 'check';
}

/** "2026-11-14" → "sáb, 14 nov 2026" (sin desfase de zona horaria). */
export function fmtDate(
  iso: string,
  opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' },
): string {
  if (!iso) return '';
  return new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', opts);
}

export function fmtTime(time?: string | null): string {
  return time ? time.slice(0, 5) : '';
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
