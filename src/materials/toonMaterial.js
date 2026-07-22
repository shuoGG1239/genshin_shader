import * as THREE from 'three';

/**
 * Genshin-inspired character toon material (post black-area fix):
 * - Soft 2-band cel diffuse with cool shadow tint
 * - Outer shadow ring
 * - View-space rim light
 * - Blinn-Phong specular lobe
 */
const vertexShader = /* glsl */ `
  #include <common>
  #include <skinning_pars_vertex>
  #include <morphtarget_pars_vertex>

  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec2 vUv;

  void main() {
    #include <skinbase_vertex>
    #include <beginnormal_vertex>
    #include <skinnormal_vertex>
    #include <defaultnormal_vertex>

    #include <begin_vertex>
    #include <morphtarget_vertex>
    #include <skinning_vertex>
    #include <project_vertex>

    vNormal = normalize(transformedNormal);
    vViewPosition = -mvPosition.xyz;
    vUv = uv;
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D map;
  uniform vec3 diffuse;
  uniform vec3 emissive;
  uniform float opacity;
  uniform float alphaTest;
  uniform float useMap;

  uniform vec3 lightDir;
  uniform vec3 lightColor;
  uniform vec3 ambientColor;
  uniform vec3 shadowColor;
  uniform vec3 rimColor;

  uniform float shadeSoftness;
  uniform float shadeOffset;
  uniform float shadowBand;
  uniform float rimStrength;
  uniform float rimPower;
  uniform float specularStrength;
  uniform float specularPower;
  uniform float receiveShadowBoost;

  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec2 vUv;

  float softstep(float edge0, float edge1, float x) {
    float t = clamp((x - edge0) / max(edge1 - edge0, 1e-5), 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
  }

  void main() {
    vec4 base = vec4(diffuse, opacity);
    if (useMap > 0.5) {
      vec4 tex = texture2D(map, vUv);
      base.rgb *= tex.rgb;
      base.a *= tex.a;
    }

    if (base.a < alphaTest) discard;

    vec3 N = normalize(vNormal);
    if (length(vNormal) < 1e-5) N = vec3(0.0, 1.0, 0.0);
    if (!gl_FrontFacing) N = -N;

    vec3 V = normalize(vViewPosition);
    vec3 L = normalize(-lightDir);

    float ndotl = dot(N, L) * 0.5 + 0.5 + shadeOffset;

    float soft = max(shadeSoftness, 0.001);
    float lit = softstep(0.5 - soft, 0.5 + soft, ndotl);

    float outer = softstep(0.5 - soft - shadowBand, 0.5 - soft, ndotl);
    vec3 shadeTint = mix(shadowColor, vec3(1.0), lit);
    shadeTint = mix(shadeTint * 0.88, shadeTint, outer);
    shadeTint = max(shadeTint, vec3(0.55));

    vec3 albedo = base.rgb;
    vec3 litTerm = ambientColor + lightColor * shadeTint * receiveShadowBoost;
    litTerm = max(litTerm, vec3(0.45));
    vec3 color = albedo * litTerm + emissive;

    vec3 H = normalize(L + V);
    float spec = pow(max(dot(N, H), 0.0), specularPower) * specularStrength * lit;
    color += lightColor * spec;

    float fresnel = pow(1.0 - max(dot(N, V), 0.0), rimPower);
    color += rimColor * fresnel * rimStrength * (0.35 + 0.65 * lit);

    color = mix(vec3(dot(color, vec3(0.299, 0.587, 0.114))), color, 1.05);
    color = max(color, vec3(0.0));
    color = color * 1.12 / (color * 0.25 + vec3(1.0));

    gl_FragColor = vec4(color, base.a);
  }
`;

function textureHasAlpha(tex) {
  if (!tex) return false;
  if (tex.format === THREE.RGBAFormat || tex.format === THREE.RGFormat) return true;
  return false;
}

