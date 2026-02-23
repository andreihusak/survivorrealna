// ══════════════════════════════════════════════════════
//  main.js — game loop, state, orchestration
// ══════════════════════════════════════════════════════

// ── Shared constants ───────────────────────────────────
export const TS = 48;   // tile size pixels
export const CS = 16;   // chunk size in tiles

// ── Module imports ─────────────────────────────────────
import { initInput, keys, mouse, oneshot, clearOneshots, getMovementVector } from './logic/input.js';
import { updateParticles, getParticles, clearParticles } from './logic/particles.js';
import { resetMap, preloadChunksAround, findValidSpawn, isSolid } from './world/mapgen.js';
import { tryPlaceWall, tryRemoveWall } from './world/walls.js';
import { createServerPlayer, updateServerPlayer, playerSnapshot, nextColor, resetColorIdx, PLAYER_COLORS } from './entities/player.js';
import { getEnemies, clearEnemies, updateEnemies, tickSpawner } from './entities/enemies.js';
import { getPickups, clearPickups, updatePickups, spawnPickup } from './entities/pickups.js';
import { getBullets, clearBullets, updateBullets, fireWeapon } from './weapons/bullets.js';
import { render } from './graphics/renderer.js';
import {
  hostGame, joinGame, broadcastState, sendInputsToHost, sendStartSignal, sendGameOver,
  setCallbacks, getMyId, getMyName, getMyColor, getIsHost, getConnections,
  getLobbyPlayers, remotePlayers, pingMs, PLAYER_COLORS as NET_COLORS,
} from './network.js';

// ── Canvas ─────────────────────────────────────────────
const canvas = document.getElementById('game');
const ctx    = canvas.getContext('2d');
canvas.width  = window.innerWidth;
canvas.height = window.innerHeight;
window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });

// ── Game state ─────────────────────────────────────────
let gameState   = 'lobby';  // lobby | game | paused | gameover
let gameRunning = false;
let isSolo      = false;    // true when playing without network
let score       = 0;
let killCount   = 0;
let buildMode   = false;

const cam = { x: 0, y: 0 };

// Authoritative player pool (solo + host mode) / snapshot targets (client mode)
const serverPlayers = {};

// Enemy bullets (ranger shots)
const enemyBullets = [];

let broadcastTimer = 0;
const BROADCAST_HZ = 30;

// Solo constants — no real peer ID needed
const SOLO_ID    = 'solo_player';
const SOLO_COLOR = NET_COLORS[0];

// ── Weapon switching ───────────────────────────────────
const WEAPON_KEYS = { Digit1: 'pistol', Digit2: 'smg', Digit3: 'shotgun', Digit4: 'sniper' };

// ── Keyboard extras ────────────────────────────────────
window.addEventListener('keydown', e => {
  if (!gameRunning) return;
  if (e.code === 'KeyB') buildMode = !buildMode;
  if (e.code === 'Escape') {
    if (gameState === 'game')        gameState = 'paused';
    else if (gameState === 'paused') gameState = 'game';
  }
  const wid = WEAPON_KEYS[e.code];
  if (wid) {
    if (isSolo || getIsHost()) {
      const id = isSolo ? SOLO_ID : getMyId();
      const sp = serverPlayers[id];
      if (sp) switchWeapon(sp, wid);
    } else {
      pendingWeaponSwitch = wid;
    }
  }
});
let pendingWeaponSwitch = null;

canvas.addEventListener('click', () => {
  if (gameState === 'gameover') { gameRunning = false; location.reload(); }
});

// ── Init ───────────────────────────────────────────────
initInput();

