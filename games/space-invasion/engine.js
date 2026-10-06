// ENGINE: constants, helpers, assets, audio, input, background (ports settings.py, audio.py, background.py)
const W = 1280, H = 720;
const rnd = (a, b) => a + Math.random() * (b - a);
const rint = (a, b) => Math.floor(rnd(a, b + 1));
const rect = (x, y, w, h) => ({ x: x | 0, y: y | 0, w, h }); // pygame.Rect truncates
const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const F = (s, bold) => `${bold ? 'bold ' : ''}${s}px Arial, Helvetica, sans-serif`;

const IMG = {};
function loadImages(names) {
  return Promise.all(names.map(n => new Promise((res, rej) => {
    const i = new Image(); i.onload = () => { IMG[n] = i; res(); };
    i.onerror = () => rej(n); i.src = 'assets/' + n;
  })));
}
function silhouette(img, w, h, color) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0, w, h);
  g.globalCompositeOperation = 'source-in'; g.fillStyle = color; g.fillRect(0, 0, w, h);
  return c;
}

// AUDIO (music 0.6, sfx 0.6, like audio.py). Music starts on first user input (browser autoplay rule).
const SND = {};
['player_shoot', 'enemy_shoot', 'enemy_destroy', 'player_destroy'].forEach(n => {
  const a = new Audio(`assets/${n}.wav`); a.preload = 'auto'; SND[n] = a;
});
const music = new Audio('assets/background_music.mp3'); music.loop = true; music.volume = 0.6;
let musicOn = false;
const startMusic = () => { if (!musicOn) music.play().then(() => musicOn = true).catch(() => {}); };
const stopMusic = () => { music.pause(); musicOn = false; };
const sfx = n => { const a = SND[n].cloneNode(); a.volume = 0.6; a.play().catch(() => {}); };

// INPUT (held keys for movement)
const keys = {};
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

class SpaceBackground {
  constructor() {
    this.stars = Array.from({ length: 80 }, () => ({
      x: rint(0, W), y: rint(0, H), speed: rnd(0.2, 0.8),
      size: [1, 1, 1, 2][rint(0, 3)], b: rint(100, 220)
    }));
    this.shoot = null; this.timer = rint(180, 420);
  }
  update() {
    for (const s of this.stars) { s.y += s.speed; if (s.y > H) { s.y = 0; s.x = rint(0, W); } }
    if (--this.timer <= 0 && !this.shoot) {
      this.shoot = { x: rint(0, W), y: rint(50, H / 2), speed: 12 }; this.timer = rint(300, 600);
    }
    if (this.shoot) {
      this.shoot.x += this.shoot.speed; this.shoot.y += this.shoot.speed * 0.5;
      if (this.shoot.x > W || this.shoot.y > H) this.shoot = null;
    }
  }
  draw(c) {
    c.drawImage(IMG['background.jpg'], 0, 0, W, H);
    for (const s of this.stars) {
      c.fillStyle = `rgb(${s.b},${s.b},${s.b})`; c.beginPath(); c.arc(s.y * 0 + (s.x | 0), s.y | 0, s.size, 0, 7); c.fill();
    }
    if (this.shoot) {
      const x = this.shoot.x | 0, y = this.shoot.y | 0;
      c.strokeStyle = 'rgb(220,240,255)'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 35, y - 18); c.stroke();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, 3, 0, 7); c.fill();
    }
  }
}
