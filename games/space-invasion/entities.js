// ENTITIES + FORMATIONS (ports bullet.py, enemy_bullet.py, enemy.py, player.py, formation.py, difficulty.py, EnemyExplosion)
const enemySpeed = w => Math.min(2 + (w - 1) * 0.1, 3);
const shootInterval = w => Math.max(1200 - (w - 1) * 50, 850);
const maxShooters = w => Math.min(2 + Math.floor((w - 1) / 5), 3);

class Bullet {
  constructor(x, y) { this.x = x - 15; this.y = y - 50; }
  update() { this.y -= 10; }
  draw(c) { c.drawImage(IMG['player_bullet.png'], this.x, this.y, 30, 50); }
  rect() { return rect(this.x, this.y, 30, 50); }
  off() { return this.y < -50; }
}
class EnemyBullet {
  constructor(x, y) { this.x = x - 15; this.y = y; }
  update() { this.y += 6; }
  draw(c) { c.drawImage(IMG['enemy_bullet.png'], this.x, this.y, 30, 50); }
  rect() { return rect(this.x, this.y, 30, 50); }
  off() { return this.y > H; }
}

const GLOWS = { Black: '90,190,255', Blue: '0,210,255', Green: '80,255,140', Red: '255,80,80' };
const glowCache = {};
function enemyGlow(type) {
  if (glowCache[type]) return glowCache[type];
  const key = Object.keys(GLOWS).find(k => type.includes(k));
  const sil = silhouette(IMG[type + '.png'], 80, 53, `rgb(${GLOWS[key] || '100,200,255'})`);
  const c = document.createElement('canvas'); c.width = Math.floor(80 * 1.16); c.height = Math.floor(53 * 1.16);
  const g = c.getContext('2d'), k = 110 / 255;
  for (let o = 5; o > 0; o--) {
    g.globalAlpha = (12 + (5 - o) * 5) / 255 * k;
    g.drawImage(sil, 8 + o, 8); g.drawImage(sil, 8 - o, 8); g.drawImage(sil, 8, 8 + o); g.drawImage(sil, 8, 8 - o);
  }
  g.globalAlpha = 80 / 255 * k; g.drawImage(sil, 8, 8);
  return glowCache[type] = c;
}
class Enemy {
  constructor(x, y, type = 'enemyBlack3') { this.x = x; this.y = y; this.type = type; this.w = 80; this.h = 53; this.glow = enemyGlow(type); }
  update(d) { this.x += d; }
  shoot() { return [this.x + 40, this.y + this.h]; }
  draw(c) {
    const g = this.glow, x = this.x | 0, y = this.y | 0;
    c.drawImage(g, x - ((g.width - 80) >> 1), y - ((g.height - 53) >> 1));
    c.drawImage(IMG[this.type + '.png'], x, y, 80, 53);
  }
  rect() { return rect(this.x, this.y, this.w, this.h); }
}

class Player {
  constructor() {
    this.w = 80; this.h = 80; this.x = W / 2 - 40; this.y = H - 100;
    this.destroyed = false; this.bullets = []; this.t = 0;
    this.parts = Array.from({ length: 14 }, () => this.mk());
    const sil = silhouette(IMG['player.png'], 80, 80, 'rgb(0,200,255)');
    this.glow = document.createElement('canvas'); this.glow.width = this.glow.height = 100;
    const g = this.glow.getContext('2d');
    g.globalAlpha = 70 / 255; g.drawImage(sil, 10, 10);
    g.globalAlpha = 70 / 255 * 30 / 255; g.drawImage(sil, 4, 4, 92, 92);
  }
  mk() {
    return { x: rnd(this.w * .35, this.w * .65), y: rnd(this.h * .70, this.h * .82),
             speed: rnd(1.5, 3.5), size: rnd(1.5, 3.5), life: rnd(.4, 1) };
  }
  update() {
    if (this.destroyed) return;
    if (keys.ArrowLeft) this.x -= 7;
    if (keys.ArrowRight) this.x += 7;
    this.x = Math.max(0, Math.min(this.x, W - this.w));
    this.t += 0.12;
    for (const p of this.parts) { p.y += p.speed; p.life -= 0.025; if (p.life <= 0 || p.y > this.h) Object.assign(p, this.mk()); }
    this.bullets.forEach(b => b.update());
    this.bullets = this.bullets.filter(b => !b.off());
  }
  shoot() {
    if (this.destroyed) return;
    this.bullets.push(new Bullet(this.x + this.w / 2 - 3, this.y));
    sfx('player_shoot');
  }
  rect() { return rect(this.x, this.y, this.w, this.h); }
  draw(c) {
    const px = this.x | 0, py = this.y | 0;
    if (this.destroyed) { c.drawImage(IMG['player_destroyed.png'], px, py, 80, 80); return; }
    const len = 18 + (Math.sin(this.t * 2.5) + 1) / 2 * 10, poly = (pts, col) => {
      c.fillStyle = col; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x | 0, y | 0) : c.moveTo(x | 0, y | 0)); c.fill();
    };
    for (const ex of [this.x + this.w * .39, this.x + this.w * .61]) {
      const y0 = this.y + this.h * .82;
      poly([[ex, y0], [ex + 8, this.y + this.h * .84], [ex, y0 + len], [ex - 8, this.y + this.h * .84]], 'rgb(0,210,255)');
      poly([[ex, this.y + this.h * .83], [ex + 4, this.y + this.h * .85], [ex, y0 + len * .75], [ex - 4, this.y + this.h * .85]], 'rgb(220,250,255)');
    }
    c.fillStyle = 'rgb(80,220,255)';
    for (const p of this.parts) { c.beginPath(); c.arc((this.x + p.x) | 0, (this.y + p.y + this.h * .18) | 0, Math.max(1, p.size | 0), 0, 7); c.fill(); }
    c.drawImage(this.glow, px - 10, py - 10);
    c.drawImage(IMG['player.png'], px, py, 80, 80);
    const r = (3 + (Math.sin(this.t * 3) + 1) / 2 * 2) | 0, cx = (this.x + this.w * .5) | 0, cy = (this.y + this.h * .32) | 0;
    c.fillStyle = 'rgba(0,210,255,.137)'; c.beginPath(); c.arc(cx, cy, r * 4, 0, 7); c.fill();
    c.fillStyle = 'rgb(130,240,255)'; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill();
    this.bullets.forEach(b => b.draw(c));
  }
}

