// ─── Constants ────────────────────────────────────────────────────────────────

const W = 256, H = 224;

const GRAVITY    = 0.38;
const JUMP_VEL   = -8.5;
const MOVE_SPEED = 2.0;
const SKIN_SPEED = 1.8;
const SKIN_INTERVAL = 140; // frames between banana skin throws per chimp

// ─── Audio (Web Audio API) ────────────────────────────────────────────────────

let audioCtx = null;

function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, duration, type = 'square', vol = 0.15, freqEnd = null) {
  try {
    const ctx = ensureAudio();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (freqEnd !== null)
      osc.frequency.linearRampToValueAtTime(freqEnd, ctx.currentTime + duration);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (_) {}
}

function sfxJump()    { playTone(380, 0.09, 'square', 0.08, 460); }
function sfxCollect() { playTone(660, 0.07, 'sine', 0.12); setTimeout(() => playTone(880, 0.1, 'sine', 0.12), 70); }
function sfxLife()    { [330, 440, 550, 660, 880].forEach((f, i) => setTimeout(() => playTone(f, 0.15, 'sine', 0.18), i * 80)); }
function sfxDie()     { playTone(320, 0.1, 'sawtooth', 0.2, 160); setTimeout(() => playTone(160, 0.25, 'sawtooth', 0.2, 80), 100); }
function sfxWin()     { [523, 659, 784, 880, 1047].forEach((f, i) => setTimeout(() => playTone(f, 0.18, 'sine', 0.2), i * 110)); }
function sfxSlip()    { playTone(400, 0.08, 'square', 0.1, 200); }

// Ambient jungle chirp
let ambientTimer = 0;
function tickAmbient() {
  if (!audioCtx || state.screen !== 'play') return;
  ambientTimer--;
  if (ambientTimer <= 0) {
    ambientTimer = 90 + Math.floor(Math.random() * 120);
    const freqs = [800, 1000, 1200, 600];
    playTone(freqs[Math.floor(Math.random() * freqs.length)], 0.05, 'sine', 0.04);
  }
}

// ─── Level ────────────────────────────────────────────────────────────────────

function buildLevel() {
  // Platforms (horizontal branches). Path zigzags diagonally up:
  // P0 bottom-left → jump right to P1 → jump left to P2 → jump right to P3
  //   → jump left to P4 → jump right to P5 → jump left to P6 (goal)
  const platforms = [
    { x: 5,   y: 200, w: 72 },  // P0 – start (bottom-left, family tree)
    { x: 108, y: 168, w: 62 },  // P1 – jump right ↗
    { x: 18,  y: 136, w: 64 },  // P2 – jump left ↖
    { x: 130, y: 104, w: 68 },  // P3 – jump right ↗
    { x: 8,   y: 72,  w: 64 },  // P4 – jump left ↖
    { x: 152, y: 40,  w: 78 },  // P5 – jump right ↗ (chimp HQ)
    { x: 8,   y: 14,  w: 56 },  // P6 – goal platform (top-left)
  ];

  // Vines: vertical ladders between platforms
  const ladders = [
    { x: 156, y1: 168, y2: 202 }, // P0 right → P1 right
    { x: 22,  y1: 136, y2: 168 }, // P1 left  → P2 left
    { x: 168, y1: 104, y2: 136 }, // P2 right → P3 right
    { x: 12,  y1: 72,  y2: 104 }, // P3 left  → P4 left
    { x: 186, y1: 40,  y2: 72  }, // P4 right → P5 right
    { x: 14,  y1: 14,  y2: 40  }, // P5 left  → P6 left
  ];

  // Bananas spread evenly on each platform
  const bananas = [];
  const addBananas = (px, py, pw, count) => {
    const step = pw / (count + 1);
    for (let i = 1; i <= count; i++) {
      bananas.push({ x: px + step * i - 4, y: py - 14, w: 8, h: 14, collected: false, angle: 0 });
    }
  };
  addBananas(5, 200, 72, 2);
  addBananas(108, 168, 62, 3);
  addBananas(18, 136, 64, 3);
  addBananas(130, 104, 68, 4);
  addBananas(8, 72, 64, 3);
  addBananas(152, 40, 78, 5);

  // Chimps (on P1, P3, and two on P5)
  const chimps = [
    { x: 155, y: 152, w: 14, h: 16, dir: -1, timer: 40  },  // P1
    { x: 170, y: 88,  w: 14, h: 16, dir: -1, timer: 10  },  // P3
    { x: 160, y: 24,  w: 14, h: 16, dir: -1, timer: 70  },  // P5 (left)
    { x: 198, y: 24,  w: 14, h: 16, dir: -1, timer: 20  },  // P5 (right)
  ];

  // Extra-life boxes (golden "+" boxes)
  const lifeBoxes = [
    { x: 195, y: 154, w: 14, h: 14, collected: false },  // on P1
    { x: 50,  y: 58,  w: 14, h: 14, collected: false },  // on P4
  ];

  // Goal basket (top-left corner, above P6)
  const basket = { x: 10, y: 0, w: 28, h: 14 };

  return { platforms, ladders, bananas, chimps, lifeBoxes, basket };
}

// ─── State ────────────────────────────────────────────────────────────────────

let state;

function initState() {
  const lvl = buildLevel();
  state = {
    screen: 'title',
    score: 0,
    lives: 3,
    player: {
      x: 10, y: 178,
      vx: 0, vy: 0,
      w: 12, h: 18,
      onGround: false,
      onLadder: false,
      facingRight: true,
      frame: 0, frameTimer: 0,
    },
    ...lvl,
    skins: [],
    frameCount: 0,
  };
}

// ─── Input ────────────────────────────────────────────────────────────────────

const keys  = {};
const touch = { left: false, right: false, jump: false };

document.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.code === 'Space' || e.code === 'Enter') {
    ensureAudio();
    if (state.screen !== 'play') startOrRestart();
  }
});
document.addEventListener('keyup', e => { keys[e.code] = false; });

