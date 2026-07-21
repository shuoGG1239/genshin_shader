import * as THREE from 'three';
import { classifyFbxPart } from './nahidaAssets.js';

const vertexShader = /* glsl */ `
  #include <common>
  #include <skinning_pars_vertex>
  #include <morphtarget_pars_vertex>

  uniform float flipV;

  varying vec3 vNormal;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
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
    vWorldNormal = normalize(inverseTransformDirection(transformedNormal, viewMatrix));
    vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
    vViewPosition = -mvPosition.xyz;
    vUv = uv;
    if (flipV > 0.5) vUv.y = 1.0 - vUv.y;
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D map;
  uniform sampler2D rampMap;
  uniform float flipV;
  uniform float isHair;

  uniform vec3 lightDir;
  uniform vec3 lightColor;
  uniform vec3 ambientColor;
  uniform vec3 rimColor;
  uniform vec3 tint;

  uniform float shadeSoftness;
  uniform float shadeOffset;
  uniform float rimStrength;
  uniform float rimPower;
  uniform float specularStrength;
  uniform float receiveBoost;
  uniform float rampMix;

  varying vec3 vNormal;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  varying vec3 vViewPosition;
  varying vec2 vUv;

  float softstep(float a, float b, float x) {
    float t = clamp((x - a) / max(b - a, 1e-5), 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
  }

  void main() {
    vec4 albedo = texture2D(map, vUv);
    albedo.rgb *= tint;

    vec3 Nw = normalize(vWorldNormal);
    if (!gl_FrontFacing) Nw = -Nw;
    vec3 Lw = normalize(-lightDir);
    vec3 Nview = normalize(vNormal);
    if (!gl_FrontFacing) Nview = -Nview;
    vec3 V = normalize(vViewPosition);

    float hl = clamp(dot(Nw, Lw) * 0.5 + 0.5 + shadeOffset, 0.0, 1.0);
    float soft = max(shadeSoftness, 0.001);
    float rampU = softstep(0.5 - soft, 0.5 + soft, hl);

    vec3 rampCol = texture2D(rampMap, vec2(clamp(rampU, 0.02, 0.98), 0.4)).rgb;
    if (dot(rampCol, vec3(1.0)) < 0.08) rampCol = vec3(1.0);

    float shade = mix(0.75, 1.05, rampU);
    vec3 color = albedo.rgb * shade;
    color = mix(color, albedo.rgb * rampCol * shade, rampMix * 0.45);
    color *= mix(vec3(1.0), lightColor, 0.35) * receiveBoost;
    color += ambientColor * albedo.rgb * 0.35;

    if (isHair > 0.5) {
      vec3 Hw = normalize(Lw + normalize(cameraPosition - vWorldPos));
      vec3 side = normalize(cross(Nw, vec3(0.0, 1.0, 0.0)));
      if (length(side) < 0.1) side = vec3(1.0, 0.0, 0.0);
      vec3 B = normalize(cross(Nw, side));
      float s = pow(sqrt(max(1.0 - pow(dot(B, Hw), 2.0), 1e-4)), 56.0);
      color += vec3(0.9, 1.0, 0.92) * s * specularStrength * 0.4;
    }

    float fresnel = pow(1.0 - max(dot(Nview, V), 0.0), rimPower);
    color += rimColor * fresnel * rimStrength * (1.0 - rampU);

    color = max(color, albedo.rgb * 0.4);
    gl_FragColor = vec4(color, 1.0);
  }
`;

export function createSharedOfficialUniforms() {
  return {
    lightDir: { value: new THREE.Vector3(0.45, 0.8, 0.45).normalize().negate() },
    lightColor: { value: new THREE.Color(1.08, 1.04, 1.0) },
    ambientColor: { value: new THREE.Color(0.48, 0.52, 0.62) },
    faceForward: { value: new THREE.Vector3(0, 0, 1) },
    rimColor: { value: new THREE.Color(0.55, 0.8, 1.0) },
    shadeSoftness: { value: 0.12 },
    shadeOffset: { value: 0.1 },
    rimStrength: { value: 0.22 },
    rimPower: { value: 3.0 },
    specularStrength: { value: 0.28 },
    receiveBoost: { value: 1.0 },
    rampMix: { value: 0.3 },
  };
}

export function createOfficialMaterial(part, textures, shared) {
  const isFace = part === 'face';
  const isHair = part === 'hair';

  let map = textures.bodyDiffuse;
  let rampMap = textures.bodyRamp;
  let tint = new THREE.Color(1, 1, 1);
  let flipV = 0;

  if (isFace) {
    map = textures.faceDiffuse;
    tint = new THREE.Color(1.05, 0.96, 0.9);
  } else if (isHair) {
    map = textures.hairDiffuseOpaque || textures.hairDiffuse;
    rampMap = textures.hairRamp;
    flipV = 1;
  } else {
    // pale skin islands read as pure white — warm tint
    tint = new THREE.Color(1.0, 0.93, 0.88);
  }

  const mat = new THREE.ShaderMaterial({
    name: `GenshinOfficial_${part}`,
    uniforms: {
      map: { value: map },
      rampMap: { value: rampMap },
      flipV: { value: flipV },
      isHair: { value: isHair ? 1 : 0 },
      tint: { value: tint },
      lightDir: shared.lightDir,
      lightColor: shared.lightColor,
      ambientColor: shared.ambientColor,
      rimColor: shared.rimColor,
      shadeSoftness: shared.shadeSoftness,
      shadeOffset: shared.shadeOffset,
      rimStrength: shared.rimStrength,
      rimPower: shared.rimPower,
      specularStrength: shared.specularStrength,
      receiveBoost: shared.receiveBoost,
      rampMix: shared.rampMix,
    },
    vertexShader,
    fragmentShader,
    side: isHair ? THREE.DoubleSide : THREE.FrontSide,
    depthWrite: true,
  });

  mat.userData.matType = part;
  mat.userData.outlineParameters = {
    thickness: 0,
    color: [0.12, 0.08, 0.08],
    alpha: 0.9,
    visible: false,
  };
  return mat;
}

export function applyOfficialMaterials(root, textures, shared) {
  const created = [];

  root.traverse((obj) => {
    if (!obj.isMesh) return;
    const mesh = (obj.name || '').toLowerCase();

    // UV0 body mis-maps official diffuse; Face shell UVs are unreliable in this rip
    if (mesh === 'body' || mesh === 'face') {
      obj.visible = false;
      obj.userData.forceHidden = true;
      return;
    }

    obj.frustumCulled = false;
    const srcMats = Array.isArray(obj.material) ? obj.material : [obj.material];
    const next = srcMats.map((src) => {
      const matName = src?.name || obj.name || '';
      const part = classifyFbxPart(matName, obj.name);
      const mat = createOfficialMaterial(part, textures, shared);
      mat.name = matName || obj.name || mat.name;
      if (obj.isSkinnedMesh) mat.skinning = false;
      created.push(mat);
      return mat;
    });
    obj.material = Array.isArray(obj.material) ? next : next[0];
  });

  return created;
}
