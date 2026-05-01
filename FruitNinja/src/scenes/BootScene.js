import { Scene, Math as PMath } from 'phaser';
import { GAME_W, GAME_H, ALPHABET, LETTER_COLORS } from '../constants.js';
import { drawGradientBackground } from '../utils.js';

export class BootScene extends Scene {
    constructor() {
        super('BootScene');
    }

    create() {
        drawGradientBackground(this, { r0: 26, rD: 10, g0: 10, gD: 20, b0: 46, bD: 40 });

        this.createTitle();
        this.createSubtitle();
        this.createFloatingLetters();
        this.createStartPrompt();

        this.input.once('pointerdown', () => {
            this.cameras.main.fade(400, 0, 0, 0);
            this.time.delayedCall(400, () => this.scene.start('GameScene'));
        });
    }

    createTitle() {
        this.add.text(GAME_W / 2, GAME_H * 0.3, '🔪 FRUIT NINJA\nABC', {
            fontSize: '64px',
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontStyle: 'bold',
            fill: '#ffffff',
            stroke: '#ff4444',
            strokeThickness: 8,
            align: 'center',
            shadow: { offsetX: 3, offsetY: 3, color: '#000', blur: 8, fill: true }
        }).setOrigin(0.5);
    }

    createSubtitle() {
        this.add.text(GAME_W / 2, GAME_H * 0.52, 'Learn your letters\nby slicing them!', {
            fontSize: '28px',
            fontFamily: 'Arial, sans-serif',
            fill: '#ccccff',
            align: 'center',
            lineSpacing: 8
        }).setOrigin(0.5);
    }

    createFloatingLetters() {
        for (let i = 0; i < 12; i++) {
            const ch = ALPHABET[PMath.Between(0, 25)];
            const x = PMath.Between(40, GAME_W - 40);
            const y = PMath.Between(GAME_H * 0.6, GAME_H * 0.95);

            const txt = this.add.text(x, y, ch, {
                fontSize: PMath.Between(24, 48) + 'px',
                fontFamily: 'Arial Black, Arial, sans-serif',
                fill: LETTER_COLORS[PMath.Between(0, 25)],
                alpha: 0.15
            }).setOrigin(0.5);

            this.tweens.add({
                targets: txt,
                y: txt.y - PMath.Between(20, 60),
                alpha: 0.05,
                duration: PMath.Between(2000, 4000),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    createStartPrompt() {
        const startText = this.add.text(GAME_W / 2, GAME_H * 0.75, '👆 TAP TO START', {
            fontSize: '36px',
            fontFamily: 'Arial Black, Arial, sans-serif',
            fill: '#ffffff',
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(0.5);

        this.tweens.add({
            targets: startText,
            alpha: 0.3,
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }
}
