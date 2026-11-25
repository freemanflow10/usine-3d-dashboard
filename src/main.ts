import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* ============================================================
   Données déterministes — ateliers
   ============================================================ */
export interface Workshop {
  id: string;
  key: string;            // data-k équivalent
  title: string;
  state: 'ok' | 'warn' | 'err';
  statusLine: string;
  nextAction: string;
  progress: number;       // 0..100
  kpis: [string, string, string];
  worker: string;
  quota: string;
  // position du poste dans la scène
  pos: THREE.Vector3;
  // description de la fiche
  cause?: string;
  actionLabel: string;
}

const WORKSHOPS: Workshop[] = [
  {
    id: 'wf', key: 'wf', title: 'Portefeuille d’idées (Notion)',
    state: 'warn', statusLine: 'Statut à trier 46 · prête 1 · bloquée 1 · abandonnée 1',
    nextAction: 'Trier les idées « prêtes »', progress: 62,
    kpis: ['46', 'à trier', '4', 'prêtes', '1', 'bloquée'],
    worker: 'DeepSeek', quota: 'coût bas',
    pos: new THREE.Vector3(-6, 0, -2.5),
    cause: '4 idées remontées à trier, 1 bloquée (dépendance extérieure).',
    actionLabel: 'Ouvrir le tri',
  },
  {
    id: 'rm', key: 'rm', title: 'RecrutMatch',
    state: 'ok', statusLine: 'Staging validé, prod à surveiller',
    nextAction: 'Valider la page admin Réseaux sociaux', progress: 82,
    kpis: ['3', 'ateliers', '50', 'offres', '29', 'commits'],
    worker: 'Claude', quota: '—',
    pos: new THREE.Vector3(0, 0, -2.5),
    actionLabel: 'Ouvrir le dossier',
  },
  {
    id: 'arch', key: 'arch', title: 'Architecture d’agents',
    state: 'ok', statusLine: 'Chaîne stable (Haiku → exécuteur → relecture)',
    nextAction: 'Relancer la revue de route', progress: 70,
    kpis: ['5', 'agents', '100%', 'collecte', '0', 'panne'],
    worker: 'Gemini', quota: 'en veille',
    pos: new THREE.Vector3(6, 0, -2.5),
    actionLabel: 'Ouvrir la chaine',
  },
  {
    id: 'comms', key: 'comms', title: 'Communication réseaux',
    state: 'warn', statusLine: '3 posts/jour · W49 en attente de visuels',
    nextAction: 'Finaliser la semaine W49 à 3x', progress: 40,
    kpis: ['21', 'idées', '10/44', 'photos', '3', 'réseaux'],
    worker: 'Antigravity', quota: 'reset 16:40',
    pos: new THREE.Vector3(0, 0, 4.4),
    cause: 'Les visuels de la semaine W49 attendent la fin des photos (10/44).',
    actionLabel: 'Voir la semaine',
  },
];

/* ============================================================
   Scène
   ============================================================ */
const canvasHost = document.getElementById('app')!;
const selLabel = document.getElementById('sel-label')!;
const motionChip = document.getElementById('motion-chip')!;
const controls = document.getElementById('controls')!;

// --- fallback WebGL → vue illustrée avec liste fonctionnelle ---
let renderer: THREE.WebGLRenderer | null = null;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true });
} catch (e) {
  console.warn('WebGL indisponible → vue illustrée', e);
}
if (!renderer) {
  document.body.classList.add('no-webgl');
  renderFallback();
} else {
  init3D();
}

function renderFallback() {
  const app = document.getElementById('app')!;
  app.style.background = '#0e1116';
  app.style.overflow = 'auto';
  app.style.padding = '20px';
  app.innerHTML = `<h2 style="color:var(--acc)">Vue illustrée (moteur 3D indisponible)</h2>
  <div style="display:grid;gap:10px;max-width:560px">` +
    WORKSHOPS.map((w, i) => `<button class="wk" data-i="${i}" style="min-height:64px">
      <span class="t">${w.title} <span class="k w${w.state}">${w.state === 'ok' ? 'OK' : w.state === 'warn' ? '!' : '××'}</span></span>
      <span class="s">${w.statusLine} · ${w.progress}%</span></button>`).join('') +
    `</div>`;
  app.querySelectorAll('.wk').forEach(el => el.addEventListener('click', () => {
    alert(WORKSHOPS[Number((el as HTMLElement).dataset.i)].statusLine);
  }));
  return;
}

