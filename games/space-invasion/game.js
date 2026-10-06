// Fullscreen (browsers only allow it from a key press/click, so it triggers when the game starts)
const goFullscreen = () => { const el = document.querySelector('.wrap'); if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(() => {}); };
const toggleFullscreen = () => document.fullscreenElement ? document.exitFullscreen() : goFullscreen();
// GAME: HUD + Game state machine + loop (ports hud.py and game.py)
function drawHUD(c, score, lives, wave, over, trans) {
  c.save(); c.translate(18, 18); c.textBaseline = 'top'; c.textAlign = 'left';
  const rr = (x, y, w, h, r, fill, stroke, lw) => {
    c.beginPath(); c.roundRect(x, y, w, h, r);
    if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); }
  };
  const ln = (x1, y1, x2, col) => { c.strokeStyle = col; c.lineWidth = 1; c.beginPath(); c.moveTo(x1, y1 + .5); c.lineTo(x2, y1 + .5); c.stroke(); };
  const T = (s, x, y, f, col) => { c.font = f; c.fillStyle = col; c.fillText(s, x, y); };
  rr(0, 0, 270, 220, 14, 'rgba(5,10,25,.804)');
  rr(1, 1, 268, 218, 14, 0, 'rgba(80,150,220,.86)', 2);
  rr(6.5, 6.5, 257, 207, 10, 0, 'rgba(40,80,130,.47)', 1);
  T('◈  MISSION CONTROL', 18, 12, F(20, 1), 'rgb(180,220,255)');
  ln(18, 42, 252, 'rgba(70,130,190,.63)');
  T('SCORE', 18, 55, F(15, 1), 'rgb(130,160,190)'); T(String(score).padStart(5, '0'), 18, 72, F(34, 1), '#fff');
  T('WAVE', 165, 55, F(15, 1), 'rgb(130,160,190)'); T(String(wave).padStart(2, '0'), 165, 72, F(34, 1), 'rgb(180,220,255)');
  ln(18, 116, 252, 'rgba(70,130,190,.51)');
  T("SHIP'S HEALTH", 18, 130, F(15, 1), 'rgb(130,160,190)');
  for (let i = 0; i < 3; i++) {
    const x = 20 + i * 45; rr(x, 157, 35, 15, 4, 'rgb(35,45,60)');
    if (i < lives) { rr(x, 157, 35, 15, 4, 'rgb(50,190,240)'); rr(x + 3, 160, 29, 3, 2, 'rgb(150,230,255)'); }
  }
  const [st, col] = over ? ['● SYSTEM OFFLINE', 'rgb(255,80,80)'] : trans ? ['● WAVE INITIALIZING', 'rgb(255,210,80)'] : ['● SYSTEM ONLINE', 'rgb(100,255,170)'];
  T(st, 18, 190, F(14, 1), col);
  ln(170, 190, 215, 'rgba(70,130,190,.47)'); ln(225, 190, 250, 'rgba(70,130,190,.47)');
  c.fillStyle = 'rgba(80,160,220,.7)'; c.beginPath(); c.arc(260, 190, 3, 0, 7); c.fill();
  c.restore();
}

