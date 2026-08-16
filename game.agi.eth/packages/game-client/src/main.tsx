import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Game, Types } from 'phaser';
import { QuestOverlay } from './QuestOverlay';

const WORLD_WIDTH = 800;
const WORLD_HEIGHT = 600;
const LEAF_FRAME = 64;
const LEAF_SPEED = 150;
const ENTER_RADIUS = 70; // how close Leaf must be to enter a building

// Each building sends its own intent to the backend (POST /intent expects
// { action, target, details } — all strings — and returns { jobId }).
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
  {
    key: 'cabin',
    name: "Explorer's Guild",
    x: 150, y: 210,
    action: 'ECOSYSTEM_RESEARCH',
    target: 'Robinhood Chain',
    details: 'Find 10 projects with demonstrated real utility'
  },
  {
    key: 'workshop',
    name: 'The Forge',
    x: 350, y: 210,
    action: 'BUILD_AGENT',
    target: 'AGI Alpha Agent',
    details: 'Forge a new agent from a job spec'
  },
  {
    key: 'watchtower',
    name: 'Auditor Tower',
    x: 550, y: 210,
    action: 'AUDIT',
    target: 'Active Jobs',
    details: 'Audit and validate recently completed jobs'
  },
  {
    key: 'greenhouse',
    name: 'Nova Garden',
    x: 700, y: 210,
    action: 'CULTIVATE',
    target: 'Ecosystem',
    details: 'Nurture and stake into promising projects'
  }
];

const config: Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#1e1230',
  pixelArt: true, // keep crisp pixels, no smoothing when scaled
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false }
  },
  scene: { preload, create, update }
};

function preload(this: Phaser.Scene) {
  this.load.image('grass', '/assets/grass.png');
  BUILDINGS.forEach(b => this.load.image(b.key, `/assets/${b.key}.png`));
  this.load.spritesheet('leaf', '/assets/leaf.png', {
    frameWidth: LEAF_FRAME,
    frameHeight: LEAF_FRAME
  });
}

function sendIntent(b: BuildingDef) {
  fetch('http://localhost:3001/intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: b.action, target: b.target, details: b.details })
  })
    .then(async response => {
      if (response.ok) {
        const data = await response.json();
        console.log('Intent sent successfully', data);
        if (window.setQuestInProgress) window.setQuestInProgress(true);
        if (window.setJobId && data.jobId) window.setJobId(data.jobId);
      } else {
        console.error('Failed to send intent', response.status);
      }
    })
    .catch(error => console.error('Error sending intent:', error));
}

function create(this: Phaser.Scene) {
  const scene = this as any;
  this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  // Repeating grass floor
  this.add.tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, 'grass').setOrigin(0, 0);

  // Buildings as solid sprites Leaf can walk up to (but not through)
  const buildingGroup = this.physics.add.staticGroup();
  const buildingSprites: { def: BuildingDef; sprite: Phaser.GameObjects.Image }[] = [];
  BUILDINGS.forEach(b => {
    const sprite = buildingGroup.create(b.x, b.y, b.key) as Phaser.Physics.Arcade.Sprite;
    // Scale down the 192px art, then refresh the static body to match the new size
    sprite.setScale(0.55).refreshBody();
    sprite.setInteractive({ useHandCursor: true });
    sprite.on('pointerdown', () => sendIntent(b));

    // Building name label
    this.add.text(b.x, b.y - sprite.displayHeight / 2 - 10, b.name, {
      fontFamily: 'monospace', fontSize: '12px', color: '#ffffff',
      backgroundColor: '#00000080', padding: { x: 4, y: 2 }
    }).setOrigin(0.5);

    buildingSprites.push({ def: b, sprite });
  });
  scene.buildingSprites = buildingSprites;

  // Leaf
  const leaf = this.physics.add.sprite(WORLD_WIDTH / 2, 460, 'leaf');
  leaf.setCollideWorldBounds(true);
  const leafBody = leaf.body as Phaser.Physics.Arcade.Body;
  leafBody.setSize(LEAF_FRAME * 0.4, LEAF_FRAME * 0.35);
  leafBody.setOffset(LEAF_FRAME * 0.3, LEAF_FRAME * 0.55);
  scene.leaf = leaf;

  this.physics.add.collider(leaf, buildingGroup);

  // Walk animations — one row per direction in the 3x4 sheet
  const mk = (key: string, start: number, end: number) =>
    this.anims.create({
      key,
      frames: this.anims.generateFrameNumbers('leaf', { start, end }),
      frameRate: 6,
      repeat: -1
    });
  mk('walk-down', 0, 2);
  mk('walk-up', 3, 5);
  mk('walk-left', 6, 8);
  mk('walk-right', 9, 11);
  leaf.setFrame(1); // idle facing down
  scene.lastDir = 'down';

  // Input
  const keyboard = this.input.keyboard!;
  scene.cursors = keyboard.createCursorKeys();
  scene.spaceKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

  // Proximity prompt
  scene.prompt = this.add.text(WORLD_WIDTH / 2, WORLD_HEIGHT - 24, '', {
    fontFamily: 'monospace', fontSize: '14px', color: '#ffff88',
    backgroundColor: '#000000aa', padding: { x: 6, y: 3 }
  }).setOrigin(0.5).setDepth(100);
}

function update(this: Phaser.Scene) {
  const scene = this as any;
  const leaf = scene.leaf as Phaser.Physics.Arcade.Sprite;
  if (!leaf) return;
  const cursors = scene.cursors as Phaser.Types.Input.Keyboard.CursorKeys;

  let vx = 0;
  let vy = 0;
  if (cursors.left?.isDown) vx = -LEAF_SPEED;
  else if (cursors.right?.isDown) vx = LEAF_SPEED;
  if (cursors.up?.isDown) vy = -LEAF_SPEED;
  else if (cursors.down?.isDown) vy = LEAF_SPEED;
  leaf.setVelocity(vx, vy);

  // Animate based on dominant direction
  if (vx !== 0 || vy !== 0) {
    if (Math.abs(vx) > Math.abs(vy)) {
      scene.lastDir = vx < 0 ? 'left' : 'right';
    } else {
      scene.lastDir = vy < 0 ? 'up' : 'down';
    }
    leaf.anims.play(`walk-${scene.lastDir}`, true);
  } else {
    leaf.anims.stop();
    const idleFrame: Record<string, number> = { down: 1, up: 4, left: 7, right: 10 };
    leaf.setFrame(idleFrame[scene.lastDir] ?? 1);
  }

  // Find nearest enterable building
  let near: BuildingDef | null = null;
  let nearestDist = ENTER_RADIUS;
  for (const { def } of scene.buildingSprites) {
    const d = Phaser.Math.Distance.Between(leaf.x, leaf.y, def.x, def.y);
    if (d < nearestDist) {
      nearestDist = d;
      near = def;
    }
  }
  if (near) {
    scene.prompt.setText(`Press SPACE to enter ${near.name}`);
    if (Phaser.Input.Keyboard.JustDown(scene.spaceKey)) {
      sendIntent(near);
    }
  } else {
    scene.prompt.setText('');
  }
}

export default function App() {
  const [questInProgress, setQuestInProgress] = useState(false);
  const [questCompleted, setQuestCompleted] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [resultData, setResultData] = useState<any>(null);

  useEffect(() => {
    const game = new Game({ ...config });
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
