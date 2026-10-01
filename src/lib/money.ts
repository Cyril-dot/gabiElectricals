export function ghs(n: number, opts: { cents?: boolean } = {}): string {
  const cents = opts.cents !== false;
  return `₵${n.toLocaleString('en-GH', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 })}`;
}

export function parseGhs(input: string): number | null {
  const n = parseFloat(input.replace(/[₵,\s]/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export const round2 = (n: number) => Math.round(n * 100) / 100;
