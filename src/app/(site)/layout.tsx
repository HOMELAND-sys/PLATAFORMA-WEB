import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import WhatsAppFab from '@/components/layout/WhatsAppFab';

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header withDropdown />
      <main>{children}</main>
      <Footer />
      <WhatsAppFab />
    </>
  );
}
