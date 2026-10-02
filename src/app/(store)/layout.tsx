import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/CartDrawer';
import { FloatingButtons } from '@/components/FloatingButtons';
import { getSettings } from '@/lib/settings';
import { PopupHost } from '@/components/PopupHost';
import { RefTracker } from '@/components/RefTracker';
import { ChatWidget } from '@/components/ChatWidget';
import { CookieConsent } from '@/components/CookieConsent';

export const dynamic = 'force-dynamic';

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const biz = (await getSettings()).business;
  return (
    <>
      <Header />
      <main id="main" className="flex-1">{children}</main>
      <Footer />
      <CartDrawer />
      <FloatingButtons phone={biz.phone} whatsapp={biz.whatsapp} />
      <PopupHost />
      <RefTracker />
      <ChatWidget whatsapp={biz.whatsapp} />
      <CookieConsent />
    </>
  );
}
