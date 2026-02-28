import { LayerStore } from './state/LayerStore.js';
import { GLMantrasRenderer } from './renderers/GLMantrasRenderer.js';
import { renderCircles, renderLines, renderMantras } from './renderers/canvas2d.js';
import { LayerPanel } from './ui/LayerPanel.js';
import { GlobalControls } from './ui/GlobalControls.js';

class App {
  #store = new LayerStore();
  #glRenderer;
  #ctx;
  #bgCtx;

  init() {
    // ── canvases ───────────────────────────────────────────────────────
    const bgCanvas = document.getElementById('backgroundCanvas');
    const fgCanvas = document.getElementById('foregroundCanvas');
    const glCanvas = document.getElementById('webglCanvas');

    bgCanvas.width = window.innerWidth;
    bgCanvas.height = window.innerHeight;
    fgCanvas.width = window.innerWidth;
    fgCanvas.height = window.innerHeight;

    this.#bgCtx = bgCanvas.getContext('2d');
    this.#ctx = fgCanvas.getContext('2d');
    this.#glRenderer = new GLMantrasRenderer(glCanvas);

    // ── UI ─────────────────────────────────────────────────────────────
    new LayerPanel(this.#store, document.getElementById('layers'));
    new GlobalControls(this.#store);

    // ── load default layout ────────────────────────────────────────────
    fetch('/default_layout.json')
      .then(r => {
        if (!r.ok) throw new Error(r.statusText);
        return r.json();
      })
      .then(data => {
        this.#store.setLayers(data);
        console.info('Default layout loaded');
      })
      .catch(err => console.error('Failed to load default layout:', err));

    // ── animation loop ─────────────────────────────────────────────────
    requestAnimationFrame(this.#loop);
  }

  #loop = () => {
    const time = performance.now();
    const ctx = this.#ctx;
    const bgCtx = this.#bgCtx;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    bgCtx.clearRect(0, 0, bgCtx.canvas.width, bgCtx.canvas.height);

    this.#glRenderer.beginFrame();

    for (const layer of this.#store.layers) {
      ctx.save();
      ctx.globalAlpha = layer.opacity;

      switch (layer.type) {
        case 'circles':
          renderCircles(ctx, bgCtx, layer, time);
          break;
        case 'lines':
          renderLines(ctx, layer, time);
          break;
        case 'mantras':
          renderMantras(ctx, layer, time);
          break;
        case 'mantrasGL':
          this.#glRenderer.renderLayer(layer, time);
          break;
      }

      ctx.restore();
    }

    requestAnimationFrame(this.#loop);
  };
}

document.addEventListener('DOMContentLoaded', () => new App().init());
