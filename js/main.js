// ═══════════════════════════════════════════════
//  main.js — Canvas setup, game loop, click routing
//  This is the only file that touches the DOM directly
// ═══════════════════════════════════════════════

// ── Canvas ────────────────────────────────────
const canvas = document.getElementById('game');
const ctx    = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ── Click routing ─────────────────────────────
// Menus handle clicks via Renderer._menuBtn hover+mouse.down detection
// Game-over restarts the game on any click
window.addEventListener('mousedown', e => {
  if (e.button !== 0) return;
  if (Game.state === 'gameover') {
    // small delay so mouse.down doesn't immediately fire in new game
    setTimeout(() => Game.start(), 100);
  }
});

// ── Game Loop ────────────────────────────────
let lastTime = 0;

function loop(ts) {
  const dt = Math.min((ts - lastTime) / 1000, 0.05); // cap at 50ms (~20fps min)
  lastTime = ts;

  Game.update(dt);
  Renderer.draw(ctx, ts / 1000);

  requestAnimationFrame(loop);
}

requestAnimationFrame(ts => {
  lastTime = ts;
  requestAnimationFrame(loop);
});
