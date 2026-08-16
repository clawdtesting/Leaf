// Pure wallet-export packaging (no Prisma, no filesystem). Produces the
// operator-facing UNSIGNED transaction package a human signs externally with
// MetaMask/Ledger. Instruction text preserved from Eth-Agi's wallet-export.ts.

import type { WalletExportPackage, CompletionTxPreview } from './types';

export function buildWalletExportPackage(
  unsignedTxRequestId: string,
  preview: CompletionTxPreview,
  from: string,
  safetyChecks: Array<{ name: string; passed: boolean; detail: string }>,
): WalletExportPackage {
  const chainId = preview.chain_id;
  return {
    schema: 'eth.agi.eth/wallet-export/v1',
    unsigned_tx_request_id: unsignedTxRequestId,
    created_at: new Date().toISOString(),
    chain_id: chainId,
    from,
    to: preview.to,
    value: preview.value,
    data: preview.data,
    gas_hint: null,
    purpose: preview.human_summary,
    human_summary: preview.human_summary,
    safety_checks: JSON.stringify({ checks: safetyChecks, preview }),
    decoded_preview: preview,
    evidence_docket_id: preview.evidence.evidence_docket_id,
    ipfs_cid: preview.evidence.ipfs_cid,
    instructions: {
      metamask: [
        `Open MetaMask and select the correct network (Chain ID: ${chainId}).`,
        `Go to 'Send' and paste the recipient address: ${preview.to}`,
        "Set value to 0 ETH (no value transfer).",
        "Click 'Hex' or 'Data' and paste the calldata from this export.",
        "Review the decoded transaction data carefully before signing.",
        "If the data looks suspicious, reject the transaction and contact the operator.",
      ],
      ledger: [
        "Connect Ledger to MetaMask or Rabby Wallet.",
        `Select the correct network (Chain ID: ${chainId}).`,
        "Use the 'Contract Interaction' option.",
        `Set contract address to: ${preview.to}`,
        "Paste the hex calldata from this export.",
        "Verify the transaction parameters on your Ledger screen.",
        "Do not sign if the parameters do not match exactly.",
      ],
      warning: [
        "game.agi.eth does not sign or broadcast transactions.",
        "Review all calldata in your wallet before signing.",
        "Verify the contract address matches the expected AGI Alpha contract.",
        "Never share your seed phrase or private key.",
        "This is an unsigned transaction package only.",
        "Use MetaMask or Ledger externally to sign and broadcast.",
      ],
    },
  };
}
