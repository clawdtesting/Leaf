// Bridge between the Emperor mission pipeline and the vendored Hermes runner.
// Turns a capability action into a bounded Hermes task, runs it (mock or real
// per config), and maps the produced, SHA-256-hashed artifact manifest into the
// mission's evidence — so evidence becomes real files, not fabricated strings.

import type { ActionDef } from '../../capabilities';
import type { EvidenceItem, Intent } from '../../emperor';
import { getHermesConfig } from './config';
import { runHermesMockTask, runHermesTask, type HermesAdapterInput, type HermesAdapterResult } from './adapter';

export interface HermesExecOutput {
  ok: boolean;
  status: HermesAdapterResult['status'];
  result: any;
  evidence: EvidenceItem[];
  cost: { unit: string; amount: number };
}

/** Is Hermes execution turned on? (HERMES_ENABLED=true). */
export function hermesEnabled(): boolean {
  return getHermesConfig().enabled;
}

/** Map an artifact file path back to one of the action's required evidence types. */
function inferEvidenceType(artifactPath: string, requiredEvidence: string[]): string {
  const lower = artifactPath.toLowerCase();
  for (const t of requiredEvidence) {
    if (lower.includes(t.toLowerCase().replace(/\s+/g, '-')) || lower.includes(t.toLowerCase())) return t;
  }
  return 'artifact';
}

export async function runViaHermes(missionId: string, def: ActionDef, intent: Intent): Promise<HermesExecOutput> {
  const cfg = getHermesConfig();
  const input: HermesAdapterInput = {
    execution_run_id: missionId,
    objective: `${def.capability}: ${intent.target || def.building}`,
    instructions: intent.details || def.description,
    required_artifacts: def.requiredEvidence,
    risk_level: 'low',
  };

  const res = cfg.mockMode ? await runHermesMockTask(input) : await runHermesTask(input);

  // Real, hashed artifacts become evidence items (typed back to required kinds).
  const evidence: EvidenceItem[] = res.artifacts.map(a => ({
    type: inferEvidenceType(a.path, def.requiredEvidence),
    ref: a.path,
    summary: `artifact sha256:${a.sha256.slice(0, 16)}…`,
  }));
  for (const l of res.logs) {
    evidence.push({ type: 'log', ref: l.path, summary: `log sha256:${l.sha256.slice(0, 16)}…` });
  }

  const result = {
    message: res.summary,
    summary: res.summary,
    data: res.artifacts.map(a => a.path),
    hermes: {
      mode: cfg.mode,
      status: res.status,
      workspace_path: res.workspace_path,
      artifacts: res.artifacts,
      logs: res.logs,
      safety_findings: res.safety_findings,
      result_json: res.result_json,
    },
  };

  return { ok: res.ok, status: res.status, result, evidence, cost: { unit: 'USDC', amount: 0 } };
}
