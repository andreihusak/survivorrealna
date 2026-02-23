// ═══════════════════════════════════════════════
//  game.js — State machine, score, game loop glue
// ═══════════════════════════════════════════════

const Game = (() => {
  let _state = 'menu';   // menu | game | paused | gameover
  let _score = 0;
  let _kills = 0;

  function get state()      { return _state; }
  function set state(s)     { _state = s; }
  function get score()      { return _score; }
  function get killCount()  { return _kills; }

  function addScore(n) { _score += n; }
  function addKill()   { _kills++; }

  // ── Start / Reset ─────────────────────────────
  function start() {
    World.reset();
    World.pregenChunks(2);

    Bullets.reset();
    Enemies.reset();
    Particles.reset();
    Pickups.reset();

    _score = 0;
    _kills = 0;
    _state = 'game';

    const spawn = World.findOpenSpawn();
    Player.reset(spawn.x, spawn.y, 'Player', '#4adeff');

    const cam = Renderer.cam;
    cam.x = spawn.x;
    cam.y = spawn.y;
  }

  // ── Main update (called each frame) ──────────
  function update(dt) {
    if (_state !== 'game') return;

    const cam  = Renderer.cam;
    const in_  = Input.consumeShots();
    const move = Input.getMoveDir();
    const aim  = Input.getAimAngle(cam);
    const mw   = Input.getMouseWorld(cam);

    Player.update(dt, { move, aimAngle: aim, mouseWorld: mw, ...in_ }, cam);
    Bullets.update(dt);
    Enemies.update(dt);
    Pickups.update(dt);
    Particles.update(dt);
  }

  return { get state() { return _state; }, set state(s) { _state = s; },
           get score()     { return _score; },
           get killCount() { return _kills; },
           addScore, addKill, start };
})();
