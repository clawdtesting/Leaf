// OpenSea proxy — resolves the Mancer NFTs owned by a wallet through the
// OpenSea API. The API key lives ONLY here on the server and is never exposed
// to the game client. If the key is not configured, callers get
// { available: false } and fall back to on-chain enumeration.
//
// The OpenSea chain slug does not need to be known up front: when only the
// collection slug (OPENSEA_COLLECTION, e.g. "chain-mancers") is configured, the
// chain and contract are auto-discovered from the collection endpoint.
//
// Docs: https://docs.opensea.io/reference/list_nfts_by_account
//       https://docs.opensea.io/reference/get_collection

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
  const collection = (process.env.OPENSEA_COLLECTION || '').trim();
  return { key, chain, collection };
}

// Cache the chain/contract discovered from the collection slug so we don't
// re-fetch it on every card open.
let discovered: { chain: string; contract?: string } | null = null;

async function osFetch(pathAndQuery: string, key: string): Promise<any | null> {
  try {
    const resp = await fetch(`${OPENSEA_BASE}${pathAndQuery}`, {
      headers: { 'x-api-key': key, accept: 'application/json' },
    });
    if (!resp.ok) return { __httpError: resp.status };
    return await resp.json();
  } catch (e: any) {
    return { __error: e?.message || String(e) };
  }
}

/**
 * Resolve the OpenSea chain slug (and contract) to use. Prefers an explicit
 * OPENSEA_CHAIN; otherwise reads it from the collection endpoint using
 * OPENSEA_COLLECTION. Returns null when neither is usable.
 */
async function resolveChain(key: string): Promise<{ chain: string; contract?: string } | null> {
  const { chain, collection } = config();
  if (chain) return { chain };
  if (discovered) return discovered;
  if (!collection) return null;

  const data = await osFetch(`/collections/${encodeURIComponent(collection)}`, key);
  const contracts: any[] = Array.isArray(data?.contracts) ? data.contracts : [];
  if (contracts.length > 0 && contracts[0]?.chain) {
    discovered = { chain: String(contracts[0].chain), contract: contracts[0].address ? String(contracts[0].address) : undefined };
    return discovered;
  }
  return null;
}

export function openSeaStatus() {
  const { key, chain, collection } = config();
  return {
    available: Boolean(key && (chain || collection)),
    chain: chain || discovered?.chain || null,
    collection: collection || null,
    hasKey: Boolean(key),
  };
}

/**
 * List the Mancer NFTs owned by `address`, filtered to `contract`. The chain is
 * taken from OPENSEA_CHAIN or auto-discovered from OPENSEA_COLLECTION. Paginates
 * through the account's NFTs (bounded). Returns { available: false } when
 * OpenSea is not configured or the request fails, so the caller can fall back to
 * on-chain enumeration.
 */
export async function fetchMancersFromOpenSea(
  address: string,
  contract: string,
  max = 48,
): Promise<OpenSeaResult> {
  const { key, collection } = config();
  if (!key) return { available: false, error: 'OPENSEA_KEY not configured' };
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return { available: true, mancers: [], error: 'Invalid address' };
  }

  const resolved = await resolveChain(key);
  if (!resolved?.chain) {
    return { available: false, error: 'OpenSea chain unresolved (set OPENSEA_CHAIN or OPENSEA_COLLECTION)' };
  }
  const chain = resolved.chain;
  // Filter by the discovered contract when the caller didn't pass one.
  const want = (contract || resolved.contract || '').toLowerCase();

  const out: OpenSeaMancer[] = [];
  let cursor: string | undefined;

  // Up to ~10 pages of 200 = 2000 NFTs scanned; ample for a game wallet.
  for (let page = 0; page < 10 && out.length < max; page++) {
    let q = `/chain/${encodeURIComponent(chain)}/account/${address}/nfts?limit=200`;
    if (collection) q += `&collection=${encodeURIComponent(collection)}`;
    if (cursor) q += `&next=${encodeURIComponent(cursor)}`;

    const data = await osFetch(q, key);
    if (data?.__httpError) return { available: false, error: `OpenSea HTTP ${data.__httpError}` };
    if (data?.__error) return { available: false, error: data.__error };

    const nfts: any[] = Array.isArray(data?.nfts) ? data.nfts : [];
    for (const n of nfts) {
      if (want && String(n?.contract || '').toLowerCase() !== want) continue;
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
}
