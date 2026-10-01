'use client';
import { useState } from 'react';
import { useToast } from './Toast';

export function ReferShare({ link }: { link: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); } catch {}
    setCopied(true); toast('Link copied — share it!');
  };
  const wa = `https://wa.me/?text=${encodeURIComponent(`Genuine cables, breakers & solar with same-day Accra delivery — use my link for ₵20 off your first order: ${link}`)}`;
  const sms = `sms:?&body=${encodeURIComponent(`₵20 off genuine electrical gear at GabiElectricals: ${link}`)}`;
  return (
    <>
      <div className="flex flex-col sm:flex-row gap-2">
        <input readOnly value={link} aria-label="Your referral link" onFocus={e => e.currentTarget.select()}
          className="flex-1 font-mono text-sm font-bold bg-mist dark:bg-navy-700 border border-line rounded-xl px-4 py-3" />
        <button onClick={copy} className="btn-primary !px-5 !py-3">{copied ? 'Copied ✓' : 'Copy link'}</button>
      </div>
      <div className="flex gap-2 mt-3 flex-wrap">
        <a href={wa} target="_blank" rel="noreferrer" className="btn !px-4 !py-2.5 text-sm bg-[#25D366] text-white">Share on WhatsApp</a>
        <a href={sms} className="btn-ghost !px-4 !py-2.5 text-sm">Share by SMS</a>
      </div>
    </>
  );
}
