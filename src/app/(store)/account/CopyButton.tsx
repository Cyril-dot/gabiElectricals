'use client';
import { useState } from 'react';
import { useToast } from '@/components/Toast';

export default function CopyButton({ text, label = 'Copy', className = '', dark = false }: { text: string; label?: string; className?: string; dark?: boolean }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  return (
    <button type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true); toast('Copied to clipboard', 'ok');
          setTimeout(() => setCopied(false), 2000);
        } catch { toast('Copy failed — select and copy manually', 'err'); }
      }}
      aria-label={`${label}: ${text}`} className={`rounded-lg border px-3 py-1.5 text-[12px] font-bold transition-colors ${dark ? 'border-white/25 bg-white/10 text-white hover:border-white' : 'border-line bg-white hover:border-blue'} ${className}`}>
      {copied ? '✓ Copied' : label}
    </button>
  );
}
