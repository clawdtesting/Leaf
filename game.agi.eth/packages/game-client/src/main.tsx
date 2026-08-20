// packages/game-client/src/main.tsx
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Game } from 'phaser';
import { QuestOverlay } from './QuestOverlay';
import { InteriorScene } from './InteriorScene';
import { ethers } from 'ethers';
import './game-ui.css';

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

type MapItemKind = 'building' | 'decor';
interface MapItemPosition { id: string; kind: MapItemKind; key: string; x: number; y: number; }
const MAP_LAYOUT_STORAGE_KEY = 'game-map-layout-v1';

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
const DEFAULT_MAP_POSITIONS = mapItems().map(item => ({ ...item }));

function mapItems(): MapItemPosition[] {
  return [
    ...BUILDINGS.map((item, index) => ({ id: `building-${index}`, kind: 'building' as const, key: item.key, x: item.x, y: item.y })),
    ...DECOR.map((item, index) => ({ id: `decor-${index}`, kind: 'decor' as const, key: item.key, x: item.x, y: item.y })),
  ];
}

function applySavedMapLayout() {
  try {
    const saved = JSON.parse(localStorage.getItem(MAP_LAYOUT_STORAGE_KEY) || '{}') as Record<string, { x: number; y: number }>;
    mapItems().forEach(item => {
      const position = saved[item.id];
      if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) return;
      const target = item.kind === 'building' ? BUILDINGS[Number(item.id.split('-')[1])] : DECOR[Number(item.id.split('-')[1])];
      target.x = Phaser.Math.Clamp(position.x, 0, WORLD_WIDTH);
      target.y = Phaser.Math.Clamp(position.y, 0, WORLD_HEIGHT);
    });
  } catch {
    localStorage.removeItem(MAP_LAYOUT_STORAGE_KEY);
  }
}

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
  const editableItems: Record<string, { sprite: Phaser.GameObjects.Image; label?: Phaser.GameObjects.Text }> = {};
  DECOR.forEach((d, index) => {
    if (d.solid) {
      const s = solids.create(d.x, d.y, d.key) as Phaser.Physics.Arcade.Sprite;
      s.setOrigin(0.5, 1).setScale(d.scale).refreshBody();
      s.setDepth(d.y);
      editableItems[`decor-${index}`] = { sprite: s };
    } else {
      const sprite = this.add.image(d.x, d.y, d.key).setOrigin(0.5, 1).setScale(d.scale).setDepth(d.y);
      editableItems[`decor-${index}`] = { sprite };
    }
  });

  // Building sprites (quest triggers)
  const buildingGroup = this.physics.add.staticGroup();
  const buildingSprites: { def: BuildingDef; sprite: Phaser.GameObjects.Image }[] = [];
  BUILDINGS.forEach((b, index) => {
    const sprite = buildingGroup.create(b.x, b.y, b.key) as Phaser.Physics.Arcade.Sprite;
    sprite.setOrigin(0.5, 1).setScale(0.55).refreshBody();
    sprite.setDepth(b.y);
    sprite.setInteractive({ useHandCursor: true });
    sprite.on('pointerdown', () => {
      if (!scene.mapConfigMode) enterBuilding(scene, b);
    });
    const label = this.add.text(b.x, b.y - sprite.displayHeight - 6, b.name, {
      fontFamily: 'monospace', fontSize: '12px', color: '#ffffff',
      backgroundColor: '#00000080', padding: { x: 4, y: 2 },
    }).setOrigin(0.5).setDepth(10000);
    buildingSprites.push({ def: b, sprite });
    editableItems[`building-${index}`] = { sprite, label };
  });
  scene.buildingSprites = buildingSprites;
  scene.editableItems = editableItems;

  Object.entries(editableItems).forEach(([id, item]) => {
    item.sprite.setInteractive({ useHandCursor: false, draggable: false });
    item.sprite.on('pointerdown', () => {
      if (scene.mapConfigMode) window.selectMapItem?.(id);
    });
    item.sprite.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      if (!scene.mapConfigMode) return;
      window.updateMapItem?.(id, Math.round(dragX), Math.round(dragY));
    });
  });

  scene.setMapConfigMode = (enabled: boolean) => {
    scene.mapConfigMode = enabled;
    leaf.setVelocity(0, 0);
    Object.values(editableItems).forEach(item => {
      this.input.setDraggable(item.sprite, enabled);
      item.sprite.input!.cursor = enabled ? 'move' : 'pointer';
    });
  };
  scene.updateMapItemPosition = (id: string, x: number, y: number) => {
    const item = editableItems[id];
    if (!item) return;
    item.sprite.setPosition(x, y).setDepth(y);
    const body = item.sprite.body as Phaser.Physics.Arcade.StaticBody | undefined;
    body?.updateFromGameObject();
    if (item.label) item.label.setPosition(x, y - item.sprite.displayHeight - 6);
  };

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
  // Entering only opens the interior. Its action hotspot is responsible for
  // opening mission intake after an explicit click or SPACE press.
  scene.scene.pause('outside');
  scene.scene.launch(`Interior-${b.key}`);
}

