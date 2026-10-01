import Link from 'next/link';

export default function RootNotFound() {
  return (
    <main className="min-h-dvh grid place-items-center p-8 text-center bg-mist dark:bg-navy">
      <div className="max-w-md">
        <p className="text-6xl mb-4" aria-hidden="true">🔌💥</p>
        <h1 className="font-display font-extrabold text-3xl mb-2 text-navy dark:text-white">404 — circuit tripped</h1>
        <p className="text-soft mb-6">This page blew a fuse. Everything else in the panel works fine.</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/" className="btn-primary !px-5 !py-3">Back home</Link>
          <Link href="/shop" className="btn-ghost !px-5 !py-3">Shop products</Link>
          <Link href="/book" className="btn-ghost !px-5 !py-3">Book an electrician</Link>
        </div>
      </div>
    </main>
  );
}
