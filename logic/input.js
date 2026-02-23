// ══════════════════════════════════════════════════════
//  input.js — keyboard & mouse state
// ══════════════════════════════════════════════════════

export const keys = {};
export const mouse = {
  x: 0, y: 0,
  down: false, rightDown: false,
  clicked: false,   // one-frame left click
  rclicked: false,  // one-frame right click
};

// Consumed each frame by game logic
export const oneshot = {
  melee: false,
  reload: false,
};

export function initInput() {
  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'KeyF' || e.code === 'Space') { oneshot.melee = true; e.preventDefault(); }
    if (e.code === 'KeyR') oneshot.reload = true;
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });
  window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
  window.addEventListener('mousedown', e => {
    if (e.button === 0) { mouse.down = true;  mouse.clicked  = true; }
    if (e.button === 2) { mouse.rightDown = true; mouse.rclicked = true; }
    e.preventDefault();
  });
  window.addEventListener('mouseup', e => {
    if (e.button === 0) mouse.down = false;
    if (e.button === 2) mouse.rightDown = false;
  });
  window.addEventListener('contextmenu', e => e.preventDefault());
}

// Call at END of each game-logic frame to clear one-shot flags
export function clearOneshots() {
  oneshot.melee   = false;
  oneshot.reload  = false;
  mouse.clicked   = false;
  mouse.rclicked  = false;
}

export function getMovementVector() {
  let dx = 0, dy = 0;
  if (keys['KeyW'] || keys['ArrowUp'])    dy -= 1;
  if (keys['KeyS'] || keys['ArrowDown'])  dy += 1;
  if (keys['KeyA'] || keys['ArrowLeft'])  dx -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) dx += 1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len > 0) { dx /= len; dy /= len; }
  return { dx, dy };
}
