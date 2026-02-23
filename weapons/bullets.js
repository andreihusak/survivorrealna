// ══════════════════════════════════════════════════════
//  bullets.js — bullet creation, movement, hit detection
// ══════════════════════════════════════════════════════
import { isSolid, wallKey } from '../world/mapgen.js';
import { damageWall } from '../world/walls.js';
import { getWeaponDef } from './weapons.js';
import { spawnParticle, spawnDirectionalBurst } from '../logic/particles.js';
import { TS } from '../main.js';

let bullets = [];
let _bid = 0;

export function getBullets() { return bullets; }
export function clearBullets() { bullets = []; }

// Fire weapon for a given server-player
export function fireWeapon(sp, allPlayers) {
  const def = getWeaponDef(sp);
  if (sp.weaponState.cooldown > 0) return;
  if (sp.weaponState.ammo <= 0) {
    if (sp.weaponState.reloadTimer <= 0) sp.weaponState.reloadTimer = def.reloadTime;
    return;
  }
  sp.weaponState.ammo--;
  sp.weaponState.cooldown = def.cooldown;

  const ox = sp.x + Math.cos(sp.angle) * 24;
  const oy = sp.y + Math.sin(sp.angle) * 24;

  for (let i = 0; i < (def.burstCount || 1); i++) {
    const a = sp.angle + (Math.random() - 0.5) * def.spread;
    bullets.push({
      id: _bid++,
      x: ox, y: oy,
      vx: Math.cos(a) * def.bulletSpeed,
      vy: Math.sin(a) * def.bulletSpeed,
      life: def.bulletLife,
      maxLife: def.bulletLife,
      damage: def.damage,
      fromPlayer: true,
      ownerId: sp.id,
      color: def.color,
      size:  def.size,
    });
  }

  // Muzzle flash particles
  spawnDirectionalBurst(ox, oy, sp.angle, 1.0, 6,
    `hsl(${40 + Math.random()*30},100%,${60 + Math.random()*20}%)`,
    150 + Math.random() * 180, 0.12, 0);
  spawnParticle(ox, oy, 0, 0, '#ffffff88', 0.05, def.size * 5);
}

// Update all bullets; runs on host only
export function updateBullets(dt, enemies, allPlayers) {
  bullets = bullets.filter(b => {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0) return false;

    const bwx = Math.floor(b.x / TS), bwy = Math.floor(b.y / TS);

    // Wall hit
    if (isSolid(bwx, bwy)) {
      const wk = wallKey(bwx, bwy);
      damageWall(wk, b.damage, allPlayers);
      spawnDirectionalBurst(b.x, b.y, Math.atan2(-b.vy, -b.vx), 0.8, 4, '#ccc', 60, 0.3, 80);
      return false;
    }

    // Enemy hit
    if (b.fromPlayer) {
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        const ex = b.x - e.x, ey = b.y - e.y;
        const esize = e.type === 'brute' ? 22 : 16;
        if (ex*ex + ey*ey < esize*esize) {
          e.hp -= b.damage;
          e.stunTimer = 0.1;
          spawnDirectionalBurst(b.x, b.y, Math.atan2(ey, ex), 1.2, 8,
            `hsl(0,100%,${50 + Math.random()*30}%)`, 80, 0.35, 80);
          return false;
        }
      }
    }

    // Trail
    if (Math.random() < 0.4)
      spawnParticle(b.x, b.y, 0, 0, b.color + '88', 0.08, b.size * 0.7);

    return true;
  });
}
