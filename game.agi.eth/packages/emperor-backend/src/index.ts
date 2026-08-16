import express from 'express';
import * as dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';
import { ACTIONS, getAction, listActions } from './capabilities';
import { createMission, getMission, mockPublishDocketToIpfs, publishDocketToIpfs } from './emperor';
import { protocolStatus, readNextJobId, readJobSnapshot } from './protocol/read';
import { getIpfsConfig } from './ipfs/config';
import { getSanitizedHermesConfigSummary } from './agents/hermes/config';
import { buildCompletionUnsignedTx, getUnsignedTx } from './tx/build';
import { verifyCompletionOutcome } from './tx/outcome/verify';
import type { ContractId } from './tx/types';
import crypto from 'crypto';
import { ethers } from 'ethers';

// Load environment variables from .env file (game.agi.eth/.env)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
app.use(express.json());
// Nonce storage for auth challenge
const nonces = new Map(); // key: ip, value: { nonce: string, expiry: number }
const NONCE_EXPIRY_MS = 2 * 60 * 1000; // 2 minutes


// Permissive CORS for the local game client (dev)
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, x-wallet-address');
  res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (_req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Intent schema (structured intent from the game intent layer)
const IntentSchema = z.object({
  action: z.string(),
  target: z.string(),
  details: z.string(),
});

// SAFETY MODEL: this backend never holds a signing key and never broadcasts
// transactions. AGIJobManager work is read-only here; settlement will go
// through separately-produced, safety-gated UNSIGNED tx packages (next slice),
// verified read-only after an external signer submits. See Eth-Agi reuse brief §6.

/* ------------------------------------------------------------------ */
/* Routes                                                              */
/* ------------------------------------------------------------------ */

// Capability discovery — what each building can do.
app.get('/capabilities', (_req, res) => {
  res.json({ capabilities: listActions() });
});

// Protocol read status (is the on-chain read path available?).
app.get('/protocol/status', (_req, res) => {
  res.json(protocolStatus());
});

// Cheap read liveness probe against AGIJobManager.
app.get('/protocol/next-job-id', async (_req, res) => {
  res.json(await readNextJobId());
});

// Read a single upstream job snapshot from AGIJobManager.
app.get('/protocol/job/:id', async (req, res) => {
  let jobId: bigint;
  try {
    jobId = BigInt(req.params.id);
  } catch {
    return res.status(400).json({ error: 'Invalid job id' });
  }
  res.json(await readJobSnapshot(jobId));
});

// Structured intent intake (the policy boundary).
app.post('/intent', async (req, res) => {
  try {
    const intent = IntentSchema.parse(req.body);

    // Policy: the action must be a known capability. Arbitrary player text
    // never reaches privileged execution.
    const def = getAction(intent.action);
    if (!def) {
      return res.status(400).json({
        error: 'Unknown action',
        action: intent.action,
        allowed: Object.keys(ACTIONS),
      });
    }

    // Emperor accepts the intent and runs the staged mission.
    const userId = req.headers['x-wallet-address'] || req.headers['wallet-address'] || undefined;
    const mission = createMission(intent, userId);
    console.log(`Intent accepted: ${def.action} -> ${def.capability} (${def.route}) as job ${mission.id}`);

    res.status(202).json({
      jobId: mission.id,
      status: mission.status,
      capability: mission.capability,
      building: mission.building,
      route: mission.route,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid intent', details: error.issues });
    }
    console.error('Error processing intent:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mission status + proof record (evidence, validation, docket, plan, log).
app.get('/job/:id/status', (req, res) => {
  const mission = getMission(req.params.id);
  if (!mission) return res.status(404).json({ error: 'Job not found' });
  const requesterUserId = req.headers['x-wallet-address'] || req.headers['wallet-address'] || undefined;
  if (mission.userId !== undefined && mission.userId !== requesterUserId) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json({
    jobId: mission.id,
    status: mission.status,
    capability: mission.capability,
    building: mission.building,
    route: mission.route,
    plan: mission.plan,
    evidence: mission.evidence,
    validation: mission.validation,
    docket: mission.docket,
    result: mission.result,
    cost: mission.cost,
    log: mission.log,
  });
});

// IPFS configuration status (is real publishing available?).
app.get('/ipfs/status', (_req, res) => {
  res.json(getIpfsConfig());
});

// Hermes executor status (is real/mock agent execution active?).
app.get('/hermes/status', (_req, res) => {
  res.json(getSanitizedHermesConfigSummary());
});

// Build an UNSIGNED completion transaction for a settled mission. Never signs
// or broadcasts — returns a safety-gated DRAFT (with an operator wallet-export
// package) or BLOCKED with reasons.
//   { publish: true }     -> real IPFS publish + fetchback (needs PINATA_JWT)
//   { publishMock: true } -> dev-only mock publish (offline)
app.post('/job/:id/completion-tx', async (req, res) => {
  const mission = getMission(req.params.id);
  if (!mission) return res.status(404).json({ error: 'Job not found' });
  if (mission.route !== 'AGIJOBMANAGER') {
    return res.status(400).json({ error: 'Mission is not settled on-chain', route: mission.route });
  }

  const body = (req.body ?? {}) as {
    contractId?: ContractId;
    upstreamJobId?: string | number;
    operatorAddress?: string;
    completionNote?: string;
    publish?: boolean;
    publishMock?: boolean;
  };

  if (body.publish === true || req.query.publish === '1') {
    const pub = await publishDocketToIpfs(mission);
    if (!pub.ok) {
      return res.status(409).json({ ok: false, status: 'BLOCKED', stage: 'ipfs_publish', publish: pub, blocking_reasons: [pub.error ?? pub.mode] });
    }
  } else if (body.publishMock === true || req.query.mock === '1') {
    mockPublishDocketToIpfs(mission);
  }

  const result = buildCompletionUnsignedTx(mission, {
    contractId: body.contractId ?? 'AGI_JOB_MANAGER',
    upstreamJobId: String(body.upstreamJobId ?? mission.id),
    operatorAddress: body.operatorAddress || process.env.OPERATOR_ADDRESS || '0x0000000000000000000000000000000000000000',
    completionNote: body.completionNote,
  });

  res.status(result.ok ? 200 : 409).json(result);
});

// Verify a submitted transaction READ-ONLY against a DRAFT unsigned request.
// Confirms an external signer actually broadcast the intended tx and it
// succeeded — target, value, calldata, function, and receipt all checked.
app.post('/completion-tx/:id/verify', async (req, res) => {
  const tx = getUnsignedTx(req.params.id);
  const body = (req.body ?? {}) as { tx_hash?: string; operator_note?: string; manual_override?: boolean };
  if (!body.tx_hash) return res.status(400).json({ error: 'tx_hash is required' });

  const result = await verifyCompletionOutcome(tx, {
    unsigned_tx_request_id: req.params.id,
    tx_hash: body.tx_hash,
    operator_note: body.operator_note,
    manual_override: body.manual_override,
  });
  res.status(result.ok ? 200 : 409).json(result);
});


// Auth nonce endpoint
app.get('/auth/nonce', (_req, res) => {
  const ip = _req.ip || _req.connection.remoteAddress;
  const nonceBytes = crypto.randomBytes(32);
  const nonce = `0x${nonceBytes.toString('hex')}`;
  nonces.set(ip, { nonce, expiry: Date.now() + NONCE_EXPIRY_MS });
  res.json({ nonce });
});

app.post('/auth/verify', async (req, res) => {
  const { address, signature } = req.body as { address: string; signature: string };
  if (!address || !signature) {
    return res.status(400).json({ error: 'Missing address or signature' });
  }
  const ip = req.ip || req.connection.remoteAddress;
  const stored = nonces.get(ip);
  if (!stored) {
    return res.status(400).json({ error: 'No nonce found for this IP (may have expired)' });
  }
  if (Date.now() > stored.expiry) {
    nonces.delete(ip);
    return res.status(400).json({ error: 'Nonce expired' });
  }
  let recovered: string;
  try {
    recovered = ethers.verifyMessage(stored.nonce, signature);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid signature' });
  }
  if (recovered.toLowerCase() !== address.toLowerCase()) {
    return res.status(401).json({ valid: false });
  }
  // Optional: delete nonce to prevent replay
  nonces.delete(ip);
  res.json({ valid: true });
});

// ENS mint placeholder (requires authentication and Mancer holder check)
app.post('/ens/mint', async (req, res) => {
  // In a real implementation, you would verify the caller is authenticated
  // and a Mancer holder before proceeding.
  // For now, we just return a mock success.
  const { label } = req.body as { label?: string };
  if (!label || typeof label !== 'string') {
    return res.status(400).json({ error: 'Missing label' });
  }
  // TODO: interact with ENS Registry/NameWrapper to mint <label>.game.agi.eth
  // For demo, we pretend success with a fake tx hash.
  const fakeTxHash = '0x' + crypto.randomBytes(32).toString('hex');
  res.json({ txHash: fakeTxHash, label, fqdn: `${label}.game.agi.eth` });
});
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  const ps = protocolStatus();
  console.log(`Emperor backend listening on port ${PORT}`);
  console.log(`Protocol read path: ${ps.readOnlyAvailable ? `available (chain ${ps.chainId})` : 'unavailable (set ETH_RPC_URL to enable on-chain reads)'}`);
});
