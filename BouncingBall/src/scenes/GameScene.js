import { Scene, Math as PMath, Utils } from 'phaser';
import { GAME_W, GAME_H } from '../constants.js';

const ALL_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// Visuals
const WALL_THICKNESS = 14;
const WALL_COLOR = 0x3a86ff;
const WALL_HIGHLIGHT = 0x6fa8ff;

const BALL_RADIUS = 32;
const BALL_COLORS = [0xffd93d, 0xff6b6b, 0x95e1d3, 0xa18cd1, 0xffa07a, 0x4ecdc4, 0xff8e53];

const PADDLE_W = 110;
const PADDLE_H = 18;
const PADDLE_Y = GAME_H - 70;
const PADDLE_COLOR = 0xff6b6b;

// Physics tuning
const BASE_SPEED = 280;       // px/s
const SPEED_STEP = 12;        // tiny speedup each successful bounce
const MAX_SPEED = 420;
const MAX_BOUNCE_ANGLE = Math.PI / 3; // 60° from vertical when ball hits paddle edge

export class GameScene extends Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  init() {
    // Reset all per-run state here (NOT in the constructor) so scene.restart works.
    this.completedLetters = [];
    this.remainingLetters = [...ALL_LETTERS];
    this.currentLetter = null;
    this.ballSpeed = BASE_SPEED;
    this.ballVel = { x: 0, y: 0 };
    this.isPaused = true;
    this.failPromptActive = false;
  }

  create() {
    const cx = GAME_W / 2;

    // ===== Walls (top, left, right) — visible blue boundary =====
    // Top
    this.topWall = this.add.rectangle(cx, WALL_THICKNESS / 2, GAME_W, WALL_THICKNESS, WALL_COLOR);
    // Left
    this.leftWall = this.add.rectangle(WALL_THICKNESS / 2, GAME_H / 2, WALL_THICKNESS, GAME_H, WALL_COLOR);
    // Right
    this.rightWall = this.add.rectangle(GAME_W - WALL_THICKNESS / 2, GAME_H / 2, WALL_THICKNESS, GAME_H, WALL_COLOR);

    // Subtle highlight strip on inner edge
    this.add.rectangle(cx, WALL_THICKNESS + 1, GAME_W - WALL_THICKNESS * 2, 2, WALL_HIGHLIGHT, 0.5);

    // Bottom indicator dashed line (just visual, NOT a wall)
    this.drawDashedLine(WALL_THICKNESS, GAME_H - 10, GAME_W - WALL_THICKNESS, GAME_H - 10, 0xff6b6b, 8, 6);

    // ===== HUD (progress + current letter pool size) =====
    this.progressText = this.add.text(cx, 32, '', {
      fontFamily: 'Fredoka One, Arial Black, sans-serif',
      fontSize: '20px',
      color: '#302b63',
    }).setOrigin(0.5).setDepth(10);

    this.subText = this.add.text(cx, 56, 'Bounce the ball!', {
      fontFamily: 'Nunito, Arial, sans-serif',
      fontSize: '13px',
      color: '#5a5a8a',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10);

    // ===== Paddle =====
    this.paddle = this.add.rectangle(cx, PADDLE_Y, PADDLE_W, PADDLE_H, PADDLE_COLOR);
    this.paddle.setStrokeStyle(3, 0xffffff);

    // Paddle pulse
    this.tweens.add({
      targets: this.paddle,
      scaleY: 1.2,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // ===== Ball =====
    this.ballColor = Utils.Array.GetRandom(BALL_COLORS);
    this.ball = this.add.circle(cx, GAME_H / 2 - 80, BALL_RADIUS, this.ballColor);
    this.ball.setStrokeStyle(4, 0xffffff);

    this.ballText = this.add.text(this.ball.x, this.ball.y, '', {
      fontFamily: 'Fredoka One, Arial Black, sans-serif',
      fontSize: '38px',
      color: '#302b63',
    }).setOrigin(0.5);

    // Pulse ball + letter together (ball.scale and text.scale animate)
    this.pulseTween = this.tweens.add({
      targets: [this.ball, this.ballText],
      scale: 1.3,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // ===== Input =====
    this.cursors = this.input.keyboard.createCursorKeys();
    this.input.on('pointermove', (pointer) => {
      if (pointer.isDown || this.sys.game.device.input.touch) {
        this.movePaddleTo(pointer.x);
      }
    });
    this.input.on('pointerdown', (pointer) => this.movePaddleTo(pointer.x));

    // Pick first letter and start
    this.pickNextLetter(true);
    this.launchBall();
    this.updateProgress();
  }

  drawDashedLine(x1, y1, x2, y2, color, dash, gap) {
    const g = this.add.graphics();
    g.lineStyle(2, color, 0.6);
    const dx = x2 - x1;
    const total = Math.abs(dx);
    let drawn = 0;
    let x = x1;
    while (drawn < total) {
      const step = Math.min(dash, total - drawn);
      g.beginPath();
      g.moveTo(x, y1);
      g.lineTo(x + step, y2);
      g.strokePath();
      x += step + gap;
      drawn += step + gap;
    }
  }

  pickNextLetter(initial = false) {
    if (this.remainingLetters.length === 0) return;
    // Avoid repeating the same letter on the very next bounce
    let candidates = this.remainingLetters;
    if (!initial && this.currentLetter && candidates.length > 1) {
      candidates = candidates.filter((l) => l !== this.currentLetter);
    }
    this.currentLetter = Utils.Array.GetRandom(candidates);
    this.ballText.setText(this.currentLetter);

    // New random ball color for variety on each new letter (not on miss)
    if (!initial) {
      const newColor = Utils.Array.GetRandom(BALL_COLORS.filter((c) => c !== this.ballColor));
      this.ballColor = newColor;
      this.ball.setFillStyle(newColor);
    }
  }

  launchBall() {
    // Start near top-center, random downward direction
    this.ball.x = GAME_W / 2;
    this.ball.y = GAME_H * 0.35;
    this.ballText.x = this.ball.x;
    this.ballText.y = this.ball.y;

    const angle = PMath.FloatBetween(-Math.PI / 4, Math.PI / 4) + Math.PI / 2; // mostly downward
    this.ballVel.x = Math.cos(angle) * this.ballSpeed;
    this.ballVel.y = Math.sin(angle) * this.ballSpeed;

    this.isPaused = false;
  }

  movePaddleTo(targetX) {
    if (this.failPromptActive) return;
    const half = PADDLE_W / 2;
    const minX = WALL_THICKNESS + half;
    const maxX = GAME_W - WALL_THICKNESS - half;
    this.paddle.x = PMath.Clamp(targetX, minX, maxX);
  }

  update(time, delta) {
    // Keyboard fallback for desktop
    const keySpeed = 6 * (delta / 16.67);
    if (this.cursors.left.isDown) this.movePaddleTo(this.paddle.x - keySpeed * 6);
    if (this.cursors.right.isDown) this.movePaddleTo(this.paddle.x + keySpeed * 6);

    if (this.isPaused) return;

    const dt = delta / 1000;
    this.ball.x += this.ballVel.x * dt;
    this.ball.y += this.ballVel.y * dt;

    // ----- Wall collisions -----
    const minX = WALL_THICKNESS + BALL_RADIUS;
    const maxX = GAME_W - WALL_THICKNESS - BALL_RADIUS;
    const minY = WALL_THICKNESS + BALL_RADIUS;

    if (this.ball.x < minX) {
      this.ball.x = minX;
      this.ballVel.x = Math.abs(this.ballVel.x);
      this.flashWall(this.leftWall);
    } else if (this.ball.x > maxX) {
      this.ball.x = maxX;
      this.ballVel.x = -Math.abs(this.ballVel.x);
      this.flashWall(this.rightWall);
    }

    if (this.ball.y < minY) {
      this.ball.y = minY;
      this.ballVel.y = Math.abs(this.ballVel.y);
      this.flashWall(this.topWall);
    }

    // ----- Paddle collision -----
    const paddleTop = this.paddle.y - PADDLE_H / 2;
    const paddleLeft = this.paddle.x - PADDLE_W / 2;
    const paddleRight = this.paddle.x + PADDLE_W / 2;

    if (
      this.ballVel.y > 0 &&
      this.ball.y + BALL_RADIUS >= paddleTop &&
      this.ball.y < this.paddle.y + PADDLE_H / 2 + 4 &&
      this.ball.x >= paddleLeft - BALL_RADIUS * 0.6 &&
      this.ball.x <= paddleRight + BALL_RADIUS * 0.6
    ) {
      this.handlePaddleHit();
    }

    // ----- Fall through bottom -----
    if (this.ball.y - BALL_RADIUS > GAME_H + 10 && !this.failPromptActive) {
      this.handleMiss();
    }

    // Keep letter on top of ball
    this.ballText.x = this.ball.x;
    this.ballText.y = this.ball.y;
  }

  handlePaddleHit() {
    // Position ball just above paddle so it doesn't get stuck
    this.ball.y = this.paddle.y - PADDLE_H / 2 - BALL_RADIUS - 1;

    // Compute reflection angle based on where on the paddle the ball hit
    const offset = (this.ball.x - this.paddle.x) / (PADDLE_W / 2); // -1 .. 1
    const clamped = PMath.Clamp(offset, -1, 1);
    const angle = clamped * MAX_BOUNCE_ANGLE; // angle from vertical

    // Speed up slightly each successful bounce, capped
    this.ballSpeed = Math.min(this.ballSpeed + SPEED_STEP, MAX_SPEED);

    this.ballVel.x = Math.sin(angle) * this.ballSpeed;
    this.ballVel.y = -Math.abs(Math.cos(angle) * this.ballSpeed);

    // Mark current letter as completed
    if (this.currentLetter && !this.completedLetters.includes(this.currentLetter)) {
      this.completedLetters.push(this.currentLetter);
      this.remainingLetters = this.remainingLetters.filter((l) => l !== this.currentLetter);
    }

    // Feedback
    this.cameras.main.shake(80, 0.005);
    this.cameras.main.flash(80, 200, 255, 200);
    this.flashPaddle();

    // Bounce text pop
    this.tweens.add({
      targets: this.paddle,
      scaleY: 1.6,
      duration: 100,
      yoyo: true,
      ease: 'Quad.easeOut',
    });

    // Check win
    if (this.remainingLetters.length === 0) {
      this.isPaused = true;
      this.tweens.killTweensOf([this.ball, this.ballText, this.paddle]);
      this.cameras.main.flash(300, 255, 255, 255);
      this.time.delayedCall(400, () => {
        this.scene.start('WinScene');
      });
      return;
    }

    // Update letter for next bounce
    this.pickNextLetter(false);
    this.updateProgress();
  }

  handleMiss() {
    this.failPromptActive = true;
    this.isPaused = true;

    this.cameras.main.shake(200, 0.012);
    this.cameras.main.flash(200, 255, 80, 80);

    // Hide ball briefly
    this.ball.setVisible(false);
    this.ballText.setVisible(false);

    // Show "Oh no! Try again!" prompt
    const cx = GAME_W / 2;
    const overlay = this.add.rectangle(cx, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.35).setDepth(20);
    const promptBg = this.add.rectangle(cx, GAME_H / 2, 320, 180, 0xfff5e1).setDepth(20);
    promptBg.setStrokeStyle(5, 0xff6b6b);

    const title = this.add.text(cx, GAME_H / 2 - 35, 'Oh no!', {
      fontFamily: 'Fredoka One, Arial Black, sans-serif',
      fontSize: '40px',
      color: '#ff6b6b',
    }).setOrigin(0.5).setDepth(21);

    const sub = this.add.text(cx, GAME_H / 2 + 15, 'Try again!', {
      fontFamily: 'Fredoka One, Arial Black, sans-serif',
      fontSize: '28px',
      color: '#302b63',
    }).setOrigin(0.5).setDepth(21);

    const letterHint = this.add.text(cx, GAME_H / 2 + 55, `Letter: ${this.currentLetter}`, {
      fontFamily: 'Nunito, Arial, sans-serif',
      fontSize: '16px',
      color: '#5a5a8a',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(21);

    this.tweens.add({
      targets: [title, sub],
      scale: 1.1,
      duration: 400,
      yoyo: true,
      ease: 'Sine.easeInOut',
    });

    // Reset paddle to center for fairness
    this.paddle.x = cx;

    // Resume after a short delay (same letter)
    this.time.delayedCall(1500, () => {
      this.tweens.killTweensOf([title, sub]);
      overlay.destroy();
      promptBg.destroy();
      title.destroy();
      sub.destroy();
      letterHint.destroy();

      // Reset speed slightly so it isn't too punishing
      this.ballSpeed = Math.max(BASE_SPEED, this.ballSpeed - SPEED_STEP * 4);

      this.ball.setVisible(true);
      this.ballText.setVisible(true);
      this.failPromptActive = false;
      this.launchBall();
    });
  }

  flashWall(wall) {
    const original = wall.fillColor;
    wall.setFillStyle(WALL_HIGHLIGHT);
    this.time.delayedCall(80, () => wall.setFillStyle(original));
  }

  flashPaddle() {
    this.paddle.setFillStyle(0xffd93d);
    this.time.delayedCall(120, () => this.paddle.setFillStyle(PADDLE_COLOR));
  }

  updateProgress() {
    const done = this.completedLetters.length;
    this.progressText.setText(`${done} / 26 letters`);
  }
}
