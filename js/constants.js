// ═══════════════════════════════════════════════
//  constants.js — Tune game values here
// ═══════════════════════════════════════════════

const C = {
  // World
  TILE_SIZE:   48,   // pixels per tile
  CHUNK_SIZE:  16,   // tiles per chunk

  // Player
  PLAYER_SPEED:      180,
  PLAYER_RADIUS:     14,
  PLAYER_MAX_HP:     100,
  PLAYER_MAX_AMMO:   30,
  PLAYER_MAX_WALLS:  15,
  PLAYER_RELOAD_TIME: 2.0,

  // Weapons  ← add new weapons config here
  WEAPONS: {
    pistol: {
      name: 'Pistol',
      damage: 25,
      firerate: 0.12,   // seconds between shots
      spread: 0.08,
      bulletSpeed: 600,
      bulletLife: 1.2,
      ammoPerReload: 30,
      reloadTime: 2.0,
    },
    shotgun: {
      name: 'Shotgun',
      damage: 18,
      firerate: 0.7,
      spread: 0.35,
      pellets: 5,
      bulletSpeed: 500,
      bulletLife: 0.6,
      ammoPerReload: 8,
      reloadTime: 2.5,
    },
    smg: {
      name: 'SMG',
      damage: 12,
      firerate: 0.06,
      spread: 0.12,
      bulletSpeed: 650,
      bulletLife: 0.9,
      ammoPerReload: 45,
      reloadTime: 1.8,
    },
  },

  // Enemies  ← add new enemy types here
  ENEMIES: {
    grunt: {
      hp: 60, speed: 100, size: 16,
      attackDamage: 12, attackRate: 1.0,
      scoreValue: 20, color: '#2a6030',
      spawnWeight: 0.6,
    },
    brute: {
      hp: 120, speed: 70, size: 22,
      attackDamage: 20, attackRate: 1.5,
      scoreValue: 50, color: '#8B1515',
      spawnWeight: 0.2,
    },
    speeder: {
      hp: 40, speed: 160, size: 14,
      attackDamage: 8, attackRate: 0.4,
      scoreValue: 30, color: '#15558B',
      spawnWeight: 0.2,
    },
    // ── Add new enemy types below ──
    // bomber: {
    //   hp: 80, speed: 90, size: 18,
    //   attackDamage: 40, attackRate: 2.0,
    //   scoreValue: 60, color: '#885500',
    //   spawnWeight: 0.1, explodes: true,
    // },
  },

  // Spawning
  MAX_ENEMIES:       30,
  ENEMY_SPAWN_START: 4.0,   // seconds between spawns (start)
  ENEMY_SPAWN_MIN:   1.2,   // fastest spawn rate
  ENEMY_SPAWN_STEP:  0.04,  // how much faster each wave
  ENEMY_SPAWN_DIST:  500,   // min distance from player

  // Pickups
  AMMO_DROP_CHANCE:   0.35,
  HEALTH_DROP_CHANCE: 0.18,
  AMMO_PICKUP_AMOUNT: 10,
  HEALTH_PICKUP_AMOUNT: 20,
  PICKUP_LIFETIME:    20,   // seconds before despawn

  // Melee
  MELEE_DAMAGE:   45,
  MELEE_RANGE:    70,
  MELEE_ANGLE:    1.2,  // radians half-arc
  MELEE_COOLDOWN: 0.6,
  MELEE_DURATION: 0.25,

  // Wall
  WALL_HP:        100,
  WALL_PLACE_DIST: 120,
  BULLET_WALL_DAMAGE: 20,

  // Camera
  CAM_LERP: 8,

  // Broadcast rate (singleplayer = unused)
  HOST_BROADCAST_HZ: 30,

  // Colors for multiplayer
  PLAYER_COLORS: ['#4adeff','#ff6644','#44ff88','#ffdd44','#cc88ff','#ff88cc','#88ffdd','#ff4488'],

  // Tile types
  TILE: { GRASS:0, DIRT:1, STONE:2, WATER:3, WALL:4, TREE:5, SAND:6 },
};
