import { Scene, Math as PMath } from 'phaser';
import { GAME_W, GAME_H } from '../constants.js';

export class MenuScene extends Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const cx = GAME_W / 2;

    // Soft pastel background
    this.add.rectangle(cx, GAME_H / 2, GAME_W, GAME_H, 0xfef6e4);

    // Decorative floating circles
    const decoColors = [0xff6b6b, 0x4ecdc4, 0xffd93d, 0xa18cd1, 0x95e1d3];
    for (let i = 0; i < 8; i++) {
      const dx = PMath.Between(20, GAME_W - 20);
      const dy = PMath.Between(80, GAME_H - 80);
      const dr = PMath.Between(12, 22);
      const c = decoColors[i % decoColors.length];
      const circle = this.add.circle(dx, dy, dr, c, 0.35);
      this.tweens.add({
        targets: circle,
        y: dy - PMath.Between(8, 16),
        scale: 1.15,
        duration: PMath.Between(1200, 2000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // Title
    this.add.text(cx, 130, 'Bouncing', {
      fontFamily: 'Fredoka One, Arial Black, sans-serif',
      fontSize: '52px',
      color: '#ff6b6b',
      stroke: '#ffffff',
      strokeThickness: 6,
    }).setOrigin(0.5);

    this.add.text(cx, 190, 'Ball ABC', {
      fontFamily: 'Fredoka One, Arial Black, sans-serif',
      fontSize: '52px',
      color: '#4ecdc4',
      stroke: '#ffffff',
      strokeThickness: 6,
    }).setOrigin(0.5);

    // Sample bouncing ball preview
    const previewBall = this.add.circle(cx, 300, 40, 0xffd93d);
    previewBall.setStrokeStyle(4, 0xff6b6b);
    const previewLetter = this.add.text(cx, 300, 'A', {
      fontFamily: 'Fredoka One, Arial Black, sans-serif',
      fontSize: '44px',
      color: '#302b63',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: [previewBall, previewLetter],
      scale: 1.3,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Letter cycling preview
    const letters = ['A', 'B', 'C', 'D', 'E'];
    let li = 0;
    this.time.addEvent({
      delay: 800,
      loop: true,
      callback: () => {
        li = (li + 1) % letters.length;
        previewLetter.setText(letters[li]);
      },
    });

    // Instructions
    this.add.text(cx, 400, 'Bounce the ball with the paddle', {
      fontFamily: 'Nunito, Arial, sans-serif',
      fontSize: '17px',
      color: '#302b63',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(cx, 425, 'and learn all 26 letters!', {
      fontFamily: 'Nunito, Arial, sans-serif',
      fontSize: '17px',
      color: '#302b63',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(cx, 470, '🖐️  Drag to move the paddle', {
      fontFamily: 'Nunito, Arial, sans-serif',
      fontSize: '15px',
      color: '#5a5a8a',
    }).setOrigin(0.5);

    this.add.text(cx, 495, '⌨️  Or use ← → arrow keys', {
      fontFamily: 'Nunito, Arial, sans-serif',
      fontSize: '15px',
      color: '#5a5a8a',
    }).setOrigin(0.5);

    // Start button
    const btn = this.add.rectangle(cx, 580, 220, 70, 0xff6b6b);
    btn.setStrokeStyle(4, 0xffffff);
    const btnText = this.add.text(cx, 580, 'PLAY', {
      fontFamily: 'Fredoka One, Arial Black, sans-serif',
      fontSize: '32px',
      color: '#ffffff',
    }).setOrigin(0.5);

    btn.setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: [btn, btnText],
      scale: 1.06,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const startGame = () => {
      this.tweens.killTweensOf([btn, btnText, previewBall, previewLetter]);
      this.cameras.main.flash(200, 255, 255, 255);
      this.time.delayedCall(150, () => this.scene.start('GameScene'));
    };

    btn.on('pointerdown', startGame);

    this.input.keyboard.on('keydown-ENTER', startGame);
    this.input.keyboard.on('keydown-SPACE', startGame);

    // Footer
    this.add.text(cx, GAME_H - 25, 'Tap PLAY to start', {
      fontFamily: 'Nunito, Arial, sans-serif',
      fontSize: '13px',
      color: '#a0a0c0',
    }).setOrigin(0.5);
  }
}
