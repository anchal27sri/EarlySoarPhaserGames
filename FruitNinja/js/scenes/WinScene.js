// =========================================================
//  WIN SCENE — Congratulations screen after all 26 letters
//              are sliced. Shows celebration effects and
//              offers Replay / Exit buttons.
// =========================================================
//
//  LAYOUT:
//    ┌──────────────────────┐
//    │   ⭐  ⭐  ⭐  ⭐      │  stars float in upper region
//    │       🏆             │  y = 0.18 × 960 = 173
//    │                      │
//    │  CONGRATULATIONS!    │  y = 0.32 × 960 = 307
//    │  You sliced all 26   │  y = 0.39 × 960 = 374
//    │                      │
//    │   A B C D E F G      │  y = 0.46 × 960 = 442  (letter grid)
//    │   H I J K L M N      │  (7 columns × 4 rows)
//    │   O P Q R S T U      │
//    │   V W X Y Z          │
//    │                      │
//    │  [🔄 PLAY AGAIN]     │  y = 0.78 × 960 = 749
//    │  [🚪 EXIT]           │  y = 0.86 × 960 = 826
//    │  ··confetti falls··  │
//    └──────────────────────┘
//

class WinScene extends Phaser.Scene {
    constructor() {
        super({ key: 'WinScene' });
    }

    create() {
        // Dark gradient background (r: 10→30, g: 15→25, b: 40→70)
        drawGradientBackground(this, { r0: 10, rD: 20, g0: 15, gD: 10, b0: 40, bD: 30 });

        // Fade in from black over 500 ms
        this.cameras.main.fadeIn(500);

        this.createConfetti();
        this.createTrophy();
        this.createHeading();
        this.createLetterGrid();
        this.createStars();
        this.createButtons();
    }

    // ═════════════════════════════════════════════════════════
    //  DECORATIONS
    // ═════════════════════════════════════════════════════════

    /**
     * Pulsing trophy emoji at the top of the screen.
     *
     * ANIMATION MATH (Sine.easeInOut, period = 2000 ms):
     *   scale(t) = 1.0 + 0.15 × sin²(π·t / 2)
     *   Oscillates between 1.0× and 1.15× — a gentle "breathing"
     *   effect that draws the eye without being distracting.
     */
    createTrophy() {
        const trophy = this.add.text(GAME_W / 2, GAME_H * 0.18, '🏆', {
            fontSize: '100px'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: trophy,
            scale: 1.15,         // grow 15%
            duration: 1000,      // 1 s per half-cycle (2 s full period)
            yoyo: true,          // shrink back to 1.0×
            repeat: -1,          // loop forever
            ease: 'Sine.easeInOut'
        });
    }

    /**
     * "CONGRATULATIONS!" headline with gold text, black stroke,
     * and soft drop shadow. Subtitle below in plain white.
     */
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

    /**
     * 8 star emojis randomly placed in the upper region, each
     * floating up/down with a twinkling scale/alpha cycle.
     *
     * ANIMATION MATH per star (Sine.easeInOut):
     *   alpha: 0 → 1 → 0    (twinkle)
     *   y:     y₀ → y₀−20   (gentle float, 20 px rise)
     *   scale: 0.5 → 1.2    (grow from half to 120%)
     *   period: 3000 ms (1500 ms half-cycle × yoyo)
     *   delay:  random 200–1500 ms (staggered starts)
     *
     *   With 8 stars at random delays, they appear to twinkle
     *   independently like a night sky.
     */
    createStars() {
        for (let i = 0; i < 8; i++) {
            const star = this.add.text(
                Phaser.Math.Between(40, GAME_W - 40),       // random x across screen
                Phaser.Math.Between(50, GAME_H * 0.3),      // y in top 30% (50–288 px)
                '⭐',
                { fontSize: Phaser.Math.Between(20, 36) + 'px' }  // varied sizes
            ).setOrigin(0.5).setAlpha(0);  // start invisible

            this.tweens.add({
                targets: star,
                alpha: { from: 0, to: 1 },        // fade in
                y: star.y - 20,                     // float up 20 px
                scale: { from: 0.5, to: 1.2 },     // grow
                duration: 1500,                      // 1.5 s half-cycle
                delay: Phaser.Math.Between(200, 1500), // staggered start
                yoyo: true,                          // reverse back
                repeat: -1,                          // loop forever
                ease: 'Sine.easeInOut'
            });
        }
    }

    // ═════════════════════════════════════════════════════════
    //  LETTER GRID (A–Z displayed in a 7-column grid)
    // ═════════════════════════════════════════════════════════

