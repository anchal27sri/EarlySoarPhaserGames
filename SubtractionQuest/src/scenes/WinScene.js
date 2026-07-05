import { Scene, Math as PMath } from 'phaser';
import {
  GAME_W, GAME_H, TOTAL_ROUNDS,
  C_GOLD, C_PURPLE, C_GREEN, C_ORANGE,
  FONT_TITLE, FONT_BODY,
  C_TXT_D, C_TXT_M,
  C_BTN_GRN, C_BTN_GRNS, C_BTN_BLU, C_BTN_BLUS,
} from '../constants.js';
import { drawLandscapeBg, drawPanel, chunkyButton, drawDashedRoundedRect, drawRibbonBanner, playClick } from '../bg.js';

// Synchronized panels coordinates for seamless visual transitions (440 x 956)
const LP_X = 16, LP_W = GAME_W - 32, LP_CX = LP_X + LP_W / 2;   // Upper panel
const RP_X = 16, RP_W = GAME_W - 32, RP_CX = RP_X + RP_W / 2;   // Lower panel
const PY = 80;  // Upper panel top Y
const PH = 380; // Upper panel height
const RPY = 480; // Lower panel top Y
const RPH = 330; // Lower panel height

export class WinScene extends Scene {
  constructor() { super({ key: 'WinScene' }); }

  init(data) {
    this.finalScore = data?.score ?? 0;
    this.finalStars = data?.stars ?? 0;
  }

