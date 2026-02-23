// ══════════════════════════════════════════════════════
//  walls.js — player-placeable wall management
// ══════════════════════════════════════════════════════
import { walls, wallKey, isSolid } from './mapgen.js';
import { TS } from '../main.js';
import { spawnBurst } from '../logic/particles.js';

export const WALL_HP       = 100;
export const WALL_PLACE_RANGE = 130;

export function tryPlaceWall(sp, mouseWx, mouseWy) {
  if ((sp.wallsPlaced || 0) >= (sp.maxWalls || 15)) return false;
  const ddx = mouseWx * TS + TS/2 - sp.x;
  const ddy = mouseWy * TS + TS/2 - sp.y;
  if (Math.sqrt(ddx*ddx + ddy*ddy) > WALL_PLACE_RANGE) return false;
  const wk = wallKey(mouseWx, mouseWy);
  if (walls.has(wk) || isSolid(mouseWx, mouseWy)) return false;

  walls.set(wk, { hp: WALL_HP, ownerId: sp.id });
  sp.wallsPlaced = (sp.wallsPlaced || 0) + 1;
  spawnBurst(mouseWx * TS + TS/2, mouseWy * TS + TS/2, 8, '#8B6914', 60, 0.5, 3);
  return true;
}

export function tryRemoveWall(sp, mouseWx, mouseWy) {
  const wk = wallKey(mouseWx, mouseWy);
  const w  = walls.get(wk);
  if (!w) return false;
  // Allow owner or host (ownerId undefined) to remove
  if (w.ownerId && w.ownerId !== sp.id) return false;
  walls.delete(wk);
  sp.wallsPlaced = Math.max(0, (sp.wallsPlaced || 0) - 1);
  return true;
}

export function damageWall(wk, dmg, allPlayers) {
  const w = walls.get(wk);
  if (!w) return false;
  w.hp -= dmg;
  if (w.hp <= 0) {
    walls.delete(wk);
    // Decrement owner's count
    if (w.ownerId && allPlayers[w.ownerId]) {
      allPlayers[w.ownerId].wallsPlaced = Math.max(0, (allPlayers[w.ownerId].wallsPlaced || 0) - 1);
    }
    return true; // destroyed
  }
  return false;
}
