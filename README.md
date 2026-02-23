# SURVIVOR REALM — Modular Edition

## How to run
Open `index.html` in a browser.
Because it uses multiple JS files, you need a local server (not just double-click):

```bash
# Python 3
python -m http.server 8000
# then open http://localhost:8000

# Node (npx)
npx serve .
```

---

## Folder structure

```
survivor-realm/
├── index.html              ← Entry point + script load order
├── css/
│   └── style.css           ← All CSS (fonts, body, future overlays)
├── js/
│   ├── constants.js        ← ALL tunable values (weapons, enemies, speeds…)
│   ├── world.js            ← Terrain generation, tiles, wall system
│   ├── input.js            ← Keyboard, mouse, keybindings
│   ├── player.js           ← Movement, shooting, melee, building
│   ├── bullets.js          ← Bullet lifecycle, collision
│   ├── enemies.js          ← Spawning, AI, attack, death
│   ├── pickups.js          ← Ammo/health drops  (+ Particles)
│   ├── game.js             ← State machine, score, update orchestrator
│   ├── renderer.js         ← Main draw orchestrator, menu, overlays
│   ├── main.js             ← Canvas setup, game loop
│   └── graphics/
│       ├── drawTiles.js    ← Tile colors, tree/wall/water visuals
│       ├── drawEntities.js ← Player body, legs, weapon sprites, enemies
│       ├── drawEffects.js  ← Bullets, particles, pickups, crosshair
│       └── drawHUD.js      ← Health bar, ammo, score, minimap, build preview
└── assets/                 ← Put sprites/sounds here when ready
```

---

## How to add things

### New weapon
1. Open `js/constants.js`
2. Add an entry to `C.WEAPONS`:
   ```js
   sniper: {
     name: 'Sniper', damage: 90, firerate: 1.2,
     spread: 0.01, bulletSpeed: 900, bulletLife: 2.0,
     ammoPerReload: 5, reloadTime: 3.0,
   }
   ```
3. Add a keybinding in `js/input.js` (e.g. `Digit4 → 'sniper'`)
4. Add a visual in `js/graphics/drawEntities.js` → `_drawWeaponSprite()` switch case

### New enemy type
1. Open `js/constants.js`, add to `C.ENEMIES`:
   ```js
   bomber: {
     hp: 80, speed: 90, size: 18,
     attackDamage: 40, attackRate: 2.0,
     scoreValue: 60, color: '#885500',
     spawnWeight: 0.1,
   }
   ```
2. Add a draw case in `js/graphics/drawEntities.js` → `drawEnemy()` switch

### New tile type
1. Add a constant in `C.TILE` in `constants.js`
2. Add color in `drawTiles.js` → `getTileColor()`
3. Add generation logic in `world.js` → `generateChunk()`
4. Add visual detail in `drawTiles.js` switch

### New pickup type
1. Add spawn logic in `pickups.js` → `trySpawn()`
2. Add collect effect in `pickups.js` → `_collect()`
3. Add visual in `drawEffects.js` → `drawPickups()`

### Minimap
Already included — see `js/graphics/drawHUD.js` → `_drawMiniMap()`

### Mines / traps (future)
Create `js/mines.js` with `reset / update / spawn / draw` pattern,
add `<script src="js/mines.js">` in `index.html`,
call `Mines.update(dt)` in `game.js` and `Mines.draw(ctx)` in `renderer.js`
