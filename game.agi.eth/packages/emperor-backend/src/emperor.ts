// The Emperor operator: the privileged layer between game intents and the
// Montréal.AI subsystems. It validates an intent against the capability
// registry (policy boundary), decides a route, then runs a staged mission that
// produces action-specific results, carries evidence, and is independently
// validated before acceptance.
//
// Execution here is SIMULATED but "real-shaped": each stage and the evidence
// model match the proof-carrying-mission design in docs/GAME_AGI_CONCEPT.md,
// so a real GoalOS / AGIJobManager / agent executor can be dropped into
// `runExecutor` without changing the lifecycle or API.

import fs from 'fs';
import path from 'path';
import { ActionDef, getAction } from './capabilities';
import { sha256Json, validateEvidenceDocket, type EvidenceDocket } from './evidence';
import { readNextJobId } from './protocol/read';
import { publishAndVerify, type PublishResult } from './ipfs/pin';
import { hermesEnabled, runViaHermes } from './agents/hermes/executor';
import { getHermesConfig, getHermesWorkspaceRoot } from './agents/hermes/config';
import { MissionPersistence } from './persistence';

// Max bytes of a single artifact to embed inline in the IPFS bundle.
const MAX_EMBED_BYTES = 64 * 1024;

/**
 * Read the mission's produced artifact files from the local Hermes workspace so
 * their CONTENT can be embedded in the IPFS bundle. This is the only place the
 * server touches those files — after publishing, every output is viewable from
 * IPFS by CID, with nothing read from any local workspace.
 */
export function collectArtifactContents(
  mission: MissionRecord,
): Array<{ path: string; content?: string; note?: string; size?: number }> {
  const out: Array<{ path: string; content?: string; note?: string; size?: number }> = [];
  const base = path.resolve(getHermesWorkspaceRoot(), mission.id);
  for (const ev of mission.evidence) {
    const ref = ev.ref;
    if (!ref || !ref.startsWith('output/')) continue;
    const full = path.resolve(base, ref);
    if (full !== base && !full.startsWith(base + path.sep)) continue; // confinement
    try {
      const st = fs.statSync(full);
      if (!st.isFile()) continue;
      if (st.size > MAX_EMBED_BYTES) {
        out.push({ path: ref, note: 'omitted: exceeds embed size limit', size: st.size });
      } else {
        out.push({ path: ref, content: fs.readFileSync(full, 'utf-8') });
      }
    } catch {
      /* file missing / unreadable — skip */
    }
  }
  return out;
}

export interface EvidenceItem {
  type: string;
  ref?: string;
  summary: string;
}

export type MissionStatus =
  | 'accepted'
  | 'planning'
  | 'executing'
  | 'validating'
  | 'completed'
  | 'failed';

export interface Intent {
  action: string;
  target: string;
  details: string;
}

export interface MissionRecord {
  id: string;
  intent: Intent;
  userId?: string; // wallet address or identity
  capability: string;
  building: string;
  route: ActionDef['route'];
  budgetClass: string;
  status: MissionStatus;
  plan: string[];
  evidence: EvidenceItem[];
  validation?: { verdict: 'PASS' | 'FAIL'; validator: string; notes: string };
  result?: any;
  cost?: { unit: string; amount: number };
  /** Proof record built at acceptance (Eth-Agi EvidenceDocket shape). */
  docket?: EvidenceDocket;
  log: { t: number; stage: string; note: string }[];
  createdAt: number;
  updatedAt: number;
}

const missions = new MissionPersistence();
let counter = 1;

export function getMission(id: string): MissionRecord | undefined {
  return missions.getMission(id);
}

