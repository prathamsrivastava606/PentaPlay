# PentaPlay

Five browser games in one small site: Space Invasion, Fruity Match, Zeroth Second, Pac-Man and Turbo Rush. Each game started as a Python/Pygame project and was recreated for the browser (HTML5 Canvas + plain JavaScript, no frameworks, no build step, no Pygbag).

> Formerly "Arcade Hub". The game code is unchanged by the PentaPlay redesign; only the website around it was redone.

## Status
| Game | Status |
|---|---|
| Space Invasion | Playable |
| Fruity Match | Playable |
| Zeroth Second | Playable |
| Pac-Man | Playable |
| Turbo Rush | Playable |

## Run locally
`cd pentaplay && python -m http.server 8000`, then open http://localhost:8000
(Opening `index.html` directly also works in most browsers.)

## Deploy
Upload the whole folder to any static host (GitHub Pages, Netlify, Vercel, Cloudflare Pages). No server code needed.

## Structure
```
index.html                 PentaPlay homepage
css/style.css              homepage styles
css/game-page.css          shared styles for every game page
js/main.js                 mobile menu + active nav link (about 20 lines)
assets/logo/               favicon.svg, pentaplay-mark.svg
assets/fonts/              Poppins (woff, Latin subset)
assets/shared/             game card images
games/<game>/
  index.html               game page (header, canvas, controls, buttons)
  style.css                accent colour + canvas ratio only
  *.js, assets/            the game itself
```
Per-game scripts: space-invasion (engine.js, entities.js, game.js), fruity-match (logic.js, game.js), zeroth-second (world.js, entities.js, game.js), pac-man (board.js, game.js), turbo-rush (entities.js, scenery.js, game.js).

## Design notes
- Palette: deep navy base, off-white text, cyan as the site accent, amber for buttons. Each game has its own small accent (blue, lime, violet, yellow, orange-red) used on its card and page.
- Fonts: Poppins is bundled in `assets/fonts`. The display font (Lilita One) loads from Google Fonts and falls back to Poppins Bold when offline.
- Card images are real frames captured from the running games (Space Invasion, Fruity Match level 3, Pac-Man, Turbo Rush). Zeroth Second's real frames are mostly empty black arena with tiny sprites, so its card image is a composition of the game's own sprites, HUD and arena tiles.
- Favicon and logo: a pentagon (for "Penta") with a play triangle.

## Python ↔ web
The Python projects are the source of truth and are never modified. Each web game re-implements the same logic, constants and assets (resized for web) in JavaScript.

## Add a game
1. Copy a folder from `games/` and replace the scripts and assets.
2. Edit the new `index.html` (title, controls, the stat ids your game script updates) and `style.css` (`--accent`, and `--ar` = canvas width / height).
3. Add a card to the grid in the root `index.html` and a 3:2 image in `assets/shared/`.

## Space Invasion differences from the Python version
- Music starts on first key press/click (browser autoplay rule).
- QUIT button / ESC on the menu returns to the hub.
- Menu buttons are clickable where they are drawn (the original's click areas were offset from the drawn buttons).
- Page "Restart" button = R key (also starts the game from the menu).
- Sprites resized (~32 MB → ~2 MB). Arial font as in the original.
- Controls: Left/Right arrows only (as in the code), SPACE shoot, R restart.

## Fruity Match differences from the Python version
- Best score is kept in the browser's localStorage (the Python best_score.txt does not carry over).
- Fixed 800x700 layout scaled to the window (no live resize re-layout). Fullscreen starts on PLAY.
- Sounds start after the first click. The color bomb uses color_bomb.png (the Python code looked for a missing bomb.png and drew a brown circle).
- Level progress is not saved (same as the original).

## Zeroth Second differences from the Python version
- 1920x1080 canvas scaled to the window; fullscreen starts on PLAY. Esc on the menu returns to the hub.
- Player sprites are pre-processed (checkerboard removed offline, same rule as the Python code).
- Fixed on purpose (deviations from the Python code): wave banner always shows; crosshair is drawn during play (system cursor hidden); drones deal their per-type damage (10 / 8 / 20 instead of always 25). Time-stop is unchanged from the original: when you stand still, drones and ALL bullets (including yours) freeze.
- Kept as in the original: drones always use the "front" sprite; the path-follow code uses swapped tile coordinates when picking its next waypoint.

## Pac-Man differences from the Python version
- 900x950 canvas scaled to the window; fullscreen starts when you press Space/Enter on the title screen.
- The four ghost movement routines were translated mechanically from the Python code, so ghost behaviour is identical. Everything else keeps the original variable names and per-frame order, running at a fixed 60 steps/second.
- Page-level extras: Fullscreen button / F key, and a Restart button that does the same reset as Space (the original only allows Space after Game Over / Victory).
- Behaviours kept exactly as in the original: you get 4 tries (the life counter reaches 0 before the game ends), eaten ghosts score 200/400/800/1600, the game keeps running behind the Game Over / Victory overlay, and there is no Blinky-specific "red" target logic beyond what the code defines.

## Turbo Rush differences from the Python version
- The Python game opens fullscreen at your monitor's resolution; the web version uses a fixed 1920x1080 canvas scaled to fit. Fullscreen starts when you press ENTER.
- Timers use a fixed 60 steps/second (the Python code uses the measured frame time).
- The high score is kept in the browser's localStorage (your highscore.txt value does not carry over). The original never displays it anywhere, so neither does the web version.
- ESC returns to the hub (the Python version quits). The page's Restart button works at any time; in the original R only works after Game Over.
- Behaviours kept as in the original: the booster pickup plays the full retro_gaming.mp3 track; a crash with an enemy can also trigger a "near miss" bonus; enemies you crash into still give +10 when they leave the screen.
