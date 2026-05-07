import { AUTO, Scale, Game } from 'phaser';
import { GAME_W, GAME_H } from './constants.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { WinScene } from './scenes/WinScene.js';

const config = {
  type: AUTO,
  parent: 'game-container',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: '#fef6e4',
  scale: {
    mode: Scale.FIT,
    autoCenter: Scale.CENTER_BOTH,
  },
  scene: [MenuScene, GameScene, WinScene],
  input: {
    activePointers: 1,
  },
};

new Game(config);
