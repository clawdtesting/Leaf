// Vendored from clawdtesting/Eth-Agi (apps/eth-console/lib/protocol/config.ts) — read-only protocol / evidence logic.
// Same-owner reuse; keep in sync with upstream when the ABIs or model change.
export const KNOWN_CONTRACTS = {
  AGI_JOB_MANAGER: {
    address: process.env.AGI_JOB_MANAGER_ADDRESS?.trim() || "0xB3AAeb69b630f0299791679c063d68d6687481d1",
    label: "AGI JobManager",
  },
  AGI_JOB_MANAGER_PRIME: {
    address: process.env.AGI_JOB_MANAGER_PRIME_ADDRESS?.trim() || "0xd5EF1dde7Ac60488f697ff2A7967a52172A78F29",
    label: "AGI JobManager Prime",
  },
  AGI_ALPHA_TOKEN: {
    address: process.env.AGI_ALPHA_TOKEN_ADDRESS?.trim() || "0xA61a3B3a130a9c20768EEBF97E21515A6046a1fA",
    label: "AGI Alpha Token",
  },
} as const;

export type UpstreamContract = keyof typeof KNOWN_CONTRACTS | "MANUAL";

export function getProtocolConfig() {
  const ethRpcUrl = (process.env.ETH_RPC_URL || "").trim();
  const chainId = parseInt(process.env.CHAIN_ID || "1", 10);

  return {
    chainId,
    rpcUrl: ethRpcUrl || null,
    readOnlyAvailable: ethRpcUrl.length > 0,
    contracts: {
      AGI_JOB_MANAGER: KNOWN_CONTRACTS.AGI_JOB_MANAGER.address,
      AGI_JOB_MANAGER_PRIME: KNOWN_CONTRACTS.AGI_JOB_MANAGER_PRIME.address,
      AGI_ALPHA_TOKEN: KNOWN_CONTRACTS.AGI_ALPHA_TOKEN.address,
    },
    explorerBase: getExplorerBase(chainId),
  };
}

export function validateProtocolConfig() {
  const issues: string[] = [];
  const config = getProtocolConfig();

  if (!Number.isFinite(config.chainId) || config.chainId <= 0) {
    issues.push(`Invalid CHAIN_ID: ${process.env.CHAIN_ID}`);
  }

  for (const [name, addr] of Object.entries(config.contracts)) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      issues.push(`${name} address is not a valid Ethereum address: ${addr}`);
    }
  }

  if (!config.readOnlyAvailable) {
    issues.push("ETH_RPC_URL not set — read-only mode unavailable, manual/fixture only");
  }

  return {
    valid: issues.length === 0,
    issues,
    config,
  };
}

export function getExplorerBase(chainId: number): string {
  const env = process.env.BLOCK_EXPLORER_BASE_URL?.replace(/\/+$/, "");
  if (env) return env;
  const bases: Record<number, string> = {
    1: "https://etherscan.io",
    11155111: "https://sepolia.etherscan.io",
    5: "https://goerli.etherscan.io",
    31337: "http://localhost:8545",
  };
  return bases[chainId] || `https://explorer.chain-${chainId}.invalid`;
}

export function contractExplorerUrl(contractAddress: string, chainId?: number): string {
  const base = getExplorerBase(chainId ?? getProtocolConfig().chainId);
  return `${base}/address/${contractAddress}`;
}
