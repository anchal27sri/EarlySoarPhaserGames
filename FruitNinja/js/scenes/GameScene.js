// =========================================================
//  GAME SCENE — Core gameplay: launch letters, drag knife,
//               detect cuts, play effects, track progress
// =========================================================
//
//  GAME LOOP OVERVIEW
//  ──────────────────
//  1. Letters are launched one at a time from below the screen
//     on a repeating timer (every LAUNCH_INTERVAL ms).
//  2. Each letter follows a parabolic arc (Arcade physics):
//       x(t) = x₀ + Vx·t
//       y(t) = y₀ + Vy·t + ½·g·t²
//     It rises to an apex near mid-screen, then falls back down.
//  3. The player drags the knife emoji (🔪) across the screen.
//  4. If the knife's physics body overlaps a letter's body,
//     onCut() fires → explosion + feedback + progress update.
//  5. If a letter falls off-screen (y > GAME_H + 100) without
//     being cut, it's re-queued in remainingLetters for retry.
//  6. When all 26 letters have been cut → transition to WinScene.
//

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
        // Dark navy gradient background (r: 10→26, g: 5→15, b: 30→80)
        drawGradientBackground(this, { r0: 10, rD: 16, g0: 5, gD: 10, b0: 30, bD: 50 });

        // ── State initialisation ────────────────────────────
        this.completedLetters  = new Set();  // letters the player has successfully cut
        this.remainingLetters  = Phaser.Utils.Array.Shuffle(ALPHABET.split(''));  // randomised queue
        this.activeLetter      = null;       // the sprite currently on screen (or null)
        this.knifeTrailPoints  = [];         // ring buffer of {x, y, time} for slash trail
        this.canLaunch         = true;       // set to false after winning to stop launches

        // Pre-render 26 letter orb textures to Canvas textures
        this.generateLetterTextures();

        // Arcade physics group that will hold the active letter sprite
        this.letterGroup = this.physics.add.group();

        // Graphics object redrawn every frame for the slash trail
        this.trailGfx = this.add.graphics();

        this.createKnife();
        this.createHUD();
        this.setupCollision();
        this.setupLauncher();
        this.setupTrailInput();

        // Fade in from black over 400 ms when the scene starts
        this.cameras.main.fadeIn(400);
    }

    // ═════════════════════════════════════════════════════════
    //  TEXTURE GENERATION
    // ═════════════════════════════════════════════════════════

    /**
     * Creates a 140×140 Canvas texture for each of the 26 letters.
     * Textures are keyed as 'letter_A', 'letter_B', … 'letter_Z'.
     * Only generated once — subsequent scene restarts reuse them.
     */
    generateLetterTextures() {
        const size = 140;
        for (let i = 0; i < TOTAL_LETTERS; i++) {
            const key = 'letter_' + ALPHABET[i];
            if (this.textures.exists(key)) continue;  // skip if already cached

            const canvas = this.textures.createCanvas(key, size, size);
            const ctx = canvas.getContext();   // HTML5 Canvas 2D context
            this.drawLetterTexture(ctx, i, size);
            canvas.refresh();  // upload to GPU
        }
    }

    /**
     * Paints a single letter orb onto a 2D canvas context.
     *
     * VISUAL LAYERS (bottom to top):
     *   1. Radial-gradient circle   — 3D sphere illusion
     *   2. Glossy highlight ellipse — specular reflection
     *   3. Dark border stroke       — edge definition
     *   4. Drop-shadow text         — depth for the letter glyph
     *   5. White text               — the letter itself
     *   6. Dark text outline        — readability against any bg
     *
     * RADIAL GRADIENT MATH:
     *   The gradient has its bright centre offset to (-10, -10)
     *   from the true centre, simulating a light source at the
     *   upper-left. Three colour stops create the 3D look:
     *     stop 0.0 → white       (specular hotspot)
     *     stop 0.3 → base colour (letter's assigned colour)
     *     stop 1.0 → darkened    (base × 0.5 — shadow edge)
     *
     * GLOSSY HIGHLIGHT MATH:
     *   A second radial gradient centred at (-15, -20) with a
     *   small inner radius (5 px) and larger outer (40 px) creates
     *   a crescent-shaped specular highlight:
     *     stop 0 → rgba(255,255,255, 0.6)  (bright)
     *     stop 1 → rgba(255,255,255, 0)    (invisible)
     */
    drawLetterTexture(ctx, index, size) {
        const cx = size / 2;        // 70 — canvas centre X
        const cy = size / 2;        // 70 — canvas centre Y
        const radius = size / 2 - 6; // 64 — orb radius (6 px padding for anti-alias)
        const baseColor = LETTER_COLORS[index];

        // Layer 1: Radial gradient fill (3D sphere)
        const gradient = ctx.createRadialGradient(cx - 10, cy - 10, 10, cx, cy, radius);
        gradient.addColorStop(0, '#ffffff');                  // highlight centre
        gradient.addColorStop(0.3, baseColor);                // letter colour
        gradient.addColorStop(1, darkenColor(baseColor, 0.5)); // darkened edge
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Layer 2: Glossy highlight (upper-left crescent)
        const highlight = ctx.createRadialGradient(cx - 15, cy - 20, 5, cx - 10, cy - 15, 40);
        highlight.addColorStop(0, 'rgba(255,255,255,0.6)');
        highlight.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = highlight;
        ctx.fill();

        // Layer 3: Thin dark border
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Layer 4–6: Letter glyph with shadow + fill + outline
        ctx.font = 'bold 72px "Arial Black", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Shadow (offset +2, +4 from centre)
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillText(ALPHABET[index], cx + 2, cy + 4);
        // White fill
        ctx.fillStyle = '#ffffff';
        ctx.fillText(ALPHABET[index], cx, cy);
        // Dark outline for contrast
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 2;
        ctx.strokeText(ALPHABET[index], cx, cy);
    }

    // ═════════════════════════════════════════════════════════
    //  KNIFE (draggable cutting tool)
    // ═════════════════════════════════════════════════════════

    /**
     * Creates the knife as a Text object using the 🔪 emoji.
     *
     * Setup:
     *  - Placed at centre-X, 60% down the screen (x=270, y=576)
     *  - A 50×50 px Arcade physics body is attached for overlap
     *    detection with letters (gravity disabled for the knife).
     *  - The knife follows the pointer directly via scene-level
     *    pointerdown and pointermove events. This means the user
     *    can touch ANYWHERE on the screen and the knife instantly
     *    jumps there — no need to start the drag on the knife itself.
     *
     * IDLE BOB ANIMATION:
     *   When the player isn't touching, the knife gently floats
     *   up and down by 8 px using a Sine.easeInOut tween:
     *     y(t) = y₀ − 8 × sin²(π·t / 2)     (period = 2400 ms)
     *   The tween is STOPPED when the pointer goes down and
     *   RESTARTED from the knife's current position when released,
     *   to prevent the tween from fighting with pointer input.
     */
    createKnife() {
        this.knife = this.add.text(GAME_W / 2, GAME_H * 0.6, '🔪', {
            fontSize: '56px'
        }).setOrigin(0.5);

        // Attach a physics body (no gravity) for overlap detection
        this.physics.add.existing(this.knife);
        this.knife.body.setAllowGravity(false);
        this.knife.body.setSize(50, 50);  // collision rectangle

        // Track whether the player is currently touching the screen
        this.isDraggingKnife = false;

        // When the player touches anywhere → jump knife there immediately
        this.input.on('pointerdown', (pointer) => {
            this.isDraggingKnife = true;
            this.knife.x = pointer.x;
            this.knife.y = pointer.y;
            // Stop the idle bob so it doesn't fight with pointer position
            if (this.knifeBobTween) this.knifeBobTween.stop();
        });

        // While finger/mouse moves with pointer held → knife follows
        this.input.on('pointermove', (pointer) => {
            if (!pointer.isDown) return;
            this.knife.x = pointer.x;
            this.knife.y = pointer.y;
        });

        // When the player lifts finger/mouse → restart idle bob
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

        // Start the idle bob tween
        this.knifeBobTween = this.tweens.add({
            targets: this.knife,
            y: this.knife.y - 8,   // 8 px upward
            duration: 1200,         // 1.2 s per half-cycle
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    // ═════════════════════════════════════════════════════════
    //  HUD (heads-up display)
    // ═════════════════════════════════════════════════════════

    /** Creates the progress counter ("0 / 26") and letter announcement text. */
    createHUD() {
        // Progress counter at top-centre (depth 100 = always on top)
        this.progressText = this.add.text(GAME_W / 2, 40, '0 / 26', {
            fontSize: '32px',
            fontFamily: 'Arial Black, Arial, sans-serif',
            fill: '#ffffff',
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(100);

        // Label beneath the counter
        this.add.text(GAME_W / 2, 72, 'LETTERS SLICED', {
            fontSize: '14px',
            fontFamily: 'Arial, sans-serif',
            fill: '#aaaacc'
        }).setOrigin(0.5).setDepth(100);

        // Large letter announcement (e.g. "A!") — hidden by default (alpha 0)
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

    /**
     * Registers an overlap check between the knife's physics body
     * and any sprite in letterGroup. Arcade overlap (vs. collider)
     * fires the callback without physically separating the bodies —
     * the knife should pass through, not bounce off.
     */
    setupCollision() {
        this.physics.add.overlap(
            this.knife, this.letterGroup, this.onCut, null, this
        );
    }

    /**
     * Sets up two timers:
     *   1. A repeating timer that tries to launch a letter every
     *      LAUNCH_INTERVAL ms (2000 ms = 2 s).
     *   2. A one-shot delay (500 ms) so the first letter appears
     *      quickly after the scene starts.
     */
    setupLauncher() {
        this.launchTimer = this.time.addEvent({
            delay: LAUNCH_INTERVAL,
            callback: this.tryLaunchLetter,
            callbackScope: this,
            loop: true
        });
        this.time.delayedCall(FIRST_LAUNCH_DELAY, () => this.tryLaunchLetter());
    }

    /**
     * Records pointer positions into knifeTrailPoints whenever
     * the pointer is down and moving. This data drives the
     * slash trail drawn each frame in drawTrail().
     */
    setupTrailInput() {
        this.input.on('pointermove', (pointer) => {
            if (!pointer.isDown) return;
            this.knifeTrailPoints.push({ x: pointer.x, y: pointer.y, time: this.time.now });
            // Cap the buffer at TRAIL_MAX_POINTS (20) — oldest removed first
            if (this.knifeTrailPoints.length > TRAIL_MAX_POINTS) {
                this.knifeTrailPoints.shift();
            }
        });
    }

    // ═════════════════════════════════════════════════════════
    //  LETTER LAUNCHING
    // ═════════════════════════════════════════════════════════

    /**
     * Guard: only launches if canLaunch is true, no letter is
     * already active on screen, and letters remain in the queue.
     */
    tryLaunchLetter() {
        if (!this.canLaunch) return;
        if (this.activeLetter && this.activeLetter.active) return;
        if (this.remainingLetters.length === 0) return;
        this.launchLetter();
    }

    /**
     * Takes the first letter from remainingLetters and launches
     * it as an Arcade physics sprite.
     *
     * PROJECTILE MATH:
     *   The letter starts at (randomX, GAME_H + 80) — 80 px below
     *   the visible screen bottom.
     *
     *   Velocity is set to:
     *     Vx ∈ [−80, 80]   px/s  — slight horizontal drift
     *     Vy ∈ [−750, −600] px/s — upward launch (negative = up)
     *
     *   Gravity = 400 px/s²  (applied per-body, not globally)
     *
     *   Apex height:
     *     t_peak = |Vy| / g
     *     For Vy = −675 (midpoint): t_peak = 675/400 = 1.6875 s
     *     Δy = Vy² / (2g) = 675² / 800 ≈ 569 px
     *     Peak y ≈ (960+80) − 569 = 471 px  (mid-screen)
     *
     *   Time of flight (launch to return below screen):
     *     Using y(t) = y₀ + Vy·t + ½g·t², solving for y = y₀:
     *     t_total = 2·|Vy| / g ≈ 3.375 s
     *     The letter is visible for roughly 3.4 seconds.
     *
     *   Angular velocity ∈ [−120°, 120°] per second adds a
     *   tumbling spin to the orb while airborne.
     *
     *   Collision body: circle with radius 70 px (inscribed in
     *   the 140×140 texture, scaled to 0.9× → effective ~63 px).
     */
    launchLetter() {
        const letter = this.remainingLetters[0];
        const x = Phaser.Math.Between(100, GAME_W - 100);  // keep away from edges

        const sprite = this.letterGroup.create(x, GAME_H + 80, 'letter_' + letter);
        sprite.setScale(0.9);              // slightly smaller than raw texture
        sprite.setData('letter', letter);  // tag for identification on cut
        sprite.setCircle(70);              // circular physics body (radius = half of 140)

        // Apply launch velocity and per-body gravity
        sprite.setVelocity(
            Phaser.Math.Between(LETTER_VELOCITY_X.min, LETTER_VELOCITY_X.max),
            Phaser.Math.Between(LETTER_VELOCITY_Y.min, LETTER_VELOCITY_Y.max)
        );
        sprite.body.setGravityY(LETTER_GRAVITY_Y);
        sprite.body.setAllowGravity(true);

        // Tumbling rotation
        sprite.setAngularVelocity(
            Phaser.Math.Between(LETTER_ANGULAR_VEL.min, LETTER_ANGULAR_VEL.max)
        );

        this.activeLetter = sprite;
        this.announceLetter(letter);
    }

    /**
     * Briefly flashes the letter name (e.g. "A!") at centre-screen.
     *
     * ANIMATION MATH (Cubic.easeOut):
     *   scale:  0.5 → 1.2  (grows 2.4×)
     *   alpha:  1.0 → 0.0  (fades out)
     *   duration: 800 ms
     *
     *   Cubic.easeOut curve:  f(t) = 1 − (1−t)³
     *   Fast start, slow finish — the text zooms in quickly
     *   then gently fades away.
     */
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
    //  CUTTING (overlap callback + effects)
    // ═════════════════════════════════════════════════════════

    /**
     * Called by physics.overlap when the knife body touches a letter.
     *
     * Flow:
     *  1. Read the letter tag (returns null if already cut — prevents double-fire)
     *  2. Null the tag immediately to guard against overlaps on the same frame
     *  3. Add to completedLetters set, remove from remainingLetters array
     *  4. Play cut VFX (explosion, feedback text, camera shake + flash)
     *  5. Destroy the letter sprite and clear activeLetter
     *  6. Update the HUD counter and check for win condition
     */
    onCut(_knife, letterSprite) {
        const letter = letterSprite.getData('letter');
        if (!letter) return;           // already handled (double-overlap guard)
        letterSprite.setData('letter', null);  // mark as consumed

        // Move from remaining → completed
        this.completedLetters.add(letter);
        const idx = this.remainingLetters.indexOf(letter);
        if (idx > -1) this.remainingLetters.splice(idx, 1);

        this.playCutEffects(letterSprite.x, letterSprite.y, letter);

        letterSprite.destroy();
        this.activeLetter = null;

        this.updateProgress();
        this.checkWin();
    }

    /**
     * Orchestrates all visual feedback for a successful cut:
     *   - Particle explosion + flying chunks + slash line
     *   - Floating "A ✓" text
     *   - Camera shake (120 ms, intensity 0.008 = 0.8% of viewport)
     *   - Camera flash (100 ms, white at 15% opacity)
     */
    playCutEffects(x, y, letter) {
        this.createCutExplosion(x, y, letter);
        this.showCutFeedback(x, y, letter);
        // Shake: displaces camera by ±0.8% of its size for 120 ms
        this.cameras.main.shake(120, 0.008);
        // Flash: overlays white at 15% alpha, fades over 100 ms
        this.cameras.main.flash(100, 255, 255, 255, false, null, null, 0.15);
    }

    /**
     * Creates the multi-layered cut explosion at position (x, y).
     *
     * THREE LAYERS:
     *
     * 1) PARTICLE BURST (15 glowing dots)
     *    - Uses the 'particle' texture (16×16 radial gradient)
     *    - Emitted in a single burst (explode) from (x, y)
     *    - Speed: 150–400 px/s in all 360° directions
     *    - Scale: 1.5× → 0× over 300–700 ms (shrink to nothing)
     *    - Tint cycles: [letterColor, white, letterColor]
     *    - Blend mode ADD: colours add to background (glowing effect)
     *    - Destroyed after 1000 ms cleanup delay
     *
     * 2) FLYING CHUNKS (8 triangular shards)
     *    - Uses the 'chunk' texture (24×24 triangle)
     *    - 8 chunks evenly spaced around a circle (360°/8 = 45° apart)
     *      with ±0.3 rad (~17°) random jitter per chunk.
     *
     *    POSITION MATH (polar → cartesian):
     *      θᵢ = (2π × i) / 8 + random(−0.3, 0.3)
     *      targetX = x + cos(θᵢ) × dist     (dist ∈ [80, 200])
     *      targetY = y + sin(θᵢ) × dist + random(100, 250)
     *
     *      The extra +100–250 on Y simulates gravity pulling
     *      chunks downward as they fly outward.
     *
     *    Each chunk also tweens:
     *      - alpha: 0.9 → 0  (fade out)
     *      - angle: 0 → ±360°  (tumble)
     *      - scale: random(0.6–1.5) → 0  (shrink)
     *      - duration: 500–900 ms, Cubic.easeOut
     *
     * 3) SLASH LINE (single line graphic)
     *    - A 160 px line (±80 from centre) drawn at a random
     *      angle ∈ [−0.5, 0.5] radians (≈ ±29°).
     *
     *    ENDPOINT MATH:
     *      startX = x − cos(a) × 80
     *      startY = y − sin(a) × 80
     *      endX   = x + cos(a) × 80
     *      endY   = y + sin(a) × 80
     *
     *    - Fades to alpha 0 over 300 ms, then destroyed.
     */
    createCutExplosion(x, y, letter) {
        // Look up the letter's colour and convert to integer tint
        const tint = hexToInt(LETTER_COLORS[letter.charCodeAt(0) - 65]);

        // Ensure shared textures exist (created once, reused)
        ensureParticleTexture(this);
        ensureChunkTexture(this);

        // ── Layer 1: Particle burst ─────────────────────────
        const emitter = this.add.particles(x, y, 'particle', {
            speed: { min: 150, max: 400 },    // px/s outward
            angle: { min: 0, max: 360 },       // full circle
            scale: { start: 1.5, end: 0 },     // shrink to nothing
            lifespan: { min: 300, max: 700 },  // 0.3–0.7 s
            tint: [tint, 0xffffff, tint],       // colour cycling
            blendMode: 'ADD',                   // additive glow
            quantity: 15,
            emitting: false  // don't auto-emit; we call explode()
        });
        emitter.explode(15);  // fire all 15 at once
        this.time.delayedCall(1000, () => emitter.destroy());

        // ── Layer 2: Flying chunks ──────────────────────────
        for (let i = 0; i < 8; i++) {
            const chunk = this.add.image(x, y, 'chunk').setTint(tint)
                .setScale(Phaser.Math.FloatBetween(0.6, 1.5))
                .setAlpha(0.9);

            // Distribute 8 chunks around a circle with slight jitter
            const angle = (Math.PI * 2 * i) / 8 + Phaser.Math.FloatBetween(-0.3, 0.3);
            const dist = Phaser.Math.Between(80, 200);

            this.tweens.add({
                targets: chunk,
                // Polar-to-cartesian: (r, θ) → (r·cosθ, r·sinθ)
                x: x + Math.cos(angle) * dist,
                // +100–250 extra downward to simulate gravity on chunks
                y: y + Math.sin(angle) * dist + Phaser.Math.Between(100, 250),
                alpha: 0,                                     // fade out
                angle: Phaser.Math.Between(-360, 360),        // tumble
                scale: 0,                                      // shrink
                duration: Phaser.Math.Between(500, 900),
                ease: 'Cubic.easeOut',  // f(t) = 1−(1−t)³ — fast start, slow end
                onComplete: () => chunk.destroy()
            });
        }

        // ── Layer 3: Slash line ─────────────────────────────
        const slashGfx = this.add.graphics();
        slashGfx.lineStyle(4, tint, 1);
        const a = Phaser.Math.FloatBetween(-0.5, 0.5);  // radians
        const len = 80;  // half-length of slash
        slashGfx.beginPath();
        slashGfx.moveTo(x - Math.cos(a) * len, y - Math.sin(a) * len);
        slashGfx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
        slashGfx.strokePath();
        // Fade the slash line to invisible over 300 ms
        this.tweens.add({
            targets: slashGfx, alpha: 0, duration: 300,
            onComplete: () => slashGfx.destroy()
        });
    }

    /**
     * Shows a floating "A ✓" text that drifts upward and fades.
     *
     * ANIMATION MATH (Cubic.easeOut over 800 ms):
     *   y:     (cutY − 20) → (cutY − 120)  — rises 100 px
     *   alpha: 1 → 0                        — fades out
     *   scale: 1 → 1.5                      — grows 50%
     *
     *   Combined effect: text floats up, expands, and vanishes —
     *   a common "reward pop" pattern in games.
     */
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

    /**
     * Updates the "X / 26" counter and plays a pulse animation.
     *
     * PULSE ANIMATION (Back.easeOut over 150 ms × 2):
     *   scale: 1.0 → 1.4 → 1.0   (yoyo)
     *
     *   Back.easeOut:  f(t) = 1 + 2.70158·(t−1)³ + 1.70158·(t−1)²
     *   This overshoots slightly past 1.4 before settling back,
     *   giving a satisfying "pop" feel to the counter.
     */
    updateProgress() {
        this.progressText.setText(this.completedLetters.size + ' / 26');
        this.tweens.add({
            targets: this.progressText,
            scale: 1.4, duration: 150,
            yoyo: true, ease: 'Back.easeOut'
        });
    }

    /**
     * Checks if all 26 letters have been cut. If so:
     *   1. Disable further launches
     *   2. Remove the launch timer
     *   3. Wait 1200 ms (let the last explosion finish)
     *   4. Fade camera to black over 500 ms
     *   5. Transition to WinScene
     */
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
    //  MISSED LETTER HANDLING
    // ═════════════════════════════════════════════════════════

    /**
     * Called when the active letter falls below y = GAME_H + 100
     * (off-screen) without being cut.
     *
     * The letter is removed from its current position in the
     * remainingLetters queue, then re-inserted at a random later
     * index (at least index 1, so it won't be the very next letter).
     * This ensures the player will see it again, but not immediately.
     */
    handleMissedLetter() {
        const letter = this.activeLetter.getData('letter');
        if (letter) {
            // Remove the letter from wherever it sits in the queue
            const idx = this.remainingLetters.indexOf(letter);
            if (idx > -1) this.remainingLetters.splice(idx, 1);
            // Re-insert at a random position ≥ 1 (not first)
            const insertAt = Phaser.Math.Between(
                Math.min(1, this.remainingLetters.length),
                this.remainingLetters.length
            );
            this.remainingLetters.splice(insertAt, 0, letter);
            this.showMissedIndicator();
        }
        this.activeLetter.destroy();
        this.activeLetter = null;
    }

    /**
     * Shows a red "MISSED!" text that floats up 48 px and fades.
     *
     * ANIMATION MATH (Cubic.easeOut, 600 ms):
     *   y:     0.40 × 960 (384) → 0.35 × 960 (336)  — 48 px rise
     *   alpha: 1 → 0  — fades out
     */
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
    //  KNIFE TRAIL RENDERING
    // ═════════════════════════════════════════════════════════

    /**
     * Draws the slash trail as a series of line segments.
     *
     * Each frame:
     *   1. Remove points older than TRAIL_LIFETIME_MS (200 ms)
     *   2. For each consecutive pair of points, draw a line with
     *      thickness and opacity that decay with age.
     *
     * MATH per segment:
     *   age       = (now − pointTime) / TRAIL_LIFETIME_MS   ∈ [0, 1]
     *   alpha     = (1 − age) × 0.7                         ∈ [0, 0.7]
     *   thickness = (1 − age) × 6 + 1                       ∈ [1, 7] px
     *
     *   Newer segments are thick and bright (age ≈ 0);
     *   older segments are thin and transparent (age → 1);
     *   this creates a comet-tail effect behind the knife.
     */
    drawTrail() {
        this.trailGfx.clear();
        const now = this.time.now;

        // Purge expired points
        this.knifeTrailPoints = this.knifeTrailPoints.filter(
            p => now - p.time < TRAIL_LIFETIME_MS
        );
        if (this.knifeTrailPoints.length < 2) return;  // need ≥ 2 for a line

        for (let i = 1; i < this.knifeTrailPoints.length; i++) {
            const p0 = this.knifeTrailPoints[i - 1];
            const p1 = this.knifeTrailPoints[i];
            const age = (now - p1.time) / TRAIL_LIFETIME_MS;
            // Fade and thin the line as it ages
            this.trailGfx.lineStyle((1 - age) * 6 + 1, 0xffffff, (1 - age) * 0.7);
            this.trailGfx.beginPath();
            this.trailGfx.moveTo(p0.x, p0.y);
            this.trailGfx.lineTo(p1.x, p1.y);
            this.trailGfx.strokePath();
        }
    }

    // ═════════════════════════════════════════════════════════
    //  GAME LOOP (called every frame by Phaser)
    // ═════════════════════════════════════════════════════════

    /**
     * Phaser calls update() once per frame (~60 FPS).
     *   1. Check if the active letter has fallen off-screen
     *      (y > 1060) and handle the miss if so.
     *   2. Redraw the knife slash trail.
     */
    update() {
        if (this.activeLetter && this.activeLetter.active && this.activeLetter.y > GAME_H + 100) {
            this.handleMissedLetter();
        }
        this.drawTrail();
    }
}
