import { GameObjects, Geom } from 'phaser';

const RING_COLORS = [
  0xe74c3c, // red
  0xe67e22, // orange
  0xf1c40f, // yellow
  0x2ecc71, // green
  0x1abc9c, // teal
  0x3498db, // blue
  0x9b59b6, // purple
  0xec407a, // pink
];

const RING_WIDTH = 120;
const RING_HEIGHT = 32;
const CORNER_RADIUS = 10;

export class Disk extends GameObjects.Graphics {
  constructor(scene, x, y, index) {
    super(scene);
    scene.add.existing(this);

    this.diskSize = index;
    this.placed = false;
    this.originX = x;
    this.originY = y;

    this.diskWidth = RING_WIDTH;
    this.diskHeight = RING_HEIGHT;
    this.diskColor = RING_COLORS[index % RING_COLORS.length];

    this.setPosition(x, y);
    this.drawDisk();

    // Make interactive for drag
    this.setInteractive(
      new Geom.Rectangle(
        -this.diskWidth / 2,
        -this.diskHeight / 2,
        this.diskWidth,
        this.diskHeight
      ),
      Geom.Rectangle.Contains
    );

    scene.input.setDraggable(this);
  }

  drawDisk(highlight = false) {
    this.clear();
    const color = highlight ? 0xffffff : this.diskColor;
    const alpha = highlight ? 0.9 : 1;

    this.fillStyle(color, alpha);
    this.fillRoundedRect(
      -this.diskWidth / 2,
      -this.diskHeight / 2,
      this.diskWidth,
      this.diskHeight,
      CORNER_RADIUS
    );

    // Subtle inner highlight for 3D effect
    this.fillStyle(0xffffff, 0.15);
    this.fillRoundedRect(
      -this.diskWidth / 2 + 4,
      -this.diskHeight / 2 + 3,
      this.diskWidth - 8,
      this.diskHeight / 3,
      CORNER_RADIUS - 2
    );
  }

  setDraggableState(enabled) {
    if (enabled) {
      this.setAlpha(1);
      this.input.enabled = true;
    } else {
      this.setAlpha(0.85);
      this.input.enabled = false;
    }
  }

  snapTo(x, y, pegIndex) {
    this.currentPeg = pegIndex;
    this.originX = x;
    this.originY = y;
    this.scene.tweens.add({
      targets: this,
      x,
      y,
      duration: 200,
      ease: 'Back.easeOut',
    });
  }

  snapBack() {
    this.scene.tweens.add({
      targets: this,
      x: this.originX,
      y: this.originY,
      duration: 200,
      ease: 'Back.easeOut',
    });
  }

  shake() {
    this.scene.tweens.add({
      targets: this,
      x: this.originX - 8,
      duration: 50,
      yoyo: true,
      repeat: 3,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.x = this.originX;
      },
    });
  }
}
