import { Scene, Math as PMath, Utils } from 'phaser';
import {
  GAME_W, GAME_H, TOTAL_ROUNDS,
  C_WHITE, C_GOLD, C_GREEN, C_ORANGE, C_PURPLE, C_TEAL,
  FONT_TITLE, FONT_BODY, FONT_NUMBERS,
  C_TXT_D, C_TXT_M, C_PANEL_BD,
  C_CRD_A, C_CRD_AS, C_CRD_B, C_CRD_BS, C_CRD_C, C_CRD_CS,
  C_BTN_GRN, C_BTN_GRNS, C_BTN_OR, C_BTN_ORS, C_BTN_PUR, C_BTN_PURS, C_BTN_BLU, C_BTN_BLUS,
} from '../constants.js';
import { drawLandscapeBg, drawPanel, drawDashedRoundedRect, drawRibbonBanner, playClick, playSuccess, playWrong, playPop, getMuted, setMuted } from '../bg.js';

// ─── Refined Layout Geometry (800 × 450) ────────────────────────────
const LP_X   = 25,  LP_W = 460, LP_CX = LP_X + LP_W / 2;   // wider left panel
const RP_X   = 505, RP_W = 270, RP_CX = RP_X + RP_W / 2;   // narrower right panel
const P_Y    = 65;                                         // panels top Y
const P_H    = 345;                                        // panels height

// Object layout within left panel
const Q_Y    = P_Y + 44;    // equation center
const BOX_Y  = P_Y + 154;   // top starting objects center (+16px padding)
const SUB_Y  = P_Y + 274;   // bottom subtraction zone objects center (+16px padding)

// Right panel choice cards
const CARD_W = RP_W - 32;
const CARD_H = 70;
const CARD_X = RP_CX;
const CARD_Y = [P_Y + 92, P_Y + 176, P_Y + 260];  // 3 card centers

// Card specs
const CARD_SPECS = [
  { main: C_CRD_A, shadow: C_CRD_AS, highlight: 0xff99bb, textColor: '#e91e63' },
  { main: C_CRD_B, shadow: C_CRD_BS, highlight: 0x80d8ff, textColor: '#0288d1' },
  { main: C_CRD_C, shadow: C_CRD_CS, highlight: 0xb0e8b0, textColor: '#388e3c' },
];

const THEMES = [
  { frame: 'sprite_0', bg: 0xf0faf0, name: 'butterfly' },
  { frame: 'sprite_24', bg: 0xfce4ec, name: 'apple' },
  { frame: 'sprite_26', bg: 0xfffde7, name: 'banana' },
  { frame: 'sprite_32', bg: 0xf9fbe7, name: 'bunny' },
  { frame: 'sprite_6', bg: 0xfff3e0, name: 'cookie' },
  { frame: 'sprite_20', bg: 0xfff3e0, name: 'cupcake' },
  { frame: 'sprite_27', bg: 0xfce4ec, name: 'strawberry' },
  { frame: 'sprite_29', bg: 0xf0e0d0, name: 'fox' },
  { frame: 'sprite_10', bg: 0xe3f2fd, name: 'candy' },
  { frame: 'sprite_15', bg: 0xfff8e1, name: 'popsicle' },
];

const CORRECT_PHRASES = ['⭐ Great Job!','🎉 Awesome!','✨ You got it!','🌟 Brilliant!','🎊 Perfect!','👏 Well done!'];
const WRONG_PHRASES   = ['🤔 Try again!','💪 Almost!','🧠 Think again…','🙂 So close!','👆 One more try!'];

// ─────────────────────────────────────────────────────────────
//  Choice Shuffling
// ─────────────────────────────────────────────────────────────
function buildAnswerChoices(correct) {
  const pool = []; for (let v=1;v<=10;v++) if(v!==correct) pool.push(v);
  Utils.Array.Shuffle(pool);
  return Utils.Array.Shuffle([correct, ...pool.slice(0,2)]);
}

// ─────────────────────────────────────────────────────────────
//  GameScene
// ─────────────────────────────────────────────────────────────
export class GameScene extends Scene {
  constructor() { super({ key: 'GameScene' }); }

