import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import WhatsAppFab from '@/components/layout/WhatsAppFab';
import LogoIntro from '@/components/brand/LogoIntro';
import { SiteProvider } from '@/context/SiteContext';
import { getSupabaseServer } from '@/lib/supabase';
import { fetchSiteSettings } from '@/lib/site';
import '@/styles/web-footer.css';
import '@/styles/web-booking.css';
import '@/styles/web-pages.css';

// Los datos de la empresa (teléfono, WhatsApp, redes) se editan en el panel
// y llegan al sitio en menos de un minuto.
export const revalidate = 60;

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const site = await fetchSiteSettings(getSupabaseServer());
  return (
    <SiteProvider value={site}>
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <LogoIntro />
      <Header withDropdown />
      <main id="contenido">{children}</main>
      <Footer />
      <WhatsAppFab />
    </SiteProvider>
  );
}
