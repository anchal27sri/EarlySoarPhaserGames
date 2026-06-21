// src/bg.js
// Shared illustrated landscape background + UI drawing helpers
// Used by all three scenes (MenuScene, GameScene, WinScene)

import { GAME_W, GAME_H } from './constants.js';

// ─────────────────────────────────────────────────────────────
//  drawLandscapeBg()
//  Draws layered sky → rainbow → sun → clouds → hills → ground → trees
//  Call FIRST in create() — everything added later renders on top.
//  Returns array of tweened objects (clouds, sun rays) for reference.
// ─────────────────────────────────────────────────────────────
export function drawLandscapeBg(scene, opts = {}) {
  const W = GAME_W, H = GAME_H;
  const animated = [];

  // ── 1. Sky gradient (pink → soft blue) ───────────────────
  const sky = scene.add.graphics();
  sky.fillGradientStyle(0xffb3e8, 0xffb3e8, 0xc8eeff, 0xc8eeff, 1);
  sky.fillRect(0, 0, W, H);

  // ── 2. Rainbow (behind hills, subtle) ────────────────────
  const rbG = scene.add.graphics();
  const rbCols = [0xff6644, 0xff9900, 0xffdd00, 0x55cc33, 0x3399ff, 0xaa55ff];
  rbCols.forEach((c, i) => {
    const r = 210 - i * 19;
    rbG.lineStyle(14, c, 0.24);
    rbG.beginPath();
    rbG.arc(160, H + 18, r, Math.PI, 0, false);
    rbG.strokePath();
  });

  // ── 3. Sun (top-right, rotating rays) ────────────────────
  const sx = W - 80, sy = 68;
  scene.add.circle(sx, sy, 52, 0xfff5a0, 0.38); // outer glow
  const raysG = scene.add.graphics({ x: sx, y: sy });
  raysG.lineStyle(3.5, 0xffd54f, 0.9);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    raysG.beginPath();
    raysG.moveTo(Math.cos(a) * 42, Math.sin(a) * 42);
    raysG.lineTo(Math.cos(a) * 62, Math.sin(a) * 62);
    raysG.strokePath();
  }
  scene.add.circle(sx, sy, 34, 0xffd740);
  scene.add.circle(sx, sy, 26, 0xffec80);
  scene.tweens.add({ targets: raysG, angle: 360, duration: 18000, repeat: -1, ease: 'Linear' });
  animated.push(raysG);

  // ── 4. Fluffy clouds (animated drift) ────────────────────
  [
    { x: 70,  y: 55, s: 1.05, spd: 8000  },
    { x: 295, y: 40, s: 1.20, spd: 12000 },
    { x: 535, y: 60, s: 0.80, spd: 9500  },
    { x: 695, y: 46, s: 0.90, spd: 11000 },
  ].forEach(({ x, y, s, spd }, i) => {
    const g = _cloud(scene, x, y, s);
    scene.tweens.add({ targets: g, x: x + 20, duration: spd, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 1300 });
    animated.push(g);
  });

  // ── 5. Far hills (lightest green) ────────────────────────
  const h1 = scene.add.graphics();
  h1.fillStyle(0xb8e080, 1);
  [[60,335,330,136],[310,320,362,150],[572,330,342,140],[815,336,315,132]].forEach(([x,y,w,h]) => h1.fillEllipse(x,y,w,h));

  // ── 6. Near hills (richer green) ─────────────────────────
  const h2 = scene.add.graphics();
  h2.fillStyle(0x78cc40, 1);
  [[-30,394,385,180],[225,378,432,188],[540,390,424,180],[835,395,385,178]].forEach(([x,y,w,h]) => h2.fillEllipse(x,y,w,h));

  // ── 7. Ground strip ───────────────────────────────────────
  const gnd = scene.add.graphics();
  gnd.fillStyle(0x54b02a, 1);
  gnd.fillRect(0, 406, W, 44);
  gnd.fillStyle(0x74cc42, 0.45);
  gnd.fillRect(0, 406, W, 8); // grass highlight

  // ── Curving central path (sandy walkway from bottom center curving up/narrowing)
  const path = scene.add.graphics();
  path.fillStyle(0xf5dca6, 1); // beautiful bright sand color

  // Draw the curving walkway by computing points along quadratic Bezier curves
  const leftPoints = [];
  const rightPoints = [];
  const steps = 12;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    
    // Left boundary: P0 = (W/2-90, H), P1 = (W/2-35, H-40), P2 = (W/2-25, 360)
    const lx = mt * mt * (W / 2 - 90) + 2 * mt * t * (W / 2 - 35) + t * t * (W / 2 - 25);
    const ly = mt * mt * H + 2 * mt * t * (H - 40) + t * t * 360;
    leftPoints.push({ x: lx, y: ly });

    // Right boundary: P0 = (W/2+90, H), P1 = (W/2+35, H-40), P2 = (W/2+25, 360)
    const rx = mt * mt * (W / 2 + 90) + 2 * mt * t * (W / 2 + 35) + t * t * (W / 2 + 25);
    const ry = mt * mt * H + 2 * mt * t * (H - 40) + t * t * 360;
    rightPoints.push({ x: rx, y: ry });
  }

  // Draw walkway fill polygon
  path.beginPath();
  path.moveTo(leftPoints[0].x, leftPoints[0].y);
  for (let i = 1; i <= steps; i++) {
    path.lineTo(leftPoints[i].x, leftPoints[i].y);
  }
  path.lineTo(rightPoints[steps].x, rightPoints[steps].y);
  for (let i = steps - 1; i >= 0; i--) {
    path.lineTo(rightPoints[i].x, rightPoints[i].y);
  }
  path.closePath();
  path.fillPath();

  // Draw soft walkway borders
  path.lineStyle(3, 0xe0b368, 0.7);
  path.beginPath();
  path.moveTo(leftPoints[0].x, leftPoints[0].y);
  for (let i = 1; i <= steps; i++) {
    path.lineTo(leftPoints[i].x, leftPoints[i].y);
  }
  path.strokePath();

  path.beginPath();
  path.moveTo(rightPoints[0].x, rightPoints[0].y);
  for (let i = 1; i <= steps; i++) {
    path.lineTo(rightPoints[i].x, rightPoints[i].y);
  }
  path.strokePath();

  // ── 8. Trees at edges (won't be covered by game panels) ──
  const treeDefs = opts.trees ?? [
    { x: 14,  y: 380, s: 0.65 },
    { x: 46,  y: 372, s: 0.75 },
    { x: 758, y: 380, s: 0.70 },
    { x: 788, y: 374, s: 0.65 },
  ];
  treeDefs.forEach(({ x, y, s }) => _tree(scene, x, y, s));

  // ── 9. Ground flowers ─────────────────────────────────────
  const fCols = [0xff6b88, 0xffaa44, 0xffd700, 0xff88cc, 0x88eeff];
  (opts.flowers ?? [34, 66, 733, 765]).forEach((fx, i) => {
    const fy = 412 + (i % 2 ? 3 : 0);
    scene.add.circle(fx, fy, 5, fCols[i % fCols.length]);
    scene.add.circle(fx, fy, 2.5, 0xffff99);
  });

  return animated;
}

