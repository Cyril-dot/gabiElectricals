/**
 * LibertePay portal figures the chain API cannot report — the
 * all-time totals and transaction counts — plus the last verified
 * wallet balances. Taken from the merchant portal (Tuguu Gabriel
 * Ventures, 3PB-5031) by the owner; balances re-verified live
 * through the chain on 14 Oct 2026.
 *
 * The all-time collected figure (owner-reported from the portal,
 * 14 Oct 2026) is the merchant's all-time total across everything
 * on this shared gateway account; the Overview displays it
 * labelled as exactly that, beside this store's own revenue.
 * The counts remain from the owner's 9 Oct 2026 portal snapshot.
 * The gateway itself was disabled on 14 Oct 2026 (owner's order),
 * so nothing reads these figures live anymore — update the
 * snapshot when a fresh portal figure is taken.
 */
export const GATEWAY_PORTAL_SNAPSHOT = {
  asOf: '14 Oct 2026',
  merchantId: '3PB-5031',
  allTimeCollectedGhs: 141618.5,
  collectionsGhs: 6950.0,
  collectionsAccount: '288619006379',
  disbursementGhs: 75.05,
  disbursementAccount: '677636856655',
  totalTransactions: 1546,
  successfulTransactions: 274,
  failedTransactions: 1272,
} as const;
