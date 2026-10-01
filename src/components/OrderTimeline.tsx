import { Icon, type IconName } from './Icon';

export type TimelineEvent = { status: string; note?: string | null; at: Date | string };

const STEPS: { key: string; label: string; icon: IconName; hint: string }[] = [
  { key: 'PENDING_PAYMENT', label: 'Pending payment', icon: 'receipt_long', hint: 'Order received — awaiting payment' },
  { key: 'PAID', label: 'Paid', icon: 'check_circle', hint: 'Payment confirmed' },
  { key: 'PROCESSING', label: 'Processing', icon: 'inventory_2', hint: 'Packed at our Osu warehouse' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for delivery', icon: 'local_shipping', hint: 'Rider is on the way' },
  { key: 'DELIVERED', label: 'Delivered', icon: 'home', hint: 'Job done — enjoy the power' },
];

function toD(x: Date | string): Date {
  return x instanceof Date ? x : new Date(x);
}

export function OrderTimeline({ status, events }: { status: string; events: TimelineEvent[] }) {
  const cancelled = status === 'CANCELLED' || status === 'REFUNDED';
  const currentIdx = STEPS.findIndex(s => s.key === status);
  const reached = new Set(events.map(e => e.status));
  return (
    <ol className="flex flex-col gap-0" aria-label="Order status timeline">
      {STEPS.map((step, i) => {
        const done = !cancelled && (reached.has(step.key) && (i < currentIdx || step.key === status));
        const active = !cancelled && step.key === status;
        const ev = [...events].reverse().find(e => e.status === step.key);
        return (
          <li key={step.key} className="relative flex gap-3.5 pb-6 last:pb-0">
            {i < STEPS.length - 1 && (
              <span aria-hidden className={`absolute left-[19px] top-10 bottom-0 w-0.5 ${done ? 'bg-success' : 'bg-line'}`} />
            )}
            <span aria-hidden
              className={`w-10 h-10 rounded-full grid place-items-center text-lg shrink-0 border-2 ${active ? 'bg-blue text-white border-blue ring-4 ring-blue/20' : done ? 'bg-success/15 border-success' : 'bg-mist dark:bg-navy-700 border-line'}`}>
              {done || active ? <Icon name={step.icon} size={20} /> : '·'}
            </span>
            <div className="pt-1">
              <p className={`text-sm font-bold ${done || active ? '' : 'text-soft'}`}>
                {step.label}
                {ev && <span className="ml-2 text-[11.5px] font-semibold text-soft">{toD(ev.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>}
              </p>
              <p className="text-[12.5px] text-soft">{ev?.note ?? step.hint}</p>
            </div>
          </li>
        );
      })}
      {cancelled && (
        <li className="flex gap-3.5 items-start pt-1">
          <span aria-hidden className="w-10 h-10 rounded-full grid place-items-center text-lg shrink-0 bg-danger/15 border-2 border-danger"><Icon name="cancel" size={20} /></span>
          <div>
            <p className="text-sm font-bold text-danger">{status === 'REFUNDED' ? 'Refunded' : 'Cancelled'}</p>
            <p className="text-[12.5px] text-soft">{events.find(e => e.status === status)?.note ?? 'Contact us if you need a hand.'}</p>
          </div>
        </li>
      )}
      {status === 'PARTIALLY_PAID' && (
        <li className="flex gap-3.5 items-start pt-1">
          <span aria-hidden className="w-10 h-10 rounded-full grid place-items-center text-lg shrink-0 bg-warning/15 border-2 border-warning"><Icon name="payments" size={20} /></span>
          <div>
            <p className="text-sm font-bold text-warning">Partially paid</p>
            <p className="text-[12.5px] text-soft">A deposit landed — settle the balance to dispatch.</p>
          </div>
        </li>
      )}
    </ol>
  );
}
