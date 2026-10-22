// ==============================================
// ⭐ STARDUST — بازی ستاره‌ای
// گرافیک نئونی، ذرات، و مفهوم عمیق
// ==============================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let W, H;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resize);
resize();

// ==============================================
// 🎯 Game State
// ==============================================
const state = {
  running: false,
  score: 0,
  highScore: parseInt(localStorage.getItem('stardust_high') || '0'),
  level: 1,
  time: 0,
  shakeAmount: 0,
};

document.getElementById('highScore').textContent = state.highScore;

// ==============================================
// ✨ Star (Player)
// ==============================================
const player = {
  x: W / 2,
  y: H / 2,
  targetX: W / 2,
  targetY: H / 2,
  radius: 12,
  trail: [],
};

// ==============================================
// ✨ Particles (Dust)
// ==============================================
let dustParticles = [];
let explosionParticles = [];
let stars = [];      // background stars
let blackHoles = [];

// Initialize background stars
function initStars() {
  stars = [];
  for (let i = 0; i < 150; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      size: Math.random() * 1.5 + 0.3,
      speed: Math.random() * 0.3 + 0.05,
      alpha: Math.random() * 0.7 + 0.3,
      hue: Math.random() * 60 + 240, // blue-purple range
    });
  }
}
initStars();

// ==============================================
// 🖱️/👆 Input
// ==============================================
let touchActive = false;

function handlePointer(x, y) {
  if (!state.running) return;
  player.targetX = x;
  player.targetY = y;
  touchActive = true;
}

canvas.addEventListener('mousemove', (e) => {
  handlePointer(e.clientX, e.clientY);
});

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const t = e.touches[0];
  handlePointer(t.clientX, t.clientY);
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const t = e.touches[0];
  handlePointer(t.clientX, t.clientY);
}, { passive: false });

canvas.addEventListener('touchend', () => {
  touchActive = false;
});

// ==============================================
// 🎨 Spawn Functions
// ==============================================
function spawnDust() {
  const edge = Math.floor(Math.random() * 4);
  let x, y;
  const margin = 50;
  if (edge === 0) { x = Math.random() * W; y = -margin; }
  else if (edge === 1) { x = W + margin; y = Math.random() * H; }
  else if (edge === 2) { x = Math.random() * W; y = H + margin; }
  else { x = -margin; y = Math.random() * H; }

  const hue = Math.random() * 60 + 280;
  dustParticles.push({
    x, y,
    vx: 0, vy: 0,
    radius: Math.random() * 3 + 2,
    hue,
    pulse: Math.random() * Math.PI * 2,
    life: 1,
  });
}

function spawnBlackHole() {
  const margin = 100;
  let x, y;
  if (Math.random() < 0.5) {
    x = Math.random() < 0.5 ? margin : W - margin;
    y = Math.random() * H;
  } else {
    x = Math.random() * W;
    y = Math.random() < 0.5 ? margin : H - margin;
  }
  blackHoles.push({
    x, y,
    radius: 25,
    rotation: 0,
    pulse: Math.random() * Math.PI * 2,
  });
}

function spawnExplosion(x, y, hue) {
  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 5 + 2;
    explosionParticles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      hue,
      size: Math.random() * 3 + 1,
    });
  }
}

// ==============================================
// 🔄 Update
// ==============================================
let dustTimer = 0;
let blackHoleTimer = 0;
let lastTime = performance.now();