function startOrRestart() {
  if      (state.screen === 'title')                      state.screen = 'play';
  else if (state.screen === 'gameover' || state.screen === 'win') { initState(); state.screen = 'play'; }
  else if (state.screen === 'dead')                       respawn();
}

function respawn() {
  const p = state.player;
  p.x = 10; p.y = 178; p.vx = 0; p.vy = 0;
  p.onGround = false; p.onLadder = false;
  state.screen = 'play';
}

// ─── Physics ──────────────────────────────────────────────────────────────────

function rectOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function updatePlayer() {
  const p = state.player;
  const left  = keys['ArrowLeft']  || keys['KeyA'] || touch.left;
  const right = keys['ArrowRight'] || keys['KeyD'] || touch.right;
  const jump  = keys['Space'] || keys['ArrowUp'] || keys['KeyW'] || touch.jump;
  const up    = keys['ArrowUp']   || keys['KeyW'];
  const down  = keys['ArrowDown'] || keys['KeyS'];

  // Check ladder overlap
  p.onLadder = false;
  for (const l of state.ladders) {
    if (rectOverlap(p.x, p.y, p.w, p.h, l.x - 6, l.y1, 12, l.y2 - l.y1)) {
      p.onLadder = true; break;
    }
  }

  if (p.onLadder) {
    p.vx = 0;
    p.vy = up ? -MOVE_SPEED : down ? MOVE_SPEED : 0;
  } else {
    p.vx = left ? -MOVE_SPEED : right ? MOVE_SPEED : 0;
    p.vy += GRAVITY;
  }

  if (left)  p.facingRight = false;
  if (right) p.facingRight = true;

  // Jump
  if (jump && p.onGround && !p.onLadder) {
    p.vy = JUMP_VEL;
    p.onGround = false;
    sfxJump();
  }

  // Move X
  p.x = Math.max(0, Math.min(W - p.w, p.x + p.vx));

  // Move Y
  p.y += p.vy;

  // Platform landing
  p.onGround = false;
  for (const pl of state.platforms) {
    if (p.x + p.w > pl.x && p.x < pl.x + pl.w) {
      const foot = p.y + p.h, prevFoot = foot - p.vy;
      if (p.vy >= 0 && prevFoot <= pl.y + 2 && foot >= pl.y) {
        p.y = pl.y - p.h; p.vy = 0; p.onGround = true;
      }
    }
  }

  if (p.y > H + 30) { die(); return; }

  // Walk animation
  const moving = Math.abs(p.vx) > 0 || (p.onLadder && Math.abs(p.vy) > 0);
  if (moving) { if (++p.frameTimer >= 7) { p.frameTimer = 0; p.frame = (p.frame + 1) % 2; } }
  else p.frame = 0;
}

