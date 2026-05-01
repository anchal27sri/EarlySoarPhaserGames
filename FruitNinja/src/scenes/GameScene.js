import { Scene, Math as PMath, Utils } from 'phaser';
import {
    GAME_W, GAME_H, ALPHABET, TOTAL_LETTERS, LETTER_COLORS,
    LETTER_VELOCITY_X, LETTER_VELOCITY_Y, LETTER_GRAVITY_Y, LETTER_ANGULAR_VEL,
    LAUNCH_INTERVAL, FIRST_LAUNCH_DELAY,
    TRAIL_LIFETIME_MS, TRAIL_MAX_POINTS
} from '../constants.js';
import {
    drawGradientBackground, hexToInt, darkenColor,
    ensureParticleTexture, ensureChunkTexture
} from '../utils.js';

export class GameScene extends Scene {
    constructor() {
        super('GameScene');
    }

    create() {
        drawGradientBackground(this, { r0: 10, rD: 16, g0: 5, gD: 10, b0: 30, bD: 50 });

        this.completedLetters  = new Set();
        this.remainingLetters  = Utils.Array.Shuffle(ALPHABET.split(''));
        this.activeLetter      = null;
        this.knifeTrailPoints  = [];
        this.canLaunch         = true;

        this.generateLetterTextures();

        this.letterGroup = this.physics.add.group();

        this.trailGfx = this.add.graphics();

        this.createKnife();
        this.createHUD();
        this.setupCollision();
        this.setupLauncher();
        this.setupTrailInput();

        this.cameras.main.fadeIn(400);
    }

    // ═════════════════════════════════════════════════════════
    //  TEXTURE GENERATION
    // ═════════════════════════════════════════════════════════

    generateLetterTextures() {
        const size = 140;
        for (let i = 0; i < TOTAL_LETTERS; i++) {
            const key = 'letter_' + ALPHABET[i];
            if (this.textures.exists(key)) continue;

            const canvas = this.textures.createCanvas(key, size, size);
            const ctx = canvas.getContext();
            this.drawLetterTexture(ctx, i, size);
            canvas.refresh();
        }
    }

