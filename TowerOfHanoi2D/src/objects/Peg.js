import { GameObjects } from 'phaser';

const PEG_COLOR = 0xd4a84b;
const PEG_WIDTH = 14;
const BASE_HEIGHT = 16;
const BASE_WIDTH = 160;

export class Peg {
  constructor(scene, x, baseY, maxRings) {
    this.scene = scene;
    this.x = x;
    this.baseY = baseY;
    this.maxRings = maxRings;
    this.ringHeight = 36;

    const pegHeight = (maxRings + 1) * this.ringHeight;

    // Draw the vertical pole
    this.pole = scene.add.graphics();
    this.pole.fillStyle(PEG_COLOR, 1);
    this.pole.fillRoundedRect(
      x - PEG_WIDTH / 2,
      baseY - pegHeight,
      PEG_WIDTH,
      pegHeight,
      4
    );

    // Draw the base
    this.base = scene.add.graphics();
    this.base.fillStyle(PEG_COLOR, 1);
    this.base.fillRoundedRect(
      x - BASE_WIDTH / 2,
      baseY,
      BASE_WIDTH,
      BASE_HEIGHT,
      4
    );

    // Highlight overlay (shown during drag hover)
    this.highlight = scene.add.graphics();
    this.highlight.setVisible(false);

    // Drop zone covers the peg area
    this.dropZone = scene.add.zone(
      x,
      baseY - pegHeight / 2,
      BASE_WIDTH + 40,
      pegHeight + BASE_HEIGHT + 40
    );
    this.dropZone.setRectangleDropZone(BASE_WIDTH + 40, pegHeight + BASE_HEIGHT + 40);
    this.dropZone.pegRef = this;
  }

  getNextRingY(currentCount) {
    return this.baseY - (currentCount * this.ringHeight) - this.ringHeight / 2;
  }

  showHighlight() {
    this.highlight.setVisible(true);
    this.highlight.clear();
    const pegHeight = (this.maxRings + 1) * this.ringHeight;
    this.highlight.fillStyle(0x00ff88, 0.12);
    this.highlight.fillRoundedRect(
      this.x - BASE_WIDTH / 2 - 10,
      this.baseY - pegHeight - 20,
      BASE_WIDTH + 20,
      pegHeight + BASE_HEIGHT + 30,
      12
    );
  }

  hideHighlight() {
    this.highlight.setVisible(false);
  }

  getAllGraphics() {
    return [this.pole, this.base, this.highlight, this.dropZone];
  }

  destroy() {
    this.pole.destroy();
    this.base.destroy();
    this.highlight.destroy();
    this.dropZone.destroy();
  }
}
