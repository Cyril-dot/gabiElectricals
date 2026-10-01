'use client';
import { useEffect, useState } from 'react';

export function FloatingButtons({ phone, whatsapp }: { phone: string; whatsapp: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 1200);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  const tel = (n: string) => n.replace(/\s/g, '');
  return (
    <div className="fixed bottom-4 left-4 z-[60] flex flex-col gap-2.5" aria-label="Quick contact">
      <a
        href={`https://wa.me/${tel(whatsapp).replace('+', '')}?text=${encodeURIComponent('Hello GabiElectricals! I need help with:')}`}
        target="_blank" rel="noopener noreferrer"
        className="w-13 h-13 rounded-full bg-[#25D366] text-white grid place-items-center shadow-pop hover:scale-105 transition-transform"
        style={{ width: 52, height: 52 }}
        aria-label="Chat on WhatsApp"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.1-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.2 1.2-1.7 1.2-.4.1-1 .1-1.6-.1a12 12 0 0 1-5.6-4.9c-.6-1-1-2.2-.5-3.1.2-.5.8-1.2 1.2-1.1.4 0 .7.9 1 1.4.2.4.4.8.3 1.1-.1.3-.5.8-.4 1 .5 1.4 1.9 2.7 3.3 3.2.3.1.8-.3 1-.4.3-.1.7.1 1.1.3.5.3 1.4.6 1.4 1 0 .3 0 .9-.5 1.4z" /></svg>
      </a>
      <a href={`tel:${tel(phone)}`} className="rounded-full bg-blue text-white grid place-items-center shadow-pop hover:scale-105 transition-transform" style={{ width: 52, height: 52 }} aria-label="Call now">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.4 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.4 1.9.6 2.9.8a2 2 0 0 1 1.7 2z" /></svg>
      </a>
    </div>
  );
}
