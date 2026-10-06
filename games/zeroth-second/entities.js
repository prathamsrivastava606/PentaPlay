// ENTITIES: weapon, bullet, player, drone (ports of src/weapons/*, src/entities/*)
const vlen = v => Math.hypot(v.x, v.y);
const vnorm = v => { const l = vlen(v); return l > 0 ? { x: v.x / l, y: v.y / l } : { x: 0, y: 0 }; };
const rectOf = (x, y, w, h) => ({ x: Math.trunc(x), y: Math.trunc(y), w, h });
const rectE = e => rectOf(e.pos.x, e.pos.y, e.w, e.h);
const hitboxE = e => rectOf(e.pos.x + 6, e.pos.y + 6, e.w - 12, e.h - 12); // bullets end up with negative size, as in pygame
const centerOf = r => ({ x: r.x + Math.trunc(r.w / 2), y: r.y + Math.trunc(r.h / 2) });
const overlap = (a, b) => {
  if (!a.w || !a.h || !b.w || !b.h) return false;
  return Math.min(a.x, a.x + a.w) < Math.max(b.x, b.x + b.w) && Math.min(a.y, a.y + a.h) < Math.max(b.y, b.y + b.h) &&
         Math.max(a.x, a.x + a.w) > Math.min(b.x, b.x + b.w) && Math.max(a.y, a.y + a.h) > Math.min(b.y, b.y + b.h);
};

class Weapon { // Pistol: fire_rate 0.25, 12 rounds, 1.2 s reload
  constructor() { this.fireRate = .25; this.cooldown = 0; this.mag = 12; this.ammo = 12; this.reloadTime = 1.2; this.reloadTimer = 0; this.reloading = false; }
  update(dt) {
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.reloading) { this.reloadTimer -= dt; if (this.reloadTimer <= 0) { this.ammo = this.mag; this.reloading = false; } }
  }
  canFire() { return this.cooldown <= 0 && this.ammo > 0 && !this.reloading; }
  fire() { if (!this.canFire()) return false; this.cooldown = this.fireRate; this.ammo--; if (this.ammo <= 0) this.reload(); return true; }
  reload() { if (this.reloading || this.ammo >= this.mag) return; this.reloading = true; this.reloadTimer = this.reloadTime; }
}

class Bullet {
  constructor(pos, dir, owner, damage) {
    this.pos = { x: pos.x, y: pos.y }; this.w = 8; this.h = 8; const d = vnorm(dir);
    this.vel = { x: d.x * 900, y: d.y * 900 }; this.life = 2; this.damage = damage; this.dead = false; this.owner = owner;
  }
  update(dt, world) {
    this.pos.x += this.vel.x * dt; this.pos.y += this.vel.y * dt; this.life -= dt;
    if (this.life <= 0) this.dead = true;
    if (world.isRectColliding(hitboxE(this))) this.dead = true;
  }
  draw(c, cam) { const r = cam.apply(rectE(this)), cc = centerOf(r); c.fillStyle = 'rgb(255,255,0)'; c.beginPath(); c.arc(cc.x, cc.y, 4, 0, 7); c.fill(); }
}