    drawLetterTexture(ctx, index, size) {
        const cx = size / 2;
        const cy = size / 2;
        const radius = size / 2 - 6;
        const baseColor = LETTER_COLORS[index];

        const gradient = ctx.createRadialGradient(cx - 10, cy - 10, 10, cx, cy, radius);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.3, baseColor);
        gradient.addColorStop(1, darkenColor(baseColor, 0.5));
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        const highlight = ctx.createRadialGradient(cx - 15, cy - 20, 5, cx - 10, cy - 15, 40);
        highlight.addColorStop(0, 'rgba(255,255,255,0.6)');
        highlight.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = highlight;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.font = 'bold 72px "Arial Black", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillText(ALPHABET[index], cx + 2, cy + 4);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(ALPHABET[index], cx, cy);
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 2;
        ctx.strokeText(ALPHABET[index], cx, cy);
    }

    // ═════════════════════════════════════════════════════════
    //  KNIFE
    // ═════════════════════════════════════════════════════════

    createKnife() {
        this.knife = this.add.text(GAME_W / 2, GAME_H * 0.6, '🔪', {
            fontSize: '56px'
        }).setOrigin(0.5);

        this.physics.add.existing(this.knife);
        this.knife.body.setAllowGravity(false);
        this.knife.body.setSize(50, 50);

        this.isDraggingKnife = false;

        this.input.on('pointerdown', (pointer) => {
            this.isDraggingKnife = true;
            this.knife.x = pointer.x;
            this.knife.y = pointer.y;
            if (this.knifeBobTween) this.knifeBobTween.stop();
        });

        this.input.on('pointermove', (pointer) => {
            if (!pointer.isDown) return;
            this.knife.x = pointer.x;
            this.knife.y = pointer.y;
        });

        this.input.on('pointerup', () => {
            this.isDraggingKnife = false;
            this.knifeBobTween = this.tweens.add({
                targets: this.knife,
                y: this.knife.y - 8,
                duration: 1200,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        });

        this.knifeBobTween = this.tweens.add({
            targets: this.knife,
            y: this.knife.y - 8,
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    // ═════════════════════════════════════════════════════════
    //  HUD
    // ═════════════════════════════════════════════════════════

    createHUD() {
        this.progressText = this.add.text(GAME_W / 2, 40, '0 / 26', {
            fontSize: '32px',
            fontFamily: 'Arial Black, Arial, sans-serif',
            fill: '#ffffff',
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(100);

        this.add.text(GAME_W / 2, 72, 'LETTERS SLICED', {
            fontSize: '14px',
            fontFamily: 'Arial, sans-serif',
            fill: '#aaaacc'
        }).setOrigin(0.5).setDepth(100);

        this.letterAnnounce = this.add.text(GAME_W / 2, GAME_H * 0.35, '', {
            fontSize: '80px',
            fontFamily: 'Arial Black, Arial, sans-serif',
            fill: '#FFD700',
            stroke: '#000',
            strokeThickness: 6,
            shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 10, fill: true }
        }).setOrigin(0.5).setAlpha(0).setDepth(100);
    }

    // ═════════════════════════════════════════════════════════
    //  COLLISION & INPUT WIRING
    // ═════════════════════════════════════════════════════════

    setupCollision() {
        this.physics.add.overlap(
            this.knife, this.letterGroup, this.onCut, null, this
        );
    }

    setupLauncher() {
        this.launchTimer = this.time.addEvent({
            delay: LAUNCH_INTERVAL,
            callback: this.tryLaunchLetter,
            callbackScope: this,
            loop: true
        });
        this.time.delayedCall(FIRST_LAUNCH_DELAY, () => this.tryLaunchLetter());
    }

    setupTrailInput() {
        this.input.on('pointermove', (pointer) => {
            if (!pointer.isDown) return;
            this.knifeTrailPoints.push({ x: pointer.x, y: pointer.y, time: this.time.now });
            if (this.knifeTrailPoints.length > TRAIL_MAX_POINTS) {
                this.knifeTrailPoints.shift();
            }
        });
    }

    // ═════════════════════════════════════════════════════════
    //  LETTER LAUNCHING
    // ═════════════════════════════════════════════════════════

    tryLaunchLetter() {
        if (!this.canLaunch) return;
        if (this.activeLetter && this.activeLetter.active) return;
        if (this.remainingLetters.length === 0) return;
        this.launchLetter();
    }

    launchLetter() {
        const letter = this.remainingLetters[0];
        const x = PMath.Between(100, GAME_W - 100);

        const sprite = this.letterGroup.create(x, GAME_H + 80, 'letter_' + letter);
        sprite.setScale(0.9);
        sprite.setData('letter', letter);
        sprite.setCircle(70);

        sprite.setVelocity(
            PMath.Between(LETTER_VELOCITY_X.min, LETTER_VELOCITY_X.max),
            PMath.Between(LETTER_VELOCITY_Y.min, LETTER_VELOCITY_Y.max)
        );
        sprite.body.setGravityY(LETTER_GRAVITY_Y);
        sprite.body.setAllowGravity(true);

        sprite.setAngularVelocity(
            PMath.Between(LETTER_ANGULAR_VEL.min, LETTER_ANGULAR_VEL.max)
        );

        this.activeLetter = sprite;
        this.announceLetter(letter);
    }

    announceLetter(letter) {
        this.letterAnnounce.setText(letter + '!');
        this.letterAnnounce.setAlpha(1).setScale(0.5);
        this.tweens.add({
            targets: this.letterAnnounce,
            scale: 1.2, alpha: 0,
            duration: 800,
            ease: 'Cubic.easeOut'
        });
    }

    // ═════════════════════════════════════════════════════════
    //  CUTTING
    // ═════════════════════════════════════════════════════════

    onCut(_knife, letterSprite) {
        const letter = letterSprite.getData('letter');
        if (!letter) return;
        letterSprite.setData('letter', null);

        this.completedLetters.add(letter);
        const idx = this.remainingLetters.indexOf(letter);
        if (idx > -1) this.remainingLetters.splice(idx, 1);

        this.playCutEffects(letterSprite.x, letterSprite.y, letter);

        letterSprite.destroy();
        this.activeLetter = null;

        this.updateProgress();
        this.checkWin();
    }

    playCutEffects(x, y, letter) {
        this.createCutExplosion(x, y, letter);
        this.showCutFeedback(x, y, letter);
        this.cameras.main.shake(120, 0.008);
        this.cameras.main.flash(100, 255, 255, 255, false, null, null, 0.15);
    }

    createCutExplosion(x, y, letter) {
        const tint = hexToInt(LETTER_COLORS[letter.charCodeAt(0) - 65]);

        ensureParticleTexture(this);
        ensureChunkTexture(this);

        const emitter = this.add.particles(x, y, 'particle', {
            speed: { min: 150, max: 400 },
            angle: { min: 0, max: 360 },
            scale: { start: 1.5, end: 0 },
            lifespan: { min: 300, max: 700 },
            tint: [tint, 0xffffff, tint],
            blendMode: 'ADD',
            quantity: 15,
            emitting: false
        });
        emitter.explode(15);
        this.time.delayedCall(1000, () => emitter.destroy());

        for (let i = 0; i < 8; i++) {
            const chunk = this.add.image(x, y, 'chunk').setTint(tint)
                .setScale(PMath.FloatBetween(0.6, 1.5))
                .setAlpha(0.9);

            const angle = (Math.PI * 2 * i) / 8 + PMath.FloatBetween(-0.3, 0.3);
            const dist = PMath.Between(80, 200);

            this.tweens.add({
                targets: chunk,
                x: x + Math.cos(angle) * dist,
                y: y + Math.sin(angle) * dist + PMath.Between(100, 250),
                alpha: 0,
                angle: PMath.Between(-360, 360),
                scale: 0,
                duration: PMath.Between(500, 900),
                ease: 'Cubic.easeOut',
                onComplete: () => chunk.destroy()
            });
        }

        const slashGfx = this.add.graphics();
        slashGfx.lineStyle(4, tint, 1);
        const a = PMath.FloatBetween(-0.5, 0.5);
        const len = 80;
        slashGfx.beginPath();
        slashGfx.moveTo(x - Math.cos(a) * len, y - Math.sin(a) * len);
        slashGfx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
        slashGfx.strokePath();
        this.tweens.add({
            targets: slashGfx, alpha: 0, duration: 300,
            onComplete: () => slashGfx.destroy()
        });
    }

    showCutFeedback(x, y, letter) {
        const feedback = this.add.text(x, y - 20, letter + ' ✓', {
            fontSize: '42px',
            fontFamily: 'Arial Black, Arial, sans-serif',
            fill: '#00FF88',
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(100);

        this.tweens.add({
            targets: feedback,
            y: y - 120, alpha: 0, scale: 1.5,
            duration: 800,
            ease: 'Cubic.easeOut',
            onComplete: () => feedback.destroy()
        });
    }

    updateProgress() {
        this.progressText.setText(this.completedLetters.size + ' / 26');
        this.tweens.add({
            targets: this.progressText,
            scale: 1.4, duration: 150,
            yoyo: true, ease: 'Back.easeOut'
        });
    }

    checkWin() {
        if (this.completedLetters.size < TOTAL_LETTERS) return;
        this.canLaunch = false;
        this.launchTimer.remove();
        this.time.delayedCall(1200, () => {
            this.cameras.main.fade(500, 0, 0, 0);
            this.time.delayedCall(500, () => this.scene.start('WinScene'));
        });
    }

    // ═════════════════════════════════════════════════════════
    //  MISSED LETTER
    // ═════════════════════════════════════════════════════════

    handleMissedLetter() {
        const letter = this.activeLetter.getData('letter');
        if (letter) {
            const idx = this.remainingLetters.indexOf(letter);
            if (idx > -1) this.remainingLetters.splice(idx, 1);
            const insertAt = PMath.Between(
                Math.min(1, this.remainingLetters.length),
                this.remainingLetters.length
            );
            this.remainingLetters.splice(insertAt, 0, letter);
            this.showMissedIndicator();
        }
        this.activeLetter.destroy();
        this.activeLetter = null;
    }

    showMissedIndicator() {
        const missText = this.add.text(GAME_W / 2, GAME_H * 0.4, 'MISSED!', {
            fontSize: '36px',
            fontFamily: 'Arial Black, Arial, sans-serif',
            fill: '#FF4444',
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(100);

        this.tweens.add({
            targets: missText,
            y: GAME_H * 0.35, alpha: 0,
            duration: 600, ease: 'Cubic.easeOut',
            onComplete: () => missText.destroy()
        });
    }

    // ═════════════════════════════════════════════════════════
    //  KNIFE TRAIL
    // ═════════════════════════════════════════════════════════

    drawTrail() {
        this.trailGfx.clear();
        const now = this.time.now;

        this.knifeTrailPoints = this.knifeTrailPoints.filter(
            p => now - p.time < TRAIL_LIFETIME_MS
        );
        if (this.knifeTrailPoints.length < 2) return;

        for (let i = 1; i < this.knifeTrailPoints.length; i++) {
            const p0 = this.knifeTrailPoints[i - 1];
            const p1 = this.knifeTrailPoints[i];
            const age = (now - p1.time) / TRAIL_LIFETIME_MS;
            this.trailGfx.lineStyle((1 - age) * 6 + 1, 0xffffff, (1 - age) * 0.7);
            this.trailGfx.beginPath();
            this.trailGfx.moveTo(p0.x, p0.y);
            this.trailGfx.lineTo(p1.x, p1.y);
            this.trailGfx.strokePath();
        }
    }

    // ═════════════════════════════════════════════════════════
    //  GAME LOOP
    // ═════════════════════════════════════════════════════════

    update() {
        if (this.activeLetter && this.activeLetter.active && this.activeLetter.y > GAME_H + 100) {
            this.handleMissedLetter();
        }
        this.drawTrail();
    }
}
