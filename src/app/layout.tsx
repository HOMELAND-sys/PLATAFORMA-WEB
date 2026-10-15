import type { Metadata } from 'next';
import { AuthProvider } from '@/context/AuthContext';
import { BookingProvider } from '@/context/BookingContext';
import { Analytics } from '@/components/layout/Analytics';
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

export const metadata: Metadata = {
  metadataBase: new URL('https://homeland.tours'),
  title: {
    default: 'Homeland Tours · Authentic Bolivian Journeys',
    template: '%s · Homeland Tours',
  },
  description:
    'Operador turístico local en Bolivia. Descubre el Salar de Uyuni, La Paz, Amazonía y la Cordillera con experiencias auténticas y operadores locales.',
  openGraph: {
    type: 'website',
    locale: 'es_BO',
    siteName: 'Homeland Tours',
    images: [
      {
        url: '/assets/og-homeland.png',
        width: 1200,
        height: 1200,
        alt: 'Homeland Tours — Bolivian Tour Operator',
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          <BookingProvider>{children}</BookingProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
