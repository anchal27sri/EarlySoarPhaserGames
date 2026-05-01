import { Scene } from 'phaser';

export class MenuScene extends Scene {
  constructor() {
    super('MenuScene');
  }

  preload() {
    this.load.image('bg', new URL('../assets/background_image.png', import.meta.url).href);
  }

  create() {
    const { width, height } = this.scale;

    // Background image
    this.add.image(width / 2, height / 2, 'bg').setDisplaySize(width, height);

    // Title
    this.add.text(width / 2, height * 0.25, 'Ring Counting', {
      fontFamily: 'Georgia, serif',
      fontSize: '56px',
      color: '#f1c40f',
      align: 'center',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(width / 2, height * 0.42, 'Place the rings on the peg\nthen count them!', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '24px',
      color: '#aaaacc',
      align: 'center',
    }).setOrigin(0.5);

    // Play button
    this.createButton(width / 2, height * 0.65, 260, 70, 'START', () => {
      this.scene.start('GameScene');
    }, '#2ecc71', '36px');
  }

  createButton(x, y, w, h, label, callback, bgColor = '#16213e', fontSize = '36px') {
    const bg = this.add.graphics();
    const color = bgColor === '#2ecc71' ? 0x2ecc71 : 0x16213e;
    bg.fillStyle(color, 1);
    bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, 12);
    bg.lineStyle(2, 0x444466);
    bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 12);

    const text = this.add.text(x, y, label, {
      fontFamily: 'Arial, sans-serif',
      fontSize,
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    const zone = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', callback);
    zone.on('pointerover', () => text.setColor('#f1c40f'));
    zone.on('pointerout', () => text.setColor('#ffffff'));

    return { bg, text, zone };
  }
}
