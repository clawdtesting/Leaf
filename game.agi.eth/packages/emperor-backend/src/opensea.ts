// OpenSea proxy — resolves the Mancer NFTs owned by a wallet through the
// OpenSea API. The API key lives ONLY here on the server and is never exposed
// to the game client. If the key or chain is not configured, callers get
// { available: false } and fall back to on-chain enumeration.
//
// Docs: https://docs.opensea.io/reference/list_nfts_by_account

export interface OpenSeaMancer {
  tokenId: string;
  name?: string;
  image?: string;
}

export interface OpenSeaResult {
  available: boolean;   // was the OpenSea path usable at all?
  mancers?: OpenSeaMancer[];
  error?: string;
}

const OPENSEA_BASE = 'https://api.opensea.io/api/v2';

function config() {
  const key = (process.env.OPENSEA_KEY || process.env.OPENSEA_API_KEY || '').trim();
  const chain = (process.env.OPENSEA_CHAIN || '').trim();
  return { key, chain };
}

export function openSeaStatus() {
  const { key, chain } = config();
  return {
    available: Boolean(key && chain),
    chain: chain || null,
    hasKey: Boolean(key),
  };
}

/**
 * List the Mancer NFTs owned by `address` on the configured chain, filtered to
 * `contract`. Paginates through the account's NFTs (bounded). Returns
 * { available: false } when OpenSea is not configured or the request fails, so
 * the caller can fall back to on-chain enumeration.
 */
export async function fetchMancersFromOpenSea(
  address: string,
  contract: string,
  max = 48,
): Promise<OpenSeaResult> {
  const { key, chain } = config();
  if (!key || !chain) {
    return { available: false, error: 'OPENSEA_KEY / OPENSEA_CHAIN not configured' };
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return { available: true, mancers: [], error: 'Invalid address' };
  }

  const want = contract.toLowerCase();
  const out: OpenSeaMancer[] = [];
  let cursor: string | undefined;

  try {
    // Up to ~10 pages of 200 = 2000 NFTs scanned; ample for a game wallet.
    for (let page = 0; page < 10 && out.length < max; page++) {
      const url = new URL(`${OPENSEA_BASE}/chain/${encodeURIComponent(chain)}/account/${address}/nfts`);
      url.searchParams.set('limit', '200');
      if (cursor) url.searchParams.set('next', cursor);

      const resp = await fetch(url.toString(), {
        headers: { 'x-api-key': key, accept: 'application/json' },
      });
      if (!resp.ok) {
        // 400/401/404 typically means the chain slug is wrong or unsupported.
        return { available: false, error: `OpenSea HTTP ${resp.status}` };
      }
      const data: any = await resp.json();
      const nfts: any[] = Array.isArray(data?.nfts) ? data.nfts : [];
      for (const n of nfts) {
        if (String(n?.contract || '').toLowerCase() !== want) continue;
        out.push({
          tokenId: String(n.identifier),
          name: n.name || undefined,
          image: n.display_image_url || n.image_url || undefined,
        });
        if (out.length >= max) break;
      }
      cursor = data?.next || undefined;
      if (!cursor) break;
    }
    return { available: true, mancers: out };
  } catch (e: any) {
    return { available: false, error: e?.message || String(e) };
  }
}
