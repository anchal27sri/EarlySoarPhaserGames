import { Scene, Math as PMath } from 'phaser';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const SNAKE_SPEED = 2;
const WAVE_MAGNITUDE = 8.4;
const WAVE_FREQUENCY = 0.0084;

const HEAD_RADIUS = 6;
const TAIL_RADIUS = 1.5;
const SEGMENT_SPACING = 2;
const INITIAL_SEGMENTS = 45;
const GROW_AMOUNT = 12;

const COLOR_BODY = 0x2e8b3a;
const COLOR_BODY_LIGHT = 0x5bbf5e;
const COLOR_OUTLINE = 0x1a5c25;
const COLOR_PATCH = 0xd4c94a;
const COLOR_PATCH_DARK = 0xa89b2a;
const COLOR_HEAD = 0x267330;
const COLOR_HEAD_TOP = 0x3da64a;
const COLOR_EYE_WHITE = 0xf5f5dc;
const COLOR_EYE_PUPIL = 0x111111;
const COLOR_EYE_IRIS = 0x2a2a00;
const COLOR_TONGUE = 0xe03030;
const COLOR_NOSTRIL = 0x1a4a20;

const TURN_AMOUNT = Math.PI / 2;
const TURN_SPEED = 0.06;

const SWIPE_MIN_DIST = 15;
const SWIPE_MAX_TIME = 800;

const LETTER_CIRCLE_RADIUS = 22;
const LETTER_MARGIN = 50;
const LETTER_COLOR = 0x5577dd;
const COLLISION_DISTANCE = HEAD_RADIUS + LETTER_CIRCLE_RADIUS;

const PATCH_INTERVAL = 6;

// ─────────────────────────────────────────────────────────────────────────────
// PHASER SCENE
// ─────────────────────────────────────────────────────────────────────────────

export class SnakeScene extends Scene {
    constructor() {
        super('SnakeScene');
    }

    preload() {
        this.load.image('background', new URL('../assets/background.png', import.meta.url).href);
    }

