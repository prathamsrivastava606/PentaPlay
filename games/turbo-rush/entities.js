// ENTITIES: player, enemy, coin, booster (ports of player.py, enemy.py, coin.py)
const WIDTH = 1920, HEIGHT = 1080, ROAD_WIDTH = 500, ROAD_X = (WIDTH - ROAD_WIDTH) / 2, ROAD_RIGHT = ROAD_X + ROAD_WIDTH, CENTER_X = WIDTH / 2;
const LANES = [ROAD_X + 45, ROAD_X + 160, ROAD_X + 285, ROAD_X + 405];
const T = Math.trunc, rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1)), choice = a => a[Math.floor(Math.random() * a.length)];
const keys = {};
const FS = n => `bold ${Math.round(n * .72)}px Arial, Helvetica, sans-serif`; // approximates pygame's default font sizes

// drawing helpers (pygame-style)
const D = {
  rect(c, col, x, y, w, h) { c.fillStyle = col; c.fillRect(T(x), T(y), w, h); },
  rrect(c, col, x, y, w, h, r, lw) { c.beginPath(); if (lw) { c.roundRect(T(x) + lw / 2, T(y) + lw / 2, w - lw, h - lw, Math.max(0, r - lw / 2)); c.strokeStyle = col; c.lineWidth = lw; c.stroke(); } else { c.roundRect(T(x), T(y), w, h, r); c.fillStyle = col; c.fill(); } },
  circle(c, col, x, y, r, lw) { c.beginPath(); if (lw) { c.arc(T(x), T(y), r - lw / 2, 0, 7); c.strokeStyle = col; c.lineWidth = lw; c.stroke(); } else { c.arc(T(x), T(y), r, 0, 7); c.fillStyle = col; c.fill(); } },
  line(c, col, x1, y1, x2, y2, w) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(T(x1), T(y1)); c.lineTo(T(x2), T(y2)); c.stroke(); },
  poly(c, col, pts) { c.fillStyle = col; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(T(x), T(y)) : c.moveTo(T(x), T(y))); c.closePath(); c.fill(); },
  ellipse(c, col, x, y, w, h, lw) { c.beginPath(); if (lw) { c.ellipse(T(x) + w / 2, T(y) + h / 2, w / 2 - lw / 2, h / 2 - lw / 2, 0, 0, 7); c.strokeStyle = col; c.lineWidth = lw; c.stroke(); } else { c.ellipse(T(x) + w / 2, T(y) + h / 2, w / 2, h / 2, 0, 0, 7); c.fillStyle = col; c.fill(); } },
  text(c, s, x, y, font, col, center) { c.font = font; c.fillStyle = col; c.textAlign = center ? 'center' : 'left'; c.textBaseline = center ? 'middle' : 'top'; c.fillText(s, x, y); },
};
const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

function carBase(c, x, y, body) {
  const W4 = [[x - 5, y + 12], [x + 47, y + 12], [x - 5, y + 53], [x + 47, y + 53]];
  W4.forEach(([wx, wy]) => D.rect(c, 'rgb(10,10,10)', wx, wy, 8, 25));
  D.rect(c, body, x, y, 50, 90); D.rect(c, 'rgb(20,30,40)', x + 8, y + 10, 34, 25);
}

class Player {
  constructor(x, y, min_x, max_x) {
    this.x = x; this.y = y; this.min_x = min_x; this.max_x = max_x; this.width = 50; this.height = 90; this.speed = 7; this.color = 'rgb(220,30,30)';
    this.has_shield = false; this.boost_timer = 0; this.magnet_timer = 0; this.multiplier_timer = 0;
  }
  move() {
    const cs = this.boost_timer > 0 ? this.speed * 1.5 : this.speed;
    if (keys.ArrowLeft) this.x -= cs; if (keys.ArrowRight) this.x += cs;
    if (this.x < this.min_x) this.x = this.min_x; if (this.x > this.max_x) this.x = this.max_x;
    if (this.boost_timer > 0) this.boost_timer--; if (this.magnet_timer > 0) this.magnet_timer--; if (this.multiplier_timer > 0) this.multiplier_timer--;
  }
  draw(c, nitro) {
    const x = T(this.x), y = T(this.y); carBase(c, x, y, this.color); D.rect(c, 'rgb(255,240,240)', x + 8, y + 78, 34, 6);
    if (nitro) { D.poly(c, 'rgb(255,150,0)', [[x + 12, y + 90], [x + 25, y + 115], [x + 38, y + 90]]); D.poly(c, 'rgb(255,230,50)', [[x + 18, y + 90], [x + 25, y + 108], [x + 32, y + 90]]); }
    if (this.boost_timer > 0) { D.poly(c, 'rgb(0,220,255)', [[x + 5, y + 90], [x + 15, y + 125], [x + 22, y + 90]]); D.poly(c, 'rgb(0,220,255)', [[x + 28, y + 90], [x + 35, y + 125], [x + 45, y + 90]]); }
    if (this.magnet_timer > 0) D.circle(c, 'rgb(255,60,60)', x + 25, y + 45, 65, 2);
    if (this.multiplier_timer > 0) D.rrect(c, 'rgb(190,60,255)', x - 3, y - 3, 56, 96, 4, 2);
    if (this.has_shield) { D.ellipse(c, 'rgba(0,210,255,.294)', x - 12, y - 12, 74, 114); D.ellipse(c, 'rgba(200,245,255,.863)', x - 12, y - 12, 74, 114, 3); }
  }
  rect() { return { x: T(this.x), y: T(this.y), w: this.width, h: this.height }; }
}