// ── Network callbacks ──────────────────────────────────
setCallbacks({
  onStartGame: (playerColors) => {
    document.getElementById('lobby').classList.add('hidden');
    beginGame(playerColors);
  },
  onClientState: (data) => {
    applyStateSnapshot(data);
  },
  onClientInputs: (fromId, data) => {
    const sp = serverPlayers[fromId];
    if (!sp || sp.dead) return;
    sp.dx    = data.dx;
    sp.dy    = data.dy;
    sp.angle = data.angle;
    sp.pendingShoot      = data.shoot;
    sp.pendingMelee      = data.melee;
    sp.pendingReload     = data.reload;
    sp.buildMode         = data.buildMode;
    sp.pendingWall       = data.placeWall;
    sp.pendingRemoveWall = data.removeWall;
    sp.mouseWx = data.mouseWx;
    sp.mouseWy = data.mouseWy;
    if (data.switchWeapon) switchWeapon(sp, data.switchWeapon);
  },
  onPlayerLeft: (peerId) => {
    delete serverPlayers[peerId];
    refreshLobbyUI();
  },
  onGameOver: () => {
    gameState = 'gameover';
  },
});

// ── Lobby UI wiring ────────────────────────────────────
const lobbyEl      = document.getElementById('lobby');
const statusEl     = document.getElementById('status');
const codeBoxEl    = document.getElementById('code-box');
const codeValEl    = document.getElementById('code-val');
const pillsEl      = document.getElementById('pills');
const playerListEl = document.getElementById('player-list');
const startWrapEl  = document.getElementById('start-wrap');

function setStatus(msg, cls = '') {
  statusEl.textContent = msg;
  statusEl.className   = 'status ' + cls;
}

function refreshLobbyUI() {
  const players = getLobbyPlayers();
  pillsEl.innerHTML = '';
  players.forEach(p => {
    const pill = document.createElement('span');
    pill.className   = 'pill';
    pill.textContent = p.name || 'Player';
    pill.style.borderColor = p.color || '#4adeff';
    pill.style.color       = p.color || '#4adeff';
    pillsEl.appendChild(pill);
  });
  playerListEl.style.display = 'block';
}

// ── SOLO button ────────────────────────────────────────
document.getElementById('btn-solo').addEventListener('click', () => {
  startSoloGame();
  lobbyEl.classList.add('hidden');
});

// ── HOST button ────────────────────────────────────────
document.getElementById('btn-host').addEventListener('click', () => {
  const name = document.getElementById('pname').value.trim() || 'Host';
  document.getElementById('btn-host').disabled = true;
  document.getElementById('btn-solo').disabled = true;
  document.getElementById('btn-join').disabled = true;
  setStatus('Creating room…', 'wait');

  hostGame(
    name,
    (code) => {
      codeValEl.textContent = code;
      codeBoxEl.classList.add('show');
      startWrapEl.style.display = 'block';
      setStatus('Waiting for players…', 'wait');
      refreshLobbyUI();
    },
    (err) => {
      setStatus('Error: ' + err, 'err');
      document.getElementById('btn-host').disabled = false;
      document.getElementById('btn-solo').disabled = false;
      document.getElementById('btn-join').disabled = false;
    }
  );
});

// Copy room code
document.getElementById('copy-btn').addEventListener('click', () => {
  navigator.clipboard.writeText(codeValEl.textContent).catch(() => {});
  document.getElementById('copy-btn').textContent = '✅ Copied!';
  setTimeout(() => { document.getElementById('copy-btn').textContent = '📋 click to copy'; }, 1500);
});

// ── JOIN button ────────────────────────────────────────
document.getElementById('btn-join').addEventListener('click', () => {
  const name = document.getElementById('pname').value.trim() || 'Player';
  const code = document.getElementById('join-code').value.trim();
  if (!code) { setStatus('Enter a room code first.', 'err'); return; }

  document.getElementById('btn-host').disabled = true;
  document.getElementById('btn-solo').disabled = true;
  document.getElementById('btn-join').disabled = true;
  setStatus('Connecting…', 'wait');

  joinGame(
    code,
    name,
    () => {
      setStatus('Connected! Waiting for host to start…', 'ok');
      refreshLobbyUI();
    },
    (err) => {
      setStatus('Failed to join: ' + err, 'err');
      document.getElementById('btn-host').disabled = false;
      document.getElementById('btn-solo').disabled = false;
      document.getElementById('btn-join').disabled = false;
    }
  );
});

