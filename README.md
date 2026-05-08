# EarlySoar Games

A collection of mobile-friendly HTML5 games built with [Phaser](https://phaser.io/) and [Vite](https://vitejs.dev/), wrapped in a single launcher page so kids can pick a game and start playing.

Live launcher: https://anchal27sri.github.io/EarlySoarPhaserGames/

## Games

| Game | Folder | Description |
| --- | --- | --- |
| Fruit Ninja: ABC | [FruitNinja/](FruitNinja/) | Slice flying letters with a ninja blade. |
| Snake Letter Game | [snakegame/](snakegame/) | Guide the snake to collect letters. |
| Tower of Hanoi 2D | [TowerOfHanoi2D/](TowerOfHanoi2D/) | Solve the classic disk puzzle. |
| Tower of Hanoi 3D | [TowerOfHanoi3D/](TowerOfHanoi3D/) | Stack rings in 3D. |
| Bouncing Ball ABC | [BouncingBall/](BouncingBall/) | Bounce a paddle to hit letter balls and learn A–Z. |

Every game is a self-contained folder with its own `index.html`, `package.json`, and `vite.config.js`. The workspace root has its own `package.json` and `vite.config.js` that combine all games into a single production build for GitHub Pages...

---

## How to open a game locally

You have two options.

### Option A — Run the launcher (all games at once)

From the **workspace root**:

```bash
npm install
npm run dev
```

Vite serves the launcher at http://localhost:5173/ and you can click any card to open the corresponding game.

### Option B — Run a single game in isolation

From the **game folder** (e.g. `BouncingBall/`):

```bash
cd BouncingBall
npm install
npm run dev
```

This starts the game directly on its own configured port (e.g. http://localhost:3000/). Useful while developing a single game.

> **Important:** when working on a specific game, always run `npm install` and `npm run dev` from inside that game's folder — not from the workspace root.

---

## Project structure

```
phaser/                     # workspace root
├── index.html              # launcher page (cards link to each game)
├── package.json            # root build deps (phaser, three, vite)
├── vite.config.js          # multi-input rollup config (one entry per game)
├── .github/
│   ├── agents/
│   │   └── game-dev-agent.agent.md   # game-dev-agent definition
│   └── workflows/
│       └── deploy.yml      # CI/CD to GitHub Pages
├── FruitNinja/             # individual game (each has its own package.json + vite.config.js)
├── snakegame/
├── TowerOfHanoi2D/
├── TowerOfHanoi3D/
└── BouncingBall/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── constants.js
        ├── main.js
        └── scenes/
            ├── MenuScene.js
            ├── GameScene.js
            └── WinScene.js
```

---

## Deployment

Deployment is automated to **GitHub Pages** via the workflow at [.github/workflows/deploy.yml](.github/workflows/deploy.yml).

### Trigger

The workflow runs when a **pull request targeting `main` is closed with merge** (`pull_request: types: [closed]` + `if: github.event.pull_request.merged == true`). Pull requests that are closed without merging do **not** trigger a deploy.

### What it does

1. Checks out the merged `main` ref.
2. Installs dependencies with `npm install`.
3. Builds all games at once via `npm run build` (the root `vite.config.js` lists each game as a Rollup input, so they all end up in `dist/`).
4. Uploads `dist/` as a Pages artifact.
5. Deploys it to the `github-pages` environment.

### Adding a new game to the deploy

When you add a new game folder, you **must** register its `index.html` in the root [vite.config.js](vite.config.js) `rollupOptions.input` map, otherwise the production build will silently exclude it:

```js
// vite.config.js (workspace root)
rollupOptions: {
  input: {
    main: resolve(__dirname, 'index.html'),
    fruitninja: resolve(__dirname, 'FruitNinja/index.html'),
    snakegame: resolve(__dirname, 'snakegame/index.html'),
    towerofhanoi2d: resolve(__dirname, 'TowerOfHanoi2D/index.html'),
    towerofhanoi3d: resolve(__dirname, 'TowerOfHanoi3D/index.html'),
    bouncingball: resolve(__dirname, 'BouncingBall/index.html'),
    // newgame: resolve(__dirname, 'NewGame/index.html'),  <- add this
  },
},
```

You can verify locally with `npm run build` from the workspace root and checking that `dist/NewGame/index.html` exists.

### Pages environment note

The deploy workflow runs the deploy job on the merge-commit ref produced by the pull-request event. If you see "Branch is not allowed to deploy to github-pages due to environment protection rules," go to **Repo Settings → Environments → github-pages** and make sure the merge ref is allowed (or remove the branch restriction).

---

## Using `game-dev-agent`

The repo ships a **specialized Copilot/AI agent** for designing and scaffolding new mobile Phaser games. The agent definition lives at [.github/agents/game-dev-agent.agent.md](.github/agents/game-dev-agent.agent.md).

### What it does for you

When you talk to the agent in VS Code, it:

1. Asks for the orientation (`portrait` or `landscape`).
2. Asks for a **design brief** in this exact format:
   ```
   Title:
   Genre:
   Core mechanics:
   Controls:
   Theme / art style:
   Target age group:
   Level progression or goal:
   Special features:
   ```
3. Scaffolds a new self-contained game folder (`GameName/index.html`, `package.json`, `vite.config.js`, `src/main.js`, `src/scenes/{MenuScene,GameScene,WinScene}.js`).
4. Adds a card to the workspace root [index.html](index.html) launcher.
5. Runs `npm install` and `npm run dev` from inside the new game folder and verifies the menu scene renders in the browser.

### How to invoke it

In VS Code Chat with Copilot Agent Mode enabled, select **`game-dev-agent`** from the agent picker (or `@game-dev-agent` if your client supports mentions), then describe the game you want.

### Example: building "Bouncing Ball ABC" with `game-dev-agent`

This is the actual conversation that produced [BouncingBall/](BouncingBall/) in this repo.

**You:** "I want to build a game."

**Agent (asks two questions):**
- Orientation? → **Portrait**
- Design brief? → answer with the template:

```
Title: Bouncing Ball
Genre: Kids Learning Game
Core mechanics:
  1. A ball moves in a random direction containing a random letter A–Z.
  2. The ball bounces off a visible blue boundary at the top and sides.
  3. The bottom has no boundary; missing it shows "Oh no! Try again!" and respawns the same letter.
  4. A horizontal paddle at the bottom is movable left/right and bounces the ball back.
  5. On a successful paddle bounce the letter changes to a random remaining one.
  6. Game ends with a congratulations screen when all 26 letters are completed.
Controls: Drag the paddle left and right with one finger.
Theme / art style: Fun, bright, kid-friendly.
Target age group: Below 10.
Level progression or goal: Help kids visualize all 26 letters.
Special features: Ball and letter pulse smoothly (scale 1.0 → 1.3 yoyo).
```

**Agent (then automatically):**
- Creates `BouncingBall/index.html`, `package.json`, `vite.config.js`.
- Creates `BouncingBall/src/constants.js` with `GAME_W` / `GAME_H`.
- Creates `BouncingBall/src/main.js` with the Phaser config (FIT scale, 400×700 portrait, three scenes).
- Creates `BouncingBall/src/scenes/MenuScene.js`, `GameScene.js`, `WinScene.js`.
- Adds a `🏐 Bouncing Ball ABC` card to the root [index.html](index.html).
- Runs `cd BouncingBall && npm install && npm run dev`.
- Opens the browser at the dev URL and confirms the menu renders, the PLAY button works (touch + Enter/Space), and gameplay reaches the win state.

The full output is the [BouncingBall/](BouncingBall/) folder you can explore in this repo as a reference for what `game-dev-agent` produces.

### Tips for working with the agent

- Be specific in the brief. "Pulse the ball by 30%" is better than "the ball should animate."
- Reference existing games. Saying "use the same scene structure as BouncingBall" gives the agent a known-good template to follow.
- Don't forget to register the new game in the root [vite.config.js](vite.config.js) build inputs (the agent will do this if you remind it; otherwise it'll only show up locally and not in the deploy).
- After the agent says it's done, do a quick manual check: open the launcher, click the new card, play one full round, refresh, play again.

---

## License

Internal / personal project. No license specified.
