'use client';
import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { useDraggableFab } from './useDraggableFab';

export function FloatingButtons({ phone, whatsapp }: { phone: string; whatsapp: string }) {
  const [show, setShow] = useState(false);
  const fab = useDraggableFab('gabi-fab-pos');
  useEffect(() => {
    const t = setTimeout(() => setShow(true), 1200);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  const tel = (n: string) => n.replace(/\s/g, '');
  return (
    <div
      ref={fab.ref}
      style={fab.style}
      {...fab.dragHandlers}
      title="Drag to move"
      className="fixed bottom-4 left-4 z-[60] flex flex-col items-center gap-2.5 cursor-grab active:cursor-grabbing touch-none select-none"
      aria-label="Quick contact — drag to reposition"
    >
      <span className="flex gap-[3px] opacity-0 hover:opacity-60 transition-opacity" aria-hidden="true">
        {[0, 1, 2].map(k => <span key={k} className="w-1 h-1 rounded-full bg-white/80" />)}
      </span>
      <a draggable={false}
        href={`https://wa.me/${tel(whatsapp).replace('+', '')}?text=${encodeURIComponent('Hello GabiElectricals! I need help with:')}`}
        target="_blank" rel="noopener noreferrer"
        className="rounded-full bg-[#25D366] text-white grid place-items-center shadow-pop hover:scale-110 hover:rotate-6 transition-transform duration-300 animate-scale-in"
        style={{ width: 52, height: 52 }}
        aria-label="Chat on WhatsApp"
      >
        <Icon name="chat" size={25} />
      </a>
      <a draggable={false} href={`tel:${tel(phone)}`} className="rounded-full bg-blue text-white grid place-items-center shadow-pop hover:scale-110 transition-transform duration-300 animate-scale-in" style={{ width: 52, height: 52, animationDelay: '0.1s' }} aria-label="Call now">
        <span className="animate-pulse-ring rounded-full grid place-items-center" style={{ width: 52, height: 52 }}>
          <Icon name="call" size={22} />
        </span>
      </a>
    </div>
  );
}
