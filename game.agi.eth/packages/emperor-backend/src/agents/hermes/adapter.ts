// Vendored from clawdtesting/Eth-Agi (apps/eth-console/lib/agents/hermes) — bounded agent runner.
// Same-owner reuse. Sandboxed workspace, secret-stripped env, unsigned/no-broadcast task gates.
import { spawn, ChildProcess } from "child_process";
import path from "path";
import fs from "fs";
import { getHermesConfig, getHermesTimeoutMs } from "./config";
import { sanitizeHermesEnvironment, validateHermesTaskEligibility, assertNoSecretEnvLeak } from "./safety";
import { prepareHermesWorkspace, writeHermesTaskSpec, collectHermesArtifacts, collectHermesLogs, sealHermesWorkspace } from "./workspace";

export interface HermesAdapterInput {
  execution_run_id: string;
  task_node_id?: string;
  objective: string;
  instructions: string;
  required_artifacts: string[];
  risk_level: "low" | "medium" | "high" | "critical";
  metadata?: Record<string, unknown>;
}

export interface HermesAdapterResult {
  ok: boolean;
  status: "COMPLETED" | "FAILED" | "BLOCKED" | "TIMEOUT";
  summary: string;
  workspace_path: string;
  artifacts: { path: string; sha256: string }[];
  logs: { path: string; sha256: string }[];
  error?: string;
  safety_findings: string[];
  result_json?: Record<string, unknown>;
}

export async function invokeHermesCommand(workspacePath: string, input: HermesAdapterInput): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}> {
  const cfg = getHermesConfig();
  const timeoutMs = getHermesTimeoutMs();

  const safeEnv = sanitizeHermesEnvironment();
  const checkedEnv = assertNoSecretEnvLeak(safeEnv);

  const envObj: Record<string, string> = {
    ...checkedEnv,
    HERMES_WORKSPACE: workspacePath,
    HERMES_EXECUTION_RUN_ID: input.execution_run_id,
    HERMES_TASK_OBJECTIVE: input.objective,
    HERMES_WORKSPACE_INPUT: path.join(workspacePath, "input"),
    HERMES_WORKSPACE_OUTPUT: path.join(workspacePath, "output"),
  };

  return new Promise((resolve) => {
    const args = [
      "--workspace", workspacePath,
      "--input", path.join(workspacePath, "input", "task.json"),
      "--output", path.join(workspacePath, "output"),
    ];

    const child: ChildProcess = spawn(cfg.command, args, {
      cwd: workspacePath,
      env: envObj as any,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    if (child.stdout) {
      child.stdout.on("data", (data: Buffer) => { stdout += data.toString(); });
    }
    if (child.stderr) {
      child.stderr.on("data", (data: Buffer) => { stderr += data.toString(); });
    }

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, timeoutMs);

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ exitCode: code ?? -1, stdout, stderr, timedOut });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ exitCode: -1, stdout, stderr: err.message, timedOut: false });
    });
  });
}

