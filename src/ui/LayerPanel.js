import { MAX_INSTANCES } from '../config.js';

/**
 * Manages the layer list DOM inside #layers.
 *
 * Subscribes to LayerStore 'change' events and rebuilds the list.
 * User actions are forwarded to the store via the provided store reference.
 */
export class LayerPanel {
  #store;
  #container;

  constructor(store, containerEl) {
    this.#store = store;
    this.#container = containerEl;

    store.addEventListener('change', () => this.#render());
    this.#render();
  }

  // ── private ───────────────────────────────────────────────────────────

  #render() {
    const store = this.#store;
    const layers = store.layers;
    this.#container.innerHTML = '';

    layers.forEach((layer, index) => {
      const div = this.#buildLayerDiv(layer, index, layers.length);
      this.#container.appendChild(div);
    });
  }

  #buildLayerDiv(layer, index, total) {
    const store = this.#store;
    const div = document.createElement('div');
    div.className = 'layer';
    div.draggable = true;

    // ── type selector ──────────────────────────────────────────────────
    div.appendChild(this.#label('Type: ', (() => {
      const sel = document.createElement('select');
      ['circles', 'lines', 'mantras', 'mantrasGL'].forEach(type => {
        const opt = document.createElement('option');
        opt.value = type;
        opt.textContent = type.charAt(0).toUpperCase() + type.slice(1);
        opt.selected = layer.type === type;
        sel.appendChild(opt);
      });
      sel.addEventListener('change', e => store.updateLayer(index, { type: e.target.value }));
      return sel;
    })()));

    // ── delete button ──────────────────────────────────────────────────
    const del = document.createElement('label');
    del.className = 'deleteLayer';
    del.textContent = '🗑️';
    del.addEventListener('click', () => store.removeLayer(index));
    div.appendChild(del);

    // ── speed ──────────────────────────────────────────────────────────
    div.appendChild(this.#label('Speed: ', this.#range({
      value: layer.speed, min: 0.1, max: 10, step: 0.1,
      onChange: v => store.updateLayer(index, { speed: parseFloat(v) }),
    })));

    // ── number ─────────────────────────────────────────────────────────
    const numberDisplay = document.createTextNode(` ${layer.number}`);
    div.appendChild(this.#label('Number: ', this.#range({
      value: layer.number, min: 1, max: MAX_INSTANCES, step: 1,
      onChange: v => {
        store.updateLayer(index, { number: parseInt(v, 10) });
        numberDisplay.textContent = ` ${v}`;
      },
    }), numberDisplay));

    // ── spin (radio pair) ──────────────────────────────────────────────
    div.appendChild(this.#label('Spin: ',
      this.#radio(`spin-${index}`, -1, layer.spin === -1,
        () => store.updateLayer(index, { spin: -1 })),
      this.#radio(`spin-${index}`, 1, layer.spin === 1,
        () => store.updateLayer(index, { spin: 1 })),
    ));

    // ── opacity ────────────────────────────────────────────────────────
    div.appendChild(this.#label('Opacity: ', this.#range({
      value: layer.opacity, min: 0, max: 1, step: 0.1,
      onChange: v => store.updateLayer(index, { opacity: parseFloat(v) }),
    })));

    // ── drag-and-drop ──────────────────────────────────────────────────
    div.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', index));
    div.addEventListener('dragover', e => e.preventDefault());
    div.addEventListener('drop', e => {
      const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
      if (from !== index) {
        store.moveLayer(from, index);
        store.recalculateOpacity();
      }
    });

    return div;
  }

  // ── tiny DOM helpers ───────────────────────────────────────────────────

  #label(text, ...children) {
    const label = document.createElement('label');
    label.appendChild(document.createTextNode(text));
    children.forEach(c => label.appendChild(c));
    return label;
  }

  #range({ value, min, max, step, onChange }) {
    const input = document.createElement('input');
    input.type = 'range';
    input.value = value;
    input.min = min;
    input.max = max;
    input.step = step;
    input.addEventListener('change', e => onChange(e.target.value));
    return input;
  }

  #radio(name, value, checked, onChange) {
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = name;
    input.value = value;
    input.checked = checked;
    input.addEventListener('change', onChange);
    return input;
  }
}
