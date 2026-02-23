// ══════════════════════════════════════════════════════
//  renderer.js — master draw orchestrator
// ══════════════════════════════════════════════════════
import { drawWorld, drawBuildPreview } from './draw_world.js';
import { drawPlayer, drawEnemy, drawPickup, drawBullet, drawParticles } from './draw_entities.js';
import { drawHUD, drawPlayersSidebar, drawPauseOverlay, drawGameOverOverlay, drawCursor } from './hud.js';
import { drawMinimap, updateMinimap } from '../world/minimap.js';
import { isSolid } from '../world/mapgen.js';
import { TS } from '../main.js';

export function render(ctx, canvas, gameState, t, dt) {
  const { state, cam, players, localPlayerId, enemies, pickups, bullets, enemyBullets,
          particles, score, killCount, buildMode, isHost, pingMs, mouse } = gameState;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!gameState.gameRunning) {
    drawCursor(ctx, mouse, state, buildMode);
    return;
  }

  const localPlayer = players[localPlayerId] || Object.values(players)[0];
  if (!localPlayer) return;

  // ── World space ───────────────────────────────────────
  ctx.save();
  ctx.translate(canvas.width / 2 - cam.x, canvas.height / 2 - cam.y);

  drawWorld(ctx, cam.x, cam.y, canvas.width, canvas.height, t);

  // Build preview
  if (buildMode && state === 'game') {
    const mouseWx = Math.floor((mouse.x - canvas.width/2  + cam.x) / TS);
    const mouseWy = Math.floor((mouse.y - canvas.height/2 + cam.y) / TS);
    drawBuildPreview(ctx, localPlayer.x, localPlayer.y, mouseWx, mouseWy, localPlayer, isSolid);
  }

  // Pickups
  pickups.forEach(p => drawPickup(ctx, p));

  // Bullets
  bullets.forEach(b => drawBullet(ctx, b));
  (enemyBullets || []).forEach(b => drawBullet(ctx, b));

  // Particles
  drawParticles(ctx, particles);

  // Enemies
  enemies.forEach(e => drawEnemy(ctx, e));

  // Players (draw others first, local on top)
  Object.values(players).forEach(p => {
    if (p.id !== localPlayerId) drawPlayer(ctx, p, false);
  });
  drawPlayer(ctx, localPlayer, true);

  ctx.restore();

  // ── Screen space ──────────────────────────────────────
  // Player sidebar
  const allPlayersArr = Object.values(players);
  drawPlayersSidebar(ctx, allPlayersArr, canvas.height);

  // Minimap
  updateMinimap(dt, cam.x, cam.y);
  drawMinimap(ctx, canvas.width, canvas.height, allPlayersArr, enemies, cam.x, cam.y);

  // HUD
  drawHUD(ctx, canvas.width, canvas.height, localPlayer, score, killCount, buildMode, isHost, pingMs);

  if (state === 'paused')   drawPauseOverlay(ctx, canvas.width, canvas.height);
  if (state === 'gameover') drawGameOverOverlay(ctx, canvas.width, canvas.height, score, killCount);

  drawCursor(ctx, mouse, state, buildMode);
}