function init3D() {
  const renderer = initRenderer();
  const scene = buildScene();
  const camera = buildCamera();
  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableDamping = true; orbit.dampingFactor = 0.08;
  orbit.target.set(0, 0.6, 0); orbit.minDistance = 2; orbit.maxDistance = 40;

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downPos = { x: 0, y: 0 };
  let downT = 0;

  /* ---- sol + environnement ---- */
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(44, 34),
    new THREE.MeshStandardMaterial({ color: 0x1b2029, roughness: .95 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // quadrillage léger
  const grid = new THREE.GridHelper(44, 22, 0x333c4c, 0x232a37);
  (grid.material as THREE.Material).transparent = true;
  (grid.material as THREE.Material).opacity = .5;
  scene.add(grid);

  // lumière
  scene.add(new THREE.HemisphereLight(0xffffff, 0x20242e, 0.85));
  const sun = new THREE.DirectionalLight(0xfff3d6, 2.6);
  sun.position.set(12, 18, 8); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  scene.add(sun);

  /* ---- convoyeurs + postes ---- */
  const conveyorMat = new THREE.MeshStandardMaterial({ color: 0x2b3240, roughness: .7 });
  const beltMat = new THREE.MeshStandardMaterial({ color: 0x394156, roughness: .9 });
  const railMat = new THREE.MeshStandardMaterial({ color: 0x8a93a6, metalness: .6, roughness: .45 });

  function makeConveyor(x: number, z: number, length = 9, angle = 0) {
    const g = new THREE.Group();
    g.position.set(x, 0.02, z);
    g.rotation.y = angle;
    const bed = new THREE.Mesh(new THREE.BoxGeometry(length, 0.16, 1), conveyorMat);
    bed.position.y = 0.75; bed.castShadow = true; bed.receiveShadow = true;
    const belt = new THREE.Mesh(new THREE.BoxGeometry(length - 0.2, 0.08, 0.74), beltMat);
    belt.position.y = 0.84;
    const r1 = new THREE.Mesh(new THREE.BoxGeometry(length, 0.2, 0.06), railMat); r1.position.set(0, 0.9, 0.5);
    const r2 = r1.clone(); r2.position.z = -0.5;
    g.add(bed, belt, r1, r2);
    scene.add(g);
    return { group: g, belt };
  }

  function makeStation(x: number, z: number, color: number) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.2, 1.5), new THREE.MeshStandardMaterial({ color, roughness: .55 }));
    base.position.y = 1.1; base.castShadow = true; base.receiveShadow = true;
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.08), new THREE.MeshStandardMaterial({ color: 0x0b0f17, emissive: 0x0b1220 }));
    screen.position.set(0, 2.2, 0.78);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), new THREE.MeshStandardMaterial({ color: 0xf5c400, emissive: 0xf5c400, emissiveIntensity: 1.6 }));
    lamp.position.set(0.6, 2.7, 0.6);
    g.add(base, screen, lamp);
    scene.add(g);
    return g;
  }

  function makeArm(x: number, z: number, angle = 0) {
    const g = new THREE.Group();
    const armMat = new THREE.MeshStandardMaterial({ color: 0xd8a600, metalness: .3, roughness: .5 });
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.3, 0.7), armMat); base.position.set(x, 0.75, z);
    const pivot = new THREE.Group(); pivot.position.set(x, 1.5, z);
    const mid = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.7, 0.22), armMat); mid.position.y = 0.7; mid.castShadow = true;
    const j1 = new THREE.Group(); j1.position.y = 0; j1.add(mid);
    const claw = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.35, 0.4), new THREE.MeshStandardMaterial({ color: 0x6a7285 }));
    claw.position.y = 1.6;
    pivot.add(j1, claw);
    pivot.rotation.y = angle;
    scene.add(base, pivot);
    // pinces (2 lames)
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.14), railMat); p1.position.set(-0.09, 1.78, 0);
    const p2 = p1.clone(); p2.position.x = 0.09;
    pivot.add(p1, p2);
    pivot.userData.arm = { j1, p1, p2, claw, homeAngle: angle, homeRaise: 0 };
    return pivot;
  }

  function makeWorker(x: number, z: number) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2c6e9e, roughness: .7 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0xdfa06a, roughness: .8 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.85, 0.32), bodyMat); torso.position.y = 0.95; torso.castShadow = true;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 20, 16), headMat); head.position.y = 1.62; head.castShadow = true;
    const lArm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.12, 0.6), bodyMat); lArm.position.set(0.27, 1.3, 0);
    const rArm = lArm.clone(); rArm.position.x = -0.27;
    const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.72, 0.2), new THREE.MeshStandardMaterial({ color: 0x28313f })); leg1.position.set(0.14, 0.36, 0);
    const leg2 = leg1.clone(); leg2.position.x = -0.14;
    g.add(torso, head, lArm, rArm, leg1, leg2);
    scene.add(g);
    return { group: g, head };
  }

  // --- quatre ateliers positionnés selon data-k ---
  const convMain = makeConveyor(0, -4, 12);            // convoyeur d'entrée (longitudinal X)
  const convRight = makeConveyor(0, 0.9, 12, 0);       // convoyeur continue
  const convOut = makeConveyor(0, 5.6, 12);            // livraison

  const stationRM = makeStation(0, -2.1, 0x2c6e9e);
  const armRM = makeArm(1.1, -2.1, Math.PI / 2);
  const workerRM = makeWorker(-0.9, -1.4);
  const stationComms = makeStation(0, 0.2, 0x9c4fb0);
  const workerComms = makeWorker(0.9, 0.9);
  const stationArch = makeStation(5.5, -2.1, 0x3d8f62);
  const workerArch = makeWorker(5.5, -1.2);
  const stationWF = makeStation(-5.5, -2.1, 0xd99b28);
  const workerWF = makeWorker(-5.5, -1.2);

  // étiquettes hover (sprite)
  const labelSprites: THREE.Sprite[] = [];
  function makeLabel(text: string, color = 0xffffff) {
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 96;
    const ctx = cv.getContext('2d')!;
    ctx.font = '700 52px system-ui'; ctx.fillStyle = '#0e1116';
    ctx.fillRect(0, 0, 512, 96);
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 6; ctx.strokeRect(3, 3, 506, 90);
    ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
    ctx.fillText(text, 24, 62);
    const tex = new THREE.CanvasTexture(cv);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
    sp.scale.set(2.4, 0.45, 1);
    labelSprites.push(sp);
    return sp;
  }
  const labRM = makeLabel('RecrutMatch', 0x8ed3ff); labRM.position.set(0, 2.6, -2.4);
  const labComms = makeLabel('Communication', 0xe6b4ff); labComms.position.set(0, 2.7, 0.2);
  const labArch = makeLabel('Architecture', 0xa8e6b0); labArch.position.set(5.5, 2.6, -2.4);
  const labWF = makeLabel('Idées', 0xffe29b); labWF.position.set(-5.5, 2.6, -2.4);
  scene.add(labRM, labComms, labArch, labWF);

  /* ---- le carton qu'on suit ---- */
  const carton = new THREE.Group();
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.7, 0.9),
    new THREE.MeshStandardMaterial({ color: 0xc9912e, roughness: .8 }),
  );
  box.castShadow = true;
  const lid = new THREE.Mesh(
    new THREE.BoxGeometry(0.94, 0.14, 0.94),
    new THREE.MeshStandardMaterial({ color: 0xb9831f, roughness: .8 }),
  );
  lid.position.y = 0.42;
  carton.add(box, lid);
  carton.position.set(-5.6, 0.62, -4);
  scene.add(carton);

  // second carton (bloqué au contrôle de comms)
  const carton2 = box.clone(); carton2.position.set(-0.8, 0.62, 4.6);
  const lid2 = lid.clone(); lid2.position.y = 0.42;
  const carton2Group = new THREE.Group(); carton2Group.add(carton2, lid2);
  carton2Group.position.set(-0.8, 0, 5.6);
  scene.add(carton2Group);

  // rayons de "work" au-dessus des postes actifs
  const spinRay = new THREE.Mesh(
    new THREE.CircleGeometry(0.7, 24),
    new THREE.MeshBasicMaterial({ color: 0xf5c400, transparent: true, opacity: .22, side: THREE.DoubleSide }),
  );
  spinRay.rotation.x = -Math.PI / 2; spinRay.position.y = 2.75; spinRay.position.set(0, 0, -2.1);
  scene.add(spinRay);

  /* ============ état de simulation ============ */
  interface SimState {
    speed: number;            // vélocité carton le long du convoyeur (t/h)
    phase: 'incoming' | 'work' | 'control' | 'blocked' | 'deliver';
    progress: number;         // 0..1 le long du trajet
    paused: boolean;
    reduced: boolean;
    time: number;
    workerSwing: number;
    workTimer: number;
  }
  const sim: SimState = {
    speed: 1.6, phase: 'incoming', progress: 0,
    paused: false, reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    time: 0, workerSwing: 0, workTimer: 0,
  };

  // Caméras cibles
  const camTargets: Record<string, { pos: THREE.Vector3; tgt: THREE.Vector3 }> = {
    general: { pos: new THREE.Vector3(0, 9, 16), tgt: new THREE.Vector3(0, 0.6, 0) },
    rm: { pos: new THREE.Vector3(0, 4, 5.4), tgt: new THREE.Vector3(0, 0.8, -2.1) },
    comms: { pos: new THREE.Vector3(0, 4.4, 6.4), tgt: new THREE.Vector3(0, 0.8, 0.3) },
    arch: { pos: new THREE.Vector3(5.5, 3.6, 5.6), tgt: new THREE.Vector3(5.5, 0.8, -2.1) },
    wf: { pos: new THREE.Vector3(-5.5, 3.6, 5.6), tgt: new THREE.Vector3(-5.5, 0.8, -2.1) },
  };

  let pendingCam: { pos: THREE.Vector3; tgt: THREE.Vector3 } | null = null;
  let camT = 0;

  function focus(key: string) {
    const t = camTargets[key] || camTargets.general;
    pendingCam = t; camT = 0;
    selLabel.textContent = key === 'general' ? 'Usine — vue générale'
      : (WORKSHOPS.find(w => w.key === key)?.title || key);
    updateBoard(key);
  }

  function updateBoard(activeKey: string) {
    document.querySelectorAll('.wk').forEach(el => {
      const k = (el as HTMLElement).dataset.k;
      el.classList.toggle('on', k === activeKey);
    });
  }

  function fly(dt: number) {
    if (!pendingCam) return;
    camT += dt;
    const k = Math.min(1, camT / 0.9);
    const e = 1 - Math.pow(1 - k, 3);
    camera.position.lerp(pendingCam.pos, e);
    orbit.target.lerp(pendingCam.tgt, e);
    if (k >= 1) pendingCam = null;
  }

  /* ---- UI : cartes ateliers ---- */
  const board = document.querySelector('.board') as HTMLElement;
  if (board) {
    board.innerHTML = '';
    for (const w of WORKSHOPS) {
      const b = document.createElement('button');
      b.className = 'wk';
      b.dataset.k = w.key;
      b.innerHTML = `<span class="t">${w.title} <span class="k w${w.state}">${w.state === 'ok' ? 'OK' : w.state === 'warn' ? '!' : '××'}</span></span>
        <span class="s">${w.statusLine}</span>`;
      b.addEventListener('click', () => {
        focus(w.key);
        openDetail(w);
      });
      board.appendChild(b);
    }
  }

  // Contrôles (pause, démos)
  const pauseBtn = document.createElement('button');
  pauseBtn.textContent = sim.reduced ? '⏸ Animations réduites' : '⏸ Pause';
  const syncMotionChip = () => {
    if (!motionChip) return;
    motionChip.innerHTML = sim.paused ? '🎬 <span style="color:var(--warn)">En pause</span>'
      : '🎬 <span class="ok">En mouvement</span>';
  };
  pauseBtn.addEventListener('click', () => {
    sim.paused = !sim.paused;
    document.body.classList.toggle('paused', sim.paused);
    pauseBtn.textContent = sim.paused ? '▶ Reprendre' : '⏸ Pause';
    syncMotionChip();
  });
  controls.appendChild(pauseBtn);
  syncMotionChip();

  const demos: Array<{ k: string; label: string }> = [
    { k: 'cycle', label: '▶ Suivre le carton' },
    { k: 'block', label: '🚧 Cas bloqué' },
    { k: 'multi', label: '≋ 2 ateliers actifs' },
  ];
  for (const d of demos) {
    const b = document.createElement('button');
    b.textContent = d.label;
    b.addEventListener('click', () => {
      runDemo(d.k);
      b.style.borderColor = 'var(--acc)';
      setTimeout(() => { b.style.borderColor = ''; }, 1200);
    });
    controls.appendChild(b);
  }

  /* ---- fiche détails ---- */
  const detailEl = document.querySelector('.detail') as HTMLElement;
  function openDetail(w: Workshop) {
    if (!detailEl) return;
    detailEl.innerHTML = `<h3>${w.title}</h3>
      <p>${w.statusLine}</p>
      <div class="kv">
        <span>Avancement</span><b>${w.progress}%</b>
        <span>Ouvrier</span><b>${w.worker}</b>
        <span>Quota</span><b>${w.quota}</b>
        <span>État</span><b>${w.state === 'ok' ? 'OK' : w.state === 'warn' ? 'Surveillé' : 'Bloqué'}</b>
      </div>
      ${w.cause ? `<div class="kv"><span>Cause</span><b>${w.cause}</b></div>` : ''}
      <div class="act">
        <button data-act>${w.actionLabel}</button>
        ${w.key === 'comms' ? `<button class="ghost" data-resume>Reprendre la production</button>` : ''}
      </div>`;
    detailEl.style.display = 'block';
    detailEl.querySelector('[data-act]')?.addEventListener('click', () => {
      if (w.key === 'comms') { runDemo('cycle'); }
    });
    detailEl.querySelector('[data-resume]')?.addEventListener('click', () => {
      sim.phase = 'incoming'; sim.progress = 0.2;
      closeDetail();
    });
  }
  function closeDetail() {
    if (detailEl) detailEl.style.display = 'none';
  }

  /* ---- raycaster + clic 3D ---- */
  renderer.domElement.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / innerHeight) * 2 + 1;
  });

  function pick(): THREE.Object3D | null {
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(scene.children, true);
    if (hits.length === 0) return null;
    let o: THREE.Object3D | null = hits[0].object;
    // remonter vers un groupe "poste" connu
    while (o && !o.userData.workshopKey) o = o.parent;
    return o;
  }

  renderer.domElement.addEventListener('pointerdown', (e) => { downPos = { x: e.clientX, y: e.clientY }; downT = performance.now(); });
  renderer.domElement.addEventListener('pointerup', (e) => {
    const dx = e.clientX - downPos.x, dy = e.clientY - downPos.y;
    if (Math.hypot(dx, dy) > 6 || performance.now() - downT > 500) return; // c'est un glisser
    const o = pick();
    if (!o) { focus('general'); closeDetail(); return; }
    const key = o.userData.workshopKey as string;
    focus(key);
    const w = WORKSHOPS.find(x => x.key === key);
    if (w) openDetail(w);
  });

  // Associations userData de postes
  stationRM.userData.workshopKey = 'rm';
  stationComms.userData.workshopKey = 'comms';
  stationArch.userData.workshopKey = 'arch';
  stationWF.userData.workshopKey = 'wf';
  carton2Group.userData.workshopKey = 'comms';

  /* ---- clavier ---- */
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { orbit.autoRotate = false; }
    if (e.key === 'Escape') { focus('general'); closeDetail(); }
    const idx = ['wf', 'rm', 'arch', 'comms'].indexOf(e.key);
    if (idx >= 0) { const w = WORKSHOPS[idx]; focus(w.key); openDetail(w); }
  });

  /* ---- resize ---- */
  window.addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  /* ============ démos ============ */
  function runDemo(kind: string) {
    sim.paused = false; document.body.classList.remove('paused');
    pauseBtn.textContent = '⏸ Pause';
    if (kind === 'cycle') {
      sim.phase = 'incoming'; sim.progress = 0;
      carton.visible = true;
      carton2Group.visible = false;
      focus('general');
      closeDetail();
    } else if (kind === 'block') {
      sim.phase = 'blocked'; sim.progress = 0.55;
      carton.visible = false;
      carton2Group.visible = true;
      carton2Group.position.set(-0.8, 0, 5.6);
      focus('comms');
      openDetail(WORKSHOPS[3]);
    } else if (kind === 'multi') {
      // deux ateliers actifs : bras en mouvement, cartons en préparation
      sim.phase = 'work'; sim.progress = 0.5;
      carton.visible = true;
      carton2Group.visible = true;
      focus('general');
      closeDetail();
    }
  }

  /* ============ boucle de simulation ============ */
  const clock = new THREE.Clock();
  let lastWorker = 0;

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    sim.time += dt;
    const dts = sim.paused || sim.reduced ? 0 : dt;

    // déplacement du carton : arrivée → poste (travail) → contrôle → livraison → boucle
    if (!sim.paused) {
      if (sim.phase === 'incoming') {
        sim.progress += (1.5 * dts) / 12;   // avance sur le tapis d'entrée
        if (sim.progress >= 0.42) { sim.phase = 'work'; sim.workTimer = 0; }
      } else if (sim.phase === 'work') {
        sim.workTimer += dts;
        sim.workerSwing = Math.sin(sim.time * 2.2) * 0.1;
        if (sim.workTimer >= 4.0) { sim.phase = 'deliver'; sim.progress = 0.42; }
      } else if (sim.phase === 'blocked') {
        // immobile au contrôle (attente de revue)
      } else if (sim.phase === 'deliver') {
        sim.progress += (1.1 * dts) / 12;
        if (sim.progress >= 1.0) { sim.phase = 'incoming'; sim.progress = 0; carton.visible = true; }
      }
    }

    // carton : segment 1 = tapis d'entrée (x), segment 2 = montée (z) à x=0
    const p = Math.min(1, Math.max(0, sim.progress));
    if (carton.visible) {
      if (p < 0.35) {
        carton.position.x = -5.6 + (p / 0.35) * 5.6;
        carton.position.y = 1.24; carton.position.z = -4;
      } else if (p < 0.6) {
        const t = (p - 0.35) / 0.25;
        carton.position.x = 0; carton.position.z = -4 + t * 4.3;
        carton.position.y = 1.24;
      } else if (p < 0.8) {
        const t = (p - 0.6) / 0.2;
        carton.position.x = 0; carton.position.z = 0.3 + t * 5.3;
        carton.position.y = 1.24;
      } else {
        const t = (p - 0.8) / 0.2;
        carton.position.x = 0; carton.position.z = 5.6 + t * 1.4;
        carton.position.y = 1.24 + t * 0.6;
        if (p >= 1) carton.visible = false;
      }
    }

    // bras du poste rm
    const arm = armRM.userData.arm as { j1: THREE.Group; p1: THREE.Mesh; p2: THREE.Mesh; claw: THREE.Mesh };
    if (armRM) {
      const working = sim.phase === 'work' && !sim.paused;
      const target = working ? 0.7 : 0;
      const cur = arm.j1.rotation.x;
      armRM.position.x = 1.1;
      arm.j1.rotation.x += (target - cur) * (1 - Math.exp(-4 * dt));
      const open = working ? Math.sin(sim.time * 8) : 0;
      arm.p1.position.x = -0.09 + (open > 0 ? open * 0.06 : 0);
      arm.p2.position.x = 0.09 - (open > 0 ? open * 0.06 : 0);
    }

    // ouvrier rm : balancement des bras
    workerRM.head.position.y = 1.62 + Math.sin(sim.time * 2) * 0.02;

    // rotation pastille d'activité
    spinRay.rotation.z += 0.4 * dts;

    // overscroll galerie
    if (sim.phase === 'work') {
      spinRay.visible = true;
    } else {
      spinRay.visible = !sim.paused && sim.phase === 'incoming';
    }

    // caméra
    fly(dts);

    orbit.update();
    renderer.render(scene, camera);
  }
  animate();
  focus('general');
}

function buildScene() {
  return new THREE.Scene();
}
function buildCamera() {
  const c = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 200);
  c.position.set(0, 9, 16);
  return c;
}
function initRenderer() {
  const r = new THREE.WebGLRenderer({ antialias: true });
  r.setPixelRatio(Math.min(devicePixelRatio, 2));
  r.setSize(innerWidth, innerHeight);
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.setClearColor(0x0e1116);
  document.getElementById('app')!.appendChild(r.domElement);
  return r;
}