// ─── Constants ────────────────────────────────────────────────────────────────

const W = 512, H = 448;
const LEVEL_H = 1200;

const GRAVITY       = 0.76;
const JUMP_VEL      = -11;   
const MOVE_SPEED    = 4.0;
const SKIN_SPEED    = 1.8;   // was 2.4, slowed 25%
const SKIN_INTERVAL = 280;

// ─── Audio ────────────────────────────────────────────────────────────────────

let audioCtx = null;

function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, duration, type = 'square', vol = 0.15, freqEnd = null) {
  try {
    const ctx = ensureAudio();
    const osc = ctx.createOscillator(), gain = ctx.createGain();
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

function sfxJump()    { playTone(400, 0.08, 'sine', 0.1); }
function sfxCollect() {
  playTone(523, 0.08, 'sine', 0.14);
  setTimeout(() => playTone(659, 0.08, 'sine', 0.14), 80);
  setTimeout(() => playTone(784, 0.12, 'sine', 0.14), 160);
}
function sfxLife()    { [523,659,784,1047,1319].forEach((f,i)=>setTimeout(()=>playTone(f,0.1,'sine',0.18),i*70)); }
function sfxDie()     { playTone(600, 0.45, 'sawtooth', 0.22, 100); }
function sfxWin()     { [523,659,784,1047,1319,1568].forEach((f,i)=>setTimeout(()=>playTone(f,0.18,'sine',0.2),i*110)); }

// ─── African Music ────────────────────────────────────────────────────────────

const BPM  = 115;
const BEAT = 60 / BPM;
const S16  = BEAT / 4;

const P = {
  C3:130.81,Eb3:155.56,F3:174.61,G3:196.00,Bb3:233.08,
  C4:261.63,Eb4:311.13,F4:349.23,G4:392.00,Bb4:466.16,
  C5:523.25,
};

function playDjembe(when, freq, vol) {
  try {
    const ctx = ensureAudio();
    const len = Math.ceil(ctx.sampleRate * 0.25);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 3;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.18);
    src.connect(bp); bp.connect(gain); gain.connect(ctx.destination);
    src.start(when); src.stop(when + 0.25);
  } catch (_) {}
}

function playBass(when, freq) {
  try {
    const ctx = ensureAudio();
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, when);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.75, when + S16 * 1.8);
    gain.gain.setValueAtTime(0.18, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + S16 * 2);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(when); osc.stop(when + S16 * 2.1);
  } catch (_) {}
}

function playKalimba(when, freq) {
  try {
    const ctx = ensureAudio();
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = 'sine'; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.1, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.45);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(when); osc.stop(when + 0.5);
  } catch (_) {}
}

let musicPlaying = false;
let nextMeasureTime = 0;
let musicTimerHandle = null;

function scheduleMeasure(t0) {
  const kick = [1,0,0,0,1,0,1,0,1,0,0,0,1,0,0,1,
                1,0,0,0,1,0,1,0,0,0,1,0,1,0,0,0];
  const hat  = [0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,
                0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1];
  for (let i = 0; i < 32; i++) {
    const t = t0 + i * S16;
    if (kick[i]) playDjembe(t, 180, 0.32);
    if (hat[i])  playDjembe(t, 700, 0.09);
  }
  const bass = [
    [0,P.C3],[2,P.C3],[4,P.Eb3],[6,P.G3],
    [8,P.C3],[10,P.F3],[12,P.G3],[14,P.Bb3],
    [16,P.C3],[18,P.C3],[20,P.Eb3],[22,P.G3],
    [24,P.F3],[26,P.G3],[28,P.Bb3],[30,P.C4],
  ];
  for (const [b,f] of bass) playBass(t0 + b * S16, f);
  const mel = [
    [1,P.G4],[5,P.Eb4],[7,P.F4],[9,P.G4],
    [13,P.Bb4],[15,P.C5],[17,P.G4],[21,P.F4],
    [23,P.Eb4],[25,P.G4],[27,P.Bb4],[29,P.G4],
  ];
  for (const [b,f] of mel) playKalimba(t0 + b * S16, f);
  return t0 + S16 * 32;
}

function scheduleMusicAhead() {
  if (!musicPlaying) return;
  const ctx = ensureAudio();
  while (nextMeasureTime < ctx.currentTime + 1.2)
    nextMeasureTime = scheduleMeasure(nextMeasureTime);
  musicTimerHandle = setTimeout(scheduleMusicAhead, 400);
}

function startMusic() {
  if (musicPlaying) return;
  musicPlaying = true;
  const ctx = ensureAudio();
  nextMeasureTime = ctx.currentTime + 0.05;
  scheduleMusicAhead();
}

function stopMusic() {
  musicPlaying = false;
  if (musicTimerHandle) { clearTimeout(musicTimerHandle); musicTimerHandle = null; }
}

// ─── Level ────────────────────────────────────────────────────────────────────

