// Vendored from clawdtesting/Eth-Agi (apps/eth-console/lib/agents/hermes) — bounded agent runner.
// Same-owner reuse. Sandboxed workspace, secret-stripped env, unsigned/no-broadcast task gates.
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { getHermesWorkspaceRoot } from "./config";
import { validateHermesWorkspacePath } from "./safety";

export interface HermesTaskSpec {
  execution_run_id: string;
  task_node_id?: string;
  objective: string;
  instructions: string;
  required_artifacts: string[];
  risk_level: string;
  created_at: string;
}

export interface HermesWorkspaceManifest {
  execution_run_id: string;
  created_at: string;
  input_files: { path: string; sha256: string }[];
  output_files: { path: string; sha256: string }[];
  artifact_files: { path: string; sha256: string }[];
  log_files: { path: string; sha256: string }[];
}

function computeSha256(filePath: string): string {
  try {
    const content = fs.readFileSync(filePath);
    return crypto.createHash("sha256").update(content).digest("hex");
  } catch {
    return "ERROR_READING_FILE";
  }
}

export function prepareHermesWorkspace(executionRunId: string): string {
  const root = getHermesWorkspaceRoot();
  const wsPath = path.join(root, executionRunId);

  const validation = validateHermesWorkspacePath(wsPath);
  if (!validation.valid) {
    throw new Error(`Workspace path validation failed: ${validation.error}`);
  }

  const resolvedRoot = path.resolve(root);
  const resolvedWs = path.resolve(wsPath);

  if (!resolvedWs.startsWith(resolvedRoot)) {
    throw new Error(`Workspace path traversal blocked: ${wsPath}`);
  }

  const dirs = [
    path.join(wsPath, "input"),
    path.join(wsPath, "output", "artifacts"),
    path.join(wsPath, "output", "logs"),
    path.join(wsPath, "audit"),
  ];

  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return wsPath;
}

export function writeHermesTaskSpec(workspacePath: string, spec: HermesTaskSpec): string {
  const specPath = path.join(workspacePath, "input", "task.json");
  fs.writeFileSync(specPath, JSON.stringify(spec, null, 2));

  const instructionsPath = path.join(workspacePath, "input", "instructions.md");
  const instructions = [
    `# Hermes Task: ${spec.objective}`,
    "",
    `Execution Run: ${spec.execution_run_id}`,
    spec.task_node_id ? `Task Node: ${spec.task_node_id}` : "",
    "",
    "## Instructions",
    "",
    spec.instructions,
    "",
    "## Required Artifacts",
    "",
    ...spec.required_artifacts.map(a => `- ${a}`),
    "",
    "## Risk Level",
    "",
    spec.risk_level,
    "",
    "## Output",
    "",
    "Write outputs to: output/",
    "Write artifacts to: output/artifacts/",
    "Write logs to: output/logs/",
    "Write result to: output/result.json",
  ].filter(Boolean).join("\n");

  fs.writeFileSync(instructionsPath, instructions);
  return specPath;
}

export function collectHermesArtifacts(executionRunId: string): { artifacts: { path: string; sha256: string }[]; artifactsPath: string } {
  const root = getHermesWorkspaceRoot();
  const artifactsDir = path.join(root, executionRunId, "output", "artifacts");

  if (!fs.existsSync(artifactsDir)) {
    return { artifacts: [], artifactsPath: artifactsDir };
  }

  const files = fs.readdirSync(artifactsDir).filter(f => fs.statSync(path.join(artifactsDir, f)).isFile());
  const artifacts = files.map(f => ({
    path: path.join("output", "artifacts", f),
    sha256: computeSha256(path.join(artifactsDir, f)),
  }));

  return { artifacts, artifactsPath: artifactsDir };
}

export function collectHermesLogs(executionRunId: string): { logs: { path: string; sha256: string }[]; logsPath: string } {
  const root = getHermesWorkspaceRoot();
  const logsDir = path.join(root, executionRunId, "output", "logs");

  if (!fs.existsSync(logsDir)) {
    return { logs: [], logsPath: logsDir };
  }

  const files = fs.readdirSync(logsDir).filter(f => fs.statSync(path.join(logsDir, f)).isFile());
  const logs = files.map(f => ({
    path: path.join("output", "logs", f),
    sha256: computeSha256(path.join(logsDir, f)),
  }));

  return { logs, logsPath: logsDir };
}

export function sealHermesWorkspace(executionRunId: string, inputSpecPath: string): HermesWorkspaceManifest {
  const root = getHermesWorkspaceRoot();
  const wsPath = path.join(root, executionRunId);

  const { artifacts } = collectHermesArtifacts(executionRunId);
  const { logs } = collectHermesLogs(executionRunId);

  const inputFiles: { path: string; sha256: string }[] = [];
  const inputDir = path.join(wsPath, "input");
  if (fs.existsSync(inputDir)) {
    const inputEntries = fs.readdirSync(inputDir).filter(f => fs.statSync(path.join(inputDir, f)).isFile());
    for (const f of inputEntries) {
      inputFiles.push({ path: path.join("input", f), sha256: computeSha256(path.join(inputDir, f)) });
    }
  }

  const outputFiles: { path: string; sha256: string }[] = [];
  const outputDir = path.join(wsPath, "output");
  if (fs.existsSync(outputDir)) {
    const outputEntries = fs.readdirSync(outputDir).filter(f => {
      const fullPath = path.join(outputDir, f);
      return fs.statSync(fullPath).isFile() && f !== "artifacts" && f !== "logs";
    });
    for (const f of outputEntries) {
      outputFiles.push({ path: path.join("output", f), sha256: computeSha256(path.join(outputDir, f)) });
    }
  }

  const manifest: HermesWorkspaceManifest = {
    execution_run_id: executionRunId,
    created_at: new Date().toISOString(),
    input_files: inputFiles,
    output_files: outputFiles,
    artifact_files: artifacts,
    log_files: logs,
  };

  const manifestPath = path.join(wsPath, "audit", "workspace-manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  return manifest;
}