/** All missions, newest first (for the in-game Quest Record / Evidence Vault). */
export function listMissions(): MissionRecord[] {
  return missions.getAll().sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Real IPFS publication: pin the evidence bundle to IPFS (Pinata) and verify it
 * by fetching it back and matching hashes. On success, records the CID and the
 * fetchback proof on the docket so an unsigned completion tx can be built. Needs
 * PINATA_JWT; returns a structured result (never throws).
 */
export async function publishDocketToIpfs(mission: MissionRecord): Promise<PublishResult> {
  const d = mission.docket;
  if (!d) return { ok: false, mode: 'ERROR', error: 'Mission has no sealed evidence docket' };

  const bundle: Record<string, unknown> = {
    docket_id: d.id,
    execution_run_id: d.execution_run_id,
    title: d.title,
    summary: d.summary,
    content_hash: d.content_hash,
    intent: mission.intent,
    result: mission.result,
    // Embed the actual produced files so outputs are viewable straight from IPFS.
    artifacts: collectArtifactContents(mission),
    evidence: mission.evidence,
    validation: mission.validation,
  };
  const result = await publishAndVerify(bundle, `game-agi-evidence-${d.id}`);

  if (result.ok && result.cid) {
    let report: Record<string, unknown> = {};
    try {
      report = JSON.parse(d.validation_report);
    } catch {
      report = { raw: d.validation_report };
    }
    report.ipfs_publication = {
      local_sha256: result.local_sha256,
      fetched_sha256: result.fetched_sha256,
      matched: result.matched === true,
      mock: false,
    };
    d.ipfs_cid = result.cid;
    d.publication_status = 'PUBLISHED_IPFS';
    d.validation_report = JSON.stringify(report);
    d.updated_at = new Date();
    touch(mission, 'completed', `Docket published to IPFS (${result.cid.slice(0, 16)}…), fetchback verified.`);
    missions.updateMission(mission);
  } else {
    touch(mission, 'completed', `IPFS publish did not complete: ${result.error ?? result.mode}`);
    missions.updateMission(mission);
  }
  return result;
}

/**
 * DEV-ONLY mock IPFS publication. Real settlement requires the evidence docket
 * to be published to IPFS and fetched back with a matching hash before an
 * unsigned completion tx can be built. Until a real pinning service is wired,
 * this marks the docket PUBLISHED_IPFS with a mock CID and matching fetchback
 * hashes so the unsigned-tx path can be exercised end to end. It is explicitly
 * flagged (`mock: true`) and must only be triggered by an explicit request.
 */
export function mockPublishDocketToIpfs(mission: MissionRecord): boolean {
  const d = mission.docket;
  if (!d) return false;
  let report: Record<string, unknown> = {};
  try {
    report = JSON.parse(d.validation_report);
  } catch {
    report = { raw: d.validation_report };
  }
  d.ipfs_cid = `bafkreimock${d.content_hash.slice(0, 46)}`;
  d.publication_status = 'PUBLISHED_IPFS';
  report.ipfs_publication = {
    local_sha256: d.content_hash,
    fetched_sha256: d.content_hash,
    matched: true,
    mock: true,
  };
  d.validation_report = JSON.stringify(report);
  d.updated_at = new Date();
  touch(mission, 'completed', `Docket mock-published to IPFS (${d.ipfs_cid.slice(0, 16)}…) [DEV MOCK].`);
  missions.updateMission(mission);
  return true;
}

function touch(m: MissionRecord, stage: string, note: string) {
  m.updatedAt = Date.now();
  m.log.push({ t: m.updatedAt, stage, note });
}

/**
 * Accept a validated intent, create a mission record, and kick off the staged
 * pipeline. Returns the record immediately (status 'accepted').
 */
export function createMission(intent: Intent, userId?: string): MissionRecord {
  const def = getAction(intent.action);
  if (!def) throw new Error(`Unknown action: ${intent.action}`);

  const id = String(counter++);
  const now = Date.now();
  const m: MissionRecord = {
    id,
    intent,
    userId,
    capability: def.capability,
    building: def.building,
    route: def.route,
    budgetClass: def.budgetClass,
    status: 'accepted',
    plan: [],
    evidence: [],
    log: [],
    createdAt: now,
    updatedAt: now,
  };
  missions.addMission(m);
  touch(m, 'accepted', `Emperor accepted intent for ${def.capability} (${def.route})`);
  runPipeline(m, def);
  return m;
}

/* ------------------------------------------------------------------ */
/* Staged pipeline: plan -> execute -> validate -> complete            */
/* ------------------------------------------------------------------ */
function runPipeline(m: MissionRecord, def: ActionDef) {
  // 1) Planning (GoalOS-style decomposition; skipped detail for LOCAL routes)
  setTimeout(() => {
    m.status = 'planning';
    m.plan = buildPlan(def, m.intent);
    touch(m, 'planning', `Decomposed objective into ${m.plan.length} steps via ${def.route}`);

    // 2) Execution (produces action-specific result + evidence)
    setTimeout(async () => {
      m.status = 'executing';
      if (hermesEnabled()) {
        touch(m, 'executing', `Executing ${def.capability} via Hermes (${getHermesConfig().mode})`);
        try {
          const h = await runViaHermes(m.id, def, m.intent);
          m.result = h.result;
          m.evidence = h.evidence;
          m.cost = h.cost;
          touch(m, 'executing', `Hermes ${h.status}: ${h.evidence.length} evidence item(s) produced.`);
        } catch (e) {
          touch(m, 'executing', `Hermes error: ${(e as Error).message}`);
          m.result = { message: 'Hermes execution error', error: (e as Error).message };
          m.evidence = [];
        }
      } else {
        touch(m, 'executing', `Executing ${def.capability} work (simulated)`);
        const { result, evidence, cost } = runExecutor(def, m.intent);
        m.result = result;
        m.evidence = evidence;
        m.cost = cost;
      }

      // AGIJobManager-routed work touches the real protocol read path
      // (defensive: no-op when ETH_RPC_URL is unset / unreachable).
      if (def.route === 'AGIJOBMANAGER') {
        try {
          const probe = await readNextJobId();
          if (probe.available) {
            m.evidence.push({ type: 'onchain-read', ref: `nextJobId=${probe.nextJobId}`, summary: 'Live AGIJobManager read succeeded' });
            touch(m, 'executing', `On-chain read: nextJobId=${probe.nextJobId}`);
          } else {
            touch(m, 'executing', `On-chain read unavailable: ${probe.reason}; continuing with simulation`);
          }
        } catch {
          /* ignore — reads are best-effort */
        }
      }

      // 3) Validation (independent check against required evidence)
      setTimeout(() => {
        m.status = 'validating';
        m.validation = validate(def, m.evidence);
        touch(m, 'validating', `Independent validation: ${m.validation.verdict}`);

        // 4) Acceptance / completion
        setTimeout(async () => {
          if (m.validation && m.validation.verdict === 'PASS') {
            m.docket = buildDocket(m);
            // Publish to IPFS
            const publishResult = await publishDocketToIpfs(m);
            if (publishResult.ok && publishResult.cid) {
              // docket already updated inside publishDocketToIpfs
              touch(m, 'completed', `Evidence accepted; docket published to IPFS ${publishResult.cid.slice(0,12)}…`);
              missions.updateMission(m);
            } else {
              // Publish failed; we still mark completed but with FAILED status?
              m.docket.publication_status = 'FAILED';
              touch(m, 'completed', `Evidence accepted; IPFS publish failed: ${publishResult.error ?? publishResult.mode}`);
              missions.updateMission(m);
            }
            m.status = 'completed';
            missions.updateMission(m);
          } else {
            m.status = 'failed';
            touch(m, 'failed', 'Validation failed; result not accepted.');
            missions.updateMission(m);
          }
        }, 1200);
      }, 1800);
    }, 2200);
  }, 1200);
}

function buildPlan(def: ActionDef, intent: Intent): string[] {
  switch (def.action) {
    case 'ECOSYSTEM_RESEARCH':
      return [
        'Discover candidate universe',
        'Verify project existence',
        'Inspect documentation, contracts and repositories',
        'Assess product utility and risk',
        'Collect evidence and score candidates',
        'Produce ranked conclusion',
      ];
    case 'SMART_CONTRACT_DEVELOPMENT':
      return ['Capture requirements', 'Threat model', 'Implement Solidity', 'Write Foundry tests', 'Static analysis', 'Package deliverable'];
    case 'SMART_CONTRACT_AUDIT':
      return ['Retrieve source', 'Architecture analysis', 'Static + manual review', 'Attack hypotheses', 'Reproduce findings', 'Severity + report'];
    case 'UI_APPLICATION_BUILD':
      return ['Inspect repository', 'Analyze UX', 'Propose design', 'Implement', 'Build + visual check', 'Tests + deliverable'];
    case 'FRONTIER_MONITOR':
      return ['Gather sources', 'Filter signal', 'Summarize trends and threats'];
    case 'CAPABILITY_DISCOVERY':
      return ['Detect capability gap', 'Generate candidate approaches', 'Evaluate candidates', 'Fresh-work test', 'Promote or reject'];
    case 'VALIDATION':
      return ['Load artifact', 'Check against acceptance criteria', 'Issue verdict'];
    default:
      return ['Plan', 'Execute', 'Validate'];
  }
}

/**
 * SIMULATED executor. Swap this for real GoalOS/AGIJobManager/agent calls.
 * Returns an action-specific result plus the evidence it carries. The result
 * always includes `message` and a `data: string[]` summary so simple clients
 * can render it, alongside richer structured fields.
 */
function runExecutor(def: ActionDef, intent: Intent): {
  result: any;
  evidence: EvidenceItem[];
  cost: { unit: string; amount: number };
} {
  const target = intent.target || 'the target';
  switch (def.action) {
    case 'ECOSYSTEM_RESEARCH': {
      const projects = Array.from({ length: 10 }, (_, i) => ({
        rank: i + 1,
        name: `${target} Project ${i + 1}`,
        utility: ['DeFi', 'Infra', 'Tooling', 'Gaming', 'RWA'][i % 5],
        repo: `https://example.org/${target.toLowerCase().replace(/\s+/g, '-')}/p${i + 1}`,
      }));
      return {
        result: {
          message: `Survey of ${target} complete — 10 qualifying projects.`,
          summary: `Ranked 10 projects on ${target} by demonstrated utility.`,
          data: projects.map(p => `#${p.rank} ${p.name} (${p.utility})`),
          projects,
        },
        evidence: [
          { type: 'repository', ref: 'bundle://repos', summary: '10 repositories inspected' },
          { type: 'contracts', ref: 'bundle://contracts', summary: 'Deployed contracts verified' },
          { type: 'documentation', summary: 'Official docs reviewed for each candidate' },
          { type: 'product', summary: 'Product utility assessed' },
        ],
        cost: { unit: 'USDC', amount: 0 },
      };
    }
    case 'SMART_CONTRACT_DEVELOPMENT': {
      return {
        result: {
          message: `Contract for "${target}" built and tested.`,
          summary: `Delivered Solidity implementation with passing tests for ${target}.`,
          data: ['Settlement.sol', '12/12 Foundry tests passing', 'Slither: 0 high findings'],
          deliverable: { contract: 'Settlement.sol', tests: 12, passing: 12 },
        },
        evidence: [
          { type: 'source', ref: 'artifact://Settlement.sol', summary: 'Solidity source' },
          { type: 'tests', ref: 'artifact://foundry', summary: '12/12 tests passing' },
          { type: 'static-analysis', summary: 'Slither clean (no high/critical)' },
          { type: 'documentation', summary: 'NatSpec + README' },
        ],
        cost: { unit: 'USDC', amount: 0 },
      };
    }
    case 'SMART_CONTRACT_AUDIT': {
      const findings = [
        { id: 'H-1', severity: 'High', title: 'Reentrancy in withdraw()' },
        { id: 'M-1', severity: 'Medium', title: 'Missing zero-address check' },
        { id: 'L-1', severity: 'Low', title: 'Unbounded loop in settle()' },
      ];
      return {
        result: {
          message: `Audit of "${target}" complete — ${findings.length} findings.`,
          summary: `Security review of ${target}: 1 High, 1 Medium, 1 Low.`,
          data: findings.map(f => `[${f.severity}] ${f.id} ${f.title}`),
          findings,
        },
        evidence: [
          { type: 'findings', summary: '3 findings identified' },
          { type: 'severity', summary: 'Findings classified: 1 High, 1 Medium, 1 Low' },
          { type: 'reproduction', ref: 'artifact://poc', summary: 'Foundry PoC for H-1' },
          { type: 'tests', summary: 'Regression tests for each finding' },
        ],
        cost: { unit: 'USDC', amount: 0 },
      };
    }
    case 'CAPABILITY_DISCOVERY': {
      return {
        result: {
          message: `NovaSeed evaluated a candidate capability for "${target}".`,
          summary: `Candidate grown and tested on fresh work; awaiting promotion review.`,
          data: ['Candidate: cross-domain-research-v2', 'Fresh-work eval: +8% vs current', 'Status: under successor test'],
          candidate: { name: 'cross-domain-research-v2', freshEvalDelta: '+8%' },
        },
        evidence: [
          { type: 'candidate', summary: 'Candidate capability specification' },
          { type: 'fresh-evaluation', ref: 'eval://fresh-mission', summary: 'Evaluated on unseen task' },
        ],
        cost: { unit: '$GAME', amount: 0 },
      };
    }
    case 'FRONTIER_MONITOR': {
      return {
        result: {
          message: `Frontier scan for "${target}" complete.`,
          summary: 'Notable trends and threats summarized.',
          data: ['3 emerging trends', '1 potential threat flagged'],
        },
        evidence: [
          { type: 'sources', summary: 'Source set gathered' },
          { type: 'summary', summary: 'Signal-filtered brief' },
        ],
        cost: { unit: 'USDC', amount: 0 },
      };
    }
    default: {
      return {
        result: { message: `${def.capability} completed for "${target}".`, data: ['done'] },
        evidence: def.requiredEvidence.map(e => ({ type: e, summary: `${e} produced` })),
        cost: { unit: 'USDC', amount: 0 },
      };
    }
  }
}

/** Independent validation: every required evidence type must be present. */
function validate(def: ActionDef, evidence: EvidenceItem[]): {
  verdict: 'PASS' | 'FAIL';
  validator: string;
  notes: string;
} {
  const present = new Set(evidence.map(e => e.type));
  const missing = def.requiredEvidence.filter(r => !present.has(r));
  if (missing.length === 0) {
    return { verdict: 'PASS', validator: 'hall-of-judgment', notes: 'All required evidence present.' };
  }
  return { verdict: 'FAIL', validator: 'hall-of-judgment', notes: `Missing evidence: ${missing.join(', ')}` };
}

/**
 * Seal the accepted mission into an EvidenceDocket (Eth-Agi model). The content
 * hash is taken over the result JSON; artifacts are file-oriented and empty for
 * simulated runs (no fake hashes), so the docket is honest and schema-valid.
 */
function buildDocket(m: MissionRecord): EvidenceDocket {
  const now = new Date();
  const docket: EvidenceDocket = {
    id: `docket-${m.id}`,
    execution_run_id: m.id,
    title: `${m.capability} — ${m.intent.target || 'mission'} #${m.id}`,
    summary: m.result?.summary || m.result?.message || `${m.capability} completed.`,
    artifact_manifest: [],
    validation_report: JSON.stringify(m.validation ?? { verdict: 'PASS' }),
    content_hash: sha256Json({ intent: m.intent, result: m.result, evidence: m.evidence }),
    publication_status: 'LOCAL',
    created_at: now,
    updated_at: now,
  };
  // Defensive: never seal a malformed docket.
  if (!validateEvidenceDocket(docket)) {
    touch(m, 'completed', 'Warning: docket failed self-validation.');
  }
  return docket;
}
