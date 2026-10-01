'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { Icon } from '@/components/Icon';

export default function CompareRemove({ slug, name }: { slug: string; name: string }) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const router = useRouter();
  return (
    <button type="button" disabled={busy} aria-label={`Remove ${name} from compare`}
      onClick={async () => {
        setBusy(true);
        try {
          const r = await fetch('/api/compare', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug }),
          });
          if (r.status === 401) { toast('Log in first', 'info'); return; }
          const j = await r.json().catch(() => ({}));
          if (!r.ok) { toast(j.error ?? 'Could not remove', 'err'); return; }
          toast('Removed from compare', 'ok');
          router.refresh();
        } catch { toast('Network error', 'err'); }
        finally { setBusy(false); }
      }}
      className="text-[11.5px] font-bold text-danger hover:underline">
      {busy ? '…' : <><Icon name="close" size={14} className="inline" /> Remove</>}
    </button>
  );
}
