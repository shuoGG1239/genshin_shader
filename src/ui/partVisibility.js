/**
 * Group MMD materials into toggleable body parts.
 * Returns { groups, setVisible, setAll }
 */

const PART_DEFS = [
  {
    id: 'face',
    label: '脸',
    match: (n, mat) =>
      mat?.userData?.matType === 'face' ||
      (/face|mouth|tooth|eyebrow|颜|顔|口|歯|眉/.test(n) && !/eye/.test(n)),
  },
  {
    id: 'eyes',
    label: '眼睛',
    match: (n) => /eye|lash|目|睫/.test(n),
  },
  {
    id: 'hair',
    label: '头发',
    match: (n, mat) => mat?.userData?.matType === 'hair' || /hair|髪|发|髮/.test(n),
  },
  {
    id: 'dress',
    label: '裙子',
    match: (n, mat) =>
      (mat?.userData?.matType === 'body' && /dress/.test(n)) ||
      (!mat?.userData?.matType && /dress/.test(n)),
  },
  {
    id: 'body',
    label: '身体',
    match: (n, mat) =>
      (mat?.userData?.matType === 'body' && !/dress/.test(n)) ||
      n === 'body' ||
      n === 'body_neck' ||
      (/body|skin|cloth|sleeve|cloak|pant|shoe/.test(n) && !/dress/.test(n)),
  },
  {
    id: 'body_extra',
    label: '身体细节',
    match: (n) => /body_vag|vag/.test(n),
  },
  {
    id: 'sleeves',
    label: '袖子',
    match: (n, mat) => !mat?.userData?.matType && /sleeve/.test(n),
  },
  {
    id: 'cloak',
    label: '斗篷',
    match: (n, mat) => !mat?.userData?.matType && /cloak/.test(n),
  },
  {
    id: 'pants',
    label: '裤子',
    match: (n, mat) => !mat?.userData?.matType && /pant|裤/.test(n),
  },
  {
    id: 'shoes',
    label: '鞋子',
    match: (n, mat) => !mat?.userData?.matType && /shoe|feet|靴|足/.test(n) && !/hide/.test(n),
  },
  {
    id: 'accessories',
    label: '饰品',
    match: (n, mat) =>
      !mat?.userData?.matType && /bracelet|deco|饰|环/.test(n) && !/hair|dress|cloak/.test(n),
  },
];

function norm(name = '') {
  return String(name).toLowerCase();
}

function isHideMaterial(mat) {
  const n = norm(mat.name);
  // forceHidden from dual-mesh UV routing should stay out of UI toggles
  return /_hide$|^hide/.test(n) || mat.userData?.forceHidden === true;
}

export function createPartVisibility(materials) {
  // Keep MMD "*_hide" mats permanently off
  for (const m of materials) {
    if (isHideMaterial(m)) {
      m.visible = false;
      m.userData.forceHidden = true;
    }
  }

  const claimed = new Set();
  const groups = [];
  for (const def of PART_DEFS) {
    const mats = materials.filter((m) => {
      if (isHideMaterial(m) || claimed.has(m)) return false;
      return def.match(norm(m.name), m);
    });
    if (!mats.length) continue;
    mats.forEach((m) => claimed.add(m));
    groups.push({ id: def.id, label: def.label, materials: mats });
  }

  const others = materials.filter((m) => !isHideMaterial(m) && !claimed.has(m));
  if (others.length) {
    groups.push({
      id: 'other',
      label: '其他',
      materials: others,
    });
  }

  // Individual entries for fine control
  const items = materials
    .filter((m) => !isHideMaterial(m))
    .map((m) => ({
      id: `mat:${m.uuid}`,
      label: m.name || 'unnamed',
      materials: [m],
    }));

  function setGroupVisible(groupId, visible) {
    const g = groups.find((x) => x.id === groupId);
    if (!g) return;
    for (const m of g.materials) {
      if (m.userData.forceHidden) continue;
      m.visible = visible;
    }
  }

  function setMaterialVisible(uuid, visible) {
    const m = materials.find((x) => x.uuid === uuid);
    if (!m || m.userData.forceHidden) return;
    m.visible = visible;
  }

  function setAll(visible) {
    for (const m of materials) {
      if (m.userData.forceHidden) continue;
      m.visible = visible;
    }
  }

  function isGroupVisible(groupId) {
    const g = groups.find((x) => x.id === groupId);
    if (!g || !g.materials.length) return false;
    return g.materials.some((m) => m.visible);
  }

  return {
    groups,
    items,
    setGroupVisible,
    setMaterialVisible,
    setAll,
    isGroupVisible,
  };
}

/** Build checkbox UI into container element */
export function mountPartVisibilityUI(container, partVis) {
  container.innerHTML = '';

  const toolbar = document.createElement('div');
  toolbar.className = 'part-toolbar';
  toolbar.innerHTML = `
    <button type="button" data-act="all-on">全部显示</button>
    <button type="button" data-act="all-off">全部隐藏</button>
  `;
  container.appendChild(toolbar);

  toolbar.addEventListener('click', (e) => {
    const act = e.target?.dataset?.act;
    if (act === 'all-on') {
      partVis.setAll(true);
      syncChecks();
    } else if (act === 'all-off') {
      partVis.setAll(false);
      syncChecks();
    }
  });

  const section = document.createElement('div');
  section.className = 'part-section-title';
  section.textContent = '部件';
  container.appendChild(section);

  const groupBox = document.createElement('div');
  groupBox.className = 'part-list';
  for (const g of partVis.groups) {
    const row = document.createElement('label');
    row.className = 'part-row';
    row.innerHTML = `
      <span>${g.label}<small>${g.materials.length}</small></span>
      <input type="checkbox" data-group="${g.id}" checked />
    `;
    groupBox.appendChild(row);
  }
  container.appendChild(groupBox);

  const detailTitle = document.createElement('div');
  detailTitle.className = 'part-section-title';
  detailTitle.textContent = '材质明细';
  container.appendChild(detailTitle);

  const detailBox = document.createElement('div');
  detailBox.className = 'part-list part-list-detail';
  for (const item of partVis.items) {
    const row = document.createElement('label');
    row.className = 'part-row';
    const mat = item.materials[0];
    row.innerHTML = `
      <span title="${item.label}">${item.label}</span>
      <input type="checkbox" data-mat="${mat.uuid}" ${mat.visible ? 'checked' : ''} />
    `;
    detailBox.appendChild(row);
  }
  container.appendChild(detailBox);

  function syncChecks() {
    for (const input of groupBox.querySelectorAll('input[data-group]')) {
      input.checked = partVis.isGroupVisible(input.dataset.group);
    }
    for (const input of detailBox.querySelectorAll('input[data-mat]')) {
      const m = partVis.items.find((i) => i.materials[0].uuid === input.dataset.mat)?.materials[0];
      if (m) input.checked = !!m.visible;
    }
  }

  groupBox.addEventListener('change', (e) => {
    const id = e.target?.dataset?.group;
    if (!id) return;
    partVis.setGroupVisible(id, e.target.checked);
    syncChecks();
  });

  detailBox.addEventListener('change', (e) => {
    const uuid = e.target?.dataset?.mat;
    if (!uuid) return;
    partVis.setMaterialVisible(uuid, e.target.checked);
    syncChecks();
  });

  syncChecks();
  return { syncChecks };
}
