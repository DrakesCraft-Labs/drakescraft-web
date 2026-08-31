/**
 * 👁️ EL OJO DIVINO DE ATENEA · 3D VOXEL ENGINE & REALTIME HUD
 * Renderiza el Mini-Minecraft en Three.js y sincroniza la telemetría en tiempo real
 */

let currentTelemetry = null;
let viewMode = '3D'; // '3D' o '2D'
let maxRadarDistance = 16; // Metros

// Variables Three.js
let scene, camera, renderer, voxelGroup, entityGroup, saoriGroup;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
let cameraAngle = { theta: Math.PI / 4, phi: Math.PI / 5, distance: 18 };
let canvas2D, ctx2D, sweepAngle = 0;

// Paleta de Colores de Vóxeles de Minecraft
const voxelColorPalette = {
  1: { color: 0x55a828, name: 'Césped' },        // grass_block
  2: { color: 0x785135, name: 'Tierra' },        // dirt
  3: { color: 0x727272, name: 'Piedra' },        // stone
  4: { color: 0x555555, name: 'Adoquín' },       // cobblestone
  5: { color: 0x33353b, name: 'Pizarra Profunda' }, // deepslate
  6: { color: 0x6d4c30, name: 'Tronco Roble' },  // oak_log
  7: { color: 0x3a7820, opacity: 0.85, name: 'Hojas Roble' }, // oak_leaves
  8: { color: 0x4f202b, name: 'Tronco Cerezo' }, // cherry_log
  9: { color: 0xffaec9, opacity: 0.9, name: 'Hojas Cerezo' }, // cherry_leaves
  10: { color: 0x403123, name: 'Tronco Abeto' }, // spruce_log
  11: { color: 0x2d4f29, opacity: 0.85, name: 'Hojas Abeto' }, // spruce_leaves
  12: { color: 0x1e88e5, opacity: 0.65, name: 'Agua' }, // water
  13: { color: 0xdcc78a, name: 'Arena' },        // sand
  14: { color: 0x80deea, opacity: 0.35, name: 'Cristal' }, // glass
  15: { color: 0xa66528, name: 'Cofre' },        // chest
  16: { color: 0x8d6e63, name: 'Mesa Crafteo' }, // crafting_table
  17: { color: 0x546e7a, name: 'Horno' },        // furnace
  18: { color: 0x00e5ff, name: 'Bloque Diamante', emissive: 0x006688 }, // diamond_block
  19: { color: 0x00e676, name: 'Bloque Esmeralda' }, // emerald_block
  20: { color: 0xffd700, name: 'Bloque Oro', emissive: 0x665500 }, // gold_block
  21: { color: 0xeeeeee, name: 'Bloque Hierro' }, // iron_block
  22: { color: 0xd87040, name: 'Bloque Cobre' }, // copper_block
  23: { color: 0xff4081, name: 'Flor' },         // flower
  24: { color: 0xffea00, emissive: 0xffaa00, name: 'Antorcha' }, // torch
  25: { color: 0x90a4ae, name: 'Bloque' }        // other
};

const itemEmojiMap = {
  diamond_sword: '⚔️', diamond_pickaxe: '⛏️', diamond_axe: '🪓', diamond_shovel: '💎',
  bread: '🍞', cooked_beef: '🥩', golden_carrot: '🥕', baked_potato: '🥔',
  torch: '🕯️', emerald: '❇️', cherry_log: '🌸', spruce_log: '🌲', oak_log: '🪵',
  jungle_log: '🌴', amethyst_shard: '🔮', end_rod: '⚡', copper_block: '🧱',
  written_book: '📜', enchanted_book: '✨', stick: '🥢', mutton: '🍖', grass_block: '🌱'
};

window.addEventListener('DOMContentLoaded', () => {
  init3DWorld();
  init2DRadar();
  initInventoryGrid();
  initViewTabs();
  startTelemetryLoops();
  requestAnimationFrame(mainAnimationLoop);
});

