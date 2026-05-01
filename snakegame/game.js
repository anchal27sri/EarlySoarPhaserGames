// =============================================================================
// SNAKE LETTER GAME — Phaser 3
// =============================================================================
// A portrait mobile game where a wavy snake collects English letters.
// The snake moves continuously with sinusoidal lateral oscillation to mimic
// real snake locomotion. The player swipes to turn the snake. Letters appear
// in pulsing circles at random positions. The snake wraps around screen edges.
// =============================================================================

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

/** Game canvas dimensions (portrait orientation)
 *  These are used as the initial/design resolution. The actual canvas
 *  resizes dynamically to fill the viewport via Phaser.Scale.RESIZE.
 *  All game logic uses this.scale.width / this.scale.height at runtime.
 */
const GAME_WIDTH = 360;
const GAME_HEIGHT = 640;

/** Snake movement */
const SNAKE_SPEED = 2;               // Pixels the head advances per frame
const WAVE_MAGNITUDE = 12;           // Lateral wave amplitude — reduced for
                                     // tighter, more compact S-curves
const WAVE_FREQUENCY = 0.012;        // Oscillation rate (rad/ms) — higher value =
                                     // shorter wavelength, tighter curves

/** Snake body geometry */
const HEAD_RADIUS = 6;               // Radius of the head circle (thin body)
const TAIL_RADIUS = 1.5;             // Radius of the smallest tail segment
const SEGMENT_SPACING = 2;           // Trail samples between drawn segments (low = smooth)
const INITIAL_SEGMENTS = 45;         // Shorter body with tight S-curves
const GROW_AMOUNT = 12;              // Extra segments added per letter collected

/** Snake colors (hex for Phaser Graphics) */
const COLOR_BODY = 0x2e8b3a;         // Rich green body
const COLOR_BODY_LIGHT = 0x5bbf5e;   // Lighter green for belly/highlight
const COLOR_OUTLINE = 0x1a5c25;      // Dark green outline stroke
const COLOR_PATCH = 0xd4c94a;        // Golden-yellow patches
const COLOR_PATCH_DARK = 0xa89b2a;   // Darker yellow for patch outline
const COLOR_HEAD = 0x267330;         // Dark green head
const COLOR_HEAD_TOP = 0x3da64a;     // Lighter green head top
const COLOR_EYE_WHITE = 0xf5f5dc;    // Slight cream white
const COLOR_EYE_PUPIL = 0x111111;
const COLOR_EYE_IRIS = 0x2a2a00;     // Dark olive iris
const COLOR_TONGUE = 0xe03030;       // Red tongue
const COLOR_NOSTRIL = 0x1a4a20;      // Dark nostril dots

/** Turning */
const TURN_AMOUNT = Math.PI / 2;     // 90° turn per swipe
const TURN_SPEED = 0.06;             // Radians per frame to interpolate toward target

/** Swipe detection thresholds */
const SWIPE_MIN_DIST = 15;           // Minimum drag distance (px) to count as a swipe
const SWIPE_MAX_TIME = 800;          // Maximum duration (ms) for a valid swipe

/** Letter target */
const LETTER_CIRCLE_RADIUS = 22;     // Radius of the circle around the letter
const LETTER_MARGIN = 50;            // Min distance from screen edges for spawning
const LETTER_COLOR = 0x5577dd;       // Circle fill color
const COLLISION_DISTANCE = HEAD_RADIUS + LETTER_CIRCLE_RADIUS;

/** Body rendering — how many segments between each patch pair */
const PATCH_INTERVAL = 6;            // Patches every Nth drawn segment

/** Background */
const BG_COLOR = '#1a1a2e';

// ─────────────────────────────────────────────────────────────────────────────
// PHASER SCENE
// ─────────────────────────────────────────────────────────────────────────────

class SnakeScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SnakeScene' });
    }

    // ─── PRELOAD ─────────────────────────────────────────────────────────────
    preload() {
        this.load.image('background', 'background.png');
    }

    // ─── CREATE ──────────────────────────────────────────────────────────────
    create() {
        // --- Dynamic dimensions from the current viewport ---
        const w = this.scale.width;
        const h = this.scale.height;

        // --- Background image scaled to fill the game canvas ---
        this.bg = this.add.image(w / 2, h / 2, 'background');
        this.bg.setDisplaySize(w, h);
        this.bg.setDepth(-1);

        // --- Snake state ---
        this.initSnakeState();

        // --- Graphics layer for drawing the snake procedurally ---
        this.snakeGraphics = this.add.graphics();

        // --- Swipe input ---
        this.setupSwipeInput();

        // --- Spawn the first letter target ---
        this.spawnLetter();

        // --- Score display (top-left, above everything) ---
        this.score = 0;
        this.scoreText = this.add.text(16, 16, 'Letters: 0', {
            fontSize: '20px',
            fontFamily: 'Arial, sans-serif',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setDepth(10);

        // --- Collected-letter flash text (centered, hidden initially) ---
        this.flashText = this.add.text(w / 2, h / 2, '', {
            fontSize: '72px',
            fontFamily: 'Arial, sans-serif',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5).setAlpha(0).setDepth(10);

        // --- Handle viewport resize (orientation change, window resize) ---
        this.scale.on('resize', this.onResize, this);
    }

    /**
     * Called when the viewport/canvas is resized.
     * Repositions the background and flash text to stay centered,
     * and rescales the background to fill the new dimensions.
     *
     * @param {Phaser.Structs.Size} gameSize — new width/height
     */
    onResize(gameSize) {
        const w = gameSize.width;
        const h = gameSize.height;

        // Reposition and rescale background
        if (this.bg) {
            this.bg.setPosition(w / 2, h / 2);
            this.bg.setDisplaySize(w, h);
        }

        // Reposition flash text
        if (this.flashText) {
            this.flashText.setPosition(w / 2, h / 2);
        }
    }

    // ─── UPDATE (called every frame) ─────────────────────────────────────────
    /** @param {number} time  - Total elapsed time in ms */
    /** @param {number} delta - Time since last frame in ms */
    update(time, delta) {
        this.handleTurning();
        this.updateSnakeMovement(time);
        this.drawSnake();
        this.checkLetterCollision();
    }

    // =========================================================================
    // SNAKE STATE INITIALIZATION
    // =========================================================================

    /**
     * Initialise all snake-related state variables.
     * Called once in create(). Sets the snake at screen center, facing upward.
     */
    initSnakeState() {
        /** Current head position (centered in current viewport) */
        this.headX = this.scale.width / 2;
        this.headY = this.scale.height / 2;

        /**
         * headAngle is the direction the snake is currently facing.
         * -π/2 = upward in screen coordinates (y-axis points down).
         */
        this.headAngle = -Math.PI / 2;

        /** Target angle we're interpolating toward (set by swipe) */
        this.targetAngle = this.headAngle;

        /** Whether we're currently mid-turn (interpolating) */
        this.isTurning = false;

        /**
         * Trail stores every position the head has visited, newest first.
         * We sample this trail at regular intervals to place body segments,
         * which is why the body naturally follows the head's curved path.
         */
        this.trail = [];

        /** Number of visible body segments (grows when letters are collected) */
        this.numSegments = INITIAL_SEGMENTS;

        /**
         * Previous frame's wave offset — we track this so we can apply the
         * *change* in wave offset each frame rather than the absolute value.
         * This prevents the wave from pushing the snake off its heading.
         * See updateSnakeMovement() for the full explanation.
         */
        this.lastWaveOffset = 0;

        // Pre-fill the trail behind the head so the snake is visible immediately.
        // We place points going downward (opposite to initial heading).
        for (let i = 0; i < this.numSegments * SEGMENT_SPACING; i++) {
            this.trail.push({
                x: this.headX,
                y: this.headY + i * 1   // 1px apart straight down
            });
        }
    }

    // =========================================================================
    // SNAKE MOVEMENT (with sinusoidal wave)
    // =========================================================================

    /**
     * Advance the snake head by one step and record its position in the trail.
     *
     * WAVY MOTION MATH:
     * ─────────────────
     * Real snakes move via lateral undulation — their body oscillates side-to-side
     * perpendicular to the direction of travel. We simulate this by:
     *
     * 1. Computing the forward velocity vector from headAngle:
     *      vx = cos(headAngle) × speed
     *      vy = sin(headAngle) × speed
     *
     * 2. Computing a sinusoidal offset along the perpendicular axis:
     *      waveOffset = sin(time × frequency) × magnitude
     *
     *    The perpendicular direction to headAngle is:
     *      perpX = -sin(headAngle)
     *      perpY =  cos(headAngle)
     *
     * 3. CRITICAL: We apply the *delta* (change) of the wave offset, not its
     *    absolute value. If we used the absolute value, the snake would
     *    accumulate lateral drift and veer off course. By applying only the
     *    frame-to-frame difference (waveOffset - lastWaveOffset), the wave
     *    oscillates symmetrically around the intended heading.
     *
     *      headX += vx + perpX × (waveOffset - lastWaveOffset)
     *      headY += vy + perpY × (waveOffset - lastWaveOffset)
     *
     * @param {number} time — total elapsed time in ms (provided by Phaser)
     */
    updateSnakeMovement(time) {
        // --- Forward velocity along current heading ---
        const vx = Math.cos(this.headAngle) * SNAKE_SPEED;
        const vy = Math.sin(this.headAngle) * SNAKE_SPEED;

        // --- Sinusoidal lateral wave ---
        const waveOffset = Math.sin(time * WAVE_FREQUENCY) * WAVE_MAGNITUDE;
        const waveDelta = waveOffset - this.lastWaveOffset;
        this.lastWaveOffset = waveOffset;

        // Perpendicular direction (rotated 90° from heading)
        const perpX = -Math.sin(this.headAngle);
        const perpY = Math.cos(this.headAngle);

        // Apply forward motion + lateral wave delta
        this.headX += vx + perpX * waveDelta;
        this.headY += vy + perpY * waveDelta;

        // --- Screen wrapping (uses current viewport dimensions) ---
        this.headX = Phaser.Math.Wrap(this.headX, 0, this.scale.width);
        this.headY = Phaser.Math.Wrap(this.headY, 0, this.scale.height);

        // --- Record position in trail ---
        this.trail.unshift({ x: this.headX, y: this.headY });

        // Trim trail to the length needed for all body segments
        const maxTrailLength = this.numSegments * SEGMENT_SPACING + 1;
        while (this.trail.length > maxTrailLength) {
            this.trail.pop();
        }
    }

    // =========================================================================
    // SNAKE RENDERING
    // =========================================================================

    /**
     * Clear and redraw the entire snake each frame using Phaser Graphics.
     *
     * MULTI-PASS RENDERING:
     * ─────────────────────
     * The snake is drawn in 4 layered passes (back to front):
     *   Pass 1 — Dark outline stroke (slightly larger circles behind the body)
     *   Pass 2 — Main body fill (green circles at segment positions)
     *   Pass 3 — Belly highlight (smaller, lighter circles offset toward the
     *            perpendicular "belly" side, giving a 3D cylindrical look)
     *   Pass 4 — Yellow patches (diamond shapes on every Nth segment)
     *
     * By using SEGMENT_SPACING = 2, adjacent circles overlap heavily,
     * producing a smooth continuous body instead of visible individual bumps.
     *
     * SCREEN-WRAP VISUAL CONTINUITY:
     * ──────────────────────────────
     * Because we draw independent circles (not connecting lines), when the
     * trail wraps around a screen edge the segments simply appear on the
     * opposite side without any visual artifact.
     */
    drawSnake() {
        const g = this.snakeGraphics;
        g.clear();

        // Build array of sampled segment positions and radii for reuse
        const segments = this.buildSegmentData();

        // --- Pass 1: Dark outline (drawn slightly larger behind each segment) ---
        for (let i = segments.length - 1; i >= 0; i--) {
            const s = segments[i];
            g.fillStyle(COLOR_OUTLINE, 1);
            g.fillCircle(s.x, s.y, s.radius + 1.5);
        }

        // --- Pass 2: Main body fill ---
        for (let i = segments.length - 1; i >= 0; i--) {
            const s = segments[i];
            g.fillStyle(COLOR_BODY, 1);
            g.fillCircle(s.x, s.y, s.radius);
        }

        // --- Pass 3: Belly highlight (lighter stripe offset to one side) ---
        // The "belly" is a smaller, lighter circle shifted perpendicular to
        // the local body direction. This creates a subtle 3D cylindrical look.
        for (let i = segments.length - 1; i >= 0; i--) {
            const s = segments[i];
            const bellyRadius = s.radius * 0.45;
            // Offset the belly circle perpendicular to local direction
            const bx = s.x + Math.cos(s.angle + Math.PI / 2) * s.radius * 0.25;
            const by = s.y + Math.sin(s.angle + Math.PI / 2) * s.radius * 0.25;
            g.fillStyle(COLOR_BODY_LIGHT, 0.5);
            g.fillCircle(bx, by, bellyRadius);
        }

        // --- Pass 4: Patches (golden-yellow diamonds on every PATCH_INTERVAL-th segment) ---
        for (let i = segments.length - 1; i >= 1; i--) {
            if (i % PATCH_INTERVAL === 0) {
                this.drawPatch(g, segments[i]);
            }
        }

        // --- Draw the tail tip (pointed taper) ---
        this.drawTailTip(g, segments);

        // --- Draw head (always on top) ---
        this.drawHead(g);
    }

    /**
     * Sample the trail at regular intervals to produce segment data.
     *
     * Each segment stores:
     *   { x, y, radius, angle }
     * where angle is the local body direction at that point, computed from
     * neighboring trail points.
     *
     * @returns {Array<{x:number, y:number, radius:number, angle:number}>}
     */
    buildSegmentData() {
        const segments = [];
        for (let i = 0; i < this.numSegments; i++) {
            const trailIndex = i * SEGMENT_SPACING;
            if (trailIndex >= this.trail.length) break;

            const pos = this.trail[trailIndex];
            const radius = this.getSegmentRadius(i, this.numSegments);

            // Compute local direction from neighbors (for belly offset and patches)
            const prevIdx = Math.min(trailIndex + SEGMENT_SPACING, this.trail.length - 1);
            const nextIdx = Math.max(trailIndex - SEGMENT_SPACING, 0);
            const angle = Math.atan2(
                this.trail[nextIdx].y - this.trail[prevIdx].y,
                this.trail[nextIdx].x - this.trail[prevIdx].x
            );

            segments.push({ x: pos.x, y: pos.y, radius, angle });
        }
        return segments;
    }

    /**
     * Compute the radius for a given body segment index.
     *
     * TAPERING FORMULA:
     * ─────────────────
     * The body maintains full width for the front 30% (the "torso"), then
     * tapers smoothly to TAIL_RADIUS using a quadratic ease-out curve.
     * This avoids the problem of the tail thinning too aggressively:
     *
     *   if t < 0.3  →  radius = HEAD_RADIUS          (constant thick torso)
     *   if t ≥ 0.3  →  taperT = (t - 0.3) / 0.7     (remap 0.3–1.0 → 0–1)
     *                   radius = lerp(HEAD_RADIUS, TAIL_RADIUS, taperT²)
     *
     * The t² (quadratic) curve makes the taper slow at first and faster
     * near the tip, which looks more natural.
     *
     * @param {number} index — segment index (0 = head, numSegments-1 = tail)
     * @param {number} total — total number of segments
     * @returns {number} radius in pixels
     */
    getSegmentRadius(index, total) {
        const t = index / total;
        if (t < 0.3) return HEAD_RADIUS;   // Thick torso for the front 30%
        const taperT = (t - 0.3) / 0.7;    // Remap remaining 70% to 0–1
        return Phaser.Math.Linear(HEAD_RADIUS, TAIL_RADIUS, taperT * taperT);
    }

    /**
     * Draw a golden-yellow diamond patch on a body segment.
     *
     * The patch is a filled diamond (rhombus) oriented along the segment's
     * local body direction. A slightly smaller dark-yellow diamond is drawn
     * inside as an outline/border effect.
     *
     * @param {Phaser.GameObjects.Graphics} g
     * @param {{x:number, y:number, radius:number, angle:number}} seg
     */
    drawPatch(g, seg) {
        const { x, y, radius, angle } = seg;
        const patchSize = radius * 0.75;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        // Helper: draw a diamond of given size at the segment's position
        const drawDiamond = (size, color) => {
            g.fillStyle(color, 1);
            g.beginPath();
            g.moveTo(x + cos * size,          y + sin * size);            // front
            g.lineTo(x - sin * size * 0.65,   y + cos * size * 0.65);    // right
            g.lineTo(x - cos * size,          y - sin * size);            // back
            g.lineTo(x + sin * size * 0.65,   y - cos * size * 0.65);    // left
            g.closePath();
            g.fillPath();
        };

        // Outer (darker border) then inner (bright fill)
        drawDiamond(patchSize, COLOR_PATCH_DARK);
        drawDiamond(patchSize * 0.7, COLOR_PATCH);
    }

    /**
     * Draw a pointed tail tip at the last segment to give the tail a
     * natural tapered ending rather than abruptly stopping.
     *
     * TAIL TIP SHAPE:
     * ───────────────
     * A small triangle pointing in the body's local direction at the tail,
     * extending a few pixels past the last segment's center.
     *
     * @param {Phaser.GameObjects.Graphics} g
     * @param {Array} segments — segment data array from buildSegmentData()
     */
    drawTailTip(g, segments) {
        if (segments.length < 3) return;
        const last = segments[segments.length - 1];
        const prev = segments[segments.length - 3];

        // Direction from prev toward last (pointing toward tail tip)
        const tipAngle = Math.atan2(last.y - prev.y, last.x - prev.x);
        const tipLen = 6;
        const tipWidth = last.radius * 0.7;

        const tipX = last.x + Math.cos(tipAngle) * tipLen;
        const tipY = last.y + Math.sin(tipAngle) * tipLen;

        // Draw filled triangle: two base points at the last segment, one point at tip
        g.fillStyle(COLOR_OUTLINE, 1);
        g.beginPath();
        g.moveTo(
            last.x - Math.sin(tipAngle) * tipWidth,
            last.y + Math.cos(tipAngle) * tipWidth
        );
        g.lineTo(tipX, tipY);
        g.lineTo(
            last.x + Math.sin(tipAngle) * tipWidth,
            last.y - Math.cos(tipAngle) * tipWidth
        );
        g.closePath();
        g.fillPath();

        // Lighter inner triangle
        g.fillStyle(COLOR_BODY, 1);
        g.beginPath();
        const innerWidth = tipWidth * 0.6;
        g.moveTo(
            last.x - Math.sin(tipAngle) * innerWidth,
            last.y + Math.cos(tipAngle) * innerWidth
        );
        g.lineTo(tipX, tipY);
        g.lineTo(
            last.x + Math.sin(tipAngle) * innerWidth,
            last.y - Math.cos(tipAngle) * innerWidth
        );
        g.closePath();
        g.fillPath();
    }

    /**
     * Draw the snake's head as a proper angular/shield shape with detailed
     * eyes, nostrils, scale-like brow ridges, and a flickering forked tongue.
     *
     * HEAD SHAPE — POLYGON APPROACH:
     * ──────────────────────────────
     * Instead of overlapping circles, the head is drawn as a 6-point polygon
     * resembling a real snake's head viewed from above:
     *
     *        snout (pointed front)
     *       /    \
     *      /      \        ← narrow snout tapering forward
     *     /  eyes  \
     *    |          |      ← widest at jaw line (behind eyes)
     *     \        /
     *      \  neck /       ← tapers back to neck width
     *
     * All points are computed relative to headAngle so the shape rotates
     * with the snake's direction. Points use (cos, sin) for the forward
     * axis and (-sin, cos) for the lateral axis.
     *
     * @param {Phaser.GameObjects.Graphics} g
     */
    drawHead(g) {
        const hx = this.headX;
        const hy = this.headY;
        const a = this.headAngle;

        // Forward and lateral unit vectors
        const fx = Math.cos(a);
        const fy = Math.sin(a);
        const lx = -Math.sin(a);   // lateral (perpendicular left)
        const ly = Math.cos(a);

        const R = HEAD_RADIUS;

        // --- Helper: point at (forward, lateral) offsets from head center ---
        const pt = (fwd, lat) => ({
            x: hx + fx * fwd + lx * lat,
            y: hy + fy * fwd + ly * lat
        });

        // --- Define the head polygon points ---
        // Snout tip (pointed, extends well forward)
        const snoutTip   = pt(R * 2.0,  0);
        // Snout sides (narrow, just behind the tip)
        const snoutL     = pt(R * 1.3,  R * 0.45);
        const snoutR     = pt(R * 1.3, -R * 0.45);
        // Jaw widest point (where the eyes sit — widest part of head)
        const jawL       = pt(R * 0.15, R * 1.1);
        const jawR       = pt(R * 0.15,-R * 1.1);
        // Neck (tapers back to match body width)
        const neckL      = pt(-R * 0.9, R * 0.85);
        const neckR      = pt(-R * 0.9,-R * 0.85);

        // --- Draw outline (slightly expanded polygon behind the fill) ---
        const drawPoly = (points, color, expand) => {
            // expand > 0 draws a slightly larger version for the outline effect
            g.fillStyle(color, 1);
            g.beginPath();
            for (let i = 0; i < points.length; i++) {
                const p = points[i];
                // For outline, push each point outward from the head center
                let px = p.x, py = p.y;
                if (expand > 0) {
                    const dx = p.x - hx;
                    const dy = p.y - hy;
                    const len = Math.sqrt(dx * dx + dy * dy) || 1;
                    px += (dx / len) * expand;
                    py += (dy / len) * expand;
                }
                if (i === 0) g.moveTo(px, py);
                else g.lineTo(px, py);
            }
            g.closePath();
            g.fillPath();
        };

        const headPoints = [snoutTip, snoutL, jawL, neckL, neckR, jawR, snoutR];

        // Outline pass
        drawPoly(headPoints, COLOR_OUTLINE, 1.5);
        // Fill pass
        drawPoly(headPoints, COLOR_HEAD, 0);

        // --- Top/center highlight for depth (smaller version of the shape) ---
        const highlightPts = [
            pt(R * 1.6,  0),
            pt(R * 1.0,  R * 0.3),
            pt(R * 0.15, R * 0.65),
            pt(-R * 0.5, R * 0.5),
            pt(-R * 0.5,-R * 0.5),
            pt(R * 0.15,-R * 0.65),
            pt(R * 1.0, -R * 0.3)
        ];
        drawPoly(highlightPts, COLOR_HEAD_TOP, 0);

        // --- Brow ridges (subtle darker lines above the eyes) ---
        g.lineStyle(1.2, COLOR_OUTLINE, 0.6);
        for (const side of [-1, 1]) {
            const browStart = pt(R * 0.8, R * 0.5 * side);
            const browEnd   = pt(R * 0.2, R * 0.95 * side);
            g.beginPath();
            g.moveTo(browStart.x, browStart.y);
            g.lineTo(browEnd.x, browEnd.y);
            g.strokePath();
        }

        // --- Nostrils (two small dark dots near the snout tip) ---
        const nostrilFwd = R * 1.5;
        const nostrilLat = R * 0.2;
        for (const side of [-1, 1]) {
            const np = pt(nostrilFwd, nostrilLat * side);
            g.fillStyle(COLOR_NOSTRIL, 1);
            g.fillCircle(np.x, np.y, 1.0);
        }

        // --- Eyes (three-layer: sclera → iris → pupil + glint) ---
        // Positioned at the jaw-width area for a realistic side-facing look
        const eyeFwd = R * 0.45;
        const eyeLat = R * 0.75;
        const eyeRadius = 3.0;
        const irisRadius = 2.2;
        const pupilRadius = 1.2;

        for (const side of [-1, 1]) {
            const ep = pt(eyeFwd, eyeLat * side);

            // Sclera (slightly yellowish white)
            g.fillStyle(COLOR_EYE_WHITE, 1);
            g.fillCircle(ep.x, ep.y, eyeRadius);

            // Iris (dark olive)
            g.fillStyle(COLOR_EYE_IRIS, 1);
            g.fillCircle(ep.x, ep.y, irisRadius);

            // Vertical slit pupil (drawn as a thin tall ellipse)
            // Use two small overlapping circles offset laterally to fake a slit
            g.fillStyle(COLOR_EYE_PUPIL, 1);
            const slitLen = 1.8;
            const s1 = pt(eyeFwd, eyeLat * side + slitLen * 0.3 * side);
            const s2 = pt(eyeFwd, eyeLat * side - slitLen * 0.3 * side);
            g.fillCircle(s1.x, s1.y, pupilRadius * 0.6);
            g.fillCircle(ep.x, ep.y, pupilRadius * 0.7);
            g.fillCircle(s2.x, s2.y, pupilRadius * 0.6);

            // Eye glint (tiny white dot for liveliness)
            const glint = pt(eyeFwd - R * 0.08, eyeLat * side - R * 0.1 * side);
            g.fillStyle(0xffffff, 0.85);
            g.fillCircle(glint.x, glint.y, 0.7);
        }

        // --- Tongue (flickers in and out using sin wave) ---
        const tongueFlicker = Math.sin(Date.now() * 0.01);
        if (tongueFlicker > 0.1) {
            const tongueLength = R * 1.2 + tongueFlicker * 5;
            const tongueBase = pt(R * 2.0, 0);   // starts at snout tip
            const tongueTipX = tongueBase.x + fx * tongueLength;
            const tongueTipY = tongueBase.y + fy * tongueLength;

            g.lineStyle(1.2, COLOR_TONGUE, 1);
            g.beginPath();
            g.moveTo(tongueBase.x, tongueBase.y);
            g.lineTo(tongueTipX, tongueTipY);

            // Forked tip: two prongs at ±25°
            const forkLen = 4;
            const forkA = 0.4;
            g.lineTo(
                tongueTipX + Math.cos(a + forkA) * forkLen,
                tongueTipY + Math.sin(a + forkA) * forkLen
            );
            g.moveTo(tongueTipX, tongueTipY);
            g.lineTo(
                tongueTipX + Math.cos(a - forkA) * forkLen,
                tongueTipY + Math.sin(a - forkA) * forkLen
            );
            g.strokePath();
        }
    }

    // =========================================================================
    // SWIPE INPUT & TURNING
    // =========================================================================

    /**
     * Register pointer events for swipe detection.
     *
     * SWIPE DETECTION LOGIC:
     * ──────────────────────
     * We use TWO detection methods for maximum responsiveness:
     *
     * A) pointerup — classic swipe: measures distance & duration between
     *    pointerdown and pointerup. Works for quick flick gestures.
     *
     * B) pointermove — drag-based: while the pointer is held, if the
     *    cumulative drag distance exceeds SWIPE_MIN_DIST, we immediately
     *    register the turn without waiting for pointer release. This makes
     *    the game feel much more responsive on touch devices.
     *
     * A cooldown timer (swipeCooldown) prevents multiple turns from
     * firing in rapid succession from the same drag gesture.
     *
     * TURN QUEUING:
     * ─────────────
     * If a swipe arrives while a turn is already in progress, we compute
     * the new target relative to the *intended* target angle (not the
     * current interpolated angle), so consecutive swipes stack correctly.
     * e.g. swipe-right then swipe-right = 180° turn, not a jittery mess.
     */
    setupSwipeInput() {
        this.swipeStart = null;
        this.swipeCooldown = 0;       // Timestamp: ignore swipes until this time

        this.input.on('pointerdown', (pointer) => {
            this.swipeStart = {
                x: pointer.x,
                y: pointer.y,
                time: pointer.downTime
            };
        });

        // --- Method B: detect swipe mid-drag for faster response ---
        this.input.on('pointermove', (pointer) => {
            if (!this.swipeStart || !pointer.isDown) return;
            if (Date.now() < this.swipeCooldown) return;

            const dx = pointer.x - this.swipeStart.x;
            const dy = pointer.y - this.swipeStart.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance >= SWIPE_MIN_DIST) {
                const swipeAngle = Math.atan2(dy, dx);
                this.applyTurn(swipeAngle);

                // Reset start point to current position so continued
                // dragging can trigger another turn if needed
                this.swipeStart = {
                    x: pointer.x,
                    y: pointer.y,
                    time: Date.now()
                };
                // Cooldown: prevent re-triggering for 250ms
                this.swipeCooldown = Date.now() + 250;
            }
        });

        // --- Method A: classic pointerup swipe (fallback) ---
        this.input.on('pointerup', (pointer) => {
            if (!this.swipeStart) return;
            if (Date.now() < this.swipeCooldown) {
                this.swipeStart = null;
                return;
            }

            const dx = pointer.x - this.swipeStart.x;
            const dy = pointer.y - this.swipeStart.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const duration = pointer.upTime - this.swipeStart.time;

            if (distance >= SWIPE_MIN_DIST && duration <= SWIPE_MAX_TIME) {
                const swipeAngle = Math.atan2(dy, dx);
                this.applyTurn(swipeAngle);
            }

            this.swipeStart = null;
        });
    }

    /**
     * Determine turn direction from swipe angle and set the target heading.
     *
     * Uses the cross-product (z-component) of the heading vector and swipe
     * vector to decide clockwise vs counter-clockwise:
     *
     *   cross = sin(swipeAngle - baseAngle)
     *
     *   Positive cross → swipe is to the right → turn clockwise (+π/2)
     *   Negative cross → swipe is to the left  → turn counter-clockwise (-π/2)
     *
     * TURN QUEUING:
     * ─────────────
     * If a turn is already in progress, we compute the new target relative
     * to the *current target* (not the in-progress headAngle). This ensures
     * consecutive swipes stack properly:
     *   - Swipe right while already turning right → target becomes +180°
     *   - Swipe left while turning right → cancels the turn (back to 0°)
     *
     * @param {number} swipeAngle — angle of the swipe gesture in radians
     */
    applyTurn(swipeAngle) {
        // Use the target angle as base if mid-turn, otherwise current heading
        const baseAngle = this.isTurning ? this.targetAngle : this.headAngle;

        // Cross product z-component determines relative direction
        const cross = Math.sin(swipeAngle - baseAngle);

        if (cross > 0) {
            this.targetAngle = baseAngle + TURN_AMOUNT;  // Turn right (clockwise)
        } else {
            this.targetAngle = baseAngle - TURN_AMOUNT;  // Turn left (counter-clockwise)
        }

        this.isTurning = true;
    }

    /**
     * Smoothly interpolate the current heading toward the target angle.
     *
     * SMOOTH TURNING MATH:
     * ────────────────────
     * Instead of snapping instantly to the target angle, we rotate by a fixed
     * amount (TURN_SPEED radians) per frame toward the target. This creates
     * a smooth arc in the trail, which means the body segments will naturally
     * curve around turns.
     *
     * Phaser.Math.Angle.RotateTo(current, target, step) handles:
     *   - Choosing the shortest rotation direction
     *   - Wrapping around ±π correctly
     *   - Clamping so we don't overshoot the target
     *
     * We stop turning when the remaining angular difference is negligible
     * (< 0.01 radians ≈ 0.6°).
     */
    handleTurning() {
        if (!this.isTurning) return;

        this.headAngle = Phaser.Math.Angle.RotateTo(
            this.headAngle,
            this.targetAngle,
            TURN_SPEED
        );

        // Check if we've reached the target (within tolerance)
        const diff = Math.abs(
            Phaser.Math.Angle.Wrap(this.targetAngle - this.headAngle)
        );
        if (diff < 0.01) {
            this.headAngle = Phaser.Math.Angle.Wrap(this.targetAngle);
            this.isTurning = false;
        }
    }

    // =========================================================================
    // LETTER TARGET
    // =========================================================================

    /**
     * Spawn a new letter target at a random screen position.
     *
     * Creates two game objects grouped together:
     *   1. A filled circle (background)
     *   2. A text character (the letter) centered on the circle
     *
     * Both are animated with a yoyo scale tween that pulses between
     * scale 1.0 and 1.25 using a sinusoidal ease, giving a smooth
     * "breathing" vibration effect.
     */
    spawnLetter() {
        // Pick a random uppercase English letter (A-Z, char codes 65–90)
        const charCode = Phaser.Math.Between(65, 90);
        const letter = String.fromCharCode(charCode);

        // Random position with margin from edges (uses current viewport size)
        const w = this.scale.width;
        const h = this.scale.height;
        const lx = Phaser.Math.Between(LETTER_MARGIN, w - LETTER_MARGIN);
        const ly = Phaser.Math.Between(LETTER_MARGIN, h - LETTER_MARGIN);

        // Circle background
        this.letterCircle = this.add.circle(lx, ly, LETTER_CIRCLE_RADIUS, LETTER_COLOR, 0.85);
        // White border ring
        this.letterCircle.setStrokeStyle(2, 0xffffff, 0.6);

        // Letter text centered on the circle
        this.letterText = this.add.text(lx, ly, letter, {
            fontSize: '26px',
            fontFamily: 'Arial, sans-serif',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Pulsing "vibration" tween — scale up/down smoothly
        this.letterTween = this.tweens.add({
            targets: [this.letterCircle, this.letterText],
            scale: { from: 1.0, to: 1.25 },
            duration: 450,
            yoyo: true,       // Reverse back to original scale
            repeat: -1,       // Infinite loop
            ease: 'Sine.easeInOut'
        });
    }

    /**
     * Check if the snake's head has reached the letter circle.
     *
     * Uses simple Euclidean distance between the head position and the
     * circle's center. Collision triggers when distance < sum of radii.
     */
    checkLetterCollision() {
        if (!this.letterCircle) return;

        const dist = Phaser.Math.Distance.Between(
            this.headX, this.headY,
            this.letterCircle.x, this.letterCircle.y
        );

        if (dist < COLLISION_DISTANCE) {
            this.collectLetter();
        }
    }

    /**
     * Handle letter collection: update score, show flash, grow snake,
     * destroy old letter objects, and spawn a new one.
     */
    collectLetter() {
        // Capture the letter before destroying the text object
        const collectedChar = this.letterText.text;

        // --- Update score ---
        this.score++;
        this.scoreText.setText('Letters: ' + this.score);

        // --- Flash the collected letter in the center of the screen ---
        this.showLetterFlash(collectedChar);

        // --- Destroy old letter objects ---
        if (this.letterTween) this.letterTween.destroy();
        this.letterCircle.destroy();
        this.letterText.destroy();

        // --- Spawn a new letter ---
        this.spawnLetter();
    }

    /**
     * Show a large letter in the center that fades out quickly.
     * Provides satisfying visual feedback on collection.
     *
     * @param {string} char — the letter character to display
     */
    showLetterFlash(char) {
        this.flashText.setText(char);
        this.flashText.setAlpha(1);
        this.flashText.setScale(0.5);

        this.tweens.add({
            targets: this.flashText,
            alpha: 0,
            scale: 2,
            duration: 600,
            ease: 'Quad.easeOut'
        });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PHASER GAME CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const config = {
    type: Phaser.AUTO,                     // WebGL with Canvas fallback
    width: GAME_WIDTH,                     // Initial/minimum design width
    height: GAME_HEIGHT,                   // Initial/minimum design height
    backgroundColor: '#000000',            // Fallback while background loads
    parent: 'game-container',              // Mount into this DOM element

    scale: {
        mode: Phaser.Scale.RESIZE,         // Canvas resizes to fill viewport
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: '100%',                     // Fill parent width
        height: '100%'                     // Fill parent height
    },

    scene: [SnakeScene]
};

// Launch the game
const game = new Phaser.Game(config);
