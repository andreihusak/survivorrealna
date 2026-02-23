// ═══════════════════════════════════════════════
//  graphics/drawTiles.js — World tile rendering
//  To add a new tile: add a case in getTileColor()
//  and a case in the detail renderer below
// ═══════════════════════════════════════════════

const DrawTiles = (() => {

  function getTileColor(t, variation) {
    const v = variation * 15;
    switch (t) {
      case C.TILE.GRASS:  return `rgb(${55+v},${110+v},${45+v})`;
      case C.TILE.DIRT:   return `rgb(${130+v},${95+v},${55+v})`;
      case C.TILE.STONE:  return `rgb(${100+v},${100+v},${100+v})`;
      case C.TILE.WATER:  return `rgb(${20+v},${80+v},${160+v})`;
      case C.TILE.WALL:   return `rgb(${100+v},${70+v},${30+v})`;
      case C.TILE.TREE:   return `rgb(${40+v},${80+v},${30+v})`;
      case C.TILE.SAND:   return `rgb(${210+v},${185+v},${120+v})`;
      // ── Add new tile colors here ──
      default: return '#222';
    }
  }

  function draw(ctx, cam, t_secs) {
    const TS = C.TILE_SIZE;
    const tilesX = Math.ceil(canvas.width  / TS) + 3;
    const tilesY = Math.ceil(canvas.height / TS) + 3;
    const startX = Math.floor((cam.x - canvas.width  / 2) / TS) - 1;
    const startY = Math.floor((cam.y - canvas.height / 2) / TS) - 1;

    for (let ty = startY; ty < startY + tilesY; ty++) {
      for (let tx = startX; tx < startX + tilesX; tx++) {
        const tile = World.getTile(tx, ty);
        const variation = World.getVariation(tx, ty);

        // Base fill
        ctx.fillStyle = getTileColor(tile, variation);
        ctx.fillRect(tx*TS, ty*TS, TS, TS);

        // ── Per-tile detail rendering ──────────
        switch (tile) {
          case C.TILE.WATER:
            _drawWater(ctx, tx, ty, t_secs, TS);
            break;
          case C.TILE.TREE:
            _drawTree(ctx, tx, ty, TS);
            break;
          case C.TILE.WALL:
            _drawWall(ctx, tx, ty, TS);
            break;
          case C.TILE.GRASS:
            _drawGrass(ctx, tx, ty, variation, TS);
            break;
          case C.TILE.STONE:
            _drawStoneCrack(ctx, tx, ty, variation, TS);
            break;
          // ── Add new tile detail drawing here ──
        }
      }
    }

    // Subtle grid
    ctx.strokeStyle = 'rgba(0,0,0,0.04)';
    ctx.lineWidth = 0.5;
    for (let ty = startY; ty < startY + tilesY; ty++)
      for (let tx = startX; tx < startX + tilesX; tx++)
        ctx.strokeRect(tx*TS, ty*TS, TS, TS);
  }

  // ── Tile detail functions ──────────────────────

  function _drawWater(ctx, tx, ty, t, TS) {
    const shimmer = Math.sin(t*2 + tx*0.5 + ty*0.7) * 0.15 + 0.15;
    ctx.fillStyle = `rgba(120,200,255,${shimmer})`;
    ctx.fillRect(tx*TS, ty*TS, TS, TS);
  }

  function _drawTree(ctx, tx, ty, TS) {
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(tx*TS+TS/2+4, ty*TS+TS*0.85, 16, 8, 0, 0, Math.PI*2);
    ctx.fill();
    // Trunk
    ctx.fillStyle = '#5a3a18';
    ctx.fillRect(tx*TS+TS/2-5, ty*TS+TS/2, 10, TS/2-4);
    // Canopy gradient
    const cg = ctx.createRadialGradient(tx*TS+TS/2, ty*TS+TS/3, 2, tx*TS+TS/2, ty*TS+TS/3, 26);
    cg.addColorStop(0, '#5aba30'); cg.addColorStop(0.6, '#3a8a18'); cg.addColorStop(1, '#205010');
    ctx.fillStyle = cg;
    ctx.beginPath(); ctx.arc(tx*TS+TS/2, ty*TS+TS/3, 24, 0, Math.PI*2); ctx.fill();
    // Highlight
    ctx.fillStyle = 'rgba(150,255,100,0.12)';
    ctx.beginPath(); ctx.arc(tx*TS+TS/2-6, ty*TS+TS/3-6, 10, 0, Math.PI*2); ctx.fill();
  }

  function _drawWall(ctx, tx, ty, TS) {
    const w = World.getWall(tx, ty);
    const hp = w ? w.hp / C.WALL_HP : 1;
    ctx.fillStyle = `rgb(${Math.floor(140*hp)},${Math.floor(100*hp)},${Math.floor(50*hp)})`;
    ctx.fillRect(tx*TS+2, ty*TS+2, TS-4, TS-4);
    ctx.strokeStyle = '#a06020'; ctx.lineWidth = 2;
    ctx.strokeRect(tx*TS+2, ty*TS+2, TS-4, TS-4);
    // Brick lines
    ctx.strokeStyle = '#7a4010'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tx*TS,     ty*TS+TS/2); ctx.lineTo(tx*TS+TS, ty*TS+TS/2);
    ctx.moveTo(tx*TS+TS/4,  ty*TS); ctx.lineTo(tx*TS+TS/4,  ty*TS+TS/2);
    ctx.moveTo(tx*TS+TS*3/4, ty*TS); ctx.lineTo(tx*TS+TS*3/4, ty*TS+TS/2);
    ctx.moveTo(tx*TS+TS/2, ty*TS+TS/2); ctx.lineTo(tx*TS+TS/2, ty*TS+TS);
    ctx.stroke();
    // Damage cracks
    if (hp < 0.6) {
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tx*TS+10, ty*TS+10); ctx.lineTo(tx*TS+22, ty*TS+28); ctx.lineTo(tx*TS+15, ty*TS+40);
      ctx.stroke();
    }
  }

  function _drawGrass(ctx, tx, ty, variation, TS) {
    // Occasional grass blades
    if (variation > 0.7) {
      ctx.fillStyle = `rgba(30,${90+variation*30},20,0.4)`;
      const gx = tx*TS + variation*TS*0.8;
      const gy = ty*TS + (variation * 1.7 % 1) * TS * 0.8;
      for (let g = 0; g < 3; g++) {
        ctx.beginPath();
        ctx.moveTo(gx+g*4-4, gy+6); ctx.lineTo(gx+g*4-2, gy-4); ctx.lineTo(gx+g*4, gy+6);
        ctx.fill();
      }
    }
  }

  function _drawStoneCrack(ctx, tx, ty, variation, TS) {
    if (variation < 0.4) {
      ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tx*TS+8, ty*TS+12); ctx.lineTo(tx*TS+20, ty*TS+20);
      ctx.stroke();
    }
  }

  return { draw };
})();
