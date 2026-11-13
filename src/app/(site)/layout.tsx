import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import WhatsAppFab from '@/components/layout/WhatsAppFab';
import LogoIntro from '@/components/brand/LogoIntro';
import '@/styles/web-footer.css';
import '@/styles/web-booking.css';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <LogoIntro />
      <Header withDropdown />
      <main>{children}</main>
      <Footer />
      <WhatsAppFab />
    </>
  );
}
