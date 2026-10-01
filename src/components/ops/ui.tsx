'use client';
import React, { useState } from 'react';

export const inputCls = 'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink placeholder:text-soft focus:border-blue focus:outline-none dark:bg-navy-700 dark:text-white';
export const labelCls = 'block text-xs font-bold uppercase tracking-wide text-soft mb-1';

export type Tone = 'success' | 'danger' | 'warning' | 'info' | 'gold' | 'soft' | 'navy';
const tones: Record<Tone, string> = {
  success: 'bg-success/10 text-success border-success/30',
  danger: 'bg-danger/10 text-danger border-danger/30',
  warning: 'bg-warning/10 text-warning border-warning/30',
  info: 'bg-blue/10 text-blue border-blue/30',
  gold: 'bg-gold/15 text-gold-dark border-gold/40 dark:text-gold',
  soft: 'bg-mist text-soft border-line',
  navy: 'bg-navy/10 text-navy border-navy/20 dark:bg-navy-700 dark:text-white',
};

export function Badge({ tone = 'soft', children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${tones[tone]}`}>{children}</span>;
}

export const payTone: Record<string, Tone> = {
  PENDING: 'warning', PAID: 'success', FAILED: 'danger', REFUNDED: 'info',
  PARTIALLY_PAID: 'gold', EXPIRED: 'soft', AWAITING_APPROVAL: 'gold',
};
export const bookTone: Record<string, Tone> = {
  REQUESTED: 'warning', CONFIRMED: 'info', ASSIGNED: 'navy', ON_THE_WAY: 'gold',
  IN_PROGRESS: 'gold', COMPLETED: 'success', CANCELLED: 'danger', REVIEWED: 'success',
};
export const orderTone: Record<string, Tone> = {
  PENDING_PAYMENT: 'warning', PAID: 'success', PROCESSING: 'info', OUT_FOR_DELIVERY: 'gold',
  DELIVERED: 'success', CANCELLED: 'danger', REFUNDED: 'info', PARTIALLY_PAID: 'gold',
};

export async function api<T = Record<string, unknown>>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((j as { error?: string }).error ?? `Request failed (${res.status})`);
  return j as T;
}

export function Msg({ msg }: { msg: { kind: 'ok' | 'err'; text: string } | null }) {
  if (!msg) return null;
  return <div className={`mt-3 rounded-lg border px-3 py-2 text-sm font-semibold ${msg.kind === 'ok' ? 'border-success/40 bg-success/10 text-success' : 'border-danger/40 bg-danger/10 text-danger'}`}>{msg.text}</div>;
}

export function useMsg() {
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  return { msg, setMsg, wrap: (fn: () => Promise<void>) => async () => {
    try { await fn(); } catch (e) { setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Something went wrong' }); }
  } };
}

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={async () => {
      try { await navigator.clipboard.writeText(text); } catch { /* clipboard blocked */ }
      setDone(true); setTimeout(() => setDone(false), 1500);
    }}>{done ? 'Copied!' : label}</button>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className={labelCls}>{label}</span>{children}</label>;
}

export function EmptyState({ text }: { text: string }) {
  return <div className="py-10 text-center text-sm text-soft">{text}</div>;
}

export function Tabs({ tabs, active, onChange }: { tabs: { id: string; label: string; count?: number }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={`rounded-full border px-4 py-1.5 text-sm font-bold transition ${active === t.id ? 'border-blue bg-blue text-white' : 'border-line bg-white text-soft hover:border-blue hover:text-blue dark:bg-navy-700'}`}>
          {t.label}{typeof t.count === 'number' && <span className={`ml-1.5 text-xs ${active === t.id ? 'text-white/70' : 'text-soft'}`}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export const thCls = 'px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-soft';
export const tdCls = 'px-3 py-2.5 text-sm';
export const tableWrap = 'card overflow-x-auto';

export function QrBox({ url }: { url: string }) {
  const [src, setSrc] = useState<string | null>(null);
  React.useEffect(() => {
    let alive = true;
    fetch(`/api/payments/qr?text=${encodeURIComponent(url)}`).then((r) => r.json())
      .then((j) => { if (alive && j.dataUrl) setSrc(j.dataUrl); }).catch(() => {});
    return () => { alive = false; };
  }, [url]);
  if (!src) return <div className="skeleton h-36 w-36" />;
  return <img src={src} alt="Payment QR" className="h-36 w-36 rounded-lg border border-line bg-white p-1" />;
}

export function waShare(text: string) {
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
}
