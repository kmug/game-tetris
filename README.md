# Game Tetris

Playable web Tetris built with plain HTML/CSS/JavaScript.

## Live
- https://kmug.github.io/game-tetris/

## Features
- Classic Tetris gameplay (move/rotate/soft drop/hard drop)
- Hold piece (`C` or `Shift`) with once-per-turn limit
- Next queue preview
- Ghost piece
- Score, lines, level progression
- Keyboard and touch controls
- Sound effects (Safari-compatible unlock flow)

## Controls
- `Left / Right`: move
- `Down`: soft drop
- `Up`: rotate
- `Space`: hard drop
- `C` or `Shift`: hold piece
- `P`: pause/resume
- `R`: restart
- `M`: sound on/off

## Local Run
### Option 1: open directly
- Open `index.html` in your browser.

### Option 2: static server
```bash
cd /Users/kmug/Documents/AI/GAME
python3 -m http.server 5173
```
Then open `http://localhost:5173`.

## Deployment
This project is deployed with GitHub Pages from `main` branch root (`/(root)`).

## Project Structure
- `index.html`: app shell
- `styles.css`: UI styles
- `src/tetris-logic.js`: deterministic game state logic
- `src/game.js`: rendering, input, audio, runtime integration
- `progress.md`: implementation log

## License
See `LICENSE`.
