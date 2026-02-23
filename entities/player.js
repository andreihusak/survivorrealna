// ══════════════════════════════════════════════════════
//  player.js — player state, movement, melee logic
// ══════════════════════════════════════════════════════
import { moveEntity, normalizeAngle } from '../logic/collision.js';
import { spawnBurst, spawnDirectionalBurst, spawnParticle } from '../logic/particles.js';
import { createWeaponState, getWeaponDef } from '../weapons/weapons.js';
import { DEFAULT_WEAPON } from '../weapons/weapons.js';

export const PLAYER_RADIUS = 14;
export const PLAYER_SPEED  = 180;
export const MAX_WALLS     = 15;
export const MELEE_RANGE   = 70;
export const MELEE_DAMAGE  = 45;
export const MELEE_COOLDOWN = 0.6;
export const MELEE_ARC     = 1.2; // radians half-arc

export const PLAYER_COLORS = [
  '#4adeff','#ff6644','#44ff88','#ffdd44',
  '#cc88ff','#ff88cc','#88ffdd','#ff4488',
];

let _colorIdx = 0;
export function nextColor() { return PLAYER_COLORS[_colorIdx++ % PLAYER_COLORS.length]; }
export function resetColorIdx() { _colorIdx = 0; }

// ── Create a fresh server-side player object ──────────
export function createServerPlayer(id, name, color, spawnX, spawnY) {
  return {
    id, name, color,
    x: spawnX, y: spawnY,
    angle: 0,
    speed: PLAYER_SPEED,
    hp: 100, maxHp: 100,
    weaponId: DEFAULT_WEAPON,
    weaponState: createWeaponState(DEFAULT_WEAPON),
    meleeCooldown: 0,
    meleeActive: false, meleeAngle: 0, meleeTimer: 0,
    invincibleTimer: 0,
    wallsPlaced: 0, maxWalls: MAX_WALLS,
    buildMode: false,
    footAnim: 0, bobTimer: 0,
    dead: false,
    // Input staging (set by applyClientInputs or host direct read)
    dx: 0, dy: 0,
    pendingShoot: false, pendingMelee: false,
    pendingReload: false, pendingWall: false, pendingRemoveWall: false,
    mouseWx: 0, mouseWy: 0,
  };
}

// ── Per-frame update for one server player ────────────
export function updateServerPlayer(sp, dt, enemies, tryPlaceWallFn, tryRemoveWallFn, fireWeaponFn, onDeath) {
  if (sp.dead) return;

  // Movement
  moveEntity(sp, sp.dx * sp.speed * dt, sp.dy * sp.speed * dt, PLAYER_RADIUS);
  if (sp.dx || sp.dy) { sp.bobTimer += dt * 8; sp.footAnim += dt * 6; }

  // Weapon timers
  const wDef = getWeaponDef(sp);
  if (sp.weaponState.cooldown > 0)    sp.weaponState.cooldown -= dt;
  if (sp.weaponState.reloadTimer > 0) {
    sp.weaponState.reloadTimer -= dt;
    if (sp.weaponState.reloadTimer <= 0) sp.weaponState.ammo = sp.weaponState.maxAmmo;
  }
  if (sp.pendingReload && sp.weaponState.reloadTimer <= 0 && sp.weaponState.ammo < sp.weaponState.maxAmmo) {
    sp.weaponState.reloadTimer = wDef.reloadTime;
  }
  sp.pendingReload = false;

  // Melee timers
  if (sp.meleeCooldown > 0) sp.meleeCooldown -= dt;
  if (sp.meleeTimer > 0) { sp.meleeTimer -= dt; if (sp.meleeTimer <= 0) sp.meleeActive = false; }
  if (sp.invincibleTimer > 0) sp.invincibleTimer -= dt;

  // Shoot
  if (sp.pendingShoot && !sp.buildMode) fireWeaponFn(sp);
  sp.pendingShoot = false;

  // Melee
  if (sp.pendingMelee && sp.meleeCooldown <= 0) {
    sp.meleeCooldown  = MELEE_COOLDOWN;
    sp.meleeActive    = true;
    sp.meleeAngle     = sp.angle;
    sp.meleeTimer     = 0.25;
    performMelee(sp, enemies);
  }
  sp.pendingMelee = false;

  // Walls
  if (sp.pendingWall   && sp.buildMode) tryPlaceWallFn(sp, sp.mouseWx, sp.mouseWy);
  if (sp.pendingRemoveWall && sp.buildMode) tryRemoveWallFn(sp, sp.mouseWx, sp.mouseWy);
  sp.pendingWall = false; sp.pendingRemoveWall = false;
}

function performMelee(sp, enemies) {
  spawnDirectionalBurst(
    sp.x + Math.cos(sp.angle) * 40, sp.y + Math.sin(sp.angle) * 40,
    sp.angle, 2.0, 6, '#88eeff', 160, 0.2);

  enemies.forEach(e => {
    const ddx = e.x - sp.x, ddy = e.y - sp.y;
    const d   = Math.sqrt(ddx*ddx + ddy*ddy);
    if (d >= MELEE_RANGE) return;
    const aToE = Math.atan2(ddy, ddx);
    if (Math.abs(normalizeAngle(aToE - sp.angle)) >= MELEE_ARC) return;
    e.hp -= MELEE_DAMAGE;
    spawnDirectionalBurst(e.x, e.y, aToE, 1.4, 10,
      `hsl(0,100%,${50+Math.random()*30}%)`, 100, 0.4, 100);
    spawnParticle(e.x, e.y, 0, -40, '#fff', 0.3, 12);
  });
}

// Damage a player; returns true if killed
export function damagePlayer(sp, amount) {
  if (sp.dead || sp.invincibleTimer > 0) return false;
  sp.hp -= amount;
  sp.invincibleTimer = 0.3;
  spawnBurst(sp.x, sp.y, 6, '#ff4444', 140, 0.4, 3);
  if (sp.hp <= 0) {
    sp.hp = 0;
    sp.dead = true;
    spawnBurst(sp.x, sp.y, 22, sp.color || '#4adeff', 180, 0.8, 3);
    return true;
  }
  return false;
}

// Build a lightweight snapshot for network transmission
export function playerSnapshot(sp) {
  return {
    id: sp.id, name: sp.name, color: sp.color,
    x: sp.x, y: sp.y, angle: sp.angle,
    hp: sp.hp, maxHp: sp.maxHp,
    weaponId: sp.weaponId,
    ammo: sp.weaponState.ammo,
    maxAmmo: sp.weaponState.maxAmmo,
    reloadTimer: sp.weaponState.reloadTimer,
    dead: sp.dead,
    buildMode: sp.buildMode,
    meleeActive: sp.meleeActive, meleeAngle: sp.meleeAngle,
    footAnim: sp.footAnim, bobTimer: sp.bobTimer,
    wallsPlaced: sp.wallsPlaced, maxWalls: sp.maxWalls,
  };
}
