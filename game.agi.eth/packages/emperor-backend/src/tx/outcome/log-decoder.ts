// Vendored from clawdtesting/Eth-Agi (apps/eth-console/lib/tx/outcome) — read-only outcome verification.
// Same-owner reuse. Verifies a submitted tx against the intended unsigned request; never signs.
import type { TxOutcomeDecodedLog } from "./types";

export function decodeKnownOutcomeLogs(
  receipt: { logs?: Array<{ address: string; topics: string[]; data: string }> },
  _contractId: string
): TxOutcomeDecodedLog[] {
  if (!receipt.logs || receipt.logs.length === 0) {
    return [];
  }

  const decoded: TxOutcomeDecodedLog[] = [];

  for (const log of receipt.logs) {
    const eventName = tryDecodeKnownEvent(log.topics, log.data);
    if (eventName) {
      decoded.push({
        event_name: eventName.name,
        args: eventName.args,
        raw_log: JSON.stringify({ address: log.address, topics: log.topics, data: log.data }),
      });
    } else {
      decoded.push({
        event_name: "UNKNOWN_EVENT",
        args: {},
        raw_log: JSON.stringify({ address: log.address, topics: log.topics, data: log.data }),
      });
    }
  }

  return decoded;
}

export function summarizeOutcomeLogs(
  decodedLogs: TxOutcomeDecodedLog[]
): { summary: string; known_events: number; unknown_events: number; warnings: string[] } {
  const known = decodedLogs.filter(l => l.event_name !== "UNKNOWN_EVENT");
  const unknown = decodedLogs.filter(l => l.event_name === "UNKNOWN_EVENT");
  const warnings: string[] = [];

  if (unknown.length > 0) {
    warnings.push(`${unknown.length} log(s) could not be decoded — no matching ABI event definition`);
  }

  const summary = decodedLogs.length === 0
    ? "No logs in receipt"
    : `${known.length} known event(s), ${unknown.length} unknown event(s)`;

  return { summary, known_events: known.length, unknown_events: unknown.length, warnings };
}

interface KnownEvent {
  name: string;
  args: Record<string, unknown>;
}

function tryDecodeKnownEvent(
  topics: string[],
  _data: string
): KnownEvent | null {
  if (!topics || topics.length === 0) return null;

  const eventSig = topics[0]?.toLowerCase();

  const knownSignatures: Record<string, KnownEvent> = {
    "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef": {
      name: "Transfer",
      args: { from: topics[1] ?? "", to: topics[2] ?? "", value: "see data field" },
    },
    "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925": {
      name: "Approval",
      args: { owner: topics[1] ?? "", spender: topics[2] ?? "", value: "see data field" },
    },
    "0x9ef7e0f3f52c85205089e018657c57d2350a0e09a9bcc1ab0fda4bc0202f37e8": {
      name: "JobCompleted",
      args: { jobId: topics[1] ?? "" },
    },
    "0xbe8d0edb3e895b971b89a78c79ad8e4b3a3e3f2c9625764ebd1eab1bcd1a63e4": {
      name: "JobDisputed",
      args: { jobId: topics[1] ?? "" },
    },
  };

  return knownSignatures[eventSig] ?? null;
}
