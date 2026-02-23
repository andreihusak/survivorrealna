// ══════════════════════════════════════════════════════
//  weapons.js — weapon registry
//  To add a new weapon: add an entry to WEAPONS below.
//  Fields:
//    name, damage, cooldown, ammo, reloadTime,
//    bulletSpeed, spread, burstCount (shots per click),
//    bulletLife, color, size (bullet visual radius)
// ══════════════════════════════════════════════════════

export const WEAPONS = {
  pistol: {
    name: 'Pistol',
    damage:      25,
    cooldown:    0.30,
    ammo:        12,
    maxAmmo:     12,
    reloadTime:  1.5,
    bulletSpeed: 580,
    spread:      0.06,
    burstCount:  1,
    bulletLife:  1.2,
    color:       '#ffe866',
    size:        3.5,
    muzzleColor: '#ffaa30',
  },
  smg: {
    name: 'SMG',
    damage:      14,
    cooldown:    0.08,
    ammo:        30,
    maxAmmo:     30,
    reloadTime:  2.0,
    bulletSpeed: 620,
    spread:      0.14,
    burstCount:  1,
    bulletLife:  1.0,
    color:       '#ffe866',
    size:        3,
    muzzleColor: '#ffcc20',
  },
  shotgun: {
    name: 'Shotgun',
    damage:      18,
    cooldown:    0.75,
    ammo:        6,
    maxAmmo:     6,
    reloadTime:  2.5,
    bulletSpeed: 500,
    spread:      0.35,
    burstCount:  6,   // fires 6 pellets
    bulletLife:  0.5,
    color:       '#ffaa44',
    size:        4,
    muzzleColor: '#ff8800',
  },
  sniper: {
    name: 'Sniper',
    damage:      90,
    cooldown:    1.2,
    ammo:        5,
    maxAmmo:     5,
    reloadTime:  3.0,
    bulletSpeed: 1200,
    spread:      0.01,
    burstCount:  1,
    bulletLife:  2.0,
    color:       '#88ffff',
    size:        2.5,
    muzzleColor: '#44ffff',
  },
  // ── ADD NEW WEAPONS HERE ──────────────────────────
  // rocketlauncher: { name: 'Rocket', damage: 80, cooldown: 1.5, ... },
};

export const DEFAULT_WEAPON = 'smg';

// Initialize a fresh weapon state for a player
export function createWeaponState(weaponId) {
  const def = WEAPONS[weaponId] || WEAPONS[DEFAULT_WEAPON];
  return {
    id:          weaponId,
    ammo:        def.ammo,
    maxAmmo:     def.maxAmmo,
    reloadTimer: 0,
    cooldown:    0,
  };
}

// Return the definition for a player's current weapon
export function getWeaponDef(player) {
  return WEAPONS[player.weaponId] || WEAPONS[DEFAULT_WEAPON];
}
