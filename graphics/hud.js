// ══════════════════════════════════════════════════════
//  hud.js — all on-screen UI overlays
// ══════════════════════════════════════════════════════
import { WEAPONS } from '../weapons/weapons.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}

function panel(ctx, x, y, w, h, r=10) {
  ctx.fillStyle = 'rgba(5,10,20,0.85)';
  roundRect(ctx, x, y, w, h, r); ctx.fill();
  ctx.strokeStyle = '#1a3a5a'; ctx.lineWidth = 1; ctx.stroke();
}

export function drawHUD(ctx, canvasW, canvasH, sp, score, killCount, buildMode, isHost, pingMs) {
  const pad = 20;

  // ── Health ───────────────────────────────────────────
  panel(ctx, pad, canvasH-90, 320, 70);
  ctx.fillStyle='#88aabb'; ctx.font='700 12px Rajdhani';
  ctx.textAlign='left'; ctx.fillText('HEALTH', pad+14, canvasH-72);
  const hpW=286, hpH=16, hpR=Math.max(0,(sp.hp||0)/(sp.maxHp||100));
  ctx.fillStyle='#0a1820'; ctx.fillRect(pad+14, canvasH-62, hpW, hpH);
  const hg = ctx.createLinearGradient(pad+14,0,pad+14+hpW,0);
  hg.addColorStop(0,'#ff3311'); hg.addColorStop(0.5,'#ff6633'); hg.addColorStop(1,'#ff9944');
  ctx.fillStyle = hg; ctx.fillRect(pad+14, canvasH-62, hpW*hpR, hpH);
  ctx.strokeStyle='#2a5a7a'; ctx.lineWidth=1; ctx.strokeRect(pad+14, canvasH-62, hpW, hpH);
  ctx.fillStyle='#fff'; ctx.font='600 11px Rajdhani';
  ctx.fillText(`${Math.ceil(Math.max(0,sp.hp||0))} / ${sp.maxHp||100}`, pad+18, canvasH-50);

  // ── Ammo / Weapon ───────────────────────────────────
  const ammoX = canvasW - pad - 210;
  panel(ctx, ammoX, canvasH-90, 210, 70);
  ctx.textAlign='right';
  const ws = sp.weaponState || {};
  const wDef = WEAPONS[sp.weaponId] || WEAPONS['smg'];

  if ((ws.reloadTimer||0) > 0) {
    ctx.fillStyle='#ffaa44'; ctx.font='700 14px Rajdhani';
    ctx.fillText('RELOADING…', canvasW-pad-14, canvasH-65);
    const rp = 1 - (ws.reloadTimer||0) / (wDef.reloadTime||2);
    ctx.fillStyle='#0a1820'; ctx.fillRect(canvasW-pad-195, canvasH-56, 180, 8);
    ctx.fillStyle='#ffaa44'; ctx.fillRect(canvasW-pad-195, canvasH-56, 180*Math.min(1,rp), 8);
  } else {
    ctx.fillStyle='#88aabb'; ctx.font='700 12px Rajdhani';
    ctx.fillText(wDef.name.toUpperCase(), canvasW-pad-14, canvasH-72);
    ctx.fillStyle=(ws.ammo||0)>5?'#fff':(ws.ammo||0)>0?'#ff8844':'#ff3333';
    ctx.font="700 26px 'Cinzel'";
    ctx.fillText(`${ws.ammo??'—'}`, canvasW-pad-14, canvasH-46);
    ctx.fillStyle='#445'; ctx.font='400 13px Rajdhani';
    ctx.fillText(`/ ${ws.maxAmmo||'—'}`, canvasW-pad-14, canvasH-28);
  }
  ctx.textAlign='left';

  // ── Melee cooldown bar ──────────────────────────────
  if ((sp.meleeCooldown||0) > 0) {
    const mcProg = 1 - (sp.meleeCooldown||0) / 0.6;
    ctx.fillStyle='rgba(5,10,20,0.6)'; ctx.fillRect(pad, canvasH-102, 100, 6);
    ctx.fillStyle='#44ddff'; ctx.fillRect(pad, canvasH-102, 100*mcProg, 6);
    ctx.fillStyle='#88eeff'; ctx.font='11px Rajdhani'; ctx.fillText('MELEE', pad, canvasH-106);
  }

  // ── Score ────────────────────────────────────────────
  const halfW = canvasW / 2;
  panel(ctx, halfW-80, 20, 160, 38);
  ctx.fillStyle='#4adeff'; ctx.font="700 18px 'Cinzel'";
  ctx.textAlign='center'; ctx.fillText(`${score}`, halfW, 44); ctx.textAlign='left';

  // ── Kill counter ─────────────────────────────────────
  panel(ctx, canvasW-pad-100, 20, 100, 38);
  ctx.fillStyle='#ff5544'; ctx.font='700 14px Rajdhani';
  ctx.textAlign='right'; ctx.fillText(`☠ ${killCount}`, canvasW-pad-14, 44); ctx.textAlign='left';

  // ── Build mode banner ────────────────────────────────
  if (buildMode) {
    panel(ctx, halfW-120, 20, 240, 38);
    ctx.strokeStyle='#ff9922'; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle='#ffaa44'; ctx.font='700 14px Rajdhani';
    ctx.textAlign='center';
    ctx.fillText(`🔨 BUILD  [${sp.wallsPlaced||0}/${sp.maxWalls||15}]`, halfW, 44);
    ctx.textAlign='left';
  }

  // ── Weapon name badge ─────────────────────────────────
  if (!buildMode) {
    ctx.fillStyle='#2a4a6a88'; ctx.font='12px Rajdhani'; ctx.textAlign='center';
    ctx.fillText('WASD · B=Build · F=Melee · R=Reload · 1-4=Weapon', halfW, canvasH-10);
    ctx.textAlign='left';
  }

  // ── Ping (clients only) ──────────────────────────────
  if (!isHost && pingMs) {
    ctx.fillStyle = pingMs < 80 ? '#44ff88' : pingMs < 200 ? '#ffaa44' : '#ff4444';
    ctx.font = '11px Rajdhani'; ctx.textAlign = 'right';
    ctx.fillText(`${pingMs}ms`, canvasW - pad - 4, canvasH - pad);
    ctx.textAlign = 'left';
  }
}

