// Vendored from clawdtesting/Eth-Agi (apps/eth-console/lib/tx/outcome) — read-only outcome verification.
// Same-owner reuse. Verifies a submitted tx against the intended unsigned request; never signs.
import { getContractIdByAddress } from "../abi-registry";
import { decodeCompletionCalldata } from "../encoder";
import type { TxCalldataComparison } from "./types";

export function compareTxAgainstUnsignedTxRequest(
  unsignedTxRequest: {
    chain_id: number;
    from: string;
    to: string;
    value: string;
    data: string;
    safety_checks?: string;
  },
  chainTx: {
    chain_id?: number;
    from: string;
    to: string;
    value: string;
    data: string;
  }
): TxCalldataComparison {
  const expectedTo = unsignedTxRequest.to.toLowerCase();
  const actualTo = chainTx.to?.toLowerCase() ?? "";
  const toMatches = expectedTo === actualTo;

  const expectedFrom = unsignedTxRequest.from?.toLowerCase();
  const actualFrom = chainTx.from?.toLowerCase() ?? "";
  const fromMatches = expectedFrom ? expectedFrom === actualFrom : undefined;

  const expectedValue = unsignedTxRequest.value || "0";
  const actualValue = chainTx.value || "0";
  const valueMatches = normalizeValue(expectedValue) === normalizeValue(actualValue);

  const expectedData = (unsignedTxRequest.data || "0x").toLowerCase();
  const actualData = (chainTx.data || "0x").toLowerCase();
  const dataMatches = expectedData === actualData;

  let decodedFunction: string | undefined;
  let functionMatches: boolean | undefined;
  let decodedArgs: Record<string, unknown> | undefined;
  let argsMatch: boolean | undefined;
  let evidenceCidInArgs: string | undefined;
  let evidenceCidMatches: boolean | undefined;
  let upstreamJobIdInArgs: string | undefined;
  let upstreamJobIdMatches: boolean | undefined;
  let previewMissing = true;

  try {
    let savedDecodedArgs: Record<string, unknown> | undefined;
    let savedFunction: string | undefined;

    if (unsignedTxRequest.safety_checks) {
      const parsed = JSON.parse(unsignedTxRequest.safety_checks);
      const previewData = parsed?.preview;
      if (previewData) {
        previewMissing = false;
        savedDecodedArgs = previewData.decoded_args;
        savedFunction = previewData.function_name;
      }
    }

    const contractId = getContractIdByAddress(unsignedTxRequest.to);
    if (contractId) {
      const decodeResult = decodeCompletionCalldata(contractId, actualData as `0x${string}`);
      if (decodeResult.ok) {
        decodedFunction = decodeResult.functionName;
        decodedArgs = decodeResult.decoded_args;

        if (savedFunction) {
          functionMatches = savedFunction === decodedFunction;
        } else {
          functionMatches = undefined;
        }

        if (savedDecodedArgs && decodedArgs) {
          argsMatch = compareDecodedArgs(savedDecodedArgs, decodedArgs);
        } else {
          argsMatch = undefined;
        }

        if (decodedArgs && decodedArgs.evidenceCid) {
          evidenceCidInArgs = String(decodedArgs.evidenceCid);
        }
        if (decodedArgs && decodedArgs.jobId) {
          upstreamJobIdInArgs = String(decodedArgs.jobId);
        }
      }
    }
  } catch {
    // Comparison best-effort
  }

  return {
    expected_to: unsignedTxRequest.to,
    actual_to: chainTx.to,
    to_matches: toMatches,
    expected_from: unsignedTxRequest.from,
    actual_from: chainTx.from,
    from_matches: fromMatches,
    expected_value: expectedValue,
    actual_value: actualValue,
    value_matches: valueMatches,
    expected_data: unsignedTxRequest.data || "0x",
    actual_data: chainTx.data || "0x",
    data_matches: dataMatches,
    decoded_function: decodedFunction,
    function_matches: functionMatches,
    decoded_args: decodedArgs,
    args_match: argsMatch,
    evidence_cid_in_args: evidenceCidInArgs,
    evidence_cid_matches: evidenceCidMatches,
    upstream_job_id_in_args: upstreamJobIdInArgs,
    upstream_job_id_matches: upstreamJobIdMatches,
    preview_missing: previewMissing,
  };
}

export function decodeAndCompareTxInput(
  unsignedTxRequest: { to: string; data: string; safety_checks?: string },
  chainTx: { to: string; data: string }
): { ok: boolean; comparison: TxCalldataComparison } {
  const comparison = compareTxAgainstUnsignedTxRequest(
    {
      ...unsignedTxRequest,
      chain_id: 1,
      from: "",
      value: "0",
    },
    { ...chainTx, chain_id: 1, from: "", value: "0" }
  );
  return { ok: comparison.data_matches, comparison };
}

function normalizeValue(value: string): string {
  try {
    return BigInt(value || "0").toString();
  } catch {
    return value;
  }
}

function compareDecodedArgs(
  expected: Record<string, unknown>,
  actual: Record<string, unknown>
): boolean {
  const keys = Object.keys(expected);
  if (keys.length === 0) return false;
  return keys.every((key) => {
    const ev = String(expected[key] ?? "");
    const av = String(actual[key] ?? "");
    return ev === av;
  });
}
