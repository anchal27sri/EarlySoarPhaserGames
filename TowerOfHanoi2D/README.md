# Tower of Hanoi

A classic Tower of Hanoi puzzle game built with [Phaser 3](https://phaser.io/) — optimized for mobile webview.

## Features

- **Drag & drop** disk interaction with touch support
- **Configurable disk count** (3–8) from the menu
- **Move validation** — only valid moves allowed, invalid drops snap back
- **Visual feedback** — peg highlighting during drag, shake animation on invalid moves
- **Star rating** on win based on move efficiency (vs. minimum 2ⁿ−1 moves)
- **Responsive portrait layout** (720×1280) — auto-scales to any screen size
- **No external assets** — all graphics drawn procedurally

## Getting Started

```bash
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

## Build for Production

```bash
npm run build
```

Outputs optimized static files to `dist/` — ready for webview embedding or static hosting.

## Project Structure

```
src/
├── main.js                 # Phaser game config & boot
├── scenes/
│   ├── MenuScene.js        # Disk count selector
│   ├── GameScene.js        # Core gameplay (pegs, drag-drop, HUD)
│   └── WinScene.js         # Victory screen with stats
└── objects/
    ├── HanoiModel.js       # Pure game logic (stacks, validation)
    ├── Disk.js             # Draggable disk object
    └── Peg.js              # Peg visual + drop zone
```

## Tech Stack

- **Phaser 3** — HTML5 2D game framework
- **Vite** — dev server & bundler
