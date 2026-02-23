// ═══════════════════════════════════════════════
//  world.js — Terrain generation, tiles, walls
//  To add new tile types: edit C.TILE in constants.js
//  then add rendering in graphics/tiles.js
// ═══════════════════════════════════════════════

const World = (() => {
  const chunks = new Map();
  const walls  = new Map();

  // ── Hash / Noise ─────────────────────────────
  function hash2(x, y) {
    let h = (x * 374761393 + y * 668265263) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  function smoothNoise(x, y, scale) {
    const fx = x / scale, fy = y / scale;
    const ix = Math.floor(fx), iy = Math.floor(fy);
    const tx = fx - ix, ty = fy - iy;
    const u = tx * tx * (3 - 2 * tx);
    const v = ty * ty * (3 - 2 * ty);
    const a = hash2(ix,   iy),   b = hash2(ix+1, iy);
    const c = hash2(ix,   iy+1), d = hash2(ix+1, iy+1);
    return a + (b-a)*u + (c-a)*v + (a-b-c+d)*u*v;
  }

  // ── Chunk generation ─────────────────────────
  function generateChunk(cx, cy) {
    const CS = C.CHUNK_SIZE;
    const tiles = [];
    for (let ty = 0; ty < CS; ty++) {
      const row = [];
      for (let tx = 0; tx < CS; tx++) {
        const wx = cx*CS + tx, wy = cy*CS + ty;
        const n = smoothNoise(wx, wy, 20) * 0.5
                + smoothNoise(wx+200, wy+200, 8)  * 0.3
                + smoothNoise(wx+400, wy+400, 40) * 0.2;
        let t;
        if      (n < 0.28) t = C.TILE.WATER;
        else if (n < 0.35) t = C.TILE.SAND;
        else if (n < 0.55) t = C.TILE.GRASS;
        else if (n < 0.65) t = C.TILE.DIRT;
        else if (n < 0.75) t = C.TILE.STONE;
        else               t = C.TILE.GRASS;
        // Scatter trees
        if ((t === C.TILE.GRASS || t === C.TILE.DIRT) && hash2(wx*17, wy*31) < 0.08)
          t = C.TILE.TREE;
        row.push(t);
      }
      tiles.push(row);
    }
    return tiles;
  }

  function getChunk(cx, cy) {
    const k = `${cx},${cy}`;
    if (!chunks.has(k)) chunks.set(k, generateChunk(cx, cy));
    return chunks.get(k);
  }

  // ── Public API ───────────────────────────────
  function getTile(wx, wy) {
    if (walls.has(wallKey(wx, wy))) return C.TILE.WALL;
    const CS = C.CHUNK_SIZE;
    const cx = Math.floor(wx / CS), cy = Math.floor(wy / CS);
    const lx = ((wx % CS) + CS) % CS, ly = ((wy % CS) + CS) % CS;
    return getChunk(cx, cy)[ly][lx];
  }

  function isSolid(wx, wy) {
    const t = getTile(wx, wy);
    return t === C.TILE.STONE || t === C.TILE.WATER
        || t === C.TILE.WALL  || t === C.TILE.TREE;
  }

  // Circle vs tile collision — returns true if blocked
  function circleBlocked(x, y, r) {
    const m = r - 1, TS = C.TILE_SIZE;
    return isSolid(Math.floor((x-m)/TS), Math.floor(y/TS))
        || isSolid(Math.floor((x+m)/TS), Math.floor(y/TS))
        || isSolid(Math.floor(x/TS), Math.floor((y-m)/TS))
        || isSolid(Math.floor(x/TS), Math.floor((y+m)/TS));
  }

  // Axis-separated sliding move — modifies entity.x / entity.y
  function moveEntity(ent, dx, dy, r) {
    const nx = ent.x + dx, ny = ent.y + dy;
    if (!circleBlocked(nx, ny, r))       { ent.x = nx; ent.y = ny; return; }
    if (!circleBlocked(nx, ent.y, r))    { ent.x = nx; return; }
    if (!circleBlocked(ent.x, ny, r))    { ent.y = ny; return; }
  }

  function wallKey(wx, wy) { return `${wx},${wy}`; }

  function placeWall(wx, wy, ownerId) {
    const k = wallKey(wx, wy);
    if (!walls.has(k) && !isSolid(wx, wy)) {
      walls.set(k, { hp: C.WALL_HP, ownerId });
      return true;
    }
    return false;
  }

  function damageWall(wx, wy, dmg) {
    const k = wallKey(wx, wy);
    if (!walls.has(k)) return null;
    const w = walls.get(k);
    w.hp -= dmg;
    if (w.hp <= 0) { walls.delete(k); return w.ownerId; }  // returns ownerId so caller can decrement counter
    return null;
  }

  function removeWall(wx, wy) {
    const k = wallKey(wx, wy);
    if (walls.has(k)) { const w = walls.get(k); walls.delete(k); return w.ownerId; }
    return null;
  }

  function getWall(wx, wy) { return walls.get(wallKey(wx, wy)) || null; }

  function getWallsSnapshot() {
    return [...walls.entries()].map(([k, v]) => ({ k, hp: v.hp, ownerId: v.ownerId }));
  }

  function loadWallsSnapshot(snap) {
    walls.clear();
    (snap || []).forEach(w => walls.set(w.k, { hp: w.hp, ownerId: w.ownerId }));
  }

  function pregenChunks(range = 2) {
    for (let cx = -range; cx <= range; cx++)
      for (let cy = -range; cy <= range; cy++)
        getChunk(cx, cy);
  }

  function reset() { chunks.clear(); walls.clear(); }

  function findOpenSpawn(startX = 0, startY = 0) {
    const TS = C.TILE_SIZE;
    let x = startX, y = startY;
    for (let i = 0; i < 300; i++) {
      if (!isSolid(Math.floor(x/TS), Math.floor(y/TS))) return { x: x + TS/2, y: y + TS/2 };
      x += TS * (Math.random() < 0.5 ? 1 : -1);
      y += TS * (Math.random() < 0.5 ? 1 : -1);
    }
    return { x: TS/2, y: TS/2 };
  }

  // Expose hash2 for renderer to use for visual variation
  function getVariation(wx, wy) { return hash2(wx*7+1000, wy*13+2000); }

  return {
    getTile, isSolid, circleBlocked, moveEntity,
    placeWall, damageWall, removeWall, getWall,
    getWallsSnapshot, loadWallsSnapshot,
    pregenChunks, reset, findOpenSpawn, getVariation,
    wallKey,
  };
})();
