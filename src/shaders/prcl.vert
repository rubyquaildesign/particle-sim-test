/* Main function, uniforms & utils */
precision mediump float;
#pragma glslify: snoise = require(glsl-noise/simplex/2d) 

attribute float aIndex;

uniform sampler2D uColorTex;
uniform sampler2D uPhysTex;
uniform float uParticleRadius;
uniform mat4 uCamMat;
varying vec2 vPos;
varying float dist;
varying float hei;
#define PI_TWO 1.570796326794897
#define PI 3.141592653589793
#define TWO_PI 6.283185307179586

vec2 transformCoord(vec2 source) {
    float x = (2. * source.x) - 1.;
    float interY = 1. - source.y;
    float y = (2. * source.y) - 1.;
    return vec2(x, y);
}

void main() {
    float x = mod(aIndex, uParticleRadius) / uParticleRadius;
    float y = floor(aIndex / uParticleRadius) / uParticleRadius;
    vec4 particlePhysData = texture2D(uPhysTex, vec2(x, y));
    vPos = vec2(x, y);
    vec2 form = clamp(particlePhysData.xy, vec2(-1.), vec2(1.));
    float z = snoise(vec2(x * 12., y * 12.) * 12.);
    gl_PointSize = 32.;
    vec4 pos = vec4(transformCoord(form), 0.1 - .2 * z, 1.) * uCamMat;
    dist = pos.z;
    hei = z;
    gl_Position = pos;
}