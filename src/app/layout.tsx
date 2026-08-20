import type { Metadata } from 'next';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import WhatsAppFab from '@/components/layout/WhatsAppFab';
import { BookingProvider } from '@/context/BookingContext';
import './globals.css';
import '@/styles/main.css';
import '@/styles/components.css';
import '@/styles/forms.css';
import '@/styles/forms-extra.css';
import '@/styles/booking.css';
import '@/styles/tours.css';
import '@/styles/tour-detail.css';
import '@/styles/confirmation.css';

export const metadata: Metadata = {
  title: {
    default: 'Homeland Tours · Authentic Bolivian Journeys',
    template: '%s · Homeland Tours',
  },
  description:
    'Operador turístico local en Bolivia. Descubre el Salar de Uyuni, La Paz, Amazonía y la Cordillera con experiencias auténticas y operadores locales.',
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
        <BookingProvider>
          <Header withDropdown />
          <main>{children}</main>
          <Footer />
          <WhatsAppFab />
        </BookingProvider>
      </body>
    </html>
  );
}
