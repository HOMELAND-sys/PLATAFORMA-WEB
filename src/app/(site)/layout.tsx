import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import WhatsAppFab from '@/components/layout/WhatsAppFab';
import LogoIntro from '@/components/brand/LogoIntro';

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
