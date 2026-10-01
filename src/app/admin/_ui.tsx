export function Icon({ d, className = 'h-4.5 w-4.5' }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {d.split('|').map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

export const ICONS = {
  overview: 'M3 12 L12 4 L21 12|M5 10 V20 H19 V10|M10 20 V14 H14 V20',
  products: 'M21 8 L12 3 L3 8 V16 L12 21 L21 16 Z|M3 8 L12 13 L21 8|M12 13 V21',
  orders: 'M6 2 H18 V22 L12 18 L6 22 Z|M9 7 H15|M9 11 H15',
  bookings: 'M4 5 H20 V21 H4 Z|M4 9 H20|M8 3 V6|M16 3 V6|M9 15 L11 17 L15 13',
  customers: 'M9 11 A4 4 0 1 0 9 3 A4 4 0 0 0 9 11|M2 21 A7 7 0 0 1 16 21|M17 8 A3 3 0 1 1 17 3|M18 21 A6 6 0 0 0 22 17',
  technicians: 'M14.7 6.3 A4.5 4.5 0 0 0 6.3 14.7 L3 18 V21 H6 L18 9 A4.4 4.4 0 0 0 21 5 L17.5 8.5 L15.5 6.5 Z',
  services: 'M13 2 L3 14 H12 L11 22 L21 10 H12 Z',
  payments: 'M2 6 H22 V18 H2 Z|M2 10 H22|M6 15 H10',
  promotions: 'M19 5 L9 15|M14 5 H19 V10|M9 9 V19 H3 V9 Z|M21 12 V19 H15',
  referrals: 'M10 14 A5 5 0 0 0 17 14 L20 11 A5 5 0 0 0 12.5 4 L11 5.5|M7 10 A5 5 0 0 0 3 13 A5 5 0 0 0 11.5 20 L13 18.5',
  reviews: 'M12 3 L14.5 8.5 L20.5 9.3 L16 13.5 L17.3 19.4 L12 16.4 L6.7 19.4 L8 13.5 L3.5 9.3 L9.5 8.5 Z',
  content: 'M4 4 H20 V20 H4 Z|M8 9 H16|M8 13 H16|M8 17 H12',
  marketing: 'M3 11 V13 L10 16 V8 Z|M10 8 L19 5 V19 L10 16|M6 16 V20',
  settings: 'M12 15 A3 3 0 1 0 12 9 A3 3 0 0 0 12 15|M19 12 L21.3 13.6 L20.7 16.2 L18 16.6 L17.1 19.3 L14.6 19.9 L13 17.7 L11 17.7 L9.4 19.9 L6.9 19.3 L6 16.6 L3.3 16.2 L2.7 13.6 L5 12 L2.7 10.4 L3.3 7.8 L6 7.4 L6.9 4.7 L9.4 4.1 L11 6.3 L13 6.3 L14.6 4.1 L17.1 4.7 L18 7.4 L20.7 7.8 L21.3 10.4 Z',
  reports: 'M4 20 V10|M10 20 V4|M16 20 V13|M22 20 H2',
  notifications: 'M6 9 A6 6 0 1 1 18 9 C18 15 21 16 21 16 H3 C3 16 6 15 6 9|M10 20 A2.2 2.2 0 0 0 14 20',
  search: 'M11 19 A8 8 0 1 0 11 3 A8 8 0 0 0 11 19|M21 21 L16.5 16.5',
  plus: 'M12 5 V19|M5 12 H19',
  chevron: 'M9 6 L15 12 L9 18',
  menu: 'M4 7 H20|M4 12 H20|M4 17 H20',
  x: 'M6 6 L18 18|M18 6 L6 18',
  copy: 'M9 9 H20 V20 H9 Z|M5 15 H4 V4 H15 V5',
  download: 'M12 3 V15|M7 11 L12 16 L17 11|M4 20 H20',
  upload: 'M12 16 V4|M7 8 L12 3 L17 8|M4 20 H20',
  alert: 'M12 3 L22 20 H2 Z|M12 10 V14|M12 17.5 V17.6',
  logout: 'M9 21 H5 A2 2 0 0 1 3 19 V5 A2 2 0 0 1 5 3 H9|M16 17 L21 12 L16 7|M21 12 H9',
  edit: 'M4 20 H8 L19 9 L15 5 L4 16 Z|M13 7 L17 11',
  trash: 'M4 7 H20|M9 7 V4 H15 V7|M6 7 L7 21 H17 L18 7',
  cash: 'M2 6 H22 V16 H2 Z|M12 11 A2.5 2.5 0 1 0 12 11.1|M5 9 V13|M19 9 V13',
  eye: 'M2 12 C5 5 19 5 22 12 C19 19 5 19 2 12|M12 15 A3 3 0 1 0 12 9 A3 3 0 0 0 12 15',
} as const;

export const STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT: 'bg-warning/15 text-warning', PAID: 'bg-blue/10 text-blue', PARTIALLY_PAID: 'bg-warning/15 text-warning',
  PROCESSING: 'bg-blue/10 text-blue', OUT_FOR_DELIVERY: 'bg-gold/20 text-gold-dark', DELIVERED: 'bg-success/15 text-success',
  CANCELLED: 'bg-danger/15 text-danger', REFUNDED: 'bg-danger/15 text-danger',
  REQUESTED: 'bg-warning/15 text-warning', CONFIRMED: 'bg-blue/10 text-blue', ASSIGNED: 'bg-blue/10 text-blue',
  ON_THE_WAY: 'bg-gold/20 text-gold-dark', IN_PROGRESS: 'bg-gold/20 text-gold-dark', COMPLETED: 'bg-success/15 text-success',
  REVIEWED: 'bg-success/15 text-success',
  DRAFT: 'bg-soft/10 text-soft', PUBLISHED: 'bg-success/15 text-success', ARCHIVED: 'bg-soft/10 text-soft',
  AWAITING_APPROVAL: 'bg-warning/15 text-warning', FAILED: 'bg-danger/15 text-danger',
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap ${STATUS_COLOR[status] ?? 'bg-mist text-soft'}`}>{status.replaceAll('_', ' ')}</span>;
}

export function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString('en-GH', { day: '2-digit', month: 'short', year: 'numeric' });
}
export function fmtDateTime(d: Date | string) {
  return new Date(d).toLocaleString('en-GH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
