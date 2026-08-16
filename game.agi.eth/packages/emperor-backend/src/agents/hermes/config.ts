// Vendored from clawdtesting/Eth-Agi (apps/eth-console/lib/agents/hermes) — bounded agent runner.
// Same-owner reuse. Sandboxed workspace, secret-stripped env, unsigned/no-broadcast task gates.
export interface HermesConfig {
  enabled: boolean;
  command: string;
  workspaceRoot: string;
  timeoutMs: number;
  maxOutputBytes: number;
  mockMode: boolean;
  allowedNetwork: boolean;
  allowedTools: string[];
  mode: "DISABLED" | "MOCK" | "READY" | "MISCONFIGURED";
  warnings: string[];
}

export function getHermesConfig(): HermesConfig {
  const warnings: string[] = [];

  const enabledRaw = process.env.HERMES_ENABLED?.trim().toLowerCase();
  const enabled = enabledRaw === "true" || enabledRaw === "1";

  const command = process.env.HERMES_COMMAND?.trim() || "hermes";
  const workspaceRoot = process.env.HERMES_WORKSPACE_ROOT?.trim() || "data/hermes-workspaces";
  const timeoutMs = parseInt(process.env.HERMES_TIMEOUT_MS?.trim() || "300000", 10);
  const maxOutputBytes = parseInt(process.env.HERMES_MAX_OUTPUT_BYTES?.trim() || "1048576", 10);
  const mockMode = (process.env.HERMES_MOCK_MODE?.trim().toLowerCase() || "true") === "true";
  const allowedNetwork = (process.env.HERMES_ALLOWED_NETWORK?.trim().toLowerCase()) === "true";

  let allowedTools: string[] = [];
  try {
    const raw = process.env.HERMES_ALLOWED_TOOLS?.trim();
    if (raw) {
      allowedTools = JSON.parse(raw);
      if (!Array.isArray(allowedTools)) allowedTools = [];
    }
  } catch {
    warnings.push("HERMES_ALLOWED_TOOLS is not valid JSON; defaulting to empty");
    allowedTools = [];
  }

  let mode: HermesConfig["mode"] = "READY";
  if (!enabled) {
    mode = "DISABLED";
  } else if (mockMode) {
    mode = "MOCK";
  } else if (!command || command === "hermes") {
    const exists = false;
    if (!exists) {
      warnings.push("Hermes command not found at default location; consider setting HERMES_COMMAND or enabling HERMES_MOCK_MODE");
      mode = "MISCONFIGURED";
    }
  }

  if (!enabled && !mockMode) {
    warnings.push("Hermes is disabled (HERMES_ENABLED is not true)");
  }

  if (!process.env.HERMES_COMMAND?.trim() && enabled && !mockMode) {
    warnings.push("HERMES_COMMAND not set; using default 'hermes'");
  }

  return {
    enabled,
    command,
    workspaceRoot,
    timeoutMs: isNaN(timeoutMs) ? 300000 : timeoutMs,
    maxOutputBytes: isNaN(maxOutputBytes) ? 1048576 : maxOutputBytes,
    mockMode,
    allowedNetwork,
    allowedTools,
    mode,
    warnings,
  };
}

export function validateHermesConfig(): { valid: boolean; errors: string[] } {
  const cfg = getHermesConfig();
  const errors: string[] = [];

  if (!cfg.enabled && !cfg.mockMode) {
    return { valid: true, errors: [] };
  }

  const root = cfg.workspaceRoot;
  if (root.includes("..")) {
    errors.push("Workspace root must not contain '..' path traversal");
  }
  if (root.startsWith("/") && !root.startsWith("/tmp/")) {
    errors.push("Absolute workspace root must be under /tmp/ for safety");
  }

  if (!cfg.mockMode && cfg.timeoutMs < 5000) {
    errors.push("Timeout must be at least 5000ms");
  }

  if (!cfg.mockMode && cfg.maxOutputBytes < 1024) {
    errors.push("maxOutputBytes must be at least 1024");
  }

  return { valid: errors.length === 0, errors };
}

export function getHermesWorkspaceRoot(): string {
  return process.env.HERMES_WORKSPACE_ROOT?.trim() || "data/hermes-workspaces";
}

export function getHermesTimeoutMs(): number {
  const val = parseInt(process.env.HERMES_TIMEOUT_MS?.trim() || "300000", 10);
  return isNaN(val) ? 300000 : val;
}

export function isHermesEnabled(): boolean {
  return getHermesConfig().enabled;
}

export function getSanitizedHermesConfigSummary(): Record<string, unknown> {
  const cfg = getHermesConfig();
  return {
    mode: cfg.mode,
    mockMode: cfg.mockMode,
    workspaceRoot: cfg.workspaceRoot,
    timeoutMs: cfg.timeoutMs,
    maxOutputBytes: cfg.maxOutputBytes,
    allowedNetwork: cfg.allowedNetwork,
    allowedTools: cfg.allowedTools,
    warnings: cfg.warnings,
  };
}
