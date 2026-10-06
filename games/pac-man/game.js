// PAC-MAN browser port of pacman_prototype_2.py. State variables keep the original Python names.
// The four ghost movement methods below are a mechanical translation of the Python code (identical logic).
const WIDTH = 900, HEIGHT = 950, PI = Math.PI;
const BG = 'rgb(5,7,18)', PANEL = 'rgb(13,18,38)', PANEL_2 = 'rgb(20,26,52)', WHITE = 'rgb(245,248,255)', MUTED = 'rgb(145,156,185)',
  CYAN = 'rgb(50,220,255)', YELLOW = 'rgb(255,215,60)', RED = 'rgb(255,80,105)', GREEN = 'rgb(70,235,145)', color = CYAN;
const F = (n) => `bold ${n}px Arial, Helvetica, sans-serif`;
const fl = Math.floor, mod = (a, b) => ((a % b) + b) % b;
const IMGS = {}; let ctx;
const goFullscreen = () => { const el = document.querySelector('.wrap'); if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(() => {}); };
const toggleFullscreen = () => document.fullscreenElement ? document.exitFullscreen() : goFullscreen();

let level = JSON.parse(JSON.stringify(BOARDS));
// Python-style indexing (negative indexes wrap, as in the original tunnel logic)
const LV = (r, c) => { const R = level.length, C = level[0].length; if (r < 0) r += R; if (c < 0) c += C; return (r >= R || c >= C || r < 0 || c < 0) ? 3 : level[r][c]; };

let player_x = 450, player_y = 663, direction = 0;
let blinky_x = 440, blinky_y = 388, blinky_direction = 0, inky_x = 440, inky_y = 388, inky_direction = 2;
let pinky_x = 440, pinky_y = 438, pinky_direction = 2, clyde_x = 440, clyde_y = 438, clyde_direction = 2;
let counter = 0, flicker = false, turns_allowed = [false, false, false, false], direction_command = 0, player_speed = 2, score = 0;
let powerup = false, power_counter = 0, eaten_ghost = [false, false, false, false];
let targets = [[player_x, player_y], [player_x, player_y], [player_x, player_y], [player_x, player_y]];
let blinky_dead = false, inky_dead = false, clyde_dead = false, pinky_dead = false;
let blinky_box = false, inky_box = false, clyde_box = false, pinky_box = false;
let moving = false, ghost_speeds = [2, 2, 2, 2], startup_counter = 0, lives = 3, game_over = false, game_won = false;
let show_start_screen = true, start_blink = 0, center_x = 0, center_y = 0, blinky, inky, pinky, clyde;

const blit = (img, x, y, w = 45, h = 45) => ctx.drawImage(img, x, y, w, h);

