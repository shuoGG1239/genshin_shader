import * as THREE from 'three';

const loader = new THREE.TextureLoader();

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${url}`));
    img.src = url;
  });
}

function imageData(img) {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, img.width, img.height);
}

function sampleGray(data, w, h, x, y, ch) {
  const sx = Math.min(w - 1, Math.max(0, x));
  const sy = Math.min(h - 1, Math.max(0, y));
  const o = (sy * w + sx) * 4;
  if (ch === 'g') return data[o + 1];
  if (ch === 'b') return data[o + 2];
  if (ch === 'a') return data[o + 3];
  return data[o];
}

/**
 * Pack channel images into one RGBA CanvasTexture.
 * specs keys: r,g,b,a as url (grayscale→that channel)
 * or rFrom:{url,ch} etc.
 */
export async function packRGBA(specs, opts = {}) {
  const refs = [];
  for (const key of ['r', 'g', 'b', 'a']) {
    if (specs[key]) refs.push({ out: key, url: specs[key], ch: 'r' });
    const from = specs[`${key}From`];
    if (from) refs.push({ out: key, url: from.url, ch: from.ch });
  }

  const urls = [...new Set(refs.map((r) => r.url))];
  const images = Object.fromEntries(
    await Promise.all(urls.map(async (u) => [u, await loadImage(u)])),
  );
  const idata = Object.fromEntries(
    Object.entries(images).map(([u, img]) => [u, imageData(img)]),
  );

  const first = images[urls[0]];
  const w = first.width;
  const h = first.height;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const out = ctx.createImageData(w, h);
  const d = out.data;

  const chIndex = { r: 0, g: 1, b: 2, a: 3 };
  const n = w * h;
  d.fill(255);
  for (const ref of refs) {
    const id = idata[ref.url];
    const iw = id.width;
    const ih = id.height;
    const src = id.data;
    const dstI = chIndex[ref.out];
    const srcI = chIndex[ref.ch] ?? 0;
    const sameSize = iw === w && ih === h;
    for (let i = 0; i < n; i++) {
      let v;
      if (sameSize) {
        v = src[i * 4 + srcI];
      } else {
        const x = i % w;
        const y = (i / w) | 0;
        const sx = ((x / w) * iw) | 0;
        const sy = ((y / h) * ih) | 0;
        v = sampleGray(src, iw, ih, sx, sy, ref.ch);
      }
      d[i * 4 + dstI] = v;
    }
  }

  ctx.putImageData(out, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  // Unity FBX / DirectX UVs → flipY false
  tex.flipY = opts.flipY ?? false;
  tex.colorSpace = opts.colorSpace ?? THREE.NoColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export async function loadTexture(url, opts = {}) {
  const tex = await new Promise((resolve, reject) => {
    loader.load(url, resolve, undefined, reject);
  });
  tex.flipY = opts.flipY ?? false;
  tex.colorSpace = opts.colorSpace ?? THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

export async function packDiffuse(rgbUrl, aUrl) {
  const [rgbImg, aImg] = await Promise.all([loadImage(rgbUrl), loadImage(aUrl)]);
  const w = rgbImg.width;
  const h = rgbImg.height;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(rgbImg, 0, 0);
  const out = ctx.getImageData(0, 0, w, h);
  const aData = imageData(aImg);
  const n = w * h;
  const same = aData.width === w && aData.height === h;
  for (let i = 0; i < n; i++) {
    let a;
    if (same) {
      a = aData.data[i * 4];
    } else {
      const x = i % w;
      const y = (i / w) | 0;
      a = sampleGray(
        aData.data,
        aData.width,
        aData.height,
        ((x / w) * aData.width) | 0,
        ((y / h) * aData.height) | 0,
        'r',
      );
    }
    out.data[i * 4 + 3] = a;
  }
  ctx.putImageData(out, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}
