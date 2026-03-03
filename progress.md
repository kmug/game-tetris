Original prompt: Build a classic Snake game in this repo.

## TODO
- Create minimal Snake game files in plain HTML/CSS/JS.
- Keep core logic deterministic and isolated for testability.
- Add keyboard + touch controls and restart flow.
- Add/skip tests based on available test runner.
- Provide run instructions and manual verification checklist.

## Notes
- Repo was empty at start; no existing framework or test runner detected.

## Progress update 1
- Added minimal vanilla frontend scaffold (`index.html`, `styles.css`).
- Implemented deterministic snake logic in `src/snake-logic.js` (movement, growth, collision, food spawn, pause, restart state setup).
- Wired interactive UI in `src/game.js` with keyboard + touch controls and restart/pause buttons.
- Added `window.render_game_to_text` and `window.advanceTime(ms)` hooks for deterministic test stepping.

## Progress update 2
- Could not run Playwright loop or local JS tests in this environment because `node` and `npx` are not installed.
- Prepared deterministic hooks (`window.advanceTime`, `window.render_game_to_text`) for test automation once Node/Playwright are available.

## Progress update 3
- New user request: build Tetris game.
- Replaced Snake UI with canvas-based Tetris layout (`index.html`, `styles.css`).
- Added deterministic Tetris core logic in `src/tetris-logic.js` (piece spawn/bag, move/rotate, lock, line clear, score/level, game-over).
- Replaced runtime with Tetris rendering + input handling in `src/game.js`.
- Kept deterministic hooks: `window.render_game_to_text`, `window.advanceTime(ms)`.

## Progress update 4
- Validation tooling still unavailable in this environment (`node`/`npx` missing), so Playwright loop and JS test-runner checks could not be executed.
- Manual/browser run required on a machine with Node installed.

## Progress update 5
- Adjusted script loading for broader web compatibility:
  - Removed ES module dependency in HTML.
  - Exposed logic via `window.TetrisLogic` in `src/tetris-logic.js`.
  - Updated `src/game.js` to consume global logic object.
- This enables running by opening `index.html` directly or via static hosting without module/CORS issues.

## Progress update 6
- Added Web Audio API SFX with no external assets/dependencies.
- Added sound toggle UI/button + `M` shortcut.
- Hooked SFX to gameplay transitions: move, rotate, soft drop, hard drop, lock, line clear, pause/resume, restart, game over.
- Kept browser compatibility (non-module scripts) and deterministic hooks.

## Progress update 7
- Upgraded gameplay quality across requested 1~6 items:
  - Next preview queue (5 pieces) with UI panel.
  - Ghost piece rendering.
  - Input feel improvements: DAS/ARR hold repeat + robust key/touch release handling.
  - Rotation wall-kick upgrade (SRS-style kick tables for I and JLSTZ).
  - Balance tweaks: gravity curve + soft/hard drop scoring.
  - Mobile UX improvements: larger touch controls and better layout.
  - SFX rebalance: reduced harshness/volume, differentiated line-clear intensity.
- Environment still lacks `node`/`npx`, so automated Playwright/test-runner validation remains unavailable here.

## Progress update 8
- Restyled UI to Apple-inspired Liquid Glass look while preserving existing game structure and controls.
- Added translucent layered surfaces, blur/backdrop effects, soft highlights, rounded glass buttons, and atmospheric background gradients.
- Kept all functional layout blocks unchanged (HUD, play area, next panel, controls, touch controls).

## Progress update 9
- Refined Liquid Glass UI with Apple-style foundational principles:
  - Consistent corner-radius tokens for visual rhythm.
  - 44px minimum touch target for controls.
  - Focus-visible outlines for keyboard accessibility.
  - Improved text contrast/readability in glass surfaces.
  - Graceful fallback when backdrop blur is unsupported.

## Progress update 10
- Updated canvas block rendering to a semi-transparent glass style:
  - Rounded block geometry
  - Layered translucent gradients
  - Specular top highlight
  - Soft inner shadow + bright edge stroke
- Applied differentiated glass opacity for active vs ghost blocks.

## Progress update 11
- Adjusted ghost piece rendering per feedback:
  - Ghost block size now matches normal block size.
  - Ghost color changed to neutral gray tone.

