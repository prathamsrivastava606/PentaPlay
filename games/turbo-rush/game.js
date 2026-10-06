// GAME: audio, state, main loop, HUD (port of main.py + sound.py). One update() = one iteration of the Python loop at 60 FPS.
const VOL = { engine: 1, coin: .85, booster: .95, nitro: .85, crash: .9, near: .85, over: 1 };
const FILES = { engine: 'car-engine-roaring', coin: 'coin-pickup', booster: 'retro_gaming', nitro: 'winds-swoosh', crash: 'car-crash', near: 'fast-swoosh', over: 'game-over' };
const SND = {}; for (const k in FILES) { SND[k] = new Audio(`assets/${FILES[k]}.mp3`); SND[k].preload = 'auto'; }
const snd = k => { const a = SND[k].cloneNode(); a.volume = VOL[k]; a.play().catch(() => {}); };
const nitroChan = SND.nitro; nitroChan.volume = VOL.nitro; // single "channel": only restarts when finished (like Channel(2))
const goFullscreen = () => { const el = document.querySelector('.wrap'); if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(() => {}); };
const toggleFullscreen = () => document.fullscreenElement ? document.exitFullscreen() : goFullscreen();

const DT = 1000 / 60, WHITE = 'rgb(255,255,255)', YELLOW = 'rgb(255,210,30)', ORANGE = 'rgb(255,130,20)', RED = 'rgb(220,30,30)', BLACK = 'rgb(15,15,15)';
let ctx, high_score = 0;
try { high_score = parseInt(localStorage.getItem('turborush_high')) || 0; } catch (e) {}
const saveHigh = v => { try { localStorage.setItem('turborush_high', v); } catch (e) {} };

const player = new Player(CENTER_X - 25, HEIGHT - 130, ROAD_X + 5, ROAD_RIGHT - 55);
const scenery = new SceneryManager(WIDTH, HEIGHT, ROAD_X, ROAD_RIGHT);
let selected_mode = 'day', score = 0, coins_collected = 0, lives = 3, level = 1, nitro = 100, enemies = [], coins = [], boosters = [];
let spawn_timer = 0, coin_timer = 0, booster_timer = 0, road_offset = 0, near_miss_message = 0, hit_cooldown = 0, game_started = false, game_over = false, using_nitro = false;
const evq = [];

function reset_game() {
  player.x = CENTER_X - 25; player.y = HEIGHT - 130; score = 0; coins_collected = 0; lives = 3; level = 1; nitro = 100;
  enemies = []; coins = []; boosters = []; booster_timer = 0; player.has_shield = false; player.boost_timer = 0; player.magnet_timer = 0; player.multiplier_timer = 0;
  spawn_timer = 0; coin_timer = 0; road_offset = 0; hit_cooldown = 0; game_started = true; game_over = false; snd('engine');
}
function draw_heart(x, y, size = 18, col = RED) {
  const r = Math.floor(size / 4); D.circle(ctx, col, x + r, y + r, r); D.circle(ctx, col, x + 3 * r, y + r, r); D.poly(ctx, col, [[x, y + r], [x + 4 * r, y + r], [x + 2 * r, y + size]]);
}

