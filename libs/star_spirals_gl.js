
import * as twgl from '../node_modules/twgl.js/dist/5.x/twgl-full.module.js';

const mat4 = glMatrix.mat4;
const canvas = document.getElementById('webglCanvas');
export const gl = canvas.getContext('webgl2');
if (!gl) {
  alert('WebGL 2 not available');
}

const text = "ॐ आकाश सत्य ओङ्";

const vertexShaderSource = `#version 300 es
precision highp float;

in vec2 a_position;
in vec2 a_texCoord;
in float a_instanceID;

uniform mat4 u_projectionMatrix;
uniform float u_radius;
uniform float u_lengthFactor;
uniform float u_speedFactor;
uniform float u_time;
uniform vec2 u_center;

out vec2 v_texCoord;
out vec3 v_color;

void main() {
float i = floor(a_instanceID / u_lengthFactor);
float c = mod(a_instanceID, u_lengthFactor);

float radiusOffset = u_radius - i;
float angleStep = 2.0 * 3.14159265359 / u_lengthFactor;
float animationAngle = i * u_lengthFactor + (u_time  + i) * u_speedFactor;

// Calculate the position for each character in the spiral
float angle = c * angleStep * u_speedFactor / 0.001;
vec2 pos = u_center + vec2(radiusOffset * cos(angle + animationAngle),
radiusOffset * sin(angle + animationAngle));

// Transform the position to clip space
vec4 position = vec4(a_position, 0.0, 1.0);
position.xy += pos;
gl_Position = u_projectionMatrix * position; 

// Set color based on instance ID
v_color = vec3(mod(i * 18.0, 360.0) / 360.0, 1.0, 0.5);

// Pass texture coordinates
v_texCoord = a_texCoord;
}`;

const fragmentShaderSource = `#version 300 es
precision highp float;

in vec2 v_texCoord;
in vec3 v_color;

uniform sampler2D u_texture;

out vec4 outColor;

void main() {
//outColor = texture(u_texture, v_texCoord) * vec4(v_color, 1.0);
outColor = vec4(1, 1, 1, 1);

}`;

const shaderProgram = createShaderProgram(gl, vertexShaderSource, fragmentShaderSource);
gl.useProgram(shaderProgram);

const positionLocation = gl.getAttribLocation(shaderProgram, 'a_position');
const texCoordLocation = gl.getAttribLocation(shaderProgram, 'a_texCoord');
const instanceIDLocation = gl.getAttribLocation(shaderProgram, 'a_instanceID');

const projectionMatrixLocation = gl.getUniformLocation(shaderProgram, 'u_projectionMatrix');
const radiusLocation = gl.getUniformLocation(shaderProgram, 'u_radius');
const lengthFactorLocation = gl.getUniformLocation(shaderProgram, 'u_lengthFactor');
const speedFactorLocation = gl.getUniformLocation(shaderProgram, 'u_speedFactor');
const timeLocation = gl.getUniformLocation(shaderProgram, 'u_time');
const textureLocation = gl.getUniformLocation(shaderProgram, 'u_texture');
const centerLocation = gl.getUniformLocation(shaderProgram, 'u_center');

// Create buffers for vertex positions and texture coordinates
const vertexData = new Float32Array([
  // positions     // tex coords
  -0.5, -0.5, 0.0, 0.0,
  0.5, -0.5, 1.0, 0.0,
  -0.5, 0.5, 0.0, 1.0,
  0.5, 0.5, 1.0, 1.0,
]);

const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

const vao = gl.createVertexArray();
gl.bindVertexArray(vao);

gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 16, 0);

gl.enableVertexAttribArray(texCoordLocation);
gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 16, 8);

const instanceBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
const instanceData = new Float32Array(420);
for (let i = 0; i < 420; i++) {
  instanceData[i] = i;
}
gl.bufferData(gl.ARRAY_BUFFER, instanceData, gl.STATIC_DRAW);

