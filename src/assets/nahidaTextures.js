import * as THREE from 'three';
import { PATHS } from '../config.js';
import { packDiffuse, packRGBA, loadTexture } from './texturePack.js';

const BASE = PATHS.fbxTextures;

export async function loadNahidaTextures() {
  // _A maps are sparse atlas cutouts; pack them but shader uses softer clip.
  // Also keep raw RGB for debug fallback.
  const bodyDiffuse = await packDiffuse(
    `${BASE}/Avatar_Loli_Catalyst_Nahida_Tex_Body_Diffuse.png`,
    `${BASE}/Avatar_Loli_Catalyst_Nahida_Tex_Body_Diffuse_A.png`,
  );

  const hairDiffuse = await packDiffuse(
    `${BASE}/Avatar_Loli_Catalyst_Nahida_Tex_Hair_Diffuse.png`,
    `${BASE}/Avatar_Loli_Catalyst_Nahida_Tex_Hair_Diffuse_A.png`,
  );

  const faceDiffuse = await packDiffuse(
    `${BASE}/Avatar_Loli_Catalyst_Nahida_Tex_Face_Diffuse.png`,
    `${BASE}/Avatar_Loli_Catalyst_Nahida_Tex_Face_Diffuse_A.png`,
  );

  // Opaque RGB-only fallbacks (no cutout) — Unity FBX often needs these
  // when _A cutout UVs don't match the exported mesh UV set.
  // Per-atlas flip: hair needs flipY, body/face match UV1 without flip
  const bodyDiffuseOpaque = await loadTexture(
    `${BASE}/Avatar_Loli_Catalyst_Nahida_Tex_Body_Diffuse.png`,
    { colorSpace: THREE.SRGBColorSpace, flipY: false },
  );
  // flip handled in shader for hair (v = 1 - v)
  const hairDiffuseOpaque = await loadTexture(
    `${BASE}/Avatar_Loli_Catalyst_Nahida_Tex_Hair_Diffuse.png`,
    { colorSpace: THREE.SRGBColorSpace, flipY: false },
  );
  const faceDiffuseOpaque = await loadTexture(
    `${BASE}/Avatar_Loli_Catalyst_Nahida_Tex_Face_Diffuse.png`,
    { colorSpace: THREE.SRGBColorSpace, flipY: false },
  );

  const bodyLightMap = await packRGBA(
    {
      r: `${BASE}/Avatar_Loli_Catalyst_Nahida_Tex_Body_Lightmap_R.png`,
      g: `${BASE}/Avatar_Loli_Catalyst_Nahida_Tex_Body_Lightmap_G.png`,
      b: `${BASE}/Avatar_Loli_Catalyst_Nahida_Tex_Body_Lightmap_B.png`,
      a: `${BASE}/Avatar_Loli_Catalyst_Nahida_Tex_Body_Lightmap_A.png`,
    },
    { colorSpace: THREE.NoColorSpace, flipY: false },
  );

  const hairLightMap = await packRGBA(
    {
      r: `${BASE}/Avatar_Loli_Catalyst_Nahida_Tex_Hair_Lightmap_R.png`,
      g: `${BASE}/Avatar_Loli_Catalyst_Nahida_Tex_Hair_Lightmap_G.png`,
      b: `${BASE}/Avatar_Loli_Catalyst_Nahida_Tex_Hair_Lightmap_B.png`,
      a: `${BASE}/Avatar_Loli_Catalyst_Nahida_Tex_Hair_Lightmap_A.png`,
    },
    { colorSpace: THREE.NoColorSpace, flipY: false },
  );

  // Face shadow SDF (R/G packed, A/B separate)
  const faceShadow = await packRGBA(
    {
      rFrom: { url: `${BASE}/Avatar_Tex_Face_Shadow_R_G.png`, ch: 'r' },
      gFrom: { url: `${BASE}/Avatar_Tex_Face_Shadow_R_G.png`, ch: 'g' },
      b: `${BASE}/Avatar_Tex_Face_Shadow_B.png`,
      a: `${BASE}/Avatar_Tex_Face_Shadow_A.png`,
    },
    { colorSpace: THREE.NoColorSpace, flipY: false },
  );

  const bodyRamp = await loadTexture(
    `${BASE}/Avatar_Loli_Catalyst_Nahida_Tex_Body_Shadow_Ramp.png`,
    { colorSpace: THREE.SRGBColorSpace, flipY: false },
  );
  bodyRamp.wrapS = THREE.ClampToEdgeWrapping;
  bodyRamp.wrapT = THREE.ClampToEdgeWrapping;

  const hairRamp = await loadTexture(
    `${BASE}/Avatar_Loli_Catalyst_Nahida_Tex_Hair_Shadow_Ramp.png`,
    { colorSpace: THREE.SRGBColorSpace, flipY: false },
  );
  hairRamp.wrapS = THREE.ClampToEdgeWrapping;
  hairRamp.wrapT = THREE.ClampToEdgeWrapping;

  const metalMap = await loadTexture(`${BASE}/Avatar_Tex_MetalMap.png`, {
    colorSpace: THREE.NoColorSpace,
    flipY: false,
  });

  // Face uses cool soft ramp — reuse body ramp row for skin-like
  return {
    bodyDiffuse: bodyDiffuseOpaque,
    faceDiffuse: faceDiffuseOpaque,
    // Hair cutout once UV1 mesh is used; falls back readable with opaque
    hairDiffuse,
    bodyDiffuseCutout: bodyDiffuse,
    faceDiffuseCutout: faceDiffuse,
    hairDiffuseOpaque,
    bodyLightMap,
    hairLightMap,
    faceShadow,
    bodyRamp,
    hairRamp,
    metalMap,
  };
}

export function classifyFbxPart(name = '', meshName = '') {
  const n = name.toLowerCase();
  const mesh = (meshName || '').toLowerCase();
  // EyeStar UVs sit on the hair atlas (green star pupil)
  if (mesh === 'eyestar' || /eyestar/.test(n)) return 'hair';
  if (/mat_face|_face$|face_eye|(^|_)brow/.test(n) || mesh === 'face' || mesh === 'face_eye' || mesh === 'brow') {
    return 'face';
  }
  if (/mat_hair|_hair$|hair/.test(n)) return 'hair';
  return 'body';
}
