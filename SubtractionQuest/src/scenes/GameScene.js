import { Scene, Math as PMath, Utils } from 'phaser';
import {
  GAME_W, GAME_H, TOTAL_ROUNDS,
  C_GOLD, C_PURPLE,
  FONT_TITLE, FONT_BODY, FONT_NUMBERS,
} from '../constants.js';
import { drawDashedRoundedRect, playClick, playSuccess, playWrong, playPop, getMuted, setMuted, chunkyButton } from '../bg.js';

// ─── Grid Layout ──────────────────────────────────────────────────────────────
const CX        = GAME_W / 2;
const COLS      = 4;
const PAN_W     = 360;                                     // green panel fixed width
const PAN_X     = (GAME_W - PAN_W) / 2;                   // 40px — centred
const PAN_PAD   = 12;
const CELL_GAP  = 8;       // gap between cells
const GRID_W    = PAN_W - PAN_PAD * 2;                    // 336px inner grid area
const CELL      = Math.floor((GRID_W - (COLS - 1) * CELL_GAP) / COLS); // 78px
const GRID_X    = PAN_X + PAN_PAD;                        // 52px — left edge of grid

// ─── Fixed Y positions ────────────────────────────────────────────────────────
const HUD_CY    = 72;    // HUD bar centre (lowered to clear mobile status bar)
const EQ_CY     = 155;   // equation pill centre
const LBL1_CY   = 237;   // "Starting Objects" label centre
const GRID_TOP  = 237;   // perfectly centered with label

// ─── Answer button layout (2 × 2 grid) ───────────────────────────────────────
const BTN_GAP   = 12;
const BTN_W     = (GRID_W - BTN_GAP) / 2;   // ~182px
const BTN_H     = 72;

// Blue, Green, Orange, Purple — matching screenshot colours
const BTN_COLORS  = [0x4890EB, 0x6ED266, 0xFBA331, 0x9B6AEC];
const BTN_SHADOWS = [0x2478b8, 0x3a9010, 0xcc5500, 0x5e177d];