// ── 1. INICIALIZACIÓN DEL MUNDO 3D (THREE.JS) ─────────────────────────────
function init3DWorld() {
  const container = document.getElementById('three-viewport');
  if (!container || typeof THREE === 'undefined') return;

  const width = container.clientWidth || 500;
  const height = container.clientHeight || 500;

  // Escena
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060b13);
  scene.fog = new THREE.FogExp2(0x060b13, 0.025);

  // Cámara
  camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 100);
  updateCameraPosition();

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.innerHTML = '';
  container.appendChild(renderer.domElement);

  // Iluminación
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xfff3d6, 1.2);
  dirLight.position.set(15, 25, 15);
  dirLight.castShadow = true;
  dirLight.name = 'sunLight';
  scene.add(dirLight);

  // Luz divina de Atenea
  const goddessLight = new THREE.PointLight(0xffd700, 1.5, 12);
  goddessLight.position.set(0, 2, 0);
  scene.add(goddessLight);

  // Grid Guía de Suelo
  const gridHelper = new THREE.GridHelper(20, 20, 0x00e5ff, 0x0a2233);
  gridHelper.position.y = -0.5;
  scene.add(gridHelper);

  // Grupos de Objetos
  voxelGroup = new THREE.Group();
  entityGroup = new THREE.Group();
  scene.add(voxelGroup);
  scene.add(entityGroup);

  // Modelo 3D de Saori (Atenea)
  createSaoriAvatar();

  // Controles Interactivos con Ratón y Touch
  setupMouseControls(container);

  window.addEventListener('resize', onWindowResize);
}

function updateCameraPosition() {
  const x = cameraAngle.distance * Math.sin(cameraAngle.phi) * Math.sin(cameraAngle.theta);
  const y = cameraAngle.distance * Math.cos(cameraAngle.phi);
  const z = cameraAngle.distance * Math.sin(cameraAngle.phi) * Math.cos(cameraAngle.theta);

  camera.position.set(x, y, z);
  camera.lookAt(0, 0.8, 0);
}

function setupMouseControls(container) {
  container.addEventListener('mousedown', (e) => {
    isDragging = true;
    previousMousePosition = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('mouseup', () => { isDragging = false; });

  container.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - previousMousePosition.x;
    const deltaY = e.clientY - previousMousePosition.y;

    cameraAngle.theta -= deltaX * 0.008;
    cameraAngle.phi = Math.max(0.1, Math.min(Math.PI / 2.1, cameraAngle.phi - deltaY * 0.008));
    updateCameraPosition();

    previousMousePosition = { x: e.clientX, y: e.clientY };
  });

  container.addEventListener('wheel', (e) => {
    e.preventDefault();
    cameraAngle.distance = Math.max(6, Math.min(36, cameraAngle.distance + e.deltaY * 0.03));
    updateCameraPosition();
  }, { passive: false });

  // Botón Reset Cámara
  document.getElementById('btn-cam-reset')?.addEventListener('click', () => {
    cameraAngle = { theta: Math.PI / 4, phi: Math.PI / 5, distance: 18 };
    updateCameraPosition();
  });
}