function update(dt) {
  state.time += dt;

  // ---- Level progression (harder over time) ----
  state.level = Math.floor(state.time / 15) + 1;
  document.getElementById('level').textContent = state.level;

  const difficulty = 1 + (state.level - 1) * 0.25;

  // ---- Player movement (smooth follow) ----
  const followSpeed = 0.15;
  player.x += (player.targetX - player.x) * followSpeed;
  player.y += (player.targetY - player.y) * followSpeed;

  // Trail
  player.trail.push({ x: player.x, y: player.y, life: 1 });
  if (player.trail.length > 20) player.trail.shift();

  player.trail.forEach(t => t.life -= dt * 3);
  player.trail = player.trail.filter(t => t.life > 0);

  // ---- Spawn dust ----
  dustTimer += dt;
  const dustInterval = Math.max(0.15, 0.5 / difficulty);
  if (dustTimer > dustInterval) {
    dustTimer = 0;
    spawnDust();
  }

  // ---- Spawn black holes ----
  blackHoleTimer += dt;
  const bhInterval = Math.max(1.5, 4 - state.level * 0.2);
  if (blackHoleTimer > bhInterval && blackHoles.length < 2 + Math.floor(state.level / 2)) {
    blackHoleTimer = 0;
    spawnBlackHole();
  }

  // ---- Update dust ----
  const attractSpeed = 150 * difficulty;
  for (let i = dustParticles.length - 1; i >= 0; i--) {
    const d = dustParticles[i];
    d.pulse += dt * 5;

    // Attract to player (magnetic field)
    const dx = player.x - d.x;
    const dy = player.y - d.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 200) {
      const force = (1 - dist / 200) * attractSpeed;
      d.vx += (dx / dist) * force * dt;
      d.vy += (dy / dist) * force * dt;
    }

    d.x += d.vx * dt;
    d.y += d.vy * dt;
    d.vx *= 0.96;
    d.vy *= 0.96;

    // Collect
    if (dist < player.radius + d.radius) {
      state.score += 10;
      document.getElementById('score').textContent = state.score;
      spawnExplosion(d.x, d.y, d.hue);
      dustParticles.splice(i, 1);
      continue;
    }

    // Remove if too far
    if (d.x < -100 || d.x > W + 100 || d.y < -100 || d.y > H + 100) {
      dustParticles.splice(i, 1);
    }
  }

  // ---- Update black holes ----
  for (const bh of blackHoles) {
    bh.rotation += dt * 2;
    bh.pulse += dt * 3;

    // Check collision
    const dx = player.x - bh.x;
    const dy = player.y - bh.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < bh.radius + player.radius * 0.7) {
      gameOver();
    }

    // Attract dust to black hole (visual)
    for (const d of dustParticles) {
      const ddx = bh.x - d.x;
      const ddy = bh.y - d.y;
      const ddist = Math.sqrt(ddx * ddx + ddy * ddy);
      if (ddist < 150 && ddist > 5) {
        d.vx += (ddx / ddist) * 30 * dt;
        d.vy += (ddy / ddist) * 30 * dt;
      }
    }
  }

  // ---- Update explosions ----
  for (let i = explosionParticles.length - 1; i >= 0; i--) {
    const p = explosionParticles[i];
    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;
    p.vx *= 0.92;
    p.vy *= 0.92;
    p.life -= dt * 2;
    if (p.life <= 0) explosionParticles.splice(i, 1);
  }

  // ---- Update background stars ----
  for (const s of stars) {
    s.y += s.speed * 30 * dt;
    if (s.y > H) { s.y = -5; s.x = Math.random() * W; }
  }

  // ---- Shake decay ----
  state.shakeAmount *= 0.9;
}