// ── Players sidebar (replaces old DOM element) ────────
export function drawPlayersSidebar(ctx, allPlayersArr, canvasH) {
  const x = 20, startY = 70, itemH = 26, w = 200;
  allPlayersArr.forEach((p, i) => {
    const y = startY + i * (itemH + 4);
    ctx.fillStyle = 'rgba(5,10,20,0.72)';
    roundRect(ctx, x, y, w, itemH, 12); ctx.fill();
    ctx.strokeStyle = '#1a3a5a'; ctx.lineWidth = 1; ctx.stroke();

    // Color dot
    ctx.fillStyle = p.dead ? '#444' : (p.color || '#4adeff');
    ctx.beginPath(); ctx.arc(x+12, y+itemH/2, 5, 0, Math.PI*2); ctx.fill();

    // Name
    ctx.fillStyle = p.dead ? '#445' : '#ccddeebb';
    ctx.font = '700 12px Rajdhani'; ctx.textAlign = 'left';
    ctx.fillText((p.name||'Player').slice(0,12), x+22, y+itemH/2+4);

    // HP bar
    const hpR = Math.max(0,(p.hp||0)/(p.maxHp||100));
    ctx.fillStyle = '#0a1820'; ctx.fillRect(x+w-54, y+4, 48, 8);
    ctx.fillStyle = p.dead ? '#333' : (p.color || '#ff6633');
    ctx.fillRect(x+w-54, y+4, 48*hpR, 8);
    if (p.dead) {
      ctx.fillStyle='#ff4444'; ctx.font='10px Rajdhani'; ctx.textAlign='right';
      ctx.fillText('☠', x+w-4, y+itemH/2+4);
    }
  });
  ctx.textAlign='left';
}

export function drawPauseOverlay(ctx, canvasW, canvasH) {
  ctx.fillStyle='rgba(0,5,15,0.78)'; ctx.fillRect(0,0,canvasW,canvasH);
  ctx.save(); ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.font="700 52px 'Cinzel'"; ctx.fillStyle='#fff';
  ctx.shadowColor='#4af'; ctx.shadowBlur=22;
  ctx.fillText('PAUSED', canvasW/2, canvasH/2);
  ctx.font="400 18px 'Rajdhani'"; ctx.fillStyle='#6898b8'; ctx.shadowBlur=0;
  ctx.fillText('ESC to resume', canvasW/2, canvasH/2+54);
  ctx.restore();
}

export function drawGameOverOverlay(ctx, canvasW, canvasH, score, killCount) {
  ctx.fillStyle='rgba(0,0,0,0.84)'; ctx.fillRect(0,0,canvasW,canvasH);
  ctx.save(); ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.font="900 62px 'Cinzel'"; ctx.fillStyle='#ff3311';
  ctx.shadowColor='#ff0000'; ctx.shadowBlur=30;
  ctx.fillText('GAME OVER', canvasW/2, canvasH/2-80); ctx.shadowBlur=0;
  ctx.font="400 22px 'Rajdhani'"; ctx.fillStyle='#8899aa';
  ctx.fillText(`Score: ${score}  ·  Kills: ${killCount}`, canvasW/2, canvasH/2-28);
  ctx.font="600 16px 'Rajdhani'"; ctx.fillStyle='#4adeff';
  ctx.fillText('[ Click to return to lobby ]', canvasW/2, canvasH/2+60);
  ctx.restore();
}

export function drawCursor(ctx, mouse, state, buildMode) {
  const { x, y } = mouse;
  ctx.save();
  if (state === 'game') {
    ctx.strokeStyle = buildMode ? '#ffaa44' : '#4adeff';
    ctx.lineWidth = 1.5; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 6;
    const r = 12, g = 4;
    ctx.beginPath();
    ctx.moveTo(x-r,y); ctx.lineTo(x-g,y); ctx.moveTo(x+g,y); ctx.lineTo(x+r,y);
    ctx.moveTo(x,y-r); ctx.lineTo(x,y-g); ctx.moveTo(x,y+g); ctx.lineTo(x,y+r);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(x,y,2.5,0,Math.PI*2);
    ctx.fillStyle=ctx.strokeStyle; ctx.fill(); ctx.shadowBlur=0;
  } else {
    ctx.fillStyle='#fff'; ctx.strokeStyle='#0a2a4a'; ctx.lineWidth=1.5;
    ctx.shadowColor='#4adeff'; ctx.shadowBlur=8;
    ctx.beginPath();
    ctx.moveTo(x,y); ctx.lineTo(x+14,y+18); ctx.lineTo(x+6,y+14); ctx.lineTo(x+3,y+22);
    ctx.lineTo(x-1,y+20); ctx.lineTo(x+2,y+12); ctx.lineTo(x-6,y+14); ctx.closePath();
    ctx.fill(); ctx.stroke(); ctx.shadowBlur=0;
  }
  ctx.restore();
}