function update() {
  for (const [type, k] of evq.splice(0)) {
    if (k === 'Escape') { if (document.fullscreenElement) document.exitFullscreen(); else location.href = '../../index.html'; return; }
    if (!game_started) { if (k === 'KeyD') selected_mode = 'day'; else if (k === 'KeyN') selected_mode = 'night'; }
    if (k === 'Enter' && !game_started) reset_game();
    if (k === 'KeyR' && game_over) reset_game();
  }
  if (!game_started || game_over) return;
  level = Math.min(10, 1 + Math.floor(score / 100));
  let enemy_speed = 5 + level * 0.7, road_speed = 7 + level * 0.5;
  player.move();
  using_nitro = false;
  if (keys.Space && nitro > 0) {
    using_nitro = true; nitro -= 0.8; road_speed += 6; enemy_speed += 6;
    if (nitroChan.paused || nitroChan.ended) { nitroChan.currentTime = 0; nitroChan.play().catch(() => {}); }
  } else if (nitro < 100) nitro += 0.12;
  road_offset += road_speed; if (road_offset >= 80) road_offset = 0;
  scenery.update(DT, road_speed);
  spawn_timer += DT;
  if (spawn_timer >= Math.max(400, 900 - level * 45)) { enemies.push(new Enemy(enemy_speed, LANES)); spawn_timer = 0; }
  for (const e of enemies) { e.speed = enemy_speed; e.move(); }
  for (const e of enemies.slice()) if (e.y > HEIGHT) { enemies.splice(enemies.indexOf(e), 1); score += 10; }
  coin_timer += DT; if (coin_timer >= 1200) { coins.push(new Coin(road_speed, LANES)); coin_timer = 0; }
  for (const c of coins) {
    c.speed = road_speed; c.move();
    if (player.magnet_timer > 0) { if (c.x < player.x) c.x += 8; else if (c.x > player.x) c.x -= 8; if (c.y < player.y) c.y += 6; }
  }
  coins = coins.filter(c => !(c.y > HEIGHT));
  const pr = player.rect();
  for (const c of coins.slice()) {
    if (overlap(pr, c.rect())) {
      snd('coin'); coins.splice(coins.indexOf(c), 1); const m = player.multiplier_timer > 0 ? 2 : 1;
      coins_collected += m; score += 25 * m; nitro += 20; if (nitro > 100) nitro = 100;
    }
  }
  booster_timer += DT; if (booster_timer >= 5000) { boosters.push(new Booster(road_speed, LANES)); booster_timer = 0; }
  for (const b of boosters.slice()) { b.speed = road_speed + (player.boost_timer > 0 ? 5 : 0); b.move(); if (b.y > HEIGHT) boosters.splice(boosters.indexOf(b), 1); }
  for (const b of boosters.slice()) {
    if (overlap(pr, b.rect())) {
      snd('booster');
      if (b.kind === 'shield') player.has_shield = true; else if (b.kind === 'jetpack') player.boost_timer = 240; else if (b.kind === 'magnet') player.magnet_timer = 360;
      else if (b.kind === 'star') score += 150 * (player.multiplier_timer > 0 ? 2 : 1); else if (b.kind === 'double') player.multiplier_timer = 300;
      boosters.splice(boosters.indexOf(b), 1);
    }
  }
  if (hit_cooldown <= 0) {
    for (const e of enemies) {
      if (overlap(pr, e.rect())) {
        snd('crash');
        if (player.has_shield) { player.has_shield = false; hit_cooldown = 600; e.y = HEIGHT + 200; break; }
        lives--; player.x = CENTER_X - 25; hit_cooldown = 1200; e.y = HEIGHT + 200;
        if (lives <= 0) { game_over = true; snd('over'); if (score > high_score) { high_score = score; saveHigh(high_score); } }
        break;
      }
    }
  } else hit_cooldown -= DT;
  for (const e of enemies) {
    if (e.y > player.y + player.height && !e.passed) {
      e.passed = true;
      if (Math.abs(e.x - player.x) < 75) { score += 50; near_miss_message = 1000; snd('near'); }
    }
  }
  if (near_miss_message > 0) near_miss_message -= DT;
}

