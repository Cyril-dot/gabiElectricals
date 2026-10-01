import type { Metadata } from 'next';
import { getSettings } from '@/lib/settings';
import { ContactForms } from '@/components/ContactForms';

export const metadata: Metadata = { title: 'Contact Us', description: 'Call, WhatsApp or visit GabiElectricals — Osu, Accra. 24/7 emergency line.' };

export default async function ContactPage() {
  const biz = (await getSettings()).business;
  return (
    <div className="container-x py-12">
      <h1 className="font-display font-extrabold text-3xl md:text-4xl mb-2">Talk to a real electrician</h1>
      <p className="text-soft mb-8 max-w-xl">Questions about a product, a booking, or whether that burning smell is serious? (If it’s the last one, call now.)</p>
      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="card p-5 grid sm:grid-cols-2 gap-4">
            {[
              ['📞 Phone / 24-7 emergency', biz.phone],
              ['💬 WhatsApp', biz.whatsapp],
              ['✉️ Email', biz.email],
              ['📍 Workshop', biz.address],
              ['🛰️ Ghana Post GPS', biz.gps],
              ['🕐 Hours', biz.hours],
            ].map(([k, v]) => (
              <div key={k as string}>
                <p className="text-[11px] font-black uppercase tracking-widest text-soft">{k}</p>
                <p className="font-bold text-[15px]">{v}</p>
              </div>
            ))}
          </div>
          <div className="card overflow-hidden" aria-label="Map of Accra showing GabiElectricals location">
            <iframe
              title="GabiElectricals — Osu, Accra map"
              src="https://www.openstreetmap.org/export/embed.html?bbox=-0.2055%2C5.5400%2C-0.1555%2C5.5800&layer=mapnik&marker=5.5560%2C-0.1940"
              className="w-full h-72 border-0"
              loading="lazy"
            />
          </div>
        </div>
        <ContactForms />
      </div>
    </div>
  );
}
