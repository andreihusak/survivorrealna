// ══════════════════════════════════════════════════════
//  enemies.js — enemy types, AI, spawning
//
//  To add a new enemy type, add an entry to ENEMY_TYPES
//  and it will automatically be included in spawning.
// ══════════════════════════════════════════════════════
import { moveEntity } from '../logic/collision.js';
import { spawnBurst } from '../logic/particles.js';
import { damagePlayer } from './player.js';
import { TS } from '../main.js';

// ── Enemy definitions ─────────────────────────────────
// Add new types here — they get randomly spawned
export const ENEMY_TYPES = {
  grunt: {
    hp: 60, speed: 100, size: 16,
    attackDamage: 12, attackCooldown: 1.0,
    scoreValue: 20,
    spawnWeight: 0.55,  // relative spawn probability
    color: '#2a6030',
  },
  brute: {
    hp: 180, speed: 65, size: 22,
    attackDamage: 22, attackCooldown: 1.6,
    scoreValue: 60,
    spawnWeight: 0.20,
    color: '#8B1515',
  },
  speeder: {
    hp: 40, speed: 170, size: 13,
    attackDamage: 8, attackCooldown: 0.4,
    scoreValue: 30,
    spawnWeight: 0.18,
    color: '#15558B',
  },
  ranger: {
    // Long-range shooter (shoots bullets back)
    hp: 55, speed: 55, size: 15,
    attackDamage: 0,  // handled separately via bullets
    attackCooldown: 2.0,
    scoreValue: 40,
    spawnWeight: 0.07,
    color: '#8B4588',
    ranged: true,
    rangeDistance: 280,
  },
  // ── ADD NEW ENEMY TYPES HERE ─────────────────────
  // titan: { hp: 400, speed: 40, size: 34, attackDamage: 35, ... },
};

// Build weighted spawn table
const _spawnTable = [];
Object.entries(ENEMY_TYPES).forEach(([type, def]) => {
  const count = Math.round(def.spawnWeight * 100);
  for (let i = 0; i < count; i++) _spawnTable.push(type);
});

let enemies = [];
let _eid = 0;
export let spawnTimer = 0;
export let spawnRate  = 4.0;

export function getEnemies()   { return enemies; }
export function clearEnemies() { enemies = []; _eid = 0; spawnTimer = 0; spawnRate = 4.0; }

export function spawnEnemy(allPlayers) {
  const alivePlayers = Object.values(allPlayers).filter(p => !p.dead);
  if (!alivePlayers.length) return;
  const ref   = alivePlayers[Math.floor(Math.random() * alivePlayers.length)];
  const angle = Math.random() * Math.PI * 2;
  const dist  = 500 + Math.random() * 250;
  const type  = _spawnTable[Math.floor(Math.random() * _spawnTable.length)];
  const def   = ENEMY_TYPES[type];

  enemies.push({
    id: _eid++, type,
    x: ref.x + Math.cos(angle) * dist,
    y: ref.y + Math.sin(angle) * dist,
    hp: def.hp, maxHp: def.hp,
    speed: def.speed, size: def.size,
    angle: 0,
    attackTimer: Math.random() * def.attackCooldown,
    bobTimer: Math.random() * Math.PI * 2,
    stunTimer: 0,
    color: def.color,
  });
}

// ── Per-frame update ──────────────────────────────────
export function updateEnemies(dt, allPlayers, enemyBullets, onKill) {
  const alivePlayers = Object.values(allPlayers).filter(p => !p.dead);

  enemies = enemies.filter(e => {
    // Death
    if (e.hp <= 0) {
      const def = ENEMY_TYPES[e.type];
      onKill(e, def.scoreValue);
      spawnBurst(e.x, e.y, 18, `hsl(${Math.random()*30},100%,60%)`, 170, 0.55, 2.5);
      return false;
    }

    if (e.stunTimer > 0) { e.stunTimer -= dt; e.bobTimer += dt*5; return true; }

    // Chase nearest alive player
    let nearest = null, nearestDist2 = Infinity;
    alivePlayers.forEach(p => {
      const d2 = (p.x-e.x)**2 + (p.y-e.y)**2;
      if (d2 < nearestDist2) { nearestDist2 = d2; nearest = p; }
    });

    if (nearest) {
      const def = ENEMY_TYPES[e.type];
      const edist = Math.sqrt(nearestDist2);
      e.angle = Math.atan2(nearest.y - e.y, nearest.x - e.x);

      // Ranged enemy: keep distance, shoot
      const stopRange = (def.ranged ? (def.rangeDistance || 250) : e.size + 20);
      if (edist > stopRange) {
        moveEntity(e, Math.cos(e.angle)*e.speed*dt, Math.sin(e.angle)*e.speed*dt, e.size - 2);
      }

      e.bobTimer += dt * 5;
      e.attackTimer -= dt;

      if (e.attackTimer <= 0) {
        e.attackTimer = def.attackCooldown;
        if (def.ranged) {
          // Ranger shoots a bullet toward player
          if (edist < (def.rangeDistance || 280) + 50) {
            enemyBullets.push({
              x: e.x, y: e.y,
              vx: Math.cos(e.angle) * 380,
              vy: Math.sin(e.angle) * 380,
              life: 1.6, damage: 14,
              color: '#dd44ff', size: 4,
            });
          }
        } else if (edist < e.size + 20) {
          // Melee attack nearest player
          damagePlayer(nearest, def.attackDamage);
        }
      }
    }

    return true;
  });

  // Enemy bullet updates (simple, no wall checking for perf; can add later)
  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const b = enemyBullets[i];
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.life <= 0) { enemyBullets.splice(i, 1); continue; }
    alivePlayers.forEach(p => {
      if ((p.x-b.x)**2 + (p.y-b.y)**2 < 18*18) {
        damagePlayer(p, b.damage);
        enemyBullets.splice(i, 1);
      }
    });
  }
}

export function tickSpawner(dt, allPlayers, maxEnemies = 30) {
  spawnTimer += dt;
  if (spawnTimer >= spawnRate) {
    spawnTimer = 0;
    if (enemies.length < maxEnemies) spawnEnemy(allPlayers);
    spawnRate = Math.max(1.2, spawnRate - 0.05);
  }
}