  init() {
    this.round         = 0;
    this.score         = 0;
    this.stars         = 0;
    this.currentProblem= null;
    this.removedCount  = 0;
    this.roundComplete = false;
    this.answerLocked  = false;
    this.wrongAttempts = 0;
    this.boxObjects    = [];
    this.subObjects    = [];
    this.subBgCircles  = [];
    this.answerCards   = [];
    this.lockedCards   = [];
    this.equationGroup = [];
  }

  create() {
    // 1. Background image
    const bg = this.add.image(GAME_W / 2, GAME_H / 2, 'bg');
    bg.setDisplaySize(GAME_W, GAME_H);

    // Dynamic graphics layers
    this.hudGraphics = this.add.graphics().setDepth(20);
    this.panelGraphics = this.add.graphics().setDepth(3);

    // 2. Floating capsules HUD
    this._buildHUD();

    // 3. Panels Redesign
    drawPanel(this, LP_X, P_Y, LP_W, P_H, { radius: 24 });
    drawPanel(this, RP_X, P_Y, RP_W, P_H, { radius: 24 });

    this._buildLeftStructure();
    this._buildRightStructure();
    this._buildBottomControls();

    // 4. Start first round
    this._nextRound();
  }

  // ─────────────────────────────────────────────────────────────
  //  Floating Capsules HUD Redesign
  // ─────────────────────────────────────────────────────────────
  _buildHUD() {
    this.hudGroup = this.add.group();
    
    // Glossy pill background
    const bg = this.add.graphics().setDepth(20);
    const w = 175, h = 46, x = GAME_W / 2 - w / 2, y = 14;
    
    // Shadow
    bg.fillStyle(0x000000, 0.15);
    bg.fillRoundedRect(x + 3, y + 5, w, h, 23);
    // Main Body
    bg.fillStyle(0xfffdf6, 1);
    bg.fillRoundedRect(x, y, w, h, 23);
    // Top highlight
    bg.fillStyle(0xffffff, 0.8);
    bg.fillRoundedRect(x + 4, y + 2, w - 8, h * 0.4, 12);
    // Border
    bg.lineStyle(3.5, 0xfab82c, 1);
    bg.strokeRoundedRect(x, y, w, h, 23);

    // Star icon from sprite sheet (pop out effect on the left)
    const starIcon = this.add.sprite(x + 18, y + 23, 'sprites', 'sprite_33')
      .setScale(0.38).setDepth(22).setAngle(-5);
      
    // Stars Text
    this.starsText = this.add.text(x + 44, y + 22, '0', {
      fontFamily: FONT_NUMBERS, fontSize: '26px', color: '#ffaa00',
      stroke: '#ffffff', strokeThickness: 5
    }).setOrigin(0, 0.5).setDepth(21);

    // Divider
    bg.lineStyle(2.5, 0xe0e0e0, 1);
    bg.beginPath();
    bg.moveTo(x + w / 2 + 5, y + 10);
    bg.lineTo(x + w / 2 + 5, y + h - 10);
    bg.strokePath();

    // Round Text
    this.roundText = this.add.text(x + w - 18, y + 23, `1/${TOTAL_ROUNDS}`, {
      fontFamily: FONT_BODY, fontSize: '18px', color: '#6ebb47', fontStyle: 'bold'
    }).setOrigin(1, 0.5).setDepth(21);

    this.hudContainer = [bg, starIcon, this.starsText, this.roundText];
  }

  _updateHUD() {
    if (!this.starsText) return;
    this.starsText.setText(`${this.stars}`);
    this.roundText.setText(`${Math.min(this.round, TOTAL_ROUNDS)}/${TOTAL_ROUNDS}`);
    
    // Subtle bounce on update (only if we've already scored)
    if (this.score > 0) {
      this.tweens.add({
        targets: this.hudContainer,
        y: '-=4',
        duration: 100,
        yoyo: true,
        ease: 'Sine.easeInOut'
      });
    }
  }

