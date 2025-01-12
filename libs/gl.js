import * as twgl from '../node_modules/twgl.js/dist/5.x/twgl-full.module.js';
const mat4 = glMatrix.mat4;

const canvas = document.getElementById('webglCanvas');
export const gl = canvas.getContext('webgl2');
if (!gl) {
  alert('WebGL 2 not available');
}

const text = "ॐ आकाश सत्य ओङ्";

// Vertex shader source
const vertexShaderSource = `#version 300 es
precision highp float;

in vec2 a_position;
in vec2 a_texCoord;
in float a_instanceID;

uniform mat4 u_projectionMatrix;
uniform float u_radius;
uniform float u_length;
uniform float u_speed;
uniform float u_time;
uniform float u_charnum;
uniform float u_spin;
uniform vec2 u_center;
uniform vec2 u_textureSize;
uniform float u_alpha;

out vec2 v_texCoord;
out vec3 v_color;
out float v_alpha;

// Function to generate RGB colors spanning the full spectrum
vec3 generateColor(float index, float total) {
float ratio = index / total;
float one_third = 1.0 / 3.0;
float two_thirds = 2.0 / 3.0;

if (ratio <= one_third) {
// Transition from Red to Green
return vec3(1.0 - ratio * 3.0, ratio * 3.0, 0.0);
} else if (ratio <= two_thirds) {
// Transition from Green to Blue
ratio = (ratio - one_third) * 3.0;
return vec3(0.0, 1.0 - ratio, ratio);
} else {
// Transition from Blue to Red
ratio = (ratio - two_thirds) * 3.0;
return vec3(ratio, 0.0, 1.0 - ratio);
}
}

vec3 hsl2rgb(float h) {
float r = abs(h * 6.0 - 3.0) - 1.0;
float g = 2.0 - abs(h * 6.0 - 2.0);
float b = 2.0 - abs(h * 6.0 - 4.0);
return clamp(vec3(r, g, b), 0.0, 1.0);
}

void main() {
float i = a_instanceID;
float c = u_charnum;

float radiusOffset = u_radius - i;
float u_lengthFactor = 3.14159265359 / u_length / 2.0;
float speedFactor = u_speed * 0.001;
float angleStep = (2.0 * 3.14159265359) / u_length ;
float animationAngle = i * u_lengthFactor + (u_time + i) * speedFactor;
float angle = u_spin * (c * angleStep * u_speed + animationAngle);

vec2 pos = u_center + vec2(radiusOffset * cos(angle),
radiusOffset * sin(angle));

//vec4 position = vec4(a_position, 0.0, 1.0);

//vec4 position = vec4(a_position * u_textureSize, 0.0, 1.0);
// position.xy += pos;
// Calculate the rotation matrix
float rotationAngle = angle - animationAngle + 3.14159265359 / 2.0;
mat2 rotationMatrix = mat2(cos(rotationAngle), -sin(rotationAngle),
sin(rotationAngle),  cos(rotationAngle));

// Apply the rotation to the a_position and
// Scale position according to texture size
vec2 rotatedPosition = rotationMatrix * (a_position * u_textureSize);
vec4 position = vec4(rotatedPosition + pos, 0.0, 1.0);
gl_Position = u_projectionMatrix * position;

v_color = hsl2rgb(mod(i * 18.0, 360.0) / 360.0);
//v_color = generateColor(a_instanceID, 420.0);

//v_color = hsl2rgb(i * 18.0 /360.0, 1.0, 0.5);
//v_color = hsl2rgb(i * 18.0 /360.0);
v_texCoord = a_texCoord;
v_alpha = u_alpha;
}`;

// Fragment shader source
const fragmentShaderSource = `#version 300 es
precision highp float;

in vec2 v_texCoord;
in vec3 v_color;
in float v_alpha;

uniform sampler2D u_texture;


out vec4 outColor;

void main() {
outColor = texture(u_texture, v_texCoord) * vec4(v_color, v_alpha);
//outColor = texture(u_texture, v_texCoord) * vec4(1.0, 1.0, 1.0, 1.0);
// outColor = vec4(1, 1, 1, 1); // For flat white color
//outColor = vec4(v_color, 1.0);
}`;

// Compile shaders and link program
const programInfo = twgl.createProgramInfo(gl, [vertexShaderSource, fragmentShaderSource]);

// Create vertex data
const arrays = {
  a_position: {
    numComponents: 2,
    data: [-0.5,
      -0.5,
      0.5,
      -0.5,
      -0.5,
      0.5,
      0.5,
      0.5]
  },
  a_texCoord: {
    numComponents: 2,
    data: [0,
      0,
      1,
      0,
      0,
      1,
      1,
      1]
  },
  a_instanceID: {
    numComponents: 1,
    data: new Float32Array(420),
    divisor: 1
  }
};

