import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Game, Types } from 'phaser';
import { QuestOverlay } from './QuestOverlay';

const TILE_SIZE = 16;
const GUILD_TILE_ID = 5; // Explorer's Guild tile ID in Buildings layer
const FORGE_TILE_ID = 6;
const AUDITOR_TOWER_TILE_ID = 7;
const NOVA_GARDEN_TILE_ID = 8;

const config: Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 800,
    height: 600
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};

function preload(this: Phaser.Scene) {
  // Load tileset image (assumes 16x16 tiles)
  this.load.image('tileset', '/assets/tileset.png');
  // Load tilemap JSON
  this.load.tilemapTiledJSON('world', '/assets/world.json');
  // Load leaf sprite sheet (assume 32x32 frames)
  this.load.spritesheet('leaf', '/assets/leaf.png', { frameWidth: 32, frameHeight: 32 });
}

function create(this: Phaser.Scene) {
  // Create map
  const map = this.make.tilemap({ key: 'world' });
  const tileset = map.addTilesetImage('tileset', 'tileset');

  // Create layers
  const groundLayer = map.createLayer('Ground', tileset, 0, 0);
  const buildingsLayer = map.createLayer('Buildings', tileset, 0, 0);
  // Store reference for later use
  (this as any).buildingsLayer = buildingsLayer;

  // Enable collision on building tiles (everything except 0 and -1)
  buildingsLayer.setCollisionByExclusion([-1, 0]);

  // Spawn Leaf NPC in front of the Explorer's Guild
  // Guild tile at (5,5) in tile coordinates
  const guildTileX = 5;
  const guildTileY = 5;
  // Spawn one tile south (below) the guild
  const spawnX = guildTileX * TILE_SIZE;
  const spawnY = (guildTileY + 1) * TILE_SIZE;

  const leaf = this.physics.add.sprite(spawnX, spawnY, 'leaf');
  // Adjust size if needed
  leaf.setDisplaySize(32, 32);
  leaf.setCollideWorldBounds(true);
  // Store reference for update
  (this as any).leaf = leaf;

  // Create idle animation (assuming sprite sheet has at least one frame)
  this.anims.create({
    key: 'idle',
    frames: this.anims.generateFrameNumbers('leaf', { start: 0, end: 0 }),
    frameRate: 1,
    repeat: -1
  });
  leaf.play('idle');

  // Add collider between leaf and buildings layer
  this.physics.add.collider(leaf, buildingsLayer);

  // Input listener for clicking on buildings
  this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tileX = Math.floor(worldPoint.x / TILE_SIZE);
    const tileY = Math.floor(worldPoint.y / TILE_SIZE);
    const tileInfo = buildingsLayer.getTileAt(tileX, tileY, false);
    if (tileInfo && tileInfo.index === GUILD_TILE_ID) {
      // Send intent to backend
      (this as any).sendIntent('ECOSYSTEM_RESEARCH', 'Robinhood Chain', 'Find 10 projects with demonstrated real utility');
    }
  });
}

// Method to send intent to backend
function sendIntent(this: Phaser.Scene, action: string, target: string, details: string) {
  const intent = {
    action,
    target,
    details
  };
  fetch('http://localhost:3001/intent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(intent)
  })
  .then(async response => {
    if (response.ok) {
      const data = await response.json();
      console.log('Intent sent successfully', data);
      // Set quest state via global setters
      if (window.setQuestInProgress) {
        window.setQuestInProgress(true);
      }
      if (window.setJobId && data.jobId) {
        window.setJobId(data.jobId);
      }
      // TODO: Show quest UI overlay (handled by React state)
    } else {
      console.error('Failed to send intent', response.status);
    }
  })
  .catch(error => {
    console.error('Error sending intent:', error);
  });
}

function update(this: Phaser.Scene, time: number, delta: number) {
  // Handle leaf movement with arrow keys
  const leaf = (this as any).leaf;
  if (!leaf) return;

  const speed = 80;
  const cursors = this.input.keyboard.createCursorKeys();

  if (cursors.left?.isDown) {
    leaf.setVelocityX(-speed);
  } else if (cursors.right?.isDown) {
    leaf.setVelocityX(speed);
  } else {
    leaf.setVelocityX(0);
  }

  if (cursors.up?.isDown) {
    leaf.setVelocityY(-speed);
  } else if (cursors.down?.isDown) {
    leaf.setVelocityY(speed);
  } else {
    leaf.setVelocityY(0);
  }
}

// Initialize Phaser game when component mounts
export default function App() {
  const [questInProgress, setQuestInProgress] = useState(false);
  const [questCompleted, setQuestCompleted] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [resultData, setResultData] = useState<any>(null);

  useEffect(() => {
    // Expose setters to Phaser scene via window
    window.setQuestInProgress = setQuestInProgress;
    window.setJobId = setJobId;
    return () => {
      // Clean up
      delete window.setQuestInProgress;
      delete window.setJobId;
    };
  }, [setQuestInProgress, setJobId]);

  // Poll job status when we have a jobId
  useEffect(() => {
    if (!jobId) return;
    const interval = setInterval(async () => {
      try {
        const resp = await fetch(`http://localhost:3001/job/${jobId}/status`);
        if (!resp.ok) {
          console.warn('Failed to fetch job status', resp.status);
          return;
        }
        const data = await resp.json();
        if (data.status === 'completed') {
          clearInterval(interval);
          setQuestInProgress(false);
          setQuestCompleted(true);
          setResultData(data.result);
        } else if (data.status === 'failed') {
          clearInterval(interval);
          setQuestInProgress(false);
          // Optionally set error state
          console.error('Job failed', data);
        }
        // If still pending, continue polling
      } catch (e) {
        console.error('Polling error', e);
      }
    }, 3000); // poll every 3 seconds
    return () => clearInterval(interval);
  }, [jobId]);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <div id="game-container" style={{ width: '100%', height: 'calc(100vh - 4rem)' }}></div>
      <QuestOverlay 
        questInProgress={questInProgress} 
        questCompleted={questCompleted} 
        resultData={resultData} 
        onClose={() => {
          // Reset state when closing
          setQuestInProgress(false);
          setQuestCompleted(false);
          setJobId(null);
          setResultData(null);
          // Also clear global vars
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