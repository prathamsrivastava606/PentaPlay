// GAME: input, camera, time engine, HUD, menu, loop (port of src/engine/*, src/ui/debug.py)
const IMG = {};
const MONO = 'Consolas, "Courier New", monospace';
const goFullscreen = () => { const el = document.querySelector('.wrap'); if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(() => {}); };
const toggleFullscreen = () => document.fullscreenElement ? document.exitFullscreen() : goFullscreen();
const keys = {}, mouse = { x: 0, y: 0, down: false };
const cam = { x: 0, y: 0, apply: r => ({ x: Math.floor(r.x - cam.x), y: Math.floor(r.y - cam.y), w: r.w, h: r.h }) };

class Game {
  constructor(canvas) {
    this.cv = canvas; this.c = canvas.getContext('2d'); this.state = 'MENU'; this.world = new World(); this.debug = false; this.fps = 60;
    this.pb = { x: W / 2 - 150, y: 385 - 35, w: 300, h: 70 }; this.qb = { x: W / 2 - 150, y: 485 - 35, w: 300, h: 70 };
    this.bullets = []; this.hits = []; this.wave = 1; this.waveClear = 0; this.score = 0; this.over = false; this.msg = ''; this.msgTimer = 0;
    this.player = new Player(this.world.findValidPosition(40, 56)); this.drones = []; this.spawnWave(); this.msg = 'WAVE 1'; this.msgTimer = 2;
    const pos = e => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
    canvas.addEventListener('mousemove', e => Object.assign(mouse, pos(e)));
    canvas.addEventListener('mousedown', e => {
      Object.assign(mouse, pos(e)); if (e.button !== 0) return; mouse.down = true;
      if (this.state === 'MENU') { if (hit(mouse, this.pb)) this.play(); else if (hit(mouse, this.qb)) this.quit(); }
    });
    addEventListener('mouseup', () => mouse.down = false); canvas.addEventListener('contextmenu', e => e.preventDefault());
    addEventListener('keyup', e => keys[e.code] = false); addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.down = false; });
    addEventListener('keydown', e => {
      if (['Space', 'Enter', 'F3'].includes(e.code)) e.preventDefault(); if (e.repeat) return; keys[e.code] = true;
      if (e.code === 'KeyF') { toggleFullscreen(); return; }
      if (this.state === 'MENU') { if (e.code === 'Enter' || e.code === 'Space') this.play(); else if (e.code === 'Escape') this.quit(); return; }
      if (e.code === 'F3') this.debug = !this.debug;
      else if (e.code === 'KeyR') { if (this.over || this.player.dead) this.restart(); else this.player.weapon.reload(); }
    });
  }
  play() { this.state = 'GAME'; this.cv.style.cursor = 'none'; goFullscreen(); }
  quit() { if (document.fullscreenElement) document.exitFullscreen(); location.href = '../../index.html'; }
  spawnWave() {
    this.drones = []; const types = ['basic', 'scout', 'tank'];
    for (let i = 0; i < 2 + this.wave; i++) {
      const p = this.world.findValidPosition(30, 30, 250, this.player.pos);
      if (p) this.drones.push(new Drone(p.x, p.y, types[i % 3]));
    }
  }
  restart() {
    const p = this.world.findValidPosition(40, 56); if (!p) return;
    this.player = new Player(p); this.drones = []; this.wave = 1; this.waveClear = 0; this.score = 0; this.over = false;
    this.bullets = []; this.hits = []; this.spawnWave(); this.msg = 'WAVE 1'; this.msgTimer = 2;
  }
  movement() {
    let x = 0, y = 0; if (keys.KeyW) y--; if (keys.KeyS) y++; if (keys.KeyA) x--; if (keys.KeyD) x++;
    const l = Math.hypot(x, y); return l ? { x: x / l, y: y / l } : { x: 0, y: 0 };
  }
  update(realDt) {
    this.fps += (1 / Math.max(realDt, 1e-3) - this.fps) * .1;
    if (this.state === 'MENU') return;
    const mv = this.movement(), moving = mv.x !== 0 || mv.y !== 0, gdt = moving ? realDt : 0, p = this.player; // TimeEngine: time runs only while moving
    this.timeScale = moving ? 1 : 0;
    if (this.msgTimer > 0) this.msgTimer -= gdt;
    if (this.over) return;
    p.update(realDt, mv, this.world);
    const dir = { x: mouse.x - W / 2, y: mouse.y - H / 2 }; if (dir.x * dir.x + dir.y * dir.y > 0) p.aim = vnorm(dir);
    for (const d of this.drones) {
      if (d.update(gdt, p, this.world)) this.bullets.push(new Bullet({ x: d.pos.x + d.w / 2, y: d.pos.y + d.h / 2 }, d.aim, 'drone', d.attackDamage)); // FIX: per-type drone damage
    }
    if (p.health <= 0) this.over = true;
    if (this.drones.length && this.drones.every(d => d.dead)) {
      this.waveClear += gdt;
      if (this.waveClear >= 2) { this.wave++; this.waveClear = 0; this.spawnWave(); this.msg = `WAVE ${this.wave}`; this.msgTimer = 2; }
    }
    cam.x = p.pos.x + p.w / 2 - W / 2; cam.y = p.pos.y + p.h / 2 - H / 2;
    if (mouse.down && p.weapon.canFire()) {
      p.weapon.fire(); p.muzzleFlash = .06;
      this.bullets.push(new Bullet({ x: p.pos.x + p.w / 2, y: p.pos.y + p.h / 2 }, p.aim, 'player', 25));
    }
    for (const b of this.bullets) {
      b.update(gdt, this.world); // all bullets obey the time engine, as in the original: they freeze when you stand still
      if (b.dead) continue;
      if (b.owner === 'player') {
        for (const d of this.drones) {
          if (d.dead || !overlap(hitboxE(b), hitboxE(d))) continue;
          d.takeDamage(b.damage); if (d.dead) this.score += { basic: 100, scout: 150, tank: 250 }[d.type] || 0;
          this.hits.push([{ x: b.pos.x, y: b.pos.y }, .12]); b.dead = true; break;
        }
      } else if (!p.dead && overlap(hitboxE(b), hitboxE(p))) { p.takeDamage(b.damage); this.hits.push([{ x: b.pos.x, y: b.pos.y }, .12]); b.dead = true; }
    }
    this.hits.forEach(h => h[1] -= gdt); this.hits = this.hits.filter(h => h[1] > 0); this.bullets = this.bullets.filter(b => !b.dead);
  }
  txt(s, x, y, font, col, align = 'left', base = 'top') { const c = this.c; c.font = font; c.fillStyle = col; c.textAlign = align; c.textBaseline = base; c.fillText(s, x, y); }
  rr(x, y, w, h, r, fill, stroke, lw) { const c = this.c; c.beginPath(); c.roundRect(x, y, w, h, r); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); } }
  drawMenu() {
    const c = this.c; c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    this.txt('ZEROTH SECOND', W / 2, 170, `bold 76px ${MONO}`, 'rgb(235,245,255)', 'center', 'middle');
    this.txt('TIME IS YOUR WEAPON', W / 2, 235, `bold 24px ${MONO}`, 'rgb(100,180,220)', 'center', 'middle');
    c.strokeStyle = 'rgb(70,120,150)'; c.lineWidth = 2; c.beginPath(); c.moveTo(W / 2 - 220, 275); c.lineTo(W / 2 + 220, 275); c.stroke();
    [[this.pb, 'PLAY'], [this.qb, 'QUIT']].forEach(([r, l]) => {
      const hv = hit(mouse, r); this.rr(r.x, r.y, r.w, r.h, 10, hv ? 'rgb(28,38,48)' : 'rgb(15,20,27)');
      this.rr(r.x + 1, r.y + 1, r.w - 2, r.h - 2, 9, 0, hv ? 'rgb(150,220,245)' : 'rgb(80,150,185)', 2);
      this.txt(l, r.x + r.w / 2, r.y + r.h / 2, `bold 38px ${MONO}`, '#fff', 'center', 'middle');
    });
    this.txt('ENTER / SPACE  PLAY     ESC  QUIT', W / 2, H - 45, `16px ${MONO}`, 'rgb(100,110,120)', 'center', 'middle');
  }
  drawHUD() {
    const c = this.c, p = this.player, wp = p.weapon; c.save(); c.translate(20, H - 190);
    this.rr(0, 0, 360, 170, 14, 'rgba(15,18,24,.863)'); this.rr(1, 1, 358, 168, 13, 0, 'rgb(100,180,220)', 2);
    c.fillStyle = 'rgb(180,220,240)'; [[8, 8, 30, 3], [8, 8, 3, 30], [322, 159, 30, 3], [349, 132, 3, 30]].forEach(r => c.fillRect(...r));
    this.rr(20, 20, 320, 25, 6, 'rgb(40,45,52)'); const hw = Math.floor(320 * Math.max(0, p.health / p.maxHealth)); if (hw > 0) this.rr(20, 20, hw, 25, 6, 'rgb(50,210,80)');
    const hf = `bold 20px ${MONO}`; this.txt(`HP  ${p.health}/${p.maxHealth}`, 30, 21, hf, '#fff'); this.txt(`SCORE: ${this.score}`, 20, 60, hf, '#fff'); this.txt(`WAVE: ${this.wave}`, 235, 60, hf, '#fff');
    c.strokeStyle = 'rgb(70,80,90)'; c.lineWidth = 2; c.beginPath(); c.moveTo(20, 92); c.lineTo(340, 92); c.stroke();
    c.drawImage(IMG.pistol, 20, 100, 64, 43); this.txt(`${wp.ammo} / ${wp.mag}`, 95, 117, hf, '#fff');
    if (wp.reloading) this.txt('RELOADING...', 205, 117, `bold 18px ${MONO}`, 'rgb(255,210,80)');
    c.restore();
  }
  drawDebug() {
    if (!this.debug) return; const c = this.c, p = this.player;
    const lines = [`FPS : ${this.fps.toFixed(1)}`, `Time Scale : ${(this.timeScale || 0).toFixed(2)}`, `Player : (${p.pos.x.toFixed(1)}, ${p.pos.y.toFixed(1)})`,
      `Camera : (${cam.x.toFixed(1)}, ${cam.y.toFixed(1)})`, `Drones : ${this.drones.length}`, `Wave : ${this.wave}`, `Bullets : ${this.bullets.length}`, `Player HP : ${p.health}`, `Score : ${this.score}`];
    this.drones.forEach((d, i) => lines.push(`Drone ${i + 1}: HP=${d.health} State=${d.state}`));
    lines.forEach((l, i) => this.txt(l, 10, 10 + i * 24, `20px ${MONO}`, 'rgb(0,255,0)'));
    const hb = cam.apply(hitboxE(p)); c.strokeStyle = 'rgb(255,0,0)'; c.lineWidth = 2; c.strokeRect(hb.x + 1, hb.y + 1, hb.w - 2, hb.h - 2);
    c.fillStyle = 'rgb(0,255,255)';
    for (const d of this.drones) for (const [tx, ty] of d.path) { const s = cam.apply({ x: ty * TILE + TILE / 2, y: tx * TILE + TILE / 2, w: 1, h: 1 }); c.beginPath(); c.arc(s.x, s.y, 4, 0, 7); c.fill(); }
  }
  drawCrosshair() {
    const c = this.c, m = mouse; c.strokeStyle = '#fff'; c.lineWidth = 1; c.beginPath(); c.arc(m.x, m.y, 10, 0, 7); c.stroke(); c.lineWidth = 2; c.beginPath();
    c.moveTo(m.x - 16, m.y); c.lineTo(m.x - 5, m.y); c.moveTo(m.x + 5, m.y); c.lineTo(m.x + 16, m.y); c.moveTo(m.x, m.y - 16); c.lineTo(m.x, m.y - 5); c.moveTo(m.x, m.y + 5); c.lineTo(m.x, m.y + 16); c.stroke();
  }
  draw() {
    const c = this.c; if (this.state === 'MENU') { this.drawMenu(); return; }
    c.fillStyle = 'rgb(18,18,18)'; c.fillRect(0, 0, W, H); this.world.draw(c, cam); this.player.draw(c, cam);
    this.drones.forEach(d => d.draw(c, cam)); this.drawDebug(); this.bullets.forEach(b => b.draw(c, cam)); this.drawHUD();
    for (const [pos, t] of this.hits) { const s = cam.apply({ x: pos.x, y: pos.y, w: 1, h: 1 }); c.strokeStyle = 'rgb(255,180,60)'; c.lineWidth = 2; c.beginPath(); c.arc(s.x, s.y, Math.floor(4 + (.12 - t) * 40), 0, 7); c.stroke(); }
    if (this.msgTimer > 0 && !this.over) this.txt(this.msg, W / 2, 100, `bold 56px ${MONO}`, '#fff', 'center', 'middle'); // FIX: banner always shown
    if (this.over) {
      const f = `48px ${MONO}`; this.txt('GAME OVER', W / 2, 250, f, 'rgb(255,80,80)', 'center', 'middle');
      this.txt(`Score: ${this.score}`, W / 2, 310, f, '#fff', 'center', 'middle'); this.txt('Press R to restart', W / 2, 370, f, '#fff', 'center', 'middle');
    }
    this.drawCrosshair(); // FIX: crosshair during play (system cursor hidden)
  }
}
const hit = (p, r) => p.x >= r.x && p.x < r.x + r.w && p.y >= r.y && p.y < r.y + r.h;

(async function main() {
  const canvas = document.getElementById('game'), msg = document.getElementById('loading');
  try {
    await Promise.all([['player', 'player_atlas.png'], ['pistol', 'pistol.png'], ['drone_basic', 'drone_basic.png'], ['drone_scout', 'drone_scout.png'], ['drone_tank', 'drone_tank.png']]
      .map(([k, f]) => new Promise((res, rej) => { const i = new Image(); i.onload = () => { IMG[k] = i; res(); }; i.onerror = () => rej(f); i.src = 'assets/' + f; })));
  } catch (f) { msg.textContent = 'Failed to load asset: ' + f; return; }
  msg.remove(); const g = window.G = new Game(canvas), $ = id => document.getElementById(id);
  $('fs').onclick = e => { e.target.blur(); toggleFullscreen(); };
  $('restart').onclick = e => { e.target.blur(); if (g.state === 'GAME') g.restart(); else g.play(); };
  let last = performance.now();
  (function frame(t) {
    const dt = Math.min((t - last) / 1000, .05); last = t; g.update(dt); g.draw();
    $('score').textContent = g.score; $('wave').textContent = g.wave; $('hp').textContent = g.player.health;
    requestAnimationFrame(frame);
  })(last);
})();
