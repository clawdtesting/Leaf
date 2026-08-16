// Vendored from clawdtesting/Eth-Agi (apps/eth-console/lib/tx/outcome) — read-only outcome verification.
// Same-owner reuse. Verifies a submitted tx against the intended unsigned request; never signs.
const TX_HASH_REGEX = /^0x[0-9a-fA-F]{64}$/;

const FAKE_PATTERNS = [
  /^0x\.{3,}$/,
  /^0x0{64}$/,
  /^0x0{63}[1-9a-f]$/,
  /^0x[0]{64}$/i,
  /^0xdead+[0]*$/i,
  /^0x[a-f]{64}$/i,
  /^0x[0]+[a-f]+[0]+$/i,
];

const FAKE_WORDS = [
  "TODO", "todo", "TBD", "tbd", "FAKE", "fake", "MOCK", "mock",
  "test", "TEST", "placeholder", "PLACEHOLDER", "xxx",
];

function hasOnlyHex(str: string): boolean {
  const hex = str.replace(/^0x/, "");
  return /^[0-9a-fA-F]*$/.test(hex);
}

export function isValidTxHash(value: string): boolean {
  if (!value || typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed !== value) return false;
  if (!TX_HASH_REGEX.test(value)) return false;
  if (FAKE_PATTERNS.some(p => p.test(value))) return false;
  return true;
}

export function normalizeTxHash(value: string): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed.startsWith("0x")) return `0x${trimmed}`;
  return trimmed;
}

export function rejectFakeTxHash(value: string): string[] {
  const reasons: string[] = [];
  if (!value || typeof value !== "string") {
    reasons.push("Value is empty or not a string");
    return reasons;
  }

  const trimmed = value.trim();
  if (trimmed !== value) {
    reasons.push("Hash contains whitespace");
    return reasons;
  }

  if (trimmed.length === 0) {
    reasons.push("Hash is empty");
    return reasons;
  }

  if (FAKE_WORDS.some(w => trimmed === w || trimmed.includes(w))) {
    reasons.push("Hash contains placeholder or fake word");
    return reasons;
  }

  if (!trimmed.startsWith("0x")) {
    reasons.push("Hash must start with 0x");
    return reasons;
  }

  if (trimmed.length !== 66) {
    reasons.push(`Hash length is ${trimmed.length}, expected 66 characters (0x + 64 hex)`);
    return reasons;
  }

  const body = trimmed.slice(2);
  if (!hasOnlyHex(body)) {
    reasons.push("Hash contains non-hex characters");
    return reasons;
  }

  if (FAKE_PATTERNS.some(p => p.test(trimmed))) {
    reasons.push("Hash matches known fake pattern");
    return reasons;
  }

  return reasons;
}
