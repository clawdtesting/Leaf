// Leaf-native replacement for Eth-Agi's Prisma-backed outcome-service.ts.
// Verifies a submitted transaction hash READ-ONLY against the intended unsigned
// tx request: fetch tx+receipt, compare chain/target/value/calldata/function,
// confirm the receipt succeeded, decode known logs. Never signs, never
// broadcasts. Mirrors the decision ladder in the upstream service.

import type { StoredUnsignedTx } from '../build';
import { rejectFakeTxHash, normalizeTxHash } from './hash';
import { fetchTxAndReceipt, verifyReceiptSuccess, summarizeTransaction, getExpectedChainId } from './rpc-verifier';
import { compareTxAgainstUnsignedTxRequest } from './calldata-compare';
import { decodeKnownOutcomeLogs, summarizeOutcomeLogs } from './log-decoder';
import type { TxOutcomeVerificationResult, TxOutcomeImportInput } from './types';

export async function verifyCompletionOutcome(
  tx: StoredUnsignedTx | undefined,
  input: TxOutcomeImportInput,
): Promise<TxOutcomeVerificationResult> {
  if (!tx) {
    return { ok: false, status: 'PENDING_MANUAL_REVIEW', detail: 'UnsignedTxRequest not found', blocking_reasons: ['Not found'] };
  }

  // 1) Reject fake / malformed hashes up front.
  const hashReasons = rejectFakeTxHash(input.tx_hash);
  if (hashReasons.length > 0) {
    return { ok: false, status: 'PENDING_MANUAL_REVIEW', detail: `Invalid tx hash: ${hashReasons.join('; ')}`, blocking_reasons: hashReasons };
  }
  const normalizedHash = normalizeTxHash(input.tx_hash);

  // 2) Fetch tx + receipt read-only (no RPC -> RPC_UNAVAILABLE).
  const fetchResult = await fetchTxAndReceipt(normalizedHash as `0x${string}`);
  if (!fetchResult.ok || !fetchResult.tx || !fetchResult.receipt) {
    const reason = fetchResult.detail || 'RPC verification pending';
    if (reason.includes('ETH_RPC_URL')) {
      return { ok: false, status: 'RPC_UNAVAILABLE', detail: 'ETH_RPC_URL not configured — outcome pending RPC verification', tx_hash: normalizedHash, blocking_reasons: ['ETH_RPC_URL not set'] };
    }
    return {
      ok: false,
      status: fetchResult.status === 'TX_NOT_FOUND' ? 'TX_NOT_FOUND' : 'PENDING_RPC_VERIFICATION',
      detail: reason,
      tx_hash: normalizedHash,
      blocking_reasons: [reason],
    };
  }

  const { tx: chainTx, receipt } = fetchResult;

  // 3) Chain id must match.
  const expectedChainId = getExpectedChainId();
  const chainId = chainTx.chainId ? Number(chainTx.chainId) : expectedChainId;
  if (chainId !== expectedChainId) {
    return { ok: false, status: 'WRONG_CHAIN', detail: `Chain ID mismatch: expected ${expectedChainId}, got ${chainId}`, tx_hash: normalizedHash, blocking_reasons: [`Chain mismatch: ${chainId}`] };
  }

  // 4) Compare the on-chain tx against the intended unsigned request.
  const comparison = compareTxAgainstUnsignedTxRequest(
    { chain_id: tx.chain_id, from: tx.from, to: tx.to, value: tx.value, data: tx.data, safety_checks: tx.safety_checks },
    { chain_id: chainId, from: chainTx.from, to: chainTx.to ?? '', value: chainTx.value?.toString() ?? '0', data: chainTx.input },
  );

  if (!comparison.to_matches) {
    return { ok: false, status: 'WRONG_TARGET', detail: `Target mismatch: expected ${tx.to}, got ${chainTx.to}`, tx_hash: normalizedHash, blocking_reasons: ['Target mismatch'], calldata_comparison: comparison };
  }
  if (!comparison.value_matches) {
    return { ok: false, status: 'WRONG_VALUE', detail: `Value mismatch: expected ${tx.value}, got ${chainTx.value?.toString() ?? '0'}`, tx_hash: normalizedHash, blocking_reasons: ['Value mismatch'], calldata_comparison: comparison };
  }
  if (!comparison.data_matches) {
    return { ok: false, status: 'WRONG_CALLDATA', detail: 'Calldata mismatch', tx_hash: normalizedHash, blocking_reasons: ['Calldata mismatch'], calldata_comparison: comparison };
  }
  if (comparison.function_matches === false) {
    return { ok: false, status: 'WRONG_FUNCTION', detail: `Function mismatch: ${comparison.decoded_function}`, tx_hash: normalizedHash, blocking_reasons: ['Function mismatch'], calldata_comparison: comparison };
  }

  // 5) Receipt must show success.
  const receiptSummary = summarizeTransaction(chainTx, receipt);
  const decodedLogs = decodeKnownOutcomeLogs(receipt as any, tx.to);
  const { warnings } = summarizeOutcomeLogs(decodedLogs);

  if (!verifyReceiptSuccess(receipt)) {
    return {
      ok: false,
      status: 'VERIFIED_FAILURE',
      detail: 'Transaction receipt shows reverted status',
      tx_hash: normalizedHash,
      receipt_summary: receiptSummary,
      calldata_comparison: comparison,
      decoded_logs: decodedLogs,
      blocking_reasons: ['Receipt status: reverted'],
    };
  }

  // 6) Verified. Mark the stored request as executed externally.
  tx.status = 'EXECUTED_EXTERNALLY';
  tx.tx_hash = normalizedHash;

  return {
    ok: true,
    status: 'VERIFIED_SUCCESS',
    detail: 'Transaction verified: target, value, calldata and receipt all match',
    tx_hash: normalizedHash,
    receipt_summary: receiptSummary,
    calldata_comparison: comparison,
    decoded_logs: decodedLogs,
    blocking_reasons: warnings,
  };
}