for (let i = 0; i < 420; i++) {
  arrays.a_instanceID.data[i] = i;
}
gl.useProgram(programInfo.program);
// Enable blending for transparency
gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);
const vao = twgl.createVertexArrayInfo(gl, programInfo, bufferInfo);

twgl.setBuffersAndAttributes(gl, programInfo, vao);

// Load and set up textures for each letter
const letters = renderLetters(text, 10);
const textures = letters.map(letterCanvas => {
  return twgl.createTexture(gl, {
    src: letterCanvas,
    min: gl.LINEAR,
    mag: gl.LINEAR,
    wrap: gl.CLAMP_TO_EDGE,
  });
});

// Drawing function
const projectionMatrix = mat4.create();
export function drawMantrasGL(layer) {

  const time = performance.now();
  const center = new Float32Array([gl.canvas.width / 2, gl.canvas.height / 2]);
  const breathe = layer.breathe;
  
  if (breathe) {
    const now = Date.now();
    const minSpeed = 0.9;
    const faseDuration = 3000;
    const pauseDuration = 1000;
    const swingDuration = faseDuration - pauseDuration;
    
    if (!layer.hasOwnProperty('baseSpeed')) {
      layer.baseSpeed = layer.speed;
      layer.spinToggledTime = now;
    }
    var time_elapsed = now - layer.spinToggledTime;
    
    if (time_elapsed >= faseDuration ) {
      layer.spin = layer.spin * -1;
      layer.spinToggledTime = now;
      // time_elapsed = now - layer.spinToggledTime;
    }
    if (time_elapsed >= swingDuration & layer.speed > minSpeed) {
      var speed = layer.speed - ((time_elapsed - swingDuration) / 1000) * layer.baseSpeed;
      if (speed <= minSpeed) {
        layer.speed = minSpeed;
      }
      else {
        layer.speed = speed;
      }
    }
    if (time_elapsed <= pauseDuration & layer.speed != layer.baseSpeed) {
      var speed = minSpeed + layer.speed + ((time_elapsed - pauseDuration) / 1000) * layer.speed;
      if (speed >= layer.baseSpeed) {
        layer.speed = layer.baseSpeed;
      }
      else {
        layer.speed = speed;
      }
    }
  }
  
  const uniforms = {
    u_projectionMatrix: mat4.ortho(projectionMatrix, 0, gl.canvas.width, gl.canvas.height, 0, -1, 1),
    u_radius: Math.min(gl.canvas.width, gl.canvas.height) * 0.4,
    u_length: letters.length,
    u_speed: layer.speed,
    u_time: time,
    u_center: center,
    u_charnum: 0.0,
    u_spin: layer.spin,
    u_alpha: layer.opacity,
    u_textureSize: new Float32Array([0, 0])
  };

  for (let i = 0; i < text.length; i++) {
    uniforms.u_texture = textures[i];
    uniforms.u_charnum = i;
    const letterCanvas = letters[i];
    uniforms.u_textureSize.set([letterCanvas.width, letterCanvas.height]);
    twgl.setUniforms(programInfo, uniforms);
    twgl.drawBufferInfo(gl, vao, gl.TRIANGLE_STRIP, bufferInfo.numElements, 0, layer.number);
  }
}

export function renderLetters(text, size) {
  const letters = [];
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  for (let c = 0; c < text.length; c++) {
    const color = `hsl(0, 0%, 100%)`;
    const sizes = measureTextSizes(text[c], `${size}px Arial`);
    canvas.width = sizes[0];
    canvas.height = sizes[1];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${size}px Arial`;
    ctx.fillStyle = color;
    ctx.fillText(text[c], 0, sizes[1]);

    const letterCanvas = document.createElement('canvas');
    letterCanvas.width = canvas.width;
    letterCanvas.height = canvas.height;
    letterCanvas.getContext('2d').drawImage(canvas, 0, 0);
    letters.push(letterCanvas);
  }

  return letters;
}

export function measureTextSizes(text, font) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  context.font = font;

  const measure = context.measureText(text);
  // whitespace characters with zero height
  var height = 1.0;
  if ((measure.actualBoundingBoxAscent + measure.actualBoundingBoxDescent) != 0) {
    height = measure.actualBoundingBoxAscent + measure.actualBoundingBoxDescent;
  }

  return [measure.width,
    height
  ];
}

export function render() {
  const layer = {
    speed: 1.0,
    spin: 1.0
  };
  drawMantrasGL(layer);
  requestAnimationFrame(render);
}

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