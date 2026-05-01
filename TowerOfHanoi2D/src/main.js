import { AUTO, Scale, Game } from 'phaser';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { WinScene } from './scenes/WinScene.js';

const config = {
  type: AUTO,
  parent: 'game-container',
  width: 1280,
  height: 720,
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Scale.ENVELOP,
    autoCenter: Scale.CENTER_BOTH,
  },
  input: {
    activePointers: 1,
  },
  scene: [MenuScene, GameScene, WinScene],
};

new Game(config);