// ─────────────────────────────────────────────────────────────
//  drawPanel() — rounded, drop-shadowed cream panel
// ─────────────────────────────────────────────────────────────
export function drawPanel(scene, x, y, w, h, opts = {}) {
  const r  = opts.radius ?? 20;
  const g  = scene.add.graphics();
  if (opts.depth !== undefined) g.setDepth(opts.depth);

  // Drop shadow
  g.fillStyle(0x000000, 0.14);
  g.fillRoundedRect(x + 3, y + 6, w, h, r);

  // Main fill (opacity set to 70% per user request, change the 0.7 to edit opacity)
  g.fillStyle(opts.fill ?? 0xfffcf0, 0.7);
  g.fillRoundedRect(x, y, w, h, r);

  // Top header tint
  if (opts.headerH) {
    g.fillStyle(0xfff0c0, 0.65);
    g.fillRoundedRect(x + 2, y + 2, w - 4, opts.headerH, { tl: r - 2, tr: r - 2, bl: 0, br: 0 });
  }

  // Border
  g.lineStyle(opts.bw ?? 4, opts.border ?? 0xe8a820, 1);
  g.strokeRoundedRect(x, y, w, h, r);

  return g;
}

// ─────────────────────────────────────────────────────────────
//  drawDashedRoundedRect() — draws a perfectly calculated dashed rounded border
// ─────────────────────────────────────────────────────────────
export function drawDashedRoundedRect(graphics, x, y, w, h, r, color, thickness = 2.5, dashLen = 6, gapLen = 4) {
  graphics.lineStyle(thickness, color, 1);
  const segments = [];
  
  // Top edge
  segments.push({ type: 'line', x1: x + r, y1: y, x2: x + w - r, y2: y });
  // Top-right corner
  segments.push({ type: 'arc', cx: x + w - r, cy: y + r, r: r, a1: -Math.PI / 2, a2: 0 });
  // Right edge
  segments.push({ type: 'line', x1: x + w, y1: y + r, x2: x + w, y2: y + h - r });
  // Bottom-right corner
  segments.push({ type: 'arc', cx: x + w - r, cy: y + h - r, r: r, a1: 0, a2: Math.PI / 2 });
  // Bottom edge
  segments.push({ type: 'line', x1: x + w - r, y1: y + h, x2: x + r, y2: y + h });
  // Bottom-left corner
  segments.push({ type: 'arc', cx: x + r, cy: y + h - r, r: r, a1: Math.PI / 2, a2: Math.PI });
  // Left edge
  segments.push({ type: 'line', x1: x, y1: y + h - r, x2: x, y2: y + r });
  // Top-left corner
  segments.push({ type: 'arc', cx: x + r, cy: y + r, r: r, a1: Math.PI, a2: Math.PI * 1.5 });

  let isDash = true;
  let leftOver = 0;

  segments.forEach(seg => {
    if (seg.type === 'line') {
      let dx = seg.x2 - seg.x1;
      let dy = seg.y2 - seg.y1;
      let len = Math.sqrt(dx * dx + dy * dy);
      let ux = dx / len;
      let uy = dy / len;
      let dist = 0;

      while (dist < len) {
        let step = isDash ? dashLen : gapLen;
        if (leftOver > 0) {
          step = leftOver;
          leftOver = 0;
        }
        let remaining = len - dist;
        if (step > remaining) {
          leftOver = step - remaining;
          step = remaining;
        }
        
        if (isDash) {
          graphics.lineBetween(seg.x1 + dist * ux, seg.y1 + dist * uy, seg.x1 + (dist + step) * ux, seg.y1 + (dist + step) * uy);
        }
        
        dist += step;
        if (dist < len || leftOver === 0) {
          isDash = !isDash;
        }
      }
    } else if (seg.type === 'arc') {
      let circumference = 2 * Math.PI * seg.r * 0.25;
      let dist = 0;
      while (dist < circumference) {
        let step = isDash ? dashLen : gapLen;
        if (leftOver > 0) {
          step = leftOver;
          leftOver = 0;
        }
        let remaining = circumference - dist;
        if (step > remaining) {
          leftOver = step - remaining;
          step = remaining;
        }

        if (isDash) {
          let angleStart = seg.a1 + (dist / circumference) * (seg.a2 - seg.a1);
          let angleEnd = seg.a1 + ((dist + step) / circumference) * (seg.a2 - seg.a1);
          graphics.beginPath();
          graphics.arc(seg.cx, seg.cy, seg.r, angleStart, angleEnd, false);
          graphics.strokePath();
        }

        dist += step;
        if (dist < circumference || leftOver === 0) {
          isDash = !isDash;
        }
      }
    }
  });
}

