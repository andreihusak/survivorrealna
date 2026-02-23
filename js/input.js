// ═══════════════════════════════════════════════
//  input.js — Keyboard, mouse, one-shot events
//  Add new keybindings here
// ═══════════════════════════════════════════════

const Input = (() => {
  const keys = {};
  const mouse = { x: 0, y: 0, down: false, rightDown: false };

  // One-shot flags — consumed once per frame by game logic
  let _shootPulse  = false;
  let _meleePulse  = false;
  let _reloadPulse = false;
  let _buildToggle = false;
  let _placeWall   = false;
  let _removeWall  = false;
  let _switchWeapon = null;  // null or weapon key string

  // ── Listeners ─────────────────────────────────
  window.addEventListener('keydown', e => {
    if (keys[e.code]) return;  // ignore held key repeats for toggles
    keys[e.code] = true;

    // ── Keybindings ── edit here to remap ──
    if (e.code === 'KeyB') _buildToggle = true;
    if (e.code === 'KeyF' || e.code === 'Space') { _meleePulse = true; e.preventDefault(); }
    if (e.code === 'KeyR') _reloadPulse = true;

    // Weapon switching — add more slots here
    if (e.code === 'Digit1') _switchWeapon = 'pistol';
    if (e.code === 'Digit2') _switchWeapon = 'shotgun';
    if (e.code === 'Digit3') _switchWeapon = 'smg';

    if (e.code === 'Escape') {
      if (Game.state === 'game')   Game.state = 'paused';
      else if (Game.state === 'paused') Game.state = 'game';
    }
  });

  window.addEventListener('keyup', e => { keys[e.code] = false; });

  window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });

  window.addEventListener('mousedown', e => {
    if (e.button === 0) {
      mouse.down = true;
      _shootPulse = true;
      if (Game.state === 'gameover') UI.handleGameOverClick(e.clientX, e.clientY);
    }
    if (e.button === 2) {
      mouse.rightDown = true;
      _removeWall = true;
    }
    e.preventDefault();
  });

  window.addEventListener('mouseup', e => {
    if (e.button === 0) mouse.down = false;
    if (e.button === 2) mouse.rightDown = false;
  });

  window.addEventListener('contextmenu', e => e.preventDefault());

  // ── Per-frame query ───────────────────────────
  function getMoveDir() {
    let dx = 0, dy = 0;
    if (keys['KeyW'] || keys['ArrowUp'])    dy -= 1;
    if (keys['KeyS'] || keys['ArrowDown'])  dy += 1;
    if (keys['KeyA'] || keys['ArrowLeft'])  dx -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) dx += 1;
    const len = Math.sqrt(dx*dx + dy*dy);
    if (len > 0) { dx /= len; dy /= len; }
    return { dx, dy };
  }

  function getAimAngle(cam) {
    const hw = canvas.width / 2, hh = canvas.height / 2;
    return Math.atan2(mouse.y - hh, mouse.x - hw);
  }

  function getMouseWorld(cam) {
    const TS = C.TILE_SIZE;
    return {
      wx: Math.floor((mouse.x - canvas.width/2  + cam.x) / TS),
      wy: Math.floor((mouse.y - canvas.height/2 + cam.y) / TS),
    };
  }

  // Consume one-shot flags (call once per frame)
  function consumeShots() {
    const s = {
      shoot:       mouse.down,       // held
      shootPulse:  _shootPulse,      // first frame only
      melee:       _meleePulse,
      reload:      _reloadPulse,
      buildToggle: _buildToggle,
      placeWall:   _placeWall || (_shootPulse),  // place on click in build mode
      removeWall:  _removeWall,
      switchWeapon: _switchWeapon,
    };
    _shootPulse = _meleePulse = _reloadPulse = _buildToggle = false;
    _placeWall  = _removeWall = false;
    _switchWeapon = null;
    return s;
  }

  return { getMoveDir, getAimAngle, getMouseWorld, consumeShots, mouse, keys };
})();
