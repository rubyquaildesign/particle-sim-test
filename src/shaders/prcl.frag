/* Main function, uniforms & utils */
precision mediump float;

uniform sampler2D uColorTex;
uniform float uParticleRadius;

varying vec2 vPos;

#define PI_TWO 1.570796326794897
#define PI 3.141592653589793
#define TWO_PI 6.283185307179586

void main(){
  vec3 pointColor=texture2D(uColorTex,vPos).rgb;
  float fragDist=distance(vec2(.5,.5),gl_PointCoord);
  
  float alpha=mix(1.,0.,fragDist*2.);
  if(alpha<.1){
    discard;
  }
  gl_FragColor=vec4(vec3(.8)+vec3(.5)*vec3(.2),1.);
  
}