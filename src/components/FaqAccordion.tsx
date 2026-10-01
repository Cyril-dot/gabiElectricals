'use client';
import { useState } from 'react';

export function FaqAccordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-line border border-line rounded-xl overflow-hidden">
      {items.map((f, i) => (
        <div key={i}>
          <button
            aria-expanded={open === i}
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full text-left px-4 py-3.5 font-bold text-[14.5px] flex items-center justify-between gap-3 hover:bg-mist dark:hover:bg-navy-700"
          >
            {f.q}
            <span aria-hidden="true" className={`text-blue transition-transform ${open === i ? 'rotate-45' : ''}`}>＋</span>
          </button>
          {open === i && <div className="px-4 pb-4 text-[14px] leading-relaxed text-soft">{f.a}</div>}
        </div>
      ))}
    </div>
  );
}
