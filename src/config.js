/** App paths & query-string model mode */

export const PATHS = {
  pmx: '/models/pmx/Nahida/Nahida_R18_v1.1.pmx',
  fbx: '/models/fbx/Nahida/Nahida.fbx',
  /** Official texture directory for FBX pipeline */
  fbxTextures: '/models/fbx/Nahida',
};

export function getModelMode() {
  const params = new URLSearchParams(location.search);
  return params.get('model') === 'fbx' ? 'fbx' : 'pmx';
}
