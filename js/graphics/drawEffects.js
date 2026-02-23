// ═══════════════════════════════════════════════
//  graphics/drawEffects.js — Bullets, particles, pickups
//  Visual-only. Add new pickup visuals here.
// ═══════════════════════════════════════════════

const DrawEffects = (() => {

  function drawBullets(ctx) {
    Bullets.list.forEach(b => {
      ctx.save();
      ctx.shadowColor = '#ffee44'; ctx.shadowBlur = 10;
      const a = Math.atan2(b.vy, b.vx);
      ctx.translate(b.x, b.y); ctx.rotate(a);
      const g = ctx.createLinearGradient(-16, 0, 4, 0);
      g.addColorStop(0, 'transparent'); g.addColorStop(1, '#fff');
      ctx.fillStyle = g; ctx.fillRect(-16, -1.5, 20, 3);
      ctx.fillStyle = '#ffe866';
      ctx.beginPath(); ctx.arc(4, 0, 3.5, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    });
  }

  function drawParticles(ctx) {
    Particles.list.forEach(p => {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function drawPickups(ctx) {
    Pickups.list.forEach(p => {
      const by = Math.sin(p.bob || 0) * 4;
      ctx.save();
      if (p.type === 'ammo') {
        ctx.shadowColor = '#ffdd44'; ctx.shadowBlur = 12;
        ctx.fillStyle = '#ffdd44';
        ctx.beginPath(); ctx.roundRect(p.x-8, p.y+by-10, 16, 20, 3); ctx.fill();
        ctx.fillStyle = '#fff8'; ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('A', p.x, p.y+by);
      } else if (p.type === 'health') {
        ctx.shadowColor = '#44ff88'; ctx.shadowBlur = 12;
        ctx.fillStyle = '#44ff88';
        ctx.beginPath(); ctx.arc(p.x, p.y+by, 10, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('+', p.x, p.y+by);
      }
      // ── Add new pickup visuals here ──
      ctx.restore();
    });
  }

  function drawCursor(ctx, cam, p) {
    const x = Input.mouse.x, y = Input.mouse.y;
    ctx.save();
    if (Game.state === 'game') {
      ctx.strokeStyle = p.buildMode ? '#ffaa44' : '#4adeff';
      ctx.lineWidth = 1.5; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 6;
      const r = 12, g = 4;
      ctx.beginPath();
      ctx.moveTo(x-r,y); ctx.lineTo(x-g,y);
      ctx.moveTo(x+g,y); ctx.lineTo(x+r,y);
      ctx.moveTo(x,y-r); ctx.lineTo(x,y-g);
      ctx.moveTo(x,y+g); ctx.lineTo(x,y+r);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(x,y,2.5,0,Math.PI*2);
      ctx.fillStyle = ctx.strokeStyle; ctx.fill();
    } else {
      ctx.fillStyle='#fff'; ctx.strokeStyle='#0a2a4a'; ctx.lineWidth=1.5;
      ctx.shadowColor='#4adeff'; ctx.shadowBlur=8;
      ctx.beginPath();
      ctx.moveTo(x,y); ctx.lineTo(x+14,y+18); ctx.lineTo(x+6,y+14);
      ctx.lineTo(x+3,y+22); ctx.lineTo(x-1,y+20); ctx.lineTo(x+2,y+12);
      ctx.lineTo(x-6,y+14); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    ctx.shadowBlur=0; ctx.restore();
  }

  return { drawBullets, drawParticles, drawPickups, drawCursor };
})();
