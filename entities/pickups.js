// ══════════════════════════════════════════════════════
//  pickups.js — item drops (ammo, health, weapons)
//  To add new pickup types, add to PICKUP_TYPES below.
// ══════════════════════════════════════════════════════
import { spawnBurst } from '../logic/particles.js';
import { WEAPONS, createWeaponState } from '../weapons/weapons.js';

export const PICKUP_LIFETIME = 20; // seconds before despawn

// ── Pickup type definitions ───────────────────────────
const PICKUP_TYPES = {
  ammo:   { color: '#ffdd44', glowColor: '#ffdd44', label: '+AMM', restoreAmount: 10 },
  health: { color: '#44ff88', glowColor: '#44ff88', label: '+HP',  restoreAmount: 25 },
  // weapon pickups are handled dynamically below
};

let pickups = [];
export function getPickups()   { return pickups; }
export function clearPickups() { pickups = []; }

export function spawnPickup(x, y) {
  const r = Math.random();
  if (r < 0.35) pickups.push({ x, y, type: 'ammo',   bob: Math.random()*Math.PI*2, life: PICKUP_LIFETIME });
  if (r < 0.15) pickups.push({ x, y, type: 'health', bob: Math.random()*Math.PI*2, life: PICKUP_LIFETIME });
  // Rare weapon drop
  if (Math.random() < 0.04) {
    const weaponKeys = Object.keys(WEAPONS).filter(k => k !== 'pistol');
    const wid = weaponKeys[Math.floor(Math.random() * weaponKeys.length)];
    pickups.push({ x, y, type: 'weapon', weaponId: wid, bob: Math.random()*Math.PI*2, life: PICKUP_LIFETIME });
  }
}

export function updatePickups(dt, allPlayers) {
  pickups = pickups.filter(p => {
    p.bob  += dt * 3;
    p.life -= dt;
    if (p.life <= 0) return false;

    let taken = false;
    Object.values(allPlayers).forEach(sp => {
      if (sp.dead || taken) return;
      const d2 = (sp.x - p.x)**2 + (sp.y - p.y)**2;
      if (d2 > 24*24) return;

      if (p.type === 'ammo') {
        sp.weaponState.ammo = Math.min(sp.weaponState.maxAmmo, sp.weaponState.ammo + 10);
        spawnBurst(p.x, p.y, 5, '#ffdd44', 70, 0.4, 2.5, 80);
      } else if (p.type === 'health') {
        sp.hp = Math.min(sp.maxHp, sp.hp + 25);
        spawnBurst(p.x, p.y, 5, '#44ff88', 70, 0.4, 2.5, 80);
      } else if (p.type === 'weapon') {
        sp.weaponId    = p.weaponId;
        sp.weaponState = createWeaponState(p.weaponId);
        spawnBurst(p.x, p.y, 8, '#cc88ff', 90, 0.5, 3, 80);
      }
      taken = true;
    });
    return !taken;
  });
}