function buildLevel() {
  // Ground floor (full width)
  const ground = { x:0, y:LEVEL_H-20, w:W, tilt:0, isGround:true };

  // Main platforms — 8 zig-zag rows above ground
  const main = [
    { x: 50, y:1040, w:140, tilt: 0.04 },  // P1
    { x:290, y: 900, w:130, tilt:-0.06 },  // P2
    { x: 50, y: 760, w:144, tilt: 0.04 },  // P3
    { x:290, y: 620, w:124, tilt:-0.07 },  // P4
    { x: 40, y: 480, w:136, tilt: 0.06 },  // P5
    { x:280, y: 340, w:140, tilt:-0.07 },  // P6
    { x: 40, y: 200, w:130, tilt: 0.05 },  // P7
    { x:278, y:  80, w:155, tilt:-0.05 },  // P8  goal
  ];

  // Chimp perches — small branches between main platforms, no bananas
  const perches = [
    { x:315, y:1110, w:80, tilt:-0.04, isPerch:true },  // PA  ground→P1
    { x:100, y: 970, w:80, tilt: 0.05, isPerch:true },  // PB  P1→P2
    { x:315, y: 830, w:80, tilt:-0.04, isPerch:true },  // PC  P2→P3
    { x:100, y: 690, w:80, tilt: 0.04, isPerch:true },  // PD  P3→P4
    { x:315, y: 550, w:80, tilt:-0.04, isPerch:true },  // PE  P4→P5
    { x:100, y: 410, w:80, tilt: 0.04, isPerch:true },  // PF  P5→P6
  ];

  const platforms = [ground, ...main, ...perches];

  const ladders = [
    { x:330, y1:1040, y2:LEVEL_H-20 },  // ground → P1
    { x: 62, y1: 900, y2:1040 },        // P1 → P2
    { x:360, y1: 760, y2: 900 },        // P2 → P3
    { x: 62, y1: 620, y2: 760 },        // P3 → P4
    { x:350, y1: 480, y2: 620 },        // P4 → P5
    { x: 62, y1: 340, y2: 480 },        // P5 → P6
    { x:340, y1: 200, y2: 340 },        // P6 → P7
    { x: 62, y1:  80, y2: 200 },        // P7 → P8
  ];

  const bananas = [];
  const addBananas = (px, py, pw, count) => {
    const step = pw / (count + 1);
    for (let i = 1; i <= count; i++)
      bananas.push({ x:px+step*i-8, y:py-28, w:16, h:28, collected:false, angle:0 });
  };
  addBananas(  0, LEVEL_H-20, 150, 2);  // ground
  addBananas( 50,       1040, 140, 3);  // P1
  addBananas(290,        900, 130, 3);  // P2
  addBananas( 50,        760, 144, 3);  // P3
  addBananas(290,        620, 124, 3);  // P4
  addBananas( 40,        480, 136, 4);  // P5
  addBananas(280,        340, 140, 3);  // P6
  addBananas( 40,        200, 130, 3);  // P7
  addBananas(358,         80,  75, 2);  // P8 right half (basket on left)

  // Chimps on perches only
  const chimps = [
    { x:325, y:1110-32, w:28, h:32, dir:-1, timer:100, phase:'idle', phaseTimer:0 },  // PA
    { x:110, y: 970-32, w:28, h:32, dir: 1, timer: 60, phase:'idle', phaseTimer:0 },  // PB
    { x:325, y: 830-32, w:28, h:32, dir:-1, timer: 40, phase:'idle', phaseTimer:0 },  // PC
    { x:110, y: 690-32, w:28, h:32, dir: 1, timer:180, phase:'idle', phaseTimer:0 },  // PD
    { x:325, y: 550-32, w:28, h:32, dir:-1, timer: 20, phase:'idle', phaseTimer:0 },  // PE
    { x:110, y: 410-32, w:28, h:32, dir: 1, timer:140, phase:'idle', phaseTimer:0 },  // PF
  ];

  const lifeBoxes = [
    { x:386, y:872, w:28, h:28, collected:false },  // near P2 right
    { x: 78, y:172, w:28, h:28, collected:false },  // on P7 left
  ];

  // Basket above P8 left area
  const basket = { x:290, y:44, w:60, h:36 };

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
      x: 40, y: LEVEL_H - 20 - 36,
      vx: 0, vy: 0, w: 24, h: 36,
      onGround: false, onLadder: false,
      facingRight: true, frame: 0, frameTimer: 0,
      invincibleTimer: 0,
    },
    cameraY: LEVEL_H - H,
    ...lvl,
    skins: [],
    frameCount: 0,
  };
}

// ─── Input ────────────────────────────────────────────────────────────────────

const keys  = {};
const touch = { left:false, right:false, jump:false };

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
  if      (state.screen === 'title')                          { state.screen = 'play'; startMusic(); }
  else if (state.screen === 'gameover' || state.screen === 'win') {
    stopMusic(); initState(); state.screen = 'play'; startMusic();
  }
  else if (state.screen === 'dead') respawn();
}

function respawn() {
  const p = state.player;
  p.x = 40; p.y = LEVEL_H - 20 - 36;
  p.vx = 0; p.vy = 0;
  p.onGround = false; p.onLadder = false;
  p.invincibleTimer = 60;
  state.cameraY = LEVEL_H - H;
  state.screen = 'play';
}

