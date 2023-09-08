import * as THREE from 'three';
import {
  EffectComposer,
  Pass,
} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ConvolutionShader } from 'three/examples/jsm/shaders/ConvolutionShader.js';
import {
  BloomPass,
  bloomPass,
} from 'three/examples/jsm/postprocessing/BloomPass.js';
import { BlurPass, ShrinkBlur } from './gauss';
const vec3: (
  ...args: ConstructorParameters<typeof THREE.Vector3>
) => THREE.Vector3 = (...args) => new THREE.Vector3(...args);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
camera.position.set(200, 70, 0);
camera.up.set(0, 1, 0);
camera.lookAt(0, 0, 0);
const renderer = new THREE.WebGLRenderer({
  alpha: true,
  premultipliedAlpha: false,
});
renderer.setSize(window.innerWidth, window.innerHeight);
const target = new THREE.WebGLRenderTarget(
  window.innerWidth,
  window.innerHeight,
  { type: THREE.FloatType, format: THREE.RGBAFormat },
);
renderer.setClearColor(new THREE.Color(0x00000000), 0);
renderer.clear();
renderer.setRenderTarget(target);
renderer.setClearColor(new THREE.Color(0x00000000), 0);
renderer.clear();
renderer.setRenderTarget(null);
const PostProcess = new EffectComposer(renderer, target);
document.querySelector('#app')!.appendChild(renderer.domElement);
const buffer = new THREE.BufferGeometry();
const innerRing = 60;
const outerRing = 100;
const shaderMaterial = new THREE.RawShaderMaterial({
  blending: THREE.NormalBlending,
  depthTest: false,
  transparent: true,
  vertexShader: `
  precision mediump float;
	precision mediump int;

	uniform mat4 modelViewMatrix; // optional
	uniform mat4 projectionMatrix; // optional
  
  attribute vec3 position;
  attribute float brightness;
  varying vec3 vColor;
  void main() {
    vColor = vec3(0.5+ 2.*brightness);
    vec4 mvPosition = modelViewMatrix * vec4( vec3(position.x,position.y,position.z), 1.0 );

    float size = 1. + (3.*brightness);
    gl_PointSize = size * ( 300.0 / -mvPosition.z );
    gl_Position = projectionMatrix * mvPosition;

  }
  `,
  fragmentShader: `
  precision mediump float;
	precision mediump int;
  varying vec3 vColor;
  void main() {
    float d = distance(gl_PointCoord, vec2(0.5));
    float a = 1. - smoothstep(0.4,0.5,d);
    gl_FragColor = vec4(vColor,a);
  }`,
});
const numPoints = 2000;
const pointPositions = Array.from({ length: numPoints })
  .map((a) => {
    const theta = Math.random() * Math.PI * 2;
    const ir2 = innerRing ** 2;
    const or2 = outerRing ** 2;
    const diff = 2 / (or2 - ir2);
    const distance = Math.sqrt(ir2 + (2 * Math.random()) / diff);
    return [
      distance * Math.cos(theta),
      Math.random() * 5,
      distance * Math.sin(theta),
    ];
  })
  .flat();
buffer.setAttribute(
  'position',
  new THREE.BufferAttribute(new Float32Array(pointPositions), 3),
);
buffer.setAttribute(
  'brightness',
  new THREE.BufferAttribute(new Float32Array(numPoints).map(Math.random), 1),
);
const points = new THREE.Points(buffer, shaderMaterial);
scene.add(points);
const blurPass = new ShaderPass(ConvolutionShader);
blurPass.material.transparent = true;
const sigma = 1;
const oU = THREE.UniformsUtils.clone(ConvolutionShader.uniforms);
blurPass.material.defines.KERNAL_SIZE_FLOAT = (25).toFixed(1);
blurPass.material.defines.KERNAL_SIZE_INT = (25).toFixed(0);
blurPass.material.uniforms.cKernel.value = ConvolutionShader.buildKernel(sigma);
const bp = new BlurPass(renderer, 5);
const sb = new ShrinkBlur(renderer);
PostProcess.addPass(new RenderPass(scene, camera));
PostProcess.addPass(sb);
PostProcess.addPass(new OutputPass());
PostProcess.render();
function render() {
  scene.rotateY(0.0001);
  PostProcess.render();
  requestAnimationFrame(render);
}
render();
