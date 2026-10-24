export const PROTOCOL_STAGES = [
  { id: 'alpha', name: 'Preparation', frequency: 10, duration: 1 },
  { id: 'theta', name: 'Suggestion', frequency: 6, duration: 2 },
  { id: 'gamma', name: 'Insight', frequency: 40, duration: 0.5 },
];

/**
 * Runs the visual protocol without mutating layer state on every frame.
 * Durations are deliberately expressed in minutes so a session can be used
 * hands-free while remaining easy to understand in the controls.
 */
export class ProtocolSequencer extends EventTarget {
  #stageIndex = 0;
  #elapsed = 0;
  #running = false;
  #lastTime = null;

  get running() {
    return this.#running;
  }

  get stage() {
    return PROTOCOL_STAGES[this.#stageIndex];
  }

  get stageIndex() {
    return this.#stageIndex;
  }

  get elapsed() {
    return this.#elapsed;
  }

  get remainingSeconds() {
    return Math.max(0, Math.ceil(this.stage.duration * 60 - this.#elapsed));
  }

  start(now = performance.now()) {
    this.#running = true;
    this.#lastTime = now;
    this.#emit();
  }

  pause() {
    this.#running = false;
    this.#lastTime = null;
    this.#emit();
  }

  reset() {
    this.#stageIndex = 0;
    this.#elapsed = 0;
    this.#lastTime = null;
    this.#running = false;
    this.#emit();
  }

  tick(now) {
    if (!this.#running) return;
    if (this.#lastTime === null) this.#lastTime = now;
    this.#elapsed += Math.max(0, now - this.#lastTime) / 1000;
    this.#lastTime = now;

    while (this.#elapsed >= this.stage.duration * 60) {
      this.#elapsed -= this.stage.duration * 60;
      this.#stageIndex = (this.#stageIndex + 1) % PROTOCOL_STAGES.length;
      this.#emit();
    }
  }

  /** A gentle envelope avoids abrupt brightness jumps at stage boundaries. */
  modulation(now) {
    const seconds = now / 1000;
    const pulse = 0.5 + 0.5 * Math.sin(2 * Math.PI * this.stage.frequency * seconds);
    return 0.82 + pulse * 0.18;
  }

  #emit() {
    this.dispatchEvent(new Event('change'));
  }
}
