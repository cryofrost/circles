/**
 * Pure breathing animation state machine.
 *
 * Cycle (3 000 ms total):
 *   0 – 1 000 ms  → accelerate from MIN_SPEED to baseSpeed
 *   1 000 – 2 000 ms  → hold at baseSpeed
 *   2 000 – 3 000 ms  → decelerate from baseSpeed to MIN_SPEED
 *   at 3 000 ms       → flip spin direction, restart
 *
 * Nothing is mutated. Pass the returned `nextState` back on the next call.
 */

const MIN_SPEED = 0.9;
const CYCLE_MS = 3000;
const ACCEL_END_MS = 1000;
const DECEL_START_MS = 2000;

/**
 * @param {{ spin: number, spinToggledTime: number }} state
 * @param {number} baseSpeed  - the user-configured speed for this layer
 * @param {number} now        - Date.now()
 * @returns {{ speed: number, spin: number, nextState: object }}
 */
export function updateBreathe(state, baseSpeed, now) {
  let { spin, spinToggledTime } = state;
  const elapsed = now - spinToggledTime;

  if (elapsed >= CYCLE_MS) {
    const newSpin = spin * -1;
    return {
      speed: baseSpeed,
      spin: newSpin,
      nextState: { spin: newSpin, spinToggledTime: now },
    };
  }

  let speed;
  if (elapsed <= ACCEL_END_MS) {
    const t = elapsed / ACCEL_END_MS;
    speed = MIN_SPEED + t * (baseSpeed - MIN_SPEED);
  } else if (elapsed >= DECEL_START_MS) {
    const t = (elapsed - DECEL_START_MS) / (CYCLE_MS - DECEL_START_MS);
    speed = baseSpeed - t * (baseSpeed - MIN_SPEED);
    speed = Math.max(speed, MIN_SPEED);
  } else {
    speed = baseSpeed;
  }

  return { speed, spin, nextState: { spin, spinToggledTime } };
}

/**
 * Creates the initial breathe state for a layer.
 */
export function createBreatheState(spin) {
  return { spin, spinToggledTime: Date.now() };
}
