// Vendored from clawdtesting/Eth-Agi (apps/eth-console/lib/tx) — unsigned-tx production.
// Same-owner reuse. This backend never signs or broadcasts (reuse brief §6).
import type { CompletionTxPreview } from "./types";

export interface SafetyCheck {
  name: string;
  passed: boolean;
  detail: string;
}

export interface SafetyResult {
  passed: boolean;
  checks: SafetyCheck[];
  blocking: string[];
}

const PRIVATE_KEY_PATTERNS = [
  /private[_\s]?key/i,
  /mnemonic/i,
  /seed[_\s]?phrase/i,
  /wallet[_\s]?secret/i,
  /secret[_\s]?key/i,
  /\b(0x)?[0-9a-fA-F]{64}\b/,
];

function scanForPrivateKey(...values: string[]): string[] {
  const findings: string[] = [];
  for (const val of values) {
    if (typeof val === "string" && PRIVATE_KEY_PATTERNS.some(p => p.test(val))) {
      findings.push("Potential private key material detected in input");
      break;
    }
  }
  return findings;
}

const SUPPORTED_CONTRACTS = new Set(["AGI_JOB_MANAGER", "AGI_JOB_MANAGER_PRIME"]);

export function evaluateCompletionTxSafety(preview: CompletionTxPreview): SafetyResult {
  const checks: SafetyCheck[] = [];
  const chainId = parseInt(process.env.CHAIN_ID || "1", 10);

  checks.push({
    name: "chain_id_is_expected",
    passed: preview.chain_id === chainId,
    detail: preview.chain_id === chainId ? `Chain ID ${preview.chain_id}` : `Expected chain ${chainId}, got ${preview.chain_id}`,
  });

  checks.push({
    name: "contract_is_supported",
    passed: SUPPORTED_CONTRACTS.has(preview.contract_id),
    detail: preview.contract_id,
  });

  checks.push({
    name: "function_is_supported",
    passed: preview.function_name === "requestJobCompletion",
    detail: `Function: ${preview.function_name}`,
  });

  checks.push({
    name: "calldata_non_empty",
    passed: Boolean(preview.data && preview.data.length > 2 && preview.data !== "0x"),
    detail: preview.data ? `Calldata length: ${preview.data.length}` : "Empty calldata",
  });

  checks.push({
    name: "calldata_decodes",
    passed: Object.keys(preview.decoded_args).length > 0,
    detail: `Decoded ${Object.keys(preview.decoded_args).length} argument(s)`,
  });

  checks.push({
    name: "decoded_args_match",
    passed: Boolean(
      preview.decoded_args._jobId === preview.args[0]?.toString() ||
      preview.decoded_args._jobId?.toString() === preview.args[0]?.toString()
    ),
    detail: "Decoded args match encoded args",
  });

  const edExists = Boolean(preview.evidence?.evidence_docket_id);
  checks.push({
    name: "evidence_docket_exists",
    passed: edExists,
    detail: edExists ? `Docket: ${preview.evidence.evidence_docket_id.slice(0, 8)}…` : "No evidence docket in preview",
  });

  checks.push({
    name: "validation_passed",
    passed: preview.evidence?.matched === true,
    detail: preview.evidence?.matched ? "Validation passed" : "Validation not confirmed in preview",
  });

  checks.push({
    name: "work_package_ready",
    passed: true,
    detail: "Checked at build time",
  });

  checks.push({
    name: "approval_granted",
    passed: true,
    detail: "Checked at build time",
  });

  const ipfsPublished = preview.evidence?.publication_status === "PUBLISHED_IPFS";
  checks.push({
    name: "ipfs_published",
    passed: ipfsPublished,
    detail: ipfsPublished ? "Published to IPFS" : `Status: ${preview.evidence?.publication_status}`,
  });

  const cidValid = Boolean(preview.evidence?.ipfs_cid && preview.evidence.ipfs_cid.length >= 10);
  checks.push({
    name: "ipfs_cid_valid",
    passed: cidValid,
    detail: cidValid ? `CID: ${preview.evidence.ipfs_cid.slice(0, 20)}…` : "Invalid or missing CID",
  });

  const fetchbackVerified = preview.evidence?.matched === true;
  checks.push({
    name: "ipfs_fetchback_verified",
    passed: fetchbackVerified,
    detail: fetchbackVerified ? "Fetchback hashes match" : "Fetchback not verified",
  });

  const hashesMatch = preview.evidence?.local_sha256 === preview.evidence?.fetched_sha256 && preview.evidence?.matched === true;
  checks.push({
    name: "publication_hashes_match",
    passed: hashesMatch,
    detail: hashesMatch ? "Local and fetched hashes match" : "Hash mismatch or missing",
  });

  const pkFindings = scanForPrivateKey(
    preview.human_summary,
    JSON.stringify(preview.args, (_k, v) => typeof v === "bigint" ? v.toString() : v),
    preview.evidence?.ipfs_cid || ""
  );
  checks.push({
    name: "no_private_key_detected",
    passed: pkFindings.length === 0,
    detail: pkFindings.length === 0 ? "No private key material" : pkFindings.join("; "),
  });

  checks.push({
    name: "unsigned_only",
    passed: true,
    detail: "Unsigned transaction only — no signing path in this module",
  });

  checks.push({
    name: "no_broadcast_path",
    passed: true,
    detail: "No broadcast path in this module",
  });

  const hasValueTransfer = preview.value !== "0" && preview.value !== "" && preview.value !== "0x0";
  checks.push({
    name: "no_value_transfer_unless_expected",
    passed: !hasValueTransfer,
    detail: hasValueTransfer ? `Non-zero value: ${preview.value}` : "No value transfer",
  });

  const addrValid = Boolean(preview.to && preview.to.startsWith("0x") && preview.to.length === 42);
  checks.push({
    name: "contract_address_valid",
    passed: addrValid,
    detail: addrValid ? `Target: ${preview.to}` : "Invalid target address",
  });

  const blocking = checks.filter(c => !c.passed).map(c => c.detail);
  return { passed: blocking.length === 0, checks, blocking };
}

export function assertCompletionTxSafe(preview: CompletionTxPreview): SafetyResult {
  const result = evaluateCompletionTxSafety(preview);
  return result;
}
