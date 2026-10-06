// RENDER + INPUT + LOOP (port of the draw_* methods and run() in game/game.py)
const COL = { PINK: '#ffb6cb', LIGHT_PINK: '#ffdde8', CREAM: '#fff7e2', WHITE: '#fff', PEACH: '#ffcdb4', YELLOW: '#ffe8aa',
  LAVENDER: '#e1d2f5', MINT: '#cdeeda', BABY_BLUE: '#cde6f5', DARK_PINK: '#ae5270', BROWN: '#754b3e', SHADOW: '#daaab9' };
const IMG = {};
const SND = {};
['swap', 'pop', 'splash', 'gameover'].forEach(n => SND[n] = new Audio(`assets/${n}.mp3`));
const sound = n => { const a = SND[n].cloneNode(); a.play().catch(() => {}); };
const goFullscreen = () => { const el = document.querySelector('.wrap'); if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(() => {}); };
const toggleFullscreen = () => document.fullscreenElement ? document.exitFullscreen() : goFullscreen();
const FS = n => `bold ${Math.round(n * .72)}px Arial, Helvetica, sans-serif`; // approximates pygame's default font sizes
const TITLE_FONT = '72px "Segoe Script","Segoe Print","Comic Sans MS","Brush Script MT",cursive';

class Game extends Logic {
  constructor(canvas) {
    super(); this.cv = canvas; this.c = canvas.getContext('2d'); this.mouse = { x: -1, y: -1 };
    this.play = sound; this.playBtn = { x: W / 2 - 150, y: H / 2 - 15, w: 300, h: 70 };
    canvas.addEventListener('mousedown', e => {
      const r = canvas.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height;
      if (this.state === 'start') { if (this.inRect(x, y, this.playBtn)) { sound('swap'); this.state = 'game'; this.level = 1; this.setupLevel(); goFullscreen(); } }
      else this.click(x, y);
    });
    addEventListener('keydown', e => { if (e.code === 'KeyF' && !e.repeat) toggleFullscreen(); });
  }
  rr(x, y, w, h, r) { this.c.beginPath(); this.c.roundRect(x, y, w, h, r); }
  fillRR(col, x, y, w, h, r) { this.rr(x, y, w, h, r); this.c.fillStyle = col; this.c.fill(); }
  strokeRR(col, lw, x, y, w, h, r) { this.rr(x + lw / 2, y + lw / 2, w - lw, h - lw, Math.max(0, r - lw / 2)); this.c.strokeStyle = col; this.c.lineWidth = lw; this.c.stroke(); }
  T(s, x, y, font, col, align = 'left') { const c = this.c; c.font = font; c.fillStyle = col; c.textAlign = align; c.textBaseline = 'top'; c.fillText(s, x, y); }
  Tc(s, cx, y, font, col) { this.T(s, cx, y, font, col, 'center'); }
  circ(x, y, r, col, lw) { const c = this.c; c.beginPath(); c.arc(x, y, r, 0, 7); if (lw) { c.strokeStyle = col; c.lineWidth = lw; c.stroke(); } else { c.fillStyle = col; c.fill(); } }
  line(col, lw, x1, y1, x2, y2) { const c = this.c; c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
  bg() { this.c.drawImage(IMG.background, 0, 0, W, H); }

  drawStart() {
    const c = this.c, cx = W / 2, pb = this.playBtn; this.bg();
    c.fillStyle = 'rgba(255,240,245,.588)'; c.fillRect(0, 0, W, H);
    this.Tc('Fruity Match', cx, H / 2 - 155, TITLE_FONT, COL.DARK_PINK);
    this.Tc('MATCH  •  SPLASH  •  WIN', cx, H / 2 - 75, FS(25), COL.BROWN);
    this.fillRR(COL.PINK, pb.x, pb.y, pb.w, pb.h, 35); this.strokeRR(COL.WHITE, 4, pb.x, pb.y, pb.w, pb.h, 35);
    c.font = FS(34); const tw = c.measureText('PLAY').width, tx = cx - tw / 2 - 35, ty = pb.y + pb.h / 2;
    c.fillStyle = COL.WHITE; c.beginPath(); c.moveTo(tx, ty - 17); c.lineTo(tx, ty + 17); c.lineTo(tx + 17, ty); c.fill();
    this.T('PLAY', cx - tw / 2 + 15, ty - 11, FS(34), COL.WHITE);
    const bottom = pb.y + pb.h; this.Tc('LEVEL MAP', cx, bottom + 75, FS(23), COL.BROWN);
    for (let i = 0; i < LEVELS.length; i++) {
      const x = cx - 135 + (i % 5) * 68, y = bottom + 110 + Math.floor(i / 5) * 55;
      if (i + 1 <= this.level) { this.circ(x, y, 19, COL.PINK); this.Tc(String(i + 1), x, y - 8, FS(23), COL.WHITE); }
      else c.drawImage(IMG.lock, x - 17, y - 17, 34, 34);
    }
    this.Tc(`BEST SCORE: ${this.best}`, cx, bottom + 225, FS(28), COL.BROWN);
  }
  drawHeader() {
    const c = this.c; c.fillStyle = COL.SHADOW; c.fillRect(0, 5, W, 105); c.fillStyle = COL.PINK; c.fillRect(0, 0, W, 105);
    const bw = Math.min(330, Math.floor((W - 30 - 20) / 3));
    [['SCORE', this.score, COL.PEACH], ['MOVES', this.moves, COL.MINT], ['BEST', this.best, COL.LAVENDER]].forEach(([l, v, col], i) => {
      const x = 15 + i * (bw + 10);
      this.fillRR(COL.SHADOW, x, 20, bw, 73, 20); this.fillRR(col, x, 16, bw, 73, 20); this.strokeRR(COL.WHITE, 2, x, 16, bw, 73, 20);
      this.Tc(l, x + bw / 2, 16 + 8, FS(23), COL.BROWN); this.Tc(String(v), x + bw / 2, 16 + 31, FS(31), COL.DARK_PINK);
    });
  }
  drawLevelInfo() {
    const d = this.data(), [p, txt] = this.progress(), bw = Math.min(620, W - 80), bx = (W - bw) / 2;
    this.Tc(`LEVEL ${this.level}  •  ${d.objective}`, W / 2, 108, FS(23), COL.BROWN);
    this.fillRR(COL.WHITE, bx, 132, bw, 12, 6); if (p > 0) this.fillRR(COL.PINK, bx, 132, Math.floor(bw * p), 12, 6);
    this.Tc(txt, W / 2, 147, FS(23), COL.BROWN);
    if (d.showcase) this.Tc('SPECIALS: STRIPED  •  WRAPPED  •  COLOR BOMB  •  COMBOS', W / 2, 166, FS(23), COL.DARK_PINK);
  }
  drawSpecial(k) {
    if (!k.special) return; const c = this.c, cx = (k.x + CELL / 2) | 0, cy = (k.y + CELL / 2) | 0, r = Math.max(7, (CELL * .30) | 0), lw = Math.max(4, (CELL / 12) | 0);
    if (k.special === 'striped_h') { this.line(COL.WHITE, lw, (k.x + 8) | 0, cy, (k.x + CELL - 8) | 0, cy); this.line(COL.DARK_PINK, 2, (k.x + 8) | 0, cy + 8, (k.x + CELL - 8) | 0, cy + 8); }
    else if (k.special === 'striped_v') { this.line(COL.WHITE, lw, cx, (k.y + 8) | 0, cx, (k.y + CELL - 8) | 0); this.line(COL.DARK_PINK, 2, cx + 8, (k.y + 8) | 0, cx + 8, (k.y + CELL - 8) | 0); }
    else if (k.special === 'wrapped') { this.circ(cx, cy, r - 1.5, COL.WHITE, 3); this.circ(cx, cy, Math.max(4, r >> 1) - 1.5, COL.YELLOW, 3); }
    else if (k.special === 'color_bomb') { const s = Math.max(25, (CELL * .78) | 0); c.drawImage(IMG.color_bomb, cx - (s >> 1), cy - (s >> 1), s, s); }
  }
  drawBoard() {
    const c = this.c, t = now();
    this.fillRR(COL.SHADOW, BX - 16, BY - 16, BW + 32, BH + 32, 32); this.fillRR(COL.PINK, BX - 13, BY - 13, BW + 26, BH + 26, 30);
    this.fillRR(COL.CREAM, BX - 6, BY - 6, BW + 12, BH + 12, 25); this.strokeRR(COL.WHITE, 3, BX - 6, BY - 6, BW + 12, BH + 12, 25);
    const pc = [COL.LIGHT_PINK, COL.CREAM, COL.LAVENDER, COL.MINT, COL.BABY_BLUE, COL.PEACH];
    for (let r = 0; r < ROWS; r++) for (let q = 0; q < COLS; q++) {
      const x = BX + q * CELL, y = BY + r * CELL;
      this.fillRR(COL.SHADOW, x + 5, y + 6, CELL - 8, CELL - 8, 16); this.fillRR(pc[(r + q) % 6], x + 3, y + 3, CELL - 6, CELL - 6, 16); this.strokeRR(COL.WHITE, 2, x + 3, y + 3, CELL - 6, CELL - 6, 16);
    }
    const fs = Math.max(25, (CELL * .68) | 0);
    for (const k of this.candies) { c.drawImage(IMG[k.type], ((k.x + (CELL - fs) / 2) | 0), ((k.y + (CELL - fs) / 2) | 0), fs, fs); this.drawSpecial(k); }
    const is = Math.max(20, (CELL * .82) | 0); c.globalAlpha = 105 / 255;
    for (const key of this.ice) { const [r, q] = key.split(',').map(Number); c.drawImage(IMG.ice, (BX + q * CELL + (CELL - is) / 2) | 0, (BY + r * CELL + (CELL - is) / 2) | 0, is, is); }
    c.globalAlpha = 1;
    for (const key of this.ice) { const [r, q] = key.split(',').map(Number); this.strokeRR(COL.WHITE, 2, BX + q * CELL + 5, BY + r * CELL + 5, CELL - 10, CELL - 10, 14); }
    if (this.matchAnim) {
      const p = Math.min((t - this.animStart) / this.MATCH_MS, 1);
      for (const k of this.matched) { if (!this.candies.includes(k)) continue; this.strokeRR(COL.WHITE, 4, k.x + 4, k.y + 4, CELL - 8, CELL - 8, 16); this.circ(k.x + CELL / 2, k.y + CELL / 2, (8 + p * 25) | 0, COL.WHITE, 3); }
      const bw = Math.max(3, (5 + 8 * p) | 0), al = Math.max(40, 255 - ((p * 180) | 0));
      for (const k of this.matched) {
        if (!this.candies.includes(k)) continue;
        if (k.special === 'striped_h') { const y = (k.y + CELL / 2) | 0; c.fillStyle = `rgba(255,255,255,${al / 255})`; this.rr(BX - 10, y - (bw >> 1), BW + 20, bw, bw); c.fill(); this.line(`rgba(255,182,203,${Math.min(255, al + 20) / 255})`, Math.max(2, bw >> 1), BX - 10, y, BX + BW + 10, y); }
        else if (k.special === 'striped_v') { const x = (k.x + CELL / 2) | 0; c.fillStyle = `rgba(255,255,255,${al / 255})`; this.rr(x - (bw >> 1), BY - 10, bw, BH + 20, bw); c.fill(); this.line(`rgba(255,182,203,${Math.min(255, al + 20) / 255})`, Math.max(2, bw >> 1), x, BY - 10, x, BY + BH + 10); }
      }
    }
    if (this.selected) this.strokeRR(COL.DARK_PINK, 4, this.selected.x + 2, this.selected.y + 2, CELL - 4, CELL - 4, 18);
  }
  drawHint() {
    if (!this.hint) return; const pulse = 3 + ((3 * Math.abs((now() % 600) - 300) / 300) | 0);
    for (const k of this.hint) this.strokeRR(COL.WHITE, 4 + pulse, (k.x | 0) + 3, (k.y | 0) + 3, CELL - 6, CELL - 6, 12);
  }
  drawPopup() {
    if (this.popup <= 0) return; const el = now() - this.popupStart; if (el > 1000) return;
    this.c.globalAlpha = Math.max(0, 1 - el / 1000); this.Tc(`+${this.popup}`, W / 2, BY - 30 - ((el / 20) | 0), FS(28), COL.DARK_PINK); this.c.globalAlpha = 1;
  }
  drawShuffle() {
    if (now() >= this.shuffleUntil) return; const b = { x: W / 2 - 150, y: H / 2 - 35, w: 300, h: 70 };
    this.fillRR(COL.PINK, b.x, b.y, b.w, b.h, 25); this.strokeRR(COL.WHITE, 3, b.x, b.y, b.w, b.h, 25); this.Tc('SHUFFLE!', W / 2, H / 2 - 11, FS(34), COL.WHITE);
  }
  drawOverlay() {
    if (!(this.gameOver || this.levelComplete)) return; const c = this.c, cx = W / 2, py = H / 2 - 220;
    c.fillStyle = 'rgba(255,240,245,.706)'; c.fillRect(0, 0, W, H);
    this.fillRR(COL.CREAM, cx - 250, py, 500, 440, 35); this.strokeRR(COL.PINK, 5, cx - 250, py, 500, 440, 35);
    if (this.levelComplete) {
      this.Tc('LEVEL COMPLETE!', cx, py + 35, FS(48), COL.DARK_PINK);
      this.Tc(`LEVEL ${this.level}  •  SCORE ${this.levelScore}`, cx, py + 105, FS(28), COL.BROWN);
      for (let i = 0; i < 3; i++) { const x = cx - 87 + i * 87, y = py + 180; if (i < this.stars) c.drawImage(IMG.star, x - 29, y - 29, 58, 58); else this.circ(x, y, 20, COL.SHADOW, 4); }
      const b = this.completeBtn(); this.fillRR(COL.PINK, b.x, b.y, b.w, b.h, 28); this.strokeRR(COL.WHITE, 3, b.x, b.y, b.w, b.h, 28);
      this.Tc(this.level >= LEVELS.length ? 'FINISH' : 'NEXT LEVEL', cx, b.y + b.h / 2 - 11, FS(34), COL.WHITE);
    } else {
      this.Tc('LEVEL FAILED', cx, py + 55, FS(48), COL.DARK_PINK); this.Tc(`SCORE: ${this.levelScore}`, cx, py + 135, FS(28), COL.BROWN);
      this.Tc(this.data().objective, cx, py + 180, FS(23), COL.BROWN);
      const b = this.failBtn(); this.fillRR(COL.PINK, b.x, b.y, b.w, b.h, 28); this.Tc('TRY AGAIN', cx, b.y + b.h / 2 - 11, FS(34), COL.WHITE);
    }
  }
  draw() {
    if (this.state === 'start') { this.drawStart(); return; }
    this.bg(); this.drawHeader(); this.drawLevelInfo(); this.drawBoard(); this.drawHint(); this.drawPopup(); this.drawShuffle(); this.drawOverlay();
  }
}

(async function main() {
  const canvas = document.getElementById('game'), msg = document.getElementById('loading');
  const names = [...TYPES, 'ice', 'star', 'lock', 'color_bomb'];
  try {
    await Promise.all([...names.map(n => [n, n + '.png']), ['background', 'background.jpg']].map(([k, f]) => new Promise((res, rej) => {
      const i = new Image(); i.onload = () => { IMG[k] = i; res(); }; i.onerror = () => rej(f); i.src = 'assets/' + f;
    })));
  } catch (f) { msg.textContent = 'Failed to load asset: ' + f; return; }
  msg.remove();
  const g = window.G = new Game(canvas), $ = id => document.getElementById(id);
  $('fs').onclick = e => { e.target.blur(); toggleFullscreen(); };
  $('restart').onclick = e => { e.target.blur(); if (g.state === 'game') g.restart(); };
  (function frame() {
    if (g.state === 'game') { g.updateAnim(); g.updateHint(); }
    g.draw(); $('score').textContent = g.score; $('moves').textContent = g.moves; $('level').textContent = g.level;
    requestAnimationFrame(frame);
  })();
})();