function onWindowResize() {
  const container = document.getElementById('three-viewport');
  if (!container || !renderer || !camera) return;
  const width = container.clientWidth;
  const height = container.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

// ── 2. MODELO 3D DE SAORISTAR (DIOSA ATENEA) ──────────────────────────────
function createSaoriAvatar() {
  saoriGroup = new THREE.Group();

  const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.3, metalness: 0.8, emissive: 0x332200 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdfc4, roughness: 0.6 });

  // Cabeza
  const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const head = new THREE.Mesh(headGeo, skinMat);
  head.position.y = 1.6;
  saoriGroup.add(head);

  // Tiara / Corona de Laurel Dorada
  const crownGeo = new THREE.BoxGeometry(0.54, 0.12, 0.54);
  const crown = new THREE.Mesh(crownGeo, goldMat);
  crown.position.y = 1.8;
  saoriGroup.add(crown);

  // Torso / Túnica Quitón
  const bodyGeo = new THREE.BoxGeometry(0.55, 0.75, 0.3);
  const body = new THREE.Mesh(bodyGeo, whiteMat);
  body.position.y = 0.95;
  saoriGroup.add(body);

  // Pechera de Oro
  const chestGeo = new THREE.BoxGeometry(0.57, 0.4, 0.32);
  const chest = new THREE.Mesh(chestGeo, goldMat);
  chest.position.y = 1.05;
  saoriGroup.add(chest);

  // Piernas
  const legGeo = new THREE.BoxGeometry(0.24, 0.7, 0.26);
  const legL = new THREE.Mesh(legGeo, whiteMat);
  legL.position.set(-0.14, 0.35, 0);
  const legR = new THREE.Mesh(legGeo, whiteMat);
  legR.position.set(0.14, 0.35, 0);
  saoriGroup.add(legL);
  saoriGroup.add(legR);

  // Brazos
  const armGeo = new THREE.BoxGeometry(0.2, 0.7, 0.2);
  const armL = new THREE.Mesh(armGeo, skinMat);
  armL.position.set(-0.4, 0.95, 0);
  const armR = new THREE.Mesh(armGeo, skinMat);
  armR.position.set(0.4, 0.95, 0);
  saoriGroup.add(armL);
  saoriGroup.add(armR);

  // Escudo Égida (Mano Izquierda)
  const shieldGeo = new THREE.BoxGeometry(0.08, 0.6, 0.4);
  const shield = new THREE.Mesh(shieldGeo, goldMat);
  shield.position.set(-0.52, 0.95, 0.15);
  saoriGroup.add(shield);

  // Anillo de Luz Sagrada en los pies
  const auraGeo = new THREE.RingGeometry(0.6, 0.9, 32);
  const auraMat = new THREE.MeshBasicMaterial({ color: 0xffd700, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
  const aura = new THREE.Mesh(auraGeo, auraMat);
  aura.rotation.x = Math.PI / 2;
  aura.position.y = 0.02;
  saoriGroup.add(aura);

  scene.add(saoriGroup);
}

// ── 3. ACTUALIZACIÓN DE VÓXELES 3D Y ENTIDADES ────────────────────────────
function update3DVoxelScene(data) {
  if (!scene || !voxelGroup || !data || !data.ready) return;

  // 1. Limpiar Vóxeles y Entidades Anteriores
  while (voxelGroup.children.length > 0) {
    const obj = voxelGroup.children[0];
    voxelGroup.remove(obj);
    if (obj.geometry) obj.geometry.dispose();
  }
  while (entityGroup.children.length > 0) {
    const obj = entityGroup.children[0];
    entityGroup.remove(obj);
    if (obj.geometry) obj.geometry.dispose();
  }

  // 2. Reconstruir Bloques / Vóxeles
  const voxels = data.voxelWorld?.voxels || [];
  const boxGeo = new THREE.BoxGeometry(0.96, 0.96, 0.96);

  // Agrupar por tipo para crear materiales optimizados
  const matCache = {};

  voxels.forEach(([dx, dy, dz, typeIdx]) => {
    const info = voxelColorPalette[typeIdx] || voxelColorPalette[25];
    if (!matCache[typeIdx]) {
      matCache[typeIdx] = new THREE.MeshStandardMaterial({
        color: info.color,
        roughness: 0.7,
        metalness: 0.1,
        transparent: !!info.opacity,
        opacity: info.opacity || 1.0,
        emissive: info.emissive || 0x000000
      });
    }

    const cube = new THREE.Mesh(boxGeo, matCache[typeIdx]);
    cube.position.set(dx, dy, dz);
    cube.castShadow = true;
    cube.receiveShadow = true;
    voxelGroup.add(cube);
  });

  // 3. Rotar a Saori según su Yaw in-game
  if (saoriGroup && data.status.yaw !== undefined) {
    // Invertir Yaw para coordinar Minecraft -> Three.js
    saoriGroup.rotation.y = -data.status.yaw + Math.PI;
  }

  // 4. Renderizar Entidades 3D (Mobs, Jugadores)
  const all3D = data.nearbyEntities?.all3D || [];
  all3D.forEach(ent => {
    const { relPos, name, type, distance } = ent;
    if (!relPos) return;

    let entColor = 0xff3366; // Hostil
    let size = [0.6, 1.8, 0.6];

    if (type === 'player') {
      entColor = 0x00ff88;
    } else if (name.includes('creeper')) {
      entColor = 0x33cc33;
      size = [0.6, 1.4, 0.6];
    } else if (name.includes('spider')) {
      entColor = 0x882233;
      size = [1.2, 0.5, 1.2];
    } else if (name.includes('enderman')) {
      entColor = 0x111111;
      size = [0.5, 2.6, 0.5];
    } else if (type === 'animal') {
      entColor = 0xffaa00;
      size = [0.8, 0.8, 1.0];
    }

    const entGeo = new THREE.BoxGeometry(...size);
    const entMat = new THREE.MeshStandardMaterial({
      color: entColor,
      roughness: 0.4,
      emissive: type === 'player' ? 0x003311 : (name.includes('enderman') ? 0x330033 : 0x000000)
    });
    const entMesh = new THREE.Mesh(entGeo, entMat);
    entMesh.position.set(relPos.dx, relPos.dy + size[1] / 2, relPos.dz);
    entMesh.castShadow = true;
    entityGroup.add(entMesh);

    // Texto flotante con nombre
    createFloatingText(entityGroup, `${name} (${distance}m)`, relPos.dx, relPos.dy + size[1] + 0.4, relPos.dz, type === 'player' ? '#00ff88' : '#ff3366');
  });

  // 5. Ajustar iluminación según Ciclo Solar
  const sunLight = scene.getObjectByName('sunLight');
  if (sunLight) {
    if (data.status.isDay) {
      sunLight.color.setHex(0xfff3d6);
      sunLight.intensity = 1.3;
      scene.background.setHex(0x0a1424);
    } else {
      sunLight.color.setHex(0x4a77b4);
      sunLight.intensity = 0.5;
      scene.background.setHex(0x03060a);
    }
  }
}

function createFloatingText(group, text, x, y, z, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, 256, 64);
  ctx.font = 'bold 24px Rajdhani';
  ctx.fillStyle = color || '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(text, 128, 42);

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.position.set(x, y, z);
  sprite.scale.set(2, 0.5, 1);
  group.add(sprite);
}

