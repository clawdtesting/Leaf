// packages/game-client/src/InteriorScene.tsx
import { Scene, GameObjects, Physics, Types, Input } from 'phaser';

interface InteriorSceneProps {
  /** The building key (must match one of the BUILDINGS entries) */
  buildingKey: string;
  /** Filename of the interior image (without path) */
  interiorImg: string;
  /** Human-readable building name shown as a title */
  title?: string;
  /** Optional text to show on the “Leave” button */
  leaveLabel?: string;
  /** Interactive objects, positioned as fractions of the room image. */
  actions?: Array<{ x: number; y: number; radius?: number; label: string; onAction: () => void }>;
}

const LEAF_FRAME = 64;
const LEAF_SPEED = 140;

/**
 * Interior of a building. Shows the room image, spawns a controllable Leaf that
 * walks around inside the walls, and provides a place to add per-building
 * actions later (see the ACTIONS hook in create()).
 */
export class InteriorScene extends Scene {
  private props: InteriorSceneProps;
  private interior!: GameObjects.Image;
  private leaf!: Physics.Arcade.Sprite;
  private cursors!: Types.Input.Keyboard.CursorKeys;
  private actionKey?: Input.Keyboard.Key;
  private actionPrompt?: GameObjects.Text;
  private actionPositions: Array<{ x: number; y: number; radius: number; label: string; onAction: () => void }> = [];
  private lastDir: 'down' | 'up' | 'left' | 'right' = 'down';

  constructor(props: InteriorSceneProps) {
    super({ key: `Interior-${props.buildingKey}` });
    this.props = props;
  }

  preload() {
    // Interior room image
    if (!this.textures.exists(this.props.interiorImg)) {
      this.load.image(this.props.interiorImg, `/assets/${this.props.interiorImg}`);
    }
    // Leaf spritesheet (normally already loaded by the outside scene)
    if (!this.textures.exists('leaf')) {
      this.load.spritesheet('leaf', '/assets/leaf.png', {
        frameWidth: LEAF_FRAME,
        frameHeight: LEAF_FRAME,
      });
    }
  }

