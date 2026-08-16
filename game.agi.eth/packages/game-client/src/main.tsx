// packages/game-client/src/main.tsx
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Game, Types } from 'phaser';
import { QuestOverlay } from './QuestOverlay';
import { InteriorScene } from './InteriorScene';

/* --------------------------------------------------------------
   1️⃣  Constants & building definitions (unchanged)
   -------------------------------------------------------------- */
const WORLD_WIDTH = 800;
const WORLD_HEIGHT = 600;
const LEAF_FRAME = 64;
const LEAF_SPEED = 150;
const ENTER_RADIUS = 70; // distance at which the SPACE prompt appears

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
    x: 150,
    y: 210,
    action: 'ECOSYSTEM_RESEARCH',
    target: 'Robinhood Chain',
    details: 'Find 10 projects with demonstrated real utility',
  },
  {
    key: 'workshop',
    name: 'The Forge',
    x: 350,
    y: 210,
    action: 'BUILD_AGENT',
    target: 'AGI Alpha Agent',
    details: 'Forge a new agent from a job spec',
  },
  {
    key: 'watchtower',
    name: 'Auditor Tower',
    x: 550,
    y: 210,
    action: 'AUDIT',
    target: 'Active Jobs',
    details: 'Audit and validate recently completed jobs',
  },
  {
    key: 'greenhouse',
    name: 'Nova Garden',
    x: 700,
    y: 210,
    action: 'CULTIVATE',
    target: 'Ecosystem',
    details: 'Nurture and stake into promising projects',
  },
];

/* --------------------------------------------------------------
   2️⃣  Outside Scene – loads the tilemap & renders layers
   -------------------------------------------------------------- */
const outsideScene: Types.Core.SceneConfig = {
  key: 'outside',
  preload,
  create,
  update,
};

/* --------------------------------------------------------------
   3️⃣  Preload – tileset, tilemap, leaf, building sprites
   -------------------------------------------------------------- */
function preload(this: Phaser.Scene) {
  // Existing loose assets (keep if you still want them)
  this.load.image('grass', '/assets/grass.png');
  BUILDINGS.forEach(b => this.load.image(b.key, `/assets/${b.key}.png`));
  this.load.spritesheet('leaf', '/assets/leaf.png', {
    frameWidth: LEAF_FRAME,
    frameHeight: LEAF_FRAME,
  });

  // ----- NEW: tileset + tilemap -----
  // Adjust if you stored the tileset elsewhere
  this.load.image('world_tileset', '/assets/tilesets/world_tileset.png');
  // The map lives in the public folder and is served at /world.json
  this.load.tilemapTiledJSON('worldmap', '/world.json');
}

/* --------------------------------------------------------------
   4️⃣  Create – build the map, add collisions, keep building sprites
   -------------------------------------------------------------- */
function create(this: Phaser.Scene) {
  const scene = this as any;

  // ----- 4.1 Tilemap -----
  const map: Types.Tilemap.Tilemap = this.make.tilemap({ key: 'worldmap' });
  const tileset: Types.Tilemap.Tileset = map.addTilesetImage(
    'world_tileset',
    'world_tileset'
  );

  // Visual layers (order matters – later layers draw on top)
  const groundLayer = map.createLayer('Ground', tileset, 0, 0);
  const decoLayer = map.createLayer('Decoration', tileset, 0, 0);
  const elevLayer = map.createLayer('Elevation', tileset, 0, 0);
  const entrLayer = map.createLayer('Entrances', tileset, 0, 0);

  // ----- 4.2 Collision from the "Collisions" object layer -----
  const collObjects = map.getObjectLayer('Collisions')?.objects ?? [];
  collObjects.forEach((obj: any) => {
    // Phaser expects the rectangle’s centre point
    const rect = this.physics.add.staticRectangle(
      obj.x + obj.width / 2,
      obj.y + obj.height / 2,
      obj.width,
      obj.height
    );
    // Make the leaf collide with this static body
    this.physics.add.collider((scene as any).leaf, rect);
  });

  // ----- 4.3 Building sprites (quest triggers) -----
  const buildingGroup = this.physics.add.staticGroup();
  const buildingSprites: {
    def: BuildingDef;
    sprite: Phaser.GameObjects.Image;
  }[] = [];

  BUILDINGS.forEach(b => {
    const sprite = buildingGroup.create(b.x, b.y, b.key) as Phaser.Physics.Arcade.Sprite;
    sprite.setScale(0.55).refreshBody();
    sprite.setInteractive({ useHandCursor: true });
    sprite.on('pointerdown', () => sendIntent(b));

    // Building name label (unchanged styling)
    this.add.text(
      b.x,
      b.y - sprite.displayHeight / 2 - 10,
      b.name,
      {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#ffffff',
        backgroundColor: '#00000080',
        padding: { x: 4, y: 2 },
      }
    ).setOrigin(0.5);

    buildingSprites.push({ def: b, sprite });
  });
  scene.buildingSprites = buildingSprites;

  // ----- 4.4 Leaf (player) -----
  const leaf = this.physics.add.sprite(WORLD_WIDTH / 2, 460, 'leaf');
  leaf.setCollideWorldBounds(true);
  const leafBody = leaf.body as Phaser.Physics.Arcade.Body;
  leafBody.setSize(LEAF_FRAME * 0.4, LEAF_FRAME * 0.35);
  leafBody.setOffset(LEAF_FRAME * 0.3, LEAF_FRAME * 0.55);
  scene.leaf = leaf;

  // Ensure leaf also collides with the building sprites (so they block each other)
  this.physics.add.collider(leaf, buildingGroup);

  // ----- 4.5 Animations -----
  const mk = (key: string, start: number, end: number) =>
    this.anims.create({
      key,
      frames: this.anims.generateFrameNumbers('leaf', { start, end }),
      frameRate: 6,
      repeat: -1,
    });
  mk('walk-down', 0, 2);
  mk('walk-up', 3, 5);
  mk('walk-left', 6, 8);
  mk('walk-right', 9, 11);
  leaf.setFrame(1); // idle facing down
  scene.lastDir = 'down';

  // ----- 4.6 Input -----
  const keyboard = this.input.keyboard!;
  scene.cursors = keyboard.createCursorKeys();
  scene.spaceKey = keyboard.addKey(
    Phaser.Input.Keyboard.KeyCodes.SPACE
  );

  // ----- 4.7 Proximity prompt -----
  scene.prompt = this.add
    .text(WORLD_WIDTH / 2, WORLD_HEIGHT - 24, '', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#ffff88',
      backgroundColor: '#000000aa',
      padding: { x: 6, y: 3 },
    })
    .setOrigin(0.5)
    .setDepth(100);
}

