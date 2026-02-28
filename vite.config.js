import { defineConfig } from 'vite';

export default defineConfig({
  // Serve from the project root so index.html, style.css,
  // default_layout.json, and node_modules are all reachable.
  root: '.',
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  build: {
    outDir: 'dist',
  },
  // Vite handles ?raw imports for GLSL files out of the box.
  // No plugins needed for .vert / .frag as long as we use ?raw.
  assetsInclude: ['**/*.vert', '**/*.frag'],
});
