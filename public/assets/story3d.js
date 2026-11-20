// A real 3D first-person flight for the home story: a dim study, a book, a door, and the world beyond it.
// Driven only by scroll progress (reversible); renders on demand. No external assets except the landscape photo.
import * as THREE from './vendor/three.module.min.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const smooth = t => t * t * (3 - 2 * t);
const smoother = t => t * t * t * (t * (t * 6 - 15) + 10);
const fade = (p, a, b) => smooth(clamp((p - a) / (b - a)));
const bump = (p, a, b, c, d) => fade(p, a, b) * (1 - fade(p, c, d));
const lerp = (a, b, t) => a + (b - a) * t;
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

// Captions: no title while the camera is travelling between chapters; chapter 5 (passage) has none.
const DEAD = [[.09, .15], [.28, .35], [.44, .49], [.66, .93]];
export function caption3d(p, active) {
  const dead = DEAD.some(([a, b]) => p >= a && p <= b);
  return { caption: dead || active === 4 ? -1 : active, captionRest: active === 4 ? -1 : active };
}

const STOPS = [0, .22, .40, .57, .80, 1];
// Camera knots: [progress or null for via-points, position]. Via-points only shape the curve.
const CAMERA = [
  [0, v3(.42, 1.22, .78)], [.22, v3(-.30, 1.50, 1.55)], [null, v3(.75, 1.75, -.6)], [null, v3(.35, 1.65, -2.0)],
  [.40, v3(.05, 1.55, -2.70)], [.57, v3(0, 1.52, -4.45)], [null, v3(0, 1.55, -5.6)], [null, v3(0, 1.58, -6.0)],
  [null, v3(0, 1.62, -6.8)], [.80, v3(0, 1.62, -7.40)], [null, v3(-.2, 2.1, -9.8)], [1, v3(-.30, 2.60, -12.5)]
];
const LOOK = [v3(.02, .80, -.02), v3(0, 1.30, -.40), v3(0, 1.42, -6), v3(0, 1.45, -9), v3(-.6, 1.9, -30), v3(.1, 1.5, -24)];
const FOV = [38, 44, 48, 50, 58, 54];
const NODES = [['의도', v3(-.06, 1.72, -.34)], ['감각', v3(.44, 1.50, -.36)], ['피드백', v3(-.58, 1.20, -.06)], ['질문', v3(.12, 1.12, .06)]];
const LINKS = [[0, 1], [1, 3], [3, 2], [2, 0], [0, 3]];

function canvasTexture(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4; return t;
}
const rand = seed => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

