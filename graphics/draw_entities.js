// ══════════════════════════════════════════════════════
//  draw_entities.js — player and enemy rendering
// ══════════════════════════════════════════════════════
import { WEAPONS } from '../weapons/weapons.js';

// ── Color helpers ─────────────────────────────────────
const _colorCache = {};
function shiftColor(hex, amount) {
  if (_colorCache[hex + amount]) return _colorCache[hex + amount];
  try {
    const c = document.createElement('canvas'); c.width = c.height = 1;
    const cx = c.getContext('2d'); cx.fillStyle = hex; cx.fillRect(0,0,1,1);
    const d = cx.getImageData(0,0,1,1).data;
    const r = Math.min(255,Math.max(0,d[0]+amount));
    const g = Math.min(255,Math.max(0,d[1]+amount));
    const b = Math.min(255,Math.max(0,d[2]+amount));
    return (_colorCache[hex+amount] = `rgb(${r},${g},${b})`);
  } catch(e) { return hex; }
}

// ── Player ────────────────────────────────────────────
export function drawPlayer(ctx, p, isLocal) {
  const bob = Math.sin(p.bobTimer || 0) * 2;
  const col = p.color || '#4adeff';

  ctx.save();
  ctx.translate(p.x, p.y + bob);
  if (p.dead) ctx.globalAlpha = 0.28;
  if (p.invincibleTimer > 0 && Math.floor(p.invincibleTimer * 20) % 2 === 0) ctx.globalAlpha = 0.4;

  // Ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.beginPath(); ctx.ellipse(2, 16 - bob, 13, 6, 0, 0, Math.PI*2); ctx.fill();

  // Legs (relative to movement direction)
  ctx.save();
  ctx.rotate((p.angle || 0) + Math.PI/2);
  const legA = Math.sin(p.footAnim || 0) * 0.4;
  [[-7, legA],[7, -legA]].forEach(([lx, la]) => {
    ctx.save(); ctx.translate(lx, 4); ctx.rotate(la);
    ctx.fillStyle = '#1a3a5a'; ctx.fillRect(-4, 0, 8, 14);
    ctx.fillStyle = '#0a2a4a'; ctx.fillRect(-4, 12, 8, 5);
    ctx.restore();
  });
  ctx.restore();

  ctx.rotate(p.angle || 0);

  // Backpack
  ctx.fillStyle = '#1a2a3a'; ctx.fillRect(-8, -4, 8, 16);

  // Torso gradient using player color
  const tg = ctx.createLinearGradient(-12,-14,12,14);
  tg.addColorStop(0, shiftColor(col, 35));
  tg.addColorStop(0.5, col);
  tg.addColorStop(1, shiftColor(col, -30));
  ctx.fillStyle = tg;
  ctx.shadowColor = col; ctx.shadowBlur = isLocal ? 10 : 5;
  ctx.beginPath(); ctx.roundRect(-11,-14,22,26,5); ctx.fill(); ctx.shadowBlur = 0;

  // Chest stripe
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(-11,-4,22,3);

  // Helmet
  const hg = ctx.createRadialGradient(-3,-20,2,0,-18,13);
  hg.addColorStop(0, shiftColor(col, 45));
  hg.addColorStop(1, shiftColor(col, -20));
  ctx.fillStyle = hg; ctx.shadowColor = col; ctx.shadowBlur = 6;
  ctx.beginPath(); ctx.arc(0,-18,13,0,Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;

  // Visor
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.shadowColor = col; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.ellipse(0,-17,9,5,0,0,Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;

  // Weapon visual
  drawWeaponModel(ctx, p);

  ctx.restore();
  ctx.globalAlpha = 1;

  // Name tag (non-local only)
  if (!isLocal) {
    ctx.save();
    ctx.font = '11px Rajdhani'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    const tw = ctx.measureText(p.name || 'Player').width;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(p.x - tw/2 - 4, p.y - 44, tw + 8, 14);
    ctx.fillStyle = col;
    ctx.fillText(p.name || 'Player', p.x, p.y - 30);
    ctx.restore();
  }

  // Melee arc
  if (p.meleeActive) {
    ctx.save(); ctx.translate(p.x, p.y);
    ctx.strokeStyle = col + 'cc'; ctx.lineWidth = 4;
    ctx.shadowColor = col; ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(0, 0, 55, (p.meleeAngle||0) - 1.2, (p.meleeAngle||0) + 1.2);
    ctx.stroke(); ctx.restore();
  }
}

function drawWeaponModel(ctx, p) {
  const wid = p.weaponId || 'smg';
  if (p.buildMode) {
    // Hammer
    ctx.fillStyle = '#8B6914'; ctx.fillRect(8,-3,20,5);
    ctx.fillStyle = '#aaa';    ctx.fillRect(24,-8,10,14);
    return;
  }
  switch (wid) {
    case 'shotgun':
      ctx.fillStyle = '#552';  ctx.fillRect(8,-5,28,10);
      ctx.fillStyle = '#443';  ctx.fillRect(10,-3,24,7);
      break;
    case 'sniper':
      ctx.fillStyle = '#334';  ctx.fillRect(8,-3,36,5);
      ctx.fillStyle = '#556';  ctx.fillRect(40,-2,6,3);
      ctx.fillStyle = '#aaa';  ctx.fillRect(18,-6,8,3); // scope
      break;
    default: // smg / pistol
      ctx.fillStyle = '#334';  ctx.fillRect(8,-4,24,7);
      ctx.fillStyle = '#445';  ctx.fillRect(10,-2,20,5);
  }
}

// ── Enemy ─────────────────────────────────────────────
export function drawEnemy(ctx, e) {
  const bob = Math.sin(e.bobTimer || 0) * 2;
  ctx.save(); ctx.translate(e.x, e.y + bob); ctx.rotate(e.angle || 0);

  switch (e.type) {
    case 'brute':    drawBrute(ctx); break;
    case 'speeder':  drawSpeeder(ctx); break;
    case 'ranger':   drawRanger(ctx); break;
    default:         drawGrunt(ctx); break;
  }
  ctx.restore();

  // HP bar
  if (e.hp < e.maxHp) {
    const bw = 36, bh = 5, r = Math.max(0, e.hp / e.maxHp);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(e.x - bw/2, e.y - 38, bw, bh);
    ctx.fillStyle = `hsl(${r*120},100%,45%)`;
    ctx.fillRect(e.x - bw/2, e.y - 38, bw*r, bh);
  }
}

function drawGrunt(ctx) {
  ctx.fillStyle = '#2a6030';
  ctx.beginPath(); ctx.ellipse(0,0,16,14,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#1a4020';
  ctx.beginPath(); ctx.moveTo(-8,-12); ctx.lineTo(-12,-20); ctx.lineTo(-4,-12); ctx.fill();
  ctx.beginPath(); ctx.moveTo(8,-12);  ctx.lineTo(12,-20);  ctx.lineTo(4,-12);  ctx.fill();
  ctx.fillStyle = '#ff8800'; ctx.shadowColor='#ff8800'; ctx.shadowBlur=6;
  ctx.beginPath(); ctx.ellipse(0,-3,8,5,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#000'; ctx.shadowBlur=0;
  ctx.beginPath(); ctx.arc(0,-3,3,0,Math.PI*2); ctx.fill();
}

function drawBrute(ctx) {
  ctx.fillStyle = '#8B1515';
  ctx.beginPath(); ctx.ellipse(0,-4,22,18,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#5a0808';
  for (let i=0;i<6;i++){
    const sa=(i/6)*Math.PI*2;
    ctx.save(); ctx.rotate(sa);
    ctx.beginPath(); ctx.moveTo(18,-3); ctx.lineTo(28,0); ctx.lineTo(18,3); ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle='#ff2200'; ctx.shadowColor='#ff4400'; ctx.shadowBlur=10;
  ctx.beginPath(); ctx.arc(-6,-9,5,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(6,-9,5,0,Math.PI*2); ctx.fill();
  ctx.shadowBlur=0;
}

function drawSpeeder(ctx) {
  ctx.fillStyle='#15558B';
  ctx.beginPath();
  ctx.moveTo(18,0); ctx.lineTo(-10,12); ctx.lineTo(-6,0); ctx.lineTo(-10,-12); ctx.closePath(); ctx.fill();
  ctx.fillStyle='#2288ff'; ctx.shadowColor='#4af'; ctx.shadowBlur=8;
  ctx.beginPath(); ctx.arc(4,0,5,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
}

function drawRanger(ctx) {
  ctx.fillStyle = '#6a2a78';
  ctx.beginPath(); ctx.ellipse(0,0,15,13,0,0,Math.PI*2); ctx.fill();
  // Antennae
  ctx.strokeStyle = '#cc44ff'; ctx.lineWidth = 2; ctx.shadowColor='#cc44ff'; ctx.shadowBlur=8;
  ctx.beginPath(); ctx.moveTo(-5,-12); ctx.lineTo(-8,-22); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(5,-12);  ctx.lineTo(8,-22);  ctx.stroke();
  ctx.shadowBlur=0;
  // Eye
  ctx.fillStyle='#cc44ff'; ctx.shadowColor='#cc44ff'; ctx.shadowBlur=10;
  ctx.beginPath(); ctx.arc(0,-2,6,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
  ctx.fillStyle='#000'; ctx.beginPath(); ctx.arc(0,-2,3,0,Math.PI*2); ctx.fill();
  // "Gun"
  ctx.fillStyle='#8B3598'; ctx.fillRect(12,-2,14,5);
}

// ── Pickups ───────────────────────────────────────────
export function drawPickup(ctx, p) {
  const by = Math.sin(p.bob || 0) * 4;
  ctx.save();
  if (p.type === 'ammo') {
    ctx.shadowColor='#ffdd44'; ctx.shadowBlur=14;
    ctx.fillStyle='#ffdd44';
    ctx.beginPath(); ctx.roundRect(p.x-8, p.y+by-10, 16, 20, 3); ctx.fill();
    ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.font='bold 10px Rajdhani';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('⬡', p.x, p.y+by);
  } else if (p.type === 'health') {
    ctx.shadowColor='#44ff88'; ctx.shadowBlur=14;
    ctx.fillStyle='#44ff88';
    ctx.beginPath(); ctx.arc(p.x, p.y+by, 10, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle='#fff'; ctx.font='bold 13px sans-serif';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('+', p.x, p.y+by);
  } else if (p.type === 'weapon') {
    ctx.shadowColor='#cc88ff'; ctx.shadowBlur=16;
    ctx.fillStyle='#cc88ff';
    ctx.beginPath(); ctx.arc(p.x, p.y+by, 11, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle='#fff'; ctx.font='bold 9px Rajdhani';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText((WEAPONS[p.weaponId]?.name || '?').slice(0,3).toUpperCase(), p.x, p.y+by);
  }
  ctx.restore();
}

// ── Bullets ───────────────────────────────────────────
export function drawBullet(ctx, b) {
  ctx.save();
  ctx.shadowColor = b.color || '#ffee44'; ctx.shadowBlur = 10;
  const ba = Math.atan2(b.vy, b.vx);
  ctx.translate(b.x, b.y); ctx.rotate(ba);
  const len = Math.min(20, b.life * 300);
  const grad = ctx.createLinearGradient(-len, 0, b.size, 0);
  grad.addColorStop(0, 'transparent');
  grad.addColorStop(1, '#fff');
  ctx.fillStyle = grad; ctx.fillRect(-len, -1.5, len + b.size, 3);
  ctx.fillStyle = b.color || '#ffe866';
  ctx.beginPath(); ctx.arc(b.size, 0, b.size, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}

// ── Particles ─────────────────────────────────────────
export function drawParticles(ctx, particles) {
  particles.forEach(p => {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.1, p.size * alpha), 0, Math.PI*2); ctx.fill();
  });
  ctx.globalAlpha = 1;
}
