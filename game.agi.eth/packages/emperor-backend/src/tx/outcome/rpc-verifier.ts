// Vendored from clawdtesting/Eth-Agi (apps/eth-console/lib/tx/outcome) — read-only outcome verification.
// Same-owner reuse. Verifies a submitted tx against the intended unsigned request; never signs.
import { createPublicClient, http, type PublicClient, type Transaction, type TransactionReceipt } from "viem";
import { mainnet } from "viem/chains";
import type { TxReceiptSummary } from "./types";

let cachedClient: PublicClient | null = null;

export function createOutcomeReadOnlyClient(): { client: PublicClient | null; available: boolean; url: string | null } {
  const rpcUrl = process.env.ETH_RPC_URL?.trim();
  if (!rpcUrl) {
    return { client: null, available: false, url: null };
  }

  if (!cachedClient) {
    cachedClient = createPublicClient({
      chain: mainnet,
      transport: http(rpcUrl),
    });
  }

  return { client: cachedClient, available: true, url: rpcUrl };
}

export async function fetchTxAndReceipt(
  txHash: `0x${string}`
): Promise<{
  ok: boolean;
  status: "TX_NOT_FOUND" | "PENDING_RPC_VERIFICATION" | "FOUND";
  tx?: Transaction;
  receipt?: TransactionReceipt;
  detail: string;
}> {
  const { client, available } = createOutcomeReadOnlyClient();
  if (!available || !client) {
    return { ok: false, status: "TX_NOT_FOUND", detail: "ETH_RPC_URL not configured" };
  }

  try {
    const tx = await client.getTransaction({ hash: txHash });
    if (!tx) {
      return { ok: false, status: "TX_NOT_FOUND", detail: "Transaction not found" };
    }

    const receipt = await client.getTransactionReceipt({ hash: txHash });
    if (!receipt) {
      return {
        ok: false,
        status: "PENDING_RPC_VERIFICATION",
        detail: "Transaction found but receipt not yet available (pending)",
        tx,
      };
    }

    return { ok: true, status: "FOUND", tx, receipt, detail: "Transaction and receipt found" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("not found") || msg.includes("does not exist") || msg.includes("not exist")) {
      return { ok: false, status: "TX_NOT_FOUND", detail: "Transaction not found on chain" };
    }
    return { ok: false, status: "PENDING_RPC_VERIFICATION", detail: `RPC error: ${msg.slice(0, 200)}` };
  }
}

export function verifyReceiptSuccess(receipt: TransactionReceipt): boolean {
  return receipt.status === "success";
}

export function summarizeTransaction(
  tx: Transaction,
  receipt: TransactionReceipt
): TxReceiptSummary {
  return {
    chain_id: tx.chainId ? Number(tx.chainId) : undefined,
    block_number: receipt.blockNumber ? Number(receipt.blockNumber) : undefined,
    block_hash: receipt.blockHash,
    tx_index: receipt.transactionIndex ? Number(receipt.transactionIndex) : undefined,
    from: tx.from,
    to: tx.to ?? "0x0000000000000000000000000000000000000000",
    value: tx.value?.toString() ?? "0",
    gas_used: receipt.gasUsed?.toString() ?? "0",
    effective_gas_price: receipt.effectiveGasPrice?.toString() ?? "0",
    status: receipt.status === "success" ? "success" : "reverted",
    logs_count: receipt.logs?.length ?? 0,
    transaction_hash: receipt.transactionHash,
  };
}

export function getExpectedChainId(): number {
  const raw = process.env.CHAIN_ID?.trim();
  if (!raw) return 1;
  const n = parseInt(raw, 10);
  return isNaN(n) ? 1 : n;
}
