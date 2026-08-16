// Vendored from clawdtesting/Eth-Agi (apps/eth-console/lib/tx) — unsigned-tx production.
// Same-owner reuse. This backend never signs or broadcasts (reuse brief §6).
import { encodeFunctionData, decodeFunctionData } from "viem";
import { getContractAbi, getCompletionFunction, getContractAddress } from "./abi-registry";
import type { CompletionTxPreview } from "./types";
import type { CompletionContext } from "./completion-context";
import type { ContractId } from "./types";
import type { Abi } from "viem";

export type EncodeResult =
  | { ok: true; functionName: string; args: unknown[]; data: `0x${string}` }
  | { ok: false; reason: "BLOCKED_MANUAL_ABI_REQUIRED" | "ENCODE_FAILED"; detail: string };

export type DecodeResult =
  | { ok: true; functionName: string; args: readonly unknown[]; decoded_args: Record<string, unknown> }
  | { ok: false; reason: string };

export function encodeCompletionCalldata(context: CompletionContext): EncodeResult {
  const fnConfig = getCompletionFunction(context.contract_id);
  if (!fnConfig) {
    return {
      ok: false,
      reason: "BLOCKED_MANUAL_ABI_REQUIRED",
      detail: `No completion function available for ${context.contract_id} — manual ABI configuration required`,
    };
  }

  try {
    const jobId = BigInt(context.upstream_job_id);
    const fnAbi = fnConfig.abi.find(
      (item) => item.type === "function" && (item as any).name === fnConfig.functionName
    );

    if (!fnAbi) {
      return {
        ok: false,
        reason: "BLOCKED_MANUAL_ABI_REQUIRED",
        detail: `Function ${fnConfig.functionName} not found in ABI`,
      };
    }

    let args: unknown[];
    if (fnConfig.functionName === "requestJobCompletion") {
      // Canonical ABI expects _jobCompletionURI — an IPFS URI pointing to the evidence
      const completionURI = `ipfs://${context.ipfs_cid}`;
      args = [jobId, completionURI];
    } else {
      return {
        ok: false,
        reason: "BLOCKED_MANUAL_ABI_REQUIRED",
        detail: `Unknown completion function: ${fnConfig.functionName}`,
      };
    }

    const data = encodeFunctionData({
      abi: [fnAbi] as Abi,
      functionName: fnConfig.functionName,
      args,
    });

    return { ok: true, functionName: fnConfig.functionName, args, data };
  } catch (e) {
    return {
      ok: false,
      reason: "ENCODE_FAILED",
      detail: `Encoding failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

export function decodeCompletionCalldata(
  contractId: ContractId,
  data: `0x${string}`
): DecodeResult {
  const abi = getContractAbi(contractId);
  if (!abi || abi.length === 0) {
    return { ok: false, reason: "No ABI available for contract" };
  }

  try {
    const result = decodeFunctionData({ abi, data });
    const fnDef = abi.find(
      (item) => item.type === "function" && (item as any).name === result.functionName
    ) as { inputs: Array<{ name: string }> } | undefined;

    const decodedArgs: Record<string, unknown> = {};
    if (fnDef?.inputs && result.args) {
      fnDef.inputs.forEach((inp, i) => {
        const arg = (result.args as readonly unknown[])[i];
        decodedArgs[inp.name || `arg${i}`] = typeof arg === "bigint" ? arg.toString() : arg;
      });
    }

    return { ok: true, functionName: result.functionName, args: result.args ?? [], decoded_args: decodedArgs };
  } catch (e) {
    return {
      ok: false,
      reason: `Decode failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

export function buildCompletionPreview(context: CompletionContext): CompletionTxPreview | { blocked: true; reason: string; detail: string } {
  const encodeResult = encodeCompletionCalldata(context);
  if (!encodeResult.ok) {
    return { blocked: true, reason: encodeResult.reason, detail: encodeResult.detail };
  }

  const contractAddress = getContractAddress(context.contract_id);

  let decodeResult: DecodeResult;
  try {
    decodeResult = decodeCompletionCalldata(context.contract_id, encodeResult.data);
  } catch {
    return { blocked: true, reason: "BLOCKED_MANUAL_ABI_REQUIRED", detail: "Calldata encoding succeeded but decoding failed" };
  }

  return {
    chain_id: parseInt(process.env.CHAIN_ID || "1", 10),
    contract_id: context.contract_id,
    contract_address: contractAddress,
    function_name: encodeResult.functionName,
    args: encodeResult.args,
    decoded_args: decodeResult.ok ? decodeResult.decoded_args : {},
    to: contractAddress,
    value: "0",
    data: encodeResult.data,
    human_summary: `Complete job #${context.upstream_job_id} via ${encodeResult.functionName} on ${context.contract_id}`,
    evidence: {
      evidence_docket_id: context.evidence_docket_id,
      ipfs_cid: context.ipfs_cid,
      publication_status: context.publication_status,
      local_sha256: context.local_sha256,
      fetched_sha256: context.fetched_sha256,
      matched: context.fetchback_matched,
    },
    safety_checks: [],
  };
}
