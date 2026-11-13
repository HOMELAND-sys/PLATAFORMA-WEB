import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Zonas privadas o sin valor de búsqueda: panel, cuenta y pasos de la reserva.
        disallow: [
          '/admin',
          '/booking',
          '/bookings',
          '/confirmation',
          '/favoritos',
          '/login',
          '/register',
          '/forgot',
          '/reset',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
