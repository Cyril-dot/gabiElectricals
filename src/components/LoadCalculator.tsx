'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';

type App = { key: string; label: string; w: number; group: string; hours: number };
const APPLIANCES: App[] = [
  { key: 'lights', label: 'LED lights ×6', w: 60, group: 'Essentials', hours: 5 },
  { key: 'wifi', label: 'Router + decoder', w: 35, group: 'Essentials', hours: 6 },
  { key: 'tv', label: 'TV 43"', w: 90, group: 'Comfort', hours: 4 },
  { key: 'fan', label: 'Standing fan', w: 65, group: 'Comfort', hours: 5 },
  { key: 'fridge', label: 'Fridge (avg duty 45%)', w: 150, group: 'Critical', hours: 8 },
  { key: 'freezer', label: 'Deep freezer', w: 200, group: 'Critical', hours: 8 },
  { key: 'laptop', label: 'Laptop charging', w: 65, group: 'Work', hours: 4 },
  { key: 'phones', label: 'Phone chargers ×4', w: 40, group: 'Work', hours: 5 },
  { key: 'pump', label: 'Water pump 0.75kW', w: 750, group: 'Critical', hours: 1 },
  { key: 'ac1', label: 'AC 1.5HP inverter', w: 1100, group: 'Comfort', hours: 3 },
  { key: 'cctv', label: 'CCTV DVR + 4 cams', w: 80, group: 'Critical', hours: 8 },
  { key: 'iron', label: 'Pressing iron', w: 1000, group: 'Occasional', hours: 0.5 },
];

export function LoadCalculator() {
  const [sel, setSel] = useState<Record<string, boolean>>({ lights: true, wifi: true, tv: true, fridge: true, fan: true });
  const [hours, setHours] = useState(6);
  const [solar, setSolar] = useState(false);

  const result = useMemo(() => {
    const chosen = APPLIANCES.filter(a => sel[a.key]);
    const peak = chosen.reduce((s, a) => s + a.w, 0);
    const energy = chosen.reduce((s, a) => s + a.w * Math.max(a.hours, hours * 0.6), 0) / 1000; // Wh→kWh approx duty
    const invKva = Math.ceil((peak * 1.25) / 100) / 10 + 0.5; // 25% headroom + margin
    const battKwh = Math.ceil((energy * (hours / 6) + 0.4) * 10) / 10 / 0.85; // inverter losses, round up
    const panels = solar ? Math.max(2, Math.ceil((battKwh * 2.2) / 0.3)) : 0;
    return { peak, energy, invKva, battKwh, panels, chosen };
  }, [sel, hours, solar]);

  const rec = result.invKva <= 1.5 ? '/shop?cat=batteries-ups&q=UPS' : result.invKva <= 3.5 ? '/shop?cat=solar-inverters&q=3kVA' : '/shop?cat=solar-inverters&q=5kVA';

  return (
    <div className="card p-6 md:p-8">
      <fieldset className="mb-6">
        <legend className="font-display font-extrabold text-lg mb-3">What must keep running?</legend>
        <div className="grid sm:grid-cols-2 gap-2">
          {APPLIANCES.map(a => (
            <label key={a.key} className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 cursor-pointer text-sm font-semibold transition-colors ${sel[a.key] ? 'border-blue bg-blue/5 text-blue' : 'border-line hover:border-blue/40'}`}>
              <input type="checkbox" checked={!!sel[a.key]} onChange={() => setSel(s => ({ ...s, [a.key]: !s[a.key] }))} className="w-4 h-4 accent-[#0C4A55]" />
              <span className="flex-1">{a.label}</span>
              <span className="text-soft text-xs">{a.w}W</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid sm:grid-cols-2 gap-6 mb-8">
        <label className="text-sm font-bold space-y-2">
          Typical hours without ECG light: <span className="text-blue">{hours}h</span>
          <input type="range" min={2} max={12} value={hours} onChange={e => setHours(+e.target.value)} className="w-full accent-[#22D3EE]" aria-label="Dark hours" />
        </label>
        <label className="flex items-center gap-3 text-sm font-bold cursor-pointer pt-4">
          <input type="checkbox" checked={solar} onChange={() => setSolar(v => !v)} className="w-4 h-4 accent-[#0C4A55]" /> I also want solar charging (recommended)
        </label>
      </div>

      {result.chosen.length === 0 ? (
        <p className="text-soft text-center py-6">Tick at least one appliance to see your sizing.</p>
      ) : (
        <div className="rounded-2xl bg-navy text-white p-6 md:p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-6">
            <div><p className="font-display font-extrabold text-2xl text-gold">{result.peak}W</p><p className="text-[11px] text-white/60 font-semibold uppercase tracking-wider">surge peak</p></div>
            <div><p className="font-display font-extrabold text-2xl text-gold">{result.energy.toFixed(1)}kWh</p><p className="text-[11px] text-white/60 font-semibold uppercase tracking-wider">daily energy</p></div>
            <div><p className="font-display font-extrabold text-2xl text-white">{result.invKva.toFixed(1)}kVA</p><p className="text-[11px] text-white/60 font-semibold uppercase tracking-wider">inverter size</p></div>
            <div><p className="font-display font-extrabold text-2xl text-white">{result.battKwh.toFixed(1)}kWh</p><p className="text-[11px] text-white/60 font-semibold uppercase tracking-wider">battery bank</p></div>
          </div>
          <p className="text-sm text-white/80 leading-relaxed mb-4">
            We’d quote a <strong className="text-gold">{result.invKva.toFixed(1)}kVA pure-sine inverter</strong> with roughly <strong className="text-gold">{Math.ceil(result.battKwh / 2.2)} tubular 220Ah</strong> or <strong className="text-gold">{Math.ceil(result.battKwh / 5.1)} lithium 48V</strong> blocks{result.panels > 0 ? `, and ${result.panels} × 250W solar panels to refill the bank in a Ghana sun-day` : ''}. Allow 25% headroom for motor starts (fridge, pump).
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href={rec} className="btn-gold !px-5 !py-3 text-sm">Shop matching gear</Link>
            <Link href="/book?service=solar-install" className="btn !px-5 !py-3 text-sm border border-white/30 text-white hover:bg-white/10">Get a free site survey</Link>
          </div>
          <p className="text-[11px] text-white/45 mt-4">Estimates only — duty cycles vary. A technician visit confirms real measured loads before you pay.</p>
        </div>
      )}
    </div>
  );
}