// ── START GAME button (host only) ──────────────────────
document.getElementById('btn-start').addEventListener('click', () => {
  startMultiplayerGame();
  lobbyEl.classList.add('hidden');
});

// Keep lobby player list live while waiting
setInterval(() => {
  if (gameRunning) return;
  if (getIsHost()) refreshLobbyUI();
}, 1000);

// ── Solo: start ────────────────────────────────────────
function startSoloGame() {
  isSolo = true;
  const name  = document.getElementById('pname').value.trim() || 'Survivor';
  const color = SOLO_COLOR;

  resetMap(); clearEnemies(); clearPickups(); clearBullets(); clearParticles();
  enemyBullets.length = 0;
  score = 0; killCount = 0; buildMode = false;
  broadcastTimer = 0; gameRunning = true; gameState = 'game';

  preloadChunksAround(0, 0, 3);
  Object.keys(serverPlayers).forEach(k => delete serverPlayers[k]);

  const spawn = findValidSpawn(0, 0);
  serverPlayers[SOLO_ID] = createServerPlayer(SOLO_ID, name, color, spawn.x, spawn.y);
  cam.x = spawn.x;
  cam.y = spawn.y;
}

// ── Multiplayer host: start ────────────────────────────
export function startMultiplayerGame() {
  isSolo = false;
  const colorMap = {};
  resetColorIdx();
  colorMap[getMyId()] = getMyColor();
  Object.keys(getConnections()).forEach((pid, i) => {
    colorMap[pid] = NET_COLORS[(i + 1) % NET_COLORS.length];
  });
  sendStartSignal(colorMap);
  beginGame(colorMap);
}

// ── Begin game — multiplayer (host + clients) ──────────
function beginGame(playerColors) {
  isSolo = false;
  resetMap(); clearEnemies(); clearPickups(); clearBullets(); clearParticles();
  enemyBullets.length = 0;
  score = 0; killCount = 0; buildMode = false;
  broadcastTimer = 0; gameRunning = true; gameState = 'game';

  preloadChunksAround(0, 0, 3);

  if (getIsHost()) {
    Object.keys(serverPlayers).forEach(k => delete serverPlayers[k]);
    const allIds = [getMyId(), ...Object.keys(getConnections())];
    allIds.forEach((pid, i) => {
      const color = (playerColors && playerColors[pid]) || NET_COLORS[i % NET_COLORS.length];
      const name  = pid === getMyId() ? getMyName() : (remotePlayers[pid]?.name || 'Player');
      const angle = (i / allIds.length) * Math.PI * 2;
      const spawn = findValidSpawn(Math.cos(angle) * 80, Math.sin(angle) * 80);
      serverPlayers[pid] = createServerPlayer(pid, name, color, spawn.x, spawn.y);
    });
    const mySP = serverPlayers[getMyId()];
    cam.x = mySP.x; cam.y = mySP.y;
  } else {
    const spawn = findValidSpawn(0, 0);
    serverPlayers[getMyId()] = createServerPlayer(
      getMyId(), getMyName(), getMyColor(), spawn.x, spawn.y
    );
    cam.x = spawn.x; cam.y = spawn.y;
  }
}

// ── Switch weapon helper ───────────────────────────────
function switchWeapon(sp, weaponId) {
  sp.weaponId = weaponId;
  import('./weapons/weapons.js').then(m => {
    sp.weaponState = m.createWeaponState(weaponId);
  }).catch(() => {
    sp.weaponState = null;
  });
}

