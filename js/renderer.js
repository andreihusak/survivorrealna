// ═══════════════════════════════════════════════
//  renderer.js — Orchestrates all draw calls
//  Menu, game world, pause, gameover overlays
// ═══════════════════════════════════════════════

const Renderer = (() => {
  const cam = { x: 0, y: 0 };

  // ── Main draw ─────────────────────────────────
  function draw(ctx, t) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    switch (Game.state) {
      case 'menu':    _drawMenu(ctx, t); break;
      case 'game':    _drawGame(ctx, t); break;
      case 'paused':  _drawGame(ctx, t); _drawPause(ctx); break;
      case 'gameover':_drawGame(ctx, t); _drawGameOver(ctx); break;
    }

    DrawEffects.drawCursor(ctx, cam, Player.data);
  }

  // ── Game world ────────────────────────────────
  function _drawGame(ctx, t) {
    ctx.save();
    ctx.translate(canvas.width/2 - cam.x, canvas.height/2 - cam.y);

    DrawTiles.draw(ctx, cam, t);
    DrawEffects.drawPickups(ctx);
    DrawEffects.drawBullets(ctx);
    DrawEffects.drawParticles(ctx);
    Enemies.list.forEach(e => DrawEntities.drawEnemy(ctx, e));
    DrawEntities.drawPlayer(ctx, Player.data, t);

    ctx.restore();

    // Screen-space UI
    DrawHUD.draw(ctx, Player.data, Game.score, Game.killCount, cam);
  }

  // ── Menu ──────────────────────────────────────
  function _drawMenu(ctx, t) {
    const cw = canvas.width, ch = canvas.height;
    const cx = cw/2, cy = ch/2;

    // Background
    const grad = ctx.createRadialGradient(cx,cy*0.8,0, cx,cy*0.8,cw*0.7);
    grad.addColorStop(0,'#0a1628'); grad.addColorStop(0.5,'#081020'); grad.addColorStop(1,'#050810');
    ctx.fillStyle = grad; ctx.fillRect(0,0,cw,ch);

    // Grid
    ctx.strokeStyle='#1a3a5a22'; ctx.lineWidth=1;
    for (let x=0; x<cw; x+=60){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,ch); ctx.stroke(); }
    for (let y=0; y<ch; y+=60){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(cw,y); ctx.stroke(); }

    // Title glow orb
    const orb=ctx.createRadialGradient(cx,cy-80,0,cx,cy-80,200);
    orb.addColorStop(0,'#1a8fff22'); orb.addColorStop(1,'transparent');
    ctx.fillStyle=orb; ctx.fillRect(cx-200,cy-280,400,400);

    // Title
    ctx.save(); ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.font=`bold ${Math.floor(cw*0.075)}px 'Cinzel',serif`;
    ctx.shadowColor='#4af'; ctx.shadowBlur=30+Math.sin(t*2)*10;
    ctx.fillStyle='#fff'; ctx.fillText('SURVIVOR',cx,cy-120);
    ctx.shadowBlur=20+Math.sin(t*2+1)*8; ctx.fillStyle='#4adeff';
    ctx.fillText('REALM',cx,cy-50); ctx.shadowBlur=0;
    ctx.font="300 18px 'Rajdhani',sans-serif"; ctx.fillStyle='#6898b8';
    ctx.fillText('SURVIVE. BUILD. DOMINATE.',cx,cy+5); ctx.restore();

    // Buttons
    _menuBtn(ctx,cx,cy+55,220,52,'▶  PLAY GAME','#4adeff',t,0,()=> Game.start());
    _menuBtn(ctx,cx,cy+120,220,44,'CONTROLS','#6898b8aa',t,0.1,null,'ℹ ');

    // Corner decorations
    [[30,30,1,1],[cw-30,30,-1,1],[30,ch-30,1,-1],[cw-30,ch-30,-1,-1]].forEach(([x,y,sx,sy])=>{
      ctx.strokeStyle='#2a6a9a44'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(x+sx*30,y); ctx.lineTo(x,y); ctx.lineTo(x,y+sy*30); ctx.stroke();
      ctx.beginPath(); ctx.arc(x,y,6,0,Math.PI*2); ctx.fillStyle='#4adeff44'; ctx.fill();
    });

    // Controls
    ctx.save(); ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.font="400 13px 'Rajdhani'"; ctx.fillStyle='#3a6a8a';
    const cols=[['W A S D','Move'],['Mouse','Aim'],['Click','Shoot'],
                ['F/Space','Melee'],['B','Build mode'],['R','Reload'],
                ['1/2/3','Weapon'],['Esc','Pause']];
    cols.forEach(([k,v],i)=>{
      const row=cy+165+Math.floor(i/2)*22;
      const xo=(i%2===0?-90:30);
      ctx.fillStyle='#4adeffaa'; ctx.textAlign='right';
      ctx.fillText(k, cx+xo+50, row);
      ctx.fillStyle='#5a8aaa'; ctx.textAlign='left';
      ctx.fillText(v, cx+xo+58, row);
    });
    ctx.restore();

    ctx.textAlign='center'; ctx.font='12px Rajdhani'; ctx.fillStyle='#1a3a5a';
    ctx.fillText('v2.0 — MODULAR EDITION', cx, ch-16);
    ctx.textAlign='left';
  }

  function _menuBtn(ctx, x, y, w, h, text, color, t, phase, onClick, prefix='') {
    const mx=Input.mouse.x, my=Input.mouse.y;
    const hover=Math.abs(mx-x)<w/2 && Math.abs(my-y)<h/2;
    ctx.save(); ctx.textAlign='center'; ctx.textBaseline='middle';
    if(hover){ ctx.shadowColor=color; ctx.shadowBlur=20+Math.sin(t*3+phase)*8; }
    ctx.fillStyle=hover?'#0a2a4a':'#051530';
    ctx.strokeStyle=color; ctx.lineWidth=hover?2:1.5;
    _roundRect(ctx,x-w/2,y-h/2,w,h,8); ctx.fill(); ctx.stroke();
    ctx.shadowBlur=0;
    ctx.font=`600 19px 'Rajdhani',sans-serif`;
    ctx.fillStyle=hover?'#fff':color;
    ctx.fillText(prefix+text,x,y);
    ctx.restore();

    // Click detection
    if(hover && Input.mouse.down && onClick) {
      // Debounce: only fire once per mousedown
      if(!_menuBtn._fired){ _menuBtn._fired=true; onClick(); setTimeout(()=>_menuBtn._fired=false,300); }
    }
  }
  _menuBtn._fired = false;

  // ── Pause overlay ─────────────────────────────
  function _drawPause(ctx) {
    ctx.fillStyle='rgba(0,5,15,0.75)'; ctx.fillRect(0,0,canvas.width,canvas.height);
    const cx=canvas.width/2, cy=canvas.height/2;
    ctx.save(); ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.font="700 48px 'Cinzel'"; ctx.fillStyle='#fff';
    ctx.shadowColor='#4af'; ctx.shadowBlur=20; ctx.fillText('PAUSED',cx,cy-50);
    ctx.shadowBlur=0;
    ctx.font="400 18px 'Rajdhani'"; ctx.fillStyle='#6898b8';
    ctx.fillText('Press ESC to resume',cx,cy+10); ctx.restore();
  }

  // ── Game over ─────────────────────────────────
  function _drawGameOver(ctx) {
    ctx.fillStyle='rgba(0,0,0,0.82)'; ctx.fillRect(0,0,canvas.width,canvas.height);
    const cx=canvas.width/2, cy=canvas.height/2;
    ctx.save(); ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.font="900 60px 'Cinzel'"; ctx.fillStyle='#ff3311';
    ctx.shadowColor='#ff0000'; ctx.shadowBlur=30; ctx.fillText('GAME OVER',cx,cy-80); ctx.shadowBlur=0;
    ctx.font="400 22px 'Rajdhani'"; ctx.fillStyle='#8899aa';
    ctx.fillText(`Score: ${Game.score}  ·  Kills: ${Game.killCount}`,cx,cy-28);
    ctx.font="600 18px 'Rajdhani'"; ctx.fillStyle='#4adeff';
    ctx.fillText('[ CLICK TO PLAY AGAIN ]',cx,cy+60); ctx.restore();
  }

  function _roundRect(ctx,x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
  }

  return { draw, cam };
})();
