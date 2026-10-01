export default function Offline() {
  return (
    <main className="min-h-dvh grid place-items-center p-8 text-center bg-navy text-white">
      <div>
        <p className="text-6xl mb-4">⚡📡</p>
        <h1 className="font-display font-extrabold text-2xl mb-2">You’re offline</h1>
        <p className="text-white/70 max-w-sm mx-auto mb-6">
          GabiElectricals needs a connection to show live stock and prices. Check your data — or call us on 024 100 2030 for emergency electrical work.
        </p>
        <a href="/" className="inline-flex items-center gap-2 font-bold bg-blue text-white px-6 py-3 rounded-xl">Retry</a>
      </div>
    </main>
  );
}
