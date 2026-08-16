// Vendored from clawdtesting/Eth-Agi (apps/eth-console/lib/tx/outcome) — read-only outcome verification.
// Same-owner reuse. Verifies a submitted tx against the intended unsigned request; never signs.
export type TxOutcomeStatus =
  | "PENDING_RPC_VERIFICATION"
  | "VERIFIED_SUCCESS"
  | "VERIFIED_FAILURE"
  | "WRONG_CHAIN"
  | "WRONG_TARGET"
  | "WRONG_CALLDATA"
  | "WRONG_VALUE"
  | "WRONG_FUNCTION"
  | "PENDING_MANUAL_REVIEW"
  | "MANUAL_OVERRIDE_RECORDED"
  | "RPC_UNAVAILABLE"
  | "TX_NOT_FOUND";

export interface TxOutcomeImportInput {
  unsigned_tx_request_id: string;
  tx_hash: string;
  operator_note?: string;
  manual_override?: boolean;
}

export interface TxOutcomeVerificationResult {
  ok: boolean;
  status: TxOutcomeStatus;
  detail: string;
  tx_hash?: string;
  receipt_summary?: TxReceiptSummary;
  calldata_comparison?: TxCalldataComparison;
  decoded_logs?: TxOutcomeDecodedLog[];
  blocking_reasons: string[];
}

export interface TxReceiptSummary {
  chain_id?: number;
  block_number?: number;
  block_hash?: string;
  tx_index?: number;
  from: string;
  to: string;
  value?: string;
  gas_used?: string;
  effective_gas_price?: string;
  status: "success" | "reverted" | "pending" | "not_found";
  logs_count: number;
  transaction_hash: string;
}

export interface TxCalldataComparison {
  expected_to: string;
  actual_to: string;
  to_matches: boolean;
  expected_from?: string;
  actual_from?: string;
  from_matches?: boolean;
  expected_value: string;
  actual_value: string;
  value_matches: boolean;
  expected_data: string;
  actual_data: string;
  data_matches: boolean;
  decoded_function?: string;
  function_matches?: boolean;
  decoded_args?: Record<string, unknown>;
  args_match?: boolean;
  evidence_cid_in_args?: string;
  evidence_cid_matches?: boolean;
  upstream_job_id_in_args?: string;
  upstream_job_id_matches?: boolean;
  preview_missing: boolean;
}

export interface TxOutcomeAuditSummary {
  action: string;
  target_type: string;
  target_id: string;
  status: TxOutcomeStatus;
  operator: string;
  tx_hash?: string;
  details?: Record<string, unknown>;
}

export interface TxOutcomeDecodedLog {
  event_name: string;
  args: Record<string, unknown>;
  raw_log: string;
}