  create() {
    // 1. Background image (Counting1.png)
    const bg = this.add.image(GAME_W / 2, GAME_H / 2, 'bg');
    bg.setDisplaySize(GAME_W, GAME_H);

    this.graphics = this.add.graphics().setDepth(2);

    // 2. Confetti falling
    this._spawnConfetti();

    // 3. Header & Home Button
    this._buildHeader();
    this._buildHomeButton();

    // 3.5. Mascot (Boy with Trophy / Fox)
    // Placed at py = 500 (top of the white card).
    // INCREASE the Y value here (e.g., 500 + 24) to bring the fox further down!
    const mascotY = 500 + 42;
    const mascot = this.add.image(GAME_W / 2, mascotY, 'mascot_win').setOrigin(0.5, 1).setScale(0.42).setDepth(1);
    this.tweens.add({ targets: mascot, y: mascotY + 4, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // 4. White Stats Panel & Actions
    this._buildStatsPanel();
  }

  _buildHeader() {
    const cy = 110;
    const cw = 340;
    const ch = 80;
    const cx = GAME_W / 2 - cw / 2;

    // Purple Card with 16px radius
    this.graphics.fillStyle(0x7B38E3, 1);
    this.graphics.fillRoundedRect(cx, cy - ch / 2, cw, ch, 16);
    this.graphics.lineStyle(4, 0xffffff, 1);
    this.graphics.strokeRoundedRect(cx, cy - ch / 2, cw, ch, 16);

    // "You Win!" text (not slanted)
    this.add.text(GAME_W / 2, cy, 'You Win!', {
      fontFamily: FONT_TITLE, fontSize: '56px', color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(10);
  }

  _buildHomeButton() {
    const hx = GAME_W - 44;
    const hy = 50;
    const hg = this.add.graphics().setDepth(10);
    hg.fillStyle(0xffffff, 1);
    hg.fillCircle(hx, hy, 24);

    this.add.text(hx, hy, '🏠', { fontSize: '24px' }).setOrigin(0.5).setDepth(11);

    const hit = this.add.circle(hx, hy, 30).setInteractive().setDepth(12);
    hit.on('pointerdown', () => { playClick(); this.scene.start('MenuScene'); });
  }

  _buildStatsPanel() {
    const px = 24, pw = GAME_W - 48;
    const py = 500, ph = 260;
    const cy = py + ph / 2;
    const cx = GAME_W / 2;

    // Draw white panel
    this.graphics.fillStyle(0xffffff, 1);
    this.graphics.fillRoundedRect(px, py, pw, ph, 24);

    // Title
    this.add.text(cx, py + 36, 'Great Job!', {
      fontFamily: FONT_TITLE, fontSize: '28px', color: '#6E40D9', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(10);

    // Subtitle
    this.add.text(cx, py + 70, 'You completed the round.', {
      fontFamily: FONT_BODY, fontSize: '15px', color: '#111111', fontStyle: '600'
    }).setOrigin(0.5).setDepth(10);

    // Stats sections
    const w = pw / 3;
    const sx1 = px + w / 2;
    const sx2 = cx;
    const sx3 = px + pw - w / 2;
    const sy = py + 160;

    // Divider lines
    this.graphics.lineStyle(1.5, 0xeeeeee, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(px + w, py + 120); this.graphics.lineTo(px + w, py + 230);
    this.graphics.moveTo(px + w * 2, py + 120); this.graphics.lineTo(px + w * 2, py + 230);
    this.graphics.strokePath();

    // 1. Stars
    this.add.sprite(sx1, sy - 34, 'sprites', 'sprite_33').setScale(0.38).setDepth(10);
    this.add.text(sx1, sy + 10, `${this.finalStars}`, { fontFamily: FONT_BODY, fontSize: '24px', color: '#000', fontStyle: 'bold' }).setOrigin(0.5).setDepth(10);
    this.add.text(sx1, sy + 35, 'Total Stars', { fontFamily: FONT_BODY, fontSize: '11px', color: '#000', fontStyle: '500' }).setOrigin(0.5).setDepth(10);

    // 2. Rounds
    this.add.text(sx2, sy - 34, '🎯', { fontSize: '36px' }).setOrigin(0.5).setDepth(10);
    this.add.text(sx2, sy + 10, `${TOTAL_ROUNDS}`, { fontFamily: FONT_BODY, fontSize: '24px', color: '#000', fontStyle: 'bold' }).setOrigin(0.5).setDepth(10);
    this.add.text(sx2, sy + 35, 'Rounds', { fontFamily: FONT_BODY, fontSize: '11px', color: '#000', fontStyle: '500' }).setOrigin(0.5).setDepth(10);

    // 3. Correct
    this.add.text(sx3, sy - 34, '✅', { fontSize: '36px' }).setOrigin(0.5).setDepth(10);
    this.add.text(sx3, sy + 10, `${this.finalScore}/${TOTAL_ROUNDS}`, { fontFamily: FONT_BODY, fontSize: '24px', color: '#000', fontStyle: 'bold' }).setOrigin(0.5).setDepth(10);
    this.add.text(sx3, sy + 35, 'Correct', { fontFamily: FONT_BODY, fontSize: '11px', color: '#000', fontStyle: '500' }).setOrigin(0.5).setDepth(10);

    // Action Buttons
    // Next Round Button (Purple)
    const btnY = py + ph + 45;
    const { g: pg, label: pl, btn: pb } = chunkyButton(this, cx, btnY, pw, 66, 'Next Round  ➔', 0x7B38E3, 0x4A20A3, '24px', 20);

    // Back to Home Button (White)
    const btn2Y = btnY + 84;
    const bg2 = this.add.graphics().setDepth(9);
    bg2.fillStyle(0xdddddd, 1);
    bg2.fillRoundedRect(px, btn2Y - 33 + 6, pw, 66, 20);
    bg2.fillStyle(0xffffff, 1);
    bg2.fillRoundedRect(px, btn2Y - 33, pw, 66, 20);
    const txt2 = this.add.text(cx, btn2Y, '🏠  Back to Home', {
      fontFamily: FONT_TITLE, fontSize: '22px', color: '#6E40D9', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(10);

    const hit2 = this.add.rectangle(cx, btn2Y, pw, 66).setInteractive().setDepth(11);

    // Interactions
    const goPlay = () => { playClick(); this.scene.start('GameScene'); };
    const goMenu = () => { playClick(); this.scene.start('MenuScene'); };

    pb.on('pointerdown', goPlay);
    pb.on('pointerover', () => { pg.setAlpha(0.92); });
    pb.on('pointerout', () => { pg.setAlpha(1); });

    hit2.on('pointerdown', goMenu);
    hit2.on('pointerover', () => { bg2.setAlpha(0.92); });
    hit2.on('pointerout', () => { bg2.setAlpha(1); });
  }

  // ─────────────────────────────────────────────────────────────
  //  Confetti Sparkle celebration rain
  // ─────────────────────────────────────────────────────────────
  _spawnConfetti() {
    const cols = [0xff6b6b, 0x4ecdc4, C_GOLD, C_PURPLE, C_GREEN, C_ORANGE, 0xff7597, 0x4ba3e3];
    for (let i = 0; i < 65; i++) {
      const x = PMath.Between(10, GAME_W - 10);
      const y = PMath.Between(-30, GAME_H * 0.55);
      const r = PMath.Between(4, 11);
      const c = cols[i % cols.length];
      const p = this.add.circle(x, y, r, c);
      this.tweens.add({
        targets: p,
        y: y + PMath.Between(60, 170),
        angle: PMath.Between(-200, 200),
        alpha: { from: 1, to: 0.4 },
        duration: PMath.Between(1500, 3500),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: PMath.Between(0, 1000),
      });
    }
  }
}
