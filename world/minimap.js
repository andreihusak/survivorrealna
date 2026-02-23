// ══════════════════════════════════════════════════════
//  minimap.js — minimap overlay renderer
// ══════════════════════════════════════════════════════
import { getTile, hash2 } from './mapgen.js';
import { TS } from '../main.js';

const MAP_SIZE   = 160; // px
const MAP_TILES  = 40;  // tiles shown each axis
const TILE_PX    = MAP_SIZE / MAP_TILES;
const PAD        = 16;

// Minimap canvas (off-screen, redrawn every N frames)
const mmCanvas = document.createElement('canvas');
mmCanvas.width  = MAP_SIZE;
mmCanvas.height = MAP_SIZE;
const mmCtx = mmCanvas.getContext('2d');

let mmRedrawTimer = 0;
const MM_REDRAW_INTERVAL = 0.25; // seconds

const TILE_COLORS = {
  0: '#3a7a2a',  // grass
  1: '#7a5a30',  // dirt
  2: '#666',     // stone
  3: '#1a5090',  // water
  4: '#8B6914',  // wall
  5: '#205010',  // tree
  6: '#c8a858',  // sand
};

export function updateMinimap(dt, camX, camY) {
  mmRedrawTimer += dt;
  if (mmRedrawTimer < MM_REDRAW_INTERVAL) return;
  mmRedrawTimer = 0;

  const originTX = Math.floor(camX / TS) - Math.floor(MAP_TILES / 2);
  const originTY = Math.floor(camY / TS) - Math.floor(MAP_TILES / 2);

  mmCtx.clearRect(0, 0, MAP_SIZE, MAP_SIZE);
  for (let ty = 0; ty < MAP_TILES; ty++) {
    for (let tx = 0; tx < MAP_TILES; tx++) {
      const t = getTile(originTX + tx, originTY + ty);
      mmCtx.fillStyle = TILE_COLORS[t] || '#333';
      mmCtx.fillRect(tx * TILE_PX, ty * TILE_PX, TILE_PX, TILE_PX);
    }
  }
}

export function drawMinimap(ctx, canvasW, canvasH, players, enemies, camX, camY) {
  const x = canvasW - PAD - MAP_SIZE;
  const y = PAD + 68; // below kill counter

  const originTX = Math.floor(camX / TS) - Math.floor(MAP_TILES / 2);
  const originTY = Math.floor(camY / TS) - Math.floor(MAP_TILES / 2);

  ctx.save();

  // Border & background
  ctx.fillStyle = 'rgba(5,10,20,0.82)';
  ctx.strokeStyle = '#1a3a5a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x - 3, y - 3, MAP_SIZE + 6, MAP_SIZE + 6, 6);
  ctx.fill(); ctx.stroke();

  // Draw tile cache
  ctx.drawImage(mmCanvas, x, y);

  // Clip to map area for blips
  ctx.beginPath();
  ctx.rect(x, y, MAP_SIZE, MAP_SIZE);
  ctx.clip();

  // Enemy blips
  ctx.fillStyle = '#ff4444';
  enemies.forEach(e => {
    const mx = ((e.x / TS) - originTX) * TILE_PX + x;
    const my = ((e.y / TS) - originTY) * TILE_PX + y;
    ctx.beginPath(); ctx.arc(mx, my, 2, 0, Math.PI * 2); ctx.fill();
  });

  // Player blips
  players.forEach(p => {
    if (p.dead) return;
    const mx = ((p.x / TS) - originTX) * TILE_PX + x;
    const my = ((p.y / TS) - originTY) * TILE_PX + y;
    ctx.fillStyle  = p.color || '#4adeff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(mx, my, 3.5, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // Direction tick
    ctx.strokeStyle = p.color || '#4adeff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.lineTo(mx + Math.cos(p.angle || 0) * 6, my + Math.sin(p.angle || 0) * 6);
    ctx.stroke();
  });

  ctx.restore();

  // Label
  ctx.fillStyle = '#2a4a6a';
  ctx.font = '9px Rajdhani';
  ctx.textAlign = 'right';
  ctx.fillText('MAP', canvasW - PAD - 3, y + MAP_SIZE + 12);
  ctx.textAlign = 'left';
}
