// packages/game-client/src/main.tsx
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Game } from 'phaser';
import { QuestOverlay } from './QuestOverlay';
import { InteriorScene } from './InteriorScene';
import { ethers } from 'ethers';

// --------------------------------------------------------------
// Constants & building definitions
// --------------------------------------------------------------
const WORLD_WIDTH = 800;
const WORLD_HEIGHT = 600;
const LEAF_FRAME = 64;
const LEAF_SPEED = 150;
const ENTER_RADIUS = 80; // distance at which the SPACE prompt appears

interface BuildingDef {
  key: string;
  name: string;
  x: number;
  y: number;
  action: string;
  target: string;
  details: string;
}

const BUILDINGS: BuildingDef[] = [
  { key: 'cabin', name: "Explorer's Guild", x: 150, y: 200, action: 'ECOSYSTEM_RESEARCH', target: 'Robinhood Chain', details: 'Find 10 projects with demonstrated real utility' },
  { key: 'workshop', name: 'The Forge', x: 350, y: 200, action: 'SMART_CONTRACT_DEVELOPMENT', target: 'Settlement contract', details: 'Build a settlement contract with signed offers and a 1% fee' },
  { key: 'watchtower', name: 'Auditor Tower', x: 550, y: 200, action: 'SMART_CONTRACT_AUDIT', target: 'Vault contract', details: 'Audit the provided contract for security issues' },
  { key: 'greenhouse', name: 'Nova Garden', x: 700, y: 200, action: 'CAPABILITY_DISCOVERY', target: 'Cross-chain auditing', details: 'Seed a new capability where existing ones fall short' }
];

// --------------------------------------------------------------
// Decoration placement (no Tiled needed — placed directly in code).
// `solid: true` means Leaf collides with it. Others are walk-through.
// x,y is the base of the object (origin bottom-center); depth = y.
// --------------------------------------------------------------
interface DecorDef { key: string; x: number; y: number; scale: number; solid?: boolean; }

const DECOR: DecorDef[] = [
  { key: 'big_tree', x: 70, y: 140, scale: 0.55, solid: true },
  { key: 'big_tree', x: 745, y: 400, scale: 0.55, solid: true },
  { key: 'small_tree', x: 60, y: 340, scale: 0.5 },
  { key: 'small_tree', x: 765, y: 140, scale: 0.45 },
  { key: 'small_tree', x: 300, y: 545, scale: 0.4 },
  { key: 'bushe', x: 210, y: 430, scale: 0.35 },
  { key: 'bushe', x: 620, y: 520, scale: 0.35 },
  { key: 'bushe', x: 470, y: 390, scale: 0.3 },
  { key: 'stones', x: 120, y: 545, scale: 0.4, solid: true },
  { key: 'stones', x: 700, y: 250, scale: 0.35, solid: true },
  { key: 'pond', x: 640, y: 470, scale: 0.6, solid: true },
  { key: 'log', x: 250, y: 320, scale: 0.4 },
  { key: 'log_2', x: 560, y: 315, scale: 0.35 },
  { key: 'flowers', x: 360, y: 450, scale: 0.3 },
  { key: 'flowers', x: 150, y: 300, scale: 0.25 },
  { key: 'shroom', x: 445, y: 520, scale: 0.3 },
  { key: 'fence', x: 400, y: 575, scale: 0.5 },
];

const DECOR_KEYS = Array.from(new Set(DECOR.map(d => d.key)));

// --------------------------------------------------------------
// Outside Scene
// --------------------------------------------------------------
const outsideScene = { key: 'outside', preload, create, update };

function preload(this: Phaser.Scene) {
  this.load.image('grassfloor', '/assets/grass2.png');
  BUILDINGS.forEach(b => this.load.image(b.key, `/assets/${b.key}.png`));
  DECOR_KEYS.forEach(k => this.load.image(k, `/assets/${k}.png`));
  // Character sheet = chosen Mancer's walk-sheet (falls back to Leaf if the
  // Mancer sheet is missing / fails to load).
  this.load.spritesheet('leaf', CHARACTER_SHEET, { frameWidth: LEAF_FRAME, frameHeight: LEAF_FRAME });
  this.load.once('loaderror', (file: any) => {
    if (file?.key === 'leaf' && CHARACTER_SHEET !== '/assets/leaf.png') {
      console.warn(`Character sheet ${CHARACTER_SHEET} failed to load; using Leaf.`);
      CHARACTER_SHEET = '/assets/leaf.png';
      this.load.spritesheet('leaf', CHARACTER_SHEET, { frameWidth: LEAF_FRAME, frameHeight: LEAF_FRAME });
      this.load.start();
    }
  });
}