// ─── Themes ───────────────────────────────────────────────────────────────────
const THEMES = [
  { frame: 'sprite_0',  name: 'butterfly'  },
  { frame: 'sprite_24', name: 'apple'      },
  { frame: 'sprite_26', name: 'banana'     },
  { frame: 'sprite_32', name: 'bunny'      },
  { frame: 'sprite_6',  name: 'cookie'     },
  { frame: 'sprite_20', name: 'cupcake'    },
  { frame: 'sprite_27', name: 'strawberry' },
  { frame: 'sprite_29', name: 'fox'        },
  { frame: 'sprite_10', name: 'candy'      },
  { frame: 'sprite_15', name: 'popsicle'   },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildAnswerChoices(correct) {
  const pool = new Set();
  while (pool.size < 3) {
    const v = PMath.Between(1, 16);
    if (v !== correct) pool.add(v);
  }
  return Utils.Array.Shuffle([correct, ...pool]);
}

const TOP_PAD = 32;
function gridCellCX(col)           { return GRID_X + col * (CELL + CELL_GAP) + CELL / 2; }
function gridCellCY(row, panTopY)  { return panTopY + TOP_PAD + row * (CELL + CELL_GAP) + CELL / 2; }
function panelHeight(count)        { const r = Math.ceil(count / COLS); return r * CELL + (r - 1) * CELL_GAP + TOP_PAD + PAN_PAD; }

// ─── Sub-grid (Tap to remove) — smaller cells ──────────────────────────
const SUB_PAN_W  = 330;
const SUB_PAN_X  = (GAME_W - SUB_PAN_W) / 2;                                        // 55px
const SUB_CELL   = Math.floor((SUB_PAN_W - PAN_PAD * 2 - (COLS - 1) * CELL_GAP) / COLS); // 70px
const SUB_GRID_X = SUB_PAN_X + PAN_PAD;                                             // 67px
function subCellCX(col)       { return SUB_GRID_X + col * (SUB_CELL + CELL_GAP) + SUB_CELL / 2; }
function subCellCY(row, topY) { return topY + TOP_PAD + row * (SUB_CELL + CELL_GAP) + SUB_CELL / 2; }
function subPanelHeight(count){ const r = Math.ceil(count / COLS); return r * SUB_CELL + (r - 1) * CELL_GAP + TOP_PAD + PAN_PAD; }

// ─── GameScene ────────────────────────────────────────────────────────────────
export class GameScene extends Scene {
  constructor() { super({ key: 'GameScene' }); }

  init() {
    this.round          = 0;
    this.score          = 0;
    this.stars          = 0;
    this.currentProblem = null;
    this.removedCount   = 0;
    this.step           = 1;
    this.answerLocked   = false;
    this.wrongAttempts  = 0;

    // Object groups for lifecycle management
    this.equationGroup  = [];   // equation pill objects
    this.mainGridGroup  = [];   // green panel + tile cards (persists step1→2)
    this.mainGridTiles  = [];   // { g, sp, removed, cx, cy }
    this.subGroup       = [];   // step-1 only: labels + sub-grid
    this.step2Group     = [];   // step-2 only: remaining label + highlights + buttons

    this.mainPanBottomY = 0;    // computed dynamically per round
  }

  // ── create ─────────────────────────────────────────────────────────────────
  create() {
    this.add.image(GAME_W / 2, GAME_H / 2, 'bg').setDisplaySize(GAME_W, GAME_H);
    this._buildHUD();
    this._nextRound();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  HUD — Back · Star/Round pill · Sound · Pause
  // ═══════════════════════════════════════════════════════════════════════════
  _buildHUD() {
    const y = HUD_CY;

    // ── Back button ────────────────────────────────────────────────────────
    const bkG = this.add.graphics().setDepth(25);
    // Drop shadow
    bkG.fillStyle(0x652ADE, 0.25); bkG.fillCircle(44, y + 0.5, 25);
    // Button body
    bkG.fillStyle(0xffffff, 1);    bkG.fillCircle(44, y, 25);
    this.add.text(41, y + 1, '❮', {
      fontFamily: FONT_NUMBERS, fontSize: '22px', color: '#6438DB',
    }).setOrigin(0.5).setDepth(26);
    const bkHit = this.add.circle(44, y, 25, 0, 0)
      .setInteractive({ useHandCursor: true }).setDepth(27);
    bkHit.on('pointerover',  () => bkG.setAlpha(0.85));
    bkHit.on('pointerout',   () => bkG.setAlpha(1));
    bkHit.on('pointerdown',  () => {
      playClick();
      this.cameras.main.flash(150, 255, 255, 255);
      this.time.delayedCall(120, () => this.scene.start('MenuScene'));
    });

    // ── Centre pill — stars + round ────────────────────────────────────────
    const pW = 195, pH = 65, pX = 88; // shifted left to make 19px gap with buttons
    const pG = this.add.graphics().setDepth(25);
    pG.fillStyle(0xffffff, 1);    pG.fillRoundedRect(pX, y - pH/2, pW, pH, 16);
    pG.lineStyle(1, 0xfcfdfe, 1); pG.strokeRoundedRect(pX, y - pH/2, pW, pH, 16);

    // Star icon + count
    this.add.sprite(pX + 24, y - 8, 'sprites', 'sprite_33').setScale(0.28).setDepth(26);
    this.starsText = this.add.text(pX + 44, y - 10, '0', {
      fontFamily: FONT_BODY, fontSize: '24px', color: '#000000', fontStyle: '600',
    }).setOrigin(0, 0.5).setDepth(26);
    this.add.text(pX + 44, y + 12, 'Total Stars', {
      fontFamily: FONT_BODY, fontSize: '12px', color: '#000000', fontStyle: '500',
    }).setOrigin(0, 0.5).setDepth(26);

    // Divider
    pG.lineStyle(1.5, 0xdddddd, 1);
    pG.beginPath();
    pG.moveTo(pX + pW / 2, y - 18); pG.lineTo(pX + pW / 2, y + 18);
    pG.strokePath();

    // Round number
    this.roundNumText = this.add.text(pX + pW / 2 + 16, y - 10, '1', {
      fontFamily: FONT_BODY, fontSize: '24px', color: '#ff7834', fontStyle: '600',
    }).setOrigin(0, 0.5).setDepth(26);
    this.add.text(pX + pW / 2 + 16, y + 12, `/${TOTAL_ROUNDS} ROUNDS`, {
      fontFamily: FONT_BODY, fontSize: '12px', color: '#000000', fontStyle: '500',
    }).setOrigin(0, 0.5).setDepth(26);

    // ── Sound button ───────────────────────────────────────────────────────
    const sX = 327; // shifted left to make 19px gap with pause button
    const sG = this.add.graphics().setDepth(25);
    const drawSnd = () => {
      sG.clear();
      // Drop shadow (Y:4, Blur:4 approx)
      sG.fillStyle(0x000000, 0.15); sG.fillCircle(sX, y + 2, 26);
      sG.fillStyle(0x000000, 0.15); sG.fillCircle(sX, y + 4, 25);
      // Button body
      sG.fillStyle(0x6E40D9, 1); sG.fillCircle(sX, y, 25);
      // Stroke
      sG.lineStyle(1, 0xffffff, 1); sG.strokeCircle(sX, y, 25);
    };
    drawSnd();
    this.sndEmoji = this.add.text(sX, y, getMuted() ? '🔇' : '🔊', { 
      fontSize: '20px', color: '#ffffff' 
    }).setOrigin(0.5).setDepth(26);
    this.sndEmoji.setTintFill(0xffffff); // Force white silhouette
    const sH = this.add.circle(sX, y, 25, 0, 0).setInteractive({ useHandCursor: true }).setDepth(27);
    sH.on('pointerdown', () => { setMuted(!getMuted()); this.sndEmoji.setText(getMuted() ? '🔇' : '🔊'); drawSnd(); playClick(); });
    sH.on('pointerover', () => sG.setAlpha(0.85)); sH.on('pointerout', () => sG.setAlpha(1));

    // ── Pause button ───────────────────────────────────────────────────────
    const ppX = GAME_W - 44;
    const ppG = this.add.graphics().setDepth(25);
    // Drop shadow
    ppG.fillStyle(0x652ADE, 0.25); ppG.fillCircle(ppX, y + 0.5, 25);
    // Button body
    ppG.fillStyle(0xffffff, 1);    ppG.fillCircle(ppX, y, 25);
    this.add.text(ppX, y, '⏸', {
      fontSize: '20px', color: '#6438DB'
    }).setOrigin(0.5).setDepth(26);

    const ppHit = this.add.circle(ppX, y, 25, 0, 0).setInteractive({ useHandCursor: true }).setDepth(27);
    ppHit.on('pointerdown', () => {
      playClick();
      this._showPauseMenu();
    });
    ppHit.on('pointerover', () => ppG.setAlpha(0.85));
    ppHit.on('pointerout', () => ppG.setAlpha(1));
  }

  _updateHUD() {
    this.starsText?.setText(`${this.stars}`);
    this.roundNumText?.setText(`${Math.min(this.round, TOTAL_ROUNDS)}`);
  }

  _showPauseMenu() {
    if (this.isPaused) return;
    this.isPaused = true;

    this.pauseGroup = this.add.group();

    const overlay = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0.4)
      .setInteractive()
      .setDepth(100);
    this.pauseGroup.add(overlay);

    const cx = GAME_W / 2, cy = GAME_H / 2;
    const panel = this.add.container(cx, cy).setDepth(101);
    this.pauseGroup.add(panel);

    const px = 0, py = 0; // Coordinates relative to container
    const btnW = 141, btnH = 50;

    const pauseBg = this.add.image(0, 0, 'pause_bg').setDepth(102);
    
    // Dynamic height calculations to "hug" contents
    const padding = 35; // space above image and below buttons
    const gap = 15;     // space between image and buttons
    const ph = pauseBg.height + gap + btnH + padding * 2;
    const pw = 420; 
    
    const cardTopY = py - ph / 2;
    
    const bgG = this.add.graphics();
    bgG.fillStyle(0xECE0FC, 1);
    bgG.fillRoundedRect(px - pw / 2, cardTopY, pw, ph, 30);
    panel.add(bgG);

    // Position image (centered horizontally, padded from top)
    pauseBg.setPosition(px, cardTopY + padding + pauseBg.height / 2);
    panel.add(pauseBg);

    // I will keep the interactive buttons, assuming they are placed on top or the image doesn't have them
    
    // Resume Button (Custom Figma Styling)
    const resCX = px - 90, resCY = pauseBg.y + pauseBg.height / 2 + gap + btnH / 2;
    const resR = 25; // 32 in Figma, caps at height/2
    const shadowG = this.add.graphics();
    // Soft drop shadow
    shadowG.fillStyle(0x000000, 0.08);
    shadowG.fillRoundedRect(resCX - btnW / 2 + 1, resCY - btnH / 2 + 3, btnW, btnH, resR);
    shadowG.fillStyle(0x000000, 0.06);
    shadowG.fillRoundedRect(resCX - btnW / 2, resCY - btnH / 2 + 6, btnW, btnH, resR);
    shadowG.fillStyle(0x000000, 0.04);
    shadowG.fillRoundedRect(resCX - btnW / 2, resCY - btnH / 2 + 9, btnW, btnH, resR);
    shadowG.setDepth(102);
    
    // Generate linear gradient rounded rect texture using Canvas API
    const texKey = 'resume_btn_grad';
    if (!this.textures.exists(texKey)) {
      const canvas = document.createElement('canvas');
      canvas.width = btnW;
      canvas.height = btnH;
      const ctx = canvas.getContext('2d');
      const grd = ctx.createLinearGradient(0, 0, 0, btnH);
      grd.addColorStop(0, '#8757E2');
      grd.addColorStop(1, '#4A307C');
      ctx.fillStyle = grd;
      
      if (ctx.roundRect) {
         ctx.beginPath(); ctx.roundRect(0, 0, btnW, btnH, resR); ctx.fill();
      } else {
         ctx.beginPath(); ctx.moveTo(resR, 0); ctx.lineTo(btnW - resR, 0);
         ctx.arcTo(btnW, 0, btnW, resR, resR); ctx.lineTo(btnW, btnH - resR);
         ctx.arcTo(btnW, btnH, btnW - resR, btnH, resR); ctx.lineTo(resR, btnH);
         ctx.arcTo(0, btnH, 0, btnH - resR, resR); ctx.lineTo(0, resR);
         ctx.arcTo(0, 0, resR, 0, resR); ctx.closePath(); ctx.fill();
      }
      this.textures.addCanvas(texKey, canvas);
    }
    
    const gradImg = this.add.image(resCX, resCY, texKey).setDepth(102);

    // Stroke overlay 
    const strokeG = this.add.graphics();
    strokeG.lineStyle(1.5, 0xB493F3, 1);
    strokeG.strokeRoundedRect(resCX - btnW / 2, resCY - btnH / 2, btnW, btnH, resR);
    strokeG.setDepth(102);
    
    const resBtn = this.add.rectangle(resCX, resCY, btnW, btnH, 0, 0)
      .setInteractive({ useHandCursor: true });
      
    const resL = this.add.text(resCX, resCY, '▶  Resume', {
      fontFamily: 'Poppins, sans-serif', fontSize: '16px', color: '#ffffff', fontStyle: '600'
    }).setOrigin(0.5);

    resL.setDepth(103); resBtn.setDepth(104);
    panel.add([shadowG, gradImg, strokeG, resL, resBtn]);

    resBtn.on('pointerdown', () => {
      playClick();
      this.pauseGroup.destroy(true);
      this.isPaused = false;
    });
    resBtn.on('pointerover', () => { gradImg.setAlpha(0.85); strokeG.setAlpha(0.85); });
    resBtn.on('pointerout', () => { gradImg.setAlpha(1); strokeG.setAlpha(1); });

    // Home Button
    const homeCX = px + 90, homeCY = resCY;
    const homeG = this.add.graphics();
    homeG.fillStyle(0xFFFFFF, 1);
    homeG.fillRoundedRect(homeCX - btnW / 2, homeCY - btnH / 2, btnW, btnH, resR);
    homeG.lineStyle(1, 0x8052D6, 1);
    homeG.strokeRoundedRect(homeCX - btnW / 2, homeCY - btnH / 2, btnW, btnH, resR);

    // Draw solid purple house icon
    const hx = homeCX - 32, hy = homeCY + 1; // offset to left of text
    homeG.fillStyle(0x8052D6, 1);
    // Base
    homeG.fillRect(hx - 7, hy - 3, 14, 11);
    // Roof triangle
    homeG.fillTriangle(hx - 10, hy - 3, hx, hy - 11, hx + 10, hy - 3);
    homeG.setDepth(102);

    const homeBtn = this.add.rectangle(homeCX, homeCY, btnW, btnH, 0, 0)
      .setInteractive({ useHandCursor: true });
      
    const homeL = this.add.text(homeCX + 14, homeCY, 'Home', {
      fontFamily: 'Poppins, sans-serif', fontSize: '16px', color: '#8052D6', fontStyle: '600'
    }).setOrigin(0.5);
    
    homeL.setDepth(103); homeBtn.setDepth(104);
    panel.add([homeG, homeL, homeBtn]);

    homeBtn.on('pointerdown', () => {
      playClick();
      this.cameras.main.flash(150, 255, 255, 255);
      this.time.delayedCall(120, () => this.scene.start('MenuScene'));
    });
    homeBtn.on('pointerover', () => { homeG.setAlpha(0.85); });
    homeBtn.on('pointerout', () => { homeG.setAlpha(1); });

    // Pop-in animation
    panel.setScale(0);
    this.tweens.add({
      targets: panel,
      scaleX: 1,
      scaleY: 1,
      duration: 350,
      ease: 'Back.out(1.5)'
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Round lifecycle
  // ═══════════════════════════════════════════════════════════════════════════
  _generateProblem() {
    const total    = PMath.Between(2, 16);
    const maxSub   = Math.min(total - 1, 12);
    const subtract = PMath.Between(1, maxSub);
    return { total, subtract, answer: total - subtract };
  }

  _nextRound() {
    this.round++;
    if (this.round > TOTAL_ROUNDS) { this._goToWin(); return; }

    this.removedCount  = 0;
    this.step          = 1;
    this.answerLocked  = false;
    this.wrongAttempts = 0;
    this.currentProblem = this._generateProblem();
    const theme = THEMES[(this.round - 1) % THEMES.length];

    this._updateHUD();
    this._clearAll();
    this._buildEquation();
    this._buildStep1(theme);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Equation pill
  // ═══════════════════════════════════════════════════════════════════════════
  _buildEquation() {
    const { total, subtract } = this.currentProblem;

    // Create text first so we can measure rendered widths for the pill
    const ns = { fontFamily: FONT_NUMBERS, fontSize: '36px', color: '#000000' };
    const t1 = this.add.text(CX - 88, EQ_CY, `${total}`,    ns).setOrigin(0.5).setDepth(10);
    const t2 = this.add.text(CX - 44, EQ_CY, '−',           ns).setOrigin(0.5).setDepth(10);
    const t3 = this.add.text(CX,      EQ_CY, `${subtract}`, ns).setOrigin(0.5).setDepth(10);
    const t4 = this.add.text(CX + 44, EQ_CY, '=',           ns).setOrigin(0.5).setDepth(10);

    // Question box
    const qBX = CX + 92, qBS = 46;
    const qG  = this.add.graphics().setDepth(9);
    drawDashedRoundedRect(qG, qBX - qBS/2, EQ_CY - qBS/2, qBS, qBS, 11, 0x6E40D9, 2.5, 5, 3);
    const qT  = this.add.text(qBX, EQ_CY, '?', {
      fontFamily: FONT_NUMBERS, fontSize: '28px', color: '#000000',
    }).setOrigin(0.5).setDepth(10);

    // Pill hugs content — measure leftmost text edge and rightmost box edge, add 12px padding
    const PAD       = 12;
    const leftEdge  = t1.x - t1.width / 2;
    const rightEdge = qBX + qBS / 2;
    const pH        = 68;
    const pX        = leftEdge - PAD;
    const pW        = (rightEdge - leftEdge) + PAD * 2;
    const pY        = EQ_CY - pH / 2;

    const g = this.add.graphics().setDepth(8);
    // Subtle drop shadow
    g.fillStyle(0x000000, 0.1);  g.fillRoundedRect(pX + 3, pY + 5, pW, pH, 16);
    // Fill #65D570
    g.fillStyle(0x65D570, 1);    g.fillRoundedRect(pX, pY, pW, pH, 16);
    // White border weight 3
    g.lineStyle(3, 0xffffff, 1); g.strokeRoundedRect(pX, pY, pW, pH, 16);

    this.tweens.add({ targets: [t1, t2, t3, t4, qG, qT], scale: 1.06, duration: 150, yoyo: true, ease: 'Back.easeOut' });
    this.equationGroup.push(g, t1, t2, t3, t4, qG, qT);
  }


  // ═══════════════════════════════════════════════════════════════════════════
  //  Step 1 — Starting Objects grid + Tap-to-remove sub-grid
  // ═══════════════════════════════════════════════════════════════════════════
  _buildStep1(theme) {
    const { total, subtract } = this.currentProblem;

    // "Starting Objects" label
    this._makeLabel('Starting Objects', LBL1_CY, this.subGroup);

    // ── Main green grid panel ──────────────────────────────────────────────
    const panH = panelHeight(total);
    this.mainPanBottomY = GRID_TOP + panH;

    const panG = this.add.graphics().setDepth(5);
    panG.fillStyle(0x000000, 0.1);  panG.fillRoundedRect(PAN_X + 3, GRID_TOP + 5, PAN_W, panH, 24);
    panG.fillStyle(0x65D570, 1);    panG.fillRoundedRect(PAN_X, GRID_TOP, PAN_W, panH, 24);
    panG.lineStyle(4, 0xffffff, 1); panG.strokeRoundedRect(PAN_X, GRID_TOP, PAN_W, panH, 24);
    this.mainGridGroup.push(panG);

    this.mainGridTiles = [];
    for (let i = 0; i < total; i++) {
      const col = i % COLS, row = Math.floor(i / COLS);
      const cx  = gridCellCX(col);
      const cy  = gridCellCY(row, GRID_TOP);

      const tG = this.add.graphics().setDepth(6);
      tG.fillStyle(0xffffff, 1);    tG.fillRoundedRect(cx - CELL/2, cy - CELL/2, CELL, CELL, 16);
      tG.lineStyle(1, 0xfcfdfe, 1); tG.strokeRoundedRect(cx - CELL/2, cy - CELL/2, CELL, CELL, 16);

      const sp = this.add.sprite(cx, cy, 'sprites', theme.frame).setOrigin(0.5).setDepth(7).setScale(0);
      this.tweens.add({ targets: sp, scale: 0.46, duration: 220, delay: i * 28, ease: 'Back.easeOut' });

      this.mainGridTiles.push({ g: tG, sp, removed: false, cx, cy });
      this.mainGridGroup.push(tG, sp);
    }

    // ── "Tap to remove" label + sub-grid ──────────────────────────────────
    // 24px gap below main grid (mainPanBottomY + 24 = top of label. lbl2Y = top + 24)
    const lbl2Y  = this.mainPanBottomY + 48;
    const subTopY = lbl2Y;

    this._makeLabel('Tap to remove', lbl2Y, this.subGroup);
    this._buildSubGrid(theme, subTopY);
  }

  // ── Sub-grid (tap-to-remove zone) ─────────────────────────────────────────
  _buildSubGrid(theme, subTopY) {
    const { subtract } = this.currentProblem;
    const panH = subPanelHeight(subtract);

    const panG = this.add.graphics().setDepth(5);
    panG.fillStyle(0x65D570, 0.2);   panG.fillRoundedRect(SUB_PAN_X, subTopY, SUB_PAN_W, panH, 24);
    panG.lineStyle(4, 0xffffff, 1);  panG.strokeRoundedRect(SUB_PAN_X, subTopY, SUB_PAN_W, panH, 24);
    this.subGroup.push(panG);

    for (let i = 0; i < subtract; i++) {
      const col = i % COLS, row = Math.floor(i / COLS);
      const cx  = subCellCX(col);
      const cy  = subCellCY(row, subTopY);
      const cs  = SUB_CELL;   // cell size stored on tile for use in _onSubTap

      const tG = this.add.graphics().setDepth(6);
      // Drop shadow — Y offset 4, blur approximated with two stacked semi-transparent layers
      tG.fillStyle(0x000000, 0.18); tG.fillRoundedRect(cx - cs/2 - 2, cy - cs/2 + 2, cs + 4, cs + 4, 17);
      tG.fillStyle(0x000000, 0.22); tG.fillRoundedRect(cx - cs/2,     cy - cs/2 + 4, cs,     cs,     16);
      // White card face
      tG.fillStyle(0xffffff, 1);    tG.fillRoundedRect(cx - cs/2, cy - cs/2, cs, cs, 16);
      // Stroke #CDCDCD 1px
      tG.lineStyle(1, 0xCDCDCD, 1); tG.strokeRoundedRect(cx - cs/2, cy - cs/2, cs, cs, 16);

      const sp = this.add.sprite(cx, cy, 'sprites', theme.frame).setOrigin(0.5).setDepth(7).setScale(0);
      sp.setInteractive({ useHandCursor: true });
      sp.input.enabled = false;
      this.tweens.add({
        targets: sp, scale: 0.42, duration: 250, delay: 220 + i * 38, ease: 'Back.easeOut',
        onComplete: () => { sp.input.enabled = true; },
      });

      const tile = { g: tG, sp, clicked: false, cx, cy, cs };
      sp.on('pointerover', () => { if (!tile.clicked) { this.tweens.add({ targets: sp, scale: 0.50, duration: 80 }); playClick(); } });
      sp.on('pointerout',  () => { if (!tile.clicked) this.tweens.add({ targets: sp, scale: 0.42, duration: 80 }); });
      sp.on('pointerdown', () => this._onSubTap(tile));

      this.subGroup.push(tG, sp);
    }
  }

  // ── Sub-tile tap ──────────────────────────────────────────────────────────
  _onSubTap(tile) {
    if (tile.clicked || this.step !== 1) return;
    tile.clicked = true;
    tile.sp.disableInteractive();
    playPop();

    const { cx, cy, cs } = tile;

    // Purple border flash
    tile.g.clear();
    tile.g.fillStyle(0x9c27b0, 1);  tile.g.fillRoundedRect(cx - cs/2 - 3, cy - cs/2 - 3, cs + 6, cs + 6, 18);
    tile.g.fillStyle(0xffffff, 1);  tile.g.fillRoundedRect(cx - cs/2, cy - cs/2, cs, cs, 16);

    this.time.delayedCall(230, () => {
      tile.g.clear();
      tile.g.fillStyle(0xcccccc, 1); tile.g.fillRoundedRect(cx - cs/2, cy - cs/2, cs, cs, 16);
      tile.sp.setTint(0xbbbbbb);
      this.tweens.add({ targets: tile.sp, scale: 0.3, duration: 180, ease: 'Quad.easeIn' });
    });

    this._spawnSparkle(cx, cy, C_GOLD);
    this._greyMainTile(this.removedCount);
    this.removedCount++;

    if (this.removedCount >= this.currentProblem.subtract) {
      this.step = 2;
      this.time.delayedCall(460, () => this._transitionToStep2());
    }
  }

  // ── Grey out corresponding main grid tile ─────────────────────────────────
  _greyMainTile(idx) {
    const t = this.mainGridTiles[idx];
    if (!t || t.removed) return;
    t.removed = true;
    const { cx, cy } = t;
    t.g.clear();
    t.g.fillStyle(0xdddddd, 1);    t.g.fillRoundedRect(cx - CELL/2, cy - CELL/2, CELL, CELL, 16);
    t.sp.setTint(0xbbbbbb);
    this.tweens.add({ targets: t.sp, scale: 0.3, alpha: 0.38, duration: 240, ease: 'Quad.easeIn' });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Step 2 — Remaining Objects + 2×2 answer buttons
  // ═══════════════════════════════════════════════════════════════════════════
  _transitionToStep2() {
    this._clearSubGroup();
    this._makeLabel('Remaining Objects', LBL1_CY, this.step2Group);
    this._highlightRemaining();
    this._buildAnswerButtons(buildAnswerChoices(this.currentProblem.answer));
  }

  // ── Highlight tiles that are still remaining ──────────────────────────────
  _highlightRemaining() {
    this.mainGridTiles.forEach(t => {
      if (t.removed) return;
      const { cx, cy } = t;
      const h = this.add.graphics().setDepth(6);
      h.lineStyle(3.5, 0x9c27b0, 1);
      h.strokeRoundedRect(cx - CELL/2, cy - CELL/2, CELL, CELL, 16);
      t.sp.clearTint();
      this.tweens.killTweensOf(t.sp);
      this.tweens.add({ targets: t.sp, scale: 0.5, duration: 200, ease: 'Back.easeOut' });
      this.step2Group.push(h);
    });
  }

  // ── 2×2 answer buttons ────────────────────────────────────────────────────
  _buildAnswerButtons(choices) {
    const startY = this.mainPanBottomY + 24;

    choices.forEach((val, i) => {
      const col  = i % 2;
      const row  = Math.floor(i / 2);
      const bx   = GRID_X + col * (BTN_W + BTN_GAP);
      const by   = startY + row * (BTN_H + BTN_GAP);
      const bcx  = bx + BTN_W / 2;
      const bcy  = by + BTN_H / 2;
      const clr  = BTN_COLORS[i];
      const shd  = BTN_SHADOWS[i];

      // Graphics centred at (bcx, bcy) so tweening .x works naturally
      const g = this.add.graphics({ x: bcx, y: bcy }).setDepth(10);
      
      // Solid fill matching the new screenshot
      g.fillStyle(clr, 1);
      g.fillRoundedRect(-BTN_W/2, -BTN_H/2, BTN_W, BTN_H, 24);
      
      // White 4px stroke
      g.lineStyle(4, 0xffffff, 1);
      g.strokeRoundedRect(-BTN_W/2, -BTN_H/2, BTN_W, BTN_H, 24);
      g.setScale(0);

      const txt = this.add.text(bcx, bcy, `${val}`, {
        fontFamily: FONT_BODY, fontSize: '46px', color: '#ffffff', fontStyle: '600',
        stroke: '#6E40D9', strokeThickness: 5
      }).setOrigin(0.5).setDepth(11).setScale(0);

      const hit = this.add.rectangle(bcx, bcy, BTN_W, BTN_H, 0, 0)
        .setInteractive({ useHandCursor: true }).setDepth(12);
      hit.input.enabled = false;

      this.tweens.add({
        targets: [g, txt], scale: 1, duration: 210, delay: i * 65, ease: 'Back.easeOut',
        onComplete: () => { hit.input.enabled = true; },
      });

      hit.on('pointerover', () => { if (!this.answerLocked) { this.tweens.add({ targets: [g, txt], scale: 1.07, duration: 80 }); playClick(); } });
      hit.on('pointerout',  () => { if (!this.answerLocked) this.tweens.add({ targets: [g, txt], scale: 1, duration: 80 }); });
      hit.on('pointerdown', () => this._onAnswerTap(val, g, txt, clr, shd));

      this.step2Group.push(g, txt, hit);
    });
  }

  // ── Answer tap ────────────────────────────────────────────────────────────
  _onAnswerTap(val, g, txt, clr, shd) {
    if (this.answerLocked) return;
    this.answerLocked = true;
    val === this.currentProblem.answer
      ? this._onCorrect(g, txt)
      : this._onWrong(g, txt);
  }

  _onCorrect(g, txt) {
    playSuccess();
    this.score++;
    this.stars += this.wrongAttempts === 0 ? 3 : this.wrongAttempts === 1 ? 2 : 1;

    g.clear();
    g.fillStyle(0x218a00, 1); g.fillRoundedRect(-BTN_W/2, -BTN_H/2 + 7, BTN_W, BTN_H, 36);
    g.fillStyle(0x33cc00, 1); g.fillRoundedRect(-BTN_W/2, -BTN_H/2, BTN_W, BTN_H, 36);
    g.lineStyle(3, 0xffffff, 1); g.strokeRoundedRect(-BTN_W/2, -BTN_H/2, BTN_W, BTN_H, 36);

    this.tweens.add({ targets: [g, txt], scale: 1.2, duration: 180, yoyo: true, ease: 'Back.easeOut' });
    this.cameras.main.flash(180, 230, 255, 200);
    this._spawnConfetti();
    this._updateHUD();
    this.time.delayedCall(1100, () => this._nextRound());
  }

  _onWrong(g, txt) {
    playWrong();
    this.wrongAttempts++;

    this.tweens.add({
      targets: [g, txt], x: '+=9',
      duration: 65, yoyo: true, repeat: 4, ease: 'Linear',
      onComplete: () => {
        this.time.delayedCall(180, () => {
          this._clearStep2();
          this.answerLocked = false;
          this._makeLabel('Remaining Objects', LBL1_CY, this.step2Group);
          this._highlightRemaining();
          this._buildAnswerButtons(buildAnswerChoices(this.currentProblem.answer));
        });
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Shared UI helper — pill label
  // ═══════════════════════════════════════════════════════════════════════════
  _makeLabel(text, centerY, group) {
    const lW = 190, lH = 48;
    const g = this.add.graphics().setDepth(8);
    g.fillStyle(0xffffff, 1);    g.fillRoundedRect(CX - lW/2, centerY - lH/2, lW, lH, 16);
    g.lineStyle(1, 0xfcfdfe, 1); g.strokeRoundedRect(CX - lW/2, centerY - lH/2, lW, lH, 16);
    const t = this.add.text(CX, centerY, text, {
      fontFamily: FONT_BODY,
      fontStyle: '600',
      fontSize: '16px',
      color: '#8254DA',
      letterSpacing: 1,
    }).setOrigin(0.5).setDepth(9);
    group.push(g, t);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Particle effects
  // ═══════════════════════════════════════════════════════════════════════════
  _spawnSparkle(x, y, color) {
    for (let i = 0; i < 7; i++) {
      const a = (Math.PI * 2 / 7) * i;
      const d = this.add.circle(x, y, PMath.Between(3, 6), color).setDepth(14);
      this.tweens.add({
        targets: d,
        x: x + Math.cos(a) * PMath.Between(14, 34),
        y: y + Math.sin(a) * PMath.Between(14, 34),
        alpha: 0, scale: 0.2,
        duration: PMath.Between(280, 480), ease: 'Quad.easeOut',
        onComplete: () => d.destroy(),
      });
    }
  }

  _spawnConfetti() {
    const cols = [0xff6b6b, 0x4ecdc4, C_GOLD, C_PURPLE, 0xff7597, 0x4ba3e3];
    for (let i = 0; i < 32; i++) {
      const x = PMath.Between(50, GAME_W - 50);
      const y = PMath.Between(100, 440);
      const p = this.add.circle(x, y, PMath.Between(4, 9), cols[i % cols.length]).setDepth(15);
      this.tweens.add({
        targets: p,
        y: y + PMath.Between(80, 200), x: x + PMath.Between(-30, 30),
        alpha: 0, angle: PMath.Between(-180, 180),
        duration: PMath.Between(700, 1300), ease: 'Cubic.easeIn',
        onComplete: () => p.destroy(),
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  Cleanup helpers
  // ═══════════════════════════════════════════════════════════════════════════
  _clearAll() {
    [this.equationGroup, this.mainGridGroup, this.subGroup, this.step2Group].forEach(grp => {
      grp.forEach(o => { this.tweens.killTweensOf(o); o?.destroy?.(); });
    });
    this.equationGroup = [];
    this.mainGridGroup = [];
    this.mainGridTiles = [];
    this.subGroup      = [];
    this.step2Group    = [];
  }

  _clearSubGroup() {
    this.subGroup.forEach(o => { this.tweens.killTweensOf(o); o?.destroy?.(); });
    this.subGroup = [];
  }

  _clearStep2() {
    this.step2Group.forEach(o => { this.tweens.killTweensOf(o); o?.destroy?.(); });
    this.step2Group = [];
  }

  // ─── Win ──────────────────────────────────────────────────────────────────
  _goToWin() {
    this.cameras.main.flash(300, 255, 255, 255);
    this.time.delayedCall(350, () => this.scene.start('WinScene', { score: this.score, stars: this.stars }));
  }
}
