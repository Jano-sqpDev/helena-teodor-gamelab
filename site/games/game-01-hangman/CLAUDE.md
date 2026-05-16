# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the Game

No build step. Open `index.html` directly in any modern browser (double-click or `File > Open`). No server, npm, or install required.

## Architecture

Everything lives in a single `index.html` file with inline CSS and JS — no external dependencies, no frameworks, no bundler.

Structure the JS in clearly separated sections:
1. **Word list** — array of `{ word, category }` objects (50+ words across animals, countries, foods, sports, etc.)
2. **Game state** — a plain object tracking current word, guessed letters, wrong count, difficulty
3. **Rendering** — functions that read state and update the DOM/SVG (no state mutations here)
4. **Event handling** — keyboard listener + on-screen button clicks that call state-mutating functions then re-render

The hangman figure is drawn with **SVG** (preferred) or Canvas, progressively revealing body parts. The gallows is always visible; body parts appear one per wrong guess (head → body → left arm → right arm → left leg → right leg = 6 max, adjustable by difficulty).

## Key Design Decisions (from SPEC.MD)

- **Difficulty levels**: Easy = 8 wrong guesses, Medium = 6, Hard = 4
- **Letter input**: both physical keyboard (`keydown`) and on-screen A–Z button grid
- **Used letters**: colour-coded — green for correct, red for incorrect; buttons are disabled after use
- **Win/loss**: show message + "Play Again" button; track score (wins, losses, streak) across rounds
- **Optional but expected**: dark mode toggle, subtle CSS transitions on letter reveal and body-part appearance, sound effects
- **Responsive**: works on desktop and mobile
