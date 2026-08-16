import express from 'express';
import * as dotenv from 'dotenv';
import { ethers } from 'ethers';
import { z } from 'zod';
import path from 'path';
import { ACTIONS, getAction, listActions } from './capabilities';
import { createMission, getMission } from './emperor';

// Load environment variables from .env file (game.agi.eth/.env)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
app.use(express.json());

// Permissive CORS for the local game client (dev)
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
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

/* ------------------------------------------------------------------ */
/* Optional on-chain wiring (AGIJobManager). Runs fine without a key.  */
/* ------------------------------------------------------------------ */
const agiJobManagerAbi = [
  'function createJob(string calldata jobSpecURI, uint256 payout, uint32 duration, string calldata details) returns (uint256 jobId)',
];
const contractAddress = process.env.AGI_JOB_MANAGER_ADDRESS || '0xB3AAeb69b630f0299791679c063d68d6687481d1';
const privateKey = process.env.EMPEROR_PRIVATE_KEY;
let agiJobManager: ethers.Contract | null = null;
if (privateKey) {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/rDjRRnJwDPdErIRoNgU_9');
    const wallet = new ethers.Wallet(privateKey, provider);
    agiJobManager = new ethers.Contract(contractAddress, agiJobManagerAbi, wallet);
  } catch (e) {
    console.warn('Wallet/contract init failed; continuing without on-chain settlement.', (e as Error).message);
  }
} else {
  console.warn('EMPEROR_PRIVATE_KEY not set — running without on-chain settlement (simulation only).');
}

/* ------------------------------------------------------------------ */
/* Routes                                                              */
/* ------------------------------------------------------------------ */

// Capability discovery — what each building can do.
app.get('/capabilities', (_req, res) => {
  res.json({ capabilities: listActions() });
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

    // Optional: record the job on-chain when the route settles externally.
    if (agiJobManager && def.route === 'AGIJOBMANAGER') {
      try {
        const tx = await agiJobManager.createJob(`urn:intent:${def.action}`, 0, 3600, JSON.stringify(intent));
        const receipt = await tx.wait();
        console.log('AGIJobManager job created on-chain:', receipt?.hash);
      } catch (contractError) {
        console.warn('On-chain createJob failed; continuing with simulated settlement:', (contractError as Error).message);
      }
    }

    // Emperor accepts the intent and runs the staged mission.
    const mission = createMission(intent);
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

// Mission status + proof record (evidence, validation, plan, log).
app.get('/job/:id/status', (req, res) => {
  const mission = getMission(req.params.id);
  if (!mission) return res.status(404).json({ error: 'Job not found' });
  res.json({
    jobId: mission.id,
    status: mission.status,
    capability: mission.capability,
    building: mission.building,
    route: mission.route,
    plan: mission.plan,
    evidence: mission.evidence,
    validation: mission.validation,
    result: mission.result,
    cost: mission.cost,
    log: mission.log,
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Emperor backend listening on port ${PORT}`);
});
