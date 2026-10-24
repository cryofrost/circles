import { MAX_INSTANCES } from '../config.js';

const TYPES = ['circles', 'lines', 'mantras', 'mantrasGL'];
const REPEATABLE_ACTIONS = new Set([
  'selectPreviousLayer', 'selectNextLayer',
  'increaseSpeed', 'decreaseSpeed',
  'increaseNumber', 'decreaseNumber',
  'increaseOpacity', 'decreaseOpacity',
]);

/** Optional Xbox/standard Gamepad API controls for the layer settings panel. */
export class GamepadController {
  #store;
  #panel;
  #status;
  #mapping;
  #gamepadIndex = null;
  #buttonState = new Map();
  #axisState = new Map();
  #rafId;

  constructor(store, panel, statusEl, mappingUrl = '/controller-mapping.json') {
    this.#store = store;
    this.#panel = panel;
    this.#status = statusEl;
    this.#mapping = null;
    this.#mappingUrl = mappingUrl;
  }

  #mappingUrl;

  async start() {
    try {
      const response = await fetch(this.#mappingUrl);
      if (!response.ok) throw new Error(response.statusText);
      this.#mapping = await response.json();
    } catch (error) {
      console.error('Failed to load controller mapping:', error);
      this.#setStatus('Controller mapping unavailable');
      return;
    }

    window.addEventListener('gamepadconnected', event => {
      this.#gamepadIndex = event.gamepad.index;
      this.#setStatus(`${event.gamepad.id} connected`);
    });
    window.addEventListener('gamepaddisconnected', event => {
      if (event.gamepad.index === this.#gamepadIndex) {
        this.#gamepadIndex = null;
        this.#buttonState.clear();
        this.#axisState.clear();
        this.#setStatus('No controller connected');
      }
    });

    const connected = this.#findGamepad();
    if (connected) {
      this.#gamepadIndex = connected.index;
      this.#setStatus(`${connected.id} connected`);
    } else {
      this.#setStatus('No controller connected');
    }
    this.#poll();
  }

  #findGamepad() {
    return [...(navigator.getGamepads?.() || [])].find(gamepad => gamepad?.connected);
  }

  #poll = () => {
    const gamepad = this.#gamepadIndex === null
      ? this.#findGamepad()
      : navigator.getGamepads?.()[this.#gamepadIndex];

    if (gamepad?.connected) {
      this.#gamepadIndex = gamepad.index;
      this.#pollButtons(gamepad, performance.now());
      this.#pollAxes(gamepad, performance.now());
    }
    this.#rafId = requestAnimationFrame(this.#poll);
  };

  #pollButtons(gamepad, now) {
    for (const [buttonIndex, action] of Object.entries(this.#mapping.buttons || {})) {
      if (buttonIndex.startsWith('_')) continue;
      const index = Number(buttonIndex);
      const pressed = Boolean(gamepad.buttons[index]?.pressed);
      const previous = this.#buttonState.get(index) || { pressed: false, lastAction: 0 };

      if (pressed && !previous.pressed) {
        this.#trigger(action);
        previous.lastAction = now;
      } else if (pressed && REPEATABLE_ACTIONS.has(action)
        && now - previous.lastAction >= this.#repeatDelay(previous)) {
        this.#trigger(action);
        previous.lastAction = now;
      }
      previous.pressed = pressed;
      this.#buttonState.set(index, previous);
    }
  }

  #pollAxes(gamepad, now) {
    const deadzone = this.#mapping.deadzone ?? 0.35;
    for (const mapping of this.#mapping.axes || []) {
      if (!Number.isInteger(mapping.axis)) continue;
      const value = gamepad.axes[mapping.axis] || 0;
      const direction = value <= -deadzone ? -1 : value >= deadzone ? 1 : 0;
      const previous = this.#axisState.get(mapping.axis) || { direction: 0, lastAction: 0 };

      if (direction !== 0) {
        const action = direction < 0 ? mapping.negativeAction : mapping.positiveAction;
        if (direction !== previous.direction || now - previous.lastAction >= this.#repeatInterval()) {
          this.#trigger(action);
          previous.lastAction = now;
        }
      }
      previous.direction = direction;
      this.#axisState.set(mapping.axis, previous);
    }
  }

  #repeatDelay() {
    return this.#mapping.repeatDelayMs ?? 350;
  }

  #repeatInterval() {
    return this.#mapping.repeatIntervalMs ?? 120;
  }

  #trigger(action) {
    const layers = this.#store.layers;
    const index = this.#panel.selectedIndex;
    const layer = layers[index];

    switch (action) {
      case 'selectPreviousLayer':
        this.#panel.select(Math.max(0, index - 1));
        break;
      case 'selectNextLayer':
        this.#panel.select(Math.min(layers.length - 1, index + 1));
        break;
      case 'addLayer':
        this.#store.addLayer();
        this.#panel.select(this.#store.length - 1);
        break;
      case 'removeLayer':
        if (layer) this.#store.removeLayer(index);
        break;
      case 'increaseSpeed':
      case 'decreaseSpeed':
        if (layer) this.#update(index, { speed: this.#step(layer.speed, action === 'increaseSpeed', 0.1, 0.1, 10) });
        break;
      case 'increaseNumber':
      case 'decreaseNumber':
        if (layer) this.#update(index, { number: this.#step(layer.number, action === 'increaseNumber', 1, 1, MAX_INSTANCES) });
        break;
      case 'increaseOpacity':
      case 'decreaseOpacity':
        if (layer) this.#update(index, { opacity: this.#step(layer.opacity, action === 'increaseOpacity', 0.1, 0, 1) });
        break;
      case 'toggleSpin':
        if (layer) this.#update(index, { spin: layer.spin === 1 ? -1 : 1 });
        break;
      case 'cycleType':
        if (layer) this.#update(index, { type: TYPES[(TYPES.indexOf(layer.type) + 1) % TYPES.length] });
        break;
      case 'togglePanel':
        document.getElementById('toggleControlPanelButton')?.click();
        break;
      case 'toggleLayers':
        document.getElementById('toggleButton')?.click();
        break;
      default:
        console.warn(`Unknown controller action: ${action}`);
    }
  }

  #step(value, increase, step, min, max) {
    const next = Number(value) + (increase ? step : -step);
    return Math.min(max, Math.max(min, Number(next.toFixed(2))));
  }

  #update(index, changes) {
    this.#store.updateLayer(index, changes);
  }

  #setStatus(text) {
    if (this.#status) this.#status.textContent = text;
  }
}