class EnemyExplosion {
  constructor(x, y, size = 50) {
    this.x = x; this.y = y; this.size = size; this.age = 0; this.duration = 500; this.finished = false;
    this.parts = Array.from({ length: 32 }, () => {
      const a = rnd(0, Math.PI * 2), s = rnd(1.5, 5.5);
      return { x: 0, y: 0, vx: Math.cos(a) * s, vy: Math.sin(a) * s, size: rnd(2, 5), life: rint(250, 500), max: 500, spark: Math.random() < .5 };
    });
  }
  update() {
    this.age += 16;
    for (const p of this.parts) { p.x += p.vx; p.y += p.vy; p.vy += 0.035; p.life -= 16; }
    if (this.age >= this.duration) this.finished = true;
  }
  draw(c) {
    const pr = Math.min(this.age / this.duration, 1), S = this.size, X = this.x | 0, Y = this.y | 0;
    const circ = (r, col) => { c.fillStyle = col; c.beginPath(); c.arc(X, Y, r, 0, 7); c.fill(); };
    if (pr < .16) circ((S * (.15 + pr / .16 * .45)) | 0, 'rgb(255,255,230)');
    if (pr < .65) {
      const r = (S * (.25 + pr / .65 * .85)) | 0;
      circ(r, 'rgb(230,45,10)'); circ((r * .82) | 0, 'rgb(255,100,15)'); circ((r * .58) | 0, 'rgb(255,185,35)'); circ((r * .28) | 0, 'rgb(255,240,150)');
    }
    if (pr > .25) {
      const sp = Math.max(0, Math.min((pr - .25) / .75, 1)), sr = (S * (.35 + sp * .75)) | 0;
      c.fillStyle = `rgba(55,55,60,${(120 * (1 - sp) | 0) / 255})`; c.beginPath();
      for (const [sx, sy] of [[1.5, 1.5], [1.1, 1.35], [1.9, 1.3], [1.5, 1.05]]) {
        const cx = this.x + (sx - 1.5) * sr, cy = this.y + (sy - 1.5) * sr - sp * 18, rr = (sr * .55) | 0;
        c.moveTo(cx + rr, cy); c.arc(cx, cy, rr, 0, 7);
      }
      c.fill();
    }
    for (const p of this.parts) {
      if (p.life <= 0) continue;
      const px = (this.x + p.x) | 0, py = (this.y + p.y) | 0;
      if (p.spark) {
        const L = p.size * 2.5; c.strokeStyle = 'rgb(255,170,35)'; c.lineWidth = Math.max(1, p.size | 0);
        c.beginPath(); c.moveTo(px, py); c.lineTo((px - p.vx * L) | 0, (py - p.vy * L) | 0); c.stroke();
      } else { const d = Math.max(2, (p.size * p.life / p.max) | 0); c.fillStyle = 'rgb(100,100,105)'; c.fillRect(px, py, d, d); }
    }
  }
}

// FORMATIONS
const SHIP_TYPES = ['enemyBlack3', 'enemyBlue3', 'enemyGreen3', 'enemyRed3'];
const gt = t => typeof t === 'string' ? t : t[rint(0, t.length - 1)];
const E = (x, y, t) => new Enemy(x, y, gt(t));
function rows(counts, sx, sy, gx, gy, t) {
  const o = []; counts.forEach((n, r) => { for (let c = 0; c < n; c++) o.push(E(sx + (c - (n - 1) / 2) * gx, sy + r * gy, t)); }); return o;
}
const createGrid = (t = 'enemyBlack3') => { const o = []; for (let r = 0; r < 2; r++) for (let c = 0; c < 7; c++) o.push(E(180 + c * 100, 80 + r * 90, t)); return o; };
const createTriangle = (t = 'enemyBlue3') => { const o = []; for (let r = 0; r < 5; r++) for (let c = 0; c <= r; c++) o.push(E(330 + (c - r / 2) * 80, 80 + r * 70, t)); return o; };
const createDiamond = (t = 'enemyGreen3') => rows([1, 3, 5, 3, 1], 360, 70, 80, 70, t);
const createV = (t = 'enemyRed3') => { const o = []; for (let i = 0; i < 5; i++) { o.push(E(180 + i * 90, 70 + i * 70, t)); o.push(E(900 - i * 90, 70 + i * 70, t)); } return o; };
const createCross = (t = SHIP_TYPES) => { const o = []; for (let i = 0; i < 5; i++) o.push(E(W / 2, 70 + i * 80, t)); for (let i = 0; i < 5; i++) o.push(E(W / 2 - 160 + i * 80, 70 + 160, t)); return o; };
const createArrow = (t = SHIP_TYPES) => rows([1, 3, 5, 7], W / 2, 70, 80, 70, t).concat([E(W / 2, 70 + 4 * 70, t), E(W / 2, 70 + 5 * 70, t)]);
const createHollowRectangle = (t = SHIP_TYPES) => { const o = []; for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) if (r == 0 || r == 3 || c == 0 || c == 7) o.push(E(200 + c * 80, 70 + r * 70, t)); return o; };
