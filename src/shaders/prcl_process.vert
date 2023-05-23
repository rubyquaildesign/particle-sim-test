/* Main function, uniforms & utils */
precision mediump float;

attribute float aIndex;

uniform sampler2D uPhysTex;
uniform float uParticleRadius;

varying vec2 vUV;

#define PI_TWO 1.570796326794897
#define PI 3.141592653589793
#define TWO_PI 6.283185307179586

void main(){
  float xPosition=(.5+mod(aIndex,uParticleRadius))/uParticleRadius;
  float yPosition=(.5+floor(aIndex/uParticleRadius))/uParticleRadius;
  vec2 screenPos=vec2(-1.+(xPosition*2.),1.-(yPosition*2.));
  gl_Position=vec4(screenPos,0.,1.);
  gl_PointSize=1.;
  vUV=vec2(xPosition,yPosition);
}