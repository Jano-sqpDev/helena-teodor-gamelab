# Banano — Game Spec

## Overview

A classic 8-bit platform game inspired by Donkey Kong. A teen gorilla must climb through a jungle of trees and branches, collecting bananas to feed his family, while avoiding banana skins thrown by mischievous chimpanzees.

**Tech:** Pure HTML, CSS, JavaScript (single `index.html` + `game.js` + `style.css`). No frameworks, no build step. Must run as a static page served by Nginx.

**Target folder:** `site/games/game-02-banano/`

---

## Gameplay

### Objective
The player controls a teen gorilla who must collect a big basket of bananas at the top of the screen and bring it back (reach it) to feed his family.

### Level layout
- **Bottom-left corner:** A large tree with the gorilla's family sitting on branches. This is the starting position.
- **Platforms:** Tree branches arranged in a zig-zag pattern going diagonally up-left, then up-right (classic Donkey Kong style — rows of platforms with ladders/vines connecting them).
- **Top-left corner:** A big basket overflowing with bananas. This is the goal.
- **Small bananas** scattered across the platforms — collectible bonus items for score.

### Movement pattern (Donkey Kong style)
The gorilla runs left/right along branches (platforms). At the end of each branch, there's a vine or trunk section to climb up to the next level. The path zig-zags:
- Level 1 (bottom): run right →
- Level 2: run left ←
- Level 3: run right →
- Level 4 (top): run left ← to reach the basket

### Enemies
- **Chimpanzees** sit on higher branches and throw banana skins downward.
- Banana skins roll/slide down the branches (like barrels in Donkey Kong).
- The gorilla must jump over banana skins to avoid them.

### Losing a life
- If a banana skin hits the gorilla, he slips, does a falling animation, and loses one life.
- The gorilla respawns at the start of the current level (branch he was on) or at the very beginning.

### Winning
- Reaching the basket at the top-left completes the level.
- Show a celebration screen with the family eating bananas together.

---

## Controls

### Desktop
- **Arrow Left / A** — move left
- **Arrow Right / D** — move right
- **Space / Arrow Up / W** — jump

### Mobile
- On-screen touch buttons at the bottom of the screen:
  - **Left arrow button** (bottom-left)
  - **Right arrow button** (bottom-right)  
  - **Jump button** (center or above the arrows)

---

## UI Elements

### HUD (always visible during gameplay)
- **Score** — top-left, increases when collecting bananas (+100 per banana)
- **Lives** — top-right, displayed as 3 small gorilla head icons. One disappears per death.
- **Level indicator** — top-center (optional, for future multi-level support)

### Screens
1. **Title screen** — "BANANO" in big pixel font, "Press SPACE to start" / tap to start on mobile, 8-bit gorilla sprite
2. **Gameplay screen** — the main game
3. **Death animation** — gorilla slips, brief pause, respawn
4. **Game over screen** — when all 3 lives lost, show score, "GAME OVER", "Press SPACE to retry"
5. **Victory screen** — gorilla reaches basket, family celebration, final score, "Press SPACE to play again"

---

## Visual Design

### Style: 8-bit retro pixel art
- **Canvas-based rendering** using HTML5 `<canvas>`
- Pixel-perfect sprites, no anti-aliasing on game elements
- `image-rendering: pixelated` on the canvas
- Dark jungle green/brown background
- Bright, saturated colours for characters and collectibles

### Colour palette
- **Background:** dark green (#1a3a1a) with darker tree trunk browns (#4a2a0a)
- **Branches/platforms:** medium brown (#8B6914) with green leaf accents
- **Gorilla:** dark brown (#5C3A1E) with lighter belly (#A0724A)
- **Chimpanzees:** lighter brown (#7B5B3A)
- **Bananas:** bright yellow (#FFD700) with green stem
- **Banana skins:** yellow (#CCAA00) — must be clearly visible as a hazard
- **Basket:** woven tan (#C4A46C)
- **HUD text:** white (#FFFFFF) with black outline for readability

### Sprites
All sprites should be drawn programmatically on canvas (no external image files needed). Use simple pixel-block characters:
- **Teen gorilla:** ~16x20 pixels, with walk cycle (2-3 frames), jump frame, slip/fall frame
- **Chimpanzees:** ~14x16 pixels, sitting pose + throwing animation (2 frames)
- **Banana:** ~8x8 pixels, spinning collectible
- **Banana skin:** ~12x6 pixels, sliding along platforms
- **Basket:** ~24x20 pixels at the goal
- **Family gorillas:** 2-3 gorillas sitting on the starting tree, simple idle sprites

### Font
Use a pixel/bitmap font for all text. Either draw text with canvas pixel-by-pixel, or use a Google Font like `"Press Start 2P"` for HUD and menu screens.

---

## Technical Requirements

### File structure
```
site/games/game-02-banano/
├── index.html      ← entry point, loads game.js and style.css
├── game.js         ← all game logic, rendering, sprites
└── style.css       ← page layout, canvas centering, mobile controls
```

### Game engine basics
- Use `requestAnimationFrame` for the game loop
- Fixed timestep or delta-time based movement
- Simple AABB collision detection (axis-aligned bounding boxes)
- Gravity + jump physics (velocity-based)
- Platform collision (land on top of branches, don't pass through)

### Canvas
- Game resolution: **256x224** pixels (classic NES-style), scaled up to fit the screen
- Use `image-rendering: pixelated` / `crisp-edges` to maintain pixel-perfect look when scaled
- Scale canvas to fit viewport while maintaining aspect ratio

### Mobile support
- Touch controls must work on phones and tablets
- Canvas scales responsively
- No pinch-to-zoom issues (set viewport meta properly)
- Touch buttons large enough to use comfortably (at least 60x60px touch targets)

### Performance
- No external dependencies or libraries
- Smooth 60fps on modern browsers
- Lightweight — entire game under 50KB total

### Sound (optional, low priority)
- If implemented, use Web Audio API for simple 8-bit sound effects:
  - Jump: short blip
  - Collect banana: cheerful ding
  - Slip: descending slide sound
  - Game over: sad trombone
  - Victory: celebration jingle

---

## Integration with Game Lab

This game is part of the Helena & Teodor's Game Lab project. It must:
- Work as a standalone page (own `index.html`)
- Have no external dependencies (no npm, no CDN libs)
- Be registered in `site/games.json` (already done)
- Include a "← Back to Game Lab" link somewhere on the page (top-left corner or title screen)

---

## Priority

1. **Core platformer** — gorilla moves, jumps, lands on platforms
2. **Level layout** — zig-zag branches with climb points
3. **Collectible bananas** — with score
4. **Enemies** — chimpanzees throwing banana skins
5. **Lives and game over**
6. **Victory condition** — reach the basket
7. **Title and menu screens**
8. **Mobile touch controls**
9. **Polish** — animations, particles, screen shake
10. **Sound effects** (bonus)