export async function runHermesMockTask(input: HermesAdapterInput): Promise<HermesAdapterResult> {
  const workspacePath = prepareHermesWorkspace(input.execution_run_id);

  const specPath = writeHermesTaskSpec(workspacePath, {
    execution_run_id: input.execution_run_id,
    task_node_id: input.task_node_id,
    objective: input.objective,
    instructions: input.instructions,
    required_artifacts: input.required_artifacts,
    risk_level: input.risk_level,
    created_at: new Date().toISOString(),
  });

  const resultPath = path.join(workspacePath, "output", "result.json");
  const mockResult = {
    status: "COMPLETED",
    summary: `Mock Hermes execution for ${input.objective}`,
    completed_at: new Date().toISOString(),
    artifacts_created: input.required_artifacts.map(name => `mock-${name.replace(/\s+/g, "-").toLowerCase()}.txt`),
    logs: ["mock-hermes-run.log"],
    metadata: input.metadata ?? {},
  };
  fs.writeFileSync(resultPath, JSON.stringify(mockResult, null, 2));

  const artifactDir = path.join(workspacePath, "output", "artifacts");
  for (const art of mockResult.artifacts_created) {
    fs.writeFileSync(path.join(artifactDir, art), `Mock artifact for ${input.objective}\nGenerated: ${new Date().toISOString()}\n`);
  }

  const logDir = path.join(workspacePath, "output", "logs");
  fs.writeFileSync(path.join(logDir, "mock-hermes-run.log"), [
    `[${new Date().toISOString()}] Hermes mock run started`,
    `[${new Date().toISOString()}] Execution run: ${input.execution_run_id}`,
    `[${new Date().toISOString()}] Objective: ${input.objective}`,
    `[${new Date().toISOString()}] Risk level: ${input.risk_level}`,
    `[${new Date().toISOString()}] Creating artifacts: ${mockResult.artifacts_created.join(", ")}`,
    `[${new Date().toISOString()}] Hermes mock run completed`,
  ].join("\n"));

  const manifest = sealHermesWorkspace(input.execution_run_id, specPath);

  const artifacts = manifest.artifact_files;
  const logs = manifest.log_files;

  return {
    ok: true,
    status: "COMPLETED",
    summary: `Mock Hermes task completed: ${input.objective}`,
    workspace_path: workspacePath,
    artifacts,
    logs,
    safety_findings: ["Mock mode: no actual Hermes binary invoked"],
    result_json: mockResult,
  };
}

export async function runHermesTask(input: HermesAdapterInput): Promise<HermesAdapterResult> {
  const eligibility = validateHermesTaskEligibility({
    objective: input.objective,
    instructions: input.instructions,
    risk_level: input.risk_level,
    hasOperatorApproval: input.metadata?.operator_approval === true,
  });

  if (!eligibility.eligible) {
    return {
      ok: false,
      status: "BLOCKED",
      summary: `Task blocked by safety gates: ${eligibility.blockingReasons.join("; ")}`,
      workspace_path: "",
      artifacts: [],
      logs: [],
      safety_findings: eligibility.blockingReasons,
    };
  }

  const workspacePath = prepareHermesWorkspace(input.execution_run_id);

  const specPath = writeHermesTaskSpec(workspacePath, {
    execution_run_id: input.execution_run_id,
    task_node_id: input.task_node_id,
    objective: input.objective,
    instructions: input.instructions,
    required_artifacts: input.required_artifacts,
    risk_level: input.risk_level,
    created_at: new Date().toISOString(),
  });

  const result = await invokeHermesCommand(workspacePath, input);

  if (result.timedOut) {
    return {
      ok: false,
      status: "TIMEOUT",
      summary: `Hermes task timed out after ${getHermesTimeoutMs()}ms`,
      workspace_path: workspacePath,
      artifacts: [],
      logs: [],
      error: `Process timed out after ${getHermesTimeoutMs()}ms`,
      safety_findings: [],
    };
  }

  const resultJsonPath = path.join(workspacePath, "output", "result.json");
  let resultJson: Record<string, unknown> | undefined;
  if (fs.existsSync(resultJsonPath)) {
    try {
      resultJson = JSON.parse(fs.readFileSync(resultJsonPath, "utf-8"));
    } catch { /* ignore */ }
  }

  const manifest = sealHermesWorkspace(input.execution_run_id, specPath);

  const artifacts = manifest.artifact_files;
  const logs = manifest.log_files;

  if (result.exitCode !== 0) {
    return {
      ok: false,
      status: "FAILED",
      summary: `Hermes command exited with code ${result.exitCode}`,
      workspace_path: workspacePath,
      artifacts,
      logs,
      error: result.stderr || `Exit code: ${result.exitCode}`,
      safety_findings: [],
      result_json: resultJson,
    };
  }

  return {
    ok: true,
    status: "COMPLETED",
    summary: `Hermes task completed successfully: ${input.objective}`,
    workspace_path: workspacePath,
    artifacts,
    logs,
    safety_findings: [],
    result_json: resultJson,
  };
}

export async function parseHermesResult(input: HermesAdapterResult): Promise<HermesAdapterResult> {
  return input;
}