    /**
     * Displays all 26 letters in a grid with a staggered pop-in.
     *
     * GRID LAYOUT MATH:
     *   7 columns, 4 rows (last row has 5 letters: V W X Y Z)
     *   cellW = 60 px,  cellH = 55 px
     *
     *   Grid origin X:
     *     startX = GAME_W/2 − (7 × 60)/2 + 60/2
     *            = 270 − 210 + 30 = 90 px  (left edge of first cell)
     *
     *   For letter i:
     *     col = i % 7
     *     row = floor(i / 7)
     *     x = 90 + col × 60
     *     y = 442 + row × 55   (startY = 0.46 × 960)
     *
     * STAGGERED POP-IN ANIMATION (Back.easeOut):
     *   Each letter starts at alpha=0, scale=0 and tweens to
     *   alpha=1, scale=1 over 300 ms.
     *   Delay = 50 × i + 300 ms  (letters appear one by one,
     *   50 ms apart, with an initial 300 ms pause).
     *
     *   Back.easeOut curve:
     *     f(t) = 1 + c₃·(t−1)³ + c₁·(t−1)²
     *     where c₁ = 1.70158, c₃ = c₁ + 1 = 2.70158
     *   This overshoots scale=1 briefly (to ~1.1) then settles,
     *   creating a playful "bounce in" for each letter.
     */
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
            }).setOrigin(0.5).setAlpha(0).setScale(0);  // hidden initially

            this.tweens.add({
                targets: txt,
                alpha: 1, scale: 1,
                duration: 300,
                delay: 50 * i + 300,    // staggered: A at 300 ms, B at 350 ms, …
                ease: 'Back.easeOut'    // overshoot-settle effect
            });
        }
    }

    // ═════════════════════════════════════════════════════════
    //  CONFETTI (continuous particle rain)
    // ═════════════════════════════════════════════════════════

    /**
     * Spawns a continuous stream of multi-coloured confetti squares
     * falling from above the screen.
     *
     * PARTICLE MATH:
     *   - Spawn position: random x ∈ [0, 540], y = −20 (above screen)
     *   - speedY: 80–200 px/s downward (gentle fall)
     *   - speedX: −50 to +50 px/s (slight lateral drift)
     *   - rotate: 0–360° (random initial rotation)
     *   - scale:  0.7 → 0.3 over lifespan (shrink as they fall)
     *   - lifespan: 3–5 seconds
     *   - frequency: 150 ms between emissions, 2 particles each
     *     → ~13 particles/sec continuously
     *   - tint: randomly picked from 7 celebration colours
     */
    createConfetti() {
        ensureConfettiTexture(this);

        this.add.particles(0, 0, 'confetti', {
            x: { min: 0, max: GAME_W },
            y: -20,                                // just above visible area
            speedY: { min: 80, max: 200 },          // fall speed
            speedX: { min: -50, max: 50 },           // lateral drift
            rotate: { min: 0, max: 360 },            // tumble
            scale: { start: 0.7, end: 0.3 },         // shrink over lifetime
            lifespan: { min: 3000, max: 5000 },       // 3–5 s
            tint: [0xFF6B6B, 0xFFCD56, 0x4BC0C0, 0x36A2EB, 0x9966FF, 0xFF6384, 0xFFD700],
            frequency: 150,  // emit every 150 ms
            quantity: 2       // 2 particles per emission
        });
    }

    // ═════════════════════════════════════════════════════════
    //  BUTTONS
    // ═════════════════════════════════════════════════════════

    /**
     * Creates "Play Again" and "Exit" buttons using the shared
     * createRoundedButton() utility.
     *
     * Each button triggers a 400 ms camera fade-to-black, then
     * transitions to the target scene.
     */
    createButtons() {
        // Teal "Play Again" → restarts GameScene
        createRoundedButton(this, GAME_W / 2, GAME_H * 0.78, '🔄  PLAY AGAIN', '#4BC0C0', () => {
            this.cameras.main.fade(400, 0, 0, 0);
            this.time.delayedCall(400, () => this.scene.start('GameScene'));
        });

        // Red "Exit" → returns to BootScene (title screen)
        createRoundedButton(this, GAME_W / 2, GAME_H * 0.86, '🚪  EXIT', '#FF6B6B', () => {
            this.cameras.main.fade(400, 0, 0, 0);
            this.time.delayedCall(400, () => this.scene.start('BootScene'));
        });
    }
}