// ─── Physics ──────────────────────────────────────────────────────────────────

function rectOverlap(ax,ay,aw,ah, bx,by,bw,bh) {
  return ax < bx+bw && ax+aw > bx && ay < by+bh && ay+ah > by;
}

function updateCamera() {
  const p = state.player;
  const target = Math.max(0, Math.min(LEVEL_H - H, p.y - H * 0.55));
  state.cameraY += (target - state.cameraY) * 0.08;
}

function updatePlayer() {
  const p = state.player;
  if (p.invincibleTimer > 0) p.invincibleTimer--;

  const left  = keys['ArrowLeft']  || keys['KeyA'] || touch.left;
  const right = keys['ArrowRight'] || keys['KeyD'] || touch.right;
  const jump  = keys['Space'] || keys['ArrowUp'] || keys['KeyW'] || touch.jump;
  const up    = keys['ArrowUp']   || keys['KeyW'];
  const down  = keys['ArrowDown'] || keys['KeyS'];

  // Ladders only activate when player explicitly presses UP or DOWN.
  // Walking left/right past a ladder does NOT grab it.
  p.onLadder = false;
  if (up || down) {
    for (const l of state.ladders) {
      if (rectOverlap(p.x, p.y, p.w, p.h, l.x - 12, l.y1, 24, l.y2 - l.y1)) {
        p.onLadder = true; break;
      }
    }
  }

  const wasOnLadder = p.onLadder;

  if (p.onLadder) {
    // While climbing: vertical only (horizontal keys disengage the ladder and walk off)
    p.vx = 0;
    p.vy = up ? -MOVE_SPEED : down ? MOVE_SPEED : 0;
    // Note: no gravity while on ladder
  } else {
    p.vx = left ? -MOVE_SPEED : right ? MOVE_SPEED : 0;
    p.vy += GRAVITY;
  }
  if (left)  p.facingRight = false;
  if (right) p.facingRight = true;

  // Jump works from ground OR ladder; ladder jump launches sideways
  if (jump && (p.onGround || wasOnLadder)) {
    p.vy = JUMP_VEL;
    p.onGround = false;
    p.onLadder = false;
    if (wasOnLadder) {
      // Lateral kick off the vine in the direction the player is facing
      p.vx = p.facingRight ? MOVE_SPEED * 1.4 : -MOVE_SPEED * 1.4;
    }
    sfxJump();
  }

  p.x = Math.max(0, Math.min(W - p.w, p.x + p.vx));
  p.y += p.vy;

  p.onGround = false;
  for (const pl of state.platforms) {
    if (p.x + p.w > pl.x && p.x < pl.x + pl.w) {
      const foot = p.y + p.h, prev = foot - p.vy;
      if (p.vy >= 0 && prev <= pl.y + 2 && foot >= pl.y) {
        p.y = pl.y - p.h; p.vy = 0; p.onGround = true;
      }
    }
  }

  if (p.y > LEVEL_H + 60) { die(); return; }

  const moving = Math.abs(p.vx) > 0 || (p.onLadder && Math.abs(p.vy) > 0);
  if (moving) { if (++p.frameTimer >= 7) { p.frameTimer = 0; p.frame = (p.frame+1)%2; } }
  else p.frame = 0;
}

function updateBananas() {
  const p = state.player;
  for (const b of state.bananas) {
    if (b.collected) continue;
    b.angle += 0.05;
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
      lb.collected = true; state.lives = Math.min(5, state.lives+1); sfxLife();
    }
  }
}

function updateChimps() {
  for (const c of state.chimps) {
    c.phaseTimer++;
    if (c.phase === 'idle' && c.phaseTimer >= SKIN_INTERVAL) {
      c.phase = 'windup'; c.phaseTimer = 0;
    } else if (c.phase === 'windup' && c.phaseTimer >= 36) {
      c.phase = 'idle'; c.phaseTimer = 0;
      const pl = state.platforms.find(p =>
        Math.abs((c.y + c.h) - p.y) < 16 && c.x + c.w > p.x && c.x < p.x + p.w);
      if (pl) {
        state.skins.push({
          x: c.x + c.w/2 - 12,
          y: pl.y - 14,
          w: 24, h: 14,
          vx: c.dir * SKIN_SPEED,
          vy: 1.5,
        });
      }
    }
  }
}

function updateSkins() {
  const p = state.player;
  for (let i = state.skins.length-1; i >= 0; i--) {
    const s = state.skins[i];
    s.x += s.vx; s.vy += GRAVITY; s.y += s.vy;
    for (const pl of state.platforms) {
      if (s.x + s.w > pl.x && s.x < pl.x + pl.w) {
        const foot = s.y + s.h, prev = foot - s.vy;
        if (s.vy >= 0 && prev <= pl.y + 2 && foot >= pl.y) { s.y = pl.y - s.h; s.vy = 0; }
      }
    }
    if (s.x < -40 || s.x > W+40 || s.y > LEVEL_H+40) { state.skins.splice(i,1); continue; }
    if (state.screen === 'play' && p.invincibleTimer === 0 &&
        rectOverlap(p.x, p.y, p.w, p.h, s.x, s.y, s.w, s.h)) {
      die(); return;
    }
  }
}