gl.enableVertexAttribArray(instanceIDLocation);
gl.vertexAttribPointer(instanceIDLocation, 1, gl.FLOAT, false, 0, 0);
gl.vertexAttribDivisor(instanceIDLocation, 1);

// Load and set up textures for each letter
const letters = renderLetters(text, 148);
// for (let i = 0; i < text.length; i++) {
//   const canvas = document.createElement('canvas');
  
//   const ctx = canvas.getContext('2d');
//   ctx.font = '18px Arial';
//   ctx.fillText(text[i], 0, 18);
//   letters.push(canvas);
// }

const textures = [];
for (let i = 0; i < letters.length; i++) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, letters[i]);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  textures.push(texture);
}

export function drawMantrasGL(layer) {
  

  twgl.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  const time = performance.now();
  const center = [gl.canvas.width / 2, gl.canvas.height / 2]

  const projectionMatrix = mat4.create();
  mat4.ortho(projectionMatrix, 0, gl.canvas.width, gl.canvas.height, 0, -1, 1);

  gl.uniformMatrix4fv(projectionMatrixLocation, false, projectionMatrix);
  gl.uniform1f(radiusLocation, Math.min(gl.canvas.width, gl.canvas.height) * 0.4);
  gl.uniform1f(lengthFactorLocation, Math.PI / letters.length / 2.0);
  gl.uniform1f(speedFactorLocation, 0.001 * layer.speed);
  gl.uniform1f(timeLocation, time);
  gl.uniform2fv(centerLocation, new Float32Array(center));

  for (let i = 0; i < text.length; i++) {
    gl.bindTexture(gl.TEXTURE_2D, textures[i]);
    gl.uniform1i(textureLocation, 0);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, 420);
  }
}

export function measureTextSizes(text, font) {
  const retarr = []
  var canvas = document.createElement("canvas");
  var context = canvas.getContext("2d");
  context.font = font;

  const measure = context.measureText(text);
  retarr.push(measure.width);
  retarr.push(measure.emHeightAscent + measure.emHeightDescent);
  return retarr;
}

export function renderLetters(text, size) {
  const textLength = text.length;
  const letters = [];

  for (let c = 0; c < textLength; c++) {
    const canvas = document.createElement('canvas');
    //const color = `hsl(${c * 18}, 100%, 50%)`;
    const color = `hsl(18, 100%, 50%)`;
    const ctx = canvas.getContext('2d');
    const sizes = measureTextSizes(text[c], `${size}px Verdana`);
    ctx.canvas.width = sizes[0];
    ctx.canvas.height = sizes[1];
    const x = sizes[0] / 2;
    const y = sizes[1];
    ctx.font = `${size}px Verdana`;

    ctx.fillStyle = color;
    ctx.fillText(text[c], 0, y);
    letters.push(canvas);
  }
 // previewCanvases(letters);
  return letters;
}

// Function to append canvases to the container for preview
function previewCanvases(canvases) {
    const container = document.getElementById('preview');

    canvases.forEach((cvs, index) => {
        const canvasWrapper = document.createElement('div');
        canvasWrapper.className = 'canvas-item';
        
        // Clone the canvas to avoid moving it from its original context
        const canvasClone = document.createElement('canvas');
        canvasClone.width = cvs.width;
        canvasClone.height = cvs.height;
        const ctx = canvasClone.getContext('2d');
        ctx.drawImage(cvs, 0, 0);

        canvasWrapper.appendChild(canvasClone);
        container.appendChild(canvasWrapper);
    });
}

export function checkGLError(gl) {
    const error = gl.getError();
    if (error !== gl.NO_ERROR) {
      console.error('WebGL error', error);
    }
  }


export function render() {
  const layer = {
    speed: 1.0,
    spin: 1.0
  };
  const time = performance.now();
  drawMantrasGL(layer, time);
  requestAnimationFrame(render);
}

// requestAnimationFrame(render);

export function createShaderProgram(gl, vertexSource, fragmentSource) {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Could not link shaders', gl.getProgramInfoLog(program));
    return null;
  }

  return program;
}

export function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Could not compile shader', gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}