import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import { FaqAccordion } from '@/components/FaqAccordion';
import { JSONLd } from '@/components/JsonLd';
import { ChatWidget } from '@/components/ChatWidget';

export const metadata: Metadata = { title: 'FAQ', description: 'Answers on genuine cable, delivery, MoMo/QR payments, warranties and certified installation.' };

export default async function FaqPage() {
  const faqs = await prisma.faq.findMany({ where: { context: 'PUBLIC' }, orderBy: { category: 'asc' } }).catch(() => []);
  const grouped = Object.groupBy(faqs, f => f.category);
  return (
    <div className="container-x py-12 max-w-3xl">
      <JSONLd data={{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })) }} />
      <h1 className="font-display font-extrabold text-3xl md:text-4xl mb-2">Frequently asked questions</h1>
      <p className="text-soft mb-8">Still unsure? The chat bubble bottom-right answers instantly, or WhatsApp a photo of your problem.</p>
      {Object.entries(grouped).map(([cat, list]) => (
        <section key={cat ?? 'General'} className="mb-8" aria-label={cat ?? 'General'}>
          <h2 className="font-display font-extrabold text-lg mb-3 text-blue">{cat}</h2>
          <FaqAccordion items={(list ?? []).map(f => ({ q: f.question, a: f.answer }))} />
        </section>
      ))}
    </div>
  );
}
