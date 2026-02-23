// ══════════════════════════════════════════════════════
//  collision.js — shared collision helpers
// ══════════════════════════════════════════════════════
import { isSolid } from '../world/mapgen.js';
import { TS } from '../main.js';

export function circleCollideSolid(x, y, r) {
  const m = r - 1;
  return isSolid(Math.floor((x - m) / TS), Math.floor(y / TS))
      || isSolid(Math.floor((x + m) / TS), Math.floor(y / TS))
      || isSolid(Math.floor(x / TS), Math.floor((y - m) / TS))
      || isSolid(Math.floor(x / TS), Math.floor((y + m) / TS));
}

export function moveEntity(ent, dx, dy, r) {
  const nx = ent.x + dx, ny = ent.y + dy;
  if (!circleCollideSolid(nx, ny, r)) { ent.x = nx; ent.y = ny; return; }
  if (!circleCollideSolid(nx, ent.y, r)) { ent.x = nx; return; }
  if (!circleCollideSolid(ent.x, ny, r)) { ent.y = ny; return; }
}

export function normalizeAngle(a) {
  while (a > Math.PI)  a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function dist2(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
}
