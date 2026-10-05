# Play2048 Classic

A warm, single-player 2048 puzzle built with HTML, CSS, and JavaScript. No build step or JavaScript dependencies. Slide matching tiles together, reach 2048, and keep playing for larger tiles.

## Play

With Python 3 installed, run a local HTTP server from the repository root:

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

Open `http://127.0.0.1:8080` in any modern web browser.

Opening `index.html` directly in your browser also works, but `localStorage` behavior on file URLs varies between browsers. Use the same local server address and port to resume saved games.

Rubik loads from Google Fonts when online. A local fallback font keeps the game usable without internet access.

## Controls

- **Desktop**: Arrow keys (`Up`, `Down`, `Left`, `Right`) or `W`, `A`, `S`, `D`.
- **Mobile**: Swipe the game board in any cardinal direction.
- **New Game**: Resets the current board. After at least one board-changing move in a playable run, confirmation protects progress from accidental resets. An untouched board or win/game-over screen needs no extra confirmation.
- **Keep Going**: Appears upon reaching the 2048 tile to allow continuous play for higher scores.
- **Try Again**: Restarts immediately from a win or game-over overlay.

## Features

- **Zero dependencies**: Pure web standards (HTML5, CSS, JavaScript).
- **Auto-save**: In-progress game state and best score persist in `localStorage`. Saves stay in the current browser on this device; they do not sync. If storage is blocked or unavailable, a notice appears and the game remains playable without saving.
- **Accessible**: Semantic markup, screen-reader tile grid announcements, visible focus rings, and full keyboard navigation.
- **Responsive**: Fluid layout supporting mobile screens down to 320px up to desktop viewports, with minimum 44px touch targets.
- **Reduced motion**: Respects `prefers-reduced-motion` system settings.

## Tests

Run the headless rules engine verification suite:

```sh
node game.test.js
```

The test suite runs 4,000 randomized sliding invariant checks, move validations, merge-once assertions, scoring rules, spawn probability checks, and state restoration safeguards.

## Project Structure

- `index.html`: Semantic application shell, accessibility announcements, and game controls.
- `style.css`: Visual styling, color system, tile layouts, animations, and responsive breakpoints.
- `game.js`: Pure JavaScript 2048 engine, input listeners, DOM synchronization, and storage handling.
- `game.test.js`: Invariant and unit test suite.
- `GLOSSARY.md`: Domain vocabulary definitions.