## Progress update 12
- Increased overall SFX loudness by adding a master gain multiplier (`MASTER_SFX_GAIN = 1.6`) with safe clamping.
- Kept individual tone design unchanged while raising perceived volume consistently.

## Progress update 13
- Added Safari-focused audio reliability fixes:
  - AudioContext unlock routine via silent buffer playback on first user gesture.
  - Resume handling for `suspended` and `interrupted` states.
  - Dedicated master gain node path for consistent output routing.
  - One-time early gesture listeners (`touchstart/pointerdown/mousedown/keydown`) to prime audio.

## Progress update 14
- Added Tetris Hold feature:
  - Hold slot UI panel + touch button.
  - Keyboard support: `C` or `Shift`.
  - Logic: one hold per turn (`canHold`), reset after piece lock/spawn.
  - Supports first-time store and swap with held piece.
- Extended text state output with `heldType` and `canHold`.

## Progress update 15
- Reworked block visuals to closely match provided glossy reference style:
  - Switched to high-saturation palette (yellow/orange/green/purple/blue/cyan/red).
  - Added stronger volumetric look with layered top gloss, bottom shade, side shade, and block shadow.
  - Kept ghost blocks neutral gray and same-size as requested.
  - Updated next/hold mini-block palette to match main board blocks.

## Progress update 16
- Tuned Safari stability/performance:
  - Stronger AudioContext unlock/resume flow with `audioReady` gating.
  - Retry-safe tone playback path for Safari context recovery.
  - Faster control response (DAS/ARR reduced).
  - Canvas full clear each frame to remove residual trails.
  - Reduced expensive side-shadow rendering on Safari to improve smoothness.

## Progress update 17
- Rolled back block visual style to the previous glass-look design (before recent icon-like glossy styling).
- Restored earlier color palette for board and next/hold mini blocks.
- Kept Safari audio and motion stability improvements from the latest fixes.

## Progress update 18
- Slowed horizontal auto-repeat slightly for better control feel:
  - DAS: 105ms -> 125ms
  - ARR: 28ms -> 34ms

## Progress update 19
- Smoothed movement SFX to reduce choppy/overlapped playback:
  - Added per-SFX cooldown gate (`move/down/lock`).
  - Shortened and slightly softened `move` tone.

## Progress update 20
- Added GitHub Pages deployment workflow (`.github/workflows/pages.yml`).
- Pushed workflow to origin/main to trigger automatic Pages deployment via GitHub Actions.

## Progress update 21
- Switched deployment strategy to non-Actions GitHub Pages.
- Removed Actions Pages workflow file to avoid repeated Setup Pages failures.
- Repository now ready for Pages deployment from `main` branch root.

## Progress update 22
- Added `README.md` with run instructions, controls, live URL, deployment and file map.
- Added GitHub bug report issue template at `.github/ISSUE_TEMPLATE/bug_report.yml`.

## Progress update 23
- Improved iOS/mobile touch ergonomics:
  - Added `viewport-fit=cover`.
  - Added bottom fixed touch dock with safe-area inset support.
  - Increased touch button size and spacing for finger input.
  - Reserved app bottom padding to avoid control overlap.
  - Reduced scroll/bounce interference on coarse-pointer devices.
  - Kept desktop keyboard flow unchanged.

## Progress update 24
- Refined iOS control ergonomics:
  - Moved touch dock outside main and anchored to viewport bottom.
  - Converted utility controls (Restart/Pause/Sound) into small circular icon buttons on a separate fixed strip above touch dock.
  - Increased reserved bottom space so controls do not overlap game board.
  - Reduced mobile board footprint further for better touch area.

## Progress update 25
- Repositioned iOS utility buttons to the left of the game board.
- Repositioned Hold/Next panels to the right of the game board on iOS.
- Switched mobile layout to 3-column structure (utility | board | side) without overlaying the playfield.
- Kept bottom touch dock fixed and separate.

## Progress update 26
- Converted iOS touch dock action buttons (Rotate/Drop/Hold/Left/Down/Right) to icon labels on coarse-pointer devices while keeping desktop text labels.
- Reworked Hold/Next preview rendering to a normalized 4x4 grid per piece to prevent line-break/layout glitches on iPhone Safari.
- Updated preview/touch CSS to align with the new fixed-grid rendering and clearer icon touch targets.
