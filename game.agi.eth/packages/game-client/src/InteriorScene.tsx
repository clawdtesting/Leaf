// packages/game-client/src/InteriorScene.tsx
import React from 'react';
import { Types, Scene, GameObjects } from 'phaser';

interface InteriorSceneProps {
  /** The building key (must match one of the BUILDINGS entries) */
  buildingKey: string;
  /** Filename of the interior image (without path) */
  interiorImg: string;
  /** Optional text to show on the “Leave” button */
  leaveLabel?: string;
}

/**
 * A simple Phaser Scene that displays an interior image and a button to go back.
 */
export class InteriorScene extends Scene {
  private props: InteriorSceneProps;
  private interior!: GameObjects.Image;
  private leaveBtn!: GameObjects.Text;

  constructor(props: InteriorSceneProps) {
    super({ key: `Interior-${props.buildingKey}` });
    this.props = props;
  }

  preload() {
    // Load the interior image (adjust the path if you store it elsewhere)
    this.load.image(
      this.props.interiorImg,
      `/assets/${this.props.interiorImg}`
    );
  }

  create() {
    const { width, height } = this.scale;

    // Opaque background so the paused outside scene doesn't show through
    this.cameras.main.setBackgroundColor('#140d07');

    // ESC also leaves the interior
    this.input.keyboard?.once('keydown-ESC', () => this.leave());

    // Show the interior image, centered
    this.interior = this.add.image(width / 2, height / 2, this.props.interiorImg);
    // Scale to fit screen while preserving aspect ratio (adjust as needed)
    const scale = Math.min(width / this.interior.width, height / this.interior.height) * 0.9;
    this.interior.setScale(scale);

    // Leave button at the bottom
    const leaveText = this.props.leaveLabel ?? 'Leave';
    this.leaveBtn = this.add
      .text(width / 2, height - 40, leaveText, {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#ff0',
        backgroundColor: '#0005',
        padding: { x: 12, y: 6 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.leave());
  }

  private leave() {
    // Stop this interior scene and resume the outside scene (key "outside")
    this.scene.stop();
    this.scene.resume('outside');
  }
}