function create(this: Phaser.Scene) {
  const scene = this as any;
  this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  // Repeating grass floor
  this.add.tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 'grassfloor').setOrigin(0, 0).setDepth(0);

  // Solid decorations Leaf can't walk through
  const solids = this.physics.add.staticGroup();

  // Decorations
  DECOR.forEach(d => {
    if (d.solid) {
      const s = solids.create(d.x, d.y, d.key) as Phaser.Physics.Arcade.Sprite;
      s.setOrigin(0.5, 1).setScale(d.scale).refreshBody();
      s.setDepth(d.y);
    } else {
      this.add.image(d.x, d.y, d.key).setOrigin(0.5, 1).setScale(d.scale).setDepth(d.y);
    }
  });

  // Building sprites (quest triggers)
  const buildingGroup = this.physics.add.staticGroup();
  const buildingSprites: { def: BuildingDef; sprite: Phaser.GameObjects.Image }[] = [];
  BUILDINGS.forEach(b => {
    const sprite = buildingGroup.create(b.x, b.y, b.key) as Phaser.Physics.Arcade.Sprite;
    sprite.setOrigin(0.5, 1).setScale(0.55).refreshBody();
    sprite.setDepth(b.y);
    sprite.setInteractive({ useHandCursor: true });
    sprite.on('pointerdown', () => enterBuilding(scene, b));
    this.add.text(b.x, b.y - sprite.displayHeight - 6, b.name, {
      fontFamily: 'monospace', fontSize: '12px', color: '#ffffff',
      backgroundColor: '#00000080', padding: { x: 4, y: 2 },
    }).setOrigin(0.5).setDepth(10000);
    buildingSprites.push({ def: b, sprite });
  });
  scene.buildingSprites = buildingSprites;

  // Leaf (player)
  const leaf = this.physics.add.sprite(WORLD_WIDTH / 2, 470, 'leaf');
  leaf.setCollideWorldBounds(true);
  const leafBody = leaf.body as Phaser.Physics.Arcade.Body;
  leafBody.setSize(LEAF_FRAME * 0.4, LEAF_FRAME * 0.35);
  leafBody.setOffset(LEAF_FRAME * 0.3, LEAF_FRAME * 0.55);
  scene.leaf = leaf;

  this.physics.add.collider(leaf, buildingGroup);
  this.physics.add.collider(leaf, solids);

  // Walk animations (3x4 sheet)
  const mk = (key: string, start: number, end: number) =>
    this.anims.create({ key, frames: this.anims.generateFrameNumbers('leaf', { start, end }), frameRate: 6, repeat: -1 });
  mk('walk-down', 0, 2);
  mk('walk-up', 3, 5);
  mk('walk-left', 6, 8);
  mk('walk-right', 9, 11);
  leaf.setFrame(1);
  scene.lastDir = 'down';

  // Input
  const keyboard = this.input.keyboard!;
  scene.cursors = keyboard.createCursorKeys();
  scene.spaceKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

  // Proximity prompt
  scene.prompt = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT - 20, '', {
    fontFamily: 'monospace', fontSize: '14px', color: '#ffff88',
    backgroundColor: '#000000aa', padding: { x: 6, y: 3 },
  }).setOrigin(0.5).setDepth(100000).setScrollFactor(0);

  // Resume cleanly when returning from an interior
  this.events.on(Phaser.Scenes.Events.RESUME, () => scene.leaf?.setVelocity(0, 0));
}

function enterBuilding(scene: any, b: BuildingDef) {
  // Don't auto-fire a hardcoded quest. Enter the building and open the
  // mission-intake form so the player states what they actually want.
  scene.scene.pause('outside');
  scene.scene.launch(`Interior-${b.key}`);
  if (window.openIntake) window.openIntake(b);
}

function update(this: Phaser.Scene) {
  const scene = this as any;
  const leaf = scene.leaf as Phaser.Physics.Arcade.Sprite;
  if (!leaf) return;
  const cursors = scene.cursors as Phaser.Types.Input.Keyboard.CursorKeys;

  let vx = 0, vy = 0;
  if (cursors.left?.isDown) vx = -LEAF_SPEED;
  else if (cursors.right?.isDown) vx = LEAF_SPEED;
  if (cursors.up?.isDown) vy = -LEAF_SPEED;
  else if (cursors.down?.isDown) vy = LEAF_SPEED;
  leaf.setVelocity(vx, vy);
  leaf.setDepth(leaf.y); // sort against decorations

  if (vx !== 0 || vy !== 0) {
    if (Math.abs(vx) > Math.abs(vy)) scene.lastDir = vx < 0 ? 'left' : 'right';
    else scene.lastDir = vy < 0 ? 'up' : 'down';
    leaf.anims.play(`walk-${scene.lastDir}`, true);
  } else {
    leaf.anims.stop();
    const idle: Record<string, number> = { down: 1, up: 4, left: 7, right: 10 };
    leaf.setFrame(idle[scene.lastDir] ?? 1);
  }

  let near: BuildingDef | null = null;
  let best = ENTER_RADIUS;
  for (const { def } of scene.buildingSprites) {
    const d = Phaser.Math.Distance.Between(leaf.x, leaf.y, def.x, def.y);
    if (d < best) { best = d; near = def; }
  }
  if (near) {
    scene.prompt.setText(`Press SPACE to enter ${near.name}`);
    if (Phaser.Input.Keyboard.JustDown(scene.spaceKey)) enterBuilding(scene, near);
  } else {
    scene.prompt.setText('');
  }
}

// --------------------------------------------------------------
// Wallet & Auth helpers
// --------------------------------------------------------------
const MANCER_CONTRACT_ADDRESS = import.meta.env.VITE_MANCER_CONTRACT_ADDRESS;
const ROBINHOOD_RPC_URL = import.meta.env.VITE_ROBINHOOD_RPC_URL; // set in .env
// Mancer is ERC721-C (usually NOT ERC721Enumerable), so we can't rely on
// tokenOfOwnerByIndex. We enumerate via Transfer events to the wallet and
// confirm current ownership with ownerOf.
const MANCER_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
];

