// Thin, defensive read-side facade over the vendored AGIJobManager client.
// Returns null when no RPC is configured so the backend runs fine offline
// (simulation only) and only touches the chain when ETH_RPC_URL is set.

import { AGIJobManagerClient, type UpstreamJobSnapshot } from './agiJobManagerClient';
import { getProtocolConfig, contractExplorerUrl } from './config';

export interface ProtocolStatus {
  readOnlyAvailable: boolean;
  chainId: number;
  contracts: Record<string, string>;
  explorerBase: string;
}

export function protocolStatus(): ProtocolStatus {
  const c = getProtocolConfig();
  return {
    readOnlyAvailable: c.readOnlyAvailable,
    chainId: c.chainId,
    contracts: c.contracts,
    explorerBase: c.explorerBase,
  };
}

/** Build a read-only AGIJobManager client, or null if no RPC is configured. */
export function getJobManagerClient(): AGIJobManagerClient | null {
  const c = getProtocolConfig();
  if (!c.rpcUrl) return null;
  return new AGIJobManagerClient(c.contracts.AGI_JOB_MANAGER as `0x${string}`, c.rpcUrl, c.chainId);
}

export interface JobReadResult {
  available: boolean;
  reason?: string;
  snapshot?: UpstreamJobSnapshot & { explorerUrl: string };
}

/** Read a single upstream job snapshot, tolerating an unconfigured/unreachable RPC. */
export async function readJobSnapshot(jobId: bigint): Promise<JobReadResult> {
  const client = getJobManagerClient();
  if (!client) return { available: false, reason: 'ETH_RPC_URL not set — read-only mode unavailable' };
  try {
    const snapshot = await client.readJob(jobId);
    return {
      available: true,
      snapshot: { ...snapshot, explorerUrl: contractExplorerUrl(snapshot.contract, snapshot.chainId) },
    };
  } catch (e) {
    return { available: false, reason: `Read failed: ${(e as Error).message}` };
  }
}

/** Read the next job id (a cheap liveness probe for the read path). */
export async function readNextJobId(): Promise<{ available: boolean; nextJobId?: string; reason?: string }> {
  const client = getJobManagerClient();
  if (!client) return { available: false, reason: 'ETH_RPC_URL not set — read-only mode unavailable' };
  try {
    const id = await client.getNextJobId();
    return { available: true, nextJobId: id.toString() };
  } catch (e) {
    return { available: false, reason: `Read failed: ${(e as Error).message}` };
  }
}
