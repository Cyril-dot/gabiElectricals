import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: '24/7 Emergency Electrician — Greater Accra', description: 'Sparking board? Power lost? Certified emergency electricians respond within the hour across Accra, Tema, Spintex, Kasoa.' };

export default function EmergencyPage() {
  return (
    <div className="bg-navy text-white min-h-[70vh]">
      <div className="container-x py-16 max-w-3xl text-center">
        <p className="text-[12px] font-black tracking-[0.35em] uppercase text-gold mb-4">⚡ Emergency response</p>
        <h1 className="font-display font-extrabold text-4xl md:text-5xl leading-tight mb-4">Power danger? We roll within the hour.</h1>
        <p className="text-white/75 text-lg mb-8">Burning smell, sparking board, live cable down, or total blackout in your flat, shop or estate — a certified emergency electrician answers this line 24/7 across Greater Accra.</p>
        <div className="grid sm:grid-cols-2 gap-4 mb-10">
          <a href="tel:+233241002030" className="btn bg-danger text-white !py-6 text-2xl font-extrabold animate-pulse">📞 CALL NOW — 024 100 2030</a>
          <a href="https://wa.me/233241002030?text=EMERGENCY%20—%20I%20need%20an%20electrician%20now.%20Location%3A%20" target="_blank" rel="noreferrer" className="btn bg-[#25D366] text-white !py-6 text-2xl font-extrabold">💬 WhatsApp help</a>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 text-left">
          {[['1. Isolate safely', 'If it’s a board or socket: kill the main isolator. Don’t touch burnt cable with bare hands.'], ['2. Clear the area', 'Move people and combustibles away. If cables are down outside, keep 10m and call us + ECG (196).'], ['3. We handle the rest', 'Response <60 min in Accra, transparent emergency pricing, same-visit repair where possible.']].map(([t, b]) => (
            <div key={t as string} className="rounded-xl border border-white/15 p-4 bg-white/5">
              <p className="font-extrabold text-gold mb-1">{t}</p>
              <p className="text-sm text-white/80 leading-relaxed">{b}</p>
            </div>
          ))}
        </div>
        <p className="mt-10 text-sm text-white/60">Emergency call-out from ₵450 within Greater Accra — you approve any repair price before work starts. Not urgent? <Link href="/book" className="text-gold font-bold underline">Book a standard slot</Link>.</p>
      </div>
    </div>
  );
}
