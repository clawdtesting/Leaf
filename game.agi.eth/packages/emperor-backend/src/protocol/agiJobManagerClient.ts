// Vendored from clawdtesting/Eth-Agi (packages/protocol/src/clients/agiJobManagerClient.ts) — read-only protocol / evidence logic.
// Same-owner reuse; keep in sync with upstream when the ABIs or model change.
import { createPublicClient, http, type PublicClient } from "viem";
import { mainnet, sepolia } from "viem/chains";
import agiJobManagerAbi from "./abis/agiJobManager.json";

function chainFromId(chainId: number, rpcUrl: string) {
  if (chainId === mainnet.id) return mainnet;
  if (chainId === sepolia.id) return sepolia;
  return {
    id: chainId,
    name: `chain-${chainId}`,
    nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  } as const;
}

export type JobCoreTuple = readonly [
  `0x${string}`,
  `0x${string}`,
  bigint,
  bigint,
  bigint,
  boolean,
  boolean,
  boolean,
  number,
];

export type JobValidationTuple = readonly [
  boolean,
  bigint,
  bigint,
  bigint,
  bigint,
];

export type UpstreamJobSnapshot = {
  jobId: string;
  chainId: number;
  contract: `0x${string}`;
  core: JobCoreTuple;
  validation: JobValidationTuple;
  jobSpecUri: string;
  jobCompletionUri: string;
};

export class AGIJobManagerClient {
  private client: PublicClient;
  private contractAddress: `0x${string}`;

  constructor(
    contractAddress: `0x${string}`,
    rpcUrl: string,
    chainId: number
  ) {
    if (!rpcUrl?.trim()) {
      throw new Error("AGIJobManagerClient: RPC URL is required for read-only access");
    }
    const chain = chainFromId(chainId, rpcUrl);
    this.contractAddress = contractAddress;
    this.client = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });
  }

  async getNextJobId(): Promise<bigint> {
    return this.client.readContract({
      address: this.contractAddress,
      abi: agiJobManagerAbi.abi,
      functionName: "nextJobId",
      args: [],
    }) as Promise<bigint>;
  }

  async readJob(jobId: bigint): Promise<UpstreamJobSnapshot> {
    const [rawCore, rawVal, jobSpecUri, jobCompletionUri] = await Promise.all([
      this.client.readContract({
        address: this.contractAddress,
        abi: agiJobManagerAbi.abi,
        functionName: "getJobCore",
        args: [jobId],
      }),
      this.client.readContract({
        address: this.contractAddress,
        abi: agiJobManagerAbi.abi,
        functionName: "getJobValidation",
        args: [jobId],
      }),
      this.client.readContract({
        address: this.contractAddress,
        abi: agiJobManagerAbi.abi,
        functionName: "getJobSpecURI",
        args: [jobId],
      }) as Promise<string>,
      this.client.readContract({
        address: this.contractAddress,
        abi: agiJobManagerAbi.abi,
        functionName: "getJobCompletionURI",
        args: [jobId],
      }) as Promise<string>,
    ]);

    const core = normalizeJobCore(rawCore);
    const validation = normalizeJobValidation(rawVal);

    return {
      jobId: jobId.toString(),
      chainId: this.client.chain?.id ?? 0,
      contract: this.contractAddress,
      core,
      validation,
      jobSpecUri,
      jobCompletionUri,
    };
  }
}

export function normalizeJobCore(raw: unknown): JobCoreTuple {
  if (Array.isArray(raw) && raw.length >= 9) {
    return raw as unknown as JobCoreTuple;
  }
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    return [
      o.employer as `0x${string}`,
      o.assignedAgent as `0x${string}`,
      BigInt(String(o.payout ?? 0)),
      BigInt(String(o.duration ?? 0)),
      BigInt(String(o.assignedAt ?? 0)),
      Boolean(o.completed),
      Boolean(o.disputed),
      Boolean(o.expired),
      Number(o.agentPayoutPct ?? 0),
    ];
  }
  throw new Error("Unexpected getJobCore return shape");
}

export function normalizeJobValidation(raw: unknown): JobValidationTuple {
  if (Array.isArray(raw) && raw.length >= 5) {
    return raw as unknown as JobValidationTuple;
  }
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    return [
      Boolean(o.completionRequested),
      BigInt(String(o.validatorApprovals ?? 0)),
      BigInt(String(o.validatorDisapprovals ?? 0)),
      BigInt(String(o.completionRequestedAt ?? 0)),
      BigInt(String(o.disputedAt ?? 0)),
    ];
  }
  throw new Error("Unexpected getJobValidation return shape");
}
