/**
 * Wires up the global controls (breathe, frequency range, frequency input,
 * add/save/load layer buttons, panel toggle) to LayerStore actions.
 */
export class GlobalControls {
  #store;

  constructor(store) {
    this.#store = store;
    this.#init();
  }

  #init() {
    const store = this.#store;

    // ── frequency controls ─────────────────────────────────────────────
    const rangeSelect = document.getElementById('rangeSelect');
    const freqInput = document.getElementById('frequencyInput');

    const applyRange = () => {
      const [min, max] = rangeSelect.value.split('-').map(parseFloat);
      freqInput.min = min;
      freqInput.max = max;
      freqInput.value = min;
      store.setSpeedsFromFrequency(min);
    };

    rangeSelect.addEventListener('change', applyRange);
    freqInput.addEventListener('input', e =>
      store.setSpeedsFromFrequency(parseFloat(e.target.value))
    );
    applyRange();

    // ── breathe ────────────────────────────────────────────────────────
    document.getElementById('breatheCheckbox').addEventListener('change', e =>
      store.setAllBreathe(e.target.checked)
    );

    // ── add layer ──────────────────────────────────────────────────────
    document.getElementById('addLayerButton').addEventListener('click', () =>
      store.addLayer()
    );

    // ── save / load layout ─────────────────────────────────────────────
    document.getElementById('saveLayoutButton').addEventListener('click', () => {
      const json = JSON.stringify(store.toJSON(), null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'layout.json';
      a.click();
    });

    const loadInput = document.getElementById('loadLayoutInput');
    document.getElementById('loadLayoutButton').addEventListener('click', () =>
      loadInput.click()
    );
    loadInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          store.setLayers(JSON.parse(ev.target.result));
        } catch (err) {
          console.error('Failed to parse layout file:', err);
        }
      };
      reader.readAsText(file);
    });

    // ── panel visibility toggles ───────────────────────────────────────
    document.getElementById('toggleControlPanelButton').addEventListener('click', () => {
      const panel = document.getElementById('controlPanel');
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });

    document.getElementById('toggleButton').addEventListener('click', () => {
      const layers = document.getElementById('layers');
      layers.style.display = layers.style.display === 'none' ? 'block' : 'none';
    });
  }
}
