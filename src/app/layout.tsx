import type { Metadata, Viewport } from 'next';
import { Manrope, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/Toast';

const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' });
const grotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-grotesk', display: 'swap', weight: ['500', '600', '700'] });

const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  title: { default: 'GabiElectricals — Premium Electrical Products & Certified Electricians in Ghana', template: '%s | GabiElectricals' },
  description: 'Buy 100% genuine cables, breakers, solar, inverters and lighting with same-day Accra delivery. Book NIET-certified electricians for wiring, faults, CCTV and solar. Pay by MoMo, card, bank or QR.',
  metadataBase: new URL(SITE),
  openGraph: { title: 'GabiElectricals — Premium Power. Trusted Safety. Done Right.', description: 'Genuine electrical products & certified electricians across Ghana. MoMo, card & QR payments.', siteName: 'GabiElectricals', type: 'website', locale: 'en_GH' },
  twitter: { card: 'summary_large_image', title: 'GabiElectricals Ghana', description: 'Premium electrical products & certified electricians.' },
  robots: { index: true, follow: true },
  manifest: '/manifest.webmanifest',
  icons: { icon: '/images/brand/logo-mark.webp', apple: '/images/brand/logo-mark.webp' },
};

export const viewport: Viewport = { themeColor: '#141311', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.theme==='dark'||(!localStorage.theme&&matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')}catch(e){}` }} />
      </head>
      <body className={`${manrope.variable} ${grotesk.variable} font-sans min-h-dvh flex flex-col`}>
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-blue focus:text-white focus:px-4 focus:py-2 focus:rounded-lg">Skip to content</a>
        <ToastProvider>
          {children}
        </ToastProvider>
        <script dangerouslySetInnerHTML={{ __html: `
// GA4 / Meta Pixel ready — populated from Settings when keys are provided (see README analytics)
window.dataLayer=window.dataLayer||[];
if('serviceWorker' in navigator && !location.pathname.startsWith('/admin'))addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));` }} />
      </body>
    </html>
  );
}
