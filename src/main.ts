/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-ignore
import regl from 'regl';
import createCam from 'orbit-camera';
import prclVert from './shaders/prcl.vert';
console.log(createCam);

const rawShade = import.meta.glob('./shaders/*', { eager: true, as: 'raw' });

const shaders = Object.fromEntries(
  Object.entries(rawShade).map(([rk, txt]) => {
    const pathName = rk.match(/(?<=\/)[^/]+$/)![0];
    console.log(pathName);
    return [pathName, txt];
  }),
);

const gl = regl({
  extensions: [
    'OES_texture_float',
    'OES_texture_float_linear',
    'WEBGL_draw_buffers',
  ],
  attributes: { alpha: true, depth: true, premultipliedAlpha: false },
});
gl.clear({ color: [0 / 255, 18 / 255, 70 / 255, 1] });
const PARTICLE_BUFFER_RADIUS = 64;
const particleCount = PARTICLE_BUFFER_RADIUS ** 2;
const particleIndexBuffer = gl.buffer({
  length: particleCount,
  type: 'float32',
  data: new Float32Array(particleCount).map((_, i) => i),
});
console.log(new Uint32Array(particleCount).map((_, i) => i));

const particleColourTexture = gl.texture({
  width: PARTICLE_BUFFER_RADIUS,
  height: PARTICLE_BUFFER_RADIUS,
  channels: 4,
  data: new Float32Array(particleCount * 4).map(() => {
    return -1 + 2 * Math.random();
  }),
});
const physData = new Float32Array(particleCount * 4);
for (let i = 0; i < physData.length; i += 4) {
  const theta = Math.random() * Math.PI * 2;
  const r = 0.5 + Math.sqrt(Math.random()) / 2;
  const x = Math.cos(theta) * r;
  const y = Math.sin(theta) * r;
  const v = Math.sqrt(r) * 1;
  const theta2 = theta + Math.PI / 2;
  const nx = x / 2 + 0.5;
  const ny = y / 2 + 0.5;

  physData.set([nx, ny, Math.cos(theta2) * v, Math.sin(theta2) * v], i);
}
const physicsSet = [0, 0].map(() => {
  const particlePhysTexture = gl.texture({
    width: PARTICLE_BUFFER_RADIUS,
    height: PARTICLE_BUFFER_RADIUS,
    wrap: 'repeat',

    data: physData,
  });
  const particleFB = gl.framebuffer({
    width: PARTICLE_BUFFER_RADIUS,
    height: PARTICLE_BUFFER_RADIUS,
    color: particlePhysTexture,
    depthStencil: false,
  });
  return [particleFB, particlePhysTexture] as const;
});
const updateParticles = gl({
  attributes: {
    aIndex: particleIndexBuffer,
  },
  count: particleCount,
  primitive: 'points',
  uniforms: {
    uColorTex: particleColourTexture,
    uPhysTex: (_, p: any) => physicsSet[(p.set + 1) % 2][1],
    uParticleRadius: PARTICLE_BUFFER_RADIUS,
  },
  framebuffer: (_, p: any) => physicsSet[p.set][0],
  vert: shaders['prcl_process.vert'],
  frag: shaders['prcl_process.frag'],
});
const cameraArray = new Float32Array(16);
const drawToScreen = gl({
  attributes: {
    aIndex: particleIndexBuffer,
  },
  count: particleCount,
  primitive: 'points',
  uniforms: {
    uColorTex: particleColourTexture,
    uPhysTex: (_, p: any) => physicsSet[p.set][0],
    uParticleRadius: PARTICLE_BUFFER_RADIUS,
    uCamMat: (_, p) => p.view ?? cameraArray,
  },
  vert: prclVert,
  frag: shaders['prcl.frag'],
  blend: {
    enable: true,
    func: {
      srcRGB: 'src alpha',
      srcAlpha: 'src alpha',
      dstRGB: 'one minus src alpha',
      dstAlpha: 'dst alpha',
    },
    equation: {
      rgb: 'add',
      alpha: 'add',
    },
    color: [0, 0, 0, 0],
  },
  depth: {
    enable: true,
  },
});

drawToScreen({ set: 0 });
let set = 0;
let fc = 0;
const render = () => {
  const camera = createCam(
    [0, 1 - Math.cos(fc / 1000), Math.sin(fc / 1000)],
    [0, 0, 0],
    [0, -1, 0],
  );
  camera.zoom(-10);
  camera.zoom(-10);
  const view = camera.view(cameraArray);
  gl.clear({ color: [0 / 255, 18 / 255, 70 / 255, 1] });

  updateParticles({ set });
  drawToScreen({ set, view });
  set = (set + 1) % 2;
  requestAnimationFrame(render);
  fc++;
};
render();
