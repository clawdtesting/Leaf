// Leaf-native replacement for Eth-Agi's Prisma-coupled completion-args.ts.
// Same CompletionContext shape (so the vendored encoder/safety modules work
// unchanged), but the context is resolved from Leaf's in-memory MissionRecord
// instead of a database.

import type { ContractId } from './types';
import type { MissionRecord } from '../emperor';

export interface CompletionContext {
  execution_run_id: string;
  contract_id: ContractId;
  upstream_job_id: string;
  operator_address: string;
  evidence_docket_id: string;
  ipfs_cid: string;
  completion_uri: string;
  publication_status: string;
  local_sha256?: string;
  fetched_sha256?: string;
  fetchback_matched: boolean;
  validation_passed: boolean;
  work_package_ready: boolean;
  approval_granted: boolean;
  completion_note: string;
}

export type ArgResolutionError =
  | 'MISSING_UPSTREAM_JOB_ID'
  | 'MISSION_NOT_COMPLETED'
  | 'NO_EVIDENCE_DOCKET'
  | 'EVIDENCE_NOT_PUBLISHED_IPFS'
  | 'IPFS_FETCHBACK_NOT_VERIFIED';

export type ArgResolutionResult =
  | { ok: true; context: CompletionContext }
  | { ok: false; error: ArgResolutionError; detail: string };

export interface ResolveOptions {
  contractId: ContractId;
  upstreamJobId: string;
  operatorAddress: string;
  completionNote?: string;
}

/**
 * Build a CompletionContext from an accepted mission + its sealed docket.
 * Mirrors the gates in Eth-Agi's resolveCompletionArgs, but sourced from the
 * mission store. Returns a structured error the builder turns into blocking
 * reasons — it never throws and never fabricates verification.
 */
export function resolveCompletionArgs(
  mission: MissionRecord,
  opts: ResolveOptions
): ArgResolutionResult {
  if (mission.status !== 'completed') {
    return { ok: false, error: 'MISSION_NOT_COMPLETED', detail: `Mission ${mission.id} is ${mission.status}, expected completed` };
  }
  const docket = mission.docket;
  if (!docket) {
    return { ok: false, error: 'NO_EVIDENCE_DOCKET', detail: 'Mission has no sealed evidence docket' };
  }
  if (!opts.upstreamJobId) {
    return { ok: false, error: 'MISSING_UPSTREAM_JOB_ID', detail: 'No upstream on-chain job id provided' };
  }
  if (docket.publication_status !== 'PUBLISHED_IPFS') {
    return {
      ok: false,
      error: 'EVIDENCE_NOT_PUBLISHED_IPFS',
      detail: `Evidence docket publication_status is ${docket.publication_status}, expected PUBLISHED_IPFS`,
    };
  }
  const ipfsCid = docket.ipfs_cid ?? '';
  if (ipfsCid.length < 10) {
    return { ok: false, error: 'EVIDENCE_NOT_PUBLISHED_IPFS', detail: `IPFS CID invalid or missing: ${ipfsCid || '(none)'}` };
  }

  // Fetchback verification: local hash must equal the hash fetched back from IPFS.
  let localSha256: string | undefined;
  let fetchedSha256: string | undefined;
  let matched = false;
  try {
    const report = JSON.parse(docket.validation_report);
    const ip = report.ipfs_publication;
    if (ip) {
      localSha256 = ip.local_sha256;
      fetchedSha256 = ip.fetched_sha256;
      matched = ip.matched === true && localSha256 === fetchedSha256;
    }
  } catch {
    /* validation_report not JSON with ipfs_publication */
  }
  if (!matched) {
    return { ok: false, error: 'IPFS_FETCHBACK_NOT_VERIFIED', detail: 'IPFS fetchback hashes do not match or are missing' };
  }

  return {
    ok: true,
    context: {
      execution_run_id: mission.id,
      contract_id: opts.contractId,
      upstream_job_id: opts.upstreamJobId,
      operator_address: opts.operatorAddress,
      evidence_docket_id: docket.id,
      ipfs_cid: ipfsCid,
      completion_uri: `ipfs://${ipfsCid}`,
      publication_status: docket.publication_status,
      local_sha256: localSha256,
      fetched_sha256: fetchedSha256,
      fetchback_matched: matched,
      validation_passed: mission.validation?.verdict === 'PASS',
      work_package_ready: true,
      approval_granted: true,
      completion_note: opts.completionNote || 'Job completed',
    },
  };
}

export function buildCompletionHumanSummary(context: CompletionContext): string {
  return [
    `Complete job #${context.upstream_job_id} on ${context.contract_id}`,
    context.evidence_docket_id ? `Evidence: ${context.evidence_docket_id.slice(0, 8)}…` : null,
    context.ipfs_cid ? `IPFS: ${context.ipfs_cid.slice(0, 20)}…` : null,
    context.fetchback_matched ? 'Fetchback verified' : null,
  ].filter(Boolean).join(' | ');
}
