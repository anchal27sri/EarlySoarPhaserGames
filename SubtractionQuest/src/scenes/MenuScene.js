import { Scene, Math as PMath } from 'phaser';
import {
  GAME_W, GAME_H,
  C_TEAL, C_GOLD, C_PURPLE, C_WHITE,
  FONT_TITLE, FONT_BODY,
  C_TXT_D, C_TXT_M, C_BTN_OR, C_BTN_ORS, C_BTN_GRN, C_BTN_GRNS,
} from '../constants.js';
import { drawLandscapeBg, drawPanel, chunkyButton, drawDashedRoundedRect, drawRibbonBanner, playClick } from '../bg.js';

// Synchronized panels coordinates for seamless visual transitions
const LP_X = 25,  LP_W = 460, LP_CX = LP_X + LP_W / 2;   // left panel
const RP_X = 505, RP_W = 270, RP_CX = RP_X + RP_W / 2;   // right panel
const PY   = 65;  // panels top-y
const PH   = 345; // panels height

import bgImg from '../assets/bg.png';
import spritesImg from '../assets/sprites_alpha.png';
import spritesJsonUrl from '../assets/sprites.json?url';

export class MenuScene extends Scene {
  constructor() { super({ key: 'MenuScene' }); }

  preload() {
    this.load.image('bg', bgImg);
    this.load.atlas('sprites', spritesImg, spritesJsonUrl);
  }

  create() {
    // 1. Background image
    const bg = this.add.image(GAME_W / 2, GAME_H / 2, 'bg');
    bg.setDisplaySize(GAME_W, GAME_H);

    // Title
    this.add.text(GAME_W / 2, GAME_H / 2 - 80, 'Subtraction Game', {
      fontFamily: FONT_TITLE, fontSize: '56px', color: '#ffffff',
      stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(10);

    // PLAY button (chunky orange 3D layered button)
    const { g: btnG, label: btnL, btn } = chunkyButton(this, GAME_W / 2, GAME_H / 2 + 40, 240, 70, '▶  PLAY', 0xff7a2f, 0xcc5500, '32px');

    const go = () => {
      this.tweens.killAll();
      this.cameras.main.flash(200, 255, 255, 255);
      this.time.delayedCall(150, () => this.scene.start('GameScene'));
    };

    btn.on('pointerdown', go);
    btn.on('pointerover',  () => {
      btnG.setAlpha(0.92);
      playClick();
    });
    btn.on('pointerout',   () => btnG.setAlpha(1));
    this.input.keyboard.on('keydown-ENTER', go);
    this.input.keyboard.on('keydown-SPACE', go);
  }
}