export function createGenshinToonMaterial(sourceMaterial, sharedUniforms) {
  const map = sourceMaterial.map || null;
  if (map) {
    map.colorSpace = THREE.SRGBColorSpace;
    map.flipY = false;
    map.needsUpdate = true;
  }

  const color = sourceMaterial.color ? sourceMaterial.color.clone() : new THREE.Color(0xffffff);
  // MMDLoader writes ambient into emissive (often near-white) — almost not self-glow.
  const emissive = sourceMaterial.emissive
    ? sourceMaterial.emissive.clone().multiplyScalar(0.06)
    : new THREE.Color(0x000000);

  const opacity = sourceMaterial.opacity ?? 1;
  const name = sourceMaterial.name || 'GenshinToon';

  // MMD marks many cloth mats transparent only because of alpha morphs.
  // Force opaque when opacity is solid so depthWrite works.
  const needsCutout = textureHasAlpha(map) || opacity < 0.999;
  const forceOpaque = opacity >= 0.999 && !textureHasAlpha(map);

  const alphaTest = forceOpaque
    ? 0.0
    : sourceMaterial.alphaTest > 0
      ? sourceMaterial.alphaTest
      : needsCutout
        ? 0.5
        : 0.0;

  const side = sourceMaterial.side ?? THREE.DoubleSide;

  const mat = new THREE.ShaderMaterial({
    name,
    uniforms: {
      map: { value: map },
      diffuse: { value: color },
      emissive: { value: emissive },
      opacity: { value: opacity },
      alphaTest: { value: alphaTest },
      useMap: { value: map ? 1 : 0 },

      lightDir: sharedUniforms.lightDir,
      lightColor: sharedUniforms.lightColor,
      ambientColor: sharedUniforms.ambientColor,
      shadowColor: sharedUniforms.shadowColor,
      rimColor: sharedUniforms.rimColor,
      shadeSoftness: sharedUniforms.shadeSoftness,
      shadeOffset: sharedUniforms.shadeOffset,
      shadowBand: sharedUniforms.shadowBand,
      rimStrength: sharedUniforms.rimStrength,
      rimPower: sharedUniforms.rimPower,
      specularStrength: sharedUniforms.specularStrength,
      specularPower: sharedUniforms.specularPower,
      receiveShadowBoost: sharedUniforms.receiveShadowBoost,
    },
    vertexShader,
    fragmentShader,
    transparent: forceOpaque ? false : needsCutout || opacity < 0.999,
    side,
    depthWrite: forceOpaque || opacity >= 0.999,
    depthTest: true,
  });

  const srcOutline =
    sourceMaterial.userData?.outlineParameters || sourceMaterial.outlineParameters;
  const outlineColor = srcOutline?.color;
  let colorArr = [0.1, 0.07, 0.06];
  if (Array.isArray(outlineColor)) {
    colorArr = outlineColor.slice(0, 3);
  } else if (outlineColor?.isColor) {
    colorArr = outlineColor.toArray();
  }

  mat.userData.outlineParameters = {
    thickness: 0,
    color: colorArr,
    alpha: 0.9,
    visible: false,
  };

  if (opacity < 0.01) {
    mat.visible = false;
    mat.userData.outlineParameters.visible = false;
  }

  return mat;
}

export function createSharedToonUniforms() {
  return {
    lightDir: { value: new THREE.Vector3(0.45, 0.85, 0.35).normalize().negate() },
    lightColor: { value: new THREE.Color(1.15, 1.1, 1.05) },
    ambientColor: { value: new THREE.Color(0.72, 0.74, 0.82) },
    shadowColor: { value: new THREE.Color(0.78, 0.8, 0.92) },
    rimColor: { value: new THREE.Color(0.75, 0.9, 1.0) },

    shadeSoftness: { value: 0.08 },
    shadeOffset: { value: 0.08 },
    shadowBand: { value: 0.12 },
    rimStrength: { value: 0.55 },
    rimPower: { value: 3.5 },
    specularStrength: { value: 0.35 },
    specularPower: { value: 48.0 },
    receiveShadowBoost: { value: 1.2 },
  };
}

export function applyGenshinMaterials(root, sharedUniforms) {
  const created = [];
  root.traverse((obj) => {
    if (!obj.isMesh || !obj.material) return;

    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    const next = mats.map((m) => {
      const g = createGenshinToonMaterial(m, sharedUniforms);
      created.push(g);
      return g;
    });

    obj.material = Array.isArray(obj.material) ? next : next[0];
    obj.frustumCulled = false;

    const list = Array.isArray(obj.material) ? obj.material : [obj.material];
    if (list.every((m) => m.visible === false)) {
      obj.visible = false;
    }
  });
  return created;
}
