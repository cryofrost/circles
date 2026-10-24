# Repository Guidelines

## Project Structure & Module Organization

This is a browser-based animated layer renderer built with Vite, Bootstrap, Canvas 2D, and WebGL 2.

- `index.html` is the application entry page; `style.css` contains global styles.
- `src/main.js` boots the app and coordinates rendering, state, and UI.
- `src/state/` stores application state (`LayerStore.js`); `src/ui/` contains controls and panels.
- `src/renderers/` contains Canvas 2D and WebGL renderer implementations.
- `src/shaders/` contains GLSL vertex and fragment shaders.
- `src/utils/` contains reusable animation and text-atlas helpers.
- `default_layout.json` and other root-level JSON files are user-facing layer presets.
- `libs/` contains legacy and vendored WebGL-related code. Prefer `src/` for new features.

There is no dedicated test directory. Do not commit generated output such as `dist/` or dependencies in `node_modules/`.

## Build, Test, and Development Commands

Run these from the repository root after `npm install`:

- `npm run start` — start the Vite development server at `http://localhost:3000`.
- `npm run build` — create the production bundle in `dist/`.
- `npm run preview` — serve the production bundle locally for inspection.
- `npm test` — invokes `node test.js`; no checked-in test file currently exists.
- `npm run start:legacy` — run the older `live-server` workflow when specifically testing legacy entry code.

## Coding Style & Naming Conventions

Use modern JavaScript modules, two-space indentation, semicolons, and single quotes in new code. Use `PascalCase` for classes and `camelCase` for functions and variables. Keep rendering, state, and DOM concerns in their existing directories. Preserve shader files as `.vert` and `.frag` and keep shader changes localized.

## Testing Guidelines

No framework or coverage threshold is configured. For rendering or control changes, run `npm run build`, open the app with `npm run start`, and manually verify layer creation, ordering, layout loading/saving, and the affected animation in a WebGL-capable browser. Add focused tests for new utility logic.

## Commit & Pull Request Guidelines

Existing history uses short, imperative-style summaries, though wording is informal (for example, `drop layer button`). Use a concise imperative subject, such as `Add layer opacity control`. Pull requests should describe the user-visible behavior, list verification commands, identify layout or shader changes, and include screenshots or a short recording for visual changes. Keep unrelated refactors out of feature changes.

## Configuration & Asset Notes

Keep layout JSON valid and compatible with `LayerStore`. Treat shader and vendored library changes as rendering-sensitive: test both the development server and production build before submitting.