function update(this: Phaser.Scene) {
  const scene = this as any;
  const leaf = scene.leaf as Phaser.Physics.Arcade.Sprite;
  if (!leaf) return;
  const cursors = scene.cursors as Phaser.Types.Input.Keyboard.CursorKeys;

  if (scene.mapConfigMode) {
    leaf.setVelocity(0, 0);
    scene.prompt.setText('CONFIG MODE · drag an object or edit its X / Y values');
    return;
  }

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
// Base URL of the Emperor backend. Local dev defaults to the ts-node server on
// :3001; in production (e.g. Vercel) set VITE_API_BASE to the deployed backend
// origin. Trailing slash trimmed so `${API_BASE}/path` is always clean.
const API_BASE = (import.meta.env.VITE_API_BASE || 'http://localhost:3001').replace(/\/+$/, '');
// Mancer is ERC721-C (usually NOT ERC721Enumerable), so we can't rely on
// tokenOfOwnerByIndex. We enumerate via Transfer events to the wallet and
// confirm current ownership with ownerOf.
const MANCER_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
];

// Optional: first block to scan for Transfer logs (the contract's deploy block).
// Setting VITE_MANCER_START_BLOCK makes the scan fast; default 0 scans from genesis.
const MANCER_START_BLOCK = Number(import.meta.env.VITE_MANCER_START_BLOCK ?? 0) || 0;
const LOG_CHUNK = 50000;
const MAX_CHUNKS = 400;
// Log-free ownerOf-scan bounds (used when the contract isn't Enumerable and the
// RPC caps or rejects eth_getLogs — common on rollups).
const OWNER_SCAN_MAX_IDS = Number(import.meta.env.VITE_MANCER_MAX_ID ?? 20000) || 20000;
const OWNER_SCAN_CONCURRENCY = 24;

const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs/';
function ipfsToHttp(uri?: string): string {
  if (!uri) return '';
  if (uri.startsWith('ipfs://')) return IPFS_GATEWAY + uri.replace(/^ipfs:\/\/(ipfs\/)?/, '');
  return uri;
}

interface OwnedMancer { tokenId: string; name?: string; image?: string; }

interface LeafCharacter { name: string; sheet: string; }

const LEAF_CHARACTERS: LeafCharacter[] = [
  { name: 'Leaf', sheet: '/assets/leaf.png' },
  { name: 'Red Leaf', sheet: '/assets/leaf_red.png' },
  { name: 'Split Leaf', sheet: '/assets/leaf_split.png' },
];

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
 * Enumerate owned token ids WITHOUT logs: walk the id space [0..totalSupply]
 * and keep ids whose ownerOf() is `address`. Works on RPCs that cap or reject
 * eth_getLogs. Stops early once `balance` tokens are found. Requires the
 * contract to expose totalSupply(); returns null if it does not.
 */
async function ownedByOwnerOfScan(
  contract: any,
  address: string,
  balance: number,
  max: number,
): Promise<string[] | null> {
  let supply: number;
  try {
    supply = Number(await contract.totalSupply());
  } catch {
    return null; // no totalSupply — caller falls back to the log scan
  }
  if (!Number.isFinite(supply) || supply <= 0) return [];

  const target = balance > 0 ? balance : max;
  // Scan 0..supply inclusive so both 0-based and 1-based id schemes are covered.
  const hi = Math.min(supply, OWNER_SCAN_MAX_IDS);
  const want = address.toLowerCase();
  const owned: string[] = [];

  // ownerOf may reject for two very different reasons: a nonexistent/burned id
  // (a legitimate skip) or a transient RPC error such as rate limiting (which
  // must NOT be silently dropped, or we'd miss a real token). Retry once with a
  // short backoff; a genuinely nonexistent id simply reverts again and is
  // skipped, at negligible cost on a contiguous collection.
  const ownerOfMatches = async (id: number): Promise<boolean> => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return ((await contract.ownerOf(id)) as string).toLowerCase() === want;
      } catch {
        if (attempt === 0) await new Promise((r) => setTimeout(r, 150));
      }
    }
    return false;
  };

  for (let start = 0; start <= hi && owned.length < target && owned.length < max; start += OWNER_SCAN_CONCURRENCY) {
    const batch: number[] = [];
    for (let id = start; id < start + OWNER_SCAN_CONCURRENCY && id <= hi; id++) batch.push(id);
    const flags = await Promise.all(batch.map(ownerOfMatches));
    batch.forEach((id, i) => { if (flags[i]) owned.push(String(id)); });
  }
  return owned;
}

/**
 * Fast path: resolve owned Mancers in ONE call via the Alchemy NFT API, using
 * the same key already present in the RPC URL (no extra config, no exposure
 * beyond the read key already shipped to the client). Returns null when the RPC
 * is not an Alchemy endpoint or the NFT API isn't available on this network, so
 * the caller falls back to other paths.
 */
