/**
 * Wires up the global controls (breathe, frequency range, frequency input,
 * add/save/load layer buttons, panel toggle, and the guided visual protocol.
 */
export class GlobalControls {
  #store;
  #protocol;

  constructor(store, protocol) {
    this.#store = store;
    this.#protocol = protocol;
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

    // ── guided protocol ───────────────────────────────────────────────
    const protocolButton = document.getElementById('protocolButton');
    const protocolReset = document.getElementById('protocolReset');
    const protocolStatus = document.getElementById('protocolStatus');
    const stageOverlay = document.getElementById('stageOverlay');
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const formatCountdown = seconds => {
      const minutes = Math.floor(seconds / 60);
      const remainder = seconds % 60;
      return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
    };
    const updateStageOverlay = () => {
      stageOverlay.textContent = `${this.#protocol.stage.name} · ${formatCountdown(this.#protocol.remainingSeconds)}`;
      requestAnimationFrame(updateStageOverlay);
    };
    const updateProtocolUI = () => {
      const stage = this.#protocol.stage;
      protocolButton.textContent = this.#protocol.running ? 'Pause protocol' : 'Start protocol';
      protocolStatus.textContent = reducedMotion
        ? 'Protocol paused: reduced motion is enabled.'
        : `${stage.name}: ${stage.frequency} Hz · ${stage.duration} min`;
      stageOverlay.classList.toggle('active', this.#protocol.running);
    };
    protocolButton.addEventListener('click', () => {
      if (this.#protocol.running) this.#protocol.pause();
      else this.#protocol.start();
      updateProtocolUI();
    });
    protocolReset.addEventListener('click', () => {
      this.#protocol.reset();
      updateProtocolUI();
    });
    this.#protocol.addEventListener('change', () => {
      updateProtocolUI();
      store.setSpeedsFromFrequency(this.#protocol.stage.frequency);
    });
    if (reducedMotion) {
      protocolButton.disabled = true;
    }
    updateProtocolUI();
    updateStageOverlay();

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
