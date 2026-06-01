import { Scene, Math as PMath } from 'phaser';
import {
  GAME_W, GAME_H, TOTAL_ROUNDS,
  C_GOLD, C_PURPLE, C_GREEN, C_ORANGE,
  FONT_TITLE, FONT_BODY,
  C_TXT_D, C_TXT_M,
  C_BTN_GRN, C_BTN_GRNS, C_BTN_BLU, C_BTN_BLUS,
} from '../constants.js';
import { drawLandscapeBg, drawPanel, chunkyButton, drawDashedRoundedRect, drawRibbonBanner, playClick } from '../bg.js';

// Synchronized panels coordinates for seamless visual transitions
const LP_X = 25,  LP_W = 460, LP_CX = LP_X + LP_W / 2;   // left panel
const RP_X = 505, RP_W = 270, RP_CX = RP_X + RP_W / 2;   // right panel
const PY   = 65;  // panels top-y
const PH   = 345; // panels height

export class WinScene extends Scene {
  constructor() { super({ key: 'WinScene' }); }

  init(data) {
    this.finalScore = data?.score ?? 0;
    this.finalStars = data?.stars ?? 0;
  }

  create() {
    // 1. Background image
    const bg = this.add.image(GAME_W / 2, GAME_H / 2, 'bg');
    bg.setDisplaySize(GAME_W, GAME_H);

    this.graphics = this.add.graphics().setDepth(2);

    // 2. Panels Redesign
    drawPanel(this, LP_X, PY, LP_W, PH, { radius: 24, border: 0xfab82c });
    drawPanel(this, RP_X, PY, RP_W, PH, { radius: 24, border: 0xfab82c });

    // 3. Celebrating Confetti falling
    this._spawnConfetti();

    // 4. Left: Congratulations Trophy, Fox and sequential Stars popping
    this._leftContent();

    // 5. Right: Score Card and Retry options
    this._rightContent();
  }

