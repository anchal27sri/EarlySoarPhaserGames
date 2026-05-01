import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        fruitninja: resolve(__dirname, 'FruitNinja/index.html'),
        snakegame: resolve(__dirname, 'snakegame/index.html'),
        towerofhanoi2d: resolve(__dirname, 'TowerOfHanoi2D/index.html'),
        towerofhanoi3d: resolve(__dirname, 'TowerOfHanoi3D/index.html'),
      },
    },
  },
  server: {
    open: true,
  },
});