function draw() {
  const c = ctx, W = WIDTH, H = HEIGHT, cx = W / 2;
  if (!game_started) {
    c.fillStyle = 'rgb(15,40,20)'; c.fillRect(0, 0, W, H);
    D.text(c, 'TURBO RUSH', cx, H / 2 - 120, FS(70), YELLOW, true); D.text(c, 'Ultimate Car Racing Challenge', cx, H / 2 - 40, FS(32), WHITE, true);
    D.text(c, `Mode: [D] Day  [N] Night (Current: ${selected_mode.toUpperCase()})`, cx, H / 2 + 30, FS(32), YELLOW, true);
    D.text(c, 'Press ENTER to Start', cx, H / 2 + 90, FS(32), WHITE, true);
    D.text(c, 'LEFT / RIGHT = Drive     SPACE = Nitro   ESC = Quit', cx, H / 2 + 140, FS(24), WHITE, true);
    return;
  }
  const night = selected_mode === 'night';
  c.fillStyle = night ? 'rgb(16,38,26)' : 'rgb(48,128,62)'; c.fillRect(0, 0, W, H);
  scenery.draw(c, selected_mode);
  D.rect(c, night ? 'rgb(20,22,26)' : 'rgb(45,47,52)', ROAD_X, 0, ROAD_WIDTH, H);
  D.rect(c, WHITE, ROAD_X, 0, 5, H); D.rect(c, WHITE, ROAD_RIGHT - 5, 0, 5, H);
  for (let y = -80; y < H; y += 80) D.rect(c, WHITE, CENTER_X - 5, y + road_offset, 10, 40);
  coins.forEach(k => k.draw(c)); boosters.forEach(b => b.draw(c)); enemies.forEach(e => e.draw(c));
  if (hit_cooldown <= 0 || Math.floor(hit_cooldown / 100) % 2 === 0) player.draw(c, using_nitro);
  D.text(c, `Score: ${score}`, 25, 20, FS(32), WHITE); D.text(c, `Coins: ${coins_collected}`, 25, 55, FS(32), YELLOW); D.text(c, 'Lives: ', 25, 90, FS(32), WHITE);
  c.font = FS(32); const lw = c.measureText('Lives: ').width;
  for (let i = 0; i < lives; i++) draw_heart(25 + Math.floor(lw) + i * 24, 93, 18, RED);
  c.font = FS(32); D.text(c, `LEVEL ${level}`, W - 25 - c.measureText(`LEVEL ${level}`).width, 20, FS(32), WHITE);
  let hy = 60; const hx = W - 180;
  if (player.has_shield) { D.text(c, 'SHIELD ACTIVE', hx, hy, FS(24), 'rgb(0,220,255)'); hy += 24; }
  if (player.boost_timer > 0) { D.text(c, `JETPACK: ${Math.floor(player.boost_timer / 60)}s`, hx, hy, FS(24), 'rgb(255,160,0)'); hy += 24; }
  if (player.magnet_timer > 0) { D.text(c, `MAGNET: ${Math.floor(player.magnet_timer / 60)}s`, hx, hy, FS(24), 'rgb(255,80,80)'); hy += 24; }
  if (player.multiplier_timer > 0) D.text(c, `2X MULTIPLIER: ${Math.floor(player.multiplier_timer / 60)}s`, hx, hy, FS(24), 'rgb(210,80,255)');
  const nx = W - 265, ny = H - 45; D.rect(c, BLACK, nx, ny, 240, 25); D.rect(c, ORANGE, nx + 5, ny + 5, Math.trunc(nitro * 2.3), 15);
  D.text(c, 'NITRO - SPACE', nx + 50, ny - 25, FS(24), WHITE);
  if (near_miss_message > 0) D.text(c, 'NEAR MISS! +50', cx, 140, FS(32), YELLOW, true);
  if (night) D.text(c, 'NIGHT MODE', 25, 140, FS(24), 'rgb(180,200,255)');
  if (game_over) {
    c.fillStyle = 'rgba(15,15,15,.745)'; c.fillRect(0, 0, W, H);
    D.text(c, 'GAME OVER', cx, H / 2 - 50, FS(70), RED, true); D.text(c, `Final Score: ${score}`, cx, H / 2 + 10, FS(32), WHITE, true); D.text(c, 'Press R to Restart', cx, H / 2 + 60, FS(32), YELLOW, true);
  }
}

addEventListener('keyup', e => keys[e.code] = false);
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
addEventListener('keydown', e => {
  if (['ArrowLeft', 'ArrowRight', 'Space', 'Enter'].includes(e.code)) e.preventDefault(); if (e.repeat) return; keys[e.code] = true;
  if (e.code === 'KeyF') { toggleFullscreen(); return; }
  if (e.code === 'Enter' && !game_started) goFullscreen();
  evq.push(['d', e.code]);
});
(function main() {
  const canvas = document.getElementById('game'); ctx = canvas.getContext('2d'); document.getElementById('loading').remove(); const $ = id => document.getElementById(id);
  $('fs').onclick = e => { e.target.blur(); toggleFullscreen(); };
  $('restart').onclick = e => { e.target.blur(); reset_game(); goFullscreen(); };
  let last = performance.now(), acc = 0;
  (function frame(t) {
    acc += Math.min(t - last, 100); last = t;
    while (acc >= DT) { update(); acc -= DT; }
    draw(); $('score').textContent = score; $('lives').textContent = lives; $('level').textContent = level; requestAnimationFrame(frame);
  })(last);
})();