    create() {
        const w = this.scale.width;
        const h = this.scale.height;

        this.bg = this.add.image(w / 2, h / 2, 'background');
        this.bg.setDisplaySize(w, h);
        this.bg.setDepth(-1);

        this.initSnakeState();

        this.snakeGraphics = this.add.graphics();

        this.setupSwipeInput();

        this.spawnLetter();

        this.score = 0;
        this.scoreText = this.add.text(16, 16, 'Letters: 0', {
            fontSize: '20px',
            fontFamily: 'Arial, sans-serif',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setDepth(10);

        this.flashText = this.add.text(w / 2, h / 2, '', {
            fontSize: '72px',
            fontFamily: 'Arial, sans-serif',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5).setAlpha(0).setDepth(10);

        this.scale.on('resize', this.onResize, this);
    }

    onResize(gameSize) {
        const w = gameSize.width;
        const h = gameSize.height;

        if (this.bg) {
            this.bg.setPosition(w / 2, h / 2);
            this.bg.setDisplaySize(w, h);
        }

        if (this.flashText) {
            this.flashText.setPosition(w / 2, h / 2);
        }
    }

    update(time, delta) {
        this.handleTurning();
        this.updateSnakeMovement(time);
        this.drawSnake();
        this.checkLetterCollision();
    }

    // =========================================================================
    // SNAKE STATE INITIALIZATION
    // =========================================================================

    initSnakeState() {
        this.headX = this.scale.width / 2;
        this.headY = this.scale.height / 2;
        this.headAngle = -Math.PI / 2;
        this.targetAngle = this.headAngle;
        this.isTurning = false;
        this.trail = [];
        this.numSegments = INITIAL_SEGMENTS;
        this.lastWaveOffset = 0;

        for (let i = 0; i < this.numSegments * SEGMENT_SPACING; i++) {
            this.trail.push({
                x: this.headX,
                y: this.headY + i * 1
            });
        }
    }

    // =========================================================================
    // SNAKE MOVEMENT
    // =========================================================================

    updateSnakeMovement(time) {
        const vx = Math.cos(this.headAngle) * SNAKE_SPEED;
        const vy = Math.sin(this.headAngle) * SNAKE_SPEED;

        const waveOffset = Math.sin(time * WAVE_FREQUENCY) * WAVE_MAGNITUDE;
        const waveDelta = waveOffset - this.lastWaveOffset;
        this.lastWaveOffset = waveOffset;

        const perpX = -Math.sin(this.headAngle);
        const perpY = Math.cos(this.headAngle);

        this.headX += vx + perpX * waveDelta;
        this.headY += vy + perpY * waveDelta;

        this.headX = PMath.Wrap(this.headX, 0, this.scale.width);
        this.headY = PMath.Wrap(this.headY, 0, this.scale.height);

        this.trail.unshift({ x: this.headX, y: this.headY });

        const maxTrailLength = this.numSegments * SEGMENT_SPACING + 1;
        while (this.trail.length > maxTrailLength) {
            this.trail.pop();
        }
    }

    // =========================================================================
    // SNAKE RENDERING
    // =========================================================================

    drawSnake() {
        const g = this.snakeGraphics;
        g.clear();

        const segments = this.buildSegmentData();

        for (let i = segments.length - 1; i >= 0; i--) {
            const s = segments[i];
            g.fillStyle(COLOR_OUTLINE, 1);
            g.fillCircle(s.x, s.y, s.radius + 1.5);
        }

        for (let i = segments.length - 1; i >= 0; i--) {
            const s = segments[i];
            g.fillStyle(COLOR_BODY, 1);
            g.fillCircle(s.x, s.y, s.radius);
        }

        for (let i = segments.length - 1; i >= 0; i--) {
            const s = segments[i];
            const bellyRadius = s.radius * 0.45;
            const bx = s.x + Math.cos(s.angle + Math.PI / 2) * s.radius * 0.25;
            const by = s.y + Math.sin(s.angle + Math.PI / 2) * s.radius * 0.25;
            g.fillStyle(COLOR_BODY_LIGHT, 0.5);
            g.fillCircle(bx, by, bellyRadius);
        }

        for (let i = segments.length - 1; i >= 1; i--) {
            if (i % PATCH_INTERVAL === 0) {
                this.drawPatch(g, segments[i]);
            }
        }

        this.drawTailTip(g, segments);
        this.drawHead(g);
    }

    buildSegmentData() {
        const segments = [];
        for (let i = 0; i < this.numSegments; i++) {
            const trailIndex = i * SEGMENT_SPACING;
            if (trailIndex >= this.trail.length) break;

            const pos = this.trail[trailIndex];
            const radius = this.getSegmentRadius(i, this.numSegments);

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

    getSegmentRadius(index, total) {
        const t = index / total;
        if (t < 0.3) return HEAD_RADIUS;
        const taperT = (t - 0.3) / 0.7;
        return PMath.Linear(HEAD_RADIUS, TAIL_RADIUS, taperT * taperT);
    }

    drawPatch(g, seg) {
        const { x, y, radius, angle } = seg;
        const patchSize = radius * 0.75;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const drawDiamond = (size, color) => {
            g.fillStyle(color, 1);
            g.beginPath();
            g.moveTo(x + cos * size,          y + sin * size);
            g.lineTo(x - sin * size * 0.65,   y + cos * size * 0.65);
            g.lineTo(x - cos * size,          y - sin * size);
            g.lineTo(x + sin * size * 0.65,   y - cos * size * 0.65);
            g.closePath();
            g.fillPath();
        };

        drawDiamond(patchSize, COLOR_PATCH_DARK);
        drawDiamond(patchSize * 0.7, COLOR_PATCH);
    }

    drawTailTip(g, segments) {
        if (segments.length < 3) return;
        const last = segments[segments.length - 1];
        const prev = segments[segments.length - 3];

        const tipAngle = Math.atan2(last.y - prev.y, last.x - prev.x);
        const tipLen = 6;
        const tipWidth = last.radius * 0.7;

        const tipX = last.x + Math.cos(tipAngle) * tipLen;
        const tipY = last.y + Math.sin(tipAngle) * tipLen;

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

    drawHead(g) {
        const hx = this.headX;
        const hy = this.headY;
        const a = this.headAngle;

        const fx = Math.cos(a);
        const fy = Math.sin(a);
        const lx = -Math.sin(a);
        const ly = Math.cos(a);

        const R = HEAD_RADIUS;

        const pt = (fwd, lat) => ({
            x: hx + fx * fwd + lx * lat,
            y: hy + fy * fwd + ly * lat
        });

        const snoutTip   = pt(R * 2.0,  0);
        const snoutL     = pt(R * 1.3,  R * 0.45);
        const snoutR     = pt(R * 1.3, -R * 0.45);
        const jawL       = pt(R * 0.15, R * 1.1);
        const jawR       = pt(R * 0.15,-R * 1.1);
        const neckL      = pt(-R * 0.9, R * 0.85);
        const neckR      = pt(-R * 0.9,-R * 0.85);

        const drawPoly = (points, color, expand) => {
            g.fillStyle(color, 1);
            g.beginPath();
            for (let i = 0; i < points.length; i++) {
                const p = points[i];
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

        drawPoly(headPoints, COLOR_OUTLINE, 1.5);
        drawPoly(headPoints, COLOR_HEAD, 0);

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

        g.lineStyle(1.2, COLOR_OUTLINE, 0.6);
        for (const side of [-1, 1]) {
            const browStart = pt(R * 0.8, R * 0.5 * side);
            const browEnd   = pt(R * 0.2, R * 0.95 * side);
            g.beginPath();
            g.moveTo(browStart.x, browStart.y);
            g.lineTo(browEnd.x, browEnd.y);
            g.strokePath();
        }

        const nostrilFwd = R * 1.5;
        const nostrilLat = R * 0.2;
        for (const side of [-1, 1]) {
            const np = pt(nostrilFwd, nostrilLat * side);
            g.fillStyle(COLOR_NOSTRIL, 1);
            g.fillCircle(np.x, np.y, 1.0);
        }

        const eyeFwd = R * 0.45;
        const eyeLat = R * 0.75;
        const eyeRadius = 3.0;
        const irisRadius = 2.2;
        const pupilRadius = 1.2;

        for (const side of [-1, 1]) {
            const ep = pt(eyeFwd, eyeLat * side);

            g.fillStyle(COLOR_EYE_WHITE, 1);
            g.fillCircle(ep.x, ep.y, eyeRadius);

            g.fillStyle(COLOR_EYE_IRIS, 1);
            g.fillCircle(ep.x, ep.y, irisRadius);

            g.fillStyle(COLOR_EYE_PUPIL, 1);
            const slitLen = 1.8;
            const s1 = pt(eyeFwd, eyeLat * side + slitLen * 0.3 * side);
            const s2 = pt(eyeFwd, eyeLat * side - slitLen * 0.3 * side);
            g.fillCircle(s1.x, s1.y, pupilRadius * 0.6);
            g.fillCircle(ep.x, ep.y, pupilRadius * 0.7);
            g.fillCircle(s2.x, s2.y, pupilRadius * 0.6);

            const glint = pt(eyeFwd - R * 0.08, eyeLat * side - R * 0.1 * side);
            g.fillStyle(0xffffff, 0.85);
            g.fillCircle(glint.x, glint.y, 0.7);
        }

        const tongueFlicker = Math.sin(Date.now() * 0.01);
        if (tongueFlicker > 0.1) {
            const tongueLength = R * 1.2 + tongueFlicker * 5;
            const tongueBase = pt(R * 2.0, 0);
            const tongueTipX = tongueBase.x + fx * tongueLength;
            const tongueTipY = tongueBase.y + fy * tongueLength;

            g.lineStyle(1.2, COLOR_TONGUE, 1);
            g.beginPath();
            g.moveTo(tongueBase.x, tongueBase.y);
            g.lineTo(tongueTipX, tongueTipY);

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

    setupSwipeInput() {
        this.swipeStart = null;
        this.swipeCooldown = 0;

        this.input.on('pointerdown', (pointer) => {
            this.swipeStart = {
                x: pointer.x,
                y: pointer.y,
                time: pointer.downTime
            };
        });

        this.input.on('pointermove', (pointer) => {
            if (!this.swipeStart || !pointer.isDown) return;
            if (Date.now() < this.swipeCooldown) return;

            const dx = pointer.x - this.swipeStart.x;
            const dy = pointer.y - this.swipeStart.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance >= SWIPE_MIN_DIST) {
                const swipeAngle = Math.atan2(dy, dx);
                this.applyTurn(swipeAngle);

                this.swipeStart = {
                    x: pointer.x,
                    y: pointer.y,
                    time: Date.now()
                };
                this.swipeCooldown = Date.now() + 250;
            }
        });

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

    applyTurn(swipeAngle) {
        const baseAngle = this.isTurning ? this.targetAngle : this.headAngle;
        const cross = Math.sin(swipeAngle - baseAngle);

        if (cross > 0) {
            this.targetAngle = baseAngle + TURN_AMOUNT;
        } else {
            this.targetAngle = baseAngle - TURN_AMOUNT;
        }

        this.isTurning = true;
    }

    handleTurning() {
        if (!this.isTurning) return;

        this.headAngle = PMath.Angle.RotateTo(
            this.headAngle,
            this.targetAngle,
            TURN_SPEED
        );

        const diff = Math.abs(
            PMath.Angle.Wrap(this.targetAngle - this.headAngle)
        );
        if (diff < 0.01) {
            this.headAngle = PMath.Angle.Wrap(this.targetAngle);
            this.isTurning = false;
        }
    }

    // =========================================================================
    // LETTER TARGET
    // =========================================================================

    spawnLetter() {
        const charCode = PMath.Between(65, 90);
        const letter = String.fromCharCode(charCode);

        const w = this.scale.width;
        const h = this.scale.height;
        const lx = PMath.Between(LETTER_MARGIN, w - LETTER_MARGIN);
        const ly = PMath.Between(LETTER_MARGIN, h - LETTER_MARGIN);

        this.letterCircle = this.add.circle(lx, ly, LETTER_CIRCLE_RADIUS, LETTER_COLOR, 0.85);
        this.letterCircle.setStrokeStyle(2, 0xffffff, 0.6);

        this.letterText = this.add.text(lx, ly, letter, {
            fontSize: '26px',
            fontFamily: 'Arial, sans-serif',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.letterTween = this.tweens.add({
            targets: [this.letterCircle, this.letterText],
            scale: { from: 1.0, to: 1.25 },
            duration: 450,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    checkLetterCollision() {
        if (!this.letterCircle) return;

        const dist = PMath.Distance.Between(
            this.headX, this.headY,
            this.letterCircle.x, this.letterCircle.y
        );

        if (dist < COLLISION_DISTANCE) {
            this.collectLetter();
        }
    }

    collectLetter() {
        const collectedChar = this.letterText.text;

        this.score++;
        this.scoreText.setText('Letters: ' + this.score);

        this.showLetterFlash(collectedChar);

        if (this.letterTween) this.letterTween.destroy();
        this.letterCircle.destroy();
        this.letterText.destroy();

        this.spawnLetter();
    }

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
