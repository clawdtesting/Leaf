// Real IPFS publish + fetchback verification for evidence bundles.
// The pin call is Eth-Agi's publishJsonToIpfs (provider.ts) without its
// Prisma-coupled bundle builder; the fetchback re-reads the pinned JSON from
// the gateway and confirms the hash matches what we uploaded.

import { getIpfsConfig, getGatewayUrl } from './config';
import { isLikelyCid } from './cid';
import { sha256String } from '../evidence';

const PINATA_API = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';

export interface PublishResult {
  ok: boolean;
  cid?: string;
  mode: 'PUBLISHED' | 'MANUAL_EXPORT_REQUIRED' | 'ERROR';
  local_sha256?: string;
  fetched_sha256?: string;
  matched?: boolean;
  gateway_url?: string;
  error?: string;
}

/** Deterministic JSON used for hashing on both the upload and fetchback sides. */
function canonical(obj: unknown): string {
  return JSON.stringify(obj, (_k, v) => (typeof v === 'bigint' ? v.toString() : v));
}

/** Pin a JSON bundle to IPFS via Pinata (requires PINATA_JWT). */
export async function pinJsonToIpfs(bundle: Record<string, unknown>, label: string): Promise<PublishResult> {
  const config = getIpfsConfig();
  if (!config.hasCredentials) {
    return { ok: false, mode: 'MANUAL_EXPORT_REQUIRED', error: 'PINATA_JWT not configured — set it in .env to enable IPFS publishing' };
  }
  const jwt = (process.env.PINATA_JWT || '').trim();
  try {
    const response = await fetch(PINATA_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({ pinataMetadata: { name: label || 'game-agi-evidence' }, pinataContent: bundle }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return { ok: false, mode: 'ERROR', error: `Pinata API error ${response.status}: ${body.slice(0, 200)}` };
    }
    const data = (await response.json()) as { IpfsHash?: string; Hash?: string };
    const cid = (data.IpfsHash || data.Hash || '').toString();
    if (!cid || !isLikelyCid(cid)) {
      return { ok: false, mode: 'ERROR', error: `Pinata returned an invalid CID: ${cid || '(none)'}` };
    }
    return { ok: true, mode: 'PUBLISHED', cid };
  } catch (e) {
    return { ok: false, mode: 'ERROR', error: (e as Error).message };
  }
}

/**
 * Publish a bundle and verify it by fetching it back from the gateway and
 * comparing hashes. Only returns matched:true when the gateway serves back
 * exactly what we pinned.
 */
export async function publishAndVerify(bundle: Record<string, unknown>, label: string): Promise<PublishResult> {
  const localSha = sha256String(canonical(bundle));
  const pin = await pinJsonToIpfs(bundle, label);
  if (!pin.ok || !pin.cid) return { ...pin, local_sha256: localSha };

  const gatewayUrl = getGatewayUrl(pin.cid);
  const config = getIpfsConfig();
  if (!config.requireFetchback) {
    return { ...pin, local_sha256: localSha, fetched_sha256: localSha, matched: true, gateway_url: gatewayUrl };
  }
  try {
    const resp = await fetch(gatewayUrl);
    if (!resp.ok) {
      return { ok: false, mode: 'ERROR', cid: pin.cid, local_sha256: localSha, matched: false, gateway_url: gatewayUrl, error: `Fetchback failed: gateway ${resp.status}` };
    }
    const fetched = await resp.json();
    const fetchedSha = sha256String(canonical(fetched));
    const matched = fetchedSha === localSha;
    return {
      ok: matched,
      mode: matched ? 'PUBLISHED' : 'ERROR',
      cid: pin.cid,
      local_sha256: localSha,
      fetched_sha256: fetchedSha,
      matched,
      gateway_url: gatewayUrl,
      error: matched ? undefined : 'Fetchback hash mismatch — pinned content differs from what was uploaded',
    };
  } catch (e) {
    return { ok: false, mode: 'ERROR', cid: pin.cid, local_sha256: localSha, matched: false, gateway_url: gatewayUrl, error: `Fetchback error: ${(e as Error).message}` };
  }
}