// ==============================================
// 🎨 Render
// ==============================================
function draw() {
  // Background
  ctx.fillStyle = 'rgba(0, 0, 8, 0.25)';
  ctx.fillRect(0, 0, W, H);

  ctx.save();

  // Screen shake
  if (state.shakeAmount > 0.5) {
    ctx.translate(
      (Math.random() - 0.5) * state.shakeAmount,
      (Math.random() - 0.5) * state.shakeAmount
    );
  }

  // ---- Background stars ----
  for (const s of stars) {
    ctx.globalAlpha = s.alpha;
    ctx.fillStyle = `hsl(${s.hue}, 100%, 75%)`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // ---- Black holes (with gravitational lens look) ----
  for (const bh of blackHoles) {
    const pulseR = bh.radius + Math.sin(bh.pulse) * 3;

    // Outer glow / accretion disk
    const grad = ctx.createRadialGradient(bh.x, bh.y, pulseR * 0.5, bh.x, bh.y, pulseR * 3);
    grad.addColorStop(0, 'rgba(120, 0, 200, 0.6)');
    grad.addColorStop(0.4, 'rgba(80, 0, 150, 0.3)');
    grad.addColorStop(1, 'rgba(40, 0, 80, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(bh.x, bh.y, pulseR * 3, 0, Math.PI * 2);
    ctx.fill();

    // Rotating disk
    ctx.save();
    ctx.translate(bh.x, bh.y);
    ctx.rotate(bh.rotation);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, pulseR * 1.6, i * 2, i * 2 + 1);
      ctx.strokeStyle = `hsla(${280 + i * 20}, 100%, 65%, 0.7)`;
      ctx.lineWidth = 3;
      ctx.shadowColor = `hsl(${280 + i * 20}, 100%, 60%)`;
      ctx.shadowBlur = 15;
      ctx.stroke();
    }
    ctx.restore();

    // Core (black)
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(bh.x, bh.y, pulseR, 0, Math.PI * 2);
    ctx.fill();

    // Event horizon ring
    ctx.strokeStyle = 'rgba(200, 100, 255, 0.9)';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#c864ff';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(bh.x, bh.y, pulseR + 1, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // ---- Dust particles ----
  for (const d of dustParticles) {
    const pulseSize = d.radius + Math.sin(d.pulse) * 1.5;

    // Glow
    const grad = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, pulseSize * 4);
    grad.addColorStop(0, `hsla(${d.hue}, 100%, 80%, 1)`);
    grad.addColorStop(0.3, `hsla(${d.hue}, 100%, 60%, 0.7)`);
    grad.addColorStop(1, `hsla(${d.hue}, 100%, 50%, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(d.x, d.y, pulseSize * 4, 0, Math.PI * 2);
    ctx.fill();

    // Core
    ctx.fillStyle = `hsl(${d.hue}, 100%, 90%)`;
    ctx.beginPath();
    ctx.arc(d.x, d.y, pulseSize, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- Player trail ----
  for (let i = 0; i < player.trail.length; i++) {
    const t = player.trail[i];
    const alpha = t.life * 0.7;
    const size = player.radius * (i / player.trail.length);
    ctx.fillStyle = `rgba(180, 140, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(t.x, t.y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- Player star ----
  // Outer glow
  const pGrad = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, player.radius * 5);
  pGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  pGrad.addColorStop(0.2, 'rgba(200, 160, 255, 0.9)');
  pGrad.addColorStop(0.6, 'rgba(140, 90, 255, 0.4)');
  pGrad.addColorStop(1, 'rgba(100, 50, 255, 0)');
  ctx.fillStyle = pGrad;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius * 5, 0, Math.PI * 2);
  ctx.fill();

  // Star core
  ctx.fillStyle = '#fff';
  ctx.shadowColor = '#c8a0ff';
  ctx.shadowBlur = 30;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Star rays
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(state.time * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(player.radius * 2.5, 0);
    ctx.stroke();
  }
  ctx.restore();

  // ---- Explosion particles ----
  for (const p of explosionParticles) {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = `hsl(${p.hue}, 100%, 70%)`;
    ctx.shadowColor = `hsl(${p.hue}, 100%, 60%)`;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  ctx.restore();
}

// ==============================================
// 🔁 Game Loop
// ==============================================
function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  if (state.running) {
    update(dt);
  }
  draw();

  requestAnimationFrame(loop);
}

// ==============================================
// 🚀 Start / Game Over
// ==============================================
function startGame() {
  state.running = true;
  state.score = 0;
  state.time = 0;
  state.level = 1;
  state.shakeAmount = 0;

  player.x = W / 2;
  player.y = H / 2;
  player.targetX = W / 2;
  player.targetY = H / 2;
  player.trail = [];

  dustParticles = [];
  explosionParticles = [];
  blackHoles = [];

  dustTimer = 0;
  blackHoleTimer = 0;

  document.getElementById('score').textContent = '0';
  document.getElementById('level').textContent = '1';
  document.getElementById('highScore').textContent = state.highScore;

  document.getElementById('startScreen').classList.add('hidden');
  document.getElementById('gameOverScreen').classList.add('hidden');
}

function gameOver() {
  state.running = false;
  state.shakeAmount = 30;

  if (state.score > state.highScore) {
    state.highScore = state.score;
    localStorage.setItem('stardust_high', state.highScore);
  }

  document.getElementById('finalScore').textContent = state.score;
  document.getElementById('finalHighScore').textContent = state.highScore;
  document.getElementById('finalLevel').textContent = state.level;
  document.getElementById('gameOverScreen').classList.remove('hidden');
}

// ==============================================
// 🎯 Buttons
// ==============================================
document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('restartBtn').addEventListener('click', startGame);

// Start loop
requestAnimationFrame(loop);