// ── 4. TABS & CONTROLADORES DE MODO DE VISTA ──────────────────────────────
function initViewTabs() {
  const btn3D = document.getElementById('btn-mode-3d');
  const btn2D = document.getElementById('btn-mode-2d');
  const viewTitle = document.getElementById('view-title');
  const threeView = document.getElementById('three-viewport');
  const radarCanvas = document.getElementById('radar-canvas');

  btn3D?.addEventListener('click', () => {
    viewMode = '3D';
    btn3D.classList.add('active');
    btn2D.classList.remove('active');
    viewTitle.textContent = 'RECONSTRUCCIÓN 3D EN VIVO';
    threeView.style.display = 'block';
    radarCanvas.style.display = 'none';
  });

  btn2D?.addEventListener('click', () => {
    viewMode = '2D';
    btn2D.classList.add('active');
    btn3D.classList.remove('active');
    viewTitle.textContent = 'RADAR TÁCTICO 2D';
    threeView.style.display = 'none';
    radarCanvas.style.display = 'block';
  });
}

// ── 5. RADAR TÁCTICO 2D CLÁSICO ───────────────────────────────────────────
function init2DRadar() {
  canvas2D = document.getElementById('radar-canvas');
  if (canvas2D) ctx2D = canvas2D.getContext('2d');
}

