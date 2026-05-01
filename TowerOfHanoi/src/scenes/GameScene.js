import { Scene } from 'phaser';
import { CountingModel } from '../objects/CountingModel.js';
import { Peg } from '../objects/Peg.js';
import { Disk } from '../objects/Disk.js';

export class GameScene extends Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    const { width, height } = this.scale;
    this.W = width;
    this.H = height;

    // Background
    this.add.image(width / 2, height / 2, 'bg').setDisplaySize(width, height);
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.45);

    // Model
    this.model = new CountingModel(20);

    // State
    this.rings = [];
    this.peg = null;
    this.phase = 'idle'; // idle | placing | answering

    // HUD
    this.roundText = this.add.text(width / 2, 30, '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '28px',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(200);

    this.scoreText = this.add.text(width - 20, 30, '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      color: '#f1c40f',
    }).setOrigin(1, 0.5).setDepth(200);

    // Answer option objects (reused)
    this.optionButtons = [];
    this.feedbackText = null;

    // Drag events
    this.input.on('dragstart', (pointer, obj) => {
      if (this.phase !== 'placing') return;
      obj.setDepth(100);
    });

    this.input.on('drag', (pointer, obj, dragX, dragY) => {
      if (this.phase !== 'placing') return;
      obj.x = dragX;
      obj.y = dragY;
    });

    this.input.on('dragenter', (pointer, obj, dropZone) => {
      if (this.phase !== 'placing') return;
      dropZone.pegRef.showHighlight();
    });

    this.input.on('dragleave', (pointer, obj, dropZone) => {
      if (this.phase !== 'placing') return;
      dropZone.pegRef.hideHighlight();
    });

    this.input.on('drop', (pointer, obj, dropZone) => {
      if (this.phase !== 'placing') return;
      dropZone.pegRef.hideHighlight();

      if (obj.placed) return;
      obj.placed = true;
      obj.input.enabled = false;

      const allPlaced = this.model.placeRing();
      const stackY = this.peg.getNextRingY(this.model.ringsOnPeg - 1);
      obj.snapTo(this.peg.x, stackY, 0);
      obj.setDepth(this.model.ringsOnPeg);

      if (allPlaced) {
        this.phase = 'idle';
        this.time.delayedCall(300, () => this.showAnswerPhase());
      }
    });

    this.input.on('dragend', (pointer, obj, dropped) => {
      if (this.phase !== 'placing') return;
      if (!dropped && !obj.placed) {
        obj.snapBack();
      }
    });

    // Start first round
    this.startRound();
  }

  startRound() {
    // Clean up previous round
    this.clearRound();

    if (this.model.isGameOver()) {
      this.scene.start('WinScene', {
        score: this.model.score,
        totalRounds: this.model.totalRounds,
      });
      return;
    }

    const ringCount = this.model.startRound();
    this.updateHUD();

    // Create peg on the right side
    const pegX = this.W * 0.82;
    const baseY = this.H * 0.85;
    this.peg = new Peg(this, pegX, baseY, 8);

    // Scatter rings on the left/center "floor" area (no overlap)
    this.rings = [];
    const positions = this.generateNonOverlappingPositions(ringCount);
    for (let i = 0; i < ringCount; i++) {
      const ring = new Disk(this, positions[i].x, positions[i].y, i);
      this.rings.push(ring);
    }

    this.phase = 'placing';
  }

  repeatRound() {
    this.clearRound();
    this.model.repeatRound();

    const ringCount = this.model.ringCount;

    // Recreate peg on the right
    const pegX = this.W * 0.82;
    const baseY = this.H * 0.85;
    this.peg = new Peg(this, pegX, baseY, 8);

    // Scatter rings again (no overlap)
    this.rings = [];
    const positions = this.generateNonOverlappingPositions(ringCount);
    for (let i = 0; i < ringCount; i++) {
      const ring = new Disk(this, positions[i].x, positions[i].y, i);
      this.rings.push(ring);
    }

    this.phase = 'placing';
  }

  showAnswerPhase() {
    this.phase = 'answering';

    // Animate peg + rings to the left
    const targetX = this.W * 0.3;
    const deltaX = targetX - this.peg.x;

    // Move all peg graphics
    const pegGraphics = this.peg.getAllGraphics();
    for (const g of pegGraphics) {
      this.tweens.add({
        targets: g,
        x: (g.x || 0) + deltaX,
        duration: 500,
        ease: 'Power2',
      });
    }

    // Move all placed rings
    for (const ring of this.rings) {
      this.tweens.add({
        targets: ring,
        x: ring.x + deltaX,
        duration: 500,
        ease: 'Power2',
      });
    }

    // After slide animation, show number options on the right
    this.time.delayedCall(600, () => {
      this.showOptions();
    });
  }

  showOptions() {
    const options = this.model.generateOptions();
    const centerX = this.W * 0.75;
    const spacing = 120;
    const startY = this.H * 0.5 - spacing;

    // "How many rings?" label
    this.questionText = this.add.text(centerX, this.H * 0.15, 'How many\nrings?', {
      fontFamily: 'Georgia, serif',
      fontSize: '36px',
      color: '#ffffff',
      align: 'center',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(200);

    this.optionButtons = [];
    for (let i = 0; i < 3; i++) {
      const y = startY + i * spacing;
      const btn = this.createOptionButton(centerX, y, options[i]);
      this.optionButtons.push(btn);
    }
  }

  createOptionButton(x, y, value) {
    const bg = this.add.graphics().setDepth(200);
    bg.fillStyle(0x16213e, 1);
    bg.fillRoundedRect(x - 70, y - 35, 140, 70, 14);
    bg.lineStyle(3, 0x444466);
    bg.strokeRoundedRect(x - 70, y - 35, 140, 70, 14);

    const text = this.add.text(x, y, String(value), {
      fontFamily: 'Arial, sans-serif',
      fontSize: '42px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(201);

    const zone = this.add.zone(x, y, 140, 70).setInteractive({ useHandCursor: true }).setDepth(202);

    zone.on('pointerdown', () => {
      if (this.phase !== 'answering') return;
      this.phase = 'idle';
      this.handleAnswer(value, bg, text);
    });

    return { bg, text, zone, value };
  }

  handleAnswer(answer, selectedBg, selectedText) {
    const correct = this.model.checkAnswer(answer);

    // Disable all option buttons
    for (const btn of this.optionButtons) {
      btn.zone.disableInteractive();
    }

    if (correct) {
      // Green flash on correct
      selectedBg.clear();
      selectedBg.fillStyle(0x2ecc71, 1);
      selectedBg.fillRoundedRect(selectedText.x - 70, selectedText.y - 35, 140, 70, 14);

      this.feedbackText = this.add.text(this.W * 0.75, this.H * 0.85, '✓ Correct!', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '32px',
        color: '#2ecc71',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(200);

      this.updateHUD();

      this.time.delayedCall(1000, () => {
        this.startRound();
      });
    } else {
      // Red flash on wrong
      selectedBg.clear();
      selectedBg.fillStyle(0xe74c3c, 1);
      selectedBg.fillRoundedRect(selectedText.x - 70, selectedText.y - 35, 140, 70, 14);

      // Highlight correct answer in green
      for (const btn of this.optionButtons) {
        if (btn.value === this.model.ringCount) {
          btn.bg.clear();
          btn.bg.fillStyle(0x2ecc71, 1);
          btn.bg.fillRoundedRect(btn.text.x - 70, btn.text.y - 35, 140, 70, 14);
        }
      }

      this.feedbackText = this.add.text(this.W * 0.75, this.H * 0.85, '✗ Try again!', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '32px',
        color: '#e74c3c',
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(200);

      // Repeat the round (don't advance)
      this.model.currentRound--;

      this.time.delayedCall(1500, () => {
        this.repeatRound();
      });
    }
  }

  clearRound() {
    // Destroy rings
    for (const ring of this.rings) {
      ring.destroy();
    }
    this.rings = [];

    // Destroy peg
    if (this.peg) {
      this.peg.destroy();
      this.peg = null;
    }

    // Destroy option buttons
    for (const btn of this.optionButtons) {
      btn.bg.destroy();
      btn.text.destroy();
      btn.zone.destroy();
    }
    this.optionButtons = [];

    // Destroy feedback / question text
    if (this.feedbackText) {
      this.feedbackText.destroy();
      this.feedbackText = null;
    }
    if (this.questionText) {
      this.questionText.destroy();
      this.questionText = null;
    }
  }

  generateNonOverlappingPositions(count) {
    const floorLeft = this.W * 0.08;
    const floorRight = this.W * 0.62;
    const floorTop = this.H * 0.20;
    const floorBottom = this.H * 0.80;
    const minDist = 130; // ring width (120) + padding
    const positions = [];

    for (let i = 0; i < count; i++) {
      let x, y, overlapping;
      let attempts = 0;
      do {
        x = floorLeft + Math.random() * (floorRight - floorLeft);
        y = floorTop + Math.random() * (floorBottom - floorTop);
        overlapping = positions.some(p => {
          const dx = p.x - x;
          const dy = p.y - y;
          return Math.sqrt(dx * dx + dy * dy) < minDist;
        });
        attempts++;
      } while (overlapping && attempts < 200);
      positions.push({ x, y });
    }

    return positions;
  }

  updateHUD() {
    this.roundText.setText(`Round ${this.model.currentRound} / ${this.model.totalRounds}`);
    this.scoreText.setText(`Score: ${this.model.score}`);
  }
}