// Optional: first block to scan for Transfer logs (the contract's deploy block).
// Setting VITE_MANCER_START_BLOCK makes the scan fast; default 0 scans from genesis.
const MANCER_START_BLOCK = Number(import.meta.env.VITE_MANCER_START_BLOCK ?? 0) || 0;
const LOG_CHUNK = 50000;
const MAX_CHUNKS = 400;

const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';
function ipfsToHttp(uri?: string): string {
  if (!uri) return '';
  if (uri.startsWith('ipfs://')) return IPFS_GATEWAY + uri.replace(/^ipfs:\/\/(ipfs\/)?/, '');
  return uri;
}

interface OwnedMancer { tokenId: string; name?: string; image?: string; }

/** Candidate token ids ever received by `address`, via Transfer(to=address) logs. */
async function receivedTokenIds(
  contract: any,
  provider: ethers.JsonRpcProvider,
  address: string,
): Promise<string[]> {
  const filter = contract.filters.Transfer(null, address);
  // Try a single full-range query first (works when the RPC allows it).
  try {
    const evs = await contract.queryFilter(filter, MANCER_START_BLOCK, 'latest');
    return Array.from(new Set(evs.map((e: any) => e.args.tokenId.toString())));
  } catch {
    // Fall back to chunked scanning for RPCs that cap the block range.
    const latest = await provider.getBlockNumber();
    const ids = new Set<string>();
    let from = MANCER_START_BLOCK;
    for (let n = 0; from <= latest && n < MAX_CHUNKS; n++) {
      const to = Math.min(from + LOG_CHUNK - 1, latest);
      try {
        const evs = await contract.queryFilter(filter, from, to);
        for (const e of evs) ids.add((e as any).args.tokenId.toString());
      } catch { /* skip a bad range */ }
      from = to + 1;
    }
    return Array.from(ids);
  }
}

/**
 * List the Mancer NFTs currently owned by an address. Tries ERC-721 Enumerable
 * first (cheap when supported), otherwise scans Transfer logs and verifies with
 * ownerOf. Resolves metadata/images through an IPFS gateway. Bounded to `max`.
 */
async function fetchOwnedMancers(address: string, max = 48): Promise<OwnedMancer[]> {
  const provider = new ethers.JsonRpcProvider(ROBINHOOD_RPC_URL);
  const contract = new ethers.Contract(MANCER_CONTRACT_ADDRESS, MANCER_ABI, provider);

  // 1) Determine the owned token ids.
  let ids: string[] = [];
  try {
    const bal: number = Number(await contract.balanceOf(address));
    for (let i = 0; i < Math.min(bal, max); i++) {
      ids.push((await contract.tokenOfOwnerByIndex(address, i)).toString());
    }
  } catch {
    // Not enumerable (expected for ERC721-C) — use event scan + ownerOf.
    const candidates = await receivedTokenIds(contract, provider, address);
    const owned: string[] = [];
    for (const id of candidates) {
      if (owned.length >= max) break;
      try {
        const owner: string = await contract.ownerOf(id);
        if (owner.toLowerCase() === address.toLowerCase()) owned.push(id);
      } catch { /* burned / moved — skip */ }
    }
    ids = owned;
  }

  // 2) Resolve metadata/images.
  const out: OwnedMancer[] = [];
  for (const idStr of ids) {
    const m: OwnedMancer = { tokenId: idStr };
    try {
      const uri = ipfsToHttp(await contract.tokenURI(idStr));
      const meta = await fetch(uri).then(r => (r.ok ? r.json() : null));
      if (meta) { m.name = meta.name; m.image = ipfsToHttp(meta.image); }
    } catch { /* metadata unavailable — show a placeholder */ }
    out.push(m);
  }
  return out;
}

// The character's walk-sheet URL (same 3x4/64px format as leaf.png). Set when a
// Mancer is chosen; the game reloads with it under the same 'leaf' texture key.
let CHARACTER_SHEET = '/assets/leaf.png';

async function getProvider() {
  if (typeof window.ethereum !== 'undefined') {
    return new ethers.BrowserProvider(window.ethereum);
  }
  throw new Error('No Ethereum provider found (install MetaMask or similar)');
}

/** Fetch a nonce from the backend – you must implement /auth/nonce */
async function fetchNonce(): Promise<string> {
  const resp = await fetch('http://localhost:3001/auth/nonce');
  if (!resp.ok) throw new Error('Unable to fetch nonce');
  const data = await resp.json();
  return data.nonce; // expect { nonce: "0x..." }
}

/** Sign the nonce with the connected wallet */
async function signMessage(provider: ethers.Provider, address: string, message: string): Promise<string> {
  const signer = await provider.getSigner();
  return await signer.signMessage(message);
}

/** Verify the signature with the backend – you must implement /auth/verify */
async function verifySignature(address: string, signature: string): Promise<boolean> {
  const resp = await fetch('http://localhost:3001/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, signature })
  });
  if (!resp.ok) return false;
  const data = await resp.json();
  return !!data.valid; // expect { valid: true }
}

/**
 * Check Mancer NFT ownership. Returns the balance and a diagnostic instead of
 * silently failing closed, so config/RPC problems are visible.
 */