function render2DRadar() {
  if (!ctx2D || viewMode !== '2D') return;

  const width = canvas2D.clientWidth || 500;
  const height = canvas2D.clientHeight || 500;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) / 2 - 15;

  ctx2D.clearRect(0, 0, width, height);

  // Anillos
  [0.25, 0.5, 0.75, 1.0].forEach(r => {
    ctx2D.beginPath();
    ctx2D.arc(cx, cy, radius * r, 0, Math.PI * 2);
    ctx2D.strokeStyle = 'rgba(0, 229, 255, 0.2)';
    ctx2D.stroke();
  });

  // Barrido
  sweepAngle = (sweepAngle + 0.03) % (Math.PI * 2);
  ctx2D.save();
  ctx2D.beginPath();
  ctx2D.moveTo(cx, cy);
  ctx2D.arc(cx, cy, radius, sweepAngle - 0.2, sweepAngle);
  ctx2D.closePath();
  ctx2D.fillStyle = 'rgba(0, 229, 255, 0.2)';
  ctx2D.fill();
  ctx2D.restore();

  // Saori Centro
  ctx2D.beginPath();
  ctx2D.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx2D.fillStyle = '#ffd700';
  ctx2D.fill();

  // Hostiles y Jugadores
  if (currentTelemetry && currentTelemetry.ready) {
    const pos = currentTelemetry.status.position;
    const hostiles = currentTelemetry.nearbyEntities?.hostiles || [];
    hostiles.forEach(h => {
      const dx = (h.pos.x - pos.x);
      const dz = (h.pos.z - pos.z);
      const dist = Math.hypot(dx, dz);
      if (dist <= 32) {
        const sx = cx + (dx / 32) * radius;
        const sy = cy + (dz / 32) * radius;
        ctx2D.beginPath();
        ctx2D.arc(sx, sy, 4, 0, Math.PI * 2);
        ctx2D.fillStyle = '#ff3366';
        ctx2D.fill();
        ctx2D.fillStyle = '#ffffff';
        ctx2D.font = '10px Rajdhani';
        ctx2D.fillText(`${h.name} (${h.distance}m)`, sx, sy - 6);
      }
    });
  }
}

// ── 6. LOOP DE TELEMETRÍA Y ANIMACIÓN PRINCIPAL ──────────────────────────
function startTelemetryLoops() {
  fetchTelemetry();
  fetchThoughts();

  setInterval(fetchTelemetry, 1000);
  setInterval(fetchThoughts, 3000);
}

async function fetchTelemetry() {
  try {
    const res = await fetch('/api/saori/telemetry');
    if (res.ok) {
      const data = await res.json();
      if (data && data.ready) {
        currentTelemetry = data;
        updateHUD(data);
        update3DVoxelScene(data);
        document.getElementById('conn-status').textContent = 'ENLACE NEURONAL ACTIVO';
        document.getElementById('conn-status').style.color = 'var(--cyan-neon)';
      }
    }
  } catch (e) {}
}

async function fetchThoughts() {
  try {
    const res = await fetch('/api/saori/thoughts');
    if (res.ok) {
      const thoughts = await res.json();
      if (Array.isArray(thoughts) && thoughts.length > 0) {
        const stream = document.getElementById('thought-stream');
        stream.innerHTML = '';
        thoughts.forEach(appendThought);
      }
    }
  } catch (e) {}
}

function mainAnimationLoop() {
  if (viewMode === '3D' && renderer && scene && camera) {
    renderer.render(scene, camera);
  } else if (viewMode === '2D') {
    render2DRadar();
  }
  requestAnimationFrame(mainAnimationLoop);
}

