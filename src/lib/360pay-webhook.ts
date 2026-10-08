/**
 * Pure helpers for the LibertePay 360Pay webhook (doorbell) route.
 * Kept free of DB / Next imports so the reference-extraction logic can be
 * unit-checked in isolation.
 *
 * Provider references issued by src/lib/gateway.ts (`deriveGabiProviderReference`)
 * are `GABI` + 12 uppercase base36 characters.
 */
export const LIBERTEPAY_PROVIDER_REF_PATTERN = /^GABI[A-Z0-9]{12}$/;

const REFERENCE_FIELDS = ['transaction_id', 'reference', 'transactionId', 'ref'] as const;

function candidateFromRecord(record: Record<string, unknown>): string | null {
  for (const field of REFERENCE_FIELDS) {
    const value = record[field];
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (LIBERTEPAY_PROVIDER_REF_PATTERN.test(trimmed)) return trimmed;
  }
  return null;
}

/**
 * Extract a valid GABI provider reference from an unknown webhook payload.
 *
 * Accepts plain objects (JSON bodies — top level first, then a nested
 * `data` object, matching the provider envelope shape) and
 * URLSearchParams (form-encoded bodies). Returns null for anything else,
 * for missing fields, and for malformed / non-GABI candidates — callers
 * treat null as "no actionable reference", never as an error.
 */
export function extractLibertePayProviderRef(payload: unknown): string | null {
  if (payload instanceof URLSearchParams) {
    for (const field of REFERENCE_FIELDS) {
      const value = payload.get(field);
      if (typeof value !== 'string') continue;
      const trimmed = value.trim();
      if (LIBERTEPAY_PROVIDER_REF_PATTERN.test(trimmed)) return trimmed;
    }
    return null;
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;

  const record = payload as Record<string, unknown>;
  const topLevel = candidateFromRecord(record);
  if (topLevel) return topLevel;

  const nested = record.data;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return candidateFromRecord(nested as Record<string, unknown>);
  }
  return null;
}
