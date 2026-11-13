import type { Metadata, Viewport } from 'next';
import { Inter, Quicksand, Space_Mono } from 'next/font/google';
import { AuthProvider } from '@/context/AuthContext';
import { BookingProvider } from '@/context/BookingContext';
import { FavoritesProvider } from '@/context/FavoritesContext';
import { Analytics } from '@/components/layout/Analytics';
import { SITE_URL } from '@/lib/site';
import './globals.css';
import '@/styles/main.css';
import '@/styles/components.css';
import '@/styles/forms.css';
import '@/styles/forms-extra.css';
import '@/styles/booking.css';
import '@/styles/tours.css';
import '@/styles/tour-detail.css';
import '@/styles/confirmation.css';
import '@/styles/auth.css';
import '@/styles/admin.css';
import '@/styles/admin-tours.css';
import '@/styles/icons.css';
import '@/styles/intro.css';
import '@/styles/brand.css';

// Tipografía de marca: Quicksand (la de los itinerarios de Homeland) para
// títulos y etiquetas, Inter para lectura. Se sirven desde el propio sitio.
const display = Quicksand({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--ff-display',
  display: 'swap',
});
const sans = Inter({
  subsets: ['latin'],
  variable: '--ff-sans',
  display: 'swap',
});
const mono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--ff-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Homeland Tours · Tours y experiencias en Bolivia',
    template: '%s · Homeland Tours',
  },
  description:
    'Operadora de turismo boliviana. Reserva online tours al Salar de Uyuni, Sajama, Toro Toro, La Paz, el lago Titicaca y la Amazonía, con guías locales y salidas confirmadas.',
  applicationName: 'Homeland Tours',
  keywords: [
    'tours en Bolivia',
    'Salar de Uyuni',
    'Sajama',
    'Toro Toro',
    'La Paz',
    'lago Titicaca',
    'operadora de turismo Bolivia',
    'Homeland Tours',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'es_BO',
    siteName: 'Homeland Tours',
    title: 'Homeland Tours · Tours y experiencias en Bolivia',
    description:
      'Reserva online tours por Bolivia con una operadora local: salidas confirmadas, guías locales y atención directa.',
    images: [
      {
        url: '/assets/og-homeland.png',
        width: 1200,
        height: 1200,
        alt: 'Homeland Tours — Bolivian Tour Operator',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Homeland Tours · Tours y experiencias en Bolivia',
    description: 'Reserva online tours por Bolivia con una operadora local.',
    images: ['/assets/og-homeland.png'],
  },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#232d13',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <AuthProvider>
          <BookingProvider>
            <FavoritesProvider>{children}</FavoritesProvider>
          </BookingProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
