// packages/game-client/src/main.tsx
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Game } from 'phaser';
import { QuestOverlay } from './QuestOverlay';
import { InteriorScene } from './InteriorScene';

/* --------------------------------------------------------------
   Constants & building definitions
   -------------------------------------------------------------- */
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
  { key: 'greenhouse', name: 'Nova Garden', x: 700, y: 200, action: 'CAPABILITY_DISCOVERY', target: 'Cross-chain auditing', details: 'Seed a new capability where existing ones fall short' },
];

/* --------------------------------------------------------------
   Decoration placement (no Tiled needed — placed directly in code).
   `solid: true` means Leaf collides with it. Others are walk-through.
   x,y is the base of the object (origin bottom-center); depth = y.
   -------------------------------------------------------------- */
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

/* --------------------------------------------------------------
   Outside Scene
   -------------------------------------------------------------- */
const outsideScene = { key: 'outside', preload, create, update };

function preload(this: Phaser.Scene) {
  this.load.image('grassfloor', '/assets/grass2.png');
  BUILDINGS.forEach(b => this.load.image(b.key, `/assets/${b.key}.png`));
  DECOR_KEYS.forEach(k => this.load.image(k, `/assets/${k}.png`));
  this.load.spritesheet('leaf', '/assets/leaf.png', { frameWidth: LEAF_FRAME, frameHeight: LEAF_FRAME });
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
  sendIntent(b);
  scene.scene.pause('outside');
  scene.scene.launch(`Interior-${b.key}`);
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

/* --------------------------------------------------------------
   Helper – send intent to backend
   -------------------------------------------------------------- */
function sendIntent(b: BuildingDef) {
  fetch('http://localhost:3001/intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: b.action, target: b.target, details: b.details }),
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
   React wrapper – creates the Phaser game
   -------------------------------------------------------------- */
export default function App() {
  const [questInProgress, setQuestInProgress] = useState(false);
  const [questCompleted, setQuestCompleted] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [resultData, setResultData] = useState<any>(null);

  useEffect(() => {
    // One interior scene per building (registers Interior-<key>)
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
    return () => {
      game.destroy(true);
      delete window.setQuestInProgress;
      delete window.setJobId;
    };
  }, []);

  useEffect(() => {
    if (!jobId) return;
    const interval = setInterval(async () => {
      try {
        const resp = await fetch(`http://localhost:3001/job/${jobId}/status`);
        if (!resp.ok) return;
        const data = await resp.json();
        if (data.status === 'completed') {
          clearInterval(interval);
          setQuestInProgress(false);
          setQuestCompleted(true);
          setResultData(data.result);
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

  return (
    <div style={{ padding: '1rem', fontFamily: 'sans-serif' }}>
      <div id="game-container" style={{ width: '100%', maxWidth: 800, margin: '0 auto' }}></div>
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
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