const DIRS = ['front', 'right', 'back', 'left'], P_ANIMS = ['idle', 'walk', 'shoot', 'hurt'];
class Player {
  constructor(pos) {
    this.pos = { x: pos.x, y: pos.y }; this.w = 40; this.h = 56; this.speed = 300; this.weapon = new Weapon();
    this.health = 100; this.maxHealth = 100; this.dead = false; this.damageFlash = 0; this.muzzleFlash = 0;
    this.aim = { x: 1, y: 0 }; this.facing = 'front'; this.animation = 'idle'; this.frame = 0; this.timer = 0;
    this.counts = { idle: 1, walk: 3, shoot: 3, hurt: 2 };
  }
  takeDamage(n) {
    if (this.dead) return; this.health -= n; this.damageFlash = .12; this.animation = 'hurt'; this.frame = 0; this.timer = 0;
    if (this.health <= 0) { this.health = 0; this.dead = true; }
  }
  update(dt, mv, world) {
    if (this.damageFlash > 0) this.damageFlash = Math.max(0, this.damageFlash - dt);
    if (this.dead) return;
    const nx = this.pos.x + mv.x * this.speed * dt;
    if (!world.isRectColliding({ x: Math.round(nx), y: Math.round(this.pos.y), w: this.w, h: this.h })) this.pos.x = nx;
    const ny = this.pos.y + mv.y * this.speed * dt;
    if (!world.isRectColliding({ x: Math.round(this.pos.x), y: Math.round(ny), w: this.w, h: this.h })) this.pos.y = ny;
    if (this.muzzleFlash > 0) this.muzzleFlash = Math.max(0, this.muzzleFlash - dt);
    this.weapon.update(dt); this.animate(dt, mv);
  }
  animate(dt, mv) {
    const a = this.aim;
    this.facing = Math.abs(a.x) > Math.abs(a.y) ? (a.x > 0 ? 'right' : 'left') : (a.y > 0 ? 'front' : 'back');
    const want = this.damageFlash > 0 ? 'hurt' : this.muzzleFlash > 0 ? 'shoot' : (mv.x || mv.y) ? 'walk' : 'idle';
    if (want !== this.animation) { this.animation = want; this.frame = 0; this.timer = 0; }
    if (want === 'idle') { this.frame = 0; this.timer = 0; return; }
    const ft = want === 'walk' ? .12 : want === 'shoot' ? .02 : .06, n = this.counts[want];
    this.timer += dt;
    while (this.timer >= ft) { this.timer -= ft; this.frame++; this.frame = want === 'hurt' ? Math.min(this.frame, n - 1) : this.frame % n; }
  }
  draw(c, cam) {
    const r = cam.apply(rectE(this)), n = this.counts[this.animation], f = Math.min(this.frame, n - 1);
    const row = P_ANIMS.indexOf(this.animation) * 4 + DIRS.indexOf(this.facing);
    c.drawImage(IMG.player, f * 80, row * 112, 80, 112, r.x + (r.w >> 1) - 20, r.y + r.h - 56, 40, 56); // feet-anchored
    if (this.muzzleFlash > 0) {
      const sx = r.x + (r.w >> 1), sy = r.y + r.h - 28; c.fillStyle = 'rgb(255,220,80)'; c.beginPath();
      c.arc(sx + this.aim.x * 25, sy + this.aim.y * 25, 7, 0, 7); c.fill();
    }
  }
}

