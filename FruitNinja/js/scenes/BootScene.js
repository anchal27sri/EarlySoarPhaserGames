// =========================================================
//  BOOT SCENE — Title / splash screen shown on game start
// =========================================================
//
//  Layout (all positions relative to the 540×960 canvas):
//    ┌──────────────────────┐
//    │                      │  y = 0
//    │   🔪 FRUIT NINJA     │  y = 0.30 × 960 = 288
//    │        ABC           │
//    │                      │
//    │   Learn your letters │  y = 0.52 × 960 = 499
//    │   by slicing them!   │
//    │                      │
//    │  [floating letters]  │  y = 0.60–0.95 × 960
//    │                      │
//    │   👆 TAP TO START     │  y = 0.75 × 960 = 720
//    └──────────────────────┘  y = 960
//

class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    create() {
        // Paint a dark purple-to-indigo vertical gradient
        // (r: 26→36, g: 10→30, b: 46→86 across 20 bands)
        drawGradientBackground(this, { r0: 26, rD: 10, g0: 10, gD: 20, b0: 46, bD: 40 });

        this.createTitle();
        this.createSubtitle();
        this.createFloatingLetters();
        this.createStartPrompt();

        // On first tap, fade camera to black over 400 ms, then switch scene
        this.input.once('pointerdown', () => {
            this.cameras.main.fade(400, 0, 0, 0);
            this.time.delayedCall(400, () => this.scene.start('GameScene'));
        });
    }

    /** Main title with red stroke outline and drop shadow. */
    createTitle() {
        this.add.text(GAME_W / 2, GAME_H * 0.3, '🔪 FRUIT NINJA\nABC', {
            fontSize: '64px',
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontStyle: 'bold',
            fill: '#ffffff',
            stroke: '#ff4444',
            strokeThickness: 8,
            align: 'center',
            // Shadow offset (3,3) with 8 px blur gives a soft 3D lift
            shadow: { offsetX: 3, offsetY: 3, color: '#000', blur: 8, fill: true }
        }).setOrigin(0.5);
    }

    /** Instructional subtitle in soft blue. */
    createSubtitle() {
        this.add.text(GAME_W / 2, GAME_H * 0.52, 'Learn your letters\nby slicing them!', {
            fontSize: '28px',
            fontFamily: 'Arial, sans-serif',
            fill: '#ccccff',
            align: 'center',
            lineSpacing: 8
        }).setOrigin(0.5);
    }

    /**
     * 12 random letters that float gently in the lower portion
     * of the screen as a decorative backdrop.
     *
     * ANIMATION MATH (per letter):
     *   - Start position: random x ∈ [40, 500], y ∈ [576, 912]
     *   - Tween moves y upward by 20–60 px with Sine.easeInOut
     *     (smooth acceleration/deceleration, period = 2–4 s)
     *   - Alpha fades from 0.15 → 0.05 (very subtle ghosting)
     *   - yoyo: true + repeat: -1 → oscillates forever
     *
     *   The Sine.easeInOut curve is:
     *     f(t) = 0.5 − 0.5 × cos(π × t)     for t ∈ [0, 1]
     *   This maps linearly increasing time to a smooth S-curve,
     *   so each letter gently drifts up, pauses, then drifts back.
     */
    createFloatingLetters() {
        for (let i = 0; i < 12; i++) {
            const ch = ALPHABET[Phaser.Math.Between(0, 25)];
            const x = Phaser.Math.Between(40, GAME_W - 40);
            const y = Phaser.Math.Between(GAME_H * 0.6, GAME_H * 0.95);

            const txt = this.add.text(x, y, ch, {
                fontSize: Phaser.Math.Between(24, 48) + 'px',
                fontFamily: 'Arial Black, Arial, sans-serif',
                fill: LETTER_COLORS[Phaser.Math.Between(0, 25)],
                alpha: 0.15   // mostly transparent — background decoration
            }).setOrigin(0.5);

            this.tweens.add({
                targets: txt,
                y: txt.y - Phaser.Math.Between(20, 60),  // drift upward
                alpha: 0.05,                               // fade further
                duration: Phaser.Math.Between(2000, 4000), // 2–4 s half-cycle
                yoyo: true,    // return to start after reaching target
                repeat: -1,    // loop forever
                ease: 'Sine.easeInOut'
            });
        }
    }

    /**
     * "TAP TO START" prompt with a pulsing opacity animation.
     *
     * ANIMATION MATH:
     *   alpha oscillates between 1.0 → 0.3 → 1.0 over 1600 ms total
     *   (800 ms per half-cycle, using Sine.easeInOut for smooth pulsing).
     *   f(t) = 1.0 − 0.7 × (0.5 − 0.5 × cos(π × t))
     *   This creates a gentle "breathing" effect to attract attention.
     */
    createStartPrompt() {
        const startText = this.add.text(GAME_W / 2, GAME_H * 0.75, '👆 TAP TO START', {
            fontSize: '36px',
            fontFamily: 'Arial Black, Arial, sans-serif',
            fill: '#FFD700',
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(0.5);

        this.tweens.add({
            targets: startText,
            alpha: 0.3,          // fade to 30% opacity
            duration: 800,       // 800 ms per half-cycle
            yoyo: true,          // bounce back to alpha = 1.0
            repeat: -1,          // loop forever
            ease: 'Sine.easeInOut'
        });
    }
}
