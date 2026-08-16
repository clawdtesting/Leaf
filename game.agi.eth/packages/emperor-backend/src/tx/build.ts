// In-memory replacement for Eth-Agi's Prisma-backed completion-builder.ts.
// Orchestrates: mission -> completion context -> encoded/decoded preview ->
// safety gates -> DRAFT unsigned tx package (or BLOCKED with reasons).
// Never signs, never broadcasts.

import { randomUUID } from 'crypto';
import type { MissionRecord } from '../emperor';
import type { CompletionTxPreview, WalletExportPackage } from './types';
import { resolveCompletionArgs, buildCompletionHumanSummary, type ResolveOptions } from './completion-context';
import { buildCompletionPreview } from './encoder';
import { evaluateCompletionTxSafety } from './completion-safety';
import { buildWalletExportPackage } from './wallet-export';

export interface UnsignedTxBuildResult {
  ok: boolean;
  status: 'DRAFT' | 'BLOCKED';
  blocking_reasons: string[];
  unsigned_tx_id?: string;
  preview?: CompletionTxPreview;
  wallet_export?: WalletExportPackage;
}

// Persisted DRAFT unsigned tx requests, keyed by unsigned_tx_id. Kept so the
// read-only outcome verifier can compare a submitted on-chain tx against what
// we actually intended. In-memory (mirrors the mission store).
export interface StoredUnsignedTx {
  id: string;
  mission_id: string;
  chain_id: number;
  from: string;
  to: string;
  value: string;
  data: string;
  safety_checks: string; // JSON { checks, preview } — read by calldata-compare
  status: 'DRAFT' | 'EXECUTED_EXTERNALLY';
  tx_hash?: string;
}

const unsignedTxRequests = new Map<string, StoredUnsignedTx>();

export function getUnsignedTx(id: string): StoredUnsignedTx | undefined {
  return unsignedTxRequests.get(id);
}

export function buildCompletionUnsignedTx(
  mission: MissionRecord,
  opts: ResolveOptions,
): UnsignedTxBuildResult {
  // 1) Resolve args from the mission + sealed docket (gates unpublished evidence).
  const argResult = resolveCompletionArgs(mission, opts);
  if (!argResult.ok) {
    return { ok: false, status: 'BLOCKED', blocking_reasons: [argResult.detail] };
  }

  // 2) Encode + decode-for-preview.
  const previewResult = buildCompletionPreview(argResult.context);
  if ('blocked' in previewResult) {
    return { ok: false, status: 'BLOCKED', blocking_reasons: [previewResult.detail] };
  }
  const preview: CompletionTxPreview = previewResult;
  // Normalize BigInt args (e.g. jobId) to strings so the preview and wallet
  // export are JSON-serializable. Safety checks compare via toString(), so this
  // is transparent to them.
  preview.args = preview.args.map(a => (typeof a === 'bigint' ? a.toString() : a));
  preview.human_summary = buildCompletionHumanSummary(argResult.context);
  preview.evidence = {
    evidence_docket_id: argResult.context.evidence_docket_id,
    ipfs_cid: argResult.context.ipfs_cid,
    publication_status: argResult.context.publication_status,
    local_sha256: argResult.context.local_sha256,
    fetched_sha256: argResult.context.fetched_sha256,
    matched: argResult.context.fetchback_matched,
  };

  // 3) Safety gates (20+ checks: chain, contract, calldata, no-value, no-key, unsigned-only).
  const safety = evaluateCompletionTxSafety(preview);
  preview.safety_checks = safety.checks;
  if (!safety.passed) {
    return {
      ok: false,
      status: 'BLOCKED',
      blocking_reasons: safety.checks.filter(c => !c.passed).map(c => `${c.name}: ${c.detail}`),
      preview,
    };
  }

  // 4) DRAFT unsigned package + operator wallet export.
  const unsignedTxId = randomUUID();
  const walletExport = buildWalletExportPackage(unsignedTxId, preview, opts.operatorAddress, safety.checks);
  unsignedTxRequests.set(unsignedTxId, {
    id: unsignedTxId,
    mission_id: mission.id,
    chain_id: preview.chain_id,
    from: opts.operatorAddress,
    to: preview.to,
    value: preview.value,
    data: preview.data,
    safety_checks: walletExport.safety_checks,
    status: 'DRAFT',
  });
  return { ok: true, status: 'DRAFT', blocking_reasons: [], unsigned_tx_id: unsignedTxId, preview, wallet_export: walletExport };
}