class Enemy {
  constructor(speed, lanes = LANES) {
    this.width = 50; this.height = 90; this.x = choice(lanes); this.y = -110; this.speed = speed;
    this.color = choice(['rgb(30,100,220)', 'rgb(150,40,180)', 'rgb(255,140,20)', 'rgb(240,210,30)', 'rgb(20,180,150)']); this.passed = false;
  }
  move() { this.y += this.speed; }
  draw(c) { const x = T(this.x), y = T(this.y); carBase(c, x, y, this.color); D.rect(c, 'rgb(255,80,80)', x + 7, y + 78, 10, 6); D.rect(c, 'rgb(255,80,80)', x + 33, y + 78, 10, 6); }
  rect() { return { x: T(this.x), y: T(this.y), w: this.width, h: this.height }; }
}

class Coin {
  constructor(speed, lanes = LANES) { this.x = choice(lanes) + 13; this.y = -30; this.size = 24; this.speed = speed; }
  move() { this.y += this.speed; }
  draw(c) { D.circle(c, 'rgb(255,210,20)', this.x + 12, this.y + 12, 12); D.circle(c, 'rgb(255,150,0)', this.x + 12, this.y + 12, 7); D.circle(c, 'rgb(255,230,70)', this.x + 12, this.y + 12, 3); }
  rect() { return { x: T(this.x), y: T(this.y), w: this.size, h: this.size }; }
}

class Booster {
  constructor(speed, lanes = LANES) { this.kind = choice(['magnet', 'shield', 'jetpack', 'star', 'double']); this.x = choice(lanes) + 10; this.y = -45; this.size = 30; this.speed = speed; }
  move() { this.y += this.speed; }
  draw(c) {
    const cx = this.x + 15, cy = T(this.y + 15), W = '#fff';
    if (this.kind === 'magnet') {
      D.circle(c, 'rgb(220,30,30)', cx, cy, 15); D.circle(c, W, cx, cy, 7); D.rect(c, 'rgb(55,55,55)', cx - 15, cy, 30, 15);
      D.rect(c, 'rgb(200,200,200)', cx - 15, cy - 2, 8, 7); D.rect(c, 'rgb(200,200,200)', cx + 7, cy - 2, 8, 7);
    } else if (this.kind === 'shield') {
      D.circle(c, 'rgb(0,210,255)', cx, cy, 15); D.circle(c, W, cx, cy, 15, 2); D.rect(c, W, cx - 3, cy - 9, 6, 18); D.rect(c, W, cx - 9, cy - 3, 18, 6);
    } else if (this.kind === 'jetpack') {
      D.circle(c, 'rgb(255,140,0)', cx, cy, 15); D.circle(c, W, cx, cy, 15, 2);
      D.poly(c, W, [[cx + 2, cy - 9], [cx - 5, cy], [cx + 1, cy], [cx - 2, cy + 9], [cx + 6, cy - 1], [cx - 1, cy - 1]]);
    } else if (this.kind === 'star') {
      D.circle(c, 'rgb(255,215,0)', cx, cy, 15); D.circle(c, W, cx, cy, 15, 2);
      D.poly(c, W, [[cx, cy - 8], [cx + 3, cy - 2], [cx + 9, cy - 2], [cx + 4, cy + 2], [cx + 6, cy + 8], [cx, cy + 4], [cx - 6, cy + 8], [cx - 4, cy + 2], [cx - 9, cy - 2], [cx - 3, cy - 2]]);
    } else {
      D.circle(c, 'rgb(170,40,230)', cx, cy, 15); D.circle(c, W, cx, cy, 15, 2); D.text(c, '2X', cx, cy, FS(22), W, true);
    }
  }
  rect() { return { x: T(this.x), y: T(this.y), w: this.size, h: this.size }; }
}