  // ─────────────────────────────────────────────────────────────
  //  Left Panel Content
  // ─────────────────────────────────────────────────────────────
  _leftContent() {
    // Trophy Ribbon Banner
    drawRibbonBanner(this.graphics, LP_CX, PY + 24, 300, 32, C_GOLD, 0xd4a300);
    this.add.text(LP_CX, PY + 23, '🎉  Congratulations!  🎉', {
      fontFamily: FONT_TITLE, fontSize: '16px', color: '#7a4000',
      stroke: '#ffffffaa', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10);

    // Sequential POP Stars
    const maxPoss = TOTAL_ROUNDS * 3;
    const pct = Math.min(this.finalStars / maxPoss, 1);
    const filled = Math.round(pct * 3);
    const starData = [
      { x: LP_CX - 56, y: PY + 104, size: '44px', earned: filled >= 1, delay: 200 },
      { x: LP_CX,      y: PY + 86,  size: '56px', earned: filled >= 2, delay: 430 },
      { x: LP_CX + 56, y: PY + 104, size: '44px', earned: filled >= 3, delay: 660 },
    ];
    starData.forEach(({ x, y, size, earned, delay }) => {
      if (earned) {
        const halo = this.add.circle(x, y, 32, 0xffd700, 0.2);
        this.tweens.add({ targets: halo, scale: 1.35, alpha: 0.05, duration: 800, yoyo: true, repeat: -1, delay });
      }
      const frame = earned ? 'sprite_33' : 'sprite_34';
      const finalScale = size === '56px' ? 0.65 : 0.5;
      const star = this.add.sprite(x, y, 'sprites', frame).setOrigin(0.5).setDepth(4).setScale(0);

      this.time.delayedCall(delay, () => {
        this.tweens.add({ targets: star, scale: finalScale, duration: 300, ease: 'Back.easeOut' });
      });
    });

    // You Did It Title text
    const title = this.add.text(LP_CX, PY + 154, 'You Did It! 🏆', {
      fontFamily: FONT_TITLE, fontSize: '32px', color: '#ff7a2f',
      stroke: '#ffffff', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(4).setAlpha(0);
    this.time.delayedCall(750, () => {
      this.tweens.add({ targets: title, alpha: 1, y: PY + 148, duration: 400, ease: 'Back.easeOut' });
    });

    this.add.text(LP_CX, PY + 188, `All ${TOTAL_ROUNDS} rounds complete!`, {
      fontFamily: FONT_TITLE, fontSize: '15px', color: '#4a9950',
      stroke: '#ffffff', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(4);

    // Fox guide circle oval frame
    const ovalG = this.add.graphics().setDepth(3);
    ovalG.fillStyle(0xfff6dc, 1);
    ovalG.fillEllipse(LP_CX, PY + 272, 130, 100);
    ovalG.lineStyle(3, 0xfab82c, 1);
    ovalG.strokeEllipse(LP_CX, PY + 272, 130, 100);
    this.tweens.add({ targets: ovalG, scaleX: 1.04, scaleY: 0.96, duration: 1100, yoyo: true, repeat: -1 });

    const mascot = this.add.sprite(LP_CX, PY + 270, 'sprites', 'sprite_29').setOrigin(0.5).setDepth(4).setScale(0.85);
    this.tweens.add({ targets: mascot, y: PY + 260, scaleX: 0.9, scaleY: 0.8, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Fox Guide speech bubble
    const bub = this.add.graphics().setDepth(5);
    bub.fillStyle(0xffffff, 1);
    bub.fillRoundedRect(LP_CX - 90, PY + 214, 180, 24, 8);
    bub.lineStyle(2, 0xff7a2f, 1);
    bub.strokeRoundedRect(LP_CX - 90, PY + 214, 180, 24, 8);

    this.add.text(LP_CX, PY + 225, "You're a Math Star! 🌟", {
      fontFamily: FONT_BODY, fontSize: '10.5px', color: '#4a2808', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(6);

    this.add.text(LP_CX, PY + PH - 16, 'EarlySoar Games — Learn while you play!', {
      fontFamily: FONT_BODY, fontSize: '10px', color: '#b08060',
    }).setOrigin(0.5).setDepth(4);
  }

  // ─────────────────────────────────────────────────────────────
  //  Right Panel Content
  // ─────────────────────────────────────────────────────────────
  _rightContent() {
    // "Your Result" Blue Ribbon Banner
    drawRibbonBanner(this.graphics, RP_CX, PY + 24, RP_W - 32, 28, 0x2196f3, 0x1565c0);
    this.add.text(RP_CX, PY + 23, '📊  Your Result', {
      fontFamily: FONT_BODY, fontSize: '11px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10);

    // Score details box card
    const maxPoss = TOTAL_ROUNDS * 3;
    const pct = Math.min(this.finalStars / maxPoss, 1);
    const perf = pct >= 0.8 ? '🌟 Excellent!' : pct >= 0.5 ? '👏 Good Job!' : '💪 Keep Practicing!';
    const perfClr = pct >= 0.8 ? '#2a6000' : pct >= 0.5 ? '#806000' : '#804020';

    this.graphics.fillStyle(0xfffdf6, 1);
    this.graphics.fillRoundedRect(RP_X + 16, PY + 58, RP_W - 32, 90, 16);
    drawDashedRoundedRect(this.graphics, RP_X + 16, PY + 58, RP_W - 32, 90, 16, 0x2196f3, 2.5, 6, 4);

    this.add.text(RP_CX, PY + 78, `Score: ${this.finalScore} / ${TOTAL_ROUNDS}`, {
      fontFamily: FONT_TITLE, fontSize: '18px', color: '#4a2808',
    }).setOrigin(0.5).setDepth(10);

    this.add.text(RP_CX, PY + 104, `Stars: ${this.finalStars} / ${maxPoss}`, {
      fontFamily: FONT_BODY, fontSize: '13px', color: '#b07800', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10);

    this.add.text(RP_CX, PY + 126, perf, {
      fontFamily: FONT_TITLE, fontSize: '14px', color: perfClr,
    }).setOrigin(0.5).setDepth(10);

    // PLAY AGAIN green chunky button
    const { g: pg, label: pl, btn: pb } = chunkyButton(this, RP_CX, PY + 194, 210, 56, '▶  PLAY AGAIN', C_BTN_GRN, C_BTN_GRNS, '24px');
    this.tweens.add({ targets: [pg, pl], scale: 1.05, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // MENU blue chunky button
    const { g: mg, label: ml, btn: mb } = chunkyButton(this, RP_CX, PY + 264, 180, 48, '🏠  MENU', C_BTN_BLU, C_BTN_BLUS, '20px');

    this.add.text(RP_CX, PY + PH - 16, 'Enter = Play Again  •  Esc = Menu', {
      fontFamily: FONT_BODY, fontSize: '10px', color: '#aabccc',
    }).setOrigin(0.5).setDepth(10);

    // Navigation trigger functions
    const goPlay = () => { this.tweens.killAll(); this.cameras.main.flash(150, 255, 255, 255); this.time.delayedCall(120, () => this.scene.start('GameScene')); };
    const goMenu = () => { this.tweens.killAll(); this.cameras.main.flash(150, 255, 255, 255); this.time.delayedCall(120, () => this.scene.start('MenuScene')); };

    pb.on('pointerdown', goPlay);
    pb.on('pointerover', () => { pg.setAlpha(0.92); playClick(); });
    pb.on('pointerout',  () => pg.setAlpha(1));

    mb.on('pointerdown', goMenu);
    mb.on('pointerover', () => { mg.setAlpha(0.92); playClick(); });
    mb.on('pointerout',  () => mg.setAlpha(1));

    this.input.keyboard.on('keydown-ENTER', goPlay);
    this.input.keyboard.on('keydown-SPACE', goPlay);
    this.input.keyboard.on('keydown-ESC',   goMenu);
    this.input.keyboard.on('keydown-M',     goMenu);
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
