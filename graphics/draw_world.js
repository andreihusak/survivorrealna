// ══════════════════════════════════════════════════════
//  draw_world.js — tile and world rendering
// ══════════════════════════════════════════════════════
import { getTile, getTileColor, wallKey, walls, hash2 } from '../world/mapgen.js';
import { TS } from '../main.js';

export function drawWorld(ctx, camX, camY, canvasW, canvasH, t) {
  const tilesX = Math.ceil(canvasW / TS) + 3;
  const tilesY = Math.ceil(canvasH / TS) + 3;
  const startX = Math.floor((camX - canvasW / 2) / TS) - 1;
  const startY = Math.floor((camY - canvasH / 2) / TS) - 1;

  for (let ty = startY; ty < startY + tilesY; ty++) {
    for (let tx = startX; tx < startX + tilesX; tx++) {
      const tile = getTile(tx, ty);
      const variation = hash2(tx * 7 + 1000, ty * 13 + 2000);

      ctx.fillStyle = getTileColor(tile, variation);
      ctx.fillRect(tx * TS, ty * TS, TS, TS);

      // Per-tile detail
      if (tile === 0) drawGrassDetail(ctx, tx, ty, variation);
      if (tile === 3) drawWaterShimmer(ctx, tx, ty, t);
      if (tile === 5) drawTree(ctx, tx, ty);
      if (tile === 4) drawWall(ctx, tx, ty);
      if (tile === 2) drawStoneDetail(ctx, tx, ty);
    }
  }

  // Subtle grid
  ctx.strokeStyle = 'rgba(0,0,0,0.04)';
  ctx.lineWidth = 0.5;
  for (let ty = startY; ty < startY + tilesY; ty++)
    for (let tx = startX; tx < startX + tilesX; tx++)
      ctx.strokeRect(tx * TS, ty * TS, TS, TS);
}

function drawGrassDetail(ctx, tx, ty, variation) {
  if (hash2(tx*31+5, ty*17+8) < 0.3) {
    const gx = tx*TS + variation*TS*0.8;
    const gy = ty*TS + hash2(tx+99, ty+77)*TS*0.8;
    ctx.fillStyle = `rgba(30,${90+variation*30},20,0.4)`;
    for (let g = 0; g < 3; g++) {
      ctx.beginPath();
      ctx.moveTo(gx + g*4 - 4, gy + 6);
      ctx.lineTo(gx + g*4 - 2, gy - 4);
      ctx.lineTo(gx + g*4,     gy + 6);
      ctx.fill();
    }
  }
}

function drawWaterShimmer(ctx, tx, ty, t) {
  const shimmer = Math.sin(t*2 + tx*0.5 + ty*0.7) * 0.15 + 0.15;
  ctx.fillStyle = `rgba(120,200,255,${shimmer})`;
  ctx.fillRect(tx*TS, ty*TS, TS, TS);
}

function drawTree(ctx, tx, ty) {
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(tx*TS+TS/2+4, ty*TS+TS*0.85, 16, 8, 0, 0, Math.PI*2);
  ctx.fill();
  // Trunk
  ctx.fillStyle = '#5a3a18';
  ctx.fillRect(tx*TS+TS/2-5, ty*TS+TS/2, 10, TS/2-4);
  // Canopy gradient
  const g = ctx.createRadialGradient(
    tx*TS+TS/2, ty*TS+TS/3, 2,
    tx*TS+TS/2, ty*TS+TS/3, 26
  );
  g.addColorStop(0, '#5aba30');
  g.addColorStop(0.6, '#3a8a18');
  g.addColorStop(1,   '#205010');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(tx*TS+TS/2, ty*TS+TS/3, 24, 0, Math.PI*2); ctx.fill();
  // Highlight
  ctx.fillStyle = 'rgba(150,255,100,0.15)';
  ctx.beginPath(); ctx.arc(tx*TS+TS/2-6, ty*TS+TS/3-6, 10, 0, Math.PI*2); ctx.fill();
}

function drawWall(ctx, tx, ty) {
  const wk = wallKey(tx, ty);
  const w  = walls.get(wk);
  const hp = w ? w.hp / 100 : 1;
  ctx.fillStyle = `rgb(${Math.floor(140*hp)},${Math.floor(100*hp)},${Math.floor(50*hp)})`;
  ctx.fillRect(tx*TS+2, ty*TS+2, TS-4, TS-4);
  ctx.strokeStyle = '#a06020'; ctx.lineWidth = 2;
  ctx.strokeRect(tx*TS+2, ty*TS+2, TS-4, TS-4);
  // Brick lines
  ctx.strokeStyle = '#7a4010'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(tx*TS,      ty*TS+TS/2); ctx.lineTo(tx*TS+TS, ty*TS+TS/2);
  ctx.moveTo(tx*TS+TS/4, ty*TS);     ctx.lineTo(tx*TS+TS/4, ty*TS+TS/2);
  ctx.moveTo(tx*TS+TS*3/4, ty*TS);   ctx.lineTo(tx*TS+TS*3/4, ty*TS+TS/2);
  ctx.moveTo(tx*TS+TS/2, ty*TS+TS/2);ctx.lineTo(tx*TS+TS/2, ty*TS+TS);
  ctx.stroke();
  if (hp < 0.6) {
    ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tx*TS+10, ty*TS+10); ctx.lineTo(tx*TS+20, ty*TS+30); ctx.lineTo(tx*TS+15, ty*TS+40);
    ctx.stroke();
  }
}

function drawStoneDetail(ctx, tx, ty) {
  if (hash2(tx*3, ty*7) < 0.4) {
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tx*TS+8, ty*TS+12); ctx.lineTo(tx*TS+20, ty*TS+18);
    ctx.stroke();
  }
}

// Build mode placement preview
export function drawBuildPreview(ctx, playerX, playerY, mouseWx, mouseWy, sp, isSolidFn) {
  const WALL_RANGE = 130;
  const ddx = mouseWx*TS+TS/2 - playerX;
  const ddy = mouseWy*TS+TS/2 - playerY;
  const inRange  = Math.sqrt(ddx*ddx+ddy*ddy) < WALL_RANGE;
  const canPlace = inRange && !isSolidFn(mouseWx, mouseWy) && (sp.wallsPlaced||0) < (sp.maxWalls||15);

  ctx.fillStyle   = canPlace ? 'rgba(200,150,50,0.35)' : 'rgba(255,50,50,0.25)';
  ctx.strokeStyle = canPlace ? '#ffaa44' : '#ff4444';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.rect(mouseWx*TS+2, mouseWy*TS+2, TS-4, TS-4);
  ctx.fill(); ctx.stroke();

  ctx.strokeStyle = 'rgba(255,170,50,0.2)'; ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath(); ctx.arc(playerX, playerY, WALL_RANGE, 0, Math.PI*2); ctx.stroke();
  ctx.setLineDash([]);
}
