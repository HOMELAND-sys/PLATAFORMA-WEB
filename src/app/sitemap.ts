import type { MetadataRoute } from 'next';
import { getSupabaseServer } from '@/lib/supabase';
import { fetchActiveTours } from '@/lib/api';
import { SITE_URL } from '@/lib/site';

export const revalidate = 3600;

const STATIC_PATHS: { path: string; priority: number; changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly' }[] = [
  { path: '/', priority: 1, changeFrequency: 'daily' },
  { path: '/tours', priority: 0.9, changeFrequency: 'daily' },
  { path: '/customize', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/business', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/nosotros', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/preguntas-frecuentes', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/politica-de-cancelacion', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/terminos', priority: 0.2, changeFrequency: 'yearly' },
  { path: '/privacidad', priority: 0.2, changeFrequency: 'yearly' },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((p) => ({
    url: `${SITE_URL}${p.path === '/' ? '' : p.path}`,
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));

  try {
    const tours = await fetchActiveTours(getSupabaseServer());
    for (const tour of tours) {
      entries.push({
        url: `${SITE_URL}/tours/${tour.slug}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }
  } catch {
    // Si la base de datos no responde, el sitemap sale solo con las páginas fijas.
  }

  return entries;
}