// ─────────────────────────────────────────────────────────────
//  drawRibbonBanner() — draws a gorgeous 3D layered illustrated banner ribbon
// ─────────────────────────────────────────────────────────────
export function drawRibbonBanner(graphics, cx, cy, w, h, color, shadowColor) {
  // 3. Draw main banner face
  graphics.fillStyle(color, 1);
  graphics.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 6);

  // Glossy shine strip at top
  graphics.fillStyle(0xffffff, 0.22);
  graphics.fillRoundedRect(cx - w / 2 + 4, cy - h / 2 + 3, w - 8, 4, 2);

  // Outline for 3D pop
  graphics.lineStyle(3.2, 0xffffff, 0.95);
  graphics.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, 6);
}

// ─────────────────────────────────────────────────────────────
//  chunkyButton() — 3-D layered button (shadow + main + shine)
//  Returns { g, label, btn } — btn is the interactive hit area
// ─────────────────────────────────────────────────────────────
export function chunkyButton(scene, cx, cy, w, h, text, mainColor, shadowColor, fontSize = '30px') {
  const r = Math.min(h * 0.42, 22);
  const g = scene.add.graphics();

  // Shadow layer (pushed down)
  g.fillStyle(shadowColor, 1);
  g.fillRoundedRect(cx - w / 2, cy - h / 2 + 7, w, h, r);

  // Main face
  g.fillStyle(mainColor, 1);
  g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, r);

  // Shine strip
  g.fillStyle(0xffffff, 0.28);
  g.fillRoundedRect(cx - w / 2 + 5, cy - h / 2 + 4, w - 10, h * 0.38, r * 0.55);

  // White outline
  g.lineStyle(3.5, 0xffffff, 0.95);
  g.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, r);

  // Transparent hit rectangle (slightly larger for touch)
  const btn = scene.add.rectangle(cx, cy + 3, w, h + 8, 0, 0)
    .setInteractive({ useHandCursor: true });

  const label = scene.add.text(cx, cy - 2, text, {
    fontFamily: 'Poppins, sans-serif',
    fontSize,
    color: '#ffffff',
    stroke: '#00000040',
    strokeThickness: 2,
  }).setOrigin(0.5);

  return { g, label, btn };
}

