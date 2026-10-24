/**
 * Pure breathing animation state machine.
 *
 * Every 3 000 ms the direction of the animated component flips. The
 * configured speed is never changed by Breathe.
 *
 * Nothing is mutated. Pass the returned `nextState` back on the next call.
 */

const CYCLE_MS = 3000;

/**
 * @param {{ spin: number, spinToggledTime: number, lastTime: number, phase: number }} state
 * @param {number} baseSpeed  - the user-configured speed for this layer
 * @param {number} now        - Date.now()
 * @returns {{ speed: number, spin: number, nextState: object }}
 */
export function updateBreathe(state, baseSpeed, now) {
  const { spin, spinToggledTime } = state;
  const delta = Math.max(0, now - state.lastTime);
  const phase = state.phase + spin * delta * 0.001 * baseSpeed;
  const elapsed = now - spinToggledTime;
  const cycles = Math.floor(Math.max(0, elapsed) / CYCLE_MS);

  if (cycles === 0) {
    return {
      speed: baseSpeed,
      spin,
      phase,
      nextState: { ...state, phase, lastTime: now },
    };
  }

  const newSpin = cycles % 2 === 0 ? spin : spin * -1;
  return {
    speed: baseSpeed,
    spin: newSpin,
    phase,
    nextState: {
      spin: newSpin,
      phase,
      lastTime: now,
      spinToggledTime: spinToggledTime + cycles * CYCLE_MS,
    },
  };
}

/**
 * Creates the initial breathe state for a layer.
 */
export function createBreatheState(spin, now = performance.now()) {
  return { spin, spinToggledTime: now, lastTime: now, phase: 0 };
}
