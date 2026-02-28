import * as twgl from 'twgl.js';
import { mat4 } from 'gl-matrix';

import vertexShaderSrc from '../shaders/mantra.vert?raw';
import fragmentShaderSrc from '../shaders/mantra.frag?raw';
import { renderLetters } from '../utils/textAtlas.js';
import { updateBreathe, createBreatheState } from '../utils/breathe.js';
import { MANTRA_TEXT, MAX_INSTANCES, FONT_SIZE } from '../config.js';

/**
 * WebGL 2 renderer for the mantra spiral effect.
 *
 * Lifecycle:
 *   const r = new GLMantrasRenderer(canvas);
 *   // each frame:
 *   r.beginFrame();
 *   for (const layer of mantrasGLLayers) r.renderLayer(layer, time);
 */
export class GLMantrasRenderer {
  #gl;
  #programInfo;
  #vao;
  #bufferInfo;
  #textures;
  #letterMetas; // [{ width, height }] — one entry per character
  #projectionMatrix = mat4.create();
  // Map<layerId, BreatheState> — private animation runtime state
  #breatheStates = new Map();

  constructor(canvas) {
    const gl = canvas.getContext('webgl2');
    if (!gl) throw new Error('WebGL 2 not supported by this browser.');
    this.#gl = gl;

    // ── shader program ─────────────────────────────────────────────────
    this.#programInfo = twgl.createProgramInfo(gl, [
      vertexShaderSrc,
      fragmentShaderSrc,
    ]);

    // ── geometry: a unit quad + per-instance IDs ───────────────────────
    const instanceIDs = new Float32Array(MAX_INSTANCES);
    for (let i = 0; i < MAX_INSTANCES; i++) instanceIDs[i] = i;

    const arrays = {
      a_position: {
        numComponents: 2,
        data: [-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5],
      },
      a_texCoord: {
        numComponents: 2,
        data: [0, 0, 1, 0, 0, 1, 1, 1],
      },
      a_instanceID: {
        numComponents: 1,
        data: instanceIDs,
        divisor: 1,
      },
    };

    gl.useProgram(this.#programInfo.program);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    this.#bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);
    this.#vao = twgl.createVertexArrayInfo(gl, this.#programInfo, this.#bufferInfo);
    twgl.setBuffersAndAttributes(gl, this.#programInfo, this.#vao);

    // ── character textures ─────────────────────────────────────────────
    const letters = renderLetters(MANTRA_TEXT, FONT_SIZE);
    this.#letterMetas = letters.map(c => ({ width: c.width, height: c.height }));
    this.#textures = letters.map(letterCanvas =>
      twgl.createTexture(gl, {
        src: letterCanvas,
        min: gl.LINEAR,
        mag: gl.LINEAR,
        wrap: gl.CLAMP_TO_EDGE,
      })
    );
  }

  /** Expose the raw context so the app loop can resize/clear the canvas. */
  get gl() {
    return this.#gl;
  }

  /**
   * Call once at the start of each animation frame before any renderLayer().
   * Handles canvas resize, viewport, and clear.
   */
  beginFrame() {
    const gl = this.#gl;
    twgl.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  /**
   * Render one layer. May be called multiple times per frame (one per
   * mantrasGL layer); all results blend onto the same canvas.
   *
   * @param {{ id, speed, spin, opacity, number, breathe }} layer
   * @param {number} time - performance.now()
   */
  renderLayer(layer, time) {
    const gl = this.#gl;

    // ── breathe animation ──────────────────────────────────────────────
    let { speed, spin } = layer;

    if (layer.breathe) {
      if (!this.#breatheStates.has(layer.id)) {
        this.#breatheStates.set(layer.id, createBreatheState(spin));
      }
      const result = updateBreathe(
        this.#breatheStates.get(layer.id),
        layer.speed,
        Date.now()
      );
      speed = result.speed;
      spin = result.spin;
      this.#breatheStates.set(layer.id, result.nextState);
    } else {
      this.#breatheStates.delete(layer.id);
    }

    // ── uniforms ───────────────────────────────────────────────────────
    const center = new Float32Array([gl.canvas.width / 2, gl.canvas.height / 2]);
    mat4.ortho(
      this.#projectionMatrix,
      0, gl.canvas.width,
      gl.canvas.height, 0,
      -1, 1
    );

    const uniforms = {
      u_projectionMatrix: this.#projectionMatrix,
      u_radius: Math.min(gl.canvas.width, gl.canvas.height) * 0.4,
      u_length: MANTRA_TEXT.length,
      u_speed: speed,
      u_time: time,
      u_center: center,
      u_charnum: 0,
      u_spin: spin,
      u_alpha: layer.opacity,
      u_textureSize: new Float32Array(2),
    };

    // ── draw each character ────────────────────────────────────────────
    for (let i = 0; i < MANTRA_TEXT.length; i++) {
      const meta = this.#letterMetas[i];
      uniforms.u_texture = this.#textures[i];
      uniforms.u_charnum = i;
      uniforms.u_textureSize.set([meta.width, meta.height]);
      twgl.setUniforms(this.#programInfo, uniforms);
      twgl.drawBufferInfo(
        gl,
        this.#vao,
        gl.TRIANGLE_STRIP,
        this.#bufferInfo.numElements,
        0,
        layer.number
      );
    }
  }
}
