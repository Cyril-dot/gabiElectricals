'use client';
import { useRef } from 'react';
import { Icon } from './Icon';

export function Rail({ title, icon, action, children, dark = false }: {
  title: React.ReactNode;
  icon?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  dark?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (d: number) => ref.current?.scrollBy({ left: d * ref.current.clientWidth * 0.8, behavior: 'smooth' });
  return (
    <section className={`py-12 md:py-16 ${dark ? 'bg-navy text-white' : ''}`}>
      <div className="container-x">
        <div className="flex items-end justify-between mb-6">
          <h2 className="font-display font-bold text-2xl md:text-[32px] tracking-tight flex items-center gap-2.5">
            {icon && <Icon name={icon as never} size={26} className="text-volt" />}
            {title}
          </h2>
          <div className="flex items-center gap-2">
            {action}
            <button onClick={() => scroll(-1)} aria-label="Scroll left" className={`icon-btn !rounded-full border ${dark ? 'border-white/20 hover:!bg-white/10' : 'border-line'}`}><Icon name="arrow_back" size={18} /></button>
            <button onClick={() => scroll(1)} aria-label="Scroll right" className={`icon-btn !rounded-full border ${dark ? 'border-white/20 hover:!bg-white/10' : 'border-line'}`}><Icon name="arrow_forward" size={18} /></button>
          </div>
        </div>
      </div>
      <div className="container-x">
        <div ref={ref} className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 md:mx-0 md:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {children}
        </div>
      </div>
    </section>
  );
}