class Ghost {
  constructor(x_coord, y_coord, target, speed, img, direct, dead, box, id) {
    this.x_pos = x_coord; this.y_pos = y_coord; this.center_x = this.x_pos + 22; this.center_y = this.y_pos + 22;
    this.target = target; this.speed = speed; this.img = img; this.direction = direct; this.dead = dead; this.in_box = box; this.id = id;
    [this.turns, this.in_box] = this.check_collisions(); this.rect = this.draw();
  }
  draw() {
    if ((!powerup && !this.dead) || (eaten_ghost[this.id] && powerup && !this.dead)) blit(this.img, this.x_pos, this.y_pos);
    else if (powerup && !this.dead && !eaten_ghost[this.id]) blit(IMGS.powerup, this.x_pos, this.y_pos);
    else blit(IMGS.dead, this.x_pos, this.y_pos);
    return { x: this.center_x - 18, y: this.center_y - 18, w: 36, h: 36 };
  }
  check_collisions() {
    const num1 = fl((HEIGHT - 50) / 32), num2 = fl(WIDTH / 30), num3 = 15, cx = this.center_x, cy = this.center_y;
    this.turns = [false, false, false, false];
    const ok = (r, c) => { const v = LV(r, c); return v < 3 || (v === 9 && (this.in_box || this.dead)); };
    if (0 < fl(cx / 30) && fl(cx / 30) < 29) {
      if (LV(fl((cy - num3) / num1), fl(cx / num2)) === 9) this.turns[2] = true;
      if (ok(fl(cy / num1), fl((cx - num3) / num2))) this.turns[1] = true;
      if (ok(fl(cy / num1), fl((cx + num3) / num2))) this.turns[0] = true;
      if (ok(fl((cy + num3) / num1), fl(cx / num2))) this.turns[3] = true;
      if (ok(fl((cy - num3) / num1), fl(cx / num2))) this.turns[2] = true;
      const mx = mod(cx, num2), my = mod(cy, num1);
      if (this.direction === 2 || this.direction === 3) {
        if (12 <= mx && mx <= 18) {
          if (ok(fl((cy + num3) / num1), fl(cx / num2))) this.turns[3] = true;
          if (ok(fl((cy - num3) / num1), fl(cx / num2))) this.turns[2] = true;
        }
        if (12 <= my && my <= 18) {
          if (ok(fl(cy / num1), fl((cx - num2) / num2))) this.turns[1] = true;
          if (ok(fl(cy / num1), fl((cx + num2) / num2))) this.turns[0] = true;
        }
      }
      if (this.direction === 0 || this.direction === 1) {
        if (12 <= mx && mx <= 18) {
          if (ok(fl((cy + num3) / num1), fl(cx / num2))) this.turns[3] = true;
          if (ok(fl((cy - num3) / num1), fl(cx / num2))) this.turns[2] = true;
        }
        if (12 <= my && my <= 18) {
          if (ok(fl(cy / num1), fl((cx - num3) / num2))) this.turns[1] = true;
          if (ok(fl(cy / num1), fl((cx + num3) / num2))) this.turns[0] = true;
        }
      }
    } else { this.turns[0] = true; this.turns[1] = true; }
    this.in_box = 350 < this.x_pos && this.x_pos < 550 && 370 < this.y_pos && this.y_pos < 480;
    return [this.turns, this.in_box];
  }
  move_clyde() {
    // r, l, u, d
    // clyde is going to turn whenever advantageous for pursuit
    if (this.direction == 0) {
      if (this.target[0] > this.x_pos && this.turns[0]) {
        this.x_pos += this.speed;
      } else if (!this.turns[0]) {
        if (this.target[1] > this.y_pos && this.turns[3]) {
          this.direction = 3;
          this.y_pos += this.speed;
        } else if (this.target[1] < this.y_pos && this.turns[2]) {
          this.direction = 2;
          this.y_pos -= this.speed;
        } else if (this.target[0] < this.x_pos && this.turns[1]) {
          this.direction = 1;
          this.x_pos -= this.speed;
        } else if (this.turns[3]) {
          this.direction = 3;
          this.y_pos += this.speed;
        } else if (this.turns[2]) {
          this.direction = 2;
          this.y_pos -= this.speed;
        } else if (this.turns[1]) {
          this.direction = 1;
          this.x_pos -= this.speed;
        }
      } else if (this.turns[0]) {
        if (this.target[1] > this.y_pos && this.turns[3]) {
          this.direction = 3;
          this.y_pos += this.speed;
        }
        if (this.target[1] < this.y_pos && this.turns[2]) {
          this.direction = 2;
          this.y_pos -= this.speed;
        } else {
          this.x_pos += this.speed;
        }
      }
    } else if (this.direction == 1) {
      if (this.target[1] > this.y_pos && this.turns[3]) {
        this.direction = 3;
      } else if (this.target[0] < this.x_pos && this.turns[1]) {
        this.x_pos -= this.speed;
      } else if (!this.turns[1]) {
        if (this.target[1] > this.y_pos && this.turns[3]) {
          this.direction = 3;
          this.y_pos += this.speed;
        } else if (this.target[1] < this.y_pos && this.turns[2]) {
          this.direction = 2;
          this.y_pos -= this.speed;
        } else if (this.target[0] > this.x_pos && this.turns[0]) {
          this.direction = 0;
          this.x_pos += this.speed;
        } else if (this.turns[3]) {
          this.direction = 3;
          this.y_pos += this.speed;
        } else if (this.turns[2]) {
          this.direction = 2;
          this.y_pos -= this.speed;
        } else if (this.turns[0]) {
          this.direction = 0;
          this.x_pos += this.speed;
        }
      } else if (this.turns[1]) {
        if (this.target[1] > this.y_pos && this.turns[3]) {
          this.direction = 3;
          this.y_pos += this.speed;
        }
        if (this.target[1] < this.y_pos && this.turns[2]) {
          this.direction = 2;
          this.y_pos -= this.speed;
        } else {
          this.x_pos -= this.speed;
        }
      }
    } else if (this.direction == 2) {
      if (this.target[0] < this.x_pos && this.turns[1]) {
        this.direction = 1;
        this.x_pos -= this.speed;
      } else if (this.target[1] < this.y_pos && this.turns[2]) {
        this.direction = 2;
        this.y_pos -= this.speed;
      } else if (!this.turns[2]) {
        if (this.target[0] > this.x_pos && this.turns[0]) {
          this.direction = 0;
          this.x_pos += this.speed;
        } else if (this.target[0] < this.x_pos && this.turns[1]) {
          this.direction = 1;
          this.x_pos -= this.speed;
        } else if (this.target[1] > this.y_pos && this.turns[3]) {
          this.direction = 3;
          this.y_pos += this.speed;
        } else if (this.turns[1]) {
          this.direction = 1;
          this.x_pos -= this.speed;
        } else if (this.turns[3]) {
          this.direction = 3;
          this.y_pos += this.speed;
        } else if (this.turns[0]) {
          this.direction = 0;
          this.x_pos += this.speed;
        }
      } else if (this.turns[2]) {
        if (this.target[0] > this.x_pos && this.turns[0]) {
          this.direction = 0;
          this.x_pos += this.speed;
        } else if (this.target[0] < this.x_pos && this.turns[1]) {
          this.direction = 1;
          this.x_pos -= this.speed;
        } else {
          this.y_pos -= this.speed;
        }
      }
    } else if (this.direction == 3) {
      if (this.target[1] > this.y_pos && this.turns[3]) {
        this.y_pos += this.speed;
      } else if (!this.turns[3]) {
        if (this.target[0] > this.x_pos && this.turns[0]) {
          this.direction = 0;
          this.x_pos += this.speed;
        } else if (this.target[0] < this.x_pos && this.turns[1]) {
          this.direction = 1;
          this.x_pos -= this.speed;
        } else if (this.target[1] < this.y_pos && this.turns[2]) {
          this.direction = 2;
          this.y_pos -= this.speed;
        } else if (this.turns[2]) {
          this.direction = 2;
          this.y_pos -= this.speed;
        } else if (this.turns[1]) {
          this.direction = 1;
          this.x_pos -= this.speed;
        } else if (this.turns[0]) {
          this.direction = 0;
          this.x_pos += this.speed;
        }
      } else if (this.turns[3]) {
        if (this.target[0] > this.x_pos && this.turns[0]) {
          this.direction = 0;
          this.x_pos += this.speed;
        } else if (this.target[0] < this.x_pos && this.turns[1]) {
          this.direction = 1;
          this.x_pos -= this.speed;
        } else {
          this.y_pos += this.speed;
        }
      }
    }
    if (this.x_pos < -30) {
      this.x_pos = 900;
    } else if (this.x_pos > 900) {
      this.x_pos -= 30;
    }
    return [this.x_pos, this.y_pos, this.direction];
  }
  move_blinky() {
    // r, l, u, d
    // blinky is going to turn whenever colliding with walls, otherwise continue straight
    if (this.direction == 0) {
      if (this.target[0] > this.x_pos && this.turns[0]) {
        this.x_pos += this.speed;
      } else if (!this.turns[0]) {
        if (this.target[1] > this.y_pos && this.turns[3]) {
          this.direction = 3;
          this.y_pos += this.speed;
        } else if (this.target[1] < this.y_pos && this.turns[2]) {
          this.direction = 2;
          this.y_pos -= this.speed;
        } else if (this.target[0] < this.x_pos && this.turns[1]) {
          this.direction = 1;
          this.x_pos -= this.speed;
        } else if (this.turns[3]) {
          this.direction = 3;
          this.y_pos += this.speed;
        } else if (this.turns[2]) {
          this.direction = 2;
          this.y_pos -= this.speed;
        } else if (this.turns[1]) {
          this.direction = 1;
          this.x_pos -= this.speed;
        }
      } else if (this.turns[0]) {
        this.x_pos += this.speed;
      }
    } else if (this.direction == 1) {
      if (this.target[0] < this.x_pos && this.turns[1]) {
        this.x_pos -= this.speed;
      } else if (!this.turns[1]) {
        if (this.target[1] > this.y_pos && this.turns[3]) {
          this.direction = 3;
          this.y_pos += this.speed;
        } else if (this.target[1] < this.y_pos && this.turns[2]) {
          this.direction = 2;
          this.y_pos -= this.speed;
        } else if (this.target[0] > this.x_pos && this.turns[0]) {
          this.direction = 0;
          this.x_pos += this.speed;
        } else if (this.turns[3]) {
          this.direction = 3;
          this.y_pos += this.speed;
        } else if (this.turns[2]) {
          this.direction = 2;
          this.y_pos -= this.speed;
        } else if (this.turns[0]) {
          this.direction = 0;
          this.x_pos += this.speed;
        }
      } else if (this.turns[1]) {
        this.x_pos -= this.speed;
      }
    } else if (this.direction == 2) {
      if (this.target[1] < this.y_pos && this.turns[2]) {
        this.direction = 2;
        this.y_pos -= this.speed;
      } else if (!this.turns[2]) {
        if (this.target[0] > this.x_pos && this.turns[0]) {
          this.direction = 0;
          this.x_pos += this.speed;
        } else if (this.target[0] < this.x_pos && this.turns[1]) {
          this.direction = 1;
          this.x_pos -= this.speed;
        } else if (this.target[1] > this.y_pos && this.turns[3]) {
          this.direction = 3;
          this.y_pos += this.speed;
        } else if (this.turns[3]) {
          this.direction = 3;
          this.y_pos += this.speed;
        } else if (this.turns[0]) {
          this.direction = 0;
          this.x_pos += this.speed;
        } else if (this.turns[1]) {
          this.direction = 1;
          this.x_pos -= this.speed;
        }
      } else if (this.turns[2]) {
        this.y_pos -= this.speed;
      }
    } else if (this.direction == 3) {
      if (this.target[1] > this.y_pos && this.turns[3]) {
        this.y_pos += this.speed;
      } else if (!this.turns[3]) {
        if (this.target[0] > this.x_pos && this.turns[0]) {
          this.direction = 0;
          this.x_pos += this.speed;
        } else if (this.target[0] < this.x_pos && this.turns[1]) {
          this.direction = 1;
          this.x_pos -= this.speed;
        } else if (this.target[1] < this.y_pos && this.turns[2]) {
          this.direction = 2;
          this.y_pos -= this.speed;
        } else if (this.turns[2]) {
          this.direction = 2;
          this.y_pos -= this.speed;
        } else if (this.turns[0]) {
          this.direction = 0;
          this.x_pos += this.speed;
        } else if (this.turns[1]) {
          this.direction = 1;
          this.x_pos -= this.speed;
        }
      } else if (this.turns[3]) {
        this.y_pos += this.speed;
      }
    }
    if (this.x_pos < -30) {
      this.x_pos = 900;
    } else if (this.x_pos > 900) {
      this.x_pos -= 30;
    }
    return [this.x_pos, this.y_pos, this.direction];
  }
  move_inky() {
    // r, l, u, d
    // inky turns up or down at any point to pursue, but left and right only on collision
    if (this.direction == 0) {
      if (this.target[0] > this.x_pos && this.turns[0]) {
        this.x_pos += this.speed;
      } else if (!this.turns[0]) {
        if (this.target[1] > this.y_pos && this.turns[3]) {
          this.direction = 3;
          this.y_pos += this.speed;
        } else if (this.target[1] < this.y_pos && this.turns[2]) {
          this.direction = 2;
          this.y_pos -= this.speed;
        } else if (this.target[0] < this.x_pos && this.turns[1]) {
          this.direction = 1;
          this.x_pos -= this.speed;
        } else if (this.turns[3]) {
          this.direction = 3;
          this.y_pos += this.speed;
        } else if (this.turns[2]) {
          this.direction = 2;
          this.y_pos -= this.speed;
        } else if (this.turns[1]) {
          this.direction = 1;
          this.x_pos -= this.speed;
        }
      } else if (this.turns[0]) {
        if (this.target[1] > this.y_pos && this.turns[3]) {
          this.direction = 3;
          this.y_pos += this.speed;
        }
        if (this.target[1] < this.y_pos && this.turns[2]) {
          this.direction = 2;
          this.y_pos -= this.speed;
        } else {
          this.x_pos += this.speed;
        }
      }
    } else if (this.direction == 1) {
      if (this.target[1] > this.y_pos && this.turns[3]) {
        this.direction = 3;
      } else if (this.target[0] < this.x_pos && this.turns[1]) {
        this.x_pos -= this.speed;
      } else if (!this.turns[1]) {
        if (this.target[1] > this.y_pos && this.turns[3]) {
          this.direction = 3;
          this.y_pos += this.speed;
        } else if (this.target[1] < this.y_pos && this.turns[2]) {
          this.direction = 2;
          this.y_pos -= this.speed;
        } else if (this.target[0] > this.x_pos && this.turns[0]) {
          this.direction = 0;
          this.x_pos += this.speed;
        } else if (this.turns[3]) {
          this.direction = 3;
          this.y_pos += this.speed;
        } else if (this.turns[2]) {
          this.direction = 2;
          this.y_pos -= this.speed;
        } else if (this.turns[0]) {
          this.direction = 0;
          this.x_pos += this.speed;
        }
      } else if (this.turns[1]) {
        if (this.target[1] > this.y_pos && this.turns[3]) {
          this.direction = 3;
          this.y_pos += this.speed;
        }
        if (this.target[1] < this.y_pos && this.turns[2]) {
          this.direction = 2;
          this.y_pos -= this.speed;
        } else {
          this.x_pos -= this.speed;
        }
      }
    } else if (this.direction == 2) {
      if (this.target[1] < this.y_pos && this.turns[2]) {
        this.direction = 2;
        this.y_pos -= this.speed;
      } else if (!this.turns[2]) {
        if (this.target[0] > this.x_pos && this.turns[0]) {
          this.direction = 0;
          this.x_pos += this.speed;
        } else if (this.target[0] < this.x_pos && this.turns[1]) {
          this.direction = 1;
          this.x_pos -= this.speed;
        } else if (this.target[1] > this.y_pos && this.turns[3]) {
          this.direction = 3;
          this.y_pos += this.speed;
        } else if (this.turns[1]) {
          this.direction = 1;
          this.x_pos -= this.speed;
        } else if (this.turns[3]) {
          this.direction = 3;
          this.y_pos += this.speed;
        } else if (this.turns[0]) {
          this.direction = 0;
          this.x_pos += this.speed;
        }
      } else if (this.turns[2]) {
        this.y_pos -= this.speed;
      }
    } else if (this.direction == 3) {
      if (this.target[1] > this.y_pos && this.turns[3]) {
        this.y_pos += this.speed;
      } else if (!this.turns[3]) {
        if (this.target[0] > this.x_pos && this.turns[0]) {
          this.direction = 0;
          this.x_pos += this.speed;
        } else if (this.target[0] < this.x_pos && this.turns[1]) {
          this.direction = 1;
          this.x_pos -= this.speed;
        } else if (this.target[1] < this.y_pos && this.turns[2]) {
          this.direction = 2;
          this.y_pos -= this.speed;
        } else if (this.turns[2]) {
          this.direction = 2;
          this.y_pos -= this.speed;
        } else if (this.turns[1]) {
          this.direction = 1;
          this.x_pos -= this.speed;
        } else if (this.turns[0]) {
          this.direction = 0;
          this.x_pos += this.speed;
        }
      } else if (this.turns[3]) {
        this.y_pos += this.speed;
      }
    }
    if (this.x_pos < -30) {
      this.x_pos = 900;
    } else if (this.x_pos > 900) {
      this.x_pos -= 30;
    }
    return [this.x_pos, this.y_pos, this.direction];
  }
  move_pinky() {
    // r, l, u, d
    // inky is going to turn left or right whenever advantageous, but only up or down on collision
    if (this.direction == 0) {
      if (this.target[0] > this.x_pos && this.turns[0]) {
        this.x_pos += this.speed;
      } else if (!this.turns[0]) {
        if (this.target[1] > this.y_pos && this.turns[3]) {
          this.direction = 3;
          this.y_pos += this.speed;
        } else if (this.target[1] < this.y_pos && this.turns[2]) {
          this.direction = 2;
          this.y_pos -= this.speed;
        } else if (this.target[0] < this.x_pos && this.turns[1]) {
          this.direction = 1;
          this.x_pos -= this.speed;
        } else if (this.turns[3]) {
          this.direction = 3;
          this.y_pos += this.speed;
        } else if (this.turns[2]) {
          this.direction = 2;
          this.y_pos -= this.speed;
        } else if (this.turns[1]) {
          this.direction = 1;
          this.x_pos -= this.speed;
        }
      } else if (this.turns[0]) {
        this.x_pos += this.speed;
      }
    } else if (this.direction == 1) {
      if (this.target[1] > this.y_pos && this.turns[3]) {
        this.direction = 3;
      } else if (this.target[0] < this.x_pos && this.turns[1]) {
        this.x_pos -= this.speed;
      } else if (!this.turns[1]) {
        if (this.target[1] > this.y_pos && this.turns[3]) {
          this.direction = 3;
          this.y_pos += this.speed;
        } else if (this.target[1] < this.y_pos && this.turns[2]) {
          this.direction = 2;
          this.y_pos -= this.speed;
        } else if (this.target[0] > this.x_pos && this.turns[0]) {
          this.direction = 0;
          this.x_pos += this.speed;
        } else if (this.turns[3]) {
          this.direction = 3;
          this.y_pos += this.speed;
        } else if (this.turns[2]) {
          this.direction = 2;
          this.y_pos -= this.speed;
        } else if (this.turns[0]) {
          this.direction = 0;
          this.x_pos += this.speed;
        }
      } else if (this.turns[1]) {
        this.x_pos -= this.speed;
      }
    } else if (this.direction == 2) {
      if (this.target[0] < this.x_pos && this.turns[1]) {
        this.direction = 1;
        this.x_pos -= this.speed;
      } else if (this.target[1] < this.y_pos && this.turns[2]) {
        this.direction = 2;
        this.y_pos -= this.speed;
      } else if (!this.turns[2]) {
        if (this.target[0] > this.x_pos && this.turns[0]) {
          this.direction = 0;
          this.x_pos += this.speed;
        } else if (this.target[0] < this.x_pos && this.turns[1]) {
          this.direction = 1;
          this.x_pos -= this.speed;
        } else if (this.target[1] > this.y_pos && this.turns[3]) {
          this.direction = 3;
          this.y_pos += this.speed;
        } else if (this.turns[1]) {
          this.direction = 1;
          this.x_pos -= this.speed;
        } else if (this.turns[3]) {
          this.direction = 3;
          this.y_pos += this.speed;
        } else if (this.turns[0]) {
          this.direction = 0;
          this.x_pos += this.speed;
        }
      } else if (this.turns[2]) {
        if (this.target[0] > this.x_pos && this.turns[0]) {
          this.direction = 0;
          this.x_pos += this.speed;
        } else if (this.target[0] < this.x_pos && this.turns[1]) {
          this.direction = 1;
          this.x_pos -= this.speed;
        } else {
          this.y_pos -= this.speed;
        }
      }
    } else if (this.direction == 3) {
      if (this.target[1] > this.y_pos && this.turns[3]) {
        this.y_pos += this.speed;
      } else if (!this.turns[3]) {
        if (this.target[0] > this.x_pos && this.turns[0]) {
          this.direction = 0;
          this.x_pos += this.speed;
        } else if (this.target[0] < this.x_pos && this.turns[1]) {
          this.direction = 1;
          this.x_pos -= this.speed;
        } else if (this.target[1] < this.y_pos && this.turns[2]) {
          this.direction = 2;
          this.y_pos -= this.speed;
        } else if (this.turns[2]) {
          this.direction = 2;
          this.y_pos -= this.speed;
        } else if (this.turns[1]) {
          this.direction = 1;
          this.x_pos -= this.speed;
        } else if (this.turns[0]) {
          this.direction = 0;
          this.x_pos += this.speed;
        }
      } else if (this.turns[3]) {
        if (this.target[0] > this.x_pos && this.turns[0]) {
          this.direction = 0;
          this.x_pos += this.speed;
        } else if (this.target[0] < this.x_pos && this.turns[1]) {
          this.direction = 1;
          this.x_pos -= this.speed;
        } else {
          this.y_pos += this.speed;
        }
      }
    }
    if (this.x_pos < -30) {
      this.x_pos = 900;
    } else if (this.x_pos > 900) {
      this.x_pos -= 30;
    }
    return [this.x_pos, this.y_pos, this.direction];
  }}

