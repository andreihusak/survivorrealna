// ═══════════════════════════════════════════════
//  enemies.js — Spawning, AI, attack, death
//  To add new enemy types: edit C.ENEMIES in constants.js
//  then add a draw case in graphics/drawEnemies.js
// ═══════════════════════════════════════════════

const Enemies = (() => {
  let list = [];
  let spawnTimer = 0;
  let spawnRate  = C.ENEMY_SPAWN_START;
  let _eid = 0;

  function reset() {
    list = [];
    spawnTimer = 0;
    spawnRate  = C.ENEMY_SPAWN_START;
    _eid = 0;
  }

  // ── Spawn ─────────────────────────────────────
  function spawn() {
    if (list.length >= C.MAX_ENEMIES) return;
    const p   = Player.data;
    const angle = Math.random() * Math.PI * 2;
    const dist  = C.ENEMY_SPAWN_DIST + Math.random() * 200;

    // Weighted random type selection
    const types = Object.entries(C.ENEMIES);
    const total = types.reduce((s, [,v]) => s + v.spawnWeight, 0);
    let r = Math.random() * total;
    let type = types[0][0];
    for (const [k, v] of types) { r -= v.spawnWeight; if (r <= 0) { type = k; break; } }

    const def = C.ENEMIES[type];
    list.push({
      id: _eid++,
      type,
      x: p.x + Math.cos(angle) * dist,
      y: p.y + Math.sin(angle) * dist,
      hp: def.hp,
      maxHp: def.hp,
      speed: def.speed,
      size: def.size,
      attackDamage: def.attackDamage,
      attackRate:   def.attackRate,
      attackTimer:  Math.random() * def.attackRate,
      stunTimer: 0,
      angle: 0,
      bobTimer: Math.random() * Math.PI * 2,
      color: def.color,
      scoreValue: def.scoreValue,
    });
  }

  // ── Update ────────────────────────────────────
  function update(dt) {
    // Spawn timer
    spawnTimer += dt;
    if (spawnTimer >= spawnRate) {
      spawnTimer = 0;
      spawn();
      spawnRate = Math.max(C.ENEMY_SPAWN_MIN, spawnRate - C.ENEMY_SPAWN_STEP);
    }

    const p = Player.data;
    list = list.filter(e => {
      if (e.hp <= 0) {
        _onDeath(e);
        return false;
      }
      if (e.stunTimer > 0) { e.stunTimer -= dt; return true; }

      // Chase player
      const ex = p.x - e.x, ey = p.y - e.y;
      const dist = Math.hypot(ex, ey);
      if (dist > 0) {
        e.angle = Math.atan2(ey, ex);
        World.moveEntity(e, Math.cos(e.angle)*e.speed*dt, Math.sin(e.angle)*e.speed*dt, 12);
      }
      e.bobTimer += dt * 5;

      // Attack player
      if (dist < e.size + C.PLAYER_RADIUS) {
        e.attackTimer -= dt;
        if (e.attackTimer <= 0) {
          e.attackTimer = e.attackRate;
          Player.takeDamage(e.attackDamage);
        }
      }

      return true;
    });
  }

  function _onDeath(e) {
    Game.addScore(e.scoreValue);
    Game.addKill();
    for (let i = 0; i < 18; i++)
      Particles.spawn(e.x, e.y,
        (Math.random()-0.5)*180, (Math.random()-0.5)*180-50,
        `hsl(${Math.random()*30},100%,${50+Math.random()*30}%)`,
        0.5+Math.random()*0.4, 2+Math.random()*2, 100);
    Pickups.trySpawn(e.x, e.y);
  }

  // ── Bullet hit ────────────────────────────────
  function hitBullet(x, y, damage, ownType) {
    for (let i = list.length - 1; i >= 0; i--) {
      const e = list[i];
      const def = C.ENEMIES[e.type] || {};
      const size = e.size || 16;
      if (Math.hypot(x - e.x, y - e.y) < size) {
        e.hp -= damage;
        e.stunTimer = 0.1;
        const ea = Math.atan2(y - e.y, x - e.x);
        for (let j = 0; j < 7; j++)
          Particles.spawn(x, y,
            Math.cos(ea+(Math.random()-0.5)*1.5)*(50+Math.random()*90),
            Math.sin(ea+(Math.random()-0.5)*1.5)*(50+Math.random()*90),
            `hsl(0,100%,${50+Math.random()*30}%)`, 0.3, 2, 80);
        return true; // bullet consumed
      }
    }
    return false;
  }

  // ── Melee hit ─────────────────────────────────
  function hitMelee(px, py, angle, range, arc, damage) {
    list.forEach(e => {
      const dx = e.x - px, dy = e.y - py;
      if (Math.hypot(dx, dy) >= range) return;
      const aToE = Math.atan2(dy, dx);
      let diff = aToE - angle;
      while (diff >  Math.PI) diff -= Math.PI*2;
      while (diff < -Math.PI) diff += Math.PI*2;
      if (Math.abs(diff) >= arc) return;
      e.hp -= damage;
      for (let i = 0; i < 10; i++)
        Particles.spawn(e.x, e.y,
          (Math.random()-0.5)*200, (Math.random()-0.5)*200,
          `hsl(0,100%,${50+Math.random()*30}%)`, 0.4, 2.5, 100);
    });
  }

  return { reset, update, hitBullet, hitMelee, get list() { return list; } };
})();
