// Vendored from clawdtesting/Eth-Agi (apps/eth-console/lib/ipfs) — IPFS config + CID validation.
// Same-owner reuse. Uses PINATA_JWT (Bearer), not project id/secret.
const MIN_CID_LENGTH = 10;
const PLACEHOLDER_PATTERNS = [
  /^Qm\.\.\.$/,
  /^bafy\.\.\.$/,
  /^ipfs:\/\/placeholder$/,
  /^ipfs:\/\/$/i,
  /^todo$/i,
  /^cid$/i,
  /^fake$/i,
  /^mock$/i,
  /^test$/i,
  /^[0-9]+$/,
];

const LIKELY_CID_V0 = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/; // base58btc multihash
// base32 CIDv1. Widened from the upstream {56,58}: a standard sha2-256 CIDv1
// (bafybei…) is 59 chars total (bafy + 55), which the narrower range rejected.
const LIKELY_CID_V1 = /^bafy[2-7a-z]{51,59}$/i;

export function isLikelyCid(value: string): boolean {
  if (!value || typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length < MIN_CID_LENGTH) return false;
  if (/\s/.test(trimmed)) return false;
  for (const p of PLACEHOLDER_PATTERNS) {
    if (p.test(trimmed)) return false;
  }
  return LIKELY_CID_V0.test(trimmed) || LIKELY_CID_V1.test(trimmed);
}

export function rejectFakeCid(value: string): string[] {
  const issues: string[] = [];
  if (!value || typeof value !== "string") {
    issues.push("CID is empty or not a string");
    return issues;
  }
  const trimmed = value.trim();
  if (trimmed.length < MIN_CID_LENGTH) {
    issues.push(`CID too short (${trimmed.length} chars, min ${MIN_CID_LENGTH})`);
  }
  if (/\s/.test(trimmed)) {
    issues.push("CID contains whitespace");
  }
  for (const p of PLACEHOLDER_PATTERNS) {
    if (p.test(trimmed)) {
      issues.push(`CID matches placeholder pattern: ${trimmed}`);
    }
  }
  if (!LIKELY_CID_V0.test(trimmed) && !LIKELY_CID_V1.test(trimmed)) {
    issues.push("CID does not match known CIDv0 or CIDv1 format");
  }
  return issues;
}

export function normalizeCid(value: string): string {
  return value.trim();
}