function updateBananas() {
  const p = state.player;
  for (const b of state.bananas) {
    if (b.collected) continue;
    b.angle += 0.06;
    if (rectOverlap(p.x, p.y, p.w, p.h, b.x, b.y, b.w, b.h)) {
      b.collected = true; state.score += 100; sfxCollect();
    }
  }
}

function updateLifeBoxes() {
  const p = state.player;
  for (const lb of state.lifeBoxes) {
    if (lb.collected) continue;
    if (rectOverlap(p.x, p.y, p.w, p.h, lb.x, lb.y, lb.w, lb.h)) {
      lb.collected = true; state.lives = Math.min(5, state.lives + 1); sfxLife();
    }
  }
}

function updateChimps() {
  for (const c of state.chimps) {
    if (++c.timer >= SKIN_INTERVAL) {
      c.timer = 0;
      const pl = state.platforms.find(p => Math.abs((c.y + c.h) - p.y) < 10 && c.x + c.w > p.x && c.x < p.x + p.w);
      if (pl) {
        state.skins.push({
          x: c.x + c.w / 2 - 6,
          y: pl.y - 7,
          w: 12, h: 7,
          vx: c.dir * SKIN_SPEED, vy: 0,
        });
      }
    }
  }
}

function updateSkins() {
  const p = state.player;
  for (let i = state.skins.length - 1; i >= 0; i--) {
    const s = state.skins[i];
    s.x += s.vx;
    s.vy += GRAVITY;
    s.y += s.vy;

    for (const pl of state.platforms) {
      if (s.x + s.w > pl.x && s.x < pl.x + pl.w) {
        const foot = s.y + s.h, prev = foot - s.vy;
        if (s.vy >= 0 && prev <= pl.y + 2 && foot >= pl.y) {
          s.y = pl.y - s.h; s.vy = 0;
        }
      }
    }

    if (s.x < -20 || s.x > W + 20 || s.y > H + 20) { state.skins.splice(i, 1); continue; }
    if (state.screen === 'play' && rectOverlap(p.x, p.y, p.w, p.h, s.x, s.y, s.w, s.h)) { die(); return; }
  }
}

function checkBasket() {
  const p = state.player, b = state.basket;
  if (rectOverlap(p.x, p.y, p.w, p.h, b.x, b.y, b.w, b.h)) { state.screen = 'win'; sfxWin(); }
}

function die() {
  if (state.screen !== 'play') return;
  sfxDie(); sfxSlip();
  state.lives--;
  state.skins = [];
  state.screen = state.lives <= 0 ? 'gameover' : 'dead';
}

// ─── Sprites & Drawing ────────────────────────────────────────────────────────

