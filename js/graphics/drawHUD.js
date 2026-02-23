// ═══════════════════════════════════════════════
//  graphics/drawHUD.js — All screen-space UI:
//    HP bar, ammo, score, build mode,
//    minimap, weapon indicator
//  To add UI elements: add functions here
// ═══════════════════════════════════════════════

const DrawHUD = (() => {

  // ── Main HUD entry point ──────────────────────
  function draw(ctx, p, score, killCount, cam) {
    _drawHealthBar(ctx, p);
    _drawAmmoPanel(ctx, p);
    _drawScoreKills(ctx, score, killCount);
    _drawWeaponIndicator(ctx, p);
    if (p.buildMode) _drawBuildBanner(ctx, p);
    _drawMiniMap(ctx, p, cam);
    _drawMeleeCooldown(ctx, p);
    _drawBuildPreview(ctx, p, cam);
    _drawTips(ctx);
  }

  // ── Health bar ────────────────────────────────
  function _drawHealthBar(ctx, p) {
    const pad = 20, bw = 280, bh = 16;
    _panel(ctx, pad, canvas.height-90, 320, 70);
    ctx.fillStyle = '#88aabb'; ctx.font = '700 13px Rajdhani';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('HEALTH', pad+15, canvas.height-72);
    // Bar bg
    ctx.fillStyle = '#0a1820';
    ctx.fillRect(pad+15, canvas.height-62, bw, bh);
    // Bar fill
    const ratio = Math.max(0, p.hp / p.maxHp);
    const hg = ctx.createLinearGradient(pad+15, 0, pad+15+bw, 0);
    hg.addColorStop(0, '#ff3311'); hg.addColorStop(0.5, '#ff6633'); hg.addColorStop(1, '#ff9944');
    ctx.fillStyle = hg;
    ctx.fillRect(pad+15, canvas.height-62, bw*ratio, bh);
    ctx.strokeStyle='#2a5a7a'; ctx.lineWidth=1;
    ctx.strokeRect(pad+15, canvas.height-62, bw, bh);
    ctx.fillStyle='#fff'; ctx.font='600 12px Rajdhani';
    ctx.fillText(`${Math.ceil(Math.max(0,p.hp))} / ${p.maxHp}`, pad+20, canvas.height-50);
  }

  // ── Ammo panel ────────────────────────────────
  function _drawAmmoPanel(ctx, p) {
    const pad = 20, pw = 210;
    _panel(ctx, canvas.width-pad-pw, canvas.height-90, pw, 70);
    ctx.textAlign = 'right';
    if (p.reloadTimer > 0) {
      ctx.fillStyle='#ffaa44'; ctx.font='700 14px Rajdhani';
      ctx.fillText('RELOADING…', canvas.width-pad-15, canvas.height-65);
      const rp = 1 - p.reloadTimer / C.WEAPONS[p.weapon].reloadTime;
      ctx.fillStyle='#0a1820'; ctx.fillRect(canvas.width-pad-195, canvas.height-55, 180, 8);
      ctx.fillStyle='#ffaa44'; ctx.fillRect(canvas.width-pad-195, canvas.height-55, 180*rp, 8);
    } else {
      ctx.fillStyle='#88aabb'; ctx.font='700 13px Rajdhani';
      ctx.fillText('AMMO', canvas.width-pad-15, canvas.height-72);
      ctx.fillStyle = p.ammo>5?'#fff': p.ammo>0?'#ff8844':'#ff3333';
      ctx.font="700 26px 'Cinzel'";
      ctx.fillText(`${p.ammo}`, canvas.width-pad-15, canvas.height-48);
      ctx.fillStyle='#445'; ctx.font='400 13px Rajdhani';
      ctx.fillText(`/ ${p.maxAmmo}`, canvas.width-pad-15, canvas.height-28);
    }
    ctx.textAlign = 'left';
  }

  // ── Score / kills ─────────────────────────────
  function _drawScoreKills(ctx, score, kills) {
    const cx = canvas.width/2;
    _panel(ctx, cx-80, 20, 160, 38);
    ctx.strokeStyle='#1a4a6a'; ctx.lineWidth=1; ctx.stroke();
    ctx.fillStyle='#4adeff'; ctx.font="700 18px 'Cinzel'";
    ctx.textAlign='center'; ctx.fillText(`${score}`, cx, 44); ctx.textAlign='left';

    _panel(ctx, canvas.width-120, 20, 100, 38);
    ctx.fillStyle='#ff5544'; ctx.font='700 14px Rajdhani';
    ctx.textAlign='right'; ctx.fillText(`☠ ${kills}`, canvas.width-20, 44); ctx.textAlign='left';
  }

  // ── Weapon indicator ──────────────────────────
  function _drawWeaponIndicator(ctx, p) {
    const wDef = C.WEAPONS[p.weapon];
    if (!wDef) return;
    _panel(ctx, 20, 20, 160, 38);
    ctx.fillStyle = '#4adeff88'; ctx.font = '700 13px Rajdhani';
    ctx.fillText(`⚙ ${wDef.name.toUpperCase()}`, 34, 44);
    ctx.fillStyle = '#2a5a7a'; ctx.font = '11px Rajdhani';
    ctx.fillText('[1] Pistol [2] Shotgun [3] SMG', 24, canvas.height-22);
  }

  // ── Build mode banner ─────────────────────────
  function _drawBuildBanner(ctx, p) {
    const cx = canvas.width/2;
    ctx.fillStyle = 'rgba(5,10,20,0.85)';
    _roundRect(ctx, cx-120, 20, 240, 38, 8); ctx.fill();
    ctx.strokeStyle='#ff9922'; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle='#ffaa44'; ctx.font='700 14px Rajdhani'; ctx.textAlign='center';
    ctx.fillText(`🔨 BUILD MODE  [${p.wallsPlaced}/${p.maxWalls}]`, cx, 44);
    ctx.textAlign='left';
  }

  // ── Melee cooldown bar ────────────────────────
  function _drawMeleeCooldown(ctx, p) {
    if (p.meleeCooldown <= 0) return;
    const prog = 1 - p.meleeCooldown / C.MELEE_COOLDOWN;
    ctx.fillStyle='rgba(5,10,20,0.7)'; ctx.fillRect(20, canvas.height-100, 100, 6);
    ctx.fillStyle='#44ddff'; ctx.fillRect(20, canvas.height-100, 100*prog, 6);
    ctx.fillStyle='#88eeff'; ctx.font='11px Rajdhani'; ctx.fillText('MELEE CD', 20, canvas.height-104);
  }

  // ── Minimap ───────────────────────────────────
  function _drawMiniMap(ctx, p, cam) {
    const mx = canvas.width  - 30 - 140;  // top-right area, below kill counter
    const my = 68;
    const mw = 140, mh = 100;
    const scale = 3.5;   // world units per minimap pixel

    // BG
    ctx.fillStyle = 'rgba(5,10,20,0.8)';
    _roundRect(ctx, mx, my, mw, mh, 6); ctx.fill();
    ctx.strokeStyle = '#1a3a5a'; ctx.lineWidth = 1; ctx.stroke();

    ctx.save();
    ctx.beginPath(); _roundRect(ctx, mx, my, mw, mh, 6); ctx.clip();

    const originX = mx + mw/2;
    const originY = my + mh/2;

    // Tiles (very rough, sample every 3 tiles)
    const step = 3;
    const TS = C.TILE_SIZE;
    for (let dy = -mh/2; dy < mh/2; dy += step) {
      for (let dx = -mw/2; dx < mw/2; dx += step) {
        const wx = Math.floor((cam.x + dx*scale) / TS);
        const wy = Math.floor((cam.y + dy*scale) / TS);
        const t  = World.getTile(wx, wy);
        switch(t) {
          case C.TILE.WATER: ctx.fillStyle='#1a4a8a'; break;
          case C.TILE.STONE: ctx.fillStyle='#555'; break;
          case C.TILE.TREE:  ctx.fillStyle='#1a4010'; break;
          case C.TILE.SAND:  ctx.fillStyle='#8a7a40'; break;
          case C.TILE.WALL:  ctx.fillStyle='#8a6020'; break;
          default:           ctx.fillStyle='#1a3a10'; break;
        }
        ctx.fillRect(originX+dx, originY+dy, step+1, step+1);
      }
    }

    // Enemies (red dots)
    Enemies.list.forEach(e => {
      const ex = (e.x - cam.x) / scale;
      const ey = (e.y - cam.y) / scale;
      if (Math.abs(ex) > mw/2 || Math.abs(ey) > mh/2) return;
      ctx.fillStyle = '#ff3322';
      ctx.beginPath(); ctx.arc(originX+ex, originY+ey, 2, 0, Math.PI*2); ctx.fill();
    });

    // Pickups (yellow dots)
    Pickups.list.forEach(pk => {
      const px2 = (pk.x - cam.x) / scale;
      const py2 = (pk.y - cam.y) / scale;
      if (Math.abs(px2) > mw/2 || Math.abs(py2) > mh/2) return;
      ctx.fillStyle = pk.type==='ammo'?'#ffdd44':'#44ff88';
      ctx.beginPath(); ctx.arc(originX+px2, originY+py2, 2, 0, Math.PI*2); ctx.fill();
    });

    // Player dot (center)
    ctx.fillStyle = p.color || '#4adeff';
    ctx.shadowColor = p.color; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(originX, originY, 4, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;

    // Player aim line
    ctx.strokeStyle = `${p.color}88`; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(originX, originY);
    ctx.lineTo(originX + Math.cos(p.angle)*14, originY + Math.sin(p.angle)*14); ctx.stroke();

    ctx.restore();

    // Label
    ctx.fillStyle = '#2a5a7a'; ctx.font = '10px Rajdhani';
    ctx.fillText('MAP', mx+4, my+mh-4);
  }

  // ── Build mode tile preview ───────────────────
  function _drawBuildPreview(ctx, p, cam) {
    if (!p.buildMode) return;
    const mw = Input.getMouseWorld(cam);
    const TS = C.TILE_SIZE;
    const ddx = mw.wx*TS+TS/2-p.x, ddy = mw.wy*TS+TS/2-p.y;
    const inRange  = Math.hypot(ddx,ddy) < C.WALL_PLACE_DIST;
    const canPlace = inRange && !World.isSolid(mw.wx, mw.wy) && p.wallsPlaced < p.maxWalls;

    // Need world transform — called from outside world-space, so we apply manually
    const ox = canvas.width/2  - cam.x;
    const oy = canvas.height/2 - cam.y;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.fillStyle = canPlace ? 'rgba(200,150,50,0.3)' : 'rgba(255,50,50,0.2)';
    ctx.strokeStyle = canPlace ? '#ffaa44' : '#ff4444'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.rect(mw.wx*TS+2, mw.wy*TS+2, TS-4, TS-4); ctx.fill(); ctx.stroke();
    ctx.strokeStyle='rgba(255,170,50,0.2)'; ctx.lineWidth=1;
    ctx.setLineDash([5,5]);
    ctx.beginPath(); ctx.arc(p.x, p.y, C.WALL_PLACE_DIST, 0, Math.PI*2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // ── Tips bar ──────────────────────────────────
  function _drawTips(ctx) {
    ctx.fillStyle='#2a4a6a44'; ctx.font='12px Rajdhani'; ctx.textAlign='center';
    ctx.fillText('WASD · Move   B · Build Mode   F/Space · Melee   R · Reload   1/2/3 · Weapon', canvas.width/2, canvas.height-8);
    ctx.textAlign='left';
  }

  // ── Helpers ───────────────────────────────────
  function _panel(ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(5,10,20,0.85)';
    _roundRect(ctx, x, y, w, h, 8); ctx.fill();
    ctx.strokeStyle='#1a3a5a'; ctx.lineWidth=1; ctx.stroke();
  }

  function _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
  }

  return { draw };
})();
