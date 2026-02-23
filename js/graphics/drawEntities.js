// ═══════════════════════════════════════════════
//  graphics/drawEntities.js — Player & enemy rendering
//  To restyle: edit the draw functions below
//  To add an enemy type: add a case in drawEnemy()
// ═══════════════════════════════════════════════

const DrawEntities = (() => {

  // ── Player ────────────────────────────────────
  function drawPlayer(ctx, p, t) {
    ctx.save();
    ctx.translate(p.x, p.y);

    const bob = Math.sin(p.bobTimer || 0) * 2;

    // Invincibility flash
    if (p.invincibleTimer > 0 && Math.floor(p.invincibleTimer * 20) % 2 === 0)
      ctx.globalAlpha = 0.4;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(2, 16-bob, 13, 6, 0, 0, Math.PI*2); ctx.fill();

    ctx.translate(0, bob);

    // ── Legs ────────────────────────────────────
    const legA = Math.sin(p.footAnim || 0) * 0.4;
    ctx.save();
    ctx.rotate(p.angle + Math.PI/2);
    // Left
    ctx.fillStyle = '#1a3a5a';
    ctx.save(); ctx.translate(-7,4); ctx.rotate(legA);
    ctx.fillRect(-4,0,8,14);
    ctx.fillStyle = '#0a2a4a'; ctx.fillRect(-4,12,8,5);
    ctx.restore();
    // Right
    ctx.fillStyle = '#1a3a5a';
    ctx.save(); ctx.translate(7,4); ctx.rotate(-legA);
    ctx.fillRect(-4,0,8,14);
    ctx.fillStyle = '#0a2a4a'; ctx.fillRect(-4,12,8,5);
    ctx.restore();
    ctx.restore();

    // ── Body ────────────────────────────────────
    ctx.rotate(p.angle);
    ctx.fillStyle = '#2a4a6a';
    ctx.fillRect(-8,-4,8,16); // backpack

    const torsoG = ctx.createLinearGradient(-12,-14,12,14);
    torsoG.addColorStop(0, _lighten(p.color, 30));
    torsoG.addColorStop(0.5, p.color);
    torsoG.addColorStop(1, _darken(p.color, 30));
    ctx.fillStyle = torsoG;
    ctx.shadowColor = p.color; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.roundRect(-11,-14,22,26,5); ctx.fill();
    ctx.shadowBlur = 0;

    // Chest stripe
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(-11,-4,22,3);

    // ── Helmet ──────────────────────────────────
    const hg = ctx.createRadialGradient(-3,-20,2, 0,-18,13);
    hg.addColorStop(0, _lighten(p.color, 40));
    hg.addColorStop(1, _darken(p.color, 20));
    ctx.fillStyle = hg; ctx.shadowColor = p.color; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(0,-18,13,0,Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;

    // Visor
    ctx.fillStyle = p.buildMode ? '#ff880088' : 'rgba(0,0,0,0.5)';
    ctx.shadowColor = p.buildMode ? '#ff8800' : p.color; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.ellipse(0,-17,9,5,0,0,Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;

    // ── Weapon ──────────────────────────────────
    if (!p.buildMode) {
      _drawWeaponSprite(ctx, p.weapon, p.shootCooldown);
    } else {
      // Hammer
      ctx.fillStyle = '#8B6914'; ctx.fillRect(8,-3,20,5);
      ctx.fillStyle = '#aaa'; ctx.fillRect(24,-8,10,14);
    }

    // Trail
    ctx.restore();
    ctx.globalAlpha = 1;
    p.trail.forEach((pt, i) => {
      const a = (1 - i/p.trail.length) * 0.12;
      ctx.fillStyle = `rgba(100,220,255,${a})`;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, (1-i/p.trail.length)*10, 0, Math.PI*2); ctx.fill();
    });

    // Melee arc
    if (p.meleeActive) {
      const progress = 1 - (p.meleeTimer||0) / C.MELEE_DURATION;
      ctx.save(); ctx.translate(p.x, p.y);
      ctx.strokeStyle = `${p.color}cc`; ctx.lineWidth = 4;
      ctx.shadowColor = p.color; ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0,0,55, (p.meleeAngle||0)-C.MELEE_ANGLE, (p.meleeAngle||0)+C.MELEE_ANGLE*progress);
      ctx.stroke(); ctx.restore();
    }
  }

  function _drawWeaponSprite(ctx, weapon, cooldown) {
    // ── Modify weapon visuals here ──
    switch (weapon) {
      case 'shotgun':
        ctx.fillStyle = '#5a3a1a'; ctx.fillRect(8,-5,28,9);
        ctx.fillStyle = '#7a5a2a'; ctx.fillRect(10,-3,24,6);
        ctx.fillStyle = '#333'; ctx.fillRect(30,-4,8,3); ctx.fillRect(30,1,8,3); // double barrel
        break;
      case 'smg':
        ctx.fillStyle = '#223'; ctx.fillRect(8,-3,20,6);
        ctx.fillStyle = '#334'; ctx.fillRect(10,-2,18,4);
        ctx.fillStyle = '#1a1a2a'; ctx.fillRect(14,3,8,5); // mag
        break;
      case 'pistol':
      default:
        ctx.fillStyle = '#334'; ctx.fillRect(8,-4,24,7);
        ctx.fillStyle = '#445'; ctx.fillRect(10,-2,20,5);
        if (cooldown > 0.08) {
          ctx.fillStyle = `rgba(255,200,50,${(cooldown-0.08)/0.04})`;
          ctx.shadowColor = '#ffaa00'; ctx.shadowBlur = 8;
          ctx.beginPath(); ctx.arc(32,-1,4,0,Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
        }
        break;
    }
  }

  // ── Enemy ─────────────────────────────────────
  function drawEnemy(ctx, e) {
    const bob = Math.sin(e.bobTimer || 0) * 2;
    ctx.save(); ctx.translate(e.x, e.y+bob); ctx.rotate(e.angle||0);

    switch (e.type) {
      case 'brute':   _drawBrute(ctx);   break;
      case 'speeder': _drawSpeeder(ctx); break;
      case 'grunt':
      default:        _drawGrunt(ctx);   break;
      // ── Add new enemy draw cases here ──
      // case 'bomber': _drawBomber(ctx); break;
    }

    ctx.restore();

    // HP bar (only when damaged)
    if (e.hp < e.maxHp) {
      const bw=36, bh=5, r=e.hp/e.maxHp;
      ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(e.x-bw/2, e.y-36, bw, bh);
      ctx.fillStyle = r > 0.5 ? '#ff8800' : '#ff2200';
      ctx.fillRect(e.x-bw/2, e.y-36, bw*r, bh);
    }
  }

  function _drawGrunt(ctx) {
    ctx.fillStyle='#2a6030';
    ctx.beginPath(); ctx.ellipse(0,0,16,14,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#1a4020';
    ctx.beginPath(); ctx.moveTo(-8,-12); ctx.lineTo(-12,-20); ctx.lineTo(-4,-12); ctx.fill();
    ctx.beginPath(); ctx.moveTo(8,-12);  ctx.lineTo(12,-20);  ctx.lineTo(4,-12);  ctx.fill();
    ctx.fillStyle='#ff8800'; ctx.shadowColor='#ff8800'; ctx.shadowBlur=6;
    ctx.beginPath(); ctx.ellipse(0,-3,8,5,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#000'; ctx.shadowBlur=0;
    ctx.beginPath(); ctx.arc(0,-3,3,0,Math.PI*2); ctx.fill();
  }

  function _drawBrute(ctx) {
    ctx.translate(0,-4);
    ctx.fillStyle='#8B1515';
    ctx.beginPath(); ctx.ellipse(0,0,22,18,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='#5a0808';
    for (let i=0;i<6;i++){
      const sa=(i/6)*Math.PI*2;
      ctx.save(); ctx.rotate(sa);
      ctx.beginPath(); ctx.moveTo(18,-3); ctx.lineTo(28,0); ctx.lineTo(18,3); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle='#ff2200'; ctx.shadowColor='#ff4400'; ctx.shadowBlur=10;
    ctx.beginPath(); ctx.arc(-6,-5,5,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc( 6,-5,5,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
  }

  function _drawSpeeder(ctx) {
    ctx.fillStyle='#15558B';
    ctx.beginPath(); ctx.moveTo(18,0); ctx.lineTo(-10,12); ctx.lineTo(-6,0); ctx.lineTo(-10,-12); ctx.closePath(); ctx.fill();
    ctx.fillStyle='#2288ff'; ctx.shadowColor='#4af'; ctx.shadowBlur=8;
    ctx.beginPath(); ctx.arc(4,0,5,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
  }

  // ── Helpers ───────────────────────────────────
  let _colorCanvas = null;
  function _shiftColor(hex, amount) {
    if (!_colorCanvas) { _colorCanvas = document.createElement('canvas'); _colorCanvas.width = _colorCanvas.height = 1; }
    const c = _colorCanvas.getContext('2d');
    c.clearRect(0,0,1,1); c.fillStyle = hex; c.fillRect(0,0,1,1);
    const d = c.getImageData(0,0,1,1).data;
    return `rgb(${Math.min(255,Math.max(0,d[0]+amount))},${Math.min(255,Math.max(0,d[1]+amount))},${Math.min(255,Math.max(0,d[2]+amount))})`;
  }
  function _lighten(c,a){ return _shiftColor(c, a); }
  function _darken(c,a){  return _shiftColor(c,-a); }

  return { drawPlayer, drawEnemy };
})();
