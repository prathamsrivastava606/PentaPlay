// WORLD: map generation, collision, A* pathfinding, line of sight (port of src/world/world.py)
const W = 1920, H = 1080, TILE = 64;
const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pickOne = a => a[Math.floor(Math.random() * a.length)];

class World {
  constructor() { this.MAP = this.generateMap(); this.obstacles = []; }
  generateMap(width = 28, height = 15) {
    for (;;) {
      const grid = Array.from({ length: height }, () => Array(width).fill('#'));
      for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) grid[y][x] = '.';
      for (let i = 0; i < 12; i++) {
        const ow = rint(2, 6), oh = rint(1, 3), x = rint(2, width - ow - 2), y = rint(2, height - oh - 2);
        if (Math.abs(x - (width >> 1)) < 4 && Math.abs(y - (height >> 1)) < 3) continue;
        for (let oy = 0; oy < oh; oy++) for (let ox = 0; ox < ow; ox++) grid[y + oy][x + ox] = '#';
      }
      if (this.isConnected(grid)) return grid.map(r => r.join(''));
    }
  }
  isConnected(grid) {
    const h = grid.length, w = grid[0].length; let start = null;
    for (let y = 0; y < h && !start; y++) for (let x = 0; x < w; x++) if (grid[y][x] === '.') { start = [x, y]; break; }
    if (!start) return false;
    const seen = new Set([start.join()]), st = [start];
    while (st.length) {
      const [x, y] = st.pop();
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (nx < 0 || nx >= w || ny < 0 || ny >= h || grid[ny][nx] !== '.' || seen.has(nx + ',' + ny)) continue;
        seen.add(nx + ',' + ny); st.push([nx, ny]);
      }
    }
    return seen.size === grid.reduce((s, r) => s + r.filter(c => c === '.').length, 0);
  }
  isWall(row, col) { return row < 0 || row >= this.MAP.length || col < 0 || col >= this.MAP[0].length || this.MAP[row][col] === '#'; }
  // pygame Rect semantics: left=x, right=x+w (w may be negative for tiny bullet hitboxes)
  isRectColliding(r) {
    const left = Math.floor(r.x / TILE), right = Math.floor((r.x + r.w - 1) / TILE), top = Math.floor(r.y / TILE), bottom = Math.floor((r.y + r.h - 1) / TILE);
    for (let row = top; row <= bottom; row++) for (let col = left; col <= right; col++) if (this.isWall(row, col)) return true;
    return false;
  }
  findValidPosition(w, h, minDist = 0, origin = null) {
    const ok = [];
    for (let row = 1; row < this.MAP.length - 1; row++) for (let col = 1; col < this.MAP[0].length - 1; col++) {
      const x = col * TILE + TILE / 2 - w / 2, y = row * TILE + TILE / 2 - h / 2;
      if (this.isRectColliding({ x: Math.trunc(x), y: Math.trunc(y), w, h })) continue;
      if (origin && Math.hypot(x - origin.x, y - origin.y) < minDist) continue;
      ok.push({ x, y });
    }
    return ok.length ? pickOne(ok) : null;
  }
  findPath(start, goal) {
    const sx = Math.floor(start.x / TILE), sy = Math.floor(start.y / TILE), gx = Math.floor(goal.x / TILE), gy = Math.floor(goal.y / TILE);
    if (this.isWall(sy, sx) || this.isWall(gy, gx) || (sx === gx && sy === gy)) return [];
    const open = [[0, sx, sy]], came = {}, cost = { [sx + ',' + sy]: 0 };
    while (open.length) {
      let bi = 0; for (let i = 1; i < open.length; i++) { const a = open[i], b = open[bi]; if (a[0] < b[0] || (a[0] === b[0] && (a[1] < b[1] || (a[1] === b[1] && a[2] < b[2])))) bi = i; }
      const [, cx, cy] = open.splice(bi, 1)[0]; if (cx === gx && cy === gy) break;
      for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]) {
        if (this.isWall(ny, nx)) continue;
        const k = nx + ',' + ny, nc = cost[cx + ',' + cy] + 1;
        if (!(k in cost) || nc < cost[k]) { cost[k] = nc; open.push([nc + Math.abs(nx - gx) + Math.abs(ny - gy), nx, ny]); came[k] = [cx, cy]; }
      }
    }
    if (!((gx + ',' + gy) in came)) return [];
    const path = []; let cur = [gx, gy];
    while (cur[0] !== sx || cur[1] !== sy) { path.push(cur); cur = came[cur[0] + ',' + cur[1]]; }
    return path.reverse();
  }
  hasLineOfSight(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy); if (dist <= 0) return true;
    const step = TILE / 4, n = Math.floor(dist / step); let x = a.x, y = a.y;
    for (let i = 0; i < n; i++) { x += dx / dist * step; y += dy / dist * step; if (this.isWall(Math.floor(y / TILE), Math.floor(x / TILE))) return false; }
    return true;
  }
  draw(c, cam) {
    const x0 = Math.max(0, Math.floor(cam.x / TILE)), x1 = Math.min(this.MAP[0].length - 1, Math.floor((cam.x + W) / TILE));
    const y0 = Math.max(0, Math.floor(cam.y / TILE)), y1 = Math.min(this.MAP.length - 1, Math.floor((cam.y + H) / TILE));
    for (let r = y0; r <= y1; r++) for (let q = x0; q <= x1; q++) {
      c.fillStyle = this.MAP[r][q] === '#' ? 'rgb(80,80,80)' : '#000';
      c.fillRect(Math.floor(q * TILE - cam.x), Math.floor(r * TILE - cam.y), TILE, TILE);
    }
  }
}
