// ═══════════════════════════════════════════════
//  player.js — Player state, movement, shooting,
//              melee, wall building, weapon switching
//  To add weapons: edit constants.js C.WEAPONS
// ═══════════════════════════════════════════════

const Player = (() => {

  // The player object — single source of truth
  const p = {
    x: 0, y: 0,
    angle: 0,
    hp: C.PLAYER_MAX_HP,
    maxHp: C.PLAYER_MAX_HP,
    speed: C.PLAYER_SPEED,
    ammo: 0,
    maxAmmo: 0,
    reloadTimer: 0,
    shootCooldown: 0,
    meleeCooldown: 0,
    meleeActive: false,
    meleeAngle: 0,
    meleeTimer: 0,
    invincibleTimer: 0,
    footAnim: 0,
    bobTimer: 0,
    trail: [],
    wallsPlaced: 0,
    maxWalls: C.PLAYER_MAX_WALLS,
    buildMode: false,
    dead: false,
    weapon: 'pistol',           // current weapon key
    color: '#4adeff',
    name: 'Player',
  };

  // ── Init ──────────────────────────────────────
  function reset(spawnX, spawnY, name = 'Player', color = '#4adeff') {
    Object.assign(p, {
      x: spawnX, y: spawnY,
      angle: 0,
      hp: C.PLAYER_MAX_HP, maxHp: C.PLAYER_MAX_HP,
      reloadTimer: 0, shootCooldown: 0,
      meleeCooldown: 0, meleeActive: false, meleeTimer: 0,
      invincibleTimer: 0, footAnim: 0, bobTimer: 0,
      trail: [], wallsPlaced: 0, buildMode: false, dead: false,
      weapon: 'pistol', name, color,
    });
    _equipWeapon('pistol');
  }

  function _equipWeapon(key) {
    const w = C.WEAPONS[key];
    if (!w) return;
    p.weapon   = key;
    p.ammo     = w.ammoPerReload;
    p.maxAmmo  = w.ammoPerReload;
    p.reloadTimer = 0;
    p.shootCooldown = 0;
  }

  // ── Update (called each frame) ────────────────
  function update(dt, inputs, cam) {
    if (p.dead) return;

    // ── Movement ──────────────────────────────
    const { dx, dy } = inputs.move;
    const moving = dx !== 0 || dy !== 0;
    World.moveEntity(p, dx * p.speed * dt, dy * p.speed * dt, C.PLAYER_RADIUS);

    // ── Aim ───────────────────────────────────
    p.angle = inputs.aimAngle;

    // ── Animation ─────────────────────────────
    if (moving) {
      p.bobTimer  += dt * 8;
      p.footAnim  += dt * 6;
      p.trail.unshift({ x: p.x, y: p.y });
      if (p.trail.length > 8) p.trail.pop();
    }

    // ── Cooldown timers ───────────────────────
    if (p.shootCooldown   > 0) p.shootCooldown   -= dt;
    if (p.meleeCooldown   > 0) p.meleeCooldown   -= dt;
    if (p.invincibleTimer > 0) p.invincibleTimer -= dt;
    if (p.meleeTimer      > 0) { p.meleeTimer -= dt; if (p.meleeTimer <= 0) p.meleeActive = false; }

    // ── Reload ────────────────────────────────
    if (p.reloadTimer > 0) {
      p.reloadTimer -= dt;
      if (p.reloadTimer <= 0) {
        p.ammo = p.maxAmmo;
      }
    }
    if (inputs.reload && p.reloadTimer <= 0 && p.ammo < p.maxAmmo) {
      p.reloadTimer = C.WEAPONS[p.weapon].reloadTime;
    }

    // ── Build mode toggle ─────────────────────
    if (inputs.buildToggle) p.buildMode = !p.buildMode;

    // ── Weapon switch ─────────────────────────
    if (inputs.switchWeapon && C.WEAPONS[inputs.switchWeapon]) {
      _equipWeapon(inputs.switchWeapon);
    }

    // ── Shoot ─────────────────────────────────
    if (inputs.shoot && !p.buildMode) {
      _tryShoot();
    }

    // ── Melee ─────────────────────────────────
    if (inputs.melee) _tryMelee();

    // ── Wall actions ──────────────────────────
    if (p.buildMode) {
      if (inputs.placeWall)  _tryPlaceWall(inputs.mouseWorld);
      if (inputs.removeWall) _tryRemoveWall(inputs.mouseWorld);
    }

    // ── Camera ────────────────────────────────
    cam.x += (p.x - cam.x) * dt * C.CAM_LERP;
    cam.y += (p.y - cam.y) * dt * C.CAM_LERP;
  }

  // ── Shooting ──────────────────────────────────
  function _tryShoot() {
    const wDef = C.WEAPONS[p.weapon];
    if (p.shootCooldown > 0 || p.reloadTimer > 0) return;
    if (p.ammo <= 0) { p.reloadTimer = wDef.reloadTime; return; }

    p.ammo--;
    p.shootCooldown = wDef.firerate;

    const pellets = wDef.pellets || 1;
    for (let i = 0; i < pellets; i++) {
      const spread = (Math.random() - 0.5) * wDef.spread;
      const a = p.angle + spread;
      const bx = p.x + Math.cos(p.angle) * 22;
      const by = p.y + Math.sin(p.angle) * 22;
      Bullets.spawn(bx, by, Math.cos(a) * wDef.bulletSpeed, Math.sin(a) * wDef.bulletSpeed,
        wDef.bulletLife, wDef.damage, 'player');
    }

    // Muzzle flash particles
    const bx = p.x + Math.cos(p.angle) * 22;
    const by = p.y + Math.sin(p.angle) * 22;
    for (let i = 0; i < 6; i++) {
      const fa = p.angle + (Math.random()-0.5) * 1.2;
      Particles.spawn(bx, by, Math.cos(fa)*(100+Math.random()*180), Math.sin(fa)*(100+Math.random()*180),
        `hsl(${40+Math.random()*30},100%,${60+Math.random()*30}%)`, 0.12+Math.random()*0.08, 2+Math.random()*2);
    }
  }

  // ── Melee ─────────────────────────────────────
  function _tryMelee() {
    if (p.meleeCooldown > 0) return;
    p.meleeCooldown = C.MELEE_COOLDOWN;
    p.meleeActive   = true;
    p.meleeAngle    = p.angle;
    p.meleeTimer    = C.MELEE_DURATION;

    Enemies.hitMelee(p.x, p.y, p.angle, C.MELEE_RANGE, C.MELEE_ANGLE, C.MELEE_DAMAGE);

    for (let i = 0; i < 6; i++) {
      const fa = p.angle + (Math.random()-0.5) * 2.4;
      Particles.spawn(
        p.x + Math.cos(p.angle)*40, p.y + Math.sin(p.angle)*40,
        Math.cos(fa)*150, Math.sin(fa)*150,
        '#88eeff', 0.2+Math.random()*0.2, 2+Math.random()*2
      );
    }
  }

  // ── Wall placement ────────────────────────────
  function _tryPlaceWall(mw) {
    if (p.wallsPlaced >= p.maxWalls) return;
    const TS = C.TILE_SIZE;
    const ddx = mw.wx*TS + TS/2 - p.x;
    const ddy = mw.wy*TS + TS/2 - p.y;
    if (Math.hypot(ddx, ddy) > C.WALL_PLACE_DIST) return;
    if (World.placeWall(mw.wx, mw.wy, 'player')) {
      p.wallsPlaced++;
      for (let i = 0; i < 8; i++)
        Particles.spawn(mw.wx*TS+TS/2, mw.wy*TS+TS/2,
          (Math.random()-0.5)*80, (Math.random()-0.5)*80-30, '#8B6914', 0.5, 3, 120);
    }
  }

  function _tryRemoveWall(mw) {
    const owner = World.removeWall(mw.wx, mw.wy);
    if (owner === 'player') p.wallsPlaced = Math.max(0, p.wallsPlaced - 1);
  }

  // ── Take damage ───────────────────────────────
  function takeDamage(amount) {
    if (p.invincibleTimer > 0 || p.dead) return;
    p.hp -= amount;
    p.invincibleTimer = 0.3;
    for (let i = 0; i < 6; i++)
      Particles.spawn(p.x, p.y, (Math.random()-0.5)*150, (Math.random()-0.5)*150, '#ff4444', 0.4, 3, 80);
    if (p.hp <= 0) { p.hp = 0; p.dead = true; Game.state = 'gameover'; }
  }

  function heal(amount) { p.hp = Math.min(p.maxHp, p.hp + amount); }
  function addAmmo(amount) { p.ammo = Math.min(p.maxAmmo, p.ammo + amount); }

  return { reset, update, takeDamage, heal, addAmmo, get data() { return p; } };
})();