  create() {
    const { width, height } = this.scale;

    // Opaque background so the paused outside scene doesn't show through
    this.cameras.main.setBackgroundColor('#140d07');

    // ----- Room image, centered and scaled to fit -----
    this.interior = this.add.image(width / 2, height / 2, this.props.interiorImg);
    const scale = Math.min(width / this.interior.width, height / this.interior.height) * 0.9;
    this.interior.setScale(scale).setDepth(0);

    // Walkable floor = the room rectangle, inset so Leaf stays "inside the walls"
    const roomW = this.interior.displayWidth;
    const roomH = this.interior.displayHeight;
    const left = width / 2 - roomW / 2;
    const top = height / 2 - roomH / 2;
    const wall = Math.min(roomW, roomH) * 0.12; // wall thickness
    const floor = {
      x: left + wall,
      y: top + wall,
      w: roomW - wall * 2,
      h: roomH - wall * 2,
    };
    this.physics.world.setBounds(floor.x, floor.y, floor.w, floor.h);

    // ----- Leaf (controllable), spawned near the bottom-center (the door) -----
    this.ensureAnims();
    this.leaf = this.physics.add.sprite(width / 2, floor.y + floor.h - 20, 'leaf');
    this.leaf.setScale(0.9).setDepth(10);
    this.leaf.setCollideWorldBounds(true);
    const body = this.leaf.body as Physics.Arcade.Body;
    body.setSize(LEAF_FRAME * 0.4, LEAF_FRAME * 0.35);
    body.setOffset(LEAF_FRAME * 0.3, LEAF_FRAME * 0.55);
    this.leaf.setFrame(4); // facing up, into the room
    this.lastDir = 'up';

    this.cursors = this.input.keyboard!.createCursorKeys();

    // ----- Building action hotspots -----
    // Entering a room never opens an action automatically. Players walk up and
    // press SPACE, or click the object directly (for example, the Guild table
    // map opens mission intake and the books open the Evidence Vault).
    if (this.props.actions?.length) {
      this.actionKey = this.input.keyboard!.addKey(Input.Keyboard.KeyCodes.SPACE);
      this.props.actions.forEach(action => {
        const x = left + roomW * action.x;
        const y = top + roomH * action.y;
        const radius = action.radius ?? 72;
        this.actionPositions.push({ x, y, radius, label: action.label, onAction: action.onAction });
        this.add.zone(x, y, radius * 2, radius * 1.25)
          .setInteractive({ useHandCursor: true })
          .on('pointerdown', action.onAction);
      });

      this.actionPrompt = this.add.text(width / 2, height - 70, '', {
        fontFamily: 'monospace', fontSize: '14px', color: '#ffff88',
        backgroundColor: '#000000cc', padding: { x: 8, y: 4 },
      }).setOrigin(0.5).setDepth(100);
    }

    // ----- Title -----
    this.add
      .text(width / 2, top + wall * 0.4, this.props.title ?? this.props.buildingKey, {
        fontFamily: 'monospace', fontSize: '16px', color: '#ffe9a8',
        backgroundColor: '#00000088', padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(100);

    // ----- Leave button + ESC -----
    this.add
      .text(width / 2, height - 28, this.props.leaveLabel ?? 'Leave (Esc)', {
        fontFamily: 'monospace', fontSize: '18px', color: '#ff0',
        backgroundColor: '#0008', padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(100)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.leave());
    this.input.keyboard?.once('keydown-ESC', () => this.leave());

    // ----- Per-building ACTIONS hook -----
    // Future: add interaction spots (quest board, forge anvil, etc.) here,
    // keyed off this.props.buildingKey. e.g. an overlap zone that opens a menu.
    // this.setupActions(this.props.buildingKey);
  }

  private ensureAnims() {
    const mk = (key: string, start: number, end: number) => {
      if (!this.anims.exists(key)) {
        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers('leaf', { start, end }),
          frameRate: 6,
          repeat: -1,
        });
      }
    };
    mk('walk-down', 0, 2);
    mk('walk-up', 3, 5);
    mk('walk-left', 6, 8);
    mk('walk-right', 9, 11);
  }

  update() {
    if (!this.leaf) return;
    let vx = 0;
    let vy = 0;
    if (this.cursors.left?.isDown) vx = -LEAF_SPEED;
    else if (this.cursors.right?.isDown) vx = LEAF_SPEED;
    if (this.cursors.up?.isDown) vy = -LEAF_SPEED;
    else if (this.cursors.down?.isDown) vy = LEAF_SPEED;
    this.leaf.setVelocity(vx, vy);

    if (vx !== 0 || vy !== 0) {
      if (Math.abs(vx) > Math.abs(vy)) this.lastDir = vx < 0 ? 'left' : 'right';
      else this.lastDir = vy < 0 ? 'up' : 'down';
      this.leaf.anims.play(`walk-${this.lastDir}`, true);
    } else {
      this.leaf.anims.stop();
      const idle: Record<string, number> = { down: 1, up: 4, left: 7, right: 10 };
      this.leaf.setFrame(idle[this.lastDir] ?? 1);
    }

    if (this.actionPositions.length && this.actionPrompt && this.actionKey) {
      const nearby = this.actionPositions
        .map(action => ({ action, distance: Phaser.Math.Distance.Between(this.leaf.x, this.leaf.y, action.x, action.y) }))
        .filter(({ action, distance }) => distance <= action.radius)
        .sort((a, b) => a.distance - b.distance)[0]?.action;
      this.actionPrompt.setText(nearby ? `Press SPACE to ${nearby.label}` : '');
      if (nearby && Input.Keyboard.JustDown(this.actionKey)) nearby.onAction();
    }
  }

  private leave() {
    // Stop this interior scene and resume the outside scene (key "outside")
    this.scene.stop();
    this.scene.resume('outside');
  }
}
