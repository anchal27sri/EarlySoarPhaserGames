// =========================================================
//  UTILS — Shared helper functions used across scenes
// =========================================================

import { GAME_W, GAME_H } from './constants.js';

/**
 * Draws a vertical gradient background that fills the entire canvas.
 */
export function drawGradientBackground(scene, colorStops) {
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
 */
export function hexToInt(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (r << 16) | (g << 8) | b;
}

/**
 * Darkens a hex colour by a multiplicative factor.
 */
export function darkenColor(hex, factor) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${Math.floor(r * factor)},${Math.floor(g * factor)},${Math.floor(b * factor)})`;
}

/**
 * Creates a rounded-rectangle button with hover effects.
 */
export function createRoundedButton(scene, x, y, text, bgColorHex, callback) {
    const color = hexToInt(bgColorHex);
    const btnW = 320;
    const btnH = 60;

    const bg = scene.add.graphics();
    const drawBg = (fillAlpha, strokeAlpha) => {
        bg.clear();
        bg.fillStyle(color, fillAlpha);
        bg.fillRoundedRect(x - btnW / 2, y - btnH / 2, btnW, btnH, 16);
        bg.lineStyle(3, 0xffffff, strokeAlpha);
        bg.strokeRoundedRect(x - btnW / 2, y - btnH / 2, btnW, btnH, 16);
    };
    drawBg(1, 0.3);

    const label = scene.add.text(x, y, text, {
        fontSize: '26px',
        fontFamily: 'Arial Black, Arial, sans-serif',
        fill: '#ffffff',
        stroke: '#000',
        strokeThickness: 3
    }).setOrigin(0.5);

    const hitZone = scene.add.zone(x, y, btnW, btnH)
        .setInteractive({ useHandCursor: true });

    hitZone.on('pointerover', () => { drawBg(0.8, 0.6); label.setScale(1.05); });
    hitZone.on('pointerout',  () => { drawBg(1, 0.3);   label.setScale(1); });
    hitZone.on('pointerdown', callback);

    return { bg, label, hitZone };
}

/**
 * Lazily creates a 16×16 "particle" texture (soft white glow).
 */
export function ensureParticleTexture(scene) {
    if (scene.textures.exists('particle')) return;
    const c = scene.textures.createCanvas('particle', 16, 16);
    const ctx = c.getContext();
    const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.5, '#ffffff');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 16);
    c.refresh();
}

/**
 * Lazily creates a 24×24 "chunk" texture (triangular fragment).
 */
export function ensureChunkTexture(scene) {
    if (scene.textures.exists('chunk')) return;
    const c = scene.textures.createCanvas('chunk', 24, 24);
    const ctx = c.getContext();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(4, 20);
    ctx.lineTo(12, 2);
    ctx.lineTo(22, 18);
    ctx.closePath();
    ctx.fill();
    c.refresh();
}

/**
 * Lazily creates a 12×12 "confetti" texture (small white square).
 */
export function ensureConfettiTexture(scene) {
    if (scene.textures.exists('confetti')) return;
    const c = scene.textures.createCanvas('confetti', 12, 12);
    const ctx = c.getContext();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(1, 1, 10, 10);
    c.refresh();
}
