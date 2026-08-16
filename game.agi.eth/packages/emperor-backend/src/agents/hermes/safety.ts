// Vendored from clawdtesting/Eth-Agi (apps/eth-console/lib/agents/hermes) — bounded agent runner.
// Same-owner reuse. Sandboxed workspace, secret-stripped env, unsigned/no-broadcast task gates.
import { getHermesConfig } from "./config";

const SECRET_KEY_PATTERNS = [
  /private.?key/i,
  /seed.?phrase/i,
  /mnemonic/i,
  /wallet.?secret/i,
  /signing.?key/i,
  /secret/i,
  /password/i,
  /token/i,
  /jwt/i,
  /api.?key/i,
  /pinata/i,
];

const SECRET_EXACT_KEYS = [
  "OPERATOR_API_KEY",
  "AGENT_API_KEY",
  "PINATA_JWT",
  "ETH_RPC_URL",
  "PRIVATE_KEY",
  "SEED_PHRASE",
  "MNEMONIC",
  "WALLET_SECRET",
  "SIGNING_KEY",
];

const ALLOWLISTED_SAFE_KEYS = new Set([
  "HERMES_ENABLED",
  "HERMES_COMMAND",
  "HERMES_WORKSPACE_ROOT",
  "HERMES_TIMEOUT_MS",
  "HERMES_MAX_OUTPUT_BYTES",
  "HERMES_MOCK_MODE",
  "HERMES_ALLOWED_NETWORK",
  "HERMES_ALLOWED_TOOLS",
  "PATH",
  "HOME",
  "USER",
  "TMPDIR",
  "TEMP",
  "NODE_ENV",
  "DATABASE_URL",
]);

export function sanitizeHermesEnvironment(env?: NodeJS.ProcessEnv): Record<string, string> {
  const source = env ?? process.env;
  const safe: Record<string, string> = {};

  for (const [key, value] of Object.entries(source)) {
    if (!key || value === undefined) continue;
    if (isSecretKey(key)) continue;
    safe[key] = value;
  }

  const hermesAllowedKeys = ["HERMES_ENABLED", "HERMES_COMMAND", "HERMES_WORKSPACE_ROOT",
    "HERMES_TIMEOUT_MS", "HERMES_MAX_OUTPUT_BYTES", "HERMES_MOCK_MODE",
    "HERMES_ALLOWED_NETWORK", "HERMES_ALLOWED_TOOLS"];
  for (const key of hermesAllowedKeys) {
    const val = source[key];
    if (val !== undefined) {
      safe[key] = val;
    }
  }

  safe.HERMES_ENABLED = "true";
  safe.HERMES_MOCK_MODE = getHermesConfig().mockMode ? "true" : "false";

  if (!safe.PATH) safe.PATH = "/usr/local/bin:/usr/bin:/bin";
  if (!safe.HOME) safe.HOME = "/tmp";
  if (!safe.TMPDIR) safe.TMPDIR = "/tmp";

  return safe;
}

function isSecretKey(key: string): boolean {
  const upper = key.toUpperCase();
  if (SECRET_EXACT_KEYS.includes(upper)) return true;
  if (ALLOWLISTED_SAFE_KEYS.has(key)) return false;
  for (const pattern of SECRET_KEY_PATTERNS) {
    if (pattern.test(key)) return true;
  }
  return false;
}

export function validateHermesWorkspacePath(path: string): { valid: boolean; error?: string } {
  if (!path) {
    return { valid: false, error: "Path is empty" };
  }
  if (path.includes("..")) {
    return { valid: false, error: "Path traversal detected ('..')" };
  }
  if (path.includes("~")) {
    return { valid: false, error: "Path contains tilde expansion" };
  }
  if (path.startsWith("/") && !path.startsWith("/tmp/")) {
    return { valid: false, error: "Absolute path must be under /tmp/ for safety" };
  }
  if (/[\x00-\x1f\x7f]/.test(path)) {
    return { valid: false, error: "Path contains control characters" };
  }
  return { valid: true };
}

export function assertNoSecretEnvLeak(env: Record<string, string>): Record<string, string> {
  const leaked: string[] = [];
  const checked: Record<string, string> = {};

  for (const key of Object.keys(env)) {
    const upper = key.toUpperCase();
    const isSecret = SECRET_EXACT_KEYS.includes(upper) || SECRET_KEY_PATTERNS.some(p => p.test(key));
    if (isSecret) {
      leaked.push(key);
    } else {
      checked[key] = env[key];
    }
  }

  if (leaked.length > 0) {
    console.warn(`[HermesSafety] Blocked ${leaked.length} secret env var(s) from Hermes: ${leaked.join(", ")}`);
  }

  return checked;
}

export function buildHermesSystemBoundary(): {
  allowedDirs: string[];
  blockedDirs: string[];
  blockedOperations: string[];
} {
  const cfg = getHermesConfig();
  return {
    allowedDirs: [cfg.workspaceRoot, "/tmp"],
    blockedDirs: ["/etc", "/var", "/root", "/home", "/proc", "/sys"],
    blockedOperations: [
      "network", "write_fs_outside_workspace",
      "exec_shell", "spawn_docker",
      "access_secrets", "access_wallet",
      "sign", "broadcast", "send_transaction",
      "write_contract", "publish_ipfs",
    ],
  };
}

export function validateHermesTaskEligibility(input: {
  objective: string;
  instructions: string;
  risk_level: string;
  hasOperatorApproval?: boolean;
}): { eligible: boolean; blockingReasons: string[] } {
  const blockingReasons: string[] = [];

  const lowerObj = (input.objective + " " + input.instructions).toLowerCase();

  const blockedPatterns = [
    { pattern: /\bsign\b/i, reason: "Task contains signing instructions" },
    { pattern: /\bbroadcast\b/i, reason: "Task contains broadcast instructions" },
    { pattern: /sendTransaction|send_transaction/i, reason: "Task contains sendTransaction" },
    { pattern: /writeContract|write_contract/i, reason: "Task contains writeContract" },
    { pattern: /private.?key/i, reason: "Task references private keys" },
    { pattern: /seed.?phrase/i, reason: "Task references seed phrases" },
    { pattern: /wallet.?custody/i, reason: "Task requests wallet custody" },
    { pattern: /metaMask|ledger/i, reason: "Task asks Hermes to use MetaMask/Ledger directly" },
    { pattern: /publish.*ipfs/i, reason: "Task asks Hermes to publish IPFS directly (must go through Eth-Agi pipeline)" },
    { pattern: /bypass|force.*tx|unsafe/i, reason: "Task contains bypass flags or unsafe operations" },
  ];

  for (const bp of blockedPatterns) {
    if (bp.pattern.test(lowerObj)) {
      blockingReasons.push(bp.reason);
    }
  }

  const risk = input.risk_level?.toLowerCase() || "low";
  if (["high", "critical"].includes(risk) && !input.hasOperatorApproval) {
    blockingReasons.push(`Risk level '${risk}' requires operator approval`);
  }

  return {
    eligible: blockingReasons.length === 0,
    blockingReasons,
  };
}