/* --------------------------------------------------------------
   5️⃣  Update – movement, animation, SPACE to enter building
   -------------------------------------------------------------- */
function update(this: Phaser.Scene) {
  const scene = this as any;
  const leaf = scene.leaf as Phaser.Physics.Arcade.Sprite;
  if (!leaf) return;

  const cursors = scene.cursors as Phaser.Types.Input.Keyboard.CursorKeys;

  // ---- Movement ----
  let vx = 0;
  let vy = 0;
  if (cursors.left?.isDown) vx = -LEAF_SPEED;
  else if (cursors.right?.isDown) vx = LEAF_SPEED;
  if (cursors.up?.isDown) vy = -LEAF_SPEED;
  else if (cursors.down?.isDown) vy = LEAF_SPEED;
  leaf.setVelocity(vx, vy);

  // ---- Animation ----
  if (vx !== 0 || vy !== 0) {
    if (Math.abs(vx) > Math.abs(vy)) {
      scene.lastDir = vx < 0 ? 'left' : 'right';
    } else {
      scene.lastDir = vy < 0 ? 'up' : 'down';
    }
    leaf.anims.play(`walk-${scene.lastDir}`, true);
  } else {
    leaf.anims.stop();
    const idleFrame: Record<string, number> = {
      down: 1,
      up: 4,
      left: 7,
      right: 10,
    };
    leaf.setFrame(idleFrame[scene.lastDir] ?? 1);
  }

  // ---- Proximity prompt & SPACE to enter ----
  let near: BuildingDef | null = null;
  let nearestDist = ENTER_RADIUS;
  for (const { def } of scene.buildingSprites) {
    const d = Phaser.Math.Distance.Between(
      leaf.x,
      leaf.y,
      def.x,
      def.y
    );
    if (d < nearestDist) {
      nearestDist = d;
      near = def;
    }
  }

  if (near) {
    scene.prompt.setText(`Press SPACE to enter ${near.name}`);
    if (Phaser.Input.Keyboard.JustDown(scene.spaceKey)) {
      // Optional: still log a quest to the backend
      sendIntent(near);

      // Pause the outside map and launch the interior scene
      scene.scene.pause('outside');
      scene.scene.launch(`Interior-${near.key}`);
    }
  } else {
    scene.prompt.setText('');
  }
}

/* --------------------------------------------------------------
   6️⃣  Helper – send intent to backend (unchanged)
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
        console.log('Intent sent successfully', data);
        if (window.setQuestInProgress) window.setQuestInProgress(true);
        if (window.setJobId && data.jobId) window.setJobId(data.jobId);
      } else {
        console.error('Failed to send intent', res.status);
      }
    })
    .catch(err => console.error('Error sending intent:', err));
}

/* --------------------------------------------------------------
   7️⃣  React wrapper – creates the Phaser game
   -------------------------------------------------------------- */
export default function App() {
  const [questInProgress, setQuestInProgress] = useState(false);
  const [questCompleted, setQuestCompleted] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [resultData, setResultData] = useState<any>(null);

  useEffect(() => {
    const game = new Game({ scene: [outsideScene] });
    // Expose setters to the Phaser scene via window (as before)
    window.setQuestInProgress = setQuestInProgress;
    window.setJobId = setJobId;
    return () => {
      game.destroy(true);
      delete window.setQuestInProgress;
      delete window.setJobId;
    };
  }, []);

  // Poll job status (unchanged)
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
      <div
        id="game-container"
        style={{ width: '100%', maxWidth: 800, margin: '0 auto' }}
      ></div>
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

/* --------------------------------------------------------------
   8️⃣  Mount the React app
   -------------------------------------------------------------- */
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);