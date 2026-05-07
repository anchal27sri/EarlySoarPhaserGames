import { Scene, Math as PMath } from 'phaser';
import { GAME_W, GAME_H } from '../constants.js';

export class WinScene extends Scene {
  constructor() {
    super({ key: 'WinScene' });
  }

  create() {
    const cx = GAME_W / 2;

    // Festive background
    this.add.rectangle(cx, GAME_H / 2, GAME_W, GAME_H, 0xfef6e4);

    // Confetti circles
    const confettiColors = [0xff6b6b, 0x4ecdc4, 0xffd93d, 0xa18cd1, 0x95e1d3, 0xff8e53];
    for (let i = 0; i < 40; i++) {
      const x = PMath.Between(20, GAME_W - 20);
      const y = PMath.Between(-20, GAME_H);
      const r = PMath.Between(4, 9);
      const c = confettiColors[i % confettiColors.length];
      const piece = this.add.circle(x, y, r, c);
      this.tweens.add({
        targets: piece,
        y: y + PMath.Between(60, 140),
        angle: PMath.Between(-180, 180),
        alpha: { from: 1, to: 0.4 },
        duration: PMath.Between(1800, 3000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // Title
    this.add.text(cx, 130, '🎉', {
      fontSize: '80px',
    }).setOrigin(0.5);

    this.add.text(cx, 220, 'You Did It!', {
      fontFamily: 'Fredoka One, Arial Black, sans-serif',
      fontSize: '48px',
      color: '#ff6b6b',
      stroke: '#ffffff',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(cx, 270, 'All 26 letters!', {
      fontFamily: 'Fredoka One, Arial Black, sans-serif',
      fontSize: '28px',
      color: '#4ecdc4',
      stroke: '#ffffff',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Letter showcase
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const cols = 7;
    const cellW = 46;
    const cellH = 42;
    const startX = cx - (cols - 1) * cellW / 2;
    const startY = 340;

    letters.forEach((letter, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const lx = startX + col * cellW;
      const ly = startY + row * cellH;
      const t = this.add.text(lx, ly, letter, {
        fontFamily: 'Fredoka One, Arial Black, sans-serif',
        fontSize: '24px',
        color: '#302b63',
      }).setOrigin(0.5);

      this.tweens.add({
        targets: t,
        scale: 1.25,
        duration: 600,
        delay: idx * 60,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });

    // Buttons
    const playAgainBtn = this.add.rectangle(cx, 580, 220, 64, 0x4ecdc4);
    playAgainBtn.setStrokeStyle(4, 0xffffff);
    const playAgainText = this.add.text(cx, 580, 'PLAY AGAIN', {
      fontFamily: 'Fredoka One, Arial Black, sans-serif',
      fontSize: '24px',
      color: '#ffffff',
    }).setOrigin(0.5);
    playAgainBtn.setInteractive({ useHandCursor: true });

    const menuBtn = this.add.rectangle(cx, 650, 180, 50, 0xa18cd1);
    menuBtn.setStrokeStyle(3, 0xffffff);
    const menuText = this.add.text(cx, 650, 'MENU', {
      fontFamily: 'Fredoka One, Arial Black, sans-serif',
      fontSize: '20px',
      color: '#ffffff',
    }).setOrigin(0.5);
    menuBtn.setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: [playAgainBtn, playAgainText],
      scale: 1.05,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const goPlay = () => {
      this.tweens.killTweensOf([playAgainBtn, playAgainText, menuBtn, menuText]);
      this.cameras.main.flash(150, 255, 255, 255);
      this.time.delayedCall(120, () => this.scene.start('GameScene'));
    };

    const goMenu = () => {
      this.tweens.killTweensOf([playAgainBtn, playAgainText, menuBtn, menuText]);
      this.cameras.main.flash(150, 255, 255, 255);
      this.time.delayedCall(120, () => this.scene.start('MenuScene'));
    };

    playAgainBtn.on('pointerdown', goPlay);
    menuBtn.on('pointerdown', goMenu);

    this.input.keyboard.on('keydown-ENTER', goPlay);
    this.input.keyboard.on('keydown-SPACE', goPlay);
    this.input.keyboard.on('keydown-ESC', goMenu);
    this.input.keyboard.on('keydown-M', goMenu);
  }
}
