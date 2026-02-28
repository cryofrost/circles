import { DEFAULT_LAYER } from '../config.js';

let nextId = 1;

function withId(layer) {
  return { id: nextId++, ...layer };
}

/**
 * Centralized layer state with EventTarget-based change notifications.
 *
 * Consumers subscribe to the 'change' event and read `.layers` (returns
 * shallow copies so outside code cannot accidentally mutate store state).
 */
export class LayerStore extends EventTarget {
  #layers = [];

  /** Returns a shallow copy of each layer — safe to read, not to write. */
  get layers() {
    return this.#layers.map(l => ({ ...l }));
  }

  get length() {
    return this.#layers.length;
  }

  // ── bulk operations ────────────────────────────────────────────────────

  setLayers(layers) {
    this.#layers = layers.map(withId);
    this.#emit();
  }

  // ── per-layer CRUD ─────────────────────────────────────────────────────

  addLayer(overrides = {}) {
    this.#layers.push(withId({ ...DEFAULT_LAYER, ...overrides }));
    this.#emit();
  }

  removeLayer(index) {
    this.#layers.splice(index, 1);
    this.#emit();
  }

  updateLayer(index, changes) {
    Object.assign(this.#layers[index], changes);
    this.#emit();
  }

  moveLayer(fromIndex, toIndex) {
    const [layer] = this.#layers.splice(fromIndex, 1);
    this.#layers.splice(toIndex, 0, layer);
    this.#emit();
  }

  // ── higher-level helpers ───────────────────────────────────────────────

  recalculateOpacity() {
    this.#layers.forEach((layer, i) => {
      layer.opacity = Math.max(0, 1 - i * 0.1);
    });
    this.#emit();
  }

  setAllBreathe(enabled) {
    this.#layers.forEach(layer => { layer.breathe = enabled; });
    this.#emit();
  }

  /** Spread layer speeds across [baseSpeed, baseSpeed + frequency] */
  setSpeedsFromFrequency(frequency) {
    const base = frequency / 2;
    const step = this.#layers.length > 1
      ? frequency / this.#layers.length
      : 0;
    this.#layers.forEach((layer, i) => {
      layer.speed = base + i * step;
    });
    this.#emit();
  }

  // ── serialization ─────────────────────────────────────────────────────

  toJSON() {
    // Strip runtime `id` field before saving
    return this.#layers.map(({ id, ...rest }) => rest);
  }

  // ── private ───────────────────────────────────────────────────────────

  #emit() {
    this.dispatchEvent(new Event('change'));
  }
}
