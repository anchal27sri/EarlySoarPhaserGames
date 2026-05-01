import { AUTO, Scale, Game } from 'phaser';
import { SnakeScene } from './scenes/SnakeScene.js';

const GAME_WIDTH = 360;
const GAME_HEIGHT = 640;

const config = {
  type: AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#000000',
  parent: 'game-container',
  scale: {
    mode: Scale.RESIZE,
    autoCenter: Scale.CENTER_BOTH,
    width: '100%',
    height: '100%',
  },
  scene: [SnakeScene],
};

new Game(config);
