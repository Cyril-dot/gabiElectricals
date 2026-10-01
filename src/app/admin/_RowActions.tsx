'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { Icon, ICONS } from './_ui';

export function RowActions({ id, sku, status }: { id: string; sku: string; status: string }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const act = async (body: Record<string, unknown>, msg: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await res.json();
      toast(res.ok ? msg : j.error ?? 'Failed', res.ok ? 'ok' : 'err');
      if (res.ok && j.id) router.push(`/admin/products/${j.id}/edit`);
      else router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex justify-end gap-1">
      <Link href={`/admin/products/${id}/edit`} aria-label={`Edit ${sku}`} className="btn-ghost !p-1.5"><Icon d={ICONS.edit} className="h-4 w-4" /></Link>
      <button disabled={busy} onClick={() => void act({ action: 'duplicate' }, 'Product duplicated as draft')} aria-label={`Duplicate ${sku}`} className="btn-ghost !p-1.5"><Icon d={ICONS.copy} className="h-4 w-4" /></button>
      {status !== 'PUBLISHED'
        ? <button disabled={busy} onClick={() => void act({ action: 'status', status: 'PUBLISHED' }, 'Published')} aria-label={`Publish ${sku}`} className="btn-ghost !p-1.5 text-success"><Icon d={ICONS.eye} className="h-4 w-4" /></button>
        : <button disabled={busy} onClick={() => void act({ action: 'status', status: 'ARCHIVED' }, 'Archived')} aria-label={`Archive ${sku}`} className="btn-ghost !p-1.5 text-soft"><Icon d={ICONS.trash} className="h-4 w-4" /></button>}
    </div>
  );
}
