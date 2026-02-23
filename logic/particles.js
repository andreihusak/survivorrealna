// ══════════════════════════════════════════════════════
//  particles.js — lightweight particle system
// ══════════════════════════════════════════════════════

let particles = [];

export function spawnParticle(x, y, vx, vy, color, life, size = 3, gravity = 0) {
  particles.push({ x, y, vx, vy, color, life, maxLife: life, size, gravity });
}

export function spawnBurst(x, y, count, color, speed = 120, life = 0.4, size = 2.5, gravity = 80) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.5 + Math.random() * 0.8);
    spawnParticle(x, y, Math.cos(a) * s, Math.sin(a) * s, color, life * (0.6 + Math.random() * 0.8), size * (0.5 + Math.random()), gravity);
  }
}

export function spawnDirectionalBurst(x, y, angle, spread, count, color, speed = 140, life = 0.35, gravity = 100) {
  for (let i = 0; i < count; i++) {
    const a = angle + (Math.random() - 0.5) * spread;
    const s = speed * (0.5 + Math.random());
    spawnParticle(x, y, Math.cos(a) * s, Math.sin(a) * s, color, life * (0.5 + Math.random()), 2 + Math.random() * 2, gravity);
  }
}

export function updateParticles(dt) {
  particles = particles.filter(p => {
    p.x  += p.vx * dt;
    p.y  += p.vy * dt;
    p.vy += p.gravity * dt;
    p.life -= dt;
    return p.life > 0;
  });
}

export function getParticles() { return particles; }

export function clearParticles() { particles = []; }
