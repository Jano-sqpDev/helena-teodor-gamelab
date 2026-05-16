# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running Locally

```bash
docker compose up -d
# Visit http://localhost:8080
```

No build step — all games are static files served directly by Nginx. Open any `index.html` in a browser to test without Docker.

## Architecture

**Zero-dependency static site.** No npm, no bundler, no frameworks. Everything runs as plain HTML/CSS/JS files served by Nginx via Docker.

### Game registry

`site/games.json` is the single source of truth for which games appear on the landing page (`site/index.html`). The landing page fetches this file at runtime and dynamically renders game cards. To add a game, create `site/games/game-XX-name/` and add an entry to `games.json`.

### Game structure

Each game lives in its own folder under `site/games/`. Games are self-contained — no shared code between them. The naming convention is `game-NN-name/` (two-digit number + kebab-case name).

Single-file games (like Hangman) put everything in `index.html`. Multi-file games (like Banano) split into:
- `index.html` — entry point
- `game.js` — all game logic and rendering
- `style.css` — layout, canvas centering, mobile controls

Every game must have a "← Back to Game Lab" link and must work as a standalone static page.

### JS code organisation (game files)

Structure game JS in clearly separated sections, in order:
1. **Constants / config** — canvas size, colours, speeds, timing
2. **Sprites** — programmatic drawing functions (no external images)
3. **Game state** — plain object(s) tracking all mutable state
4. **Rendering** — functions that read state and paint to canvas; no state mutations
5. **Game logic** — state-mutating functions (physics, collision, scoring)
6. **Input handling** — keyboard + touch event listeners that call logic functions then re-render
7. **Game loop** — `requestAnimationFrame` loop

### Canvas games

- Resolution: **256×224px** (NES-style), scaled up to fit viewport
- `image-rendering: pixelated` / `crisp-edges` to keep pixel-perfect look when scaled
- AABB collision detection
- Velocity-based physics with gravity
- Delta-time or fixed timestep for consistent movement across frame rates
- Sprites drawn programmatically — no external image files

### Visual style

Kid-friendly, playful. Landing page uses animated blobs, confetti particles, bright card colours. Games use the colour palette defined in their SPEC.md. Fonts: `Baloo 2` (headings) and `Nunito` (body) on the landing page; `Press Start 2P` for pixel-art game UIs.

## Adding a New Game

1. Create `site/games/game-XX-name/`
2. Add `index.html` (and optionally `game.js`, `style.css`)
3. Add entry to `site/games.json`
4. Push to `main` — GitHub Actions deploys to Bitfrost (self-hosted runner)

Each game should have a `SPEC.md` describing gameplay rules and a `CLAUDE.md` with game-specific guidance.