  // ─────────────────────────────────────────────────────────────
  //  Left Panel Setup
  // ─────────────────────────────────────────────────────────────
  _buildLeftStructure() {
    // Top corners leaf illustrations
    this.add.text(LP_X + 28, P_Y + 28, '🍃', { fontSize: '20px' }).setOrigin(0.5).setDepth(4).setAngle(-20);
    this.add.text(LP_X + LP_W - 28, P_Y + 28, '🍃', { fontSize: '20px' }).setOrigin(0.5).setDepth(4).setAngle(20);

    // Static graphics layout
    const boxW = LP_W - 32;
    // Starting Objects container (cream with golden dashed border)
    this.panelGraphics.fillStyle(0xfffdf6, 1);
    this.panelGraphics.fillRoundedRect(LP_X + 16, P_Y + 90, boxW, 100, 16);
    drawDashedRoundedRect(this.panelGraphics, LP_X + 16, P_Y + 90, boxW, 100, 16, 0xfab82c, 2.5, 6, 4);

    // Starting Objects orange banner
    drawRibbonBanner(this.panelGraphics, LP_CX, P_Y + 90, 150, 24, C_BTN_OR, C_BTN_ORS);
    this.add.text(LP_CX, P_Y + 89, 'Starting Objects', {
      fontFamily: FONT_BODY, fontSize: '11.5px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10);

    // Subtraction container (cream green with green dashed border)
    this.panelGraphics.fillStyle(0xf3faf0, 1);
    this.panelGraphics.fillRoundedRect(LP_X + 16, P_Y + 222, boxW, 100, 16);
    drawDashedRoundedRect(this.panelGraphics, LP_X + 16, P_Y + 222, boxW, 100, 16, 0x88cc44, 2.5, 6, 4);

    // Subtraction zone green banner
    this.subRibbonGraphics = this.add.graphics().setDepth(9);
  }

  // ─────────────────────────────────────────────────────────────
  //  Right Panel Setup
  // ─────────────────────────────────────────────────────────────
  _buildRightStructure() {
    // Top purple header ribbon banner
    drawRibbonBanner(this.panelGraphics, RP_CX, P_Y + 22, RP_W - 32, 32, C_PURPLE, C_BTN_PURS);
    this.add.text(RP_CX, P_Y + 21, 'How many are left?', {
      fontFamily: FONT_TITLE, fontSize: '13.5px', color: '#ffffff',
    }).setOrigin(0.5).setDepth(10);

    // Decorative small leaf emojis on the ribbon corners
    this.add.text(RP_CX - 78, P_Y + 21, '🍃', { fontSize: '13px' }).setOrigin(0.5).setDepth(11);
    this.add.text(RP_CX + 78, P_Y + 21, '🍃', { fontSize: '13px' }).setOrigin(0.5).setDepth(11);
  }

  // ─────────────────────────────────────────────────────────────
  //  Bottom floating controls
  // ─────────────────────────────────────────────────────────────
  _buildBottomControls() {
    // ── Bottom Left: Sound Toggle Button ──
    const sBg = this.add.graphics().setDepth(20);
    const drawSoundBtn = () => {
      sBg.clear();
      sBg.fillStyle(0x5e177d, 1);
      sBg.fillCircle(35, GAME_H - 32, 20);
      sBg.fillStyle(C_PURPLE, 1);
      sBg.fillCircle(35, GAME_H - 35, 20);
      sBg.lineStyle(3, 0xffffff, 1);
      sBg.strokeCircle(35, GAME_H - 35, 20);
    };
    drawSoundBtn();

    this.soundEmoji = this.add.text(35, GAME_H - 36, getMuted() ? '🔇' : '🔊', { fontSize: '17px' })
      .setOrigin(0.5).setDepth(21);

    const sHit = this.add.circle(35, GAME_H - 35, 22, 0, 0)
      .setInteractive({ useHandCursor: true }).setDepth(22);

    sHit.on('pointerover', () => sBg.setAlpha(0.9));
    sHit.on('pointerout',  () => sBg.setAlpha(1));
    sHit.on('pointerdown', () => {
      setMuted(!getMuted());
      this.soundEmoji.setText(getMuted() ? '🔇' : '🔊');
      drawSoundBtn();
      playClick();
    });


  }



  // ─────────────────────────────────────────────────────────────
  //  Round Lifecycle
  // ─────────────────────────────────────────────────────────────
  _generateProblem() {
    const total = PMath.Between(2, 10);
    const subtract = PMath.Between(1, total - 1);
    return { total, subtract, answer: total - subtract };
  }

  _nextRound() {
    this.round++;
    if (this.round > TOTAL_ROUNDS) { this._goToWin(); return; }

    this.removedCount  = 0;
    this.roundComplete = false;
    this.answerLocked  = false;
    this.wrongAttempts = 0;

    this.currentProblem = this._generateProblem();
    const theme = THEMES[(this.round - 1) % THEMES.length];

    this._updateHUD();

    const { total, subtract } = this.currentProblem;

    // Draw Equation with a Purple dashed box around "?"
    this._clearEquation();
    this._buildEquationElements();

    // Redraw subtitle green banner inside subtraction container dynamically
    this.subRibbonGraphics.clear();
    drawRibbonBanner(this.subRibbonGraphics, LP_CX, P_Y + 222, 260, 24, 0x6ebb47, 0x3d7a22);

    if (this.subRibbonText) this.subRibbonText.destroy();
    this.subRibbonText = this.add.text(LP_CX, P_Y + 221, `Tap each ${theme.name} to remove it  👆`, {
      fontFamily: FONT_BODY, fontSize: '11.5px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10);

    // Objects spawning
    this._clearObjects();
    this._buildBoxObjects(theme);
    this._buildSubtractionObjects(theme);

    // Spawning locked choices "?" cards
    this._clearAnswerCards();
    this._clearLockedCards();
    this._buildLockedCards();
  }

  // ─────────────────────────────────────────────────────────────
  //  Equation construction with Purple Dashed Question box
  // ─────────────────────────────────────────────────────────────
  _buildEquationElements() {
    const { total, subtract } = this.currentProblem;
    
    // Draw numbers side by side centered at LP_CX
    const fontSize = '36px';
    const textStyle = {
      fontFamily: FONT_NUMBERS, fontSize, color: '#4a2808',
      stroke: '#ffffff', strokeThickness: 5
    };

    // Calculate dynamic spacings
    const tNum = this.add.text(LP_CX - 76, Q_Y, `${total}`, textStyle).setOrigin(0.5).setDepth(10);
    const tMinus = this.add.text(LP_CX - 36, Q_Y, '−', textStyle).setOrigin(0.5).setDepth(10);
    const tSub = this.add.text(LP_CX + 4, Q_Y, `${subtract}`, textStyle).setOrigin(0.5).setDepth(10);
    const tEqual = this.add.text(LP_CX + 44, Q_Y, '=', textStyle).setOrigin(0.5).setDepth(10);

    // Dashed purple box
    const boxSize = 42;
    const boxX = LP_CX + 86;
    const qBox = this.add.graphics({ x: boxX, y: Q_Y }).setDepth(9);
    drawDashedRoundedRect(qBox, -boxSize/2, -boxSize/2, boxSize, boxSize, 10, 0x9c27b0, 2.5, 5, 3);

    // Purple "?" inside the box
    const qMark = this.add.text(boxX, Q_Y, '?', {
      fontFamily: FONT_NUMBERS, fontSize: '26px', color: '#9c27b0',
    }).setOrigin(0.5).setDepth(10);

    this.tweens.add({ targets: [tNum, tMinus, tSub, tEqual, qBox, qMark], scale: 1.1, duration: 180, yoyo: true, ease: 'Back.easeOut' });

    this.equationGroup.push(tNum, tMinus, tSub, tEqual, qBox, qMark);
  }

  _clearEquation() {
    this.equationGroup.forEach(obj => {
      if (obj.destroy) obj.destroy();
    });
    this.equationGroup = [];
  }

  // ─────────────────────────────────────────────────────────────
  //  Locked choices placeholders setup
  // ─────────────────────────────────────────────────────────────
  _buildLockedCards() {
    CARD_Y.forEach((cy, i) => {
      const spec = CARD_SPECS[i];
      const g = this.add.graphics({ x: CARD_X, y: cy }).setDepth(5);
      
      // Shadow
      g.fillStyle(spec.shadow, 0.45);
      g.fillRoundedRect(-CARD_W / 2, -CARD_H / 2 + 5, CARD_W, CARD_H, 16);
      
      // Locked face (slightly translucent white/grey tint)
      g.fillStyle(0xffffff, 0.85);
      g.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 16);
      drawDashedRoundedRect(g, -CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 16, spec.main, 2, 6, 4);

      // Question mark
      const txt = this.add.text(CARD_X, cy - 2, '?', {
        fontFamily: FONT_NUMBERS, fontSize: '32px', color: '#b0c0cc',
      }).setOrigin(0.5).setDepth(6);

      g.setScale(0); txt.setScale(0);
      this.tweens.add({ targets: [g, txt], scale: 1, duration: 220, delay: i * 70, ease: 'Back.easeOut' });

      this.lockedCards.push({ bg: g, txt });
    });
  }

  _clearLockedCards() {
    this.lockedCards.forEach(c => {
      this.tweens.killTweensOf(c.bg);
      this.tweens.killTweensOf(c.txt);
      c.bg.destroy();
      c.txt.destroy();
    });
    this.lockedCards = [];
  }

  // ─────────────────────────────────────────────────────────────
  //  Starting Objects box layout builder
  // ─────────────────────────────────────────────────────────────
  _buildBoxObjects(theme) {
    const { total } = this.currentProblem;
    // Align starting objects inside the Cream Container
    const boxW = LP_W - 64;
    const spacing = Math.min(48, boxW / Math.max(total - 1, 1));
    const fontSize = total > 8 ? '24px' : '30px';
    const startX = LP_CX - ((total - 1) * spacing) / 2;

    for (let i = 0; i < total; i++) {
      const obj = this.add.sprite(startX + i * spacing, BOX_Y, 'sprites', theme.frame)
        .setOrigin(0.5).setDepth(4);
      obj.setScale(0);
      this.tweens.add({ targets: obj, scale: 0.45, duration: 260, delay: i * 55, ease: 'Back.easeOut' });
      this.boxObjects.push({ text: obj, removed: false });
    }
  }

  // ─────────────────────────────────────────────────────────────
  //  Subtraction objects inside green zone (clickable row)
  // ─────────────────────────────────────────────────────────────
  _buildSubtractionObjects(theme) {
    const { subtract } = this.currentProblem;
    const boxW = LP_W - 64;
    const spacing = Math.min(54, boxW / Math.max(subtract - 1, 1));
    const fontSize = subtract > 7 ? '26px' : '36px';
    const startX = LP_CX - ((subtract - 1) * spacing) / 2;

    for (let i = 0; i < subtract; i++) {
      const x = startX + i * spacing;

      // Soft semi-transparent white circle background for butterfly
      const bgCircle = this.add.circle(x, SUB_Y, 26, 0xffffff, 0.72)
        .setDepth(3).setScale(0);
      this.tweens.add({ targets: bgCircle, scale: 1, duration: 250, delay: i * 60, ease: 'Back.easeOut' });
      this.subBgCircles.push(bgCircle);

      // Glow rings pulsator
      const ring = this.add.circle(x, SUB_Y, 26, 0x88cc44, 0.22).setDepth(3);
      this.tweens.add({ targets: ring, scale: 1.45, alpha: 0, duration: 900, delay: i * 110, repeat: -1, ease: 'Sine.easeOut' });

      const obj = this.add.sprite(x, SUB_Y, 'sprites', theme.frame)
        .setOrigin(0.5).setDepth(5);
      obj.setScale(0);
      obj.setInteractive({ useHandCursor: true });
      obj.input.enabled = false;
      this.tweens.add({ 
        targets: obj, scale: 0.45, duration: 300, delay: 200 + i * 70, ease: 'Back.easeOut',
        onComplete: () => { obj.input.enabled = true; }
      });
      obj.userData = { clicked: false, ring, bgCircle };

      obj.on('pointerover', () => {
        if (!obj.userData.clicked) {
          this.tweens.add({ targets: obj, scale: 0.55, duration: 90 });
          playClick();
        }
      });
      obj.on('pointerout', () => {
        if (!obj.userData.clicked) this.tweens.add({ targets: obj, scale: 0.45, duration: 90 });
      });
      obj.on('pointerdown', () => this._onSubtractionObjectClick(obj));

      this.subObjects.push(obj);
    }
  }

  // ─────────────────────────────────────────────────────────────
  //  Subtraction click logic
  // ─────────────────────────────────────────────────────────────
  _onSubtractionObjectClick(obj) {
    if (obj.userData.clicked || this.roundComplete) return;
    obj.userData.clicked = true;
    obj.disableInteractive();
    playPop();

    // Kill pointer scale ring
    if (obj.userData.ring) {
      this.tweens.killTweensOf(obj.userData.ring);
      obj.userData.ring.destroy();
    }

    // Shrink white bg circle
    if (obj.userData.bgCircle) {
      this.tweens.add({ targets: obj.userData.bgCircle, scale: 0.65, alpha: 0.35, duration: 250 });
    }

    // Animate removal pop
    this.tweens.add({
      targets: obj, scale: 0.65, duration: 90, ease: 'Quad.easeOut',
      onComplete: () => {
        this.tweens.add({ targets: obj, scale: 0.25, alpha: 0.3, duration: 240, ease: 'Quad.easeIn' });
        obj.setTint(0x888888);
      },
    });

    this._spawnSparkle(obj.x, obj.y, C_GOLD);
    this._greyOutOneBoxObject();
    this.removedCount++;

    if (this.removedCount >= this.currentProblem.subtract) {
      this.roundComplete = true;
      this.time.delayedCall(380, () => this._revealAnswerCards());
    }
  }

  _greyOutOneBoxObject() {
    const active = this.boxObjects.find(o => !o.removed);
    if (!active) return;
    active.removed = true;
    this.tweens.add({ targets: active.text, alpha: 0.22, scale: 0.3, duration: 280, ease: 'Quad.easeInOut' });
    active.text.setTint(0xaaaaaa);
  }

  // ─────────────────────────────────────────────────────────────
  //  Card flip reveal animation
  // ─────────────────────────────────────────────────────────────
  _revealAnswerCards() {
    this._clearLockedCards();
    this._buildAnswerCards(buildAnswerChoices(this.currentProblem.answer));
  }

  _buildAnswerCards(choices) {
    choices.forEach((val, i) => {
      const cy = CARD_Y[i];
      const spec = CARD_SPECS[i];
      
      const g = this.add.graphics({ x: CARD_X, y: cy }).setDepth(6);
      
      // Shadow
      g.fillStyle(spec.shadow, 1);
      g.fillRoundedRect(-CARD_W / 2, -CARD_H / 2 + 6, CARD_W, CARD_H, 16);
      // Main Body
      g.fillStyle(spec.main, 1);
      g.fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 16);
      // Glossy shine top half
      g.fillStyle(spec.highlight, 0.42);
      g.fillRoundedRect(-CARD_W / 2 + 5, -CARD_H / 2 + 4, CARD_W - 10, CARD_H * 0.38, 8);
      // Clean white borders
      g.lineStyle(3.5, 0xffffff, 1);
      g.strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 16);

      // Low-opacity background decorative stars floating inside cards
      const sL1 = this.add.sprite(CARD_X - CARD_W / 2 + 30, cy - 12, 'sprites', 'sprite_33').setAlpha(0.2).setOrigin(0.5).setDepth(7);
      const sL2 = this.add.sprite(CARD_X - CARD_W / 2 + 46, cy + 12, 'sprites', 'sprite_33').setAlpha(0.2).setOrigin(0.5).setDepth(7).setScale(0.7);
      const sR1 = this.add.sprite(CARD_X + CARD_W / 2 - 30, cy + 12, 'sprites', 'sprite_33').setAlpha(0.2).setOrigin(0.5).setDepth(7);
      const sR2 = this.add.sprite(CARD_X + CARD_W / 2 - 46, cy - 12, 'sprites', 'sprite_33').setAlpha(0.2).setOrigin(0.5).setDepth(7).setScale(0.7);

      // Value number text with white thick outline
      const txt = this.add.text(CARD_X, cy - 2, `${val}`, {
        fontFamily: FONT_NUMBERS, fontSize: '38px', color: spec.textColor,
        stroke: '#ffffff', strokeThickness: 5,
      }).setOrigin(0.5).setDepth(8);

      // Card Flip reveal animation (Locked question cards flip into these revealed ones)
      g.setScale(0, 1);
      txt.setScale(0, 1);
      sL1.setScale(0); sL2.setScale(0); sR1.setScale(0); sR2.setScale(0);

      // Hit area
      const hit = this.add.rectangle(CARD_X, cy, CARD_W, CARD_H + 8, 0, 0)
        .setInteractive({ useHandCursor: true }).setDepth(9);
      hit.input.enabled = false;

      this.tweens.add({
        targets: [g, txt], scaleX: 1, duration: 180, delay: i * 80, ease: 'Sine.easeOut',
        onComplete: () => {
          this.tweens.add({ targets: [sL1, sR1], scale: 0.35, duration: 120 });
          this.tweens.add({ targets: [sL2, sR2], scale: 0.25, duration: 120 });
          this._spawnSparkle(CARD_X, cy, C_GOLD);
          hit.input.enabled = true;
          
          // Float removed per user request
        }
      });

      hit.on('pointerover', () => {
        if (this.answerLocked) return;
        this.tweens.killTweensOf([txt]);
        this.tweens.add({ targets: [txt], scale: 1.15, duration: 80 });
        g.setAlpha(0.92);
        playClick();
      });
      hit.on('pointerout', () => {
        if (this.answerLocked) return;
        this.tweens.killTweensOf([txt]);
        g.setAlpha(1);
        this.tweens.add({ targets: [txt], scale: 1, duration: 80 });
        // Float removed per user request
      });
      hit.on('pointerdown', () => this._onAnswerCardClick(val, g, txt, i, hit));

      this.answerCards.push({ bg: g, txt, hit, value: val, decor: [sL1, sL2, sR1, sR2] });
    });
  }

  // ─────────────────────────────────────────────────────────────
  //  Answer validation
  // ─────────────────────────────────────────────────────────────
  _onAnswerCardClick(val, bg, txt, cardIdx, hit) {
    if (this.answerLocked) return;
    this.answerLocked = true;
    val === this.currentProblem.answer
      ? this._onCorrectAnswer(bg, txt)
      : this._onWrongAnswer(bg, txt, cardIdx);
  }

  _onCorrectAnswer(bg, txt) {
    playSuccess();
    this.score++;
    this.stars += this.wrongAttempts === 0 ? 3 : this.wrongAttempts === 1 ? 2 : 1;

    // Flash green color success
    bg.clear();
    bg.fillStyle(0x389010, 1);
    bg.fillRoundedRect(-CARD_W/2, -CARD_H/2 + 6, CARD_W, CARD_H, 16);
    bg.fillStyle(0x55c020, 1);
    bg.fillRoundedRect(-CARD_W/2, -CARD_H/2, CARD_W, CARD_H, 16);
    bg.lineStyle(3.5, 0xffffff, 1);
    bg.strokeRoundedRect(-CARD_W/2, -CARD_H/2, CARD_W, CARD_H, 16);

    this.tweens.add({ targets: [bg, txt], scale: 1.25, duration: 200, yoyo: true, ease: 'Back.easeOut' });
    this.cameras.main.flash(200, 240, 255, 220);
    this._spawnConfetti();
    this._spawnStarBurst(txt.x, txt.y);
    this._updateHUD();
    
    this.time.delayedCall(1100, () => this._nextRound());
  }

  _onWrongAnswer(bg, txt, cardIdx) {
    playWrong();
    this.wrongAttempts++;

    const ox = txt.x;
    this.tweens.add({
      targets: [bg, txt], x: { from: ox - 10, to: ox + 10 },
      duration: 70, yoyo: true, repeat: 4, ease: 'Linear',
      onComplete: () => {
        bg.x = ox; txt.x = ox;
        this.time.delayedCall(180, () => {
          this._clearAnswerCards();
          this.answerLocked = false;
          this._buildAnswerCards(buildAnswerChoices(this.currentProblem.answer));
        });
      },
    });
  }

  // ─────────────────────────────────────────────────────────────
  //  Particle effects
  // ─────────────────────────────────────────────────────────────
  _spawnSparkle(x, y, color) {
    for (let i = 0; i < 8; i++) {
      const a   = (Math.PI * 2 / 8) * i;
      const dot = this.add.circle(x, y, PMath.Between(3, 7), color).setDepth(14);
      this.tweens.add({ targets: dot, x: x + Math.cos(a) * PMath.Between(18, 40), y: y + Math.sin(a) * PMath.Between(18, 40), alpha: 0, scale: 0.2, duration: PMath.Between(350, 560), ease: 'Quad.easeOut', onComplete: () => dot.destroy() });
    }
  }

  _spawnStarBurst(x, y) {
    const frames = ['sprite_33', 'sprite_34', 'sprite_33', 'sprite_34', 'sprite_33'];
    frames.forEach((frame, i) => {
      const a    = (Math.PI * 2 / 5) * i - Math.PI / 2;
      const star = this.add.sprite(x, y, 'sprites', frame).setOrigin(0.5).setDepth(16);
      this.tweens.add({ targets: star, x: x + Math.cos(a) * 60, y: y + Math.sin(a) * 60, alpha: 0, scale: 0.2, duration: 680, ease: 'Cubic.easeOut', onComplete: () => star.destroy() });
    });
  }

  _spawnConfetti() {
    const cols = [0xff6b6b, 0x4ecdc4, C_GOLD, C_PURPLE, 0xff7597, 0x4ba3e3];
    for (let i = 0; i < 40; i++) {
      const x = PMath.Between(LP_X + 10, LP_X + LP_W - 10);
      const y = PMath.Between(P_Y + 10, P_Y + 200);
      const r = PMath.Between(4, 10);
      const p = this.add.circle(x, y, r, cols[i % cols.length]).setDepth(15);
      this.tweens.add({ targets: p, y: y + PMath.Between(80, 200), x: x + PMath.Between(-35, 35), alpha: 0, angle: PMath.Between(-180, 180), duration: PMath.Between(700, 1300), ease: 'Cubic.easeIn', onComplete: () => p.destroy() });
    }
  }

  // ─────────────────────────────────────────────────────────────
  //  Cleanup and Navigation
  // ─────────────────────────────────────────────────────────────
  _clearObjects() {
    this.boxObjects.forEach(o => { this.tweens.killTweensOf(o.text); o.text.destroy(); });
    this.boxObjects = [];
    this.subObjects.forEach(o => {
      if (o.userData?.ring) { this.tweens.killTweensOf(o.userData.ring); o.userData.ring.destroy(); }
      this.tweens.killTweensOf(o); o.destroy();
    });
    this.subObjects = [];
    this.subBgCircles.forEach(c => { this.tweens.killTweensOf(c); c.destroy(); });
    this.subBgCircles = [];
  }

  _clearAnswerCards() {
    this.answerCards.forEach(c => {
      this.tweens.killTweensOf(c.bg); this.tweens.killTweensOf(c.txt);
      c.bg.destroy(); c.txt.destroy(); c.hit?.destroy();
      if (c.decor) c.decor.forEach(d => { this.tweens.killTweensOf(d); d.destroy(); });
    });
    this.answerCards = [];
  }

  _goToWin() {
    this.cameras.main.flash(300, 255, 255, 255);
    this.time.delayedCall(350, () => this.scene.start('WinScene', { score: this.score, stars: this.stars }));
  }
}
