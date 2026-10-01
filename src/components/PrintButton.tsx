'use client';
import { Icon } from './Icon';
export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn-primary !px-5 !py-2.5 text-sm inline-flex items-center gap-2"><Icon name="print" size={16} /> Print / Save PDF</button>
  );
}
