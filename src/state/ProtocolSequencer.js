export const PROTOCOL_STAGES = [
  { id: 'alpha', name: 'Preparation', range: [7.5, 14], duration: 1 },
  { id: 'theta', name: 'Suggestion', range: [4, 7.5], duration: 2 },
  { id: 'gamma', name: 'Insight', range: [40, 42], duration: 0.5 },
];

const DEFAULT_TRIAL_SECONDS = 10;
const RESPONSE_THRESHOLD = 0.08;

/** Runs frequency trials and advances only when the current phase is complete. */
export class ProtocolSequencer extends EventTarget {
  #stageIndex = 0;
  #elapsed = 0;
  #trialElapsed = 0;
  #running = false;
  #lastTime = null;
  #frequencySink;
  #biofeedback;
  #journal;
  #trialSeconds;
  #threshold;
  #frequencies = [];
  #frequencyIndex = 0;
  #currentFrequency = 0;
  #baseline = [];
  #responseFound = false;
  #phaseExhausted = false;
  #samplePending = false;
  #phaseKey = '';

  constructor({ applyFrequency = () => {}, biofeedback = null, journal = null, trialSeconds = DEFAULT_TRIAL_SECONDS, responseThreshold = RESPONSE_THRESHOLD } = {}) {
    super();
    this.#frequencySink = applyFrequency;
    this.#biofeedback = biofeedback;
    this.#journal = journal;
    this.#trialSeconds = trialSeconds;
    this.#threshold = responseThreshold;
    this.#preparePhase();
  }

  get running() { return this.#running; }
  get stage() { return PROTOCOL_STAGES[this.#stageIndex]; }
  get stageIndex() { return this.#stageIndex; }
  get elapsed() { return this.#elapsed; }
  get currentFrequency() { return this.#currentFrequency; }
  get responseFound() { return this.#responseFound; }
  get remainingSeconds() { return Math.max(0, Math.ceil(this.stage.duration * 60 - this.#elapsed)); }

  async start(now = performance.now()) {
    const cameraStart = this.#biofeedback?.start();
    if (cameraStart && typeof cameraStart.then === 'function') cameraStart.then(available => {
      if (available === false) this.dispatchEvent(new CustomEvent('cameraerror'));
    }).catch(error => {
      console.warn('Camera biofeedback unavailable:', error);
      this.dispatchEvent(new CustomEvent('cameraerror', { detail: error.message }));
    });
    await this.#journal?.ready;
    this.#preparePhase();
    if (!this.#skipKnownFailures()) {
      this.#running = false;
      this.#biofeedback?.stop();
      this.dispatchEvent(new Event('exhausted'));
      return;
    }
    this.#running = true;
    this.#lastTime = now;
    this.#emit();
  }

  pause() {
    this.#running = false;
    this.#lastTime = null;
    this.#biofeedback?.stop();
    this.#emit();
  }

  reset() {
    this.#stageIndex = 0;
    this.#elapsed = 0;
    this.#lastTime = null;
    this.#running = false;
    this.#biofeedback?.stop();
    this.#preparePhase();
    this.#emit();
  }

  tick(now) {
    if (!this.#running) return;
    if (this.#lastTime === null) this.#lastTime = now;
    const delta = Math.max(0, now - this.#lastTime) / 1000;
    this.#elapsed += delta;
    this.#trialElapsed += delta;
    this.#lastTime = now;
    this.#readBiofeedback(now);
    while (this.#elapsed >= this.stage.duration * 60) {
      this.#finishPhase();
      this.#elapsed -= this.stage.duration * 60;
      this.#stageIndex = (this.#stageIndex + 1) % PROTOCOL_STAGES.length;
      this.#preparePhase();
      this.#emit();
    }
  }

  modulation(now) {
    const pulse = 0.5 + 0.5 * Math.sin(2 * Math.PI * this.#currentFrequency * now / 1000);
    return 0.82 + pulse * 0.18;
  }

  #readBiofeedback(now) {
    if (!this.#biofeedback || this.#responseFound || this.#phaseExhausted || this.#samplePending) return;
    this.#samplePending = true;
    Promise.resolve(this.#biofeedback.sample(now)).then(value => {
      this.#samplePending = false;
      if (!this.#running || value === null || value === undefined) return;
      this.#baseline.push(value);
      if (this.#baseline.length > 12) this.#baseline.shift();
      if (this.#trialElapsed < this.#trialSeconds || this.#baseline.length < 4) return;
      const half = Math.floor(this.#baseline.length / 2);
      const average = values => values.reduce((sum, item) => sum + item, 0) / values.length;
      const delta = Math.abs(average(this.#baseline.slice(-half)) - average(this.#baseline.slice(0, half)));
      if (delta >= this.#threshold) {
        this.#responseFound = true;
        this.#journal?.recordSuccess(this.#entry({ result: 'response', delta }));
      } else {
        this.#journal?.recordFailure(this.#entry({ result: 'no-response', delta }));
        this.#nextFrequency();
      }
      this.#emit();
    }).catch(() => { this.#samplePending = false; });
  }

  #nextFrequency() {
    this.#frequencyIndex += 1;
    this.#trialElapsed = 0;
    this.#baseline = [];
    if (this.#frequencyIndex >= this.#frequencies.length) {
      this.#phaseExhausted = true;
      this.#finishPhase();
      return;
    }
    this.#setFrequency(this.#frequencies[this.#frequencyIndex]);
  }

  #finishPhase() {
    // A phase ending by duration does not mean its whole frequency range failed.
    // Unsuccessful frequencies are already recorded individually.
  }

  #preparePhase() {
    const [minimum, maximum] = this.stage.range;
    const min = Math.min(minimum, maximum);
    const max = Math.max(minimum, maximum);
    this.#phaseKey = `${this.stage.id}:${min}-${max}`;
    this.#frequencies = [];
    for (let frequency = min; frequency <= max + 0.0001; frequency += 0.1) {
      const candidate = Number(frequency.toFixed(2));
      if (!this.#journal?.hasFailed(this.#phaseKey, candidate)) this.#frequencies.push(candidate);
    }
    this.#frequencyIndex = 0;
    this.#elapsed = 0;
    this.#trialElapsed = 0;
    this.#baseline = [];
    this.#responseFound = false;
    this.#phaseExhausted = this.#frequencies.length === 0;
    if (!this.#phaseExhausted) this.#setFrequency(this.#frequencies[0]);
  }

  #skipKnownFailures() {
    let guard = 0;
    while (this.#frequencies.length === 0 && guard < PROTOCOL_STAGES.length) {
      this.#stageIndex = (this.#stageIndex + 1) % PROTOCOL_STAGES.length;
      this.#preparePhase();
      guard += 1;
    }
    return this.#frequencies.length > 0;
  }

  #setFrequency(frequency) {
    this.#currentFrequency = frequency;
    this.#frequencySink(frequency);
  }

  #entry(extra) {
    return { sequenceKey: this.#phaseKey, stage: this.stage.id, frequency: this.#currentFrequency, range: [...this.stage.range], ...extra };
  }

  #emit() { this.dispatchEvent(new Event('change')); }
}
