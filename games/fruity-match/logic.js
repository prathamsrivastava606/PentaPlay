// LOGIC: levels, board, matching, specials, gravity, hints, shuffle (port of game/game.py rules)
const W = 800, H = 700, ROWS = 8, COLS = 8, CELL = 60, BX = 160, BY = 195, BW = 480, BH = 480;
const TYPES = ['apple', 'cherry', 'grape', 'lemon', 'orange', 'pineapple', 'strawberry', 'watermelon'];
const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const now = () => performance.now();
const LEVELS = [
  { objective: 'Score 150 points', type: 'score', target: 150, moves: 10, ice: 0 },
  { objective: 'Create 1 striped candy', type: 'striped', target: 1, moves: 14, ice: 0, opp: 'striped' },
  { objective: 'Clear 6 ice blocks', type: 'ice', target: 6, moves: 20, ice: 6, showcase: true },
  { objective: 'Score 500 + create 2 striped candies', type: 'score_striped', target: 500, striped_target: 2, moves: 20, ice: 0, opp: 'striped' },
  { objective: 'Clear 12 ice blocks', type: 'ice', target: 12, moves: 24, ice: 12 },
  { objective: 'Create 1 color bomb', type: 'bomb', target: 1, moves: 24, ice: 0, opp: 'bomb' },
  { objective: 'Collect 15 grapes + 15 cherries', type: 'collect_two', fruit1: 'grape', fruit2: 'cherry', target: 15, moves: 26, ice: 4 },
  { objective: 'Create 2 color bombs', type: 'bomb', target: 2, moves: 28, ice: 6, opp: 'bomb' },
  { objective: 'Clear 18 ice + score 1200', type: 'ice_score', target: 18, score_target: 1200, moves: 30, ice: 18 },
  { objective: 'Final challenge: score 2500', type: 'score', target: 2500, moves: 32, ice: 10 },
];

class Logic {
  constructor() {
    this.state = 'start'; this.candies = []; this.selected = null; this.score = 0; this.moves = 20; this.gameOver = false;
    this.level = 1; this.levelScore = 0; this.levelComplete = false; this.levelFailed = false;
    this.collected = {}; this.striped = 0; this.bombs = 0; this.ice = new Set(); this.iceCleared = 0; this.stars = 0;
    this.best = this.loadBest(); this.matchAnim = false; this.matched = new Set(); this.animStart = 0; this.MATCH_MS = 300;
    this.popup = 0; this.popupStart = 0; this.shuffleUntil = 0; this.hint = null; this.lastAction = now(); this.HINT_DELAY = 7000;
    this.createBoard();
  }
  loadBest() { try { return parseInt(localStorage.getItem('fruitymatch_best')) || 0; } catch (e) { return 0; } }
  updateBest() { if (this.score > this.best) { this.best = this.score; try { localStorage.setItem('fruitymatch_best', this.best); } catch (e) {} } }
  data() { return LEVELS[this.level - 1]; }
  posAll() { for (const c of this.candies) { c.x = BX + c.col * CELL; c.y = BY + c.row * CELL; } }
  newCandy(row, col) { return { row, col, type: pick(TYPES), special: null, x: BX + col * CELL, y: BY + row * CELL }; }
  candyAt(r, c) { return this.candies.find(k => k.row === r && k.col === c) || null; }

