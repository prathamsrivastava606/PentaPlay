// SCENERY: roadside objects, curbs, sidewalks (port of scenery.py)
class SceneryManager {
  constructor(width, height, road_x, road_right) {
    this.width = width; this.height = height; this.road_x = road_x; this.road_right = road_right; this.items = []; this.spawn_timer = 0; this.tufts = [];
    for (let i = 0; i < 50; i++) {
      const left = Math.random() < .5, tx = left ? rnd(10, Math.max(20, road_x - 50)) : rnd(road_right + 50, width - 20);
      this.tufts.push({ x: tx, y: rnd(0, height), kind: choice(['flower_yellow', 'flower_white', 'grass_patch']) });
    }
  }
  spawn_item(speed) {
    const left = Math.random() < .5, w = [32, 18, 12, 14, 10, 10, 14], kinds = ['tree', 'building', 'bench', 'person_walking', 'person_standing', 'lamp', 'flower_bed'];
    let r = Math.random() * 110, type = kinds[0]; for (let i = 0; i < w.length; i++) { if (r < w[i]) { type = kinds[i]; break; } r -= w[i]; }
    let x_min, x_max, sidewalk_x;
    if (left) { x_min = 25; x_max = Math.max(35, this.road_x - 75); sidewalk_x = this.road_x - 38; }
    else { x_min = this.road_right + 35; x_max = Math.max(this.road_right + 45, this.width - 85); sidewalk_x = this.road_right + 12; }
    const x = rnd(x_min, x_max), y = -140, I = this.items;
    if (type === 'tree') I.push({ type: 'tree', x, y, speed, radius: rnd(22, 32), variant: choice(['oak', 'pine']) });
    else if (type === 'building') I.push({ type: 'building', x, y, w: rnd(70, 110), h: rnd(110, 160), color: choice([[75, 80, 92], [62, 68, 78], [88, 92, 102], [72, 70, 84], [80, 68, 65]]), speed });
    else if (type === 'bench') I.push({ type: 'bench', x: sidewalk_x, y, has_person: Math.random() < .5, shirt_color: choice([[210, 70, 60], [45, 120, 210], [225, 175, 45], [200, 200, 200]]), speed });
    else if (type === 'person_walking' || type === 'person_standing') I.push({ type: 'person', sub: type === 'person_walking' ? 'walking' : 'standing', x: sidewalk_x + rnd(-4, 4), y, shirt: choice([[225, 75, 75], [50, 150, 220], [235, 195, 55], [145, 80, 190], [45, 180, 120]]), speed });
    else if (type === 'flower_bed') I.push({ type: 'flower_bed', x, y, speed });
    else if (type === 'lamp') I.push({ type: 'lamp', x: left ? this.road_x - 18 : this.road_right + 12, y, side: left ? 'left' : 'right', speed });
  }
  update(dt, road_speed) {
    this.spawn_timer += dt; if (this.spawn_timer >= 75) { this.spawn_item(road_speed); this.spawn_timer = 0; }
    for (const t of this.tufts) { t.y += road_speed; if (t.y > this.height) t.y = -10; }
    for (const i of this.items) i.y += road_speed;
    this.items = this.items.filter(i => i.y < this.height + 170);
  }
  draw(c, mode = 'day') {
    const rgb = a => `rgb(${a[0]},${a[1]},${a[2]})`, night = mode === 'night', ch = 30;
    for (let yp = -ch; yp < this.height + ch; yp += ch) {
      const idx = ((Math.floor(yp / ch) % 2) + 2) % 2; let col = idx === 0 ? 'rgb(210,45,45)' : 'rgb(235,235,240)';
      if (night) col = idx === 0 ? 'rgb(120,25,25)' : 'rgb(110,110,120)';
      D.rect(c, col, this.road_x - 10, yp, 10, ch); D.rect(c, col, this.road_right, yp, 10, ch);
    }
    const wc = night ? 'rgb(50,52,58)' : 'rgb(150,152,158)', wb = night ? 'rgb(40,42,46)' : 'rgb(120,122,128)';
    D.rect(c, wc, this.road_x - 42, 0, 32, this.height); D.line(c, wb, this.road_x - 42, 0, this.road_x - 42, this.height, 2);
    D.rect(c, wc, this.road_right + 10, 0, 32, this.height); D.line(c, wb, this.road_right + 42, 0, this.road_right + 42, this.height, 2);
    for (const t of this.tufts) {
      if (t.kind === 'flower_yellow') D.circle(c, night ? 'rgb(120,105,30)' : 'rgb(245,215,65)', t.x, t.y, 3);
      else if (t.kind === 'flower_white') D.circle(c, night ? 'rgb(90,90,100)' : 'rgb(240,240,245)', t.x, t.y, 2);
      else { const g = night ? 'rgb(22,52,35)' : 'rgb(60,155,75)'; D.line(c, g, t.x, t.y, t.x - 2, t.y - 5, 2); D.line(c, g, t.x + 2, t.y, t.x + 3, t.y - 6, 2); }
    }
    for (const it of this.items) {
      if (it.type === 'building') {
        const bc = night ? rgb(it.color.map(v => Math.floor(v / 2))) : rgb(it.color);
        D.rrect(c, 'rgb(20,22,25)', it.x + 4, it.y + 4, it.w, it.h, 4); D.rrect(c, bc, it.x, it.y, it.w, it.h, 4); D.rrect(c, 'rgb(30,32,38)', it.x, it.y, it.w, it.h, 4, 2);
        const wcol = night ? 'rgb(255,235,130)' : 'rgb(210,230,245)';
        for (let r = it.x + 12; r < it.x + it.w - 14; r += 18) for (let q = T(it.y) + 14; q < T(it.y) + it.h - 16; q += 22) D.rrect(c, wcol, r, q, 9, 12, 1);
      } else if (it.type === 'flower_bed') {
        D.ellipse(c, night ? 'rgb(45,30,20)' : 'rgb(95,60,35)', it.x, it.y, 34, 18);
        (night ? ['rgb(110,40,40)', 'rgb(105,90,30)', 'rgb(115,60,90)'] : ['rgb(240,90,90)', 'rgb(245,215,65)', 'rgb(255,140,200)']).forEach((col, i) => D.circle(c, col, it.x + 8 + i * 9, T(it.y) + 9, 3));
      } else if (it.type === 'tree') {
        const trunk = night ? 'rgb(40,25,14)' : 'rgb(90,52,24)', cl = night ? 'rgb(16,68,24)' : 'rgb(42,155,52)', cd = night ? 'rgb(10,46,16)' : 'rgb(30,115,38)';
        D.ellipse(c, 'rgb(25,30,25)', it.x - it.radius + 2, it.y + 26, it.radius * 2, 10); D.rrect(c, trunk, it.x - 5, it.y, 10, 32, 2);
        D.circle(c, cd, it.x, T(it.y) - 8, it.radius + 2); D.circle(c, cl, it.x - 4, T(it.y) - 12, it.radius - 1);
      } else if (it.type === 'bench') {
        D.rrect(c, night ? 'rgb(70,36,14)' : 'rgb(140,72,24)', it.x, it.y, 24, 12, 2); D.rrect(c, 'rgb(45,45,45)', it.x, it.y, 24, 12, 2, 1);
        if (it.has_person) { D.circle(c, night ? 'rgb(145,115,90)' : 'rgb(245,200,160)', it.x + 12, T(it.y) - 2, 4); D.rrect(c, rgb(it.shirt_color), it.x + 8, it.y + 2, 8, 8, 2); }
      } else if (it.type === 'person') {
        const skin = night ? 'rgb(145,115,90)' : 'rgb(245,200,160)', pants = night ? 'rgb(22,26,36)' : 'rgb(45,55,75)', px = T(it.x), py = T(it.y);
        D.circle(c, skin, px, py, 4); D.rrect(c, rgb(it.shirt), px - 4, py + 4, 8, 10, 2);
        if (it.sub === 'walking') { D.line(c, pants, px - 2, py + 14, px - 4, py + 22, 2); D.line(c, pants, px + 2, py + 14, px + 4, py + 20, 2); }
        else { D.line(c, pants, px - 2, py + 14, px - 2, py + 22, 2); D.line(c, pants, px + 2, py + 14, px + 2, py + 22, 2); }
      } else if (it.type === 'lamp') {
        const pole = night ? 'rgb(65,70,75)' : 'rgb(175,180,190)'; D.rect(c, pole, it.x, it.y, 4, 46);
        const hx = it.x + (it.side === 'left' ? 7 : -7); D.line(c, pole, it.x + 2, it.y, hx, it.y, 4); D.circle(c, 'rgb(255,230,100)', hx, it.y + 2, 4);
        if (night) { c.fillStyle = 'rgba(255,235,140,.176)'; c.beginPath(); c.arc(T(hx), T(it.y) - 15 + 40, 40, 0, 7); c.fill(); }
      }
    }
  }
}