function checkBasket() {
  const p = state.player, b = state.basket;
  if (rectOverlap(p.x, p.y, p.w, p.h, b.x, b.y, b.w, b.h)) {
    state.screen = 'win'; sfxWin(); stopMusic();
  }
}

function die() {
  if (state.screen !== 'play') return;
  sfxDie(); state.lives--; state.skins = [];
  if (state.lives <= 0) { state.screen = 'gameover'; stopMusic(); }
  else state.screen = 'dead';
}

// ─── Drawing ──────────────────────────────────────────────────────────────────

function drawJungleBackground(ctx) {
  const grad = ctx.createLinearGradient(0, 0, 0, LEVEL_H);
  grad.addColorStop(0,   '#060e06');
  grad.addColorStop(0.5, '#0d1f0d');
  grad.addColorStop(1,   '#152a10');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, LEVEL_H);

  const bgTrees = [
    { x:4,   w:28, top:0  },
    { x:184, w:20, top:60 },
    { x:296, w:24, top:30 },
    { x:444, w:20, top:50 },
  ];
  for (const t of bgTrees) {
    ctx.fillStyle = '#2a1408';
    ctx.fillRect(t.x, t.top, t.w, LEVEL_H - t.top);
    ctx.fillStyle = '#1e0e04';
    for (let y = t.top+16; y < LEVEL_H; y += 32) ctx.fillRect(t.x+4, y, t.w-8, 6);
    ctx.fillStyle = '#3a1e08';
    for (let y = t.top+32; y < LEVEL_H; y += 32) ctx.fillRect(t.x+2, y, t.w-4, 2);
    ctx.fillStyle = '#0e2e0e';
    ctx.beginPath(); ctx.ellipse(t.x+t.w/2, t.top+12, t.w+28, 44, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#163a14';
    ctx.beginPath(); ctx.ellipse(t.x+t.w/2, t.top,    t.w+16, 28, 0, 0, Math.PI*2); ctx.fill();
  }

  ctx.globalAlpha = 0.7;
  ctx.strokeStyle = '#1e5a0e'; ctx.lineWidth = 3;
  for (let vx = 76; vx < W; vx += 92) {
    ctx.beginPath();
    ctx.moveTo(vx, 0);
    ctx.bezierCurveTo(vx-28, LEVEL_H*0.35, vx+28, LEVEL_H*0.65, vx+8, LEVEL_H);
    ctx.stroke();
    ctx.fillStyle = '#1e5a0e';
    for (let vy = 28; vy < LEVEL_H; vy += 40) {
      const side = vy%80<40 ? 14 : -14;
      ctx.beginPath(); ctx.ellipse(vx+side, vy, 10, 5, Math.PI*0.2, 0, Math.PI*2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  const midFoliage = [
    {x:60,y:1100,rx:44,ry:28},{x:164,y:980,rx:36,ry:24},
    {x:280,y:860,rx:48,ry:30},{x:120,y:740,rx:32,ry:20},
    {x:400,y:640,rx:40,ry:26},{x:460,y:520,rx:36,ry:24},
    {x:220,y:400,rx:40,ry:24},{x:60, y:300,rx:36,ry:22},
    {x:400,y:200,rx:38,ry:22},{x:220,y:120,rx:34,ry:20},
  ];
  ctx.globalAlpha = 0.4;
  for (const f of midFoliage) {
    ctx.fillStyle = '#2a6020';
    ctx.beginPath(); ctx.ellipse(f.x, f.y, f.rx, f.ry, 0, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#3a7828';
    ctx.beginPath(); ctx.ellipse(f.x-8, f.y-8, f.rx*0.7, f.ry*0.7, 0.3, 0, Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawGroundFloor(ctx) {
  const gy = LEVEL_H - 20;
  ctx.fillStyle = '#2a1408'; ctx.fillRect(0, gy, W, 20);
  ctx.fillStyle = '#1e0e04';
  for (let x = 0; x < W; x += 14) ctx.fillRect(x+2, gy+6, 8, 4);
  ctx.fillStyle = '#1a4a08'; ctx.fillRect(0, gy, W, 7);
  ctx.fillStyle = '#2a6a10'; ctx.fillRect(0, gy, W, 4);
  ctx.fillStyle = '#3a8a18';
  for (let x = 6; x < W; x += 16) {
    ctx.fillRect(x,   gy-4, 4, 6);
    ctx.fillRect(x+4, gy-6, 4, 8);
    ctx.fillRect(x+8, gy-3, 3, 5);
  }
  ctx.fillStyle = '#3a2008';
  for (let x = 30; x < W; x += 48) ctx.fillRect(x, gy+8, 10, 4);
  ctx.fillStyle = '#555';
  for (let x = 14; x < W; x += 36) ctx.fillRect(x, gy+11, 5, 3);
}

function drawVines(ctx) {
  for (const l of state.ladders) {
    ctx.strokeStyle = '#3a7a1a'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(l.x-6, l.y1); ctx.lineTo(l.x-6, l.y2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(l.x+6, l.y1); ctx.lineTo(l.x+6, l.y2); ctx.stroke();
    ctx.fillStyle = '#5aaa2a';
    for (let y = l.y1+12; y < l.y2-4; y += 14) ctx.fillRect(l.x-10, y, 20, 4);
    ctx.fillStyle = '#2d6a14';
    const len = l.y2 - l.y1;
    for (let i = 0; i*14 < len; i++) {
      const y = l.y1+i*14+6, side = i%2===0 ? 1 : -1;
      ctx.beginPath(); ctx.ellipse(l.x+side*16, y, 10, 5, Math.PI*(0.1*side+0.15), 0, Math.PI*2); ctx.fill();
    }
  }
}

function drawBranch(ctx, pl) {
  if (pl.isGround) return;
  const { x, y, w, tilt=0 } = pl;
  ctx.save();
  ctx.translate(x+w/2, y+8); ctx.rotate(tilt); ctx.translate(-w/2, -8);

  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(8, 18, w, 10);

  ctx.fillStyle = '#4a2e08';
  ctx.beginPath();
  ctx.moveTo(0,16); ctx.lineTo(w,14); ctx.lineTo(w,2); ctx.lineTo(0,0);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = '#6e4614'; ctx.fillRect(0, 0, w, 6);
  ctx.fillStyle = '#321c06';
  for (let bx = 20; bx < w-16; bx += 36) {
    ctx.fillRect(bx, 6, 22, 2); ctx.fillRect(bx+10, 10, 14, 2);
  }
  if (w > 90) {
    const kx = Math.floor(w*0.38);
    ctx.fillStyle = '#241204'; ctx.beginPath(); ctx.ellipse(kx,8,8,5,0,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#3e2208'; ctx.beginPath(); ctx.ellipse(kx,8,5,3,0,0,Math.PI*2); ctx.fill();
  }
  ctx.fillStyle = 'rgba(50,110,18,0.28)'; ctx.fillRect(6, 0, w-12, 6);

  ctx.fillStyle = '#1a4a0c';
  for (let lx = 8; lx < w-8; lx += 22) {
    ctx.beginPath(); ctx.ellipse(lx+8,-8,12,7,Math.sin(lx*0.4)*0.4,0,Math.PI*2); ctx.fill();
  }
  ctx.fillStyle = '#2a6818';
  for (let lx = 2; lx < w-6; lx += 18) {
    ctx.beginPath(); ctx.ellipse(lx+6,-12,10,6,Math.sin(lx*0.6)*0.5,0,Math.PI*2); ctx.fill();
  }
  ctx.fillStyle = '#3c8a22';
  for (let lx = 12; lx < w-10; lx += 26) {
    ctx.beginPath(); ctx.ellipse(lx+4,-16,8,5,Math.sin(lx*0.8)*0.6,0,Math.PI*2); ctx.fill();
  }
  ctx.fillStyle = '#5aaa28';
  for (let lx = 18; lx < w-16; lx += 44) {
    ctx.beginPath(); ctx.ellipse(lx,-18,5,3,-0.3,0,Math.PI*2); ctx.fill();
  }
  for (const ex of [0, w]) {
    ctx.fillStyle = '#2a6818';
    ctx.beginPath(); ctx.ellipse(ex,-6,14,8,ex===0?0.4:-0.4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = '#3c8a22';
    ctx.beginPath(); ctx.ellipse(ex,-12,10,6,ex===0?0.6:-0.6,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

// Banana: thin crescent with genuine pointy tips.
// Outer bezier bows far left; inner bezier also bows left but less so (≈4px gap).
// Single solid #FFD700, no highlights or shading patches.
function drawBanana(ctx, b) {
  ctx.save();
  ctx.translate(b.x + b.w/2, b.y + b.h/2);
  ctx.rotate(b.angle * 0.18);

  // Tips — both on the right side of the sprite, giving the C-shape opening right
  const tx1 = -1, ty1 = -11;  // top tip (pointy)
  const tx2 = -1, ty2 =  11;  // bottom tip (pointy)

  // Closed crescent path:
  //  outer edge: convex bezier from tip1 → tip2 bowing far LEFT
  //  inner edge: concave bezier from tip2 → tip1 bowing slightly LEFT (smaller bow = thin gap)
  // Key: BOTH outer and inner CP x-values are NEGATIVE (left of centre).
  // The gap between them (e.g. -15 vs -10) determines crescent thickness (~4px).
  function cres(ox1,oy1,ox2,oy2, ix1,iy1,ix2,iy2) {
    ctx.beginPath();
    ctx.moveTo(tx1, ty1);
    ctx.bezierCurveTo(ox1,oy1, ox2,oy2, tx2,ty2);   // outer convex arc
    ctx.bezierCurveTo(ix1,iy1, ix2,iy2, tx1,ty1);   // inner concave arc (back)
    ctx.closePath();
  }

  // Dark brown outline (2px larger each side → ox=-17, ix=-8 → 6.5px gap)
  cres(-17,-5, -17,5,  -8,6,  -8,-6);
  ctx.fillStyle = '#7B4500'; ctx.fill();

  // Solid yellow crescent (ox=-15, ix=-10 → ~4px gap at centre = thin)
  cres(-15,-4, -15,4, -10,5, -10,-5);
  ctx.fillStyle = '#FFD700'; ctx.fill();

  // Small green stem at the top tip
  ctx.fillStyle = '#3a7000'; ctx.fillRect(tx1,     ty1-5, 5, 4);
  ctx.fillStyle = '#5aaa00'; ctx.fillRect(tx1+1,   ty1-4, 3, 3);

  ctx.restore();
}

function drawSkin(ctx, s) {
  ctx.save();
  ctx.translate(s.x + s.w/2, s.y + s.h/2);
  const Y = '#c8a400';

  ctx.fillStyle = Y;
  ctx.beginPath(); ctx.moveTo(0,0);
  ctx.bezierCurveTo(-4,-4,-14,-4,-14,0); ctx.bezierCurveTo(-14,4,-4,4,0,0); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0,0);
  ctx.bezierCurveTo(4,-4,14,-4,14,0);   ctx.bezierCurveTo(14,4,4,4,0,0);   ctx.fill();
  ctx.beginPath(); ctx.moveTo(0,0);
  ctx.bezierCurveTo(-2,-4,-8,-10,-4,-10); ctx.bezierCurveTo(0,-10,2,-6,0,0); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0,0);
  ctx.bezierCurveTo(2,4,6,10,2,10); ctx.bezierCurveTo(-2,10,-2,6,0,0); ctx.fill();

  ctx.fillStyle = '#e8d870';
  ctx.beginPath(); ctx.ellipse(0,0,5,3,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#5a3c00';
  ctx.fillRect(-10,-2,4,2); ctx.fillRect(6,0,4,2);
  ctx.fillRect(-4,-8,2,2);  ctx.fillRect(0,6,2,2);
  ctx.restore();
}

function drawBasket(ctx, b) {
  ctx.strokeStyle = '#8a6030'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(b.x+b.w/2, b.y+14, b.w/2-6, Math.PI, 0); ctx.stroke();
  ctx.fillStyle = '#c4a46c'; ctx.fillRect(b.x, b.y+14, b.w, b.h-14);
  ctx.fillStyle = '#9a7840';
  for (let i = 0; i < 4; i++) ctx.fillRect(b.x, b.y+14+i*6, b.w, 2);
  for (let i = 0; i < 7; i++) ctx.fillRect(b.x+i*9, b.y+14, 2, b.h-14);
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(b.x+6,  b.y+2,  10, 14);
  ctx.fillRect(b.x+20, b.y+6,  10, 10);
  ctx.fillRect(b.x+36, b.y+2,  10, 13);
  ctx.fillStyle = '#ffe566';
  ctx.fillRect(b.x+8,  b.y+4,  6, 10);
  ctx.fillRect(b.x+22, b.y+8,  6,  6);
  ctx.fillStyle = '#3a6a00';
  ctx.fillRect(b.x+6,  b.y+2,  4, 4);
  ctx.fillRect(b.x+20, b.y+6,  4, 4);
  ctx.fillRect(b.x+36, b.y+2,  4, 4);
}

function drawLifeBox(ctx, lb) {
  if (lb.collected) return;
  const pulse = 0.55 + 0.45*Math.sin(state.frameCount*0.12);
  ctx.fillStyle = `rgba(255,220,0,${pulse*0.35})`;
  ctx.fillRect(lb.x-5, lb.y-5, lb.w+10, lb.h+10);
  ctx.fillStyle = '#7a3a10'; ctx.fillRect(lb.x, lb.y, lb.w, lb.h);
  ctx.fillStyle = '#9a4e18'; ctx.fillRect(lb.x+2, lb.y+2, lb.w-4, 6);
  ctx.fillStyle = '#5a2808'; ctx.fillRect(lb.x+2, lb.y+lb.h-6, lb.w-4, 4);
  ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2;
  ctx.strokeRect(lb.x+1, lb.y+1, lb.w-2, lb.h-2);
  const cx = lb.x+lb.w/2, cy = lb.y+lb.h/2;
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(cx-8, cy-2, 16, 6); ctx.fillRect(cx-2, cy-8, 6, 16);
}

function drawGorilla(ctx, p) {
  if (p.invincibleTimer > 0 && Math.floor(p.invincibleTimer/4)%2===0) return;
  ctx.save();
  ctx.translate(p.facingRight ? p.x : p.x+p.w, p.y);
  if (!p.facingRight) ctx.scale(-1,1);

  const B='#5C3A1E', T='#A0724A', D='#3a2010';
  const jumping = !p.onGround && !p.onLadder, f = p.frame;

  ctx.fillStyle=B; ctx.fillRect(2,4,6,6); ctx.fillRect(16,4,6,6);
  ctx.fillStyle=T; ctx.fillRect(4,6,4,4); ctx.fillRect(18,6,4,4);
  ctx.fillStyle=B; ctx.fillRect(4,0,16,14);
  ctx.fillStyle=T; ctx.fillRect(6,4,12,8);
  ctx.fillStyle=D; ctx.fillRect(6,2,12,2);
  ctx.fillStyle='#1a0e06'; ctx.fillRect(8,4,4,4); ctx.fillRect(14,4,4,4);
  ctx.fillStyle='#fff';    ctx.fillRect(8,4,2,2);  ctx.fillRect(14,4,2,2);
  ctx.fillStyle=D; ctx.fillRect(10,10,2,2); ctx.fillRect(14,10,2,2);
  ctx.fillStyle=B; ctx.fillRect(4,14,16,16);
  ctx.fillStyle=T; ctx.fillRect(6,16,12,12);
  ctx.fillStyle=B;
  if (jumping) { ctx.fillRect(0,10,4,8); ctx.fillRect(20,10,4,8); }
  else         { ctx.fillRect(0,16,4,10); ctx.fillRect(20,16,4,10); }
  if (jumping)      { ctx.fillRect(4,30,8,6); ctx.fillRect(12,30,8,6); }
  else if (f===0)   { ctx.fillRect(4,30,8,10); ctx.fillRect(12,30,8,6); ctx.fillRect(12,34,8,6); }
  else              { ctx.fillRect(4,30,8,6); ctx.fillRect(4,34,8,6); ctx.fillRect(12,30,8,10); }
  ctx.restore();
}

function drawChimp(ctx, c) {
  ctx.save();
  ctx.translate(c.x, c.y);
  const C='#7B5B3A', T='#c49060', D='#4a3020';
  const windup = c.phase==='windup';
  const armY = windup ? Math.max(2, 10-Math.floor(c.phaseTimer/3))
                      : 16+Math.floor(Math.sin(state.frameCount*0.06)*3);

  ctx.fillStyle=C; ctx.fillRect(0,4,4,8); ctx.fillRect(24,4,4,8); ctx.fillRect(2,0,24,16);
  ctx.fillStyle=T; ctx.fillRect(4,4,20,10);
  ctx.fillStyle=D; ctx.fillRect(4,2,20,2);
  if (windup) { ctx.fillStyle='#1a0808'; ctx.fillRect(4,2,8,2); ctx.fillRect(16,2,8,2); }
  ctx.fillStyle='#1a0e06'; ctx.fillRect(6,4,4,4); ctx.fillRect(18,4,4,4);
  ctx.fillStyle='#fff';    ctx.fillRect(6,4,2,2); ctx.fillRect(18,4,2,2);
  ctx.fillStyle=D; ctx.fillRect(10,10,2,2); ctx.fillRect(16,10,2,2);
  ctx.fillStyle=C; ctx.fillRect(4,16,20,14);
  ctx.fillStyle=T; ctx.fillRect(6,18,16,10);
  ctx.fillStyle=C;
  ctx.fillRect(0,16,4,10);
  ctx.fillRect(24,armY,4,windup?8:10);
  ctx.fillRect(4,30,8,6); ctx.fillRect(16,30,8,6);

  if (windup) {
    ctx.save(); ctx.translate(26, armY-4);
    ctx.fillStyle='#c8a400';
    ctx.beginPath(); ctx.moveTo(0,0); ctx.bezierCurveTo(-4,-4,-10,-3,-8,0);
    ctx.bezierCurveTo(-6,3,-2,3,0,0); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0,0); ctx.bezierCurveTo(4,-4,10,-3,8,0);
    ctx.bezierCurveTo(6,3,2,3,0,0); ctx.fill();
    ctx.fillStyle='#e8d060';
    ctx.beginPath(); ctx.ellipse(0,0,3,2,0,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawFamily(ctx) {
  const gy = LEVEL_H - 20;
  const members = [{x:60,y:gy-40},{x:88,y:gy-46},{x:124,y:gy-42}];
  for (const g of members) {
    ctx.fillStyle='#5C3A1E'; ctx.fillRect(g.x, g.y, 20, 20);
    ctx.fillStyle='#A0724A';
    ctx.fillRect(g.x+4, g.y,   12, 8);
    ctx.fillRect(g.x+4, g.y+8, 12, 10);
    ctx.fillStyle='#111';
    ctx.fillRect(g.x+6,  g.y+2, 2, 2);
    ctx.fillRect(g.x+12, g.y+2, 2, 2);
  }
}

function drawHUD(ctx) {
  ctx.font = '12px "Press Start 2P"';
  ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(4, 4, 124, 36);
  ctx.fillStyle = '#FFD700'; ctx.fillText('SCORE', 8, 20);
  ctx.fillStyle = '#fff';    ctx.fillText(String(state.score).padStart(5,'0'), 8, 36);

  ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(W-128, 4, 124, 36);
  ctx.fillStyle = '#FFD700'; ctx.fillText('LIVES', W-124, 20);
  for (let i = 0; i < state.lives; i++) {
    ctx.fillStyle='#5C3A1E'; ctx.fillRect(W-120+i*22, 24, 18, 14);
    ctx.fillStyle='#A0724A'; ctx.fillRect(W-118+i*22, 30, 14, 6);
  }
}

function drawTitle(ctx) {
  ctx.fillStyle='#060e06'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign='center';
  ctx.fillStyle='#0e3a0a'; ctx.font='36px "Press Start 2P"';
  ctx.fillText('BANANO', W/2+4, 108);
  ctx.fillStyle='#FFD700'; ctx.fillText('BANANO', W/2, 104);

  ctx.fillStyle='#88cc88'; ctx.font='12px "Press Start 2P"';
  ctx.fillText('Help the gorilla reach',  W/2, 160);
  ctx.fillText('the banana basket!',      W/2, 184);

  ctx.fillStyle='#555'; ctx.font='10px "Press Start 2P"';
  ctx.fillText('ARROWS or A/D — move',    W/2, 232);
  ctx.fillText('SPACE / W — jump',        W/2, 252);
  ctx.fillText('UP / DOWN — climb vines', W/2, 272);
  ctx.fillText('SPACE on vine = jump off',W/2, 292);
  ctx.fillText('+ boxes give extra lives',W/2, 312);

  if (Math.floor(state.frameCount/30)%2===0) {
    ctx.fillStyle='#fff'; ctx.font='14px "Press Start 2P"';
    ctx.fillText('PRESS SPACE TO START', W/2, 358);
  }
  ctx.fillStyle='#444'; ctx.font='10px "Press Start 2P"';
  ctx.fillText('← Back to Game Lab', W/2, H-14);
  ctx.textAlign='left';
}

function drawOverlay(ctx, title, color, prompt) {
  ctx.fillStyle='rgba(0,0,0,0.72)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign='center';
  ctx.fillStyle=color; ctx.font='24px "Press Start 2P"';
  ctx.fillText(title, W/2, H/2-56);
  ctx.fillStyle='#fff'; ctx.font='12px "Press Start 2P"';
  ctx.fillText('SCORE: '+state.score, W/2, H/2-16);
  if (Math.floor(state.frameCount/30)%2===0) {
    ctx.fillStyle='#aaffaa'; ctx.fillText(prompt, W/2, H/2+36);
  }
  ctx.textAlign='left';
}

// ─── Render ───────────────────────────────────────────────────────────────────

function render(ctx) {
  ctx.imageSmoothingEnabled = false;
  if (state.screen === 'title') { drawTitle(ctx); return; }

  ctx.save();
  ctx.translate(0, -Math.round(state.cameraY));

  drawJungleBackground(ctx);
  drawGroundFloor(ctx);
  drawVines(ctx);
  for (const pl of state.platforms) drawBranch(ctx, pl);

  drawFamily(ctx);
  drawBasket(ctx, state.basket);

  for (const b  of state.bananas)   if (!b.collected) drawBanana(ctx, b);
  for (const lb of state.lifeBoxes) drawLifeBox(ctx, lb);
  for (const c  of state.chimps)    drawChimp(ctx, c);
  for (const s  of state.skins)     drawSkin(ctx, s);

  drawGorilla(ctx, state.player);
  ctx.restore();

  drawHUD(ctx);

  if (state.screen === 'dead') {
    ctx.fillStyle='rgba(0,0,0,0.55)'; ctx.fillRect(0,0,W,H);
    ctx.textAlign='center';
    ctx.fillStyle='#ff5555'; ctx.font='20px "Press Start 2P"';
    ctx.fillText('OOPS!', W/2, H/2-20);
    if (Math.floor(state.frameCount/30)%2===0) {
      ctx.fillStyle='#fff'; ctx.font='10px "Press Start 2P"';
      ctx.fillText('SPACE TO CONTINUE', W/2, H/2+24);
    }
    ctx.textAlign='left';
  }
  if (state.screen === 'gameover') drawOverlay(ctx, 'GAME OVER', '#ff5555', 'SPACE TO RETRY');
  if (state.screen === 'win')      drawOverlay(ctx, 'YOU WIN!',  '#FFD700', 'SPACE TO PLAY AGAIN');
}

// ─── Game Loop ────────────────────────────────────────────────────────────────

function gameLoop() {
  state.frameCount++;

  if (state.screen === 'play') {
    updatePlayer();
    updateCamera();
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
  const scale = Math.max(0.5, Math.min(Math.floor(maxW/W*2)/2, Math.floor(maxH/H*2)/2));
  canvas.style.width  = W * scale + 'px';
  canvas.style.height = H * scale + 'px';
}

// ─── Touch Controls ───────────────────────────────────────────────────────────

function setupTouch() {
  function bind(id, prop) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('touchstart', e=>{e.preventDefault();touch[prop]=true; ensureAudio();},{passive:false});
    el.addEventListener('touchend',   e=>{e.preventDefault();touch[prop]=false;},{passive:false});
    el.addEventListener('mousedown',  ()=>{touch[prop]=true; ensureAudio();});
    el.addEventListener('mouseup',    ()=>touch[prop]=false);
  }
  bind('btn-left','left'); bind('btn-right','right'); bind('btn-jump','jump');
  document.getElementById('btn-jump')?.addEventListener('touchstart', ()=>{
    if (state.screen !== 'play') startOrRestart();
  },{passive:true});
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

window.addEventListener('load', () => {
  initState();
  scaleCanvas();
  window.addEventListener('resize', scaleCanvas);
  setupTouch();
  requestAnimationFrame(gameLoop);
});
