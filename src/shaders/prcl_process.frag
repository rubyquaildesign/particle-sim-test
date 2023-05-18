/* Main function, uniforms & utils */

precision mediump float;

uniform sampler2D uPhysTex;
uniform float uParticleRadius;

varying vec2 vUV;

#define PI_TWO 1.570796326794897
#define PI 3.141592653589793
#define TWO_PI 6.283185307179586

void main(){
  float x=gl_FragCoord.x/uParticleRadius;
  float y=(uParticleRadius-gl_FragCoord.y)/uParticleRadius;
  vec4 pastData=texture2D(uPhysTex,vec2(x,y));
  vec2 pos=pastData.xy;
  vec2 vel=pastData.zw;
  vec2 newPos=pos+(vel/2000.);;
  float dist=distance(newPos,vec2(.5,.5));
  vec2 v=vec2(.5,.5)-newPos;
  float force=min(1./pow(dist,2.)/100000000.,.0005);
  vec2 normV=normalize(v)*force;
  gl_FragColor=vec4(newPos,pastData.zw+normV);
}