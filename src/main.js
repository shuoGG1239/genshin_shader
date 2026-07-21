import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { MMDLoader } from 'three/addons/loaders/MMDLoader.js';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';
import {
  applyOfficialMaterials,
  createSharedOfficialUniforms,
} from './genshinOfficialMaterial.js';
import {
  applyGenshinMaterials,
  createSharedToonUniforms,
} from './genshinToonMaterial.js';
import { loadNahidaTextures } from './nahidaAssets.js';
import {
  createPartVisibility,
  mountPartVisibilityUI,
} from './partVisibility.js';

const PMX_URL = '/Nahida_R18_MDJSN_edit_v1.1/Nahida_R18_v1.1.pmx';
const FBX_URL = '/Nahida_unity/Nahida/Nahida.fbx';

const params = new URLSearchParams(location.search);
const mode = params.get('model') === 'fbx' ? 'fbx' : 'pmx';

const statusEl = document.getElementById('status');
const setStatus = (text, isError = false) => {
  statusEl.textContent = text;
  statusEl.classList.toggle('error', isError);
};

const sharedOfficial = createSharedOfficialUniforms();
const sharedToon = createSharedToonUniforms();
const materials = [];
let character = null;

const container = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x1a2332, 1);
container.appendChild(renderer.domElement);

const effect = new OutlineEffect(renderer, {
  defaultThickness: 0.0,
  defaultColor: [0.12, 0.09, 0.08],
  defaultAlpha: 0.9,
  defaultKeepAlive: true,
});

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x1a2332, 18, 42);

const camera = new THREE.PerspectiveCamera(
  32,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);
camera.position.set(0.6, 1.35, 3.4);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1.05, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 1.2;
controls.maxDistance = 10;
controls.maxPolarAngle = Math.PI * 0.92;
controls.update();

scene.add(new THREE.HemisphereLight(0xb8d0f0, 0x3a3040, 0.45));
const key = new THREE.DirectionalLight(0xfff2e0, 1.45);
key.position.set(2.2, 4.5, 2.8);
scene.add(key);
const fill = new THREE.DirectionalLight(0x88aaff, 0.3);
fill.position.set(-3.0, 1.5, -1.5);
scene.add(fill);

const _fwd = new THREE.Vector3();
const _quat = new THREE.Quaternion();

function activeShared() {
  return mode === 'fbx' ? sharedOfficial : sharedToon;
}

function syncLightUniforms() {
  const shared = activeShared();
  shared.lightDir.value.copy(key.position).normalize().negate();
  shared.lightColor.value.copy(key.color).multiplyScalar(key.intensity * 0.5);
  if (character && shared.faceForward) {
    character.getWorldQuaternion(_quat);
    _fwd.set(0, 0, 1).applyQuaternion(_quat).normalize();
    shared.faceForward.value.copy(_fwd);
  }
}

function bindSharedRanges() {
  const shared = activeShared();
  const bind = (id, keyName) => {
    const el = document.getElementById(id);
    if (!el || shared[keyName] == null) return;
    const apply = () => {
      shared[keyName].value = Number(el.value);
    };
    el.addEventListener('input', apply);
    apply();
  };
  bind('shadeSoft', 'shadeSoftness');
  bind('shadeOffset', 'shadeOffset');
  bind('rim', 'rimStrength');
  bind('spec', 'specularStrength');
  bind('rampMix', 'rampMix');
}

document.getElementById('outline')?.addEventListener('input', (e) => {
  const t = Number(e.target.value);
  for (const m of materials) {
    if (!m.userData.outlineParameters || m.userData.forceHidden) continue;
    const cloth = m.userData.matType === 'body';
    const thickness = cloth ? t * 0.4 : t;
    m.userData.outlineParameters.thickness = thickness;
    m.userData.outlineParameters.visible = m.visible && thickness > 0.00005;
  }
});

document.getElementById('autoRotate')?.addEventListener('change', (e) => {
  controls.autoRotate = e.target.checked;
});

document.getElementById('modelPmx')?.addEventListener('click', () => {
  location.search = '?model=pmx';
});
document.getElementById('modelFbx')?.addEventListener('click', () => {
  location.search = '?model=fbx';
});

function normalizeAndFrame(root) {
  root.position.set(0, 0, 0);
  root.scale.setScalar(1);
  root.rotation.y = 0;

  let box = new THREE.Box3().setFromObject(root);
  let size = box.getSize(new THREE.Vector3());
  if (size.y > 0.001) root.scale.setScalar(1.6 / size.y);

  box = new THREE.Box3().setFromObject(root);
  size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= box.min.y;

  const box2 = new THREE.Box3().setFromObject(root);
  const size2 = box2.getSize(new THREE.Vector3());
  const center2 = box2.getCenter(new THREE.Vector3());
  controls.target.copy(center2);
  controls.target.y = Math.min(center2.y + size2.y * 0.08, size2.y * 0.55);
  const dist = Math.max(size2.y * 1.35, size2.x * 1.8, 2.6);
  camera.position.set(dist * 0.25, controls.target.y + size2.y * 0.05, dist);
  controls.update();
  return size2;
}

async function bootPmx() {
  setStatus('加载 PMX…');
  const mesh = await new Promise((resolve, reject) => {
    new MMDLoader().load(PMX_URL, resolve, undefined, reject);
  });
  normalizeAndFrame(mesh);
  const created = applyGenshinMaterials(mesh, sharedToon);
  materials.length = 0;
  materials.push(...created);
  character = mesh;
  scene.add(mesh);

  const partVis = createPartVisibility(created);
  const panel = document.getElementById('partPanel');
  if (panel) mountPartVisibilityUI(panel, partVis);

  setStatus(`PMX 卡通着色 · ${created.length} mats（显示正常）`);
}

async function bootFbx() {
  setStatus('打包贴图并加载 FBX…');
  const textures = await loadNahidaTextures();
  const fbx = await new Promise((resolve, reject) => {
    new FBXLoader().load(FBX_URL, resolve, undefined, reject);
  });
  normalizeAndFrame(fbx);
  const created = applyOfficialMaterials(fbx, textures, sharedOfficial);
  materials.length = 0;
  materials.push(...created);
  character = fbx;
  scene.add(fbx);

  const partVis = createPartVisibility(created);
  const panel = document.getElementById('partPanel');
  if (panel) mountPartVisibilityUI(panel, partVis);

  setStatus(
    `FBX 实验中 · ${created.length} mats · 此资源 Body/Body_UV1 UV 分裂，贴图尚未完全对齐`,
  );
}

async function boot() {
  document.body.dataset.model = mode;
  document.getElementById('modelPmx')?.classList.toggle('active', mode === 'pmx');
  document.getElementById('modelFbx')?.classList.toggle('active', mode === 'fbx');
  bindSharedRanges();
  try {
    if (mode === 'fbx') await bootFbx();
    else await bootPmx();
    syncLightUniforms();
  } catch (err) {
    console.error(err);
    setStatus(`加载失败: ${err?.message || err}`, true);
  }
}

boot();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  syncLightUniforms();
  effect.render(scene, camera);
}
animate();
