// Vendored from clawdtesting/Eth-Agi (apps/eth-console/lib/tx) — unsigned-tx production.
// Same-owner reuse. This backend never signs or broadcasts (reuse brief §6).
import { type Abi } from "viem";
import type { ContractId, TxFunctionId, TxTargetContract } from "./types";

const AGI_JOB_MANAGER_ADDRESS = "0xB3AAeb69b630f0299791679c063d68d6687481d1";
const AGI_JOB_MANAGER_PRIME_ADDRESS = "0xd5EF1dde7Ac60488f697ff2A7967a52172A78F29";

export const CONTRACT_IDS = {
  AGI_JOB_MANAGER: "AGI_JOB_MANAGER" as ContractId,
  AGI_JOB_MANAGER_PRIME: "AGI_JOB_MANAGER_PRIME" as ContractId,
};

export const FUNCTION_IDS = {
  REQUEST_JOB_COMPLETION: "REQUEST_JOB_COMPLETION" as TxFunctionId,
  GENERIC_COMPLETION_FALLBACK: "GENERIC_COMPLETION_FALLBACK" as TxFunctionId,
};

const JOB_MANAGER_ABI: Abi = [
  {
    name: "requestJobCompletion",
    type: "function",
    inputs: [
      { name: "_jobId", type: "uint256" },
      { name: "_jobCompletionURI", type: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
];

const JOB_MANAGER_PRIME_ABI: Abi = [
  {
    name: "requestJobCompletion",
    type: "function",
    inputs: [
      { name: "_jobId", type: "uint256" },
      { name: "_jobCompletionURI", type: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
];

const CONTRACT_CONFIG: Record<ContractId, TxTargetContract> = {
  AGI_JOB_MANAGER: {
    id: "AGI_JOB_MANAGER",
    address: AGI_JOB_MANAGER_ADDRESS,
    label: "AGI Job Manager",
  },
  AGI_JOB_MANAGER_PRIME: {
    id: "AGI_JOB_MANAGER_PRIME",
    address: AGI_JOB_MANAGER_PRIME_ADDRESS,
    label: "AGI Job Manager Prime",
  },
};

const LOCAL_CONTRACT_ADDRESSES: Record<string, ContractId> = {};

function buildLocalOverrides() {
  const mgr = process.env.AGI_JOB_MANAGER_ADDRESS?.trim().toLowerCase();
  const prime = process.env.AGI_JOB_MANAGER_PRIME_ADDRESS?.trim().toLowerCase();
  if (mgr) LOCAL_CONTRACT_ADDRESSES[mgr] = "AGI_JOB_MANAGER";
  if (prime) LOCAL_CONTRACT_ADDRESSES[prime] = "AGI_JOB_MANAGER_PRIME";
}
buildLocalOverrides();

export function getContractAbi(contractId: ContractId): Abi {
  if (contractId === "AGI_JOB_MANAGER") return JOB_MANAGER_ABI;
  if (contractId === "AGI_JOB_MANAGER_PRIME") return JOB_MANAGER_PRIME_ABI;
  return JOB_MANAGER_ABI;
}

export function getCompletionFunction(
  contractId: ContractId,
  preferredFunction?: TxFunctionId
): { functionName: string; abi: Abi; functionId: TxFunctionId } | null {
  const abi = getContractAbi(contractId);
  const fnName = preferredFunction === "REQUEST_JOB_COMPLETION"
    ? "requestJobCompletion"
    : null;

  if (fnName) {
    const found = abi.find((item) => item.type === "function" && item.name === fnName);
    if (found) {
      return { functionName: fnName, abi, functionId: preferredFunction! };
    }
  }

  if (preferredFunction === "GENERIC_COMPLETION_FALLBACK") {
    return null;
  }

  const fallback = abi.find((item) => item.type === "function" && item.name === "requestJobCompletion");
  if (fallback) {
    return { functionName: "requestJobCompletion", abi, functionId: "REQUEST_JOB_COMPLETION" };
  }

  return null;
}

export function getContractAddress(contractId: ContractId): string {
  return CONTRACT_CONFIG[contractId]?.address ?? AGI_JOB_MANAGER_ADDRESS;
}

export function getContractIdByAddress(address: string): ContractId | null {
  const lower = address.toLowerCase();
  for (const [addr, id] of Object.entries(LOCAL_CONTRACT_ADDRESSES)) {
    if (addr === lower) return id;
  }
  for (const [, config] of Object.entries(CONTRACT_CONFIG)) {
    if (config.address.toLowerCase() === lower) return config.id;
  }
  return null;
}

export function listSupportedTxTargets(): TxTargetContract[] {
  return Object.values(CONTRACT_CONFIG);
}

export function validateAbiRegistry(): string[] {
  const errors: string[] = [];
  for (const [id, config] of Object.entries(CONTRACT_CONFIG)) {
    const abi = getContractAbi(id as ContractId);
    if (!abi || abi.length === 0) {
      errors.push(`No ABI for contract: ${id}`);
    }
    if (!config.address || config.address.length < 40) {
      errors.push(`Invalid address for contract: ${id}`);
    }
    const hasWrite = abi.some(
      (item) => item.type === "function" && (item as any).stateMutability === "nonpayable"
    );
    if (!hasWrite) {
      errors.push(`No nonpayable functions in ABI for: ${id}`);
    }
  }
  return errors;
}