// Jungle background with trees, vines, canopy
function drawJungleBackground(ctx) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#060e06');
  grad.addColorStop(0.5, '#0d1f0d');
  grad.addColorStop(1, '#152a10');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Background tree trunks (large, behind everything)
  const bgTrees = [
    { x: 2,   w: 14, top: 0  },
    { x: 92,  w: 10, top: 18 },
    { x: 148, w: 12, top: 10 },
    { x: 222, w: 10, top: 22 },
  ];
  for (const t of bgTrees) {
    ctx.fillStyle = '#2a1408';
    ctx.fillRect(t.x, t.top, t.w, H - t.top);
    // Bark texture
    ctx.fillStyle = '#1e0e04';
    for (let y = t.top + 8; y < H; y += 16) {
      ctx.fillRect(t.x + 2, y, t.w - 4, 3);
    }
    ctx.fillStyle = '#3a1e08';
    for (let y = t.top + 16; y < H; y += 16) {
      ctx.fillRect(t.x + 1, y, t.w - 2, 1);
    }
    // Canopy blob
    ctx.fillStyle = '#0e2e0e';
    ctx.beginPath(); ctx.ellipse(t.x + t.w/2, t.top + 6, t.w + 14, 22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#163a14';
    ctx.beginPath(); ctx.ellipse(t.x + t.w/2, t.top, t.w + 8, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1e4a1a';
    ctx.beginPath(); ctx.ellipse(t.x + t.w/2, t.top - 5, t.w + 4, 9, 0, 0, Math.PI * 2); ctx.fill();
  }

  // Hanging background vines (decorative, semi-transparent)
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = '#1a4a0a';
  ctx.lineWidth = 1.5;
  for (let vx = 44; vx < W; vx += 52) {
    ctx.beginPath();
    ctx.moveTo(vx, 0);
    ctx.bezierCurveTo(vx - 12, 45, vx + 12, 85, vx + 4, 130);
    ctx.stroke();
    ctx.fillStyle = '#1a4a0a';
    for (let vy = 18; vy < 130; vy += 22) {
      ctx.beginPath();
      ctx.ellipse(vx + (vy % 44 < 22 ? 6 : -6), vy, 5, 3, Math.PI / 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // Ground strip
  ctx.fillStyle = '#0e2206';
  ctx.fillRect(0, 210, W, H - 210);
  ctx.fillStyle = '#1a3a08';
  ctx.fillRect(0, 208, W, 3);
  // Grass tufts
  ctx.fillStyle = '#2a5a10';
  for (let gx = 4; gx < W; gx += 9) {
    ctx.fillRect(gx, 205, 3, 5);
    ctx.fillRect(gx + 2, 203, 2, 4);
  }
}

// Game vines (interactive ladders)
function drawVines(ctx) {
  for (const l of state.ladders) {
    const len = l.y2 - l.y1;
    // Left strand
    ctx.strokeStyle = '#3a7a1a';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(l.x - 3, l.y1); ctx.lineTo(l.x - 3, l.y2); ctx.stroke();
    // Right strand
    ctx.beginPath(); ctx.moveTo(l.x + 3, l.y1); ctx.lineTo(l.x + 3, l.y2); ctx.stroke();
    // Rungs
    ctx.fillStyle = '#5aaa2a';
    for (let y = l.y1 + 6; y < l.y2 - 2; y += 7) {
      ctx.fillRect(l.x - 5, y, 10, 2);
    }
    // Leaves on the vine
    ctx.fillStyle = '#2d6a14';
    for (let i = 0; i * 7 < len; i++) {
      const y = l.y1 + i * 7 + 3;
      const side = i % 2 === 0 ? 1 : -1;
      ctx.beginPath();
      ctx.ellipse(l.x + side * 8, y, 5, 2.5, Math.PI * (0.1 * side + 0.15), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// Branch platform with bark texture and leaf fringe
function drawBranch(ctx, pl) {
  const { x, y, w } = pl;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(x + 3, y + 8, w - 2, 4);

  // Main branch body
  ctx.fillStyle = '#5c3a0e';
  ctx.fillRect(x, y, w, 8);

  // Bark highlight (top)
  ctx.fillStyle = '#7a4e16';
  ctx.fillRect(x, y, w, 3);

  // Bark groove lines
  ctx.fillStyle = '#3e2408';
  for (let bx = x + 8; bx < x + w - 6; bx += 14) {
    ctx.fillRect(bx, y + 2, 8, 2);
    ctx.fillRect(bx + 4, y + 5, 5, 2);
  }

  // Leaf fringe on top
  ctx.fillStyle = '#2a6a14';
  for (let lx = x; lx < x + w; lx += 8) {
    ctx.fillRect(lx, y - 4, 7, 4);
  }
  ctx.fillStyle = '#3a8a20';
  for (let lx = x + 3; lx < x + w - 5; lx += 8) {
    ctx.fillRect(lx, y - 6, 4, 3);
  }
  // Leaves slightly varied colour
  ctx.fillStyle = '#206010';
  for (let lx = x + 6; lx < x + w - 6; lx += 16) {
    ctx.fillRect(lx, y - 5, 5, 4);
  }
}

// Curved banana using bezier
function drawBanana(ctx, b) {
  ctx.save();
  ctx.translate(b.x + 4, b.y + 7);
  ctx.rotate(b.angle);

  // Drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(1, 7, 5, 2, 0, 0, Math.PI * 2); ctx.fill();

  // Banana body (dark outline / shadow pass)
  ctx.beginPath();
  ctx.moveTo(-4, 6);
  ctx.bezierCurveTo(-8, 0, -6, -6, -1, -7);
  ctx.bezierCurveTo(4, -8, 7, -3, 6, 3);
  ctx.strokeStyle = '#c49000';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Main yellow fill
  ctx.beginPath();
  ctx.moveTo(-4, 6);
  ctx.bezierCurveTo(-8, 0, -6, -6, -1, -7);
  ctx.bezierCurveTo(4, -8, 7, -3, 6, 3);
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 5;
  ctx.stroke();

  // Highlight ridge
  ctx.beginPath();
  ctx.moveTo(-3, 5);
  ctx.bezierCurveTo(-6, 0, -4, -5, 0, -6);
  ctx.bezierCurveTo(3, -7, 6, -2, 5, 2);
  ctx.strokeStyle = '#fff7a0';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Stem (green)
  ctx.fillStyle = '#3a6a00';
  ctx.fillRect(-6, 5, 4, 4);
  ctx.fillStyle = '#4a8a00';
  ctx.fillRect(-5, 5, 2, 3);

  ctx.restore();
}

// Banana skin hazard
function drawSkin(ctx, s) {
  ctx.save();
  ctx.translate(s.x + s.w / 2, s.y + s.h / 2);

  ctx.fillStyle = '#9a7200';
  ctx.beginPath();
  ctx.moveTo(-6, -3);
  ctx.quadraticCurveTo(-4, 4, 6, 3);
  ctx.quadraticCurveTo(4, -4, -6, -3);
  ctx.fill();

  ctx.strokeStyle = '#6a5000';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-3, -3); ctx.quadraticCurveTo(-1, 3, 2, 3); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(1,  -2); ctx.quadraticCurveTo(3,  3, 5, 3); ctx.stroke();

  ctx.restore();
}

// Woven basket (goal)
function drawBasket(ctx, b) {
  // Handle
  ctx.strokeStyle = '#8a6030';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(b.x + b.w / 2, b.y + 7, b.w / 2 - 3, Math.PI, 0);
  ctx.stroke();

  // Body
  ctx.fillStyle = '#c4a46c';
  ctx.fillRect(b.x, b.y + 7, b.w, b.h - 7);

  // Weave
  ctx.fillStyle = '#9a7840';
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(b.x, b.y + 7 + i * 3, b.w, 1);
  }
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(b.x + i * 7, b.y + 7, 1, b.h - 7);
  }

  // Bananas overflowing
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(b.x + 3, b.y + 1, 5, 9);
  ctx.fillRect(b.x + 10, b.y + 3, 5, 7);
  ctx.fillRect(b.x + 18, b.y + 1, 5, 8);
  ctx.fillStyle = '#ffe566';
  ctx.fillRect(b.x + 4, b.y + 2, 3, 6);
  ctx.fillRect(b.x + 11, b.y + 4, 3, 4);
  ctx.fillStyle = '#3a6a00';
  ctx.fillRect(b.x + 3, b.y + 1, 2, 2);
  ctx.fillRect(b.x + 10, b.y + 3, 2, 2);
  ctx.fillRect(b.x + 18, b.y + 1, 2, 2);
}

// Extra-life "+" box
function drawLifeBox(ctx, lb) {
  if (lb.collected) return;
  const pulse = 0.6 + 0.4 * Math.sin(state.frameCount * 0.12);
  // Glow
  ctx.fillStyle = `rgba(255,220,0,${pulse * 0.35})`;
  ctx.fillRect(lb.x - 3, lb.y - 3, lb.w + 6, lb.h + 6);

  ctx.fillStyle = '#7a3a10';
  ctx.fillRect(lb.x, lb.y, lb.w, lb.h);
  ctx.fillStyle = '#9a4e18';
  ctx.fillRect(lb.x + 1, lb.y + 1, lb.w - 2, 3);
  ctx.fillStyle = '#5a2808';
  ctx.fillRect(lb.x + 1, lb.y + lb.h - 3, lb.w - 2, 2);

  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 1;
  ctx.strokeRect(lb.x + 0.5, lb.y + 0.5, lb.w - 1, lb.h - 1);

  const cx = lb.x + lb.w / 2, cy = lb.y + lb.h / 2;
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(cx - 4, cy - 1, 8, 3);
  ctx.fillRect(cx - 1, cy - 4, 3, 8);
}

// Pixel-art gorilla (player)
function drawGorilla(ctx, p) {
  ctx.save();
  ctx.translate(p.facingRight ? p.x : p.x + p.w, p.y);
  if (!p.facingRight) ctx.scale(-1, 1);

  const B = '#5C3A1E', T = '#A0724A', D = '#3a2010';
  const jumping = !p.onGround && !p.onLadder;
  const f = p.frame;

  // Ears
  ctx.fillStyle = B;
  ctx.fillRect(1, 2, 3, 3); ctx.fillRect(8, 2, 3, 3);
  ctx.fillStyle = T;
  ctx.fillRect(2, 3, 2, 2); ctx.fillRect(9, 3, 2, 2);

  // Head
  ctx.fillStyle = B;
  ctx.fillRect(2, 0, 8, 7);
  ctx.fillStyle = T;
  ctx.fillRect(3, 2, 6, 4);
  // Brow ridge
  ctx.fillStyle = D;
  ctx.fillRect(3, 1, 6, 1);
  // Eyes
  ctx.fillStyle = '#1a0e06';
  ctx.fillRect(4, 2, 2, 2); ctx.fillRect(7, 2, 2, 2);
  ctx.fillStyle = '#fff';
  ctx.fillRect(4, 2, 1, 1); ctx.fillRect(7, 2, 1, 1);
  // Nostrils
  ctx.fillStyle = D;
  ctx.fillRect(5, 5, 1, 1); ctx.fillRect(7, 5, 1, 1);

  // Body
  ctx.fillStyle = B;
  ctx.fillRect(2, 7, 8, 8);
  ctx.fillStyle = T;
  ctx.fillRect(3, 8, 6, 6);

  // Arms
  ctx.fillStyle = B;
  if (jumping) {
    ctx.fillRect(0, 5, 2, 4); ctx.fillRect(10, 5, 2, 4);
  } else {
    ctx.fillRect(0, 8, 2, 5); ctx.fillRect(10, 8, 2, 5);
  }

  // Legs
  if (jumping) {
    ctx.fillRect(2, 15, 4, 3); ctx.fillRect(6, 15, 4, 3);
  } else if (f === 0) {
    ctx.fillRect(2, 15, 4, 5); ctx.fillRect(6, 15, 4, 3); ctx.fillRect(6, 17, 4, 3);
  } else {
    ctx.fillRect(2, 15, 4, 3); ctx.fillRect(2, 17, 4, 3); ctx.fillRect(6, 15, 4, 5);
  }

  ctx.restore();
}

// Pixel-art chimpanzee (enemy)
function drawChimp(ctx, c) {
  ctx.save();
  ctx.translate(c.x, c.y);
  const C = '#7B5B3A', T = '#c49060', D = '#4a3020';
  const armRaised = Math.floor(state.frameCount / 22) % 2 === 0;

  // Ears
  ctx.fillStyle = C;
  ctx.fillRect(0, 2, 2, 4); ctx.fillRect(12, 2, 2, 4);
  // Head
  ctx.fillStyle = C;
  ctx.fillRect(1, 0, 12, 8);
  ctx.fillStyle = T;
  ctx.fillRect(2, 2, 10, 5);
  // Brow
  ctx.fillStyle = D;
  ctx.fillRect(2, 1, 10, 1);
  // Eyes
  ctx.fillStyle = '#1a0e06';
  ctx.fillRect(3, 2, 2, 2); ctx.fillRect(9, 2, 2, 2);
  ctx.fillStyle = '#fff';
  ctx.fillRect(3, 2, 1, 1); ctx.fillRect(9, 2, 1, 1);
  // Nostrils
  ctx.fillStyle = D;
  ctx.fillRect(5, 5, 1, 1); ctx.fillRect(8, 5, 1, 1);

  // Body
  ctx.fillStyle = C;
  ctx.fillRect(2, 8, 10, 7);
  ctx.fillStyle = T;
  ctx.fillRect(3, 9, 8, 5);

  // Arms
  ctx.fillStyle = C;
  ctx.fillRect(0, 8, 2, 5);
  ctx.fillRect(12, armRaised ? 5 : 8, 2, armRaised ? 4 : 5);

  // Legs (sitting)
  ctx.fillRect(2, 15, 4, 3); ctx.fillRect(8, 15, 4, 3);

  ctx.restore();
}

// Family gorillas at bottom-left
function drawFamily(ctx) {
  const members = [{ x: 12, y: 190 }, { x: 26, y: 193 }, { x: 44, y: 191 }];
  for (const g of members) {
    ctx.fillStyle = '#5C3A1E';
    ctx.fillRect(g.x, g.y, 10, 10);
    ctx.fillStyle = '#A0724A';
    ctx.fillRect(g.x + 2, g.y, 6, 4);
    ctx.fillRect(g.x + 2, g.y + 4, 6, 5);
    ctx.fillStyle = '#111';
    ctx.fillRect(g.x + 3, g.y + 1, 1, 1);
    ctx.fillRect(g.x + 6, g.y + 1, 1, 1);
  }
}

// HUD (score + lives)
function drawHUD(ctx) {
  ctx.font = '6px "Press Start 2P"';

  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(2, 2, 62, 18);
  ctx.fillStyle = '#FFD700';
  ctx.fillText('SCORE', 4, 10);
  ctx.fillStyle = '#fff';
  ctx.fillText(String(state.score).padStart(5, '0'), 4, 18);

  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(W - 64, 2, 62, 18);
  ctx.fillStyle = '#FFD700';
  ctx.fillText('LIVES', W - 62, 10);
  for (let i = 0; i < state.lives; i++) {
    ctx.fillStyle = '#5C3A1E';
    ctx.fillRect(W - 60 + i * 11, 12, 9, 7);
    ctx.fillStyle = '#A0724A';
    ctx.fillRect(W - 59 + i * 11, 15, 7, 3);
  }
}

// Title screen
function drawTitle(ctx) {
  ctx.fillStyle = '#060e06';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#0e2a0a';
  ctx.fillRect(0, 50, 16, H - 50);
  ctx.fillRect(W - 16, 40, 16, H - 40);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#0e3a0a';
  ctx.font = '18px "Press Start 2P"';
  ctx.fillText('BANANO', W / 2 + 2, 54);
  ctx.fillStyle = '#FFD700';
  ctx.fillText('BANANO', W / 2, 52);

  ctx.fillStyle = '#88cc88';
  ctx.font = '6px "Press Start 2P"';
  ctx.fillText('Help the gorilla reach', W / 2, 80);
  ctx.fillText('the banana basket!', W / 2, 92);

  ctx.fillStyle = '#555';
  ctx.font = '5px "Press Start 2P"';
  ctx.fillText('ARROWS or A/D — move', W / 2, 116);
  ctx.fillText('SPACE / W — jump', W / 2, 126);
  ctx.fillText('UP/DOWN — climb vines', W / 2, 136);
  ctx.fillText('Collect + boxes for extra lives!', W / 2, 148);

  if (Math.floor(state.frameCount / 30) % 2 === 0) {
    ctx.fillStyle = '#ffffff';
    ctx.font = '7px "Press Start 2P"';
    ctx.fillText('PRESS SPACE', W / 2, 168);
    ctx.fillText('TO START', W / 2, 180);
  }

  ctx.fillStyle = '#444';
  ctx.font = '5px "Press Start 2P"';
  ctx.fillText('← Back to Game Lab', W / 2, H - 7);
  ctx.textAlign = 'left';
}

function drawOverlay(ctx, title, color, prompt) {
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.font = '12px "Press Start 2P"';
  ctx.fillText(title, W / 2, H / 2 - 28);
  ctx.fillStyle = '#fff';
  ctx.font = '6px "Press Start 2P"';
  ctx.fillText('SCORE: ' + state.score, W / 2, H / 2 - 8);
  if (Math.floor(state.frameCount / 30) % 2 === 0) {
    ctx.fillStyle = '#aaffaa';
    ctx.fillText(prompt, W / 2, H / 2 + 18);
  }
  ctx.textAlign = 'left';
}

// ─── Render ───────────────────────────────────────────────────────────────────

function render(ctx) {
  ctx.imageSmoothingEnabled = false;

  if (state.screen === 'title') { drawTitle(ctx); return; }

  drawJungleBackground(ctx);
  drawVines(ctx);
  for (const pl of state.platforms) drawBranch(ctx, pl);

  drawFamily(ctx);
  drawBasket(ctx, state.basket);

  for (const b  of state.bananas)   if (!b.collected) drawBanana(ctx, b);
  for (const lb of state.lifeBoxes) drawLifeBox(ctx, lb);
  for (const c  of state.chimps)    drawChimp(ctx, c);
  for (const s  of state.skins)     drawSkin(ctx, s);

  drawGorilla(ctx, state.player);
  drawHUD(ctx);

  if (state.screen === 'dead') {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff5555';
    ctx.font = '10px "Press Start 2P"';
    ctx.fillText('OOPS!', W / 2, H / 2 - 10);
    if (Math.floor(state.frameCount / 30) % 2 === 0) {
      ctx.fillStyle = '#fff';
      ctx.font = '5px "Press Start 2P"';
      ctx.fillText('SPACE TO CONTINUE', W / 2, H / 2 + 12);
    }
    ctx.textAlign = 'left';
  }
  if (state.screen === 'gameover') drawOverlay(ctx, 'GAME OVER', '#ff5555', 'SPACE TO RETRY');
  if (state.screen === 'win')      drawOverlay(ctx, 'YOU WIN!',  '#FFD700', 'SPACE TO PLAY AGAIN');
}

// ─── Game Loop ────────────────────────────────────────────────────────────────

function gameLoop() {
  state.frameCount++;
  tickAmbient();

  if (state.screen === 'play') {
    updatePlayer();
    updateBananas();
    updateLifeBoxes();
    updateChimps();
    updateSkins();
    checkBasket();
  }

  const canvas = document.getElementById('game-canvas');
  render(canvas.getContext('2d'));
  requestAnimationFrame(gameLoop);
}

// ─── Canvas Scaling ───────────────────────────────────────────────────────────

function scaleCanvas() {
  const canvas = document.getElementById('game-canvas');
  const maxW = window.innerWidth  - 32;
  const maxH = window.innerHeight - 100;
  const scale = Math.max(1, Math.min(Math.floor(maxW / W), Math.floor(maxH / H)));
  canvas.style.width  = W * scale + 'px';
  canvas.style.height = H * scale + 'px';
}

// ─── Touch Controls ───────────────────────────────────────────────────────────

function setupTouch() {
  function bind(id, prop) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('touchstart', e => { e.preventDefault(); touch[prop] = true;  ensureAudio(); }, { passive: false });
    el.addEventListener('touchend',   e => { e.preventDefault(); touch[prop] = false; }, { passive: false });
    el.addEventListener('mousedown',  () => { touch[prop] = true;  ensureAudio(); });
    el.addEventListener('mouseup',    () => touch[prop] = false);
  }
  bind('btn-left',  'left');
  bind('btn-right', 'right');
  bind('btn-jump',  'jump');

  document.getElementById('btn-jump')?.addEventListener('touchstart', () => {
    if (state.screen !== 'play') startOrRestart();
  }, { passive: true });
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

window.addEventListener('load', () => {
  initState();
  scaleCanvas();
  window.addEventListener('resize', scaleCanvas);
  setupTouch();
  requestAnimationFrame(gameLoop);
});
