import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { protocolJournalApi } from './server/protocolJournalApi.js';

const projectDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    basicSsl(),
    protocolJournalApi(path.join(projectDirectory, 'journals')),
  ],
  // Serve from the project root so index.html, style.css,
  // default_layout.json, and node_modules are all reachable.
  root: '.',
  server: {
    port: 7777,
    host: '0.0.0.0',
    https: true,
  },
  build: {
    outDir: 'dist',
  },
  // Vite handles ?raw imports for GLSL files out of the box.
  // No plugins needed for .vert / .frag as long as we use ?raw.
  assetsInclude: ['**/*.vert', '**/*.frag'],
});