class Game {
  constructor(canvas) {
    this.c = canvas.getContext('2d'); this.canvas = canvas; this.bg = new SpaceBackground();
    this.startScreen = true; this.mouse = { x: -1, y: -1 }; this.reset();
    const pos = e => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
    canvas.addEventListener('mousemove', e => this.mouse = pos(e));
    canvas.addEventListener('click', e => {
      if (!this.startScreen) return; startMusic(); const p = pos(e);
      if (hit({ x: p.x, y: p.y, w: 1, h: 1 }, this.btn(0))) this.startGame(); else if (hit({ x: p.x, y: p.y, w: 1, h: 1 }, this.btn(1))) this.quit();
    });
    addEventListener('keydown', e => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Enter'].includes(e.code)) e.preventDefault();
      if (e.repeat) return; keys[e.code] = true; this.onKey(e.code);
    });
  }
  btn(i) { return { x: W / 2 - 155, y: H / 2 - 45 + i * 80, w: 310, h: 62 }; }
  quit() { if (document.fullscreenElement) document.exitFullscreen(); stopMusic(); location.href = '../../index.html'; }
  startGame() { this.startScreen = false; this.reset(); goFullscreen(); }
  reset() {
    this.player = new Player(); this.wave = 1; this.enemies = createGrid('enemyBlack3'); this.speed = enemySpeed(1);
    this.score = 0; this.lives = 3; this.eb = []; this.ex = []; this.over = false;
    this.shootAt = performance.now() + shootInterval(1); this.trans = true; this.waveStart = performance.now();
  }
  createWave() {
    const w = this.wave;
    if (w == 1) return createGrid('enemyBlack3'); if (w == 2) return createTriangle('enemyBlue3');
    if (w == 3) return createDiamond('enemyGreen3'); if (w == 4) return createV('enemyRed3');
    return [createCross, createArrow, createHollowRectangle][(w - 5) % 3](SHIP_TYPES);
  }
  onKey(code) {
    startMusic();
    if (code == 'KeyF') { toggleFullscreen(); return; }
    if (this.startScreen) { if (code == 'Enter' || code == 'Space') this.startGame(); else if (code == 'Escape') this.quit(); return; }
    if (code == 'Space' && this.enemies.length && !this.over && !this.trans) this.player.shoot();
    if (code == 'KeyR') this.reset();
  }
  enemyShoot() {
    if (!this.enemies.length || this.over || this.trans) return;
    const shooters = this.enemies.filter(e => {
      const r = e.rect(); return !this.enemies.some(o => { if (o === e) return false; const q = o.rect(); return q.y > r.y && r.x + r.w > q.x && r.x < q.x + q.w; });
    });
    if (!shooters.length) return;
    const pick = shooters.slice().sort(() => Math.random() - .5).slice(0, Math.min(maxShooters(this.wave), shooters.length));
    for (const s of pick) { const [x, y] = s.shoot(); this.eb.push(new EnemyBullet(x, y)); sfx('enemy_shoot'); }
  }
  update() {
    this.bg.update();
    if (this.startScreen) return;
    const now = performance.now();
    if (now >= this.shootAt) { this.shootAt = Math.max(this.shootAt, now - shootInterval(this.wave)) + shootInterval(this.wave); this.enemyShoot(); }
    if (this.trans) { if (now - this.waveStart >= 2000) this.trans = false; return; }
    if (!this.enemies.length && !this.over) {
      this.wave++; this.enemies = this.createWave(); this.speed = enemySpeed(this.wave);
      this.shootAt = now + shootInterval(this.wave); this.trans = true; this.waveStart = now; this.eb = []; this.ex = []; return;
    }
    if (this.enemies.length && !this.over) {
      this.player.update();
      this.eb = this.eb.filter(b => { b.update(); return !b.off(); });
      const pr = this.player.rect();
      for (const b of this.eb.slice()) {
        if (hit(b.rect(), pr)) {
          this.eb.splice(this.eb.indexOf(b), 1); this.lives--;
          if (this.lives <= 0) { this.lives = 0; this.player.destroyed = true; this.over = true; sfx('player_destroy'); break; }
        }
      }
      this.enemies.forEach(e => e.update(this.speed));
      if (this.enemies.some(e => e.x <= 0 || e.x + e.w >= W)) { this.speed *= -1; this.enemies.forEach(e => e.y += 40); }
      for (const b of this.player.bullets.slice()) {
        for (const e of this.enemies.slice()) {
          if (hit(b.rect(), e.rect())) {
            const bi = this.player.bullets.indexOf(b); if (bi >= 0) this.player.bullets.splice(bi, 1);
            const ei = this.enemies.indexOf(e);
            if (ei >= 0) { this.enemies.splice(ei, 1); this.ex.push(new EnemyExplosion(e.x + 40, e.y + (e.h >> 1), 80)); sfx('enemy_destroy'); }
            this.score += 10; break;
          }
        }
      }
    }
    this.ex = this.ex.filter(x => { x.update(); return !x.finished; });
  }
  drawStart() {
    const c = this.c, cx = W / 2, m = this.mouse; this.bg.draw(c);
    c.fillStyle = 'rgba(0,0,0,.373)'; c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(70,150,190,.11)'; c.lineWidth = 1; c.beginPath();
    for (let x = 0; x < W; x += 45) { c.moveTo(x + .5, 0); c.lineTo(x + .5, H); }
    for (let y = 0; y < H; y += 45) { c.moveTo(0, y + .5); c.lineTo(W, y + .5); }
    c.stroke();
    c.drawImage(IMG['player.png'], cx - 390 - 45, H / 2 + 20 - 45, 90, 90);
    c.drawImage(IMG['enemyBlack3.png'], cx + 390 - 37, H / 2 - 20 - 37, 75, 75);
    c.textBaseline = 'top'; c.textAlign = 'center';
    c.font = F(64); c.fillStyle = 'rgb(0,20,30)'; c.fillText('SPACE INVASION', cx + 4, H / 2 - 190 + 5);
    c.fillStyle = 'rgb(180,235,255)'; c.fillText('SPACE INVASION', cx, H / 2 - 190);
    c.strokeStyle = 'rgb(80,190,230)'; c.lineWidth = 2; c.beginPath();
    c.moveTo(cx - 230, H / 2 - 112); c.lineTo(cx - 45, H / 2 - 112); c.moveTo(cx + 45, H / 2 - 112); c.lineTo(cx + 230, H / 2 - 112); c.stroke();
    c.font = F(24); c.fillStyle = 'rgb(110,190,215)'; c.fillText('MISSION CONTROL', cx, H / 2 - 92);
    [['START GAME', '20,100,135', '90,210,245', '#fff'], ['QUIT', '45,55,65', '120,135,145', 'rgb(220,225,230)']].forEach(([t, fill, bd, tc], i) => {
      const b = this.btn(i), hv = hit({ x: m.x, y: m.y, w: 1, h: 1 }, b);
      c.fillStyle = `rgba(${fill},${(hv ? 210 : 165) / 255})`; c.fillRect(b.x, b.y, b.w, b.h);
      c.strokeStyle = `rgb(${bd})`; c.lineWidth = 2; c.beginPath(); c.roundRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2, 5); c.stroke();
      c.font = F(32); c.fillStyle = tc; c.textBaseline = 'middle'; c.fillText(t, cx, b.y + b.h / 2); c.textBaseline = 'top';
    });
    c.font = F(24); c.fillStyle = 'rgb(155,180,195)'; c.fillText('ENTER / SPACE  •  START        ESC  •  QUIT', cx, H - 55);
    c.textAlign = 'left'; c.fillStyle = 'rgb(75,120,135)'; c.fillText('SPACE INVASION  •  SYSTEM READY', 25, H - 35);
  }
  draw() {
    const c = this.c; c.globalAlpha = 1;
    if (this.startScreen) { this.drawStart(); return; }
    this.bg.draw(c); this.enemies.forEach(e => e.draw(c)); this.player.draw(c);
    this.eb.forEach(b => b.draw(c)); this.ex.forEach(x => x.draw(c));
    drawHUD(c, this.score, this.lives, this.wave, this.over, this.trans);
    c.textBaseline = 'top'; c.textAlign = 'center';
    if (this.trans && !this.over) {
      const p = Math.min((performance.now() - this.waveStart) / 2000, 1);
      c.globalAlpha = Math.max(0, p < .5 ? p * 2 : (1 - p) * 2); c.fillStyle = '#fff';
      c.font = F(64); c.fillText(`WAVE ${this.wave}`, W / 2, H / 2 - 70); c.font = F(24); c.fillText('GET READY...', W / 2, H / 2 + 10);
      c.globalAlpha = 1;
    }
    if (this.over) {
      c.fillStyle = 'rgba(0,0,0,.392)'; c.fillRect(0, 0, W, H);
      c.font = F(64); c.fillStyle = 'rgb(255,80,80)'; c.fillText('GAME OVER', W / 2, H / 2 - 70);
      c.font = F(32); c.fillStyle = '#fff'; c.fillText('Press R to Restart', W / 2, H / 2 + 10);
    }
  }
}

(async function main() {
  const canvas = document.getElementById('game'), msg = document.getElementById('loading');
  try {
    await loadImages(['background.jpg', 'player.png', 'player_destroyed.png', 'player_bullet.png', 'enemy_bullet.png',
      'enemyBlack3.png', 'enemyBlue3.png', 'enemyGreen3.png', 'enemyRed3.png']);
  } catch (n) { msg.textContent = 'Failed to load asset: ' + n; return; }
  msg.remove();
  const g = window.G = new Game(canvas), $ = id => document.getElementById(id);
  $('fs').onclick = e => { e.target.blur(); toggleFullscreen(); };
  $('restart').onclick = e => { e.target.blur(); startMusic(); g.startScreen ? g.startGame() : g.reset(); };
  let last = performance.now(), acc = 0; const STEP = 1000 / 60;
  (function frame(t) {
    acc += Math.min(t - last, 100); last = t;
    while (acc >= STEP) { g.update(); acc -= STEP; }
    g.draw(); $('score').textContent = g.score; $('lives').textContent = g.lives; $('wave').textContent = g.wave;
    requestAnimationFrame(frame);
  })(last);
})();