async function checkMancer(address: string): Promise<{ holder: boolean; balance?: string; error?: string }> {
  if (!ROBINHOOD_RPC_URL) return { holder: false, error: 'VITE_ROBINHOOD_RPC_URL is not set' };
  if (!MANCER_CONTRACT_ADDRESS) return { holder: false, error: 'VITE_MANCER_CONTRACT_ADDRESS is not set' };
  try {
    const provider = new ethers.JsonRpcProvider(ROBINHOOD_RPC_URL);
    const contract = new ethers.Contract(MANCER_CONTRACT_ADDRESS, MANCER_ABI, provider);
    const bal: bigint = await contract.balanceOf(address);
    console.log('[Mancer check]', { rpc: ROBINHOOD_RPC_URL, contract: MANCER_CONTRACT_ADDRESS, address, balance: bal.toString() });
    return { holder: bal > 0n, balance: bal.toString() };
  } catch (e: any) {
    console.warn('Mancer check failed', e);
    return { holder: false, error: e?.shortMessage || e?.message || String(e) };
  }
}

/** Legacy boolean wrapper (kept for callers that only need the boolean). */
async function isMancerHolder(address: string): Promise<boolean> {
  try {
    return (await checkMancer(address)).holder;
  } catch (e) {
    console.warn('Mancer check failed', e);
    return false; // fail‑closed
  }
}
async function mintEnsSubdomain(label: string): Promise<{ txHash?: string }> {
  const resp = await fetch('http://localhost:3001/ens/mint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label })
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`ENS mint failed: ${err}`);
  }
  return await resp.json(); // expect { txHash: "0x..." } or similar
}

/* --------------------------------------------------------------
   Helper – send intent to backend (now includes auth header)
   -------------------------------------------------------------- */
function sendIntent(b: BuildingDef, userAddress: string | null) {
  fetch('http://localhost:3001/intent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // The backend expects this header for per‑user scoping
      ...(userAddress ? { 'x-wallet-address': userAddress } : {})
    },
    body: JSON.stringify({ action: b.action, target: b.target, details: b.details })
  })
    .then(async res => {
      if (res.ok) {
        const data = await res.json();
        if (window.setQuestInProgress) window.setQuestInProgress(true);
        if (window.setJobId && data.jobId) window.setJobId(data.jobId);
      } else {
        console.error('Failed to send intent', res.status);
      }
    })
    .catch(err => console.error('Error sending intent:', err));
}

/* --------------------------------------------------------------
   React wrapper – creates the Phaser game + wallet logic
   -------------------------------------------------------------- */