// ── 7. ACTUALIZADORES DE DOM (VITALES, INVENTARIO, PENSAMIENTOS) ───────────
function updateHUD(data) {
  if (!data || !data.ready) return;

  const health = data.status.health || 20;
  const food = data.status.food || 20;
  document.getElementById('health-val').textContent = `${health.toFixed(1)} / 20`;
  document.getElementById('health-fill').style.width = `${Math.min(100, (health / 20) * 100)}%`;

  document.getElementById('food-val').textContent = `${food} / 20`;
  document.getElementById('food-fill').style.width = `${(food / 20) * 100}%`;

  document.getElementById('coord-x').textContent = data.status.position.x;
  document.getElementById('coord-y').textContent = data.status.position.y;
  document.getElementById('coord-z').textContent = data.status.position.z;
  document.getElementById('server-dim').textContent = (data.status.dimension || 'OVERWORLD').toUpperCase();

  const timeOfDay = data.status.timeOfDay || 0;
  const isDay = data.status.isDay;
  document.getElementById('time-icon').textContent = isDay ? '☀️' : '🌙';
  document.getElementById('time-text').textContent = isDay ? 'DÍA SOLAR' : 'NOCHE DIVINA';
  document.getElementById('time-tick').textContent = `Tick: ${timeOfDay}`;
  document.getElementById('time-fill').style.width = `${((timeOfDay % 24000) / 24000) * 100}%`;

  updateInventoryGrid(data.inventory);
}

function initInventoryGrid() {
  const mainGrid = document.getElementById('inv-grid-main');
  const hotbarGrid = document.getElementById('inv-grid-hotbar');
  if (!mainGrid || !hotbarGrid) return;

  mainGrid.innerHTML = '';
  hotbarGrid.innerHTML = '';

  for (let i = 9; i <= 35; i++) {
    const slot = document.createElement('div');
    slot.className = 'inv-slot';
    slot.id = `slot-${i}`;
    mainGrid.appendChild(slot);
  }
  for (let i = 36; i <= 44; i++) {
    const slot = document.createElement('div');
    slot.className = 'inv-slot';
    slot.id = `slot-${i}`;
    hotbarGrid.appendChild(slot);
  }
}

function updateInventoryGrid(invData) {
  if (!invData || !invData.items) return;

  document.querySelectorAll('.inv-slot').forEach(el => {
    el.innerHTML = '';
    el.className = 'inv-slot';
  });

  document.getElementById('total-food-count').textContent = `🥩 Comida: ${invData.foodCount || 0}`;
  const totalMats = Object.values(invData.materials || {}).reduce((a, b) => a + b, 0);
  document.getElementById('total-mats-count').textContent = `🪵 Materiales: ${totalMats}`;

  invData.items.forEach(item => {
    const slotEl = document.getElementById(`slot-${item.slot}`);
    if (slotEl) {
      slotEl.classList.add('occupied');
      const emoji = itemEmojiMap[item.name] || '📦';
      slotEl.innerHTML = `<span class="slot-icon">${emoji}</span>${item.count > 1 ? `<span class="slot-count">${item.count}</span>` : ''}`;
      slotEl.title = `${item.name.replace(/_/g, ' ')} (x${item.count})`;
    }
  });
}

function appendThought(entry) {
  const stream = document.getElementById('thought-stream');
  if (!stream) return;
  const div = document.createElement('div');
  div.className = `thought-entry ${entry.type || 'system'}`;
  div.innerHTML = `<span class="time">[${entry.time}]</span> <span class="content">${entry.text}</span>`;
  stream.insertBefore(div, stream.firstChild);
}

window.sendQuickAction = function(action, message) {
  fetch('/api/saori/cmd', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, message, args: message })
  }).then(res => res.json()).then(() => {
    appendThought({ time: new Date().toLocaleTimeString(), type: 'action', text: `Comando enviado: ${message}` });
  });
};
