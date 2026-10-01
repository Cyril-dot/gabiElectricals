import Link from 'next/link';

export function LegalShell({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="container-x py-12 max-w-3xl">
      <nav aria-label="Breadcrumb" className="text-sm text-soft mb-4"><Link href="/" className="hover:text-blue">Home</Link> / <span className="text-ink dark:text-white font-semibold">{title}</span></nav>
      <h1 className="font-display font-extrabold text-3xl md:text-4xl mb-2">{title}</h1>
      <p className="text-soft text-sm mb-8">Last updated: {updated} · GabiElectricals, Ghana</p>
      <div className="prose-legal space-y-6 text-[15px] leading-relaxed text-ink/90 dark:text-white/85">{children}</div>
    </div>
  );
}

export const H2 = ({ children }: { children: React.ReactNode }) => <h2 className="font-display font-extrabold text-xl mt-8 mb-2">{children}</h2>;