// ── Authoritative simulation (solo + host share this) ──
async function simulateAuthority(dt) {
  const localId = isSolo ? SOLO_ID : getMyId();
  const mySP    = serverPlayers[localId];

  if (mySP && !mySP.dead) {
    const { dx, dy } = getMovementVector();
    mySP.dx    = dx;
    mySP.dy    = dy;
    mySP.angle = Math.atan2(mouse.y - canvas.height / 2, mouse.x - canvas.width / 2);
    mySP.pendingShoot      = mouse.down && !buildMode;
    mySP.pendingMelee      = oneshot.melee;
    mySP.pendingReload     = oneshot.reload;
    mySP.buildMode         = buildMode;
    mySP.pendingWall       = mouse.clicked  && buildMode;
    mySP.pendingRemoveWall = mouse.rclicked && buildMode;
    mySP.mouseWx = Math.floor((mouse.x - canvas.width  / 2 + cam.x) / TS);
    mySP.mouseWy = Math.floor((mouse.y - canvas.height / 2 + cam.y) / TS);
    if (pendingWeaponSwitch) { switchWeapon(mySP, pendingWeaponSwitch); pendingWeaponSwitch = null; }
  }

  Object.values(serverPlayers).forEach(sp => {
    updateServerPlayer(sp, dt, getEnemies(),
      (sp, wx, wy) => tryPlaceWall(sp, wx, wy),
      (sp, wx, wy) => tryRemoveWall(sp, wx, wy),
      (sp)         => fireWeapon(sp, serverPlayers),
    );
  });

  if (mySP) {
    cam.x += (mySP.x - cam.x) * dt * 8;
    cam.y += (mySP.y - cam.y) * dt * 8;
  }

  updateBullets(dt, getEnemies(), serverPlayers);
  tickSpawner(dt, serverPlayers, 30);
  updateEnemies(dt, serverPlayers, enemyBullets, (e, pts) => {
    killCount++;
    score += pts;
    spawnPickup(e.x, e.y);
  });
  updatePickups(dt, serverPlayers);
  updateParticles(dt);

  // Game over when all players dead
  const alive = Object.values(serverPlayers).filter(p => !p.dead);
  if (alive.length === 0 && Object.keys(serverPlayers).length > 0) {
    gameState = 'gameover';
    if (!isSolo) sendGameOver();
  }

  // Only broadcast in multiplayer host mode
  if (!isSolo) {
    broadcastTimer += dt;
    if (broadcastTimer >= 1 / BROADCAST_HZ) {
      broadcastTimer = 0;
      const snap = await buildSnapshot();
      broadcastState(snap);
    }
  }
}

async function buildSnapshot() {
  const wallEntries = await getWallEntries();
  return {
    players:      Object.values(serverPlayers).map(playerSnapshot),
    enemies:      getEnemies().map(e => ({ id: e.id, x: e.x, y: e.y, angle: e.angle, hp: e.hp, maxHp: e.maxHp, type: e.type, bobTimer: e.bobTimer })),
    pickups:      getPickups().map(p => ({ x: p.x, y: p.y, type: p.type, weaponId: p.weaponId, bob: p.bob })),
    enemyBullets: enemyBullets.map(b => ({ x: b.x, y: b.y, vx: b.vx, vy: b.vy, life: b.life, maxLife: b.life, color: b.color, size: b.size })),
    wallEntries,
    score,
    killCount,
  };
}

async function getWallEntries() {
  const { walls } = await import('./world/mapgen.js');
  return [...walls.entries()].map(([k, v]) => [k, { hp: v.hp }]);
}

