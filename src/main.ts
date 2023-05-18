import regl from 'regl';
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
const PARTICLE_BUFFER_RADIUS = 512;
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
  const x = Math.random();
  const y = Math.random();
  const vx = x - 0.5;
  const vy = y - 0.5;
  const rotateAmount = Math.PI / 5;
  const ang = Math.PI + (-rotateAmount + rotateAmount * Math.random());
  const nvx = Math.cos(ang) * vx - Math.sin(ang) * vy;
  const nvy = Math.sin(ang) * vx + Math.cos(ang) * vy;
  const strength = Math.random() * 5;
  physData.set([x, y, nvx * strength, nvy * strength], i);
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
    aPos: [
      [-1, 1],
      [1, 1],
      [-1, -1],
      [1, -1],
    ],
  },
  count: 4,
  primitive: 'triangle strip',
  uniforms: {
    uColorTex: particleColourTexture,
    uPhysTex: (_, p: any) => physicsSet[(p.set + 1) % 2][1],
    uParticleRadius: PARTICLE_BUFFER_RADIUS,
  },
  framebuffer: (_, p: any) => physicsSet[p.set][0],
  vert: shaders['prcl_process.vert'],
  frag: shaders['prcl_process.frag'],
});
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
  },
  vert: shaders['prcl.vert'],
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
});

drawToScreen({ set: 0 });
let set = 0;
const render = () => {
  gl.clear({ color: [0 / 255, 18 / 255, 70 / 255, 1] });
  updateParticles({ set });
  drawToScreen({ set });
  set = (set + 1) % 2;
  requestAnimationFrame(render);
};
render();