export default function App() {
  // ----- Game state -----
  const [questInProgress, setQuestInProgress] = useState(false);
  const [questCompleted, setQuestCompleted] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [resultData, setResultData] = useState<any>(null);
  const [completedQuestIds, setCompletedQuestIds] = useState<string[]>([]);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  const [questLoading, setQuestLoading] = useState<boolean>(false);
  const [questData, setQuestData] = useState<any>(null);

  // ----- Mission intake (ask the player what they want) -----
  const [intakeBuilding, setIntakeBuilding] = useState<BuildingDef | null>(null);
  const [intakeTarget, setIntakeTarget] = useState('');
  const [intakeDetails, setIntakeDetails] = useState('');

  // ----- Evidence artifact viewer (read a produced file in the Vault) -----
  const [artifactName, setArtifactName] = useState<string | null>(null);
  const [artifactContent, setArtifactContent] = useState<string | null>(null);
  const [bundleArtifacts, setBundleArtifacts] = useState<any[] | null>(null);

  // ----- Character (Mancer) selection -----
  const [mancers, setMancers] = useState<OwnedMancer[]>([]);
  const [mancersLoading, setMancersLoading] = useState(false);
  const [mancersError, setMancersError] = useState<string | null>(null);
  const [characterOpen, setCharacterOpen] = useState(false);
  const [selectedMancer, setSelectedMancer] = useState<OwnedMancer | null>(null);
  const [characterVersion, setCharacterVersion] = useState(0); // bump to reload the game with a new sheet

  // ----- Wallet / Auth state -----
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [mancerHolder, setMancerHolder] = useState<boolean>(false);
  const [mancerCheckMsg, setMancerCheckMsg] = useState<string | null>(null);
  const [ensLabel, setEnsLabel] = useState<string>(''); // user‑typed label
  const [ensSubdomain, setEnsSubdomain] = useState<string | null>(null); // e.g. "alice.game.agi.eth"
  const [ensMinting, setEnsMinting] = useState(false);
  const [ensError, setEnsError] = useState<string | null>(null);

  // Persist completed quest IDs across refreshes
  useEffect(() => {
    const saved = localStorage.getItem('completedQuestIds');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setCompletedQuestIds(parsed);
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('completedQuestIds', JSON.stringify(completedQuestIds));
  }, [completedQuestIds]);

  // ----- Phaser game setup -----
  useEffect(() => {
    const interiors = BUILDINGS.map(
      b => new InteriorScene({ buildingKey: b.key, interiorImg: `${b.key}-inside.png`, title: b.name, leaveLabel: 'Leave (Esc)' })
    );
    const game = new Game({
      type: Phaser.AUTO,
      parent: 'game-container',
      backgroundColor: '#1e1230',
      pixelArt: true,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: WORLD_WIDTH, height: WORLD_HEIGHT },
      physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
      scene: [outsideScene, ...interiors],
    });
    window.setQuestInProgress = setQuestInProgress;
    window.setJobId = setJobId;
    window.openIntake = (b) => {
      setIntakeBuilding(b as BuildingDef);
      setIntakeTarget(b.target);
      setIntakeDetails(b.details);
    };
    window.phaserGame = game;
    return () => {
      game.destroy(true);
      delete window.setQuestInProgress;
      delete window.setJobId;
      delete window.openIntake;
      delete window.phaserGame;
    };
  }, [characterVersion]);

  // Open the Evidence Vault, loading quest history from the backend so it shows
  // persisted quests (not just this session's).
  const openVault = () => {
    setVaultOpen(true);
    fetch('http://localhost:3001/jobs', {
      headers: walletAddress ? { 'x-wallet-address': walletAddress } : {},
    })
      .then(r => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((d: any) => {
        const ids = (d.jobs || []).filter((j: any) => j.status === 'completed').map((j: any) => j.jobId);
        if (ids.length) setCompletedQuestIds(ids);
      })
      .catch(err => console.error('Failed to load quest history:', err));
  };

  // Show an evidence artifact's content — read from the IPFS bundle (nothing
  // local). The bundle is fetched by CID when the quest is opened.
  const viewArtifact = (artifactPath: string) => {
    setArtifactName(artifactPath);
    if (!bundleArtifacts) {
      setArtifactContent('Outputs are only viewable once the evidence is published to IPFS.');
      return;
    }
    const a = bundleArtifacts.find((x: any) => x.path === artifactPath);
    setArtifactContent(a?.content ?? a?.note ?? 'Artifact not found in the published bundle.');
  };

  // Open the character card and load the wallet's Mancers.
  const openCharacterCard = () => {
    setCharacterOpen(true);
    if (!walletAddress) return;
    setMancersLoading(true);
    setMancersError(null);
    fetchOwnedMancers(walletAddress)
      .then(list => {
        setMancers(list);
        if (list.length === 0) setMancersError('No Mancers found for this wallet.');
      })
      .catch(err => {
        console.error('Failed to load Mancers:', err);
        setMancersError('Could not load your Mancers. Check the Mancer contract / RPC config (and set VITE_MANCER_START_BLOCK to the deploy block to speed up the scan).');
      })
      .finally(() => setMancersLoading(false));
  };

  // Pick a Mancer as the character: load its walk-sheet and reload the game.
  const chooseCharacter = (m: OwnedMancer) => {
    setSelectedMancer(m);
    CHARACTER_SHEET = `/assets/mancers/${m.tokenId}.png`;
    setCharacterVersion(v => v + 1);
    setCharacterOpen(false);
  };

  // Dispatch the player-authored mission as a structured intent.
  const dispatchMission = () => {
    if (!intakeBuilding) return;
    sendIntent(
      {
        ...intakeBuilding,
        target: intakeTarget.trim() || intakeBuilding.target,
        details: intakeDetails.trim() || intakeBuilding.details,
      },
      walletAddress,
    );
    // Resume outside scene and stop interior
    const game = window.phaserGame;
    if (game && intakeBuilding) {
      game.scene.stop(`Interior-${intakeBuilding.key}`);
      game.scene.resume('outside');
    }
    setIntakeBuilding(null);
  };

  // ----- Poll quest status -----
  useEffect(() => {
    if (!jobId) return;
    const interval = setInterval(async () => {
      try {
        const resp = await fetch(`http://localhost:3001/job/${jobId}/status`, {
          headers: walletAddress ? { 'x-wallet-address': walletAddress } : {},
        });
        if (!resp.ok) return;
        const data = await resp.json();
        if (data.status === 'completed') {
          clearInterval(interval);
          setQuestInProgress(false);
          setQuestCompleted(true);
          setResultData(data.result);
          if (jobId) {
            setCompletedQuestIds(prev => {
              if (!prev.includes(jobId)) return [...prev, jobId];
              return prev;
            });
          }
        } else if (data.status === 'failed') {
          clearInterval(interval);
          setQuestInProgress(false);
          console.error('Job failed', data);
        }
      } catch (e) {
        console.error('Polling error', e);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [jobId]);

  // ----- Fetch quest details for Vault viewer -----
  useEffect(() => {
    setArtifactName(null);
    setArtifactContent(null);
    setBundleArtifacts(null);
    if (!selectedQuestId) {
      setQuestData(null);
      return;
    }
    setQuestLoading(true);
    fetch(`http://localhost:3001/job/${selectedQuestId}/status`, {
      headers: walletAddress ? { 'x-wallet-address': walletAddress } : {},
    })
      .then(async resp => {
        if (!resp.ok) throw new Error('Failed to fetch quest');
        const data = await resp.json();
        setQuestData(data);
        // Pull the produced outputs from IPFS (content-addressed, nothing local).
        const cid = data?.docket?.ipfs_cid;
        if (cid) {
          fetch(`https://gateway.pinata.cloud/ipfs/${cid}`)
            .then(r => (r.ok ? r.json() : null))
            .then(bundle => setBundleArtifacts(Array.isArray(bundle?.artifacts) ? bundle.artifacts : []))
            .catch(() => setBundleArtifacts([]));
        } else {
          setBundleArtifacts(null);
        }
      })
      .catch(err => {
        console.error('Error fetching quest:', err);
        setQuestData(null);
      })
      .finally(() => setQuestLoading(false));
  }, [selectedQuestId]);

  // ----- Wallet connection logic -----
  const connectWallet = async () => {
    try {
      setAuthenticating(true);
      const provider = await getProvider();
      await window.ethereum?.request({ method: 'eth_requestAccounts' });
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      setWalletAddress(address);
      setWalletConnected(true);

      // 1️⃣ Get nonce from backend
      const nonce = await fetchNonce(); // e.g. "0x123abc..."
      // 2️⃣ Sign it
      const signature = await signMessage(provider, address, nonce);
      // 3️⃣ Verify with backend
      const valid = await verifySignature(address, signature);
      if (!valid) throw new Error('Signature verification failed');
      setAuthenticated(true);

      // 4️⃣ Check Mancer NFT holder status (with a visible diagnostic)
      const res = await checkMancer(address);
      setMancerHolder(res.holder);
      setMancerCheckMsg(res.error ? `check failed: ${res.error}` : `balance: ${res.balance}`);
    } catch (err) {
      console.error('Wallet connection/auth error:', err);
      setWalletAddress(null);
      setWalletConnected(false);
      setAuthenticated(false);
      setMancerHolder(false);
      // keep authenticating false so user can retry
    } finally {
      setAuthenticating(false);
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    setWalletConnected(false);
    setAuthenticated(false);
    setMancerHolder(false);
    setMancerCheckMsg(null);
    setAuthenticating(false); // never leave the Connect button disabled
  };

  // Manually re-run the Mancer ownership check (useful when config was fixed).
  const recheckMancer = async () => {
    if (!walletAddress) return;
    setMancerCheckMsg('checking…');
    const res = await checkMancer(walletAddress);
    setMancerHolder(res.holder);
    setMancerCheckMsg(res.error ? `check failed: ${res.error}` : `balance: ${res.balance}`);
  };

  // ----- ENS minting -----
  const handleEnsMint = async () => {
    if (!walletAddress || !authenticated || !mancerHolder) {
      alert('You must be connected, verified, and a Mancer NFT holder to mint a sub‑domain.');
      return;
    }
    const label = ensLabel.trim();
    if (!label) {
      alert('Please enter a sub‑domain label.');
      return;
    }
    setEnsMinting(true);
    setEnsError(null);
    try {
      const result = await mintEnsSubdomain(label);
      // Assuming backend returns { txHash: "0x..." }
      const txHash = result.txHash;
      if (txHash) {
        setEnsSubdomain(`${label}.game.agi.eth`);
        // Optionally show a link to ENS explorer or tx receipt
        console.log('ENS mint tx:', txHash);
      } else {
        setEnsError('Unexpected response from ENS mint endpoint.');
      }
    } catch (err) {
      console.error('ENS mint error:', err);
      setEnsError(err instanceof Error ? err.message : String(err));
    } finally {
      setEnsMinting(false);
    }
  };

  // ----- Render -----
  return (
    <div style={{ padding: '1rem', fontFamily: 'sans-serif', position: 'relative', minHeight: '100vh' }}>
      {/* ==== Wallet bar (top‑right) ==== */}
      <div style={{
        position: 'fixed',
        top: 8,
        right: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 4,
        zIndex: 1000
      }}>
        {!walletConnected ? (
          <>
            <button onClick={connectWallet} disabled={authenticating}>
              {authenticating ? 'Connecting…' : 'Connect Wallet'}
            </button>
            {/* ENS mint row */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                value={ensLabel}
                onChange={e => setEnsLabel(e.target.value)}
                placeholder="ens label"
                style={{ flex: 1, minWidth: '120px', padding: '4px', fontSize: '14px' }}
                disabled={ensMinting}
              />
              <button
                onClick={handleEnsMint}
                disabled={!ensLabel.trim() || ensMinting}
                style={{ padding: '4px 8px', fontSize: '14px', cursor: ensMinting ? 'not-allowed' : 'pointer' }}
              >
                {ensMinting ? 'Minting…' : 'Mint ENS'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: '14px', color: '#fff' }}>
              Connected: <code>{walletAddress?.slice(0, 6)}…{walletAddress?.slice(-4)}</code>
            </div>
            <div>
              {authenticated ? (
                <span style={{ color: '#4caf50' }}>✓ Verified</span>
              ) : (
                <span style={{ color: '#f44336' }}>✗ Not verified</span>
              )}
              &nbsp;|&nbsp;
              {mancerHolder ? (
                <span style={{ color: '#8bc34a' }}>✓ Mancer Holder</span>
              ) : (
                <span style={{ color: '#ff9800' }}>⚠ Not a Holder</span>
              )}
              <button onClick={recheckMancer} style={{ fontSize: '11px', padding: '1px 6px', marginLeft: 6 }}>
                Re-check
              </button>
            </div>
            {mancerCheckMsg && (
              <div style={{ fontSize: '11px', color: mancerCheckMsg.includes('failed') ? '#f44336' : '#9a86c8' }}>
                Mancer {mancerCheckMsg}
              </div>
            )}
            <button onClick={disconnectWallet} style={{ fontSize: '12px', padding: '2px 6px' }}>
              Disconnect
            </button>
            {/* ENS mint row */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                value={ensLabel}
                onChange={e => setEnsLabel(e.target.value)}
                placeholder="ens label"
                style={{ flex: 1, minWidth: '120px', padding: '4px', fontSize: '14px' }}
                disabled={ensMinting}
              />
              <button
                onClick={handleEnsMint}
                disabled={!ensLabel.trim() || ensMinting}
                style={{ padding: '4px 8px', fontSize: '14px', cursor: ensMinting ? 'not-allowed' : 'pointer' }}
              >
                {ensMinting ? 'Minting…' : 'Mint ENS'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* ==== Top-left action buttons ==== */}
      <div style={{ position: 'fixed', left: 12, top: 12, zIndex: 900, display: 'flex', gap: 8 }}>
        <button
          onClick={openVault}
          style={{ padding: '6px 12px', background: '#3a2b5c', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'sans-serif' }}
        >
          📜 Evidence Vault
        </button>
        <button
          onClick={openCharacterCard}
          style={{ padding: '6px 12px', background: '#3a2b5c', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'sans-serif' }}
        >
          🧙 {selectedMancer ? `Mancer #${selectedMancer.tokenId}` : 'Choose Character'}
        </button>
      </div>

      {/* ==== Main game canvas ==== */}
      <div id="game-container" style={{ width: '100%', maxWidth: 800, margin: '0 auto' }}></div>

      {/* ==== Quest overlay (existing) ==== */}
      <QuestOverlay
        questInProgress={questInProgress}
        questCompleted={questCompleted}
        resultData={resultData}
        onClose={() => {
          setQuestInProgress(false);
          setQuestCompleted(false);
          setJobId(null);
          setResultData(null);
          if (window.setQuestInProgress) window.setQuestInProgress(false);
          if (window.setJobId) window.setJobId(null);
        }}
      />

      {/* ==== Character selection card (pick your Mancer) ==== */}
      {characterOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}
          onClick={() => setCharacterOpen(false)}
        >
          <div
            style={{ background: '#1e1230', color: '#fff', padding: '24px', borderRadius: '8px', width: '560px', maxWidth: '94%', maxHeight: '86vh', overflowY: 'auto', fontFamily: 'sans-serif' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0 }}>Choose your character</h2>
            <p style={{ color: '#b9a7e0', fontSize: 13, marginTop: 0 }}>
              Pick one of your Mancer NFTs. It becomes your in-game character.
            </p>

            {!walletAddress ? (
              <p>Connect your wallet to see your Mancers.</p>
            ) : mancersLoading ? (
              <p>Loading your Mancers…</p>
            ) : mancersError ? (
              <p style={{ color: '#f4a' }}>{mancersError}</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12 }}>
                {mancers.map(m => {
                  const active = selectedMancer?.tokenId === m.tokenId;
                  return (
                    <button
                      key={m.tokenId}
                      onClick={() => chooseCharacter(m)}
                      style={{
                        background: active ? '#4a327a' : '#2a1f40',
                        border: active ? '2px solid #b98cff' : '2px solid transparent',
                        borderRadius: 8, padding: 8, cursor: 'pointer', color: '#fff', textAlign: 'center',
                      }}
                    >
                      {m.image ? (
                        <img src={m.image} alt={m.name || m.tokenId} style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: 6, imageRendering: 'pixelated' }} />
                      ) : (
                        <div style={{ width: '100%', aspectRatio: '1 / 1', background: '#000', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#888' }}>no image</div>
                      )}
                      <div style={{ fontSize: 12, marginTop: 6 }}>{m.name || `Mancer #${m.tokenId}`}</div>
                      <div style={{ fontSize: 10, color: '#9a86c8' }}>#{m.tokenId}</div>
                    </button>
                  );
                })}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => setCharacterOpen(false)} style={{ padding: '8px 16px' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ==== Mission Intake (ask the player what they want) ==== */}
      {intakeBuilding && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}
          onClick={() => setIntakeBuilding(null)}
        >
          <div
            style={{ background: '#1e1230', color: '#fff', padding: '24px', borderRadius: '8px', width: '460px', maxWidth: '92%', fontFamily: 'sans-serif' }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 4px' }}>{intakeBuilding.name}</h2>
            <p style={{ margin: '0 0 16px', color: '#b9a7e0', fontSize: 13 }}>
              Capability: <code>{intakeBuilding.action}</code>
            </p>

            <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>Objective / target</label>
            <input
              type="text"
              value={intakeTarget}
              onChange={e => setIntakeTarget(e.target.value)}
              placeholder={intakeBuilding.target}
              style={{ width: '100%', padding: '8px', fontSize: 14, marginBottom: 12, boxSizing: 'border-box' }}
            />

            <label style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>What should be done?</label>
            <input
              type="text"
              value={intakeDetails}
              onChange={e => setIntakeDetails(e.target.value)}
              placeholder={intakeBuilding.details}
              style={{ width: '100%', padding: '8px', fontSize: 14, marginBottom: 16, boxSizing: 'border-box' }}
            />

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setIntakeBuilding(null)} style={{ padding: '8px 16px' }}>Cancel</button>
              <button
                onClick={dispatchMission}
                disabled={!intakeTarget.trim()}
                style={{ padding: '8px 16px', background: '#6a4fb0', color: '#fff', border: 'none', borderRadius: 4, cursor: intakeTarget.trim() ? 'pointer' : 'not-allowed' }}
              >
                Dispatch Mission
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==== Vault Modal ==== */}
      {vaultOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => {
          setVaultOpen(false);
          setSelectedQuestId(null);
          setQuestData(null);
        }}>
          <div style={{
            background: '#1e1230',
            color: '#fff',
            padding: '24px',
            borderRadius: '8px',
            width: '420px',
            maxWidth: '90%',
            maxHeight: '85vh',
            overflowY: 'auto'
          }} onClick={e => e.stopPropagation()}>
            {!selectedQuestId ? (
              <>
                <h2>Completed Quests</h2>
                {completedQuestIds.length === 0 ? (
                  <p>No completed quests yet.</p>
                ) : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {completedQuestIds.map(id => (
                      <li key={id} style={{ padding: '8px 0', borderBottom: '1px solid #333' }}>
                        <button onClick={() => {
                          setSelectedQuestId(id);
                        }} style={{
                          background: 'none',
                          border: 'none',
                          color: '#fff',
                          textAlign: 'left',
                          width: '100%',
                          cursor: 'pointer'
                        }}>
                          Quest {id}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <button onClick={() => setVaultOpen(false)} style={{ marginTop: '16px', padding: '8px 16px' }}>
                  Close
                </button>
              </>
            ) : (
              <>
                <h2>Quest {selectedQuestId}</h2>
                {questLoading ? (
                  <p>Loading…</p>
                ) : questData ? (
                  <>
                    <h3>Status: {questData.status}</h3>
                    {questData.docket && (
                      <>
                        <h4>Docket (IPFS CID: {questData.docket.ipfs_cid})</h4>
                        <pre style={{
                          background: '#000',
                          padding: '12px',
                          overflow: 'auto',
                          maxHeight: '220px'
                        }}>{JSON.stringify(questData.docket, null, 2)}</pre>
                        {questData.docket.ipfs_cid && (
                          <div style={{ marginTop: '12px' }}>
                            <a
                              href={`https://gateway.pinata.cloud/ipfs/${questData.docket.ipfs_cid}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#4fc3f7' }}
                            >
                              View Proof on IPFS
                            </a>
                          </div>
                        )}
                      </>
                    )}
                    {/* Evidence — the artifacts the mission produced */}
                    {questData.evidence && questData.evidence.length > 0 && (
                      <div style={{ marginTop: 16 }}>
                        <h4 style={{ marginBottom: 8 }}>Evidence ({questData.evidence.length})</h4>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                          {questData.evidence.map((e: any, i: number) => (
                            <li key={i} style={{ padding: '6px 0', borderBottom: '1px solid #2a1f40', fontSize: 13 }}>
                              <span style={{ color: '#b9a7e0' }}>[{e.type}]</span> {e.summary}
                              {e.ref && String(e.ref).startsWith('output/') && (
                                <button
                                  onClick={() => viewArtifact(e.ref)}
                                  style={{ marginLeft: 8, fontSize: 12, cursor: 'pointer', background: '#3a2b5c', color: '#fff', border: 'none', borderRadius: 3, padding: '2px 8px' }}
                                >
                                  view file
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                        {artifactName && (
                          <div style={{ marginTop: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <strong style={{ fontSize: 12 }}>{artifactName}</strong>
                              <button onClick={() => { setArtifactName(null); setArtifactContent(null); }} style={{ fontSize: 11 }}>close</button>
                            </div>
                            <pre style={{ background: '#000', padding: 12, overflow: 'auto', maxHeight: 200, fontSize: 12, whiteSpace: 'pre-wrap' }}>{artifactContent}</pre>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ENS claim section – only show if user is verified & holder */}
                    {authenticated && mancerHolder && (
                      <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #444' }}>
                        <h4>Claim your ENS sub‑domain</h4>
                        <p>
                          You own a Mancer NFT, so you can mint a sub‑domain of
                          <code>game.agi.eth</code> (e.g. <code>myname.game.agi.eth</code>).
                        </p>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
                          <input
                            type="text"
                            value={ensLabel}
                            onChange={e => setEnsLabel(e.target.value)}
                            placeholder="yourlabel"
                            style={{ flex: 1, padding: '6px', fontSize: '14px' }}
                            disabled={ensMinting}
                          />
                          <button
                            onClick={handleEnsMint}
                            disabled={!ensLabel.trim() || ensMinting}
                            style={{ padding: '6px 12px', fontSize: '14px', cursor: ensMinting ? 'not-allowed' : 'pointer' }}
                          >
                            {ensMinting ? 'Minting…' : 'Claim'}
                          </button>
                        </div>
                        {ensSubdomain && (
                          <div style={{ marginTop: '12px' }}>
                            <p>Your sub‑domain:</p>
                            <code style={{ color: '#81c784' }}>{ensSubdomain}</code>
                            <p style={{ fontSize: '12px', color: '#aaa' }}>
                              (You can now set this as your ENS resolver or avatar, etc.)
                            </p>
                          </div>
                        )}
                        {ensError && (
                          <div style={{ marginTop: '12px', color: '#f44336' }}>
                            Error: {ensError}
                          </div>
                        )}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setSelectedQuestId(null);
                        setQuestData(null);
                      }}
                      style={{ marginTop: '16px', padding: '8px 16px' }}
                    >
                      Back to List
                    </button>
                  </>
                ) : (
                  <p>No data.</p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);