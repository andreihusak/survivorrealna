# SURVIVOR REALM — Addon System

Drop any `.js` file into this folder and import it in `main.js` to extend the game.
The architecture is designed for easy additions — no touching core files.

---

## Adding a New Enemy Type

Edit `entities/enemies.js` → `ENEMY_TYPES` object:

```js
titan: {
  hp: 400, speed: 38, size: 34,
  attackDamage: 35, attackCooldown: 2.0,
  scoreValue: 150,
  spawnWeight: 0.03,   // rare
  color: '#ff2200',
},
```

Add a draw function in `graphics/draw_entities.js` → `drawEnemy()` switch.

---

## Adding a New Weapon

Edit `weapons/weapons.js` → `WEAPONS` object:

```js
flamethrower: {
  name: 'Flamethrower',
  damage: 8,
  cooldown: 0.05,
  ammo: 60,  maxAmmo: 60,
  reloadTime: 3.0,
  bulletSpeed: 280,
  spread: 0.5,
  burstCount: 1,
  bulletLife: 0.4,
  color: '#ff6600',
  size: 5,
  muzzleColor: '#ff8800',
},
```

Add key binding in `main.js` keydown handler. No other files needed.

---

## Adding a New Pickup Type

Edit `entities/pickups.js` → `spawnPickup()`:

```js
if (Math.random() < 0.05)
  pickups.push({ x, y, type: 'shield', bob: 0, life: 20 });
```

Handle it in `updatePickups()` and draw it in `graphics/draw_entities.js` → `drawPickup()`.

---

## Adding a New Biome / Tile Type

Edit `world/mapgen.js`:
1. Add a new tile ID (e.g. `7 = lava`)
2. Add noise thresholds in `generateChunk()`
3. Add color in `getTileColor()`
4. Add solid check in `isSolid()` if needed
5. Add visual in `graphics/draw_world.js` → `drawWorld()`

---

## Creating a Full Addon Module

Example: `addons/poison_zone.js`

```js
// addons/poison_zone.js — Periodic poison zones
import { spawnParticle } from '../logic/particles.js';
import { damagePlayer } from '../entities/player.js';

export const poisonZones = [];

export function updatePoisonZones(dt, allPlayers) {
  poisonZones.forEach(zone => {
    Object.values(allPlayers).forEach(p => {
      const d = Math.hypot(p.x - zone.x, p.y - zone.y);
      if (d < zone.radius) damagePlayer(p, 5 * dt);
    });
    spawnParticle(zone.x + (Math.random()-0.5)*zone.radius*2,
                  zone.y + (Math.random()-0.5)*zone.radius*2,
                  0, -20, '#44ff44', 0.5, 4, -30);
  });
}
```

Then in `main.js` `updateGame()`:
```js
import { updatePoisonZones, poisonZones } from './addons/poison_zone.js';
// ...
updatePoisonZones(dt, serverPlayers);
```

---

## File Map

```
index.html           ← entry, imports main.js as module
main.js              ← game loop, state, orchestration
network.js           ← PeerJS multiplayer (host/client)
world/
  mapgen.js          ← noise, chunk gen, tile lookup
  minimap.js         ← minimap renderer
  walls.js           ← placeable walls
entities/
  player.js          ← player state, movement, melee
  enemies.js         ← enemy AI, spawning registry
  pickups.js         ← item drops
weapons/
  weapons.js         ← weapon definitions registry
  bullets.js         ← bullet sim, hit detection
graphics/
  renderer.js        ← master draw orchestrator
  draw_world.js      ← tile rendering
  draw_entities.js   ← player/enemy/bullet/pickup draw
  hud.js             ← all UI overlays
logic/
  collision.js       ← shared collision math
  input.js           ← keyboard/mouse state
  particles.js       ← particle system
addons/              ← drop new .js files here
  ADDON_README.md    ← this file
```
