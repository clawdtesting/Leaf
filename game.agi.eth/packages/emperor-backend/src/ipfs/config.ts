// Vendored from clawdtesting/Eth-Agi (apps/eth-console/lib/ipfs) — IPFS config + CID validation.
// Same-owner reuse. Uses PINATA_JWT (Bearer), not project id/secret.
export type IpfsProvider = "PINATA" | "MANUAL" | "DISABLED";
export type IpfsMode = "READY" | "PENDING_IPFS_CONFIG" | "MANUAL_EXPORT_REQUIRED";

export interface IpfsConfig {
  provider: IpfsProvider;
  hasCredentials: boolean;
  pinataJwtPresent: boolean;
  gatewayUrl: string;
  requireFetchback: boolean;
  mode: IpfsMode;
  warnings: string[];
}

export function getIpfsConfig(): IpfsConfig {
  const pinataJwt = (process.env.PINATA_JWT || "").trim();
  const gatewayUrl = sanitizeGatewayUrl(
    process.env.IPFS_GATEWAY_URL?.trim() || "https://gateway.pinata.cloud/ipfs"
  );
  const requireFetchback = process.env.IPFS_REQUIRE_FETCHBACK !== "false";
  const provider: IpfsProvider = pinataJwt ? "PINATA" : "MANUAL";
  const hasCredentials = Boolean(pinataJwt);
  const warnings: string[] = [];

  let mode: IpfsMode;
  if (hasCredentials) {
    mode = "READY";
  } else {
    mode = "MANUAL_EXPORT_REQUIRED";
    warnings.push("PINATA_JWT not set — IPFS publish unavailable, manual export required");
  }

  if (!gatewayUrl) {
    warnings.push("IPFS_GATEWAY_URL not set — fetchback verification unavailable");
  }

  return { provider, hasCredentials, pinataJwtPresent: hasCredentials, gatewayUrl, requireFetchback, mode, warnings };
}

export function validateIpfsConfig() {
  const config = getIpfsConfig();
  return { valid: config.mode === "READY", config };
}

export function getGatewayUrl(cid: string): string {
  if (!cid || cid.length < 10 || /\s/.test(cid)) return "";
  const base = sanitizeGatewayUrl(
    process.env.IPFS_GATEWAY_URL?.trim() || "https://gateway.pinata.cloud/ipfs"
  );
  return `${base.replace(/\/+$/, "")}/${cid}`;
}

function sanitizeGatewayUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.origin + parsed.pathname;
  } catch {
    return url;
  }
}
