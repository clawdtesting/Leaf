import express from 'express';
import * as dotenv from 'dotenv';
import { ethers } from 'ethers';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

const app = express();
app.use(express.json());

// Define the intent schema
const IntentSchema = z.object({
  action: z.string(),
  target: z.string(),
  details: z.string()
});

// Minimal ABI for AGIJobManager.createJob function
const agiJobManagerAbi = [
  "function createJob(string calldata jobSpecURI, uint256 payout, uint32 duration, string calldata details) returns (uint256 jobId)"
];

// Contract address from env
const contractAddress = process.env.AGI_JOB_MANAGER_ADDRESS || '0xB3AAeb69b630f0299791679c063d68d6687481d1';

// Initialize provider and wallet
const provider = new ethers.JsonRpcProvider(process.env.ETH_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/rDjRRnJwDPdErIRoNgU_9');
const privateKey = process.env.EMPEROR_PRIVATE_KEY;
if (!privateKey) {
  console.error('EMPEROR_PRIVATE_KEY is not set in .env');
  process.exit(1);
}
const wallet = new ethers.Wallet(privateKey, provider);
const agiJobManager = new ethers.Contract(contractAddress, agiJobManagerAbi, wallet);

// In-memory job store (for demo)
interface Job {
  id: string;
  status: 'pending' | 'completed' | 'failed';
  result?: any;
}
const jobs: Map<string, Job> = new Map();

// Simple job ID generator
let jobCounter = 1;

// Background job completion simulator (for demo)
function simulateJobCompletion(jobId: string) {
  setTimeout(() => {
    const job = jobs.get(jobId);
    if (job) {
      job.status = 'completed';
      job.result = { message: 'Job completed successfully', data: ['Project1', 'Project2', 'Project3', 'Project4', 'Project5', 'Project6', 'Project7', 'Project8', 'Project9', 'Project10'] };
    }
  }, 10000); // complete after 10 seconds
}

// POST /intent endpoint
app.post('/intent', async (req, res) => {
  try {
    // Validate intent
    const intent = IntentSchema.parse(req.body);
    console.log('Received valid intent:', intent);

    // Create a job spec URI (could be IPFS hash, but for demo use a random UUID)
    const jobSpecURI = `urn:uuid:${crypto.randomUUID()}`;
    const payout = 0; // 0 tokens for demo
    const duration = 3600; // 1 hour duration
    const details = JSON.stringify(intent);

    let txReceipt;
    try {
      // Call the contract to create a job
      const tx = await agiJobManager.createJob(jobSpecURI, payout, duration, details);
      txReceipt = await tx.wait();
      console.log('Job created on-chain:', txReceipt.transactionHash);
    } catch (contractError) {
      console.warn('Contract call failed, falling back to simulated job creation:', contractError.message);
      // Continue to create a simulated job
    }

    // Generate our own job ID and store it
    const jobId = String(jobCounter++);
    const job: Job = { id: jobId, status: 'pending' };
    jobs.set(jobId, job);

    // Simulate completion after delay
    simulateJobCompletion(jobId);

    // Return job ID to frontend
    res.status(202).json({ jobId, status: 'accepted' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Validation error:', error.issues);
      res.status(400).json({ error: 'Invalid intent', details: error.issues });
    } else {
      console.error('Error processing intent:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// GET /job/:id/status endpoint for polling
app.get('/job/:id/status', (req, res) => {
  const { id } = req.params;
  const job = jobs.get(id);
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json({ jobId: id, status: job.status, result: job.result });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Emperor backend listening on port ${PORT}`);
});