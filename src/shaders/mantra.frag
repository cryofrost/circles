#version 300 es
precision highp float;

in vec2 v_texCoord;
in vec3 v_color;
in float v_alpha;

uniform sampler2D u_texture;

out vec4 outColor;

void main() {
  outColor = texture(u_texture, v_texCoord) * vec4(v_color, v_alpha);
}
