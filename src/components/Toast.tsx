'use client';
import { createContext, useCallback, useContext, useState } from 'react';

type Toast = { id: number; msg: string; kind: 'ok' | 'err' | 'info' };
const Ctx = createContext<(msg: string, kind?: Toast['kind']) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((msg: string, kind: Toast['kind'] = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3800);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div aria-live="polite" className="fixed bottom-24 right-4 z-[90] flex flex-col gap-2 max-w-[calc(100vw-2rem)]">
        {toasts.map(t => (
          <div key={t.id} className={`px-4 py-3 rounded-xl shadow-pop text-sm font-semibold text-white ${t.kind === 'ok' ? 'bg-success' : t.kind === 'err' ? 'bg-danger' : 'bg-navy'} animate-[toastIn_.25s_ease]`}>
            {t.msg}
          </div>
        ))}
      </div>
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
    </Ctx.Provider>
  );
}
