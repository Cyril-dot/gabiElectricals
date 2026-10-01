'use client';
import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

type Msg = { me: boolean; text: string };

export function ChatWidget({ whatsapp = '233241002030', phone = '+233 24 100 2030' }: { whatsapp?: string; phone?: string }) {
  const wa = `https://wa.me/${whatsapp.replace(/[^\d]/g, '')}`;
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ me: false, text: 'Hi! I’m Volt — your GabiElectricals helper. Ask me about delivery, payments, warranties or which product fits. Type “human” for WhatsApp.' }]);
  const [input, setInput] = useState('');
  const [faqIndex, setFaqIndex] = useState<{ q: string; a: string }[] | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs, open]);
  useEffect(() => {
    fetch('/api/faq').then(r => (r.ok ? r.json() : [])).then(d => Array.isArray(d) && setFaqIndex(d)).catch(() => {});
  }, []);

  function reply(text: string) {
    const t = text.toLowerCase();
    if (t.includes('human') || t.includes('agent') || t.includes('whatsapp')) {
      return `No problem — a human will help: ${wa} or call ${phone} (24/7 for emergencies).`;
    }
    const stop = ['is', 'are', 'the', 'a', 'an', 'do', 'does', 'how', 'what', 'when', 'can', 'you', 'i', 'my', 'to', 'of', 'for', 'and', 'it', 'this', 'that', 'with', 'have', 'has'];
    const words = t.replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !stop.includes(w));
    let best: { q: string; a: string } | null = null;
    let score = 0;
    for (const f of faqIndex ?? []) {
      const hay = (f.q + ' ' + f.a).toLowerCase();
      const s = words.reduce((n, w) => n + (hay.includes(w) ? 1 : 0), 0);
      if (s > score) { score = s; best = f; }
    }
    if (best && score >= 1) return `${best.a}\n\n(From: “${best.q}”)`;
    return score ? `Hmm — let me double check that. Meanwhile: ${wa}` : null;
  }

  async function send() {
    const text = input.trim();
    if (!text) return;
    setInput('');
    setMsgs(m => [...m, { me: true, text }]);
    await new Promise(r => setTimeout(r, 450));
    const r = reply(text) ?? 'I couldn’t match that to our FAQ. Try “delivery”, “MoMo”, “warranty”, “fake cable”, “book”, or type “human”.';
    setMsgs(m => [...m, { me: false, text: r }]);
  }

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close chat assistant' : 'Open chat assistant'}
        className="fixed bottom-24 right-4 z-[65] w-12 h-12 rounded-full bg-blue text-white grid place-items-center shadow-pop text-xl hover:scale-105 transition-transform"
      ><Icon name={open ? 'close' : 'chat'} size={21} /></button>
      {open && (
        <div className="fixed bottom-40 right-4 z-[65] w-[calc(100vw-2rem)] max-w-sm card shadow-pop flex flex-col overflow-hidden animate-scale-in origin-bottom-right" role="dialog" aria-label="FAQ chat assistant">
          <div className="bg-navy text-white px-4 py-3 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-gold text-navy grid place-items-center"><Icon name="bolt" size={17} /></span>
            <div><p className="font-bold text-sm leading-none">Volt — FAQ assistant</p><p className="text-[11px] text-white/60 mt-1">Instant answers, trained on our real policies</p></div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-80 bg-mist/60 dark:bg-navy-700/40">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.me ? 'justify-end' : ''}`}>
                <p className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13.5px] whitespace-pre-line ${m.me ? 'bg-blue text-white rounded-br-md' : 'bg-white dark:bg-navy border border-line rounded-bl-md'}`}>{m.text}</p>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <form className="flex gap-2 p-3 border-t border-line" onSubmit={e => { e.preventDefault(); send(); }}>
            <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask about delivery, MoMo, warranty…" aria-label="Message" className="flex-1 border border-line rounded-xl px-3 py-2.5 text-sm bg-mist dark:bg-navy-700 outline-none focus:border-blue" />
            <button className="btn-primary !px-4 !py-2 text-sm" aria-label="Send message"><Icon name="send" size={16} /></button>
          </form>
        </div>
      )}
    </>
  );
}
