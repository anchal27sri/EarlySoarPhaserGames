import { Scene, Math as PMath } from 'phaser';
import { GAME_W, GAME_H, ALPHABET, TOTAL_LETTERS, LETTER_COLORS } from '../constants.js';
import { drawGradientBackground, createRoundedButton, ensureConfettiTexture } from '../utils.js';

export class WinScene extends Scene {
    constructor() {
        super('WinScene');
    }

    create() {
        drawGradientBackground(this, { r0: 10, rD: 20, g0: 15, gD: 10, b0: 40, bD: 30 });

        this.cameras.main.fadeIn(500);

        this.createConfetti();
        this.createTrophy();
        this.createHeading();
        this.createLetterGrid();
        this.createStars();
        this.createButtons();
    }

    createTrophy() {
        const trophy = this.add.text(GAME_W / 2, GAME_H * 0.18, '🏆', {
            fontSize: '100px'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: trophy,
            scale: 1.15,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    createHeading() {
        this.add.text(GAME_W / 2, GAME_H * 0.32, 'CONGRATULATIONS!', {
            fontSize: '44px',
            fontFamily: 'Arial Black, Arial, sans-serif',
            fill: '#FFD700',
            stroke: '#000',
            strokeThickness: 6,
            shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 10, fill: true }
        }).setOrigin(0.5);

        this.add.text(GAME_W / 2, GAME_H * 0.39, 'You sliced all 26 letters!', {
            fontSize: '26px',
            fontFamily: 'Arial, sans-serif',
            fill: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
    }

    createStars() {
        for (let i = 0; i < 8; i++) {
            const star = this.add.text(
                PMath.Between(40, GAME_W - 40),
                PMath.Between(50, GAME_H * 0.3),
                '⭐',
                { fontSize: PMath.Between(20, 36) + 'px' }
            ).setOrigin(0.5).setAlpha(0);

            this.tweens.add({
                targets: star,
                alpha: { from: 0, to: 1 },
                y: star.y - 20,
                scale: { from: 0.5, to: 1.2 },
                duration: 1500,
                delay: PMath.Between(200, 1500),
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }
    }

    createLetterGrid() {
        const cols = 7;
        const cellW = 60;
        const cellH = 55;
        const startX = GAME_W / 2 - (cols * cellW) / 2 + cellW / 2;
        const startY = GAME_H * 0.46;

        for (let i = 0; i < TOTAL_LETTERS; i++) {
            const x = startX + (i % cols) * cellW;
            const y = startY + Math.floor(i / cols) * cellH;

            const txt = this.add.text(x, y, ALPHABET[i], {
                fontSize: '34px',
                fontFamily: 'Arial Black, Arial, sans-serif',
                fill: LETTER_COLORS[i],
                stroke: '#000',
                strokeThickness: 3
            }).setOrigin(0.5).setAlpha(0).setScale(0);

            this.tweens.add({
                targets: txt,
                alpha: 1, scale: 1,
                duration: 300,
                delay: 50 * i + 300,
                ease: 'Back.easeOut'
            });
        }
    }

    createConfetti() {
        ensureConfettiTexture(this);

        this.add.particles(0, 0, 'confetti', {
            x: { min: 0, max: GAME_W },
            y: -20,
            speedY: { min: 80, max: 200 },
            speedX: { min: -50, max: 50 },
            rotate: { min: 0, max: 360 },
            scale: { start: 0.7, end: 0.3 },
            lifespan: { min: 3000, max: 5000 },
            tint: [0xFF6B6B, 0xFFCD56, 0x4BC0C0, 0x36A2EB, 0x9966FF, 0xFF6384, 0xFFD700],
            frequency: 150,
            quantity: 2
        });
    }

    createButtons() {
        createRoundedButton(this, GAME_W / 2, GAME_H * 0.78, '🔄  PLAY AGAIN', '#4BC0C0', () => {
            this.cameras.main.fade(400, 0, 0, 0);
            this.time.delayedCall(400, () => this.scene.start('GameScene'));
        });

        createRoundedButton(this, GAME_W / 2, GAME_H * 0.86, '🚪  EXIT', '#FF6B6B', () => {
            this.cameras.main.fade(400, 0, 0, 0);
            this.time.delayedCall(400, () => {
                window.location.href = '../index.html';
            });
        });
    }
}