// ── Client simulation (joined player, not host) ────────
function simulateClient(dt) {
  const lp = serverPlayers[getMyId()];
  if (lp && !lp.dead) {
    const { dx, dy } = getMovementVector();
    import('./logic/collision.js').then(m => m.moveEntity(lp, dx * lp.speed * dt, dy * lp.speed * dt, 14));
    lp.angle = Math.atan2(mouse.y - canvas.height / 2, mouse.x - canvas.width / 2);
    if (dx || dy) { lp.bobTimer += dt * 8; lp.footAnim += dt * 6; }
    cam.x += (lp.x - cam.x) * dt * 8;
    cam.y += (lp.y - cam.y) * dt * 8;
  }

  updateParticles(dt);
  getEnemies().forEach(e => { e.bobTimer = (e.bobTimer || 0) + dt * 5; });

  const { dx, dy } = getMovementVector();
  const mouseWx = Math.floor((mouse.x - canvas.width  / 2 + cam.x) / TS);
  const mouseWy = Math.floor((mouse.y - canvas.height / 2 + cam.y) / TS);

  sendInputsToHost({
    dx, dy,
    angle:        Math.atan2(mouse.y - canvas.height / 2, mouse.x - canvas.width / 2),
    shoot:        mouse.down && !buildMode,
    melee:        oneshot.melee,
    reload:       oneshot.reload,
    buildMode,
    placeWall:    mouse.clicked  && buildMode,
    removeWall:   mouse.rclicked && buildMode,
    mouseWx, mouseWy,
    switchWeapon: pendingWeaponSwitch,
  });
  pendingWeaponSwitch = null;
}

// ── Client: apply host snapshot ────────────────────────
function applyStateSnapshot(data) {
  score     = data.score     || 0;
  killCount = data.killCount || 0;

  const myId = getMyId();
  (data.players || []).forEach(p => {
    if (!serverPlayers[p.id]) serverPlayers[p.id] = { ...p };
    const sp = serverPlayers[p.id];
    if (p.id === myId) {
      sp.x += (p.x - sp.x) * 0.35;
      sp.y += (p.y - sp.y) * 0.35;
      sp.hp = p.hp; sp.maxHp = p.maxHp; sp.dead = p.dead;
      sp.weaponId = p.weaponId;
      if (!sp.weaponState) sp.weaponState = {};
      sp.weaponState.ammo        = p.ammo;
      sp.weaponState.maxAmmo     = p.maxAmmo;
      sp.weaponState.reloadTimer = p.reloadTimer;
      sp.meleeActive = p.meleeActive; sp.meleeAngle = p.meleeAngle;
      sp.buildMode   = p.buildMode;   sp.wallsPlaced = p.wallsPlaced;
    } else {
      Object.assign(sp, p);
    }
  });

  const ids = new Set((data.players || []).map(p => p.id));
  Object.keys(serverPlayers).forEach(id => { if (!ids.has(id)) delete serverPlayers[id]; });

  const enemies = getEnemies();
  enemies.length = 0;
  (data.enemies || []).forEach(e => enemies.push({ ...e }));

  const pickups = getPickups();
  pickups.length = 0;
  (data.pickups || []).forEach(p => pickups.push({ ...p, life: 20 }));

  enemyBullets.length = 0;
  (data.enemyBullets || []).forEach(b => enemyBullets.push({ ...b }));

  import('./world/mapgen.js').then(m => {
    m.walls.clear();
    (data.wallEntries || []).forEach(([k, v]) => m.walls.set(k, v));
  });
}

// ── Main loop ──────────────────────────────────────────
let lastTime = 0;

function loop(ts) {
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;

  if (gameRunning && gameState === 'game') {
    if (isSolo || getIsHost()) simulateAuthority(dt);
    else                       simulateClient(dt);
  }

  const localId = isSolo ? SOLO_ID : getMyId();

  const renderState = {
    state:         gameState,
    cam,
    players:       serverPlayers,
    localPlayerId: localId,
    enemies:       getEnemies(),
    pickups:       getPickups(),
    bullets:       getBullets(),
    enemyBullets,
    particles:     getParticles(),
    score, killCount,
    buildMode,
    isHost:        isSolo || getIsHost(),
    pingMs:        isSolo ? 0 : pingMs,
    mouse,
    gameRunning,
    isSolo,
  };

  render(ctx, canvas, renderState, ts / 1000, dt);

  clearOneshots();
  requestAnimationFrame(loop);
}

requestAnimationFrame(ts => { lastTime = ts; requestAnimationFrame(loop); });