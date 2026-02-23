// ══════════════════════════════════════════════════════
//  mapgen.js — procedural world generation
//  Tile types:
//    0 = grass   1 = dirt   2 = stone
//    3 = water   4 = wall   5 = tree   6 = sand
// ══════════════════════════════════════════════════════
import { TS, CS } from '../main.js';

const chunks = new Map();
export const walls  = new Map(); // wallKey → { hp, ownerId }

export function chunkKey(cx, cy) { return `${cx},${cy}`; }
export function wallKey(wx, wy)  { return `${wx},${wy}`; }

// ── Noise ─────────────────────────────────────────────
export function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function smoothNoise(x, y, scale) {
  const fx = x / scale, fy = y / scale;
  const ix = Math.floor(fx), iy = Math.floor(fy);
  const tx = fx - ix, ty = fy - iy;
  const u  = tx * tx * (3 - 2 * tx), v = ty * ty * (3 - 2 * ty);
  const a  = hash2(ix,iy), b = hash2(ix+1,iy), c = hash2(ix,iy+1), d = hash2(ix+1,iy+1);
  return a + (b-a)*u + (c-a)*v + (a-b-c+d)*u*v;
}

// ── Chunk generation ──────────────────────────────────
function generateChunk(cx, cy) {
  const tiles = [];
  for (let ty = 0; ty < CS; ty++) {
    const row = [];
    for (let tx = 0; tx < CS; tx++) {
      const wx = cx * CS + tx, wy = cy * CS + ty;
      const n = smoothNoise(wx, wy, 20) * 0.5
              + smoothNoise(wx+200, wy+200, 8)  * 0.3
              + smoothNoise(wx+400, wy+400, 40) * 0.2;
      let tile;
      if      (n < 0.28) tile = 3; // water
      else if (n < 0.35) tile = 6; // sand
      else if (n < 0.55) tile = 0; // grass
      else if (n < 0.65) tile = 1; // dirt
      else if (n < 0.75) tile = 2; // stone
      else                tile = 0; // grass
      if ((tile === 0 || tile === 1) && hash2(wx*17, wy*31) < 0.08) tile = 5; // tree
      row.push(tile);
    }
    tiles.push(row);
  }
  return tiles;
}

export function getChunk(cx, cy) {
  const k = chunkKey(cx, cy);
  if (!chunks.has(k)) chunks.set(k, generateChunk(cx, cy));
  return chunks.get(k);
}

export function getTile(wx, wy) {
  if (walls.has(wallKey(wx, wy))) return 4;
  const cx = Math.floor(wx / CS), cy = Math.floor(wy / CS);
  return getChunk(cx, cy)[((wy % CS) + CS) % CS][((wx % CS) + CS) % CS];
}

export function isSolid(wx, wy) {
  const t = getTile(wx, wy);
  return t === 2 || t === 3 || t === 4 || t === 5;
}

// Pre-generate chunks around a world position
export function preloadChunksAround(worldX, worldY, radius = 2) {
  const cx = Math.floor(worldX / (CS * TS));
  const cy = Math.floor(worldY / (CS * TS));
  for (let dx = -radius; dx <= radius; dx++)
    for (let dy = -radius; dy <= radius; dy++)
      getChunk(cx + dx, cy + dy);
}

// Find a valid (non-solid) spawn position near origin
export function findValidSpawn(offsetX = 0, offsetY = 0) {
  for (let i = 0; i < 500; i++) {
    const tx = Math.round(offsetX / TS) + (i % 20);
    const ty = Math.round(offsetY / TS) + Math.floor(i / 20);
    if (!isSolid(tx, ty) && !isSolid(tx+1, ty) && !isSolid(tx, ty+1))
      return { x: tx * TS + TS / 2, y: ty * TS + TS / 2 };
  }
  return { x: TS, y: TS };
}

export function resetMap() {
  chunks.clear();
  walls.clear();
}

// Tile color lookup
export function getTileColor(t, variation) {
  const v = variation * 15;
  switch (t) {
    case 0: return `rgb(${55+v},${110+v},${45+v})`;   // grass
    case 1: return `rgb(${130+v},${95+v},${55+v})`;   // dirt
    case 2: return `rgb(${100+v},${100+v},${100+v})`; // stone
    case 3: return `rgb(${20+v},${80+v},${160+v})`;   // water
    case 4: return `rgb(${100+v},${70+v},${30+v})`;   // wall
    case 5: return `rgb(${40+v},${80+v},${30+v})`;    // tree base
    case 6: return `rgb(${210+v},${185+v},${120+v})`; // sand
    default: return '#333';
  }
}
