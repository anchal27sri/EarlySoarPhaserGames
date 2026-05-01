import { Scene } from 'phaser';

export class WinScene extends Scene {
  constructor() {
    super('WinScene');
  }

  init(data) {
    this.score = data.score;
    this.totalRounds = data.totalRounds;
  }

  create() {
    const { width, height } = this.scale;

    // Background image
    this.add.image(width / 2, height / 2, 'bg').setDisplaySize(width, height);

    // Semi-transparent overlay
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);

    // Title with scale bounce
    const title = this.add.text(width / 2, height * 0.15, '🎉 Well Done!', {
      fontFamily: 'Georgia, serif',
      fontSize: '56px',
      color: '#f1c40f',
      fontStyle: 'bold',
    }).setOrigin(0.5).setScale(0);

    this.tweens.add({
      targets: title,
      scale: 1,
      duration: 500,
      ease: 'Back.easeOut',
    });

    // Score
    this.add.text(width / 2, height * 0.38, `${this.score} / ${this.totalRounds}`, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '52px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.48, 'correct answers', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      color: '#888899',
    }).setOrigin(0.5);

    // Star rating
    const stars = this.getStars();
    this.add.text(width / 2, height * 0.6, stars, {
      fontSize: '48px',
    }).setOrigin(0.5);

    // Rating label
    this.add.text(width / 2, height * 0.7, this.getRatingLabel(), {
      fontFamily: 'Arial, sans-serif',
      fontSize: '22px',
      color: '#aaaacc',
    }).setOrigin(0.5);

    // Notify Android
    this.notifyAndroid();

    // Buttons side by side
    this.createButton(width / 2 - 150, height * 0.85, 240, 60, 'Play Again', () => {
      this.scene.start('GameScene');
    }, 0x2ecc71);

    this.createButton(width / 2 + 150, height * 0.85, 240, 60, 'Menu', () => {
      this.scene.start('MenuScene');
    }, 0x16213e);
  }

  getStars() {
    const pct = this.score / this.totalRounds;
    if (pct >= 0.9) return '⭐⭐⭐';
    if (pct >= 0.7) return '⭐⭐';
    return '⭐';
  }

  getRatingLabel() {
    const pct = this.score / this.totalRounds;
    if (pct >= 0.9) return 'Amazing!';
    if (pct >= 0.7) return 'Great job!';
    if (pct >= 0.5) return 'Good effort!';
    return 'Keep practicing!';
  }

  getStarCount() {
    const pct = this.score / this.totalRounds;
    if (pct >= 0.9) return 3;
    if (pct >= 0.7) return 2;
    return 1;
  }

  createButton(x, y, w, h, label, callback, color) {
    const bg = this.add.graphics();
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 12);
    bg.lineStyle(2, 0x444466);
    bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 12);

    const text = this.add.text(x, y, label, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '30px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', callback);
    zone.on('pointerover', () => text.setColor('#f1c40f'));
    zone.on('pointerout', () => text.setColor('#ffffff'));
  }

  notifyAndroid() {
    if (window.AndroidBridge) {
      const starCount = this.getStarCount();
      window.AndroidBridge.onGameComplete(this.score, this.totalRounds, starCount);
    }
  }
}
