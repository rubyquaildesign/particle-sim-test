/* Main function, uniforms & utils */
precision mediump float;

attribute vec2 aPos;

uniform sampler2D uPhysTex;
uniform float uParticleRadius;

varying vec2 vUV;

#define PI_TWO 1.570796326794897
#define PI 3.141592653589793
#define TWO_PI 6.283185307179586

void main(){
  gl_Position=vec4(aPos,0.,1.);
  float vUVx=(1.+aPos.x)/2.;
  float vUVy=1.-((1.+aPos.y)/2.);
  vUV=vec2(vUVx,vUVy);
}