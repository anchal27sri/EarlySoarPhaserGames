// =========================================================
//  UTILS — Shared helper functions used across scenes
// =========================================================

/**
 * Draws a vertical gradient background that fills the entire canvas.
 *
 * MATH: The gradient is approximated by 20 horizontal bands.
 * For each band i (0–19), a parameter  t = i / 20  (range 0→1)
 * interpolates each RGB channel linearly:
 *   R(t) = r0 + t × rD
 *   G(t) = g0 + t × gD
 *   B(t) = b0 + t × bD
 * These are packed into a single 24-bit integer via bit-shifting:
 *   color = (R << 16) | (G << 8) | B
 * Each band is  GAME_H / 20 = 48 px  tall (+1 px overlap to
 * prevent sub-pixel gaps between bands).
 *
 * @param {Phaser.Scene} scene      – the scene to draw into
 * @param {Object}       colorStops – { r0, rD, g0, gD, b0, bD }
 */
function drawGradientBackground(scene, colorStops) {
    const gfx = scene.add.graphics();
    const steps = 20;
    for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const r = Math.floor(colorStops.r0 + t * colorStops.rD);
        const g = Math.floor(colorStops.g0 + t * colorStops.gD);
        const b = Math.floor(colorStops.b0 + t * colorStops.bD);
        const color = (r << 16) | (g << 8) | b;
        gfx.fillStyle(color, 1);
        gfx.fillRect(0, (GAME_H / steps) * i, GAME_W, GAME_H / steps + 1);
    }
}

/**
 * Converts a CSS hex colour string to a Phaser-compatible 24-bit integer.
 *
 * MATH:  "#4BC0C0" → R=0x4B, G=0xC0, B=0xC0
 *        integer = (0x4B << 16) | (0xC0 << 8) | 0xC0 = 0x4BC0C0
 *
 * @param  {string} hex – e.g. '#FF6B6B'
 * @return {number}     – e.g. 0xFF6B6B
 */
function hexToInt(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (r << 16) | (g << 8) | b;
}

/**
 * Darkens a hex colour by a multiplicative factor.
 *
 * MATH: Each channel is multiplied by `factor` (0–1).
 *   e.g. '#FF6B6B' with factor 0.5 → rgb(127, 53, 53)
 * Used in letter textures for the outer edge of radial gradients
 * to give each orb a 3D shaded look.
 *
 * @param  {string} hex    – CSS hex colour
 * @param  {number} factor – 0 = black, 1 = unchanged
 * @return {string}        – CSS rgb() string
 */
function darkenColor(hex, factor) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.floor(r * factor)},${Math.floor(g * factor)},${Math.floor(b * factor)})`;
}

/**
 * Creates a rounded-rectangle button with hover effects.
 *
 * Layout:
 *   - A 320 × 60 px rounded rectangle (corner radius 16 px)
 *     centred at (x, y).
 *   - A text label centred inside it.
 *   - An invisible Phaser Zone on top to capture pointer events.
 *
 * Hover animation:
 *   pointerover  → fill alpha drops to 0.8, stroke brightens to 0.6,
 *                   label scales up to 1.05× (subtle "lift" effect).
 *   pointerout   → everything resets to default.
 *   pointerdown  → fires the callback (scene transition, etc.).
 *
 * @param {Phaser.Scene} scene      – owner scene
 * @param {number}       x, y       – centre position
 * @param {string}       text       – label text (may include emoji)
 * @param {string}       bgColorHex – button fill colour as hex
 * @param {Function}     callback   – on-click handler
 */
function createRoundedButton(scene, x, y, text, bgColorHex, callback) {
    const color = hexToInt(bgColorHex);
    const btnW = 320;
    const btnH = 60;

    const bg = scene.add.graphics();
    // Helper to redraw the button with given fill/stroke opacity
    const drawBg = (fillAlpha, strokeAlpha) => {
        bg.clear();
        bg.fillStyle(color, fillAlpha);
        bg.fillRoundedRect(x - btnW / 2, y - btnH / 2, btnW, btnH, 16);
        bg.lineStyle(3, 0xffffff, strokeAlpha);
        bg.strokeRoundedRect(x - btnW / 2, y - btnH / 2, btnW, btnH, 16);
    };
    drawBg(1, 0.3);  // default state

    const label = scene.add.text(x, y, text, {
        fontSize: '26px',
        fontFamily: 'Arial Black, Arial, sans-serif',
        fill: '#ffffff',
        stroke: '#000',
        strokeThickness: 3
    }).setOrigin(0.5);

    // Transparent hit zone layered on top for pointer events
    const hitZone = scene.add.zone(x, y, btnW, btnH)
        .setInteractive({ useHandCursor: true });

    hitZone.on('pointerover', () => { drawBg(0.8, 0.6); label.setScale(1.05); });
    hitZone.on('pointerout',  () => { drawBg(1, 0.3);   label.setScale(1); });
    hitZone.on('pointerdown', callback);

    return { bg, label, hitZone };
}

/**
 * Lazily creates a 16×16 "particle" texture (soft white glow).
 *
 * MATH: A radial gradient centred at (8, 8) with inner radius 0
 * and outer radius 8 creates a circular falloff:
 *   opacity(r) = 1.0           for r ∈ [0, 4]   (50% of radius – solid core)
 *   opacity(r) = 1 → 0 fade   for r ∈ [4, 8]   (feathered edge)
 * This soft dot is tinted per-letter at emit time and rendered
 * with ADD blending to produce a glowing burst.
 */
function ensureParticleTexture(scene) {
    if (scene.textures.exists('particle')) return;
    const c = scene.textures.createCanvas('particle', 16, 16);
    const ctx = c.getContext();
    const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    grad.addColorStop(0, '#ffffff');      // centre: fully opaque
    grad.addColorStop(0.5, '#ffffff');    // halfway: still opaque
    grad.addColorStop(1, 'rgba(255,255,255,0)'); // edge: fully transparent
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 16);
    c.refresh();
}

/**
 * Lazily creates a 24×24 "chunk" texture (triangular fragment).
 *
 * GEOMETRY: Three vertices form an irregular triangle:
 *   (4, 20) → bottom-left
 *   (12, 2) → top-centre
 *   (22, 18) → bottom-right
 * This asymmetric shape looks like a shard / fragment when
 * tinted and flung outward during the cut explosion.
 */
function ensureChunkTexture(scene) {
    if (scene.textures.exists('chunk')) return;
    const c = scene.textures.createCanvas('chunk', 24, 24);
    const ctx = c.getContext();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(4, 20);   // bottom-left vertex
    ctx.lineTo(12, 2);   // top-centre vertex
    ctx.lineTo(22, 18);  // bottom-right vertex
    ctx.closePath();
    ctx.fill();
    c.refresh();
}

/**
 * Lazily creates a 12×12 "confetti" texture (small white square).
 *
 * GEOMETRY: A 10×10 filled square with 1 px inset on each side.
 * Phaser tints each particle a random colour from the provided
 * palette, making simple squares look like multi-coloured confetti.
 */
function ensureConfettiTexture(scene) {
    if (scene.textures.exists('confetti')) return;
    const c = scene.textures.createCanvas('confetti', 12, 12);
    const ctx = c.getContext();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(1, 1, 10, 10);  // 10×10 square, 1 px margin
    c.refresh();
}
