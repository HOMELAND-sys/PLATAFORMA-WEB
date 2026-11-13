import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Datos de la empresa y políticas que el sitio público muestra en el pie,
 * WhatsApp, páginas legales y fichas. Se editan en el panel
 * (Configuraciones → Empresa / Políticas) y se leen de `settings`.
 */
export interface SiteCompany {
  name: string;
  phones: string;
  whatsapp: string;
  email: string;
  address: string;
  facebook: string;
  instagram: string;
  tiktok: string;
  website: string;
  license: string;
}

export interface SitePolicies {
  free_cancellation_hours: number;
  default_cutoff_hours: number;
  cancellation_fee_pct: number;
  policy_text: string;
}

export interface SiteSettings {
  company: SiteCompany;
  policies: SitePolicies;
}

export const DEFAULT_COMPANY: SiteCompany = {
  name: 'Homeland Tours',
  phones: '',
  whatsapp: '',
  email: '',
  address: '',
  facebook: '',
  instagram: '',
  tiktok: '',
  website: 'https://www.homeland.tours',
  license: '',
};

export const DEFAULT_POLICIES: SitePolicies = {
  free_cancellation_hours: 48,
  default_cutoff_hours: 24,
  cancellation_fee_pct: 10,
  policy_text:
    'Puedes cancelar hasta 48 horas antes del inicio del tour y te reembolsamos el total menos un cargo administrativo del 10 %. Si cancelas dentro de las 48 horas previas al viaje, o no te presentas, no se realizan devoluciones. El itinerario puede variar por condiciones externas como carreteras en mantenimiento o lluvias.',
};

export const DEFAULT_SITE: SiteSettings = { company: DEFAULT_COMPANY, policies: DEFAULT_POLICIES };

// En producción debe coincidir con el dominio publicado (metadatos y sitemap).
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.homeland.tours').replace(/\/+$/, '');

function clean<T extends object>(defaults: T, value: unknown): T {
  if (!value || typeof value !== 'object') return defaults;
  const out = { ...defaults } as Record<string, unknown>;
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (!(k in out)) continue;
    if (typeof out[k] === 'number') {
      const n = Number(v);
      if (Number.isFinite(n)) out[k] = n;
    } else if (typeof v === 'string') {
      out[k] = v.trim();
    }
  }
  return out as T;
}

/** Lee empresa y políticas. Ante cualquier fallo devuelve los valores por defecto. */
export async function fetchSiteSettings(sb: SupabaseClient): Promise<SiteSettings> {
  try {
    const { data, error } = await sb.from('settings').select('key, value').in('key', ['company', 'policies']);
    if (error || !data) return DEFAULT_SITE;
    const map = new Map(data.map((r) => [r.key as string, r.value as unknown]));
    return {
      company: clean(DEFAULT_COMPANY, map.get('company')),
      policies: clean(DEFAULT_POLICIES, map.get('policies')),
    };
  } catch {
    return DEFAULT_SITE;
  }
}

/** Solo dígitos, con código de país: lo que espera wa.me. */
export function whatsappDigits(raw: string): string {
  return (raw || '').replace(/\D/g, '');
}

/** Enlace wa.me con mensaje opcional; null si la empresa aún no cargó su WhatsApp. */
export function whatsappUrl(company: SiteCompany, message?: string): string | null {
  const digits = whatsappDigits(company.whatsapp);
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}

/** Primer teléfono de la lista (admite varios separados por coma, barra o salto). */
export function primaryPhone(company: SiteCompany): string {
  return (company.phones || '').split(/[,/\n;]+/)[0]?.trim() ?? '';
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

/** URL absoluta de una red social a partir de la URL o del usuario. */
export function socialUrl(network: 'facebook' | 'instagram' | 'tiktok', value: string): string | null {
  const v = (value || '').trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  const handle = v.replace(/^@/, '');
  if (network === 'facebook') return `https://www.facebook.com/${handle}`;
  if (network === 'instagram') return `https://www.instagram.com/${handle}`;
  return `https://www.tiktok.com/@${handle}`;
}

/** "Cancelación hasta 48 h antes" — texto corto reutilizado en tarjetas y fichas. */
export function cancellationShort(hours: number): string {
  if (!hours || hours <= 0) return '';
  if (hours % 24 === 0 && hours > 72) return `Cancelación hasta ${hours / 24} días antes`;
  return `Cancelación hasta ${hours} h antes`;
}