async function fetchViaAlchemyNft(address: string, max = 48): Promise<OwnedMancer[] | null> {
  if (!ROBINHOOD_RPC_URL || !/\.g\.alchemy\.com\/v2\//.test(ROBINHOOD_RPC_URL)) return null;
  // https://<net>.g.alchemy.com/v2/<key>  ->  https://<net>.g.alchemy.com/nft/v3/<key>
  const [base, key] = ROBINHOOD_RPC_URL.split('/v2/');
  if (!base || !key) return null;
  const nftBase = `${base}/nft/v3/${key}/getNFTsForOwner`;

  try {
    const out: OwnedMancer[] = [];
    let pageKey: string | undefined;
    for (let page = 0; page < 10 && out.length < max; page++) {
      const url = new URL(nftBase);
      url.searchParams.set('owner', address);
      url.searchParams.append('contractAddresses[]', MANCER_CONTRACT_ADDRESS);
      url.searchParams.set('withMetadata', 'true');
      url.searchParams.set('pageSize', '100');
      if (pageKey) url.searchParams.set('pageKey', pageKey);

      const resp = await fetch(url.toString());
      if (!resp.ok) {
        console.warn('[Mancers] Alchemy NFT API unavailable', resp.status, '— falling back');
        return null; // NFT API not available here — fall back
      }
      const data: any = await resp.json();
      const nfts: any[] = Array.isArray(data?.ownedNfts) ? data.ownedNfts : [];
      for (const n of nfts) {
        const tokenId = n?.tokenId != null ? String(n.tokenId) : undefined;
        if (!tokenId) continue;
        const img = n?.image?.cachedUrl || n?.image?.originalUrl || n?.image?.pngUrl || n?.raw?.metadata?.image;
        out.push({ tokenId, name: n?.name || n?.raw?.metadata?.name, image: ipfsToHttp(img) });
        if (out.length >= max) break;
      }
      pageKey = data?.pageKey || undefined;
      if (!pageKey) break;
    }
    console.log('[Mancers] resolved via Alchemy NFT API:', out.length);
    return out;
  } catch (e) {
    console.warn('[Mancers] Alchemy NFT API error — falling back:', e);
    return null;
  }
}

/**
 * List the Mancer NFTs currently owned by an address. Resolution order, fastest
 * first: (1) Alchemy NFT API (one call, uses the existing RPC key); (2) the
 * backend OpenSea proxy (key stays server-side); (3) ERC-721 Enumerable; (4) a
 * log-free totalSupply + ownerOf scan; (5) a Transfer-log scan. Each path is
 * used only if it returns tokens, so nothing hides a token from a slower but
 * more complete path. Bounded to `max`.
 */
/**
 * Replace each Mancer's image with its authoritative per-token art from the
 * on-chain tokenURI metadata. NFT aggregators (Alchemy/OpenSea) often return a
 * collection-level image on a newly-indexed chain, so we always prefer the
 * token's own metadata.image and keep the aggregator image only as a fallback.
 */
async function enrichMancerImages(mancers: OwnedMancer[]): Promise<OwnedMancer[]> {
  if (!ROBINHOOD_RPC_URL || !MANCER_CONTRACT_ADDRESS || mancers.length === 0) return mancers;
  const provider = new ethers.JsonRpcProvider(ROBINHOOD_RPC_URL);
  const contract = new ethers.Contract(MANCER_CONTRACT_ADDRESS, MANCER_ABI, provider);
  await Promise.all(mancers.map(async (m) => {
    try {
      const uri = ipfsToHttp(await contract.tokenURI(m.tokenId));
      if (!uri) return;
      const meta = await fetch(uri).then((r) => (r.ok ? r.json() : null));
      if (meta?.image) m.image = ipfsToHttp(meta.image);
      if (meta?.name) m.name = meta.name;
      console.log('[Mancers] tokenURI image', m.tokenId, '->', m.image);
    } catch (e) { console.warn('[Mancers] tokenURI enrich failed for', m.tokenId, e); }
  }));
  return mancers;
}

async function fetchOwnedMancers(address: string, max = 48): Promise<OwnedMancer[]> {
  // 0a) Fastest: Alchemy NFT API (single call, images included, existing key).
  const viaAlchemy = await fetchViaAlchemyNft(address, max);
  if (viaAlchemy && viaAlchemy.length > 0) return enrichMancerImages(viaAlchemy);

  // 0b) Fast path: ask the backend's OpenSea proxy (key stays server-side). Use
  // it only when it is configured AND returns tokens; otherwise fall through to
  // on-chain enumeration so a missing key or indexing lag never hides tokens.
  try {
    const q = MANCER_CONTRACT_ADDRESS ? `?contract=${MANCER_CONTRACT_ADDRESS}` : '';
    const resp = await fetch(`${API_BASE}/mancers/${address}${q}`);
    if (resp.ok) {
      const data = await resp.json();
      if (data?.available && Array.isArray(data.mancers) && data.mancers.length > 0) {
        return enrichMancerImages(data.mancers.slice(0, max).map((m: any): OwnedMancer => ({
          tokenId: String(m.tokenId),
          name: m.name,
          image: ipfsToHttp(m.image),
        })));
      }
    }
  } catch { /* backend/OpenSea unavailable — fall back to on-chain */ }

  const provider = new ethers.JsonRpcProvider(ROBINHOOD_RPC_URL);
  const contract = new ethers.Contract(MANCER_CONTRACT_ADDRESS, MANCER_ABI, provider);

  // 1) Determine the owned token ids.
  let ids: string[] = [];
  const balance = Number(await contract.balanceOf(address).catch(() => 0n));
  try {
    // 1a) ERC-721 Enumerable (cheap and exact when supported).
    if (balance <= 0) throw new Error('empty');
    for (let i = 0; i < Math.min(balance, max); i++) {
      ids.push((await contract.tokenOfOwnerByIndex(address, i)).toString());
    }
  } catch {
    // 1b) Not enumerable (expected for ERC721-C). Prefer the log-free
    // totalSupply + ownerOf scan; it works where eth_getLogs is restricted.
    const scanned = await ownedByOwnerOfScan(contract, address, balance, max).catch(() => null);
    if (scanned && scanned.length > 0) {
      ids = scanned;
    } else {
      // 1c) Last resort: Transfer-log scan + ownerOf.
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
  const resp = await fetch(`${API_BASE}/auth/nonce`);
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
  const resp = await fetch(`${API_BASE}/auth/verify`, {
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
  const resp = await fetch(`${API_BASE}/ens/mint`, {
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
  fetch(`${API_BASE}/intent`, {
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
  const [mapConfigMode, setMapConfigMode] = useState(false);
  const [mapLayout, setMapLayout] = useState<MapItemPosition[]>(() => {
    applySavedMapLayout();
    return mapItems();
  });
  const [selectedMapItemId, setSelectedMapItemId] = useState<string | null>(null);

  // ----- Mission intake (ask the player what they want) -----
  const [intakeBuilding, setIntakeBuilding] = useState<BuildingDef | null>(null);
  const [intakeTarget, setIntakeTarget] = useState('');
  const [intakeDetails, setIntakeDetails] = useState('');

  // ----- Evidence artifact viewer (read a produced file in the Vault) -----
  const [artifactName, setArtifactName] = useState<string | null>(null);
  const [artifactContent, setArtifactContent] = useState<string | null>(null);
  const [bundleArtifacts, setBundleArtifacts] = useState<any[] | null>(null);
  const [evidenceBundle, setEvidenceBundle] = useState<any>(null);
  const [bundleLoading, setBundleLoading] = useState(false);
  const [bundleError, setBundleError] = useState<string | null>(null);

  // ----- Character (Mancer) selection -----
  const [mancers, setMancers] = useState<OwnedMancer[]>([]);
  const [mancersLoading, setMancersLoading] = useState(false);
  const [mancersError, setMancersError] = useState<string | null>(null);
  const [characterOpen, setCharacterOpen] = useState(false);
  const [selectedMancer, setSelectedMancer] = useState<OwnedMancer | null>(null);
  const [selectedLeaf, setSelectedLeaf] = useState<LeafCharacter>(LEAF_CHARACTERS[0]);
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
    const interiors = BUILDINGS.map(b => new InteriorScene({
      buildingKey: b.key,
      interiorImg: `${b.key}-inside.png`,
      title: b.name,
      leaveLabel: 'Leave (Esc)',
      // The Explorer's Guild action lives on the map spread across its table.
      // Other interiors use a central workstation until bespoke hotspots are
      // defined for their artwork.
      actions: b.key === 'cabin'
        ? [
            { x: 0.25, y: 0.59, radius: 78, label: 'use the table map', onAction: () => window.openIntake?.(b) },
            { x: 0.225, y: 0.22, radius: 68, label: 'read the Evidence Vault', onAction: () => window.openEvidenceVault?.() },
          ]
        : [{ x: 0.5, y: 0.48, radius: 72, label: `use ${b.name}`, onAction: () => window.openIntake?.(b) }],
    }));
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
    window.selectMapItem = setSelectedMapItemId;
    window.updateMapItem = updateMapItem;
    window.phaserGame = game;
    return () => {
      game.destroy(true);
      delete window.setQuestInProgress;
      delete window.setJobId;
      delete window.openIntake;
      delete window.selectMapItem;
      delete window.updateMapItem;
      delete window.phaserGame;
    };
  }, [characterVersion]);

  const updateMapItem = (id: string, rawX: number, rawY: number) => {
    const x = Phaser.Math.Clamp(Math.round(rawX), 0, WORLD_WIDTH);
    const y = Phaser.Math.Clamp(Math.round(rawY), 0, WORLD_HEIGHT);
    const item = mapItems().find(candidate => candidate.id === id);
    if (!item) return;
    const index = Number(id.split('-')[1]);
    const target = item.kind === 'building' ? BUILDINGS[index] : DECOR[index];
    target.x = x;
    target.y = y;
    const next = mapItems();
    setMapLayout(next);
    setSelectedMapItemId(id);
    localStorage.setItem(MAP_LAYOUT_STORAGE_KEY, JSON.stringify(Object.fromEntries(next.map(entry => [entry.id, { x: entry.x, y: entry.y }]))));
    (window.phaserGame?.scene.getScene('outside') as any)?.updateMapItemPosition?.(id, x, y);
  };

  const toggleMapConfigMode = () => {
    setMapConfigMode(enabled => {
      const next = !enabled;
      (window.phaserGame?.scene.getScene('outside') as any)?.setMapConfigMode?.(next);
      if (!next) setSelectedMapItemId(null);
      return next;
    });
  };

  const resetMapLayout = () => {
    DEFAULT_MAP_POSITIONS.forEach(item => updateMapItem(item.id, item.x, item.y));
    localStorage.removeItem(MAP_LAYOUT_STORAGE_KEY);
    setMapLayout(mapItems());
  };

  // Open the Evidence Vault, loading quest history from the backend so it shows
  // persisted quests (not just this session's).
  const openVault = () => {
    setVaultOpen(true);
    fetch(`${API_BASE}/jobs`, {
      headers: walletAddress ? { 'x-wallet-address': walletAddress } : {},
    })
      .then(r => (r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`)))
      .then((d: any) => {
        const ids = (d.jobs || []).filter((j: any) => j.status === 'completed').map((j: any) => j.jobId);
        setCompletedQuestIds(ids);
      })
      .catch(err => console.error('Failed to load quest history:', err));
  };

  useEffect(() => {
    window.openEvidenceVault = openVault;
    return () => { delete window.openEvidenceVault; };
  }, [walletAddress]);

  // Show an evidence artifact's content — read from the IPFS bundle (nothing
  // local). The bundle is fetched by CID when the quest is opened.
  const viewArtifact = (artifactPath: string) => {
    setArtifactName(artifactPath);
    if (!bundleArtifacts) {
      const evidence = questData?.evidence?.find((item: any) => item.ref === artifactPath);
      setArtifactContent([
        evidence?.summary || 'Evidence record available, but this job has no published file body.',
        '',
        `Reference: ${artifactPath}`,
        `Publication: ${questData?.docket?.publication_status || 'not published'}`,
        '',
        'Complete artifact contents become readable here after the evidence bundle is published to IPFS.',
      ].join('\n'));
      return;
    }
    const clean = (value: string) => decodeURIComponent(value || '').replace(/^\.\//, '').replace(/^\/+/, '');
    const wanted = clean(artifactPath);
    const exact = bundleArtifacts.find((item: any) => clean(item.path || item.name || item.ref) === wanted);
    const basename = wanted.split('/').pop();
    const candidates = bundleArtifacts.filter((item: any) => clean(item.path || item.name || item.ref).split('/').pop() === basename);
    const artifact = exact || (candidates.length === 1 ? candidates[0] : null);
    if (artifact) {
      const content = artifact.content ?? artifact.text ?? artifact.body ?? artifact.note;
      setArtifactContent(typeof content === 'string' ? content : JSON.stringify(artifact, null, 2));
      return;
    }
    const evidence = questData?.evidence?.find((item: any) => item.ref === artifactPath);
    setArtifactContent([
      evidence?.summary || 'This evidence item is recorded in the sealed docket.',
      '',
      `Reference: ${artifactPath}`,
      '',
      'This legacy IPFS bundle does not contain the file body. New evidence publications embed artifact contents and are readable here.',
    ].join('\n'));
  };

  const viewIpfsProof = () => {
    setArtifactName(`IPFS proof · ${questData?.docket?.ipfs_cid || ''}`);
    setArtifactContent(evidenceBundle
      ? JSON.stringify(evidenceBundle, null, 2)
      : bundleError || 'The IPFS proof is still loading.');
  };

  // Open the character card and load the wallet's Mancers.
  const openCharacterCard = () => {
    setCharacterOpen(true);
    if (!walletAddress || !mancerHolder) return;
    setMancersLoading(true);
    setMancersError(null);
    fetchOwnedMancers(walletAddress)
      .then(list => {
        setMancers(list);
        if (list.length === 0) setMancersError('No Mancers found for this wallet.');
      })
      .catch(err => {
        console.error('Failed to load Mancers:', err);
        setMancersError('Could not load your Mancers. Check VITE_MANCER_CONTRACT_ADDRESS / VITE_ROBINHOOD_RPC_URL. If the collection is large, raise VITE_MANCER_MAX_ID to cover higher token ids.');
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

  // Guests and connected wallets without a Mancer can play as any Leaf
  // colour. These sheets are bundled locally and share the same 3x4 layout.
  const chooseLeafCharacter = (character: LeafCharacter) => {
    setSelectedLeaf(character);
    setSelectedMancer(null);
    CHARACTER_SHEET = character.sheet;
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
        const resp = await fetch(`${API_BASE}/job/${jobId}/status`, {
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
    setEvidenceBundle(null);
    setBundleError(null);
    setBundleLoading(false);
    if (!selectedQuestId) {
      setQuestData(null);
      return;
    }
    setQuestLoading(true);
    fetch(`${API_BASE}/job/${selectedQuestId}/status`, {
      headers: walletAddress ? { 'x-wallet-address': walletAddress } : {},
    })
      .then(async resp => {
        if (!resp.ok) throw new Error('Failed to fetch quest');
        const data = await resp.json();
        setQuestData(data);
        // Pull the produced outputs from IPFS (content-addressed, nothing local).
        const cid = data?.docket?.ipfs_cid;
        if (cid) {
          setBundleLoading(true);
          const headers = walletAddress ? { 'x-wallet-address': walletAddress } : {};
          const urls = [
            `${API_BASE}/job/${selectedQuestId}/evidence-bundle`,
            `https://gateway.pinata.cloud/ipfs/${cid}`,
            `https://ipfs.io/ipfs/${cid}`,
            `https://${cid}.ipfs.dweb.link/`,
          ];
          (async () => {
            let lastError = 'No IPFS gateway returned the evidence bundle.';
            for (const url of urls) {
              try {
                const response = await fetch(url, { headers: url.startsWith('http://localhost') ? headers : {} });
                if (!response.ok) { lastError = `Gateway returned HTTP ${response.status}`; continue; }
                const bundle = await response.json();
                const artifacts = bundle?.artifacts ?? bundle?.bundle?.artifacts ?? bundle?.data?.artifacts ?? [];
                setEvidenceBundle(bundle);
                setBundleArtifacts(Array.isArray(artifacts) ? artifacts : []);
                setBundleError(null);
                return;
              } catch (error) {
                lastError = error instanceof Error ? error.message : String(error);
              }
            }
            setBundleArtifacts([]);
            setBundleError(`IPFS evidence could not be loaded: ${lastError}`);
          })().finally(() => setBundleLoading(false));
        } else {
          setBundleArtifacts(null);
          setBundleError('This job does not have a published IPFS evidence bundle.');
        }
      })
      .catch(err => {
        console.error('Error fetching quest:', err);
        setQuestData(null);
      })
      .finally(() => setQuestLoading(false));
  }, [selectedQuestId, walletAddress]);

  // ----- Wallet connection logic -----
  const connectWallet = async () => {
    setAuthenticating(true);
    // Phase 1 — connect the wallet. This is the only fatal phase: without an
    // address there is nothing to do. Getting the address must NOT depend on
    // the backend or on a signature.
    let address: string;
    let provider: ethers.BrowserProvider;
    try {
      provider = await getProvider();
      await window.ethereum?.request({ method: 'eth_requestAccounts' });
      const signer = await provider.getSigner();
      address = await signer.getAddress();
      setWalletAddress(address);
      setWalletConnected(true);
    } catch (err) {
      console.error('[Wallet] connect failed:', err);
      setWalletAddress(null);
      setWalletConnected(false);
      setAuthenticated(false);
      setMancerHolder(false);
      setAuthenticating(false);
      return;
    }

    // Phase 2 — Mancer ownership. Runs right after connect, on its own, so it
    // is never gated by the backend nonce or a signature popup. This is what
    // drives the character-selection card, so it must always run.
    try {
      setMancerCheckMsg('checking…');
      const res = await checkMancer(address);
      setMancerHolder(res.holder);
      setMancerCheckMsg(res.error ? `check failed: ${res.error}` : `balance: ${res.balance}`);
    } catch (err) {
      console.warn('[Wallet] Mancer check failed:', err);
      setMancerHolder(false);
      setMancerCheckMsg(`check failed: ${(err as any)?.message ?? String(err)}`);
    }

    // Phase 3 — optional signature auth (SIWE nonce → sign → verify). This
    // proves control of the address to the backend but is NOT required to play
    // or to select a character. A stalled backend, a declined popup, or a
    // verify failure leaves `authenticated=false` without tearing down the
    // wallet or the Mancer result.
    try {
      const nonce = await fetchNonce();
      const signature = await signMessage(provider, address, nonce);
      const valid = await verifySignature(address, signature);
      setAuthenticated(valid);
      if (!valid) console.warn('[Wallet] signature verification returned false (auth optional)');
    } catch (err) {
      console.warn('[Wallet] signature auth skipped/failed (optional):', err);
      setAuthenticated(false);
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
  const selectedMapItem = mapLayout.find(item => item.id === selectedMapItemId) ?? null;
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
          onClick={openCharacterCard}
          style={{ padding: '6px 12px', background: '#3a2b5c', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'sans-serif' }}
        >
          🧙 {selectedMancer ? `Mancer #${selectedMancer.tokenId}` : selectedLeaf.name}
        </button>
        <button
          onClick={toggleMapConfigMode}
          aria-pressed={mapConfigMode}
          style={{ padding: '6px 12px', background: mapConfigMode ? '#d97706' : '#3a2b5c', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'sans-serif' }}
        >
          {mapConfigMode ? '✓ Finish Map Editing' : '🗺 Edit Map'}
        </button>
        <button
          onClick={toggleMapConfigMode}
          aria-pressed={mapConfigMode}
          style={{ padding: '6px 12px', background: mapConfigMode ? '#d97706' : '#3a2b5c', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'sans-serif' }}
        >
          {mapConfigMode ? '✓ Finish Map Editing' : '🗺 Edit Map'}
        </button>
      </div>

      {/* ==== Main game canvas ==== */}
      <div style={{ width: '100%', maxWidth: 800, margin: '0 auto', position: 'relative' }}>
        <div id="game-container" style={{ width: '100%' }}></div>
        {mapConfigMode && (
          <aside style={{ position: 'absolute', top: 12, right: 12, width: 230, maxHeight: 500, overflowY: 'auto', padding: 12, borderRadius: 6, background: '#171026ee', color: '#fff', zIndex: 20, boxShadow: '0 4px 18px #0008', fontFamily: 'monospace' }}>
            <strong>Map config</strong>
            <p style={{ margin: '6px 0 10px', color: '#c4b5dd', fontSize: 11 }}>Drag an object, or select it here and enter exact coordinates. Changes save in this browser.</p>
            <select
              value={selectedMapItemId ?? ''}
              onChange={event => setSelectedMapItemId(event.target.value || null)}
              style={{ width: '100%', marginBottom: 10, padding: 5 }}
            >
              <option value="">Select an object…</option>
              <optgroup label="Buildings">
                {mapLayout.filter(item => item.kind === 'building').map(item => <option key={item.id} value={item.id}>{item.key} ({item.x}, {item.y})</option>)}
              </optgroup>
              <optgroup label="Decorations">
                {mapLayout.filter(item => item.kind === 'decor').map((item, index) => <option key={item.id} value={item.id}>{index + 1}. {item.key} ({item.x}, {item.y})</option>)}
              </optgroup>
            </select>
            {selectedMapItem && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <label style={{ fontSize: 12 }}>X (0–{WORLD_WIDTH})
                  <input type="number" min={0} max={WORLD_WIDTH} value={selectedMapItem.x} onChange={event => updateMapItem(selectedMapItem.id, Number(event.target.value), selectedMapItem.y)} style={{ boxSizing: 'border-box', width: '100%', marginTop: 3, padding: 5 }} />
                </label>
                <label style={{ fontSize: 12 }}>Y (0–{WORLD_HEIGHT})
                  <input type="number" min={0} max={WORLD_HEIGHT} value={selectedMapItem.y} onChange={event => updateMapItem(selectedMapItem.id, selectedMapItem.x, Number(event.target.value))} style={{ boxSizing: 'border-box', width: '100%', marginTop: 3, padding: 5 }} />
                </label>
              </div>
            )}
            <button onClick={resetMapLayout} style={{ width: '100%', marginTop: 12, padding: 5, background: '#4b374f', color: '#fff', border: '1px solid #80638a', borderRadius: 3, cursor: 'pointer' }}>Reset default layout</button>
          </aside>
        )}
      </div>

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
          className="zelda-overlay"
          onClick={() => setCharacterOpen(false)}
        >
          <div
            className="zelda-card"
            onClick={e => e.stopPropagation()}
          >
            <h2>Choose your character</h2>
            <p className="zelda-muted" style={{ fontSize: 13, marginTop: 0 }}>
              {walletAddress && mancerHolder
                ? 'Pick one of your Mancer NFTs. It becomes your in-game character.'
                : 'Choose a Leaf to begin your adventure. Connect a wallet that holds a Mancer to play as your NFT.'}
            </p>

            {!walletAddress || !mancerHolder ? (
              <div className="character-grid">
                {LEAF_CHARACTERS.map(character => {
                  const active = !selectedMancer && selectedLeaf.sheet === character.sheet;
                  return (
                    <button
                      key={character.sheet}
                      className={`zelda-choice${active ? ' zelda-choice--active' : ''}`}
                      onClick={() => chooseLeafCharacter(character)}
                    >
                      <div
                        className="character-preview"
                        role="img"
                        aria-label={character.name}
                        style={{ backgroundImage: `url(${character.sheet})` }}
                      />
                      <div style={{ fontSize: 12, marginTop: 6 }}>{character.name}</div>
                    </button>
                  );
                })}
              </div>
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
                      className={`zelda-choice${active ? ' zelda-choice--active' : ''}`}
                      onClick={() => chooseCharacter(m)}
                      style={{
                        textAlign: 'center',
                      }}
                    >
                      {m.image ? (
                        <img src={m.image} alt={m.name || m.tokenId} style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: 6, imageRendering: 'pixelated' }} />
                      ) : (
                        <div style={{ width: '100%', aspectRatio: '1 / 1', background: '#000', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#888' }}>no image</div>
                      )}
                      <div style={{ fontSize: 12, marginTop: 6 }}>{m.name || `Mancer #${m.tokenId}`}</div>
                      <div style={{ fontSize: 10 }}>#{m.tokenId}</div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="zelda-actions">
              <button className="zelda-button" onClick={() => setCharacterOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ==== Mission Intake (ask the player what they want) ==== */}
      {intakeBuilding && (
        <div
          className="zelda-overlay"
          onClick={() => setIntakeBuilding(null)}
        >
          <div
            className="zelda-card"
            onClick={e => e.stopPropagation()}
          >
            <h2>{intakeBuilding.name}</h2>
            <p className="zelda-muted" style={{ margin: '0 0 16px', fontSize: 13 }}>
              Capability: <code>{intakeBuilding.action}</code>
            </p>

            <label>Objective / target</label>
            <input
              className="zelda-input"
              type="text"
              value={intakeTarget}
              onChange={e => setIntakeTarget(e.target.value)}
              placeholder={intakeBuilding.target}
            />

            <label>What should be done?</label>
            <input
              className="zelda-input zelda-input--paper"
              type="text"
              value={intakeDetails}
              onChange={e => setIntakeDetails(e.target.value)}
              placeholder={intakeBuilding.details}
            />

            <div className="zelda-actions">
              <button className="zelda-button" onClick={() => setIntakeBuilding(null)}>Cancel</button>
              <button
                className="zelda-button zelda-button--primary"
                onClick={dispatchMission}
                disabled={!intakeTarget.trim()}
              >
                Dispatch Mission
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==== Vault Modal ==== */}
      {vaultOpen && (
        <div className="zelda-overlay" onClick={() => {
          setVaultOpen(false);
          setSelectedQuestId(null);
          setQuestData(null);
        }}>
          <div className="zelda-card" onClick={e => e.stopPropagation()}>
            {!selectedQuestId ? (
              <>
                <h2>Completed Quests</h2>
                {completedQuestIds.length === 0 ? (
                  <p>No completed quests yet.</p>
                ) : (
                  <ul className="zelda-list">
                    {completedQuestIds.map(id => (
                      <li key={id}>
                        <button onClick={() => {
                          setSelectedQuestId(id);
                        }} className="zelda-button" style={{ textAlign: 'left', width: '100%' }}>
                          Quest {id}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <button className="zelda-button" onClick={() => setVaultOpen(false)} style={{ marginTop: '16px' }}>
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
                        <pre className="zelda-pre" style={{ maxHeight: '220px' }}>{JSON.stringify(questData.docket, null, 2)}</pre>
                        {questData.docket.ipfs_cid && (
                          <div style={{ marginTop: '12px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                            <button className="zelda-button zelda-button--primary" onClick={viewIpfsProof} disabled={bundleLoading}>
                              {bundleLoading ? 'Loading IPFS proof…' : 'Read IPFS proof'}
                            </button>
                            <a href={`https://gateway.pinata.cloud/ipfs/${questData.docket.ipfs_cid}`} target="_blank" rel="noopener noreferrer" style={{ color: '#653486', fontWeight: 700 }}>
                              Open on gateway ↗
                            </a>
                          </div>
                        )}
                      </>
                    )}
                    {/* Evidence — the artifacts the mission produced */}
                    {questData.evidence && questData.evidence.length > 0 && (
                      <div style={{ marginTop: 16 }}>
                        <h4 style={{ marginBottom: 8 }}>Evidence ({questData.evidence.length})</h4>
                        {bundleError && <p className="zelda-muted" style={{ fontSize: 12 }}>{bundleError}</p>}
                        <ul className="zelda-list">
                          {questData.evidence.map((e: any, i: number) => (
                            <li key={i} style={{ fontSize: 13 }}>
                              <span className="zelda-muted">[{e.type}]</span> {e.summary}
                              {e.ref && String(e.ref).startsWith('output/') && (
                                <button
                                  onClick={() => viewArtifact(e.ref)}
                                  className="zelda-button"
                                  style={{ marginLeft: 8, fontSize: 12, padding: '2px 8px' }}
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
                              <button className="zelda-button" onClick={() => { setArtifactName(null); setArtifactContent(null); }} style={{ fontSize: 11, padding: '2px 8px' }}>close</button>
                            </div>
                            <pre className="zelda-pre" style={{ maxHeight: 200, fontSize: 12, whiteSpace: 'pre-wrap' }}>{artifactContent}</pre>
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
                            className="zelda-input"
                            type="text"
                            value={ensLabel}
                            onChange={e => setEnsLabel(e.target.value)}
                            placeholder="yourlabel"
                            style={{ flex: 1, fontSize: '14px' }}
                            disabled={ensMinting}
                          />
                          <button
                            className="zelda-button zelda-button--primary"
                            onClick={handleEnsMint}
                            disabled={!ensLabel.trim() || ensMinting}
                            style={{ fontSize: '14px' }}
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
                      className="zelda-button"
                      onClick={() => {
                        setSelectedQuestId(null);
                        setQuestData(null);
                      }}
                      style={{ marginTop: '16px' }}
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
