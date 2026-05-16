# Hangman Game — Claude Code Prompt

## Project Overview

Build a classic Hangman word-guessing game that runs in a web browser. The game should be fun, visually polished, and fully playable with keyboard or mouse input.

## Tech Stack

- **HTML5** for structure
- **CSS3** for styling and animations
- **Vanilla JavaScript** for game logic (no frameworks)
- Single `index.html` file (inline CSS and JS) so it can be opened directly in a browser with no build step

## Core Gameplay

- On each new game, randomly select a word from a built-in word list
- Display the word as a row of blank dashes, one per letter
- The player guesses one letter at a time
- Correct guesses reveal every occurrence of that letter in the word
- Incorrect guesses advance the hangman drawing by one stage (head → body → left arm → right arm → left leg → right leg = 6 wrong guesses allowed)
- The game ends in a **win** when every letter is revealed, or a **loss** when the drawing is complete
- Show a win/loss message and a "Play Again" button at the end of each round

## Visual Design

- Draw the hangman figure using either **SVG** or **HTML5 Canvas** — progressively reveal body parts on each wrong guess
- Include the gallows/scaffold as a permanent fixture
- Use a clean, modern look with readable fonts (e.g. a monospace font for the word blanks)
- Responsive layout that works on both desktop and mobile screens
- Subtle CSS animations or transitions when letters are revealed or body parts appear

## User Interface Elements

- **Word display**: dashes/blanks with spacing, revealed letters shown in place
- **On-screen letter buttons**: A–Z grid so the game is playable without a physical keyboard
- **Keyboard input**: also accept keypresses from a physical keyboard
- Disable/grey out letters that have already been guessed
- **Wrong guesses counter**: show how many incorrect guesses remain (e.g. "5 of 6")
- **Used letters list**: display all guessed letters, colour-coded (green for correct, red for incorrect)
- **Category or hint** (optional): show a category label or hint for the current word

## Word List

- Include a built-in array of at least **50 words** across a few categories (animals, countries, foods, sports, etc.)
- Words should be common, single-word English terms (no spaces or hyphens)
- Store the category alongside each word so it can be displayed as a hint

## Optional Enhancements

Include any of these if they feel natural to add:

- **Difficulty levels** (Easy: 8 wrong guesses / Medium: 6 / Hard: 4)
- **Score tracking** across rounds (wins, losses, current streak)
- **Sound effects** on correct guess, wrong guess, win, and loss
- **Dark mode** toggle
- **Animated transitions** between game states

## Code Quality

- Clean, well-commented code
- Separate concerns: keep game state logic, rendering, and event handling in distinct sections or functions
- No external dependencies — everything self-contained in one file

## How to Run

The finished file should be openable by double-clicking `index.html` in any modern browser — no server, no install, no build tools required.