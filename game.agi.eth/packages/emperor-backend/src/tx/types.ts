// Vendored from clawdtesting/Eth-Agi (apps/eth-console/lib/tx) — unsigned-tx production.
// Same-owner reuse. This backend never signs or broadcasts (reuse brief §6).
export type ContractId = "AGI_JOB_MANAGER" | "AGI_JOB_MANAGER_PRIME";

export type TxFunctionId =
  | "REQUEST_JOB_COMPLETION"
  | "GENERIC_COMPLETION_FALLBACK";

export type TxPackageStatus = "DRAFT" | "READY_FOR_WALLET" | "REJECTED" | "EXECUTED_EXTERNALLY";

export interface CompletionTxBuildInput {
  execution_run_id: string;
  evidence_docket_id?: string;
  work_package_id?: string;
  contract_id: ContractId;
  upstream_job_id: string;
  function_id?: string;
  operator_address: string;
  completion_note?: string;
  allow_manual_abi?: boolean;
}

export interface CompletionTxBuildResult {
  ok: boolean;
  status: "DRAFT" | "BLOCKED";
  blocking_reasons: string[];
  unsigned_tx_id?: string;
  preview?: CompletionTxPreview;
}

export interface CompletionTxPreview {
  chain_id: number;
  contract_id: string;
  contract_address: string;
  function_name: string;
  args: unknown[];
  decoded_args: Record<string, unknown>;
  to: string;
  value: string;
  data: string;
  human_summary: string;
  evidence: {
    evidence_docket_id: string;
    ipfs_cid: string;
    gateway_url?: string;
    publication_status: string;
    local_sha256?: string;
    fetched_sha256?: string;
    matched: boolean;
  };
  safety_checks: Array<{ name: string; passed: boolean; detail: string }>;
}

export interface WalletExportPackage {
  schema: "eth.agi.eth/wallet-export/v1";
  unsigned_tx_request_id: string;
  created_at: string;
  chain_id: number;
  from: string;
  to: string;
  value: string;
  data: string;
  gas_hint: string | null;
  purpose: string;
  human_summary: string;
  safety_checks: string;
  decoded_preview: CompletionTxPreview;
  evidence_docket_id: string;
  ipfs_cid: string;
  instructions: {
    metamask: string[];
    ledger: string[];
    warning: string[];
  };
}

export interface TxTargetContract {
  id: ContractId;
  address: string;
  label: string;
}
