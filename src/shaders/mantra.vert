#version 300 es
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
  float angleStep = (2.0 * 3.14159265359) / u_length;
  float animationAngle = i * u_lengthFactor + (u_time + i) * speedFactor;
  float angle = u_spin * (c * angleStep * u_speed + animationAngle);

  vec2 pos = u_center + vec2(
    radiusOffset * cos(angle),
    radiusOffset * sin(angle)
  );

  float rotationAngle = angle - animationAngle + 3.14159265359 / 2.0;
  mat2 rotationMatrix = mat2(
     cos(rotationAngle), -sin(rotationAngle),
     sin(rotationAngle),  cos(rotationAngle)
  );

  vec2 rotatedPosition = rotationMatrix * (a_position * u_textureSize);
  gl_Position = u_projectionMatrix * vec4(rotatedPosition + pos, 0.0, 1.0);

  v_color = hsl2rgb(mod(i * 18.0 * ((u_time + i) * speedFactor), 360.0) / 360.0);
  v_texCoord = a_texCoord;
  v_alpha = u_alpha;
}
