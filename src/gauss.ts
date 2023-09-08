import {
  Vector2,
  WebGLRenderer,
  WebGLRenderTarget,
  Shader,
  ShaderMaterial,
  FloatType,
  Texture,
  LinearFilter,
} from 'three';
import { CopyShader } from 'three/addons/shaders/CopyShader.js';
import {
  FullScreenQuad,
  Pass,
} from 'three/examples/jsm/postprocessing/Pass.js';
const PowerShader = {
  name: 'powerShader',

  uniforms: {
    tDiffuse: { value: null },
    tRaw: { value: null },
    opacity: { value: 1.0 },
  },

  vertexShader: /* glsl */ `

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,

  fragmentShader: /* glsl */ `

		uniform float opacity;

		uniform sampler2D tDiffuse;
		uniform sampler2D tRaw;

		varying vec2 vUv;

		void main() {

			vec4 texelA = texture2D( tDiffuse, vUv );
      vec4 texelB = texture2D( tRaw, vUv);
      vec4 color = mix(texelA,texelB,vec4(0.2));
			gl_FragColor =  color;


		}`,
};
export function buildKernal(sigma: number, maxKernalSize = 25) {
  // We lop off the sqrt(2 * pi) * sigma term, since we're going to normalize anyway.

  const kMaxKernelSize = maxKernalSize;
  let kernelSize = 2 * Math.ceil(sigma * 3.0) + 1;

  if (kernelSize > kMaxKernelSize) kernelSize = kMaxKernelSize;

  const halfWidth = (kernelSize - 1) * 0.5;

  const values: number[] = new Array(kernelSize);
  let sum = 0.0;
  for (let i = 0; i < kernelSize; ++i) {
    values[i] = gauss(i - halfWidth, sigma);
    sum += values[i];
  }

  // normalize the kernel

  for (let i = 0; i < kernelSize; ++i) values[i] /= sum;

  return values;
}

export function gauss(x: number, sigma: number) {
  return Math.exp(-(x * x) / (2.0 * sigma * sigma));
}

export class GaussianBlurer {
  _x: WebGLRenderTarget;
  _w: number;
  _h: number;
  _pr: number;
  _fsq: FullScreenQuad;
  _kernal: number[];
  _shaderMaterial: ShaderMaterial;
  constructor(public renderer: WebGLRenderer, sigma: number) {
    const size = renderer.getSize(new Vector2());
    this._w = size.width;
    this._h = size.height;
    this._pr = renderer.getPixelRatio();
    this._kernal = buildKernal(sigma, 100);
    this._fsq = new FullScreenQuad();
    this._shaderMaterial = new ShaderMaterial({
      name: 'gaussianBlurShader',
      vertexShader: CopyShader.vertexShader,
      defines: {
        KERNAL_SIZE: this._kernal.length.toFixed(0),
      },
      uniforms: {
        tDiffuse: { value: null },
        cKernal: { value: this._kernal },
        uDirection: { value: new Vector2(1, 0) },
        uResolution: {
          value: new Vector2(this._w * this._pr, this._h * this._pr),
        },
      },
      fragmentShader: /* glsl */ `
      uniform float cKernal[ KERNAL_SIZE ];

      uniform sampler2D tDiffuse;
      uniform vec2 uDirection;
      uniform vec2 uResolution;

      varying vec2 vUv;

      void main() {
        vec4 sum = vec4(0.0);
        float midpoint = (float(KERNAL_SIZE) - 1.) / 2.0;
        for (int i = 0; i < KERNAL_SIZE; i ++) {
          vec2 offset = (uDirection * (float(i) - midpoint)) / uResolution;
          sum += texture2D(tDiffuse, vUv + offset) * cKernal[ i ];
        }

        gl_FragColor = sum;
      }
      `,
    });
    this._x = new WebGLRenderTarget(this._w * this._pr, this._h * this._pr, {
      type: FloatType,
    });
  }

  render(readBuffer: WebGLRenderTarget, writeBuffer: WebGLRenderTarget | null) {
    this._fsq.material = this._shaderMaterial;
    this._shaderMaterial.uniforms.tDiffuse.value = readBuffer.texture;
    this._shaderMaterial.uniforms.uDirection.value = new Vector2(1, 0);
    this.renderer.setRenderTarget(this._x);
    this.renderer.clear();
    this._fsq.render(this.renderer);

    this._shaderMaterial.uniforms.tDiffuse.value = this._x.texture;
    this._shaderMaterial.uniforms.uDirection.value = new Vector2(0, 1);
    this.renderer.setRenderTarget(writeBuffer);
    this.renderer.clear();
    this._fsq.render(this.renderer);
  }

  dispose() {
    this._x.dispose();
    this._shaderMaterial.dispose();
  }
}

export class BlurPass extends Pass {
  blurer: GaussianBlurer;
  constructor(renderer: WebGLRenderer, sigma = 5) {
    super();
    this.blurer = new GaussianBlurer(renderer, sigma);
  }

  render(
    renderer: WebGLRenderer,
    writeBuffer: WebGLRenderTarget<Texture>,
    readBuffer: WebGLRenderTarget<Texture>,
  ): void {
    this.blurer.render(readBuffer, writeBuffer ?? null);
  }

  dispose(): void {
    this.blurer.dispose();
  }
}
export class ShrinkBlur extends Pass {
  width: number;
  height: number;
  wn1: number;
  hn1: number;
  wn2: number;
  hn2: number;
  wn3: number;
  hn3: number;
  wn4: number;
  hn4: number;
  sub1: WebGLRenderTarget<Texture>;
  sub2: WebGLRenderTarget<Texture>;
  sub3: WebGLRenderTarget<Texture>;
  sub4: WebGLRenderTarget<Texture>;
  _fq: FullScreenQuad;
  _shrinkMaterial: ShaderMaterial;
  _growMaterial: ShaderMaterial;
  constructor(public renderer: WebGLRenderer) {
    super();
    const size = renderer.getSize(new Vector2());
    const pr = renderer.getPixelRatio();
    this.width = size.x * pr;
    this.height = size.y * pr;
    this.wn1 = Math.floor(this.width / 2);
    this.hn1 = Math.floor(this.height / 2);
    this.wn2 = Math.floor(this.wn1 / 2);
    this.hn2 = Math.floor(this.hn1 / 2);
    this.wn3 = Math.floor(this.wn2 / 2);
    this.hn3 = Math.floor(this.hn2 / 2);
    this.wn4 = Math.floor(this.wn3 / 2);
    this.hn4 = Math.floor(this.hn3 / 2);
    this.sub1 = new WebGLRenderTarget(this.wn1, this.hn1, {
      magFilter: LinearFilter,
      minFilter: LinearFilter,
      type: FloatType,
    });

    this.sub2 = new WebGLRenderTarget(this.wn2, this.hn2, {
      magFilter: LinearFilter,
      minFilter: LinearFilter,
      type: FloatType,
    });

    this.sub3 = new WebGLRenderTarget(this.wn3, this.hn3, {
      magFilter: LinearFilter,
      minFilter: LinearFilter,
      type: FloatType,
    });
    this.sub4 = new WebGLRenderTarget(this.wn4, this.hn4, {
      magFilter: LinearFilter,
      minFilter: LinearFilter,
      type: FloatType,
    });
    this._shrinkMaterial = new ShaderMaterial(CopyShader);
    this._growMaterial = new ShaderMaterial(PowerShader);
    this._fq = new FullScreenQuad(this._shrinkMaterial);
  }

  render(
    renderer: WebGLRenderer,
    writeBuffer: WebGLRenderTarget<Texture>,
    readBuffer: WebGLRenderTarget<Texture>,
    deltaTime: number,
    maskActive: boolean,
  ): void {
    this._growMaterial.uniforms.tRaw.value = readBuffer.texture;
    this._shrinkMaterial.uniforms.tDiffuse.value = readBuffer.texture;
    renderer.setRenderTarget(this.sub1);
    renderer.clear();
    this._fq.render(renderer);
    this._shrinkMaterial.uniforms.tDiffuse.value = this.sub1.texture;
    renderer.setRenderTarget(this.sub2);
    renderer.clear();
    this._fq.render(renderer);
    this._shrinkMaterial.uniforms.tDiffuse.value = this.sub2.texture;
    renderer.setRenderTarget(this.sub3);
    renderer.clear();
    this._fq.render(renderer);
    this._shrinkMaterial.uniforms.tDiffuse.value = this.sub3.texture;
    renderer.setRenderTarget(this.sub4);
    renderer.clear();
    this._fq.render(renderer);
    this._fq.material = this._growMaterial;
    this._growMaterial.uniforms.tDiffuse.value = this.sub4.texture;
    renderer.setRenderTarget(this.sub3);
    renderer.clear();
    this._fq.render(renderer);
    this._growMaterial.uniforms.tDiffuse.value = this.sub3.texture;
    renderer.setRenderTarget(this.sub2);
    renderer.clear();
    this._fq.render(renderer);
    this._growMaterial.uniforms.tDiffuse.value = this.sub2.texture;
    renderer.setRenderTarget(this.sub1);
    renderer.clear();
    this._fq.render(renderer);
    this._growMaterial.uniforms.tDiffuse.value = this.sub1.texture;
    renderer.setRenderTarget(writeBuffer);
    renderer.clear();
    this._fq.render(renderer);
  }

  dispose(): void {
    this.sub1.dispose();
    this.sub2.dispose();
    this.sub3.dispose();
    this._fq.dispose();
    this._shrinkMaterial.dispose();
  }
}