function glowTexture() {
  return canvasTexture(128, 128, (g, w) => {
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,248,220,1)'); r.addColorStop(.18, 'rgba(255,230,168,.75)');
    r.addColorStop(.5, 'rgba(240,208,155,.18)'); r.addColorStop(1, 'rgba(240,208,155,0)');
    g.fillStyle = r; g.fillRect(0, 0, w, w);
  });
}
function noiseTexture(base, speck, seed, lines = 0) {
  const R = rand(seed);
  const t = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${speck},${(R() * .07).toFixed(3)})`; g.fillRect(R() * w, R() * h, 1 + R() * 3, 1 + R() * 3); }
    for (let i = 0; i < lines; i++) { const y = (i + .5) * h / lines; g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, y, w, 2); g.fillStyle = `rgba(${speck},.05)`; g.fillRect(0, y + 2, w, 1); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

// The landscape photo, cropped to the view inside its own doorway and feathered into a wide haze band,
// wrapped on a distant cylinder so the far world surrounds you instead of hanging as a poster.
function backdropTexture(img, small) {
  const W = small ? 1536 : 3072, H = small ? 512 : 1024, s = W / 3072;
  const sx = img.naturalWidth * .478, sy = img.naturalHeight * .085, sw = img.naturalWidth * .435, sh = img.naturalHeight * .535;
  const cw = 1056 * s, ch = cw * sh / sw, cx = (W - cw) / 2, cy = H - 180 * s - ch;
  let top = '#9fb3c9', horizon = '#e9d6b4', low = '#cfd5c4';
  return { horizon, texture: canvasTexture(W, H, (g) => {
    const probe = document.createElement('canvas'); probe.width = 8; probe.height = 8;
    const pg = probe.getContext('2d'); pg.drawImage(img, sx, sy, sw, sh, 0, 0, 8, 8);
    const px = (x, y) => { const d = pg.getImageData(x, y, 1, 1).data; return `rgb(${d[0]},${d[1]},${d[2]})`; };
    top = px(5, 0); horizon = px(4, 6); low = px(4, 7);
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, top); sky.addColorStop((cy + ch * .55) / H, horizon); sky.addColorStop((cy + ch) / H, horizon); sky.addColorStop(1, horizon);
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    const crop = document.createElement('canvas'); crop.width = Math.round(cw); crop.height = Math.round(ch);
    const cg = crop.getContext('2d'); cg.drawImage(img, sx, sy, sw, sh, 0, 0, crop.width, crop.height);
    cg.globalCompositeOperation = 'destination-in';
    const fx = cg.createLinearGradient(0, 0, crop.width, 0);
    fx.addColorStop(0, 'rgba(0,0,0,0)'); fx.addColorStop(.12, '#000'); fx.addColorStop(.88, '#000'); fx.addColorStop(1, 'rgba(0,0,0,0)');
    cg.fillStyle = fx; cg.fillRect(0, 0, crop.width, crop.height);
    const fy = cg.createLinearGradient(0, 0, 0, crop.height);
    fy.addColorStop(0, 'rgba(0,0,0,0)'); fy.addColorStop(.1, '#000'); fy.addColorStop(.9, '#000'); fy.addColorStop(1, 'rgba(0,0,0,0)');
    cg.fillStyle = fy; cg.fillRect(0, 0, crop.width, crop.height);
    g.drawImage(crop, cx, cy);
  }), get colors() { return { top, horizon, low }; } };
}

// Arc-length camera with C1-continuous speed: slow near each chapter stop, never a dead stop, no lurch at joins.
function cameraRig() {
  const pos = new THREE.CatmullRomCurve3(CAMERA.map(k => k[1]), false, 'centripetal');
  const look = new THREE.CatmullRomCurve3(LOOK, false, 'centripetal');
  const lengths = pos.getLengths(2000), total = lengths[lengths.length - 1], n = CAMERA.length - 1;
  const uOfKnot = i => lengths[Math.round(i / n * 2000)] / total;
  const stopU = CAMERA.map((k, i) => k[0] === null ? null : uOfKnot(i)).filter(u => u !== null);
  const secant = stopU.slice(1).map((u, i) => (u - stopU[i]) / (STOPS[i + 1] - STOPS[i]));
  const tangent = stopU.map((_, i) => .3 * Math.min(secant[Math.max(0, i - 1)], secant[Math.min(secant.length - 1, i)]));
  function map(p) {
    let k = 0; while (k < STOPS.length - 2 && p > STOPS[k + 1]) k++;
    const h = STOPS[k + 1] - STOPS[k], t = clamp((p - STOPS[k]) / h);
    const h00 = 2 * t ** 3 - 3 * t * t + 1, h10 = t ** 3 - 2 * t * t + t, h01 = -2 * t ** 3 + 3 * t * t, h11 = t ** 3 - t * t;
    const u = h00 * stopU[k] + h10 * h * tangent[k] + h01 * stopU[k + 1] + h11 * h * tangent[k + 1];
    return { u: clamp(u), k, f: clamp((u - stopU[k]) / (stopU[k + 1] - stopU[k])) };
  }
  return { pos, look, map };
}

export async function createStory3D({ stage, imageURL, small, onLost, onFrame, progress = () => 0, cancelled = () => false, whenShown = async () => {} }) {
  const img = new Image(); img.decoding = 'async'; img.src = imageURL; await img.decode();
  if (cancelled()) return null;
  await whenShown();
  if (cancelled()) return null;
  let renderer = null; const disposables = [];
  try {

  const host = document.createElement('div'); host.className = 'story-3d'; host.setAttribute('aria-hidden', 'true');
  const labels = document.createElement('div'); labels.className = 'story-3d-labels'; labels.setAttribute('aria-hidden', 'true');
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  let dprCap = small ? 1.25 : 1.5;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, dprCap));
  host.append(renderer.domElement);

  const scene = new THREE.Scene();
  const fogIn = new THREE.Color('#ebe6d8');
  const fog = new THREE.FogExp2(fogIn.clone(), .03); scene.fog = fog;
  const camera = new THREE.PerspectiveCamera(40, 1, .05, 420);
  const rig = cameraRig();
  const R = rand(7);
  const glow = glowTexture(); disposables.push(glow);
  const keep = x => (disposables.push(x), x);
  const lambert = (o) => keep(new THREE.MeshLambertMaterial(o));
  const add = (geo, mat, x = 0, y = 0, z = 0, parent = scene) => { const m = new THREE.Mesh(keep(geo), mat); m.position.set(x, y, z); parent.add(m); return m; };

  // ---- Room: x -2.4..2.4, y 0..3.2, z -6..2.5 -------------------------------------------------------
  const wallTex = keep(noiseTexture('#e9e4d4', '120,110,90', 3)); wallTex.repeat.set(1.2, .8);
  const wallMat = lambert({ color: '#ffffff', map: wallTex });
  const plankTex = keep(noiseTexture('#c9ad84', '242,230,205', 11, 6)); plankTex.repeat.set(2, 4);
  const floorMat = lambert({ color: '#ffffff', map: plankTex });
  const trimMat = lambert({ color: '#b9c4b5' });
  const floor = add(new THREE.PlaneGeometry(4.8, 8.5), floorMat, 0, 0, -1.75); floor.rotation.x = -Math.PI / 2;
  const ceil = add(new THREE.PlaneGeometry(4.8, 8.5), lambert({ color: '#f3efe4' }), 0, 3.2, -1.75); ceil.rotation.x = Math.PI / 2;
  const left = add(new THREE.PlaneGeometry(8.5, 3.2), wallMat, -2.4, 1.6, -1.75); left.rotation.y = Math.PI / 2;
  const right = add(new THREE.PlaneGeometry(8.5, 3.2), wallMat, 2.4, 1.6, -1.75); right.rotation.y = -Math.PI / 2;
  const back = add(new THREE.PlaneGeometry(4.8, 3.2), wallMat, 0, 1.6, 2.5); back.rotation.y = Math.PI;
  for (const x of [-2.39, 2.39]) { const rail = add(new THREE.BoxGeometry(.04, .06, 8.5), trimMat, x, .92, -1.75); rail.castShadow = false; }
  for (const z of [1.6, -.4, -2.6, -4.6]) add(new THREE.BoxGeometry(4.8, .16, .2), lambert({ color: '#ddd4bf' }), 0, 3.1, z);
  // Door wall with an arched opening (extruded, so the jambs have real depth).
  const wallShape = new THREE.Shape();
  wallShape.moveTo(-2.4, 0); wallShape.lineTo(-.65, 0); wallShape.lineTo(-.65, 1.95);
  wallShape.absarc(0, 1.95, .65, Math.PI, 0, true); wallShape.lineTo(.65, 0); wallShape.lineTo(2.4, 0); wallShape.lineTo(2.4, 3.2); wallShape.lineTo(-2.4, 3.2); wallShape.closePath();
  const doorWall = add(new THREE.ExtrudeGeometry(wallShape, { depth: .35, bevelEnabled: false, curveSegments: 24 }), wallMat, 0, 0, -6.35);
  // Outer face of the wall (seen from outside on the way back) shares the plaster.
  doorWall.material = wallMat;
  // Gold rim around the arch.
  const rimPts = [];
  for (let i = 0; i <= 12; i++) rimPts.push(v3(-.71, i / 12 * 1.95, -5.985));
  for (let i = 1; i < 32; i++) { const a = Math.PI - i / 32 * Math.PI; rimPts.push(v3(Math.cos(a) * .71, 1.95 + Math.sin(a) * .71, -5.985)); }
  for (let i = 12; i >= 0; i--) rimPts.push(v3(.71, i / 12 * 1.95, -5.985));
  const rimMat = keep(new THREE.MeshStandardMaterial({ color: '#e9e2cf', roughness: .8, metalness: 0 }));
  add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rimPts, false, 'centripetal'), 220, .028, 8), rimMat);
  // Door leaves, hinged at the jambs, opening outward.
  const leafMat = lambert({ color: '#9db3a3' }), panelMat = lambert({ color: '#87a08f' });
  const knobMat = keep(new THREE.MeshStandardMaterial({ color: '#c9a86a', metalness: .5, roughness: .4 }));
  function leaf(side) {
    const s = new THREE.Shape(), d = side; // d = +1 left leaf (extends +x from hinge), -1 right leaf
    s.moveTo(0, 0); s.lineTo(.645 * d, 0); s.lineTo(.645 * d, 2.595);
    if (d > 0) s.absarc(.645, 1.95, .645, Math.PI / 2, Math.PI, false); else s.absarc(-.645, 1.95, .645, Math.PI / 2, 0, true);
    s.lineTo(0, 0);
    const pivot = new THREE.Group(); pivot.position.set(-.65 * d, 0, -6.28); scene.add(pivot);
    const body = add(new THREE.ExtrudeGeometry(s, { depth: .06, bevelEnabled: true, bevelSize: .008, bevelThickness: .008, bevelSegments: 1, curveSegments: 16 }), leafMat, 0, 0, 0, pivot);
    body.position.z = -.03;
    add(new THREE.BoxGeometry(.42, .78, .02), panelMat, .33 * d, .62, .04, pivot);
    add(new THREE.BoxGeometry(.42, .86, .02), panelMat, .33 * d, 1.62, .04, pivot);
    add(new THREE.SphereGeometry(.028, 12, 8), knobMat, .58 * d, 1.02, .07, pivot);
    return pivot;
  }
  const leftLeaf = leaf(1), rightLeaf = leaf(-1);
  // Seam light before the door opens.
  const seamMat = keep(new THREE.MeshBasicMaterial({ color: '#f3c873', transparent: true, opacity: 0, blending: THREE.NormalBlending, depthWrite: false, fog: false }));
  const seam = add(new THREE.PlaneGeometry(.018, 2.5), seamMat, 0, 1.3, -6.235);
  const seamGlow = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: glow, color: '#ffd896', transparent: true, opacity: 0, blending: THREE.NormalBlending, depthWrite: false, fog: false })));
  seamGlow.scale.set(.9, 2.8, 1); seamGlow.position.set(0, 1.3, -6.15); scene.add(seamGlow);
  // Door light spill: floor wedge and soft shafts.
  const wedgeTex = keep(canvasTexture(256, 256, (g, w, h) => {
    const lg = g.createLinearGradient(0, 0, 0, h); lg.addColorStop(0, 'rgba(255,224,160,.85)'); lg.addColorStop(1, 'rgba(255,224,160,0)');
    g.fillStyle = lg; g.beginPath(); g.moveTo(w * .36, 0); g.lineTo(w * .64, 0); g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.fill();
  }));
  const wedgeMat = keep(new THREE.MeshBasicMaterial({ map: wedgeTex, transparent: true, opacity: 0, blending: THREE.NormalBlending, depthWrite: false }));
  const wedge = add(new THREE.PlaneGeometry(3.4, 4.2), wedgeMat, 0, .004, -3.9); wedge.rotation.x = -Math.PI / 2;
  const shaftTex = keep(canvasTexture(64, 256, (g, w, h) => {
    const lg = g.createLinearGradient(0, 0, 0, h); lg.addColorStop(0, 'rgba(255,230,175,.0)'); lg.addColorStop(.2, 'rgba(255,230,175,.5)'); lg.addColorStop(1, 'rgba(255,230,175,0)');
    g.fillStyle = lg; g.fillRect(0, 0, w, h);
    const hx = g.createLinearGradient(0, 0, w, 0); hx.addColorStop(0, 'rgba(0,0,0,1)'); hx.addColorStop(.5, 'rgba(0,0,0,0)'); hx.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = hx; g.fillRect(0, 0, w, h);
  }));
  const shafts = [-.38, 0, .38].map((x, i) => {
    const m = keep(new THREE.MeshBasicMaterial({ map: shaftTex, transparent: true, opacity: 0, blending: THREE.NormalBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    const s = add(new THREE.PlaneGeometry(.55, 4.6), m, x, 1.15, -4.4 + i * .1); s.rotation.set(-1.1, x * .35, 0); return s;
  });
  // Shelf with books on the left wall, desk, book.
  const woodMat = lambert({ color: '#a98462' });
  for (const y of [1.0, 1.45, 1.9]) add(new THREE.BoxGeometry(.28, .035, 2.4), woodMat, -2.24, y, -.2);
  const shelfBooks = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(1, 1, 1)), lambert({ color: '#ffffff' }), 42);
  { const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), c = new THREE.Color(); let i = 0;
    const tones = ['#5f8a73', '#8fae94', '#c9a86a', '#c98a5a', '#7d98a8', '#d8c8a0', '#a46b5e'];
    for (const y of [1.0, 1.45, 1.9]) { let z = -1.32; while (z < .95 && i < 42) { const t = .035 + R() * .04, h = .26 + R() * .12;
      sc.set(.2, h, t); q.setFromEuler(new THREE.Euler(R() < .1 ? .12 : 0, 0, 0)); m.compose(v3(-2.24, y + .02 + h / 2, z + t / 2), q, sc); shelfBooks.setMatrixAt(i, m);
      shelfBooks.setColorAt(i, c.set(tones[Math.floor(R() * tones.length)])); z += t + .006; i++; } }
    shelfBooks.count = i; scene.add(shelfBooks); }
  const deskMat = lambert({ color: '#b48d63' });
  add(new THREE.BoxGeometry(1.4, .05, .7), deskMat, 0, .755, 0);
  for (const [x, z] of [[-.64, -.3], [.64, -.3], [-.64, .3], [.64, .3]]) add(new THREE.BoxGeometry(.05, .73, .05), deskMat, x, .365, z);
  const shadowTex = keep(canvasTexture(128, 128, (g, w) => { const r = g.createRadialGradient(64, 64, 4, 64, 64, 64); r.addColorStop(0, 'rgba(0,0,0,.25)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, w, w); }));
  const contact = add(new THREE.PlaneGeometry(2.1, 1.3), keep(new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })), 0, .003, 0); contact.rotation.x = -Math.PI / 2;
  const pageTex = keep(canvasTexture(512, 256, (g, w, h) => {
    const lg = g.createLinearGradient(0, 0, w, 0); lg.addColorStop(0, '#c9cfb4'); lg.addColorStop(.48, '#e3e2cd'); lg.addColorStop(.52, '#e3e2cd'); lg.addColorStop(1, '#c9cfb4');
    g.fillStyle = lg; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(70,90,75,.45)'; g.lineWidth = 2;
    for (const [x0, x1] of [[40, 220], [292, 472]]) for (let y = 46; y < h - 30; y += 22) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x1 - (y % 3) * 18, y); g.stroke(); }
  }));
  const pageMat = keep(new THREE.MeshLambertMaterial({ map: pageTex, emissive: '#000000', side: THREE.DoubleSide }));
  function makeBook(parent, scale = 1) {
    const g = new THREE.Group(); parent.add(g); g.scale.setScalar(scale);
    add(new THREE.BoxGeometry(.36, .012, .25), lambert({ color: '#26584e' }), 0, .006, 0, g);
    const geo = keep(new THREE.PlaneGeometry(.34, .24, 24, 1)); const pa = geo.attributes.position;
    for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), a = Math.abs(x) / .17; pa.setZ(i, .028 * Math.sin(Math.min(1, a) * Math.PI * .5) + .006 - .014 * (1 - a) ** 3); }
    geo.computeVertexNormals();
    const pages = new THREE.Mesh(geo, pageMat); pages.rotation.x = -Math.PI / 2; pages.position.y = .012; g.add(pages);
    return g;
  }
  const book = makeBook(scene); book.position.set(0, .78, 0); book.rotation.y = -.08;
  const leafGeo = keep(new THREE.PlaneGeometry(.17, .24, 8, 1)); leafGeo.translate(.085, 0, 0);
  const lift = new THREE.Mesh(leafGeo, pageMat); lift.rotation.x = -Math.PI / 2; lift.position.set(0, .03, 0); book.add(lift);

  // ---- Chapter 2 network: orbs rise from the pages and trace their links -----------------------------
  const nodeMat = keep(new THREE.MeshBasicMaterial({ color: '#26584e', transparent: true, opacity: 0, fog: false }));
  const nodeHome = NODES.map(([, p]) => p.clone()); let networkScale = 1;
  const nodes = nodeHome.map(p => { const m = add(new THREE.SphereGeometry(.018, 12, 8), nodeMat); m.userData.home = p; return m; });
  const nodeHalo = NODES.map(() => { const s = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: glow, color: '#f0d19b', transparent: true, opacity: 0, blending: THREE.NormalBlending, depthWrite: false, fog: false }))); s.scale.setScalar(.16); scene.add(s); return s; });
  const linkMat = keep(new THREE.MeshBasicMaterial({ color: '#4e7a6c', transparent: true, opacity: 0, blending: THREE.NormalBlending, depthWrite: false, fog: false }));
  const links = LINKS.map(([a, b]) => {
    const A = nodeHome[a], B = nodeHome[b], mid = A.clone().add(B).multiplyScalar(.5).add(v3(0, .12, 0));
    const geo = keep(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(A, mid, B), 40, .0035, 5)); const m = new THREE.Mesh(geo, linkMat); scene.add(m); return m;
  });
  const linkCurve = ([a, b]) => { const A = nodeHome[a], B = nodeHome[b]; return new THREE.QuadraticBezierCurve3(A.clone(), A.clone().add(B).multiplyScalar(.5).add(v3(0, .12, 0)), B.clone()); };
  function fitNetwork(scale) {
    if (scale === networkScale) return; networkScale = scale;
    nodeHome.forEach((h, i) => h.set(NODES[i][1].x * scale, NODES[i][1].y, NODES[i][1].z)); // the orb curve shares these points
    links.forEach((l, i) => { l.geometry.dispose(); l.geometry = keep(new THREE.TubeGeometry(linkCurve(LINKS[i]), 40, .0035, 5)); });
    orbCurve?.updateArcLengths?.();
  }
  const labelEls = NODES.map(([name]) => { const s = document.createElement('span'); s.className = 'story-3d-node'; s.textContent = name; labels.append(s); return s; });
  const arrivalEl = document.createElement('span'); arrivalEl.className = 'story-3d-arrival'; arrivalEl.textContent = '다음은, 오늘의 공부'; labels.append(arrivalEl);

  // ---- Outside: haze, path, grass, lake, rocks, clouds, island, sun, and the far world --------------
  const back3 = backdropTexture(img, small); disposables.push(back3.texture);
  back3.texture.repeat.x = -1; back3.texture.offset.x = 1; // seen from inside the cylinder
  const colors = back3.colors;
  scene.background = new THREE.Color(colors.top);
  const fogOut = new THREE.Color(colors.horizon);
  const ARC = Math.PI * 160 / 180;
  const backdrop = add(new THREE.CylinderGeometry(110, 110, 102, 64, 1, true, Math.PI - ARC / 2, ARC), keep(new THREE.MeshBasicMaterial({ map: back3.texture, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false })), 0, 31, -6);
  backdrop.renderOrder = -1;
  const groundTex = keep(noiseTexture('#9aa86a', '226,214,160', 21)); groundTex.repeat.set(60, 120);
  const groundMat = lambert({ color: '#ffffff', map: groundTex });
  const ground = add(new THREE.PlaneGeometry(203.5, 400), groundMat, -98.25, -.01, -205); ground.rotation.x = -Math.PI / 2;
  const lake = add(new THREE.PlaneGeometry(200, 400), keep(new THREE.MeshLambertMaterial({ color: '#a9d6cf', emissive: '#4b7a78', emissiveIntensity: .25 })), 103.5, -.25, -205); lake.rotation.x = -Math.PI / 2;
  const pathX = z => { const t = clamp((-z - 6) / 34); return -2.6 * t * t; };
  const slabCount = small ? 80 : 120;
  const slabs = new THREE.InstancedMesh(keep(new THREE.BoxGeometry(1, 1, 1)), keep(new THREE.MeshLambertMaterial({ color: '#ffffff' })), slabCount);
  { const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color(); let i = 0;
    for (let row = 0; i < slabCount; row++) { const z = -6.4 - row * .48; for (const side of [-1, 1]) { if (i >= slabCount) break;
      const x = pathX(z) + side * .4 + (R() - .5) * .05; q.setFromEuler(new THREE.Euler(0, (R() - .5) * .08, 0));
      m.compose(v3(x, .02, z), q, v3(.76, .06, .44)); slabs.setMatrixAt(i, m); slabs.setColorAt(i, c.set('#e6dcc4').offsetHSL(0, 0, (R() - .5) * .12)); i++; } } }
  scene.add(slabs);
  const grassTex = keep(canvasTexture(128, 128, (g, w, h) => {
    const r = rand(5);
    for (let i = 0; i < 46; i++) { const x = r() * w, hh = h * (.35 + r() * .6); g.strokeStyle = `rgba(${120 + r() * 50},${140 + r() * 40},${80 + r() * 30},1)`; g.lineWidth = 2 + r() * 2; g.beginPath(); g.moveTo(x, h); g.quadraticCurveTo(x + (r() - .5) * 20, h - hh * .6, x + (r() - .5) * 26, h - hh); g.stroke(); }
    for (let i = 0; i < 9; i++) { g.fillStyle = r() < .5 ? '#f3efe0' : '#f1d68a'; g.beginPath(); g.arc(10 + r() * (w - 20), h * (.2 + r() * .4), 3 + r() * 3, 0, 7); g.fill(); }
  }));
  const grassGeo = (() => { const a = new THREE.PlaneGeometry(1, 1); a.translate(0, .5, 0); const b = a.clone(); b.rotateY(Math.PI / 2);
    const g = new THREE.BufferGeometry(); for (const key of ['position', 'normal', 'uv']) g.setAttribute(key, new THREE.Float32BufferAttribute([...a.attributes[key].array, ...b.attributes[key].array], a.attributes[key].itemSize));
    const ia = [...a.index.array], off = a.attributes.position.count; g.setIndex([...ia, ...ia.map(x => x + off)]); return g; })();
  const grassCount = small ? 110 : 260;
  const grass = new THREE.InstancedMesh(keep(grassGeo), keep(new THREE.MeshLambertMaterial({ map: grassTex, alphaTest: .5, side: THREE.DoubleSide })), grassCount);
  { const m = new THREE.Matrix4(), q = new THREE.Quaternion(); for (let i = 0; i < grassCount; i++) { const z = -6.6 - R() * 30, side = R() < .55 ? -1 : 1;
    const x = pathX(z) + side * (.95 + R() * (side < 0 ? 3.5 : 2.4)); const s = .18 + R() * .26; q.setFromEuler(new THREE.Euler(0, R() * 3, 0)); m.compose(v3(x, 0, z), q, v3(s, s, s)); grass.setMatrixAt(i, m); } }
  scene.add(grass);
  const rocks = new THREE.InstancedMesh(keep(new THREE.IcosahedronGeometry(1, 0)), keep(new THREE.MeshLambertMaterial({ color: '#9a8f7c', flatShading: true })), 12);
  { const m = new THREE.Matrix4(), q = new THREE.Quaternion(); for (let i = 0; i < 11; i++) { const z = -11 - R() * 26, x = pathX(z) - 2.8 - R() * 6; q.setFromEuler(new THREE.Euler(R(), R(), R())); const s = .12 + R() * .22; m.compose(v3(x, s * .4, z), q, v3(s * 1.3, s, s)); rocks.setMatrixAt(i, m); }
    m.compose(v3(.7, .28, -18.6), q.identity(), v3(.42, .34, .36)); rocks.setMatrixAt(11, m); }
  scene.add(rocks);
  const smallBook = makeBook(scene, 1.3); smallBook.position.set(.7, .6, -18.6); smallBook.rotation.y = .5;
  const sun = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: glow, color: '#ffe7b0', transparent: true, blending: THREE.NormalBlending, depthWrite: false, fog: false })));
  sun.material.toneMapped = false; sun.material.opacity = .5; sun.material.color.set('#fff4d6'); sun.position.set(-30, 14, -100); sun.scale.setScalar(22); scene.add(sun);

  // ---- Light ------------------------------------------------------------------------------------------
  const hemi = new THREE.HemisphereLight('#fdf8ec', '#d6c8a8', 3.0); scene.add(hemi);
  const hemiIn = new THREE.Color('#fdf8ec'), hemiOut = new THREE.Color('#e8f0f4');
  const groundIn = new THREE.Color('#d6c8a8'), groundOut = new THREE.Color('#a8b088');
  const orbLight = new THREE.PointLight('#ffe6a8', .6, 4, 1.4); scene.add(orbLight);
  const doorLight = new THREE.SpotLight('#fff3da', 0, 14, .62, .7, 1.1); doorLight.position.set(0, 2.5, -9); doorLight.target.position.set(0, 0, -2.8); scene.add(doorLight, doorLight.target);
  const sunLight = new THREE.DirectionalLight('#fff1d6', 1.4); sunLight.position.set(-30, 14, -100); sunLight.target.position.set(0, 0, -12); scene.add(sunLight, sunLight.target);
  // ---- Guide orb ----------------------------------------------------------------------------------------
  const orb = add(new THREE.SphereGeometry(.012, 16, 12), keep(new THREE.MeshBasicMaterial({ color: '#f0c46a', fog: false, toneMapped: false })));
  const orbGlow = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: glow, color: '#ffe9b8', transparent: true, blending: THREE.NormalBlending, depthWrite: false, fog: false })));
  orbGlow.material.toneMapped = false; orbGlow.scale.setScalar(.32); scene.add(orbGlow);
  const ORB = [[0, v3(.02, .86, .02)], [.1, v3(.02, 1.02, -.02)], [.15, nodeHome[3]], [.18, nodeHome[2]], [.21, nodeHome[0]], [.25, nodeHome[1]],
    [.33, v3(.2, 1.4, -2.6)], [.40, v3(0, 1.02, -5.93)], [.47, v3(0, 1.1, -5.98)], [.57, v3(0, 1.25, -6.7)], [.68, v3(0, 1.4, -8.6)],
    [.80, v3(-.1, 1.55, -11.2)], [.92, v3(.4, 1.0, -16.6)], [1, v3(.7, .78, -18.55)]];
  const orbCurve = new THREE.CatmullRomCurve3(ORB.map(k => k[1]), false, 'centripetal');
  const orbAt = p => { let k = 0; while (k < ORB.length - 2 && p > ORB[k + 1][0]) k++; const t = smooth(clamp((p - ORB[k][0]) / (ORB[k + 1][0] - ORB[k][0]))); return orbCurve.getPoint((k + t) / (ORB.length - 1)); };
  // ---- Dust in the air, brighter in the door shaft -------------------------------------------------------
  const dustCount = small ? 120 : 300;
  const dustGeo = keep(new THREE.BufferGeometry()); const dp = new Float32Array(dustCount * 3), dc = new Float32Array(dustCount * 3), base = [];
  for (let i = 0; i < dustCount; i++) { const inShaft = i < dustCount * .55; const x = inShaft ? (R() - .5) * 1.6 : (R() - .5) * 4.4, y = .2 + R() * 2.7, z = inShaft ? -5.9 + R() * 3.4 : -5.8 + R() * 8;
    base.push([x, y, z, R() * 6.28]); dp.set([x, y, z], i * 3); const b = inShaft ? 1 : .35; dc.set([b, b * .92, b * .74], i * 3); }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3)); dustGeo.setAttribute('color', new THREE.BufferAttribute(dc, 3));
  const dustMat = keep(new THREE.PointsMaterial({ size: .018, map: glow, vertexColors: true, transparent: true, opacity: .55, blending: THREE.NormalBlending, depthWrite: false }));
  const dust = new THREE.Points(dustGeo, dustMat); scene.add(dust);

  // ---- Frame state -----------------------------------------------------------------------------------------
  let width = 1, height = 1, target = 0, shown = 0, last = 0, frame = 0, visible = true, lastInput = 0, disposed = false, slowFrames = 0, dirty = true;
  const tmp = new THREE.Vector3();
  function resize() {
    const r = stage.getBoundingClientRect(); width = Math.max(1, r.width); height = Math.max(1, r.height);
    renderer.setSize(width, height, false); renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%';
    camera.aspect = width / height; fitNetwork(height > width ? .55 : 1); dirty = true; wake();
  }
  function project(el, pos, alpha, keepOnScreen = false) {
    tmp.copy(pos).project(camera);
    if (alpha < .01 || tmp.z > 1 || (!keepOnScreen && Math.abs(tmp.x) > 1.02) || Math.abs(tmp.y) > 1.05) { el.style.opacity = '0'; return; }
    el.style.opacity = alpha.toFixed(3);
    const half = (el.offsetWidth || 80) / 2 + 8, sx = keepOnScreen ? clamp((tmp.x * .5 + .5) * width, half, width - half) : (tmp.x * .5 + .5) * width;
    el.style.transform = `translate3d(${sx.toFixed(1)}px,${((-tmp.y * .5 + .5) * height).toFixed(1)}px,0) translate(-50%,-50%)`;
  }
  function draw(now) {
    if (disposed) return;
    const p = shown, portrait = height > width;
    // Camera
    const { u, k, f } = rig.map(p);
    const pos = rig.pos.getPointAt(u);
    const look = rig.look.getPoint((k + smooth(f)) / 5);
    let fov = lerp(FOV[k], FOV[k + 1], smooth(f)) + 6 * bump(p, .64, .70, .70, .77);
    if (portrait) { const h = 2 * Math.atan(Math.tan(fov * Math.PI / 360) * 1.6); fov = Math.min(72, 2 * Math.atan(.8 * Math.tan(h / 2) / camera.aspect) * 180 / Math.PI); }
    camera.fov = fov; camera.position.copy(pos); camera.lookAt(look); camera.updateMatrixWorld();
    const shiftX = portrait ? 0 : .10 * (1 - fade(p, .60, .74)), shiftY = portrait ? .18 : 0;
    camera.setViewOffset(width, height, -shiftX * width, -shiftY * height, width, height);
    camera.updateProjectionMatrix();
    // Door, light, exposure, fog
    const open = smoother(clamp((p - .44) / (.66 - .44)));
    leftLeaf.rotation.y = open * 1.833; rightLeaf.rotation.y = -open * 1.833;
    const seamOn = fade(p, .34, .44) * (1 - fade(p, .47, .52));
    seamMat.opacity = .9 * seamOn; seamGlow.material.opacity = .55 * seamOn + .25 * bump(p, .44, .47, .5, .58);
    wedge.scale.x = .25 + .75 * open; wedgeMat.opacity = .55 * open * (1 - fade(p, .74, .8));
    shafts.forEach((s, i) => { s.material.opacity = .22 * open * (1 - fade(p, .70, .76)) * (i === 1 ? 1 : .7); });
    doorLight.intensity = 8 * open; sunLight.intensity = 1.4 + .6 * fade(p, .55, .8);
    hemi.intensity = 3.0 - .6 * fade(p, .62, .82); hemi.color.copy(hemiIn).lerp(hemiOut, fade(p, .64, .76)); hemi.groundColor.copy(groundIn).lerp(groundOut, fade(p, .64, .76));
    renderer.toneMappingExposure = lerp(1.0, 1.05, fade(p, .40, .80)) + .10 * bump(p, .70, .74, .74, .80);
    const outside = fade(-pos.z, 5.5, 8);
    fog.color.copy(fogIn).lerp(fogOut, outside); fog.density = lerp(.03, .034, outside);
    // Book leaf lifts as the question begins.
    lift.rotation.y = -Math.PI * .45 * fade(p, .02, .12);
    // Network
    const rise = fade(p, .10, .20), away = fade(p, .30, .37), trace = fade(p, .14, .26);
    nodes.forEach((n, i) => { n.position.copy(book.position).lerp(n.userData.home, rise); n.position.y += away * .5; nodeHalo[i].position.copy(n.position); nodeHalo[i].material.opacity = .9 * rise * (1 - away); });
    nodeMat.opacity = rise * (1 - away); linkMat.opacity = .85 * (1 - away);
    links.forEach((l, i) => { const share = clamp(trace * LINKS.length - i); l.geometry.setDrawRange(0, Math.floor(share * l.geometry.index.count / 3) * 3); l.visible = share > 0 && away < 1; });
    labelEls.forEach((el, i) => project(el, tmp.copy(nodes[i].position).add(v3(0, .07, 0)), rise * (1 - away) * fade(p, .15, .2)));
    // Orb, with a gentle shimmer that is the only time-based motion besides the dust drift.
    const o = orbAt(p), shimmer = 1 + .03 * Math.sin(now * .002);
    orb.position.copy(o); orbGlow.position.copy(o); orbGlow.scale.setScalar(.32 * shimmer * (1 + .4 * bump(p, .44, .47, .47, .52))); orbLight.position.copy(o);
    // Dust drifts slowly; the arrival label sits above the small book.
    const pa = dustGeo.attributes.position; for (let i = 0; i < dustCount; i++) { const b = base[i]; pa.setXYZ(i, b[0] + Math.sin(now * .00021 + b[3]) * .06, b[1] + Math.sin(now * .00017 + b[3] * 2) * .05, b[2]); }
    pa.needsUpdate = true; dustMat.opacity = .25;
    project(arrivalEl, v3(.7, 1.05, -18.6), fade(p, .94, 1), true);
    renderer.render(scene, camera); dirty = false; onFrame?.(p);
  }
  function tick(now) {
    frame = 0; if (disposed || !visible || document.hidden) return;
    const dt = last ? Math.min(100, now - last) : 16; last = now;
    const diff = target - shown; shown = Math.abs(diff) < 1e-4 ? target : shown + diff * (1 - Math.exp(-dt / 90));
    // Adaptive quality: sustained slow frames drop resolution and density once, before this frame is drawn.
    if (slowFrames > 40 && dprCap > 1) { dprCap = 1; renderer.setPixelRatio(1); renderer.setSize(width, height, false); grass.count = Math.floor(grass.count * .5); dust.geometry.setDrawRange(0, Math.floor(dustCount * .5)); slowFrames = 0; }
    const t0 = performance.now(); draw(now);
    const cost = performance.now() - t0 + (dt > 22 ? dt - 16 : 0);
    if (cost > 22) slowFrames++; else slowFrames = Math.max(0, slowFrames - 1);
    if (!frame && (shown !== target || dirty || now - lastInput < 3000)) frame = requestAnimationFrame(tick);
  }
  function wake() { if (!frame && !disposed && visible && !document.hidden) { last = 0; frame = requestAnimationFrame(tick); } }
  // Our own dispose() forces a context loss; only a real loss should switch the story back to 2D.
  const lost = event => { event.preventDefault(); if (!disposed) onLost?.(); };
  renderer.domElement.addEventListener('webglcontextlost', lost, { once: true });
  renderer.compile(scene, camera);
  if (cancelled()) throw new Error('cancelled');
  { const r = stage.getBoundingClientRect(); width = Math.max(1, r.width); height = Math.max(1, r.height); renderer.setSize(width, height, false); renderer.domElement.style.width = renderer.domElement.style.height = '100%'; camera.aspect = width / height; fitNetwork(height > width ? .55 : 1); }
  shown = target = clamp(progress()); draw(performance.now());
  stage.prepend(host); stage.append(labels);
  return {
    host,
    setProgress(p, immediate = false) { target = clamp(p); if (immediate) shown = target; lastInput = performance.now(); wake(); },
    resize, setVisible(v) { visible = v; if (v) { dirty = true; wake(); } },
    wake() { lastInput = performance.now(); wake(); },
    refresh() { dirty = true; lastInput = performance.now(); wake(); },
    dispose() {
      disposed = true; cancelAnimationFrame(frame); renderer.domElement.removeEventListener('webglcontextlost', lost);
      scene.traverse(o => { if (o.isInstancedMesh) o.dispose(); });
      disposables.forEach(d => d.dispose?.()); renderer.dispose(); renderer.forceContextLoss?.();
      host.remove(); labels.remove();
    }
  };
  } catch (error) {
    disposables.forEach(d => d.dispose?.()); renderer?.dispose(); renderer?.forceContextLoss?.();
    if (error?.message === 'cancelled') return null;
    throw error;
  }
}
