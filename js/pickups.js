// ═══════════════════════════════════════════════
//  pickups.js — Ammo / health drops
//  To add new pickup types: add a case in trySpawn,
//  update() pickup logic, and drawPickups.js
// ═══════════════════════════════════════════════

const Pickups = (() => {
  let list = [];

  function reset() { list = []; }

  function trySpawn(x, y) {
    if (Math.random() < C.AMMO_DROP_CHANCE)
      list.push({ x, y, type: 'ammo',   bob: Math.random()*Math.PI*2, life: C.PICKUP_LIFETIME });
    if (Math.random() < C.HEALTH_DROP_CHANCE)
      list.push({ x, y, type: 'health', bob: Math.random()*Math.PI*2, life: C.PICKUP_LIFETIME });
  }

  function update(dt) {
    const p = Player.data;
    list = list.filter(pk => {
      pk.bob  += dt * 3;
      pk.life -= dt;
      if (Math.hypot(pk.x - p.x, pk.y - p.y) < 24) {
        _collect(pk);
        return false;
      }
      return pk.life > 0;
    });
  }

  function _collect(pk) {
    if (pk.type === 'ammo') {
      Player.addAmmo(C.AMMO_PICKUP_AMOUNT);
      for (let i = 0; i < 6; i++)
        Particles.spawn(pk.x, pk.y, (Math.random()-0.5)*90, -50-Math.random()*50, '#ffdd44', 0.4, 2.5, 80);
    } else if (pk.type === 'health') {
      Player.heal(C.HEALTH_PICKUP_AMOUNT);
      for (let i = 0; i < 6; i++)
        Particles.spawn(pk.x, pk.y, (Math.random()-0.5)*90, -50-Math.random()*50, '#44ff88', 0.4, 2.5, 80);
    }
    // ── Add new pickup effects here ──
  }

  return { reset, trySpawn, update, get list() { return list; } };
})();


// ═══════════════════════════════════════════════
//  particles.js — Visual-only particle system
// ═══════════════════════════════════════════════

const Particles = (() => {
  let list = [];

  function reset() { list = []; }

  // gravity: pixels/s² downward
  function spawn(x, y, vx, vy, color, life, size = 3, gravity = 0) {
    list.push({ x, y, vx, vy, color, life, maxLife: life, size, gravity });
  }

  function update(dt) {
    list = list.filter(p => {
      p.x  += p.vx * dt;
      p.y  += p.vy * dt;
      p.vy += p.gravity * dt;
      p.life -= dt;
      return p.life > 0;
    });
  }

  return { reset, spawn, update, get list() { return list; } };
})();