// ─────────────────────────────────────────────────────────────
//  Private helpers
// ─────────────────────────────────────────────────────────────
function _cloud(scene, x, y, s) {
  const g = scene.add.graphics({ x, y });
  g.fillStyle(0xffffff, 0.94);
  g.fillEllipse(0,       0,      90  * s, 50  * s);
  g.fillEllipse(-33 * s, 9  * s, 62  * s, 40  * s);
  g.fillEllipse( 33 * s, 9  * s, 62  * s, 40  * s);
  g.fillEllipse(-11 * s, -18* s, 56  * s, 40  * s);
  g.fillEllipse( 18 * s, -13* s, 48  * s, 34  * s);
  return g;
}

function _tree(scene, x, y, s = 1) {
  // Trunk
  scene.add.rectangle(x, y + 16 * s, 11 * s, 30 * s, 0x8b5c2a);
  // Foliage layers (depth illusion via stacked circles)
  scene.add.circle(x,          y,          25 * s, 0x3a9020);
  scene.add.circle(x,          y - 2  * s, 22 * s, 0x4cb030);
  scene.add.circle(x - 12 * s, y + 5  * s, 18 * s, 0x5cc040);
  scene.add.circle(x + 12 * s, y + 5  * s, 17 * s, 0x4cb030);
  scene.add.circle(x,          y - 16 * s, 16 * s, 0x6dd050);
}

// ─────────────────────────────────────────────────────────────
//  Audio & Mute Controls (Modular & Shared)
// ─────────────────────────────────────────────────────────────
let _ctx = null;
let _muted = false;

function _ac() { if (!_ctx) try { _ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(_){} return _ctx; }
function _tone(f, t='sine', d=0.15, v=0.18) {
  if (_muted) return;
  const c=_ac(); if(!c) return;
  try { const o=c.createOscillator(),g=c.createGain(); o.connect(g); g.connect(c.destination);
    o.type=t; o.frequency.setValueAtTime(f,c.currentTime);
    g.gain.setValueAtTime(v,c.currentTime); g.gain.exponentialRampToValueAtTime(0.001,c.currentTime+d);
    o.start(c.currentTime); o.stop(c.currentTime+d); } catch(_){}
}

export function playSuccess(){ _tone(523,'sine',0.12,0.2); setTimeout(()=>_tone(659,'sine',0.12,0.2),110); setTimeout(()=>_tone(784,'sine',0.2,0.25),220); }
export function playWrong()  { _tone(220,'sawtooth',0.18,0.15); }
export function playPop()    { _tone(440,'sine',0.07,0.12); }
export function playClick()  { _tone(600,'triangle',0.05,0.10); }

export function getMuted() { return _muted; }
export function setMuted(val) { _muted = val; }