  // ---- levels
  resetStats() {
    this.levelScore = 0; this.collected = {}; TYPES.forEach(t => this.collected[t] = 0); this.striped = 0; this.bombs = 0;
    this.ice = new Set(); this.iceCleared = 0; this.levelComplete = false; this.levelFailed = false; this.stars = 0;
  }
  setupLevel() {
    const d = this.data(); this.moves = d.moves; this.score = 0; this.gameOver = false; this.selected = null;
    this.matchAnim = false; this.matched = new Set(); this.hint = null; this.shuffleUntil = 0;
    this.resetStats(); this.createBoard(); this.createIce(d.ice || 0);
    if (d.showcase) [[2, 2, 'striped_h'], [2, 3, 'striped_v'], [5, 2, 'wrapped'], [5, 5, 'color_bomb']].forEach(([r, c, s]) => { const k = this.candyAt(r, c); if (k) k.special = s; });
  }
  createIce(amount) {
    this.ice = new Set(); if (amount <= 0) return;
    const pos = []; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) pos.push([r, c]);
    pos.sort(() => Math.random() - .5);
    const prot = this.data().showcase ? ['2,2', '2,3', '5,2', '5,5'] : [];
    for (const [r, c] of pos) {
      if (r === 0 && amount > 5) continue; if (prot.includes(r + ',' + c)) continue;
      this.ice.add(r + ',' + c); if (this.ice.size >= amount) break;
    }
  }
  progress() {
    const d = this.data(), k = d.type, m = Math.min;
    if (k === 'score') return [m(this.levelScore / d.target, 1), `${this.levelScore} / ${d.target}`];
    if (k === 'score_striped') return [m(this.levelScore / d.target, this.striped / d.striped_target, 1), `Score ${this.levelScore}/${d.target}  Striped ${this.striped}/${d.striped_target}`];
    if (k === 'collect_two') { const a = this.collected[d.fruit1], b = this.collected[d.fruit2]; return [m(a / d.target, b / d.target, 1), `Grapes ${a}/${d.target}  Cherries ${b}/${d.target}`]; }
    if (k === 'striped') return [m(this.striped / d.target, 1), `${this.striped} / ${d.target}`];
    if (k === 'bomb') return [m(this.bombs / d.target, 1), `${this.bombs} / ${d.target}`];
    if (k === 'ice') return [m(this.iceCleared / d.target, 1), `${this.iceCleared} / ${d.target}`];
    if (k === 'ice_score') return [m(this.iceCleared / d.target, this.levelScore / d.score_target, 1), `Ice ${this.iceCleared}/${d.target}  Score ${this.levelScore}/${d.score_target}`];
    return [0, ''];
  }
  objectiveMet() {
    const d = this.data(), k = d.type;
    if (k === 'score') return this.levelScore >= d.target;
    if (k === 'score_striped') return this.levelScore >= d.target && this.striped >= d.striped_target;
    if (k === 'collect_two') return this.collected[d.fruit1] >= d.target && this.collected[d.fruit2] >= d.target;
    if (k === 'striped') return this.striped >= d.target; if (k === 'bomb') return this.bombs >= d.target;
    if (k === 'ice') return this.iceCleared >= d.target;
    if (k === 'ice_score') return this.iceCleared >= d.target && this.levelScore >= d.score_target;
    return false;
  }
  calcStars() {
    if (!this.objectiveMet()) return 0; const d = this.data();
    if (d.type === 'score' || d.type === 'score_striped') { const r = this.levelScore / d.target; return r >= 2 ? 3 : r >= 1.5 ? 2 : 1; }
    return this.moves >= d.moves * .45 ? 3 : this.moves >= d.moves * .2 ? 2 : 1;
  }
  checkLevelState() {
    if (this.levelComplete || this.levelFailed) return;
    if (this.objectiveMet()) { this.levelComplete = true; this.levelFailed = false; this.gameOver = false; this.stars = this.calcStars(); return; }
    if (this.moves <= 0) { this.levelFailed = true; this.gameOver = true; }
  }
  nextLevel() {
    if (this.level >= LEVELS.length) { this.state = 'start'; this.level = 1; this.levelComplete = false; this.levelFailed = false; this.gameOver = false; return; }
    this.level++; this.setupLevel(); this.state = 'game'; this.levelComplete = false; this.levelFailed = false; this.gameOver = false; this.lastAction = now();
  }
  restart() { this.setupLevel(); this.state = 'game'; }

  // ---- board
  createBoard() {
    for (let t = 0; t < 80; t++) {
      this.candies = []; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) this.candies.push(this.newCandy(r, c));
      if (!this.findMatches().size && this.countMoves() >= 6) break;
    }
    const w = this.data().opp; if (w) this.makeOpportunity(w);
    this.posAll(); this.hint = null; this.lastAction = now();
  }
  makeOpportunity(wanted) {
    const offs = wanted === 'striped' ? [0, 1, 3] : wanted === 'bomb' ? [0, 1, 3, 4] : null; if (!offs) return;
    for (let t = 0; t < 40; t++) {
      const row = rint(1, ROWS - 2), start = rint(0, COLS - (wanted === 'bomb' ? 5 : 4)), fruit = pick(TYPES), other = pick(TYPES.filter(x => x !== fruit));
      const cols = offs.map(o => start + o), old = [];
      for (const col of [...cols, start + 2]) { const k = this.candyAt(row, col); if (k) { old.push([k, k.type]); k.type = cols.includes(col) ? fruit : other; } }
      if (!this.findMatches().size) return;
      old.forEach(([k, ty]) => k.type = ty);
    }
  }

  // ---- matching
  findMatchGroups() {
    const raw = [];
    const scan = (n, sel, key, flag) => {
      for (let i0 = 0; i0 < n; i0++) {
        const line = this.candies.filter(c => c[sel] === i0).sort((a, b) => a[key] - b[key]); let i = 0;
        while (i < line.length) {
          let j = i + 1; while (j < line.length && line[j].type === line[i].type && line[j][key] === line[j - 1][key] + 1) j++;
          if (j - i >= 3) raw.push({ candies: new Set(line.slice(i, j)), h: flag === 'h', v: flag === 'v' }); i = j;
        }
      }
    };
    scan(ROWS, 'row', 'col', 'h'); scan(COLS, 'col', 'row', 'v');
    let groups = [];
    const absorb = (list, into) => { for (const it of list) { const g = into.find(x => [...it.candies].some(c => x.candies.has(c))); if (g) { it.candies.forEach(c => g.candies.add(c)); g.h = g.h || it.h; g.v = g.v || it.v; } else into.push({ candies: new Set(it.candies), h: it.h, v: it.v }); } };
    absorb(raw, groups);
    let ch = true; while (ch) { const res = []; const before = groups.length; absorb(groups, res); groups = res; ch = groups.length < before; }
    return groups;
  }
  findMatches() { const s = new Set(); this.findMatchGroups().forEach(g => g.candies.forEach(c => s.add(c))); return s; }
  specialFor(g, preferred) {
    const len = g.candies.size, pos = g.candies.has(preferred) ? preferred : [...g.candies][0];
    if (g.h && g.v) return ['wrapped', pos]; if (len >= 5) return ['color_bomb', pos];
    if (len === 4) return [g.h ? 'striped_h' : 'striped_v', pos]; return [null, null];
  }
  activate(c, set) {
    if (c.special === 'striped_h') this.candies.forEach(k => { if (k.row === c.row) set.add(k); });
    else if (c.special === 'striped_v') this.candies.forEach(k => { if (k.col === c.col) set.add(k); });
    else if (c.special === 'wrapped') this.candies.forEach(k => { if (Math.abs(k.row - c.row) <= 1 && Math.abs(k.col - c.col) <= 1) set.add(k); });
  }
  expand(set) {
    const done = new Set(); let ch = true;
    while (ch) { ch = false; for (const c of [...set]) { if (done.has(c)) continue; done.add(c); const b = set.size; this.activate(c, set); if (set.size > b) ch = true; } }
  }
  swapEffect(f, s) {
    const a = f.special, b = s.special; if (!a && !b) return null;
    if (a === 'color_bomb' && b === 'color_bomb') return new Set(this.candies);
    if (a === 'color_bomb' || b === 'color_bomb') {
      const bomb = a === 'color_bomb' ? f : s, other = bomb === f ? s : f, tt = other.type, set = new Set([bomb, other]);
      this.candies.forEach(c => { if (c.type === tt) set.add(c); });
      for (const c of [...set]) {
        if (c.type !== tt) continue;
        if (other.special === 'striped_h') this.candies.forEach(k => { if (k.row === c.row) set.add(k); });
        else if (other.special === 'striped_v') this.candies.forEach(k => { if (k.col === c.col) set.add(k); });
        else if (other.special === 'wrapped') this.candies.forEach(k => { if (Math.abs(k.row - c.row) <= 1 && Math.abs(k.col - c.col) <= 1) set.add(k); });
      }
      return set;
    }
    const as = typeof a === 'string' && a.startsWith('striped'), bs = typeof b === 'string' && b.startsWith('striped'), set = new Set([f, s]);
    if (as && bs) { this.candies.forEach(c => { if (c.row === f.row || c.col === f.col) set.add(c); }); return set; }
    if (a === 'wrapped' && b === 'wrapped') { this.candies.forEach(c => { if (Math.abs(c.row - f.row) <= 2 && Math.abs(c.col - f.col) <= 2) set.add(c); }); return set; }
    if ((a === 'wrapped' && bs) || (b === 'wrapped' && as)) { this.candies.forEach(c => { if (Math.abs(c.row - f.row) <= 1 || Math.abs(c.col - f.col) <= 1) set.add(c); }); return set; }
    this.activate(a ? f : s, set); return set;
  }
  swap(a, b) { [a.row, b.row] = [b.row, a.row]; [a.col, b.col] = [b.col, a.col]; this.posAll(); }
  completeBtn() { return { x: W / 2 - 135, y: H / 2 - 220 + 285, w: 270, h: 65 }; }
  failBtn() { return { x: W / 2 - 125, y: H / 2 - 220 + 250, w: 250, h: 65 }; }
  inRect(mx, my, r) { return mx >= r.x && mx < r.x + r.w && my >= r.y && my < r.y + r.h; }
  click(mx, my) {
    this.lastAction = now(); this.hint = null;
    if (this.levelComplete) { if (this.inRect(mx, my, this.completeBtn())) this.nextLevel(); return; }
    if (this.gameOver) { if (this.inRect(mx, my, this.failBtn())) this.restart(); return; }
    if (this.matchAnim || this.moves <= 0) return;
    const clicked = this.candies.find(c => this.inRect(mx, my, { x: c.x | 0, y: c.y | 0, w: CELL, h: CELL }));
    if (!clicked) return;
    if (!this.selected) { this.selected = clicked; return; }
    const first = this.selected, second = clicked;
    if (first === second) { this.selected = null; return; }
    if (Math.abs(first.row - second.row) + Math.abs(first.col - second.col) !== 1) { this.selected = clicked; return; }
    this.selected = null; this.play('swap'); this.swap(first, second);
    const sc = this.swapEffect(first, second);
    if (sc) { this.moves--; this.expand(sc); this.startMatch(sc, 15); return; }
    const matches = this.findMatches(), groups = this.findMatchGroups();
    if (!matches.size) { this.swap(first, second); return; }
    this.moves--;
    let sp = null, pos = null;
    for (const g of groups) if (g.candies.has(first) || g.candies.has(second)) { [sp, pos] = this.specialFor(g, g.candies.has(first) ? first : second); if (sp) break; }
    if (sp) { pos.special = sp; if (sp.startsWith('striped')) this.striped++; else if (sp === 'color_bomb') this.bombs++; matches.delete(pos); }
    this.expand(matches); this.startMatch(matches, 10, sp ? 50 : 0);
  }
  startMatch(m, ppc = 10, bonus = 0) {
    if (!m.size) return;
    for (const c of m) { this.collected[c.type] = (this.collected[c.type] || 0) + 1; const k = c.row + ',' + c.col; if (this.ice.has(k)) { this.ice.delete(k); this.iceCleared++; } }
    const gained = m.size * ppc + bonus; this.levelScore += gained; this.score = this.levelScore; this.updateBest();
    this.popup = gained; this.popupStart = now(); this.matched = new Set(m); this.matchAnim = true; this.animStart = now(); this.play('pop');
  }
  gravity() { for (let c = 0; c < COLS; c++) this.candies.filter(k => k.col === c).sort((a, b) => b.row - a.row).forEach((k, i) => k.row = ROWS - 1 - i); }
  fill() { const occ = new Set(this.candies.map(c => c.row + ',' + c.col)); for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (!occ.has(r + ',' + c)) this.candies.push(this.newCandy(r, c)); }
  finishMatch() {
    this.candies = this.candies.filter(c => !this.matched.has(c)); this.play('splash'); this.gravity(); this.fill(); this.posAll();
    this.matched = new Set(); this.matchAnim = false;
    const matches = this.findMatches();
    if (matches.size) {
      let sp = null, pos = null; for (const g of this.findMatchGroups()) { [sp, pos] = this.specialFor(g); if (sp) break; }
      if (sp && pos) { pos.special = sp; if (sp.startsWith('striped')) this.striped++; else if (sp === 'color_bomb') this.bombs++; matches.delete(pos); }
      this.expand(matches); this.startMatch(matches, 10, sp ? 50 : 0); return;
    }
    if (this.moves > 0 && !this.countMoves()) this.shuffle();
    this.checkLevelState();
    if (this.levelFailed) { this.updateBest(); this.play('gameover'); }
  }
  updateAnim() { if (this.matchAnim && now() - this.animStart >= this.MATCH_MS) this.finishMatch(); }

  // ---- moves / hint / shuffle
  typeGrid() { const g = Array.from({ length: ROWS }, () => Array(COLS).fill(null)); this.candies.forEach(c => g[c.row][c.col] = c.type); return g; }
  gridHasMatch(g) {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS - 2; c++) { const v = g[r][c]; if (v !== null && v === g[r][c + 1] && v === g[r][c + 2]) return true; }
    for (let r = 0; r < ROWS - 2; r++) for (let c = 0; c < COLS; c++) { const v = g[r][c]; if (v !== null && v === g[r + 1][c] && v === g[r + 2][c]) return true; }
    return false;
  }
  countMoves() {
    const g = this.typeGrid(); let n = 0;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (c + 1 < COLS) { [g[r][c], g[r][c + 1]] = [g[r][c + 1], g[r][c]]; if (this.gridHasMatch(g)) n++; [g[r][c], g[r][c + 1]] = [g[r][c + 1], g[r][c]]; }
      if (r + 1 < ROWS) { [g[r][c], g[r + 1][c]] = [g[r + 1][c], g[r][c]]; if (this.gridHasMatch(g)) n++; [g[r][c], g[r + 1][c]] = [g[r + 1][c], g[r][c]]; }
    }
    return n;
  }
  findHint() {
    const g = this.typeGrid();
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const first = this.candyAt(r, c); if (!first) continue;
      for (const [dr, dc] of [[0, 1], [1, 0]]) {
        const nr = r + dr, nc = c + dc; if (nr >= ROWS || nc >= COLS) continue; const second = this.candyAt(nr, nc); if (!second) continue;
        [g[r][c], g[nr][nc]] = [g[nr][nc], g[r][c]]; const ok = this.gridHasMatch(g); [g[r][c], g[nr][nc]] = [g[nr][nc], g[r][c]];
        if (ok) return [first, second];
      }
    }
    return null;
  }
  updateHint() {
    if (this.matchAnim || this.gameOver || this.moves <= 0) { this.hint = null; return; }
    if (now() - this.lastAction >= this.HINT_DELAY) { if (!this.hint) this.hint = this.findHint(); } else this.hint = null;
  }
  shuffle() {
    const types = this.candies.map(c => c.type);
    for (let t = 0; t < 300; t++) {
      types.sort(() => Math.random() - .5); this.candies.forEach((c, i) => { c.type = types[i]; c.special = null; });
      if (!this.findMatches().size && this.countMoves()) { this.posAll(); this.shuffleUntil = now() + 1200; this.hint = null; this.lastAction = now(); return; }
    }
    this.createBoard(); this.shuffleUntil = now() + 1200;
  }
}