const D_TYPES = {
  basic: { speed: 120, health: 100, chase: 150, delay: .35, dmg: 10, pref: 170 },
  scout: { speed: 180, health: 60, chase: 220, delay: .25, dmg: 8, pref: 120 },
  tank: { speed: 70, health: 200, chase: 90, delay: .7, dmg: 20, pref: 200 },
};
const D_FRAMES = { idle: 5, move: 5, shoot: 5, hit: 3, death: 6 }, D_SPEEDS = { idle: .14, move: .10, shoot: .055, hit: .06, death: .12 };
const D_ROWS = ['idle', 'move', 'shoot', 'hit', 'death'];
class Drone {
  constructor(x, y, type = 'basic') {
    const t = D_TYPES[type] || D_TYPES.basic; this.type = type; this.pos = { x, y }; this.w = 30; this.h = 30;
    this.speed = t.speed; this.health = t.health; this.chaseSpeed = t.chase; this.attackDelay = t.delay; this.attackDamage = t.dmg; this.pref = t.pref;
    this.direction = 1; this.dead = false; this.deathTimer = 0; this.state = 'PATROL'; this.detection = 400; this.attackRange = 210;
    this.searchTimer = 0; this.searchDuration = 3; this.path = []; this.pathIndex = 0; this.pathTimer = 0; this.vel = { x: 0, y: 0 };
    this.attackCooldown = 0; this.damageFlash = 0; this.strafeDir = 1; this.strafeSpeed = 45; this.strafeTimer = 0; this.strafeChange = 1.5;
    this.aim = { x: 1, y: 0 }; this.facing = 'front'; this.animation = 'idle'; this.frame = 0; this.timer = 0;
    this.shootTimer = 0; this.hitTimer = 0; this.deathDur = .9;
  }
  takeDamage(n) {
    if (this.dead) return; this.health -= n; this.damageFlash = .12; this.hitTimer = .18; this.animation = 'hit'; this.frame = 0; this.timer = 0;
    if (this.health <= 0) { this.health = 0; this.dead = true; this.deathTimer = this.deathDur; this.animation = 'death'; this.frame = 0; this.timer = 0; }
  }
  tryMove(dx, dy, world, bounce) {
    const nx = this.pos.x + dx;
    if (!world.isRectColliding(rectOf(nx, this.pos.y, this.w, this.h))) this.pos.x = nx; else if (bounce) this.vel.x = 0;
    const ny = this.pos.y + dy;
    if (!world.isRectColliding(rectOf(this.pos.x, ny, this.w, this.h))) this.pos.y = ny; else if (bounce) this.vel.y = 0;
  }
  update(dt, player, world) {
    const dec = k => this[k] = Math.max(0, this[k] - dt); ['damageFlash', 'shootTimer', 'hitTimer'].forEach(dec);
    if (this.dead) { dec('deathTimer'); this.animate(dt); return false; }
    const dc = centerOf(rectE(this)), pc = centerOf(rectE(player)), dist = Math.hypot(dc.x - pc.x, dc.y - pc.y);
    const los = () => world.hasLineOfSight(this.pos, player.pos), reset = () => { this.path = []; this.pathIndex = 0; this.pathTimer = 0; };
    let atk = false;
    if (this.state === 'PATROL') { if (dist <= this.detection && los()) this.state = 'CHASE'; }
    else if (this.state === 'CHASE') {
      if (dist <= this.attackRange) { this.state = 'ATTACK'; this.attackCooldown = 0; }
      else if (dist > this.detection) { this.state = 'SEARCH'; this.searchTimer = this.searchDuration; }
    } else if (this.state === 'ATTACK') {
      if (dist > this.detection) { this.state = 'SEARCH'; this.searchTimer = this.searchDuration; }
      else if (dist > this.attackRange) this.state = 'CHASE';
      else if (!los()) { this.state = 'CHASE'; reset(); }
    } else if (this.state === 'SEARCH') {
      this.searchTimer -= dt;
      if (dist <= this.detection && los()) { this.state = 'CHASE'; reset(); }
      else if (this.searchTimer <= 0) { this.state = 'PATROL'; this.path = []; this.pathIndex = 0; this.vel = { x: 0, y: 0 }; }
    }
    if (this.state === 'PATROL') this.patrol(dt, world, 1);
    else if (this.state === 'CHASE') this.chase(dt, player, world);
    else if (this.state === 'ATTACK') atk = this.attack(dt, player, world);
    else if (this.state === 'SEARCH') this.patrol(dt, world, .5);
    this.animate(dt); return atk;
  }
  patrol(dt, world, k) { // PATROL (k=1) and SEARCH (k=.5)
    this.vel = { x: this.direction * this.speed * k, y: 0 };
    const nx = this.pos.x + this.direction * this.speed * k * dt;
    if (!world.isRectColliding(rectOf(nx, this.pos.y, this.w, this.h))) this.pos.x = nx; else this.direction *= -1;
  }
  chase(dt, player, world) {
    this.pathTimer -= dt;
    if (this.pathTimer <= 0) {
      const np = world.findPath(this.pos, player.pos);
      if (np.length) {
        this.path = np; let ci = 0, cd = Infinity;
        np.forEach(([tx, ty], i) => { // coordinates intentionally swapped, exactly as in the original code
          const x = ty * TILE + TILE / 2 - this.w / 2, y = tx * TILE + TILE / 2 - this.h / 2, d = (this.pos.x - x) ** 2 + (this.pos.y - y) ** 2;
          if (d < cd) { cd = d; ci = i; }
        });
        this.pathIndex = ci;
      }
      this.pathTimer = .5;
    }
    if (!this.path.length) return;
    if (this.pathIndex >= this.path.length) { this.path = []; return; }
    const [tx, ty] = this.path[this.pathIndex], tgt = { x: tx * TILE + TILE / 2 - this.w / 2, y: ty * TILE + TILE / 2 - this.h / 2 };
    let des = { x: tgt.x - this.pos.x, y: tgt.y - this.pos.y };
    if (des.x * des.x + des.y * des.y < 100) { this.pathIndex++; return; }
    des = vnorm(des); des = { x: des.x * this.chaseSpeed, y: des.y * this.chaseSpeed };
    let st = { x: des.x - this.vel.x, y: des.y - this.vel.y }; const sl = vlen(st);
    if (sl > 900) st = { x: st.x / sl * 900, y: st.y / sl * 900 };
    this.vel.x += st.x * dt; this.vel.y += st.y * dt;
    const vl = vlen(this.vel); if (vl > this.chaseSpeed) { this.vel.x = this.vel.x / vl * this.chaseSpeed; this.vel.y = this.vel.y / vl * this.chaseSpeed; }
    this.tryMove(this.vel.x * dt, this.vel.y * dt, world, true);
  }
  attack(dt, player, world) {
    const dc = centerOf(rectE(this)), pc = centerOf(rectE(player));
    let dir = { x: pc.x - dc.x, y: pc.y - dc.y }; if (dir.x * dir.x + dir.y * dir.y > 0) { dir = vnorm(dir); this.aim = dir; }
    const dist = Math.hypot(pc.x - dc.x, pc.y - dc.y); let mv;
    if (dist < this.pref - 30) mv = { x: -dir.x * this.chaseSpeed * dt, y: -dir.y * this.chaseSpeed * dt };
    else if (dist > this.pref + 30) mv = { x: dir.x * this.chaseSpeed * dt, y: dir.y * this.chaseSpeed * dt };
    else if (this.type === 'tank') mv = { x: 0, y: 0 };
    else {
      this.strafeTimer -= dt; if (this.strafeTimer <= 0) { this.strafeTimer = this.strafeChange; this.strafeDir *= -1; }
      const k = this.strafeDir * this.strafeSpeed * dt; mv = { x: -dir.y * k, y: dir.x * k };
    }
    this.tryMove(mv.x, mv.y, world, false);
    if (!world.hasLineOfSight(this.pos, player.pos)) return false;
    this.attackCooldown -= dt;
    if (this.attackCooldown <= 0) { this.attackCooldown = this.attackDelay; this.shootTimer = .25; return true; }
    return false;
  }
  animate(dt) {
    const want = this.dead ? 'death' : this.hitTimer > 0 ? 'hit' : this.shootTimer > 0 ? 'shoot' : (this.vel.x ** 2 + this.vel.y ** 2) > 4 ? 'move' : 'idle';
    if (want !== this.animation) { this.animation = want; this.frame = 0; this.timer = 0; }
    const n = D_FRAMES[this.animation];
    if (this.animation === 'death') { const el = this.deathDur - this.deathTimer; this.frame = Math.min(Math.floor(Math.max(0, el) / (this.deathDur / n)), n - 1); return; }
    this.timer += dt; const sp = D_SPEEDS[this.animation];
    while (this.timer >= sp) { this.timer -= sp; this.frame++; this.frame = this.animation === 'hit' ? Math.min(this.frame, n - 1) : this.frame % n; }
  }
  draw(c, cam) {
    const r = cam.apply(rectE(this)), cc = centerOf(r), row = DIRS.indexOf(this.facing) * 5 + D_ROWS.indexOf(this.animation);
    c.drawImage(IMG['drone_' + this.type], Math.min(this.frame, D_FRAMES[this.animation] - 1) * 64, row * 72, 64, 72, cc.x - 24, cc.y - 30, 48, 60);
  }
}
