// ═══════════════════════════════════════════════
//  bullets.js — Bullet lifecycle, collision
// ═══════════════════════════════════════════════

const Bullets = (() => {
  let list = [];

  function reset() { list = []; }

  function spawn(x, y, vx, vy, life, damage, owner) {
    list.push({ x, y, vx, vy, life, damage, owner });
  }

  function update(dt) {
    const TS = C.TILE_SIZE;
    list = list.filter(b => {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0) return false;

      const bwx = Math.floor(b.x / TS);
      const bwy = Math.floor(b.y / TS);

      // Hit solid tile
      if (World.isSolid(bwx, bwy)) {
        // Damage wall if it's a player-built wall
        if (World.getTile(bwx, bwy) === C.TILE.WALL) {
          const ownerId = World.damageWall(bwx, bwy, C.BULLET_WALL_DAMAGE);
          if (ownerId === 'player') {
            Player.data.wallsPlaced = Math.max(0, Player.data.wallsPlaced - 1);
          }
        }
        for (let i = 0; i < 4; i++)
          Particles.spawn(b.x, b.y, (Math.random()-0.5)*80, (Math.random()-0.5)*80, '#ccc', 0.25, 2, 80);
        return false;
      }

      // Bullet from player hits enemies
      if (b.owner === 'player') {
        if (Enemies.hitBullet(b.x, b.y, b.damage)) return false;
      }

      // Trail
      if (Math.random() < 0.4)
        Particles.spawn(b.x, b.y, (Math.random()-0.5)*15, (Math.random()-0.5)*15, '#ffdd44aa', 0.07, 1.5);

      return true;
    });
  }

  return { reset, spawn, update, get list() { return list; } };
})();