// ---------- UI ----------
function rrect(x, y, w, h, r, fill, stroke, lw) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.beginPath(); ctx.roundRect(x + lw / 2, y + lw / 2, w - lw, h - lw, Math.max(0, r - lw / 2)); ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
function rounded_panel(x, y, w, h, fill = PANEL, border = PANEL_2, radius = 14, width = 2) { rrect(x, y, w, h, radius, fill, border, width); }
function draw_text(text, font, x, y, col = WHITE, center = false) {
  ctx.font = font; ctx.fillStyle = col; ctx.textAlign = center ? 'center' : 'left'; ctx.textBaseline = center ? 'middle' : 'top'; ctx.fillText(String(text), x, y);
}
function draw_modern_hud() {
  ctx.fillStyle = BG; ctx.fillRect(0, 895, WIDTH, 55);
  ctx.strokeStyle = PANEL_2; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 895); ctx.lineTo(WIDTH, 895); ctx.stroke();
  rounded_panel(14, 905, 205, 38, PANEL, PANEL_2, 10, 1); draw_text('SCORE', F(16), 28, 916, MUTED); draw_text(score.toLocaleString('en-US'), F(22), 93, 911, YELLOW);
  rounded_panel(230, 905, 240, 38, PANEL, PANEL_2, 10, 1); draw_text('POWER', F(16), 244, 916, MUTED);
  if (powerup) {
    const pct = Math.max(0, 600 - power_counter) / 600; rrect(315, 917, 135, 10, 5, 'rgb(35,42,65)'); const w = fl(135 * pct); if (w > 0) rrect(315, 917, w, 10, Math.min(5, w / 2), CYAN);
  } else draw_text('READY', F(16), 315, 914, MUTED);
  rounded_panel(490, 905, 185, 38, PANEL, PANEL_2, 10, 1); draw_text('LIVES', F(16), 505, 916, MUTED);
  for (let i = 0; i < lives; i++) blit(IMGS.p[0], 570 + i * 31, 911, 25, 25);
  rounded_panel(695, 905, 191, 38, PANEL, PANEL_2, 10, 1); draw_text('ARROWS', F(16), 711, 916, MUTED); draw_text('MOVE', F(16), 786, 914, WHITE);
}
function draw_overlay(title, subtitle, accent) {
  ctx.fillStyle = 'rgba(0,0,0,.647)'; ctx.fillRect(0, 0, WIDTH, 895);
  rounded_panel(145, 270, 610, 245, PANEL, accent, 20, 3); draw_text(title, F(48), 450, 335, accent, true); draw_text(subtitle, F(22), 450, 405, WHITE, true);
  rounded_panel(275, 445, 350, 48, PANEL_2, accent, 14, 2); draw_text('PRESS SPACE TO PLAY AGAIN', F(16), 450, 469, WHITE, true);
}
function draw_game_title() { draw_text('PAC-MAN', F(34), WIDTH / 2, 22, YELLOW, true); draw_text('NEON MAZE', F(16), WIDTH / 2, 55, MUTED, true); }
function draw_misc() {
  draw_modern_hud();
  if (game_over) draw_overlay('GAME OVER', `Final Score  ${score.toLocaleString('en-US')}`, RED);
  else if (game_won) draw_overlay('VICTORY!', `Score  ${score.toLocaleString('en-US')}`, GREEN);
}
function pg_arc(x, y, w, h, a0, a1) { ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, -a1, -a0); ctx.stroke(); }
function draw_board() {
  const num1 = fl((HEIGHT - 50) / 32), num2 = fl(WIDTH / 30); ctx.lineWidth = 3;
  for (let i = 0; i < level.length; i++) for (let j = 0; j < level[i].length; j++) {
    const v = level[i][j], X = j * num2, Y = i * num1, dot = (r) => { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(X + .5 * num2, Y + .5 * num1, r, 0, 7); ctx.fill(); };
    const ln = (col, x1, y1, x2, y2) => { ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
    if (v === 1) dot(4); if (v === 2 && !flicker) dot(10);
    if (v === 3) ln(color, X + .5 * num2, Y, X + .5 * num2, Y + num1);
    if (v === 4) ln(color, X, Y + .5 * num1, X + num2, Y + .5 * num1);
    ctx.strokeStyle = color; ctx.lineWidth = 3;
    if (v === 5) pg_arc(X - num2 * .4 - 2, Y + .5 * num1, num2, num1, 0, PI / 2);
    if (v === 6) pg_arc(X + num2 * .5, Y + .5 * num1, num2, num1, PI / 2, PI);
    if (v === 7) pg_arc(X + num2 * .5, Y - .4 * num1, num2, num1, PI, 3 * PI / 2);
    if (v === 8) pg_arc(X - num2 * .4 - 2, Y - .4 * num1, num2, num1, 3 * PI / 2, 2 * PI);
    if (v === 9) ln('#fff', X, Y + .5 * num1, X + num2, Y + .5 * num1);
  }
}
function draw_player() { // 0 right, 1 left, 2 up, 3 down
  const img = IMGS.p[fl(counter / 5)], cx = player_x + 22.5, cy = player_y + 22.5; ctx.save(); ctx.translate(cx, cy);
  if (direction === 1) ctx.scale(-1, 1); else if (direction === 2) ctx.rotate(-PI / 2); else if (direction === 3) ctx.rotate(PI / 2);
  ctx.drawImage(img, -22.5, -22.5, 45, 45); ctx.restore();
}
function check_position(centerx, centery) {
  const turns = [false, false, false, false], num1 = fl((HEIGHT - 50) / 32), num2 = fl(WIDTH / 30), num3 = 15;
  if (fl(centerx / 30) < 29) {
    if (direction === 0 && LV(fl(centery / num1), fl((centerx - num3) / num2)) < 3) turns[1] = true;
    if (direction === 1 && LV(fl(centery / num1), fl((centerx + num3) / num2)) < 3) turns[0] = true;
    if (direction === 2 && LV(fl((centery + num3) / num1), fl(centerx / num2)) < 3) turns[3] = true;
    if (direction === 3 && LV(fl((centery - num3) / num1), fl(centerx / num2)) < 3) turns[2] = true;
    const mx = mod(centerx, num2), my = mod(centery, num1);
    if (direction === 2 || direction === 3) {
      if (12 <= mx && mx <= 18) {
        if (LV(fl((centery + num3) / num1), fl(centerx / num2)) < 3) turns[3] = true;
        if (LV(fl((centery - num3) / num1), fl(centerx / num2)) < 3) turns[2] = true;
      }
      if (12 <= my && my <= 18) {
        if (LV(fl(centery / num1), fl((centerx - num2) / num2)) < 3) turns[1] = true;
        if (LV(fl(centery / num1), fl((centerx + num2) / num2)) < 3) turns[0] = true;
      }
    }
    if (direction === 0 || direction === 1) {
      if (12 <= mx && mx <= 18) {
        if (LV(fl((centery + num1) / num1), fl(centerx / num2)) < 3) turns[3] = true;
        if (LV(fl((centery - num1) / num1), fl(centerx / num2)) < 3) turns[2] = true;
      }
      if (12 <= my && my <= 18) {
        if (LV(fl(centery / num1), fl((centerx - num3) / num2)) < 3) turns[1] = true;
        if (LV(fl(centery / num1), fl((centerx + num3) / num2)) < 3) turns[0] = true;
      }
    }
  } else { turns[0] = true; turns[1] = true; }
  return turns;
}
function move_player(px, py) {
  if (direction === 0 && turns_allowed[0]) px += player_speed; else if (direction === 1 && turns_allowed[1]) px -= player_speed;
  if (direction === 2 && turns_allowed[2]) py -= player_speed; else if (direction === 3 && turns_allowed[3]) py += player_speed;
  return [px, py];
}
function check_collisions_player(scor, power, power_count, eaten) {
  const num1 = fl((HEIGHT - 50) / 32), num2 = fl(WIDTH / 30);
  if (0 < player_x && player_x < 870) {
    const r = fl(center_y / num1), c = fl(center_x / num2);
    if (level[r][c] === 1) { level[r][c] = 0; scor += 10; }
    if (level[r][c] === 2) { level[r][c] = 0; scor += 50; power = true; power_count = 0; eaten = [false, false, false, false]; }
  }
  return [scor, power, power_count, eaten];
}
function get_targets(bx, by, ix, iy, px, py, cx, cy) {
  const runaway_x = player_x < 450 ? 900 : 0, runaway_y = player_y < 450 ? 900 : 0, ret = [380, 400], inBox = (x, y) => 340 < x && x < 560 && 340 < y && y < 500;
  const P = [player_x, player_y], gs = [[blinky, bx, by, [runaway_x, runaway_y]], [inky, ix, iy, [runaway_x, player_y]], [pinky, px, py, [player_x, runaway_y]], [clyde, cx, cy, [450, 450]]];
  return gs.map(([g, x, y, run], i) => {
    if (powerup) {
      if (!g.dead && !eaten_ghost[i]) return run;
      if (!g.dead && eaten_ghost[i]) return inBox(x, y) ? [400, 100] : P;
      return ret;
    }
    if (!g.dead) return inBox(x, y) ? [400, 100] : P;
    return ret;
  });
}
function draw_start_screen() {
  start_blink = (start_blink + 1) % 60; ctx.fillStyle = BG; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  rrect(55, 55, WIDTH - 110, HEIGHT - 135, 25, 0, CYAN, 3); rrect(70, 70, WIDTH - 140, HEIGHT - 165, 20, 0, PANEL_2, 2);
  draw_text('PAC-MAN', F(48), WIDTH / 2, 155, YELLOW, true); draw_text('NEON MAZE', F(34), WIDTH / 2, 210, CYAN, true);
  blit(IMGS.p[0], 330 - 35, 315 - 35, 70, 70);
  [IMGS.red, IMGS.pink, IMGS.blue, IMGS.orange].forEach((im, i) => blit(im, 430 + i * 65 - 27.5, 315 - 27.5, 55, 55));
  rounded_panel(205, 390, 490, 105, PANEL, CYAN, 18, 2); draw_text('ARROW KEYS', F(22), 450, 420, WHITE, true); draw_text('MOVE THROUGH THE MAZE', F(16), 450, 455, MUTED, true);
  rounded_panel(250, 535, 400, 65, PANEL_2, YELLOW, 16, 2); if (start_blink < 45) draw_text('PRESS SPACE TO START', F(22), 450, 568, YELLOW, true);
  draw_text('Eat pellets • Collect power-ups • Escape the ghosts', F(16), 450, 665, MUTED, true); draw_text('3 LIVES', F(16), 450, 700, RED, true);
}

// ---------- game loop (one call = one iteration of the Python while-loop) ----------
const evq = [];
function resetPositions() {
  player_x = 450; player_y = 663; direction = 0; direction_command = 0;
  blinky_x = 440; blinky_y = 388; blinky_direction = 0; inky_x = 440; inky_y = 388; inky_direction = 2;
  pinky_x = 440; pinky_y = 438; pinky_direction = 2; clyde_x = 440; clyde_y = 438; clyde_direction = 2;
  eaten_ghost = [false, false, false, false]; blinky_dead = inky_dead = clyde_dead = pinky_dead = false;
}
function loseLife() {
  if (lives > 0) { powerup = false; power_counter = 0; lives--; startup_counter = 0; resetPositions(); }
  else { game_over = true; moving = false; startup_counter = 0; }
}
const hitR = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
function fullReset() {
  powerup = false; power_counter = 0; startup_counter = 0; resetPositions(); score = 0; lives = 3;
  level = JSON.parse(JSON.stringify(BOARDS)); game_over = false; game_won = false;
}
function stepFrame() {
  if (show_start_screen) {
    draw_start_screen();
    for (const [t, k] of evq.splice(0)) if (t === 'd' && (k === 'Space' || k === 'Enter')) { show_start_screen = false; startup_counter = 0; }
    return;
  }
  if (counter < 19) { counter++; if (counter > 3) flicker = false; } else { counter = 0; flicker = true; }
  if (powerup && power_counter < 600) power_counter++;
  else if (powerup && power_counter >= 600) { power_counter = 0; powerup = false; eaten_ghost = [false, false, false, false]; }
  if (startup_counter < 180 && !game_over && !game_won) { moving = false; startup_counter++; } else moving = true;
  ctx.fillStyle = BG; ctx.fillRect(0, 0, WIDTH, HEIGHT); draw_game_title(); draw_board();
  center_x = player_x + 23; center_y = player_y + 24;
  ghost_speeds = powerup ? [1, 1, 1, 1] : [2, 2, 2, 2];
  eaten_ghost.forEach((e, i) => { if (e) ghost_speeds[i] = 2; });
  [blinky_dead, inky_dead, pinky_dead, clyde_dead].forEach((d, i) => { if (d) ghost_speeds[i] = 4; });
  game_won = !level.some(row => row.includes(1) || row.includes(2));
  const player_circle = { x: center_x - 20, y: center_y - 20, w: 40, h: 40 };
  ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(center_x, center_y, 19, 0, 7); ctx.stroke();
  draw_player();
  blinky = new Ghost(blinky_x, blinky_y, targets[0], ghost_speeds[0], IMGS.red, blinky_direction, blinky_dead, blinky_box, 0);
  inky = new Ghost(inky_x, inky_y, targets[1], ghost_speeds[1], IMGS.blue, inky_direction, inky_dead, inky_box, 1);
  pinky = new Ghost(pinky_x, pinky_y, targets[2], ghost_speeds[2], IMGS.pink, pinky_direction, pinky_dead, pinky_box, 2);
  clyde = new Ghost(clyde_x, clyde_y, targets[3], ghost_speeds[3], IMGS.orange, clyde_direction, clyde_dead, clyde_box, 3);
  draw_misc();
  targets = get_targets(blinky_x, blinky_y, inky_x, inky_y, pinky_x, pinky_y, clyde_x, clyde_y);
  turns_allowed = check_position(center_x, center_y);
  if (moving) {
    [player_x, player_y] = move_player(player_x, player_y);
    if (!blinky_dead && !blinky.in_box) [blinky_x, blinky_y, blinky_direction] = blinky.move_blinky(); else [blinky_x, blinky_y, blinky_direction] = blinky.move_clyde();
    if (!pinky_dead && !pinky.in_box) [pinky_x, pinky_y, pinky_direction] = pinky.move_pinky(); else [pinky_x, pinky_y, pinky_direction] = pinky.move_clyde();
    if (!inky_dead && !inky.in_box) [inky_x, inky_y, inky_direction] = inky.move_inky(); else [inky_x, inky_y, inky_direction] = inky.move_clyde();
    [clyde_x, clyde_y, clyde_direction] = clyde.move_clyde();
  }
  [score, powerup, power_counter, eaten_ghost] = check_collisions_player(score, powerup, power_counter, eaten_ghost);
  const gh = [blinky, inky, pinky, clyde];
  if (!powerup) { if (gh.some(g => hitR(player_circle, g.rect) && !g.dead)) loseLife(); }
  gh.forEach((g, i) => { if (powerup && hitR(player_circle, g.rect) && eaten_ghost[i] && !g.dead) loseLife(); });
  const deadFlags = () => [blinky_dead, inky_dead, pinky_dead, clyde_dead];
  gh.forEach((g, i) => {
    if (powerup && hitR(player_circle, g.rect) && !g.dead && !eaten_ghost[i]) {
      if (i === 0) blinky_dead = true; else if (i === 1) inky_dead = true; else if (i === 2) pinky_dead = true; else clyde_dead = true;
      eaten_ghost[i] = true; score += (2 ** eaten_ghost.filter(Boolean).length) * 100;
    }
  });
  for (const [t, k] of evq.splice(0)) {
    if (t === 'd') {
      if (k === 'ArrowRight') direction_command = 0; if (k === 'ArrowLeft') direction_command = 1; if (k === 'ArrowUp') direction_command = 2; if (k === 'ArrowDown') direction_command = 3;
      if (k === 'Space' && (game_over || game_won)) fullReset();
    } else {
      if (k === 'ArrowRight' && direction_command === 0) direction_command = direction; if (k === 'ArrowLeft' && direction_command === 1) direction_command = direction;
      if (k === 'ArrowUp' && direction_command === 2) direction_command = direction; if (k === 'ArrowDown' && direction_command === 3) direction_command = direction;
    }
  }
  for (let d = 0; d < 4; d++) if (direction_command === d && turns_allowed[d]) direction = d;
  if (player_x > 900) player_x = -47; else if (player_x < -50) player_x = 897;
  if (blinky.in_box && blinky_dead) blinky_dead = false; if (inky.in_box && inky_dead) inky_dead = false;
  if (pinky.in_box && pinky_dead) pinky_dead = false; if (clyde.in_box && clyde_dead) clyde_dead = false;
}

(async function main() {
  const canvas = document.getElementById('game'), msg = document.getElementById('loading'); ctx = canvas.getContext('2d');
  const load = f => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(f); i.src = 'assets/' + f; });
  try {
    IMGS.p = await Promise.all([1, 2, 3, 4].map(i => load(`player${i}.png`)));
    for (const n of ['red', 'pink', 'blue', 'orange', 'powerup', 'dead']) IMGS[n] = await load(n + '.png');
  } catch (f) { msg.textContent = 'Failed to load asset: ' + f; return; }
  msg.remove();
  const ARROWS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Enter'];
  addEventListener('keydown', e => {
    if (ARROWS.includes(e.code)) e.preventDefault(); if (e.repeat) return;
    if (e.code === 'KeyF') { toggleFullscreen(); return; }
    if (show_start_screen && (e.code === 'Space' || e.code === 'Enter')) goFullscreen();
    evq.push(['d', e.code]);
  });
  addEventListener('keyup', e => evq.push(['u', e.code]));
  const $ = id => document.getElementById(id);
  $('fs').onclick = e => { e.target.blur(); toggleFullscreen(); };
  $('restart').onclick = e => { e.target.blur(); if (!show_start_screen) fullReset(); };
  let last = performance.now(), acc = 0; const STEP = 1000 / 60;
  (function frame(t) {
    acc += Math.min(t - last, 100); last = t;
    while (acc >= STEP) { stepFrame(); acc -= STEP; }
    $('score').textContent = score.toLocaleString('en-US'); $('lives').textContent = lives;
    requestAnimationFrame(frame);
  })(last);
})();
