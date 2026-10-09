/**
 * LibertePay portal figures the chain API cannot report — the
 * all-time transaction counts — plus the last verified wallet
 * balances. Taken from the merchant portal (Tuguu Gabriel
 * Ventures, 3PB-5031) by the owner on 9 Oct 2026; the balance
 * figures were re-verified live through the chain the same day.
 *
 * Live chain reads (fetchLibertePayBalances) always win when
 * available. This snapshot is the fallback for the balances and
 * the only source for the counts — update it when a fresh portal
 * snapshot is taken.
 */
export const GATEWAY_PORTAL_SNAPSHOT = {
  asOf: '9 Oct 2026',
  merchantId: '3PB-5031',
  collectionsGhs: 43408.15,
  collectionsAccount: '288619006379',
  disbursementGhs: 0.03,
  disbursementAccount: '677636856655',
  totalTransactions: 1546,
  successfulTransactions: 274,
  failedTransactions: 1272,
} as const;
