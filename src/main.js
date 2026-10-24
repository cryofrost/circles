import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { LayerStore } from './state/LayerStore.js';
import { GLMantrasRenderer } from './renderers/GLMantrasRenderer.js';
import { renderCircles, renderLines, renderMantras } from './renderers/canvas2d.js';
import { LayerPanel } from './ui/LayerPanel.js';
import { GlobalControls } from './ui/GlobalControls.js';
import { GamepadController } from './controller/GamepadController.js';
import { ProtocolSequencer } from './state/ProtocolSequencer.js';
import { updateBreathe, createBreatheState } from './utils/breathe.js';

class App {
  #store = new LayerStore();
  #glRenderer;
  #ctx;
  #bgCtx;
  #protocol = new ProtocolSequencer();
  #breatheStates = new Map();

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
    const layerPanel = new LayerPanel(this.#store, document.getElementById('layers'));
    new GlobalControls(this.#store, this.#protocol);
    new GamepadController(
      this.#store,
      layerPanel,
      document.getElementById('controllerStatus')
    ).start();

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
    this.#protocol.tick(time);
    const modulation = this.#protocol.running ? this.#protocol.modulation(time) : 1;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    bgCtx.clearRect(0, 0, bgCtx.canvas.width, bgCtx.canvas.height);

    this.#glRenderer.beginFrame();

    for (const layer of this.#store.layers) {
      const animation = this.#animationFor(layer, time);
      ctx.save();
      ctx.globalAlpha = layer.opacity * modulation;

      switch (layer.type) {
        case 'circles':
          renderCircles(ctx, bgCtx, layer, time, animation);
          break;
        case 'lines':
          renderLines(ctx, layer, time, animation);
          break;
        case 'mantras':
          renderMantras(ctx, layer, time, animation);
          break;
        case 'mantrasGL':
          this.#glRenderer.renderLayer(layer, time, modulation, animation);
          break;
      }

      ctx.restore();
    }

    requestAnimationFrame(this.#loop);
  };

  #animationFor(layer, time) {
    if (!layer.breathe) {
      this.#breatheStates.delete(layer.id);
      return {
        speed: layer.speed,
        spin: layer.spin,
        phase: layer.spin * time * 0.001 * layer.speed,
      };
    }

    if (!this.#breatheStates.has(layer.id)) {
      this.#breatheStates.set(layer.id, createBreatheState(layer.spin, time));
    }
    const state = this.#breatheStates.get(layer.id);
    const result = updateBreathe(state, layer.speed, time);
    this.#breatheStates.set(layer.id, result.nextState);

    // Breathe timing is shared by every layer, but only the WebGL mantra
    // layer uses the alternating direction. Other layers keep their own
    // configured direction and continue rotating continuously.
    if (layer.type !== 'mantrasGL') {
      return {
        speed: layer.speed,
        spin: layer.spin,
        phase: layer.spin * time * 0.001 * layer.speed,
      };
    }

    return { speed: result.speed, spin: result.spin, phase: result.phase };
  };
}

document.addEventListener('DOMContentLoaded', () => new App().init());
