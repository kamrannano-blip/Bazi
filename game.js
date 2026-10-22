// ==============================================
// 🔴 CRAZY BALL — توپ دیوانه
// Endless Runner با گرافیک نئونی
// ==============================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let W, H, GROUND_Y;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  GROUND_Y = H * 0.75;   // خط زمین در ۷۵٪ پایین صفحه
}
window.addEventListener('resize', resize);
resize();

// ==============================================
// 🎯 Game State
// ==============================================
const state = {
  running: false,
  score: 0,
  highScore: parseInt(localStorage.getItem('crazyball_high') || '0'),
  speed: 6,          // سرعت پایه
  baseSpeed: 6,
  maxSpeed: 22,
  time: 0,
  distance: 0,
  shakeAmount: 0,
  hueShift: 0,
};

document.getElementById('highScore').textContent = state.highScore;

// ==============================================
// ⚪ Player (Ball)
// ==============================================
const ball = {
  x: 0,             // ثابت (نسبت به دوربین)
  y: 0,
  radius: 22,
  vy: 0,
  gravity: 0.9,
  jumpPower: -18,
  isGrounded: true,
  rotation: 0,
  trail: [],
  colorHue: 0,
};

// Ball fixed x position
function resetBall() {
  ball.x = W * 0.22;
  ball.y = GROUND_Y - ball.radius;
  ball.vy = 0;
  ball.isGrounded = true;
  ball.rotation = 0;
  ball.trail = [];
}

// ==============================================
// 🧱 Obstacles & Collectibles
// ==============================================
let obstacles = [];
let coins = [];
let particles = [];
let stars = [];
let groundSegments = [];
let coinsCollected = 0;

// Background stars
function initStars() {
  stars = [];
  for (let i = 0; i < 120; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      size: Math.random() * 2 + 0.5,
      speed: Math.random() * 2 + 0.5,
      hue: Math.random() * 360,
      alpha: Math.random() * 0.7 + 0.3,
    });
  }
}
initStars();

// ==============================================
// 👆/🖱️ Input — Jump
// ==============================================
function jump() {
  if (!state.running) return;
  if (ball.isGrounded) {
    ball.vy = ball.jumpPower;
    ball.isGrounded = false;
    spawnJumpParticles();
  }
}

canvas.addEventListener('mousedown', jump);
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  jump();
}, { passive: false });
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp') {
    e.preventDefault();
    jump();
  }
});

// ==============================================
// 💥 Particles
// ==============================================
function spawnJumpParticles() {
  for (let i = 0; i < 12; i++) {
    particles.push({
      x: ball.x,
      y: ball.y + ball.radius,
      vx: (Math.random() - 0.5) * 8,
      vy: Math.random() * -4 - 1,
      life: 1,
      hue: ball.colorHue,
      size: Math.random() * 4 + 2,
    });
  }
}

function spawnCoinBurst(x, y, hue) {
  for (let i = 0; i < 18; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 6 + 2;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      hue,
      size: Math.random() * 4 + 2,
    });
  }
}

function spawnExplosion(x, y) {
  for (let i = 0; i < 40; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 10 + 3;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      hue: Math.random() * 360,
      size: Math.random() * 5 + 2,
    });
  }
}

// ==============================================
// 🧱 Obstacle Spawning
// ==============================================
let obstacleTimer = 0;
let coinTimer = 0;

function spawnObstacle() {
  const difficulty = state.speed / state.baseSpeed;
  const types = ['spike', 'block', 'tallSpike', 'doubleSpike'];
  
  // Choose type based on difficulty
  let type = 'spike';
  const r = Math.random();
  if (difficulty > 1.3 && r < 0.25) type = 'block';
  else if (difficulty > 1.8 && r < 0.5) type = 'tallSpike';
  else if (difficulty > 2.2 && r < 0.7) type = 'doubleSpike';

  const baseSize = 30 + Math.random() * 10;
  let ob = {
    x: W + 50,
    type,
    passed: false,
  };

  if (type === 'spike') {
    ob.width = baseSize;
    ob.height = baseSize;
  } else if (type === 'tallSpike') {
    ob.width = baseSize;
    ob.height = baseSize * 1.8;
  } else if (type === 'block') {
    ob.width = baseSize * 1.2;
    ob.height = baseSize * 1.2;
  } else if (type === 'doubleSpike') {
    ob.width = baseSize * 2.2;
    ob.height = baseSize;
  }

  ob.y = GROUND_Y - ob.height;
  ob.hue = Math.random() * 60 + 340; // pink/red range
  obstacles.push(ob);
}

function spawnCoin() {
  const minY = GROUND_Y - 220;
  const maxY = GROUND_Y - 80;
  const y = Math.random() * (maxY - minY) + minY;
  coins.push({
    x: W + 30,
    y,
    radius: 12,
    pulse: Math.random() * Math.PI * 2,
    collected: false,
    hue: Math.random() * 60 + 40, // gold/yellow range
  });
}

// ==============================================
// 🔄 Update
// ==============================================
let lastTime = performance.now();

function update(dt) {
  state.time += dt;
  state.hueShift = (state.hueShift + dt * 60) % 360;

  // ---- Speed increase over time ----
  const targetSpeed = Math.min(
    state.baseSpeed + state.time * 0.35,
    state.maxSpeed
  );
  state.speed += (targetSpeed - state.speed) * dt * 2;
  
  document.getElementById('speed').textContent = state.speed.toFixed(1) + 'x';

  // ---- Distance & Score ----
  state.distance += state.speed * dt * 60;
  state.score = Math.floor(state.distance / 10) + coinsCollected * 50;
  document.getElementById('score').textContent = state.score;

  // ---- Ball physics ----
  ball.vy += ball.gravity;
  ball.y += ball.vy;
  ball.rotation += state.speed * dt * 8;
  ball.colorHue = (state.hueShift + 180) % 360;

  // Ground collision
  if (ball.y + ball.radius >= GROUND_Y) {
    if (!ball.isGrounded) {
      spawnJumpParticles();
    }
    ball.y = GROUND_Y - ball.radius;
    ball.vy = 0;
    ball.isGrounded = true;
  }

  // Trail
  ball.trail.push({ x: ball.x, y: ball.y, life: 1 });
  if (ball.trail.length > 15) ball.trail.shift();
  ball.trail.forEach(t => t.life -= dt * 4);
  ball.trail = ball.trail.filter(t => t.life > 0);

  // ---- Spawn obstacles ----
  obstacleTimer += dt;
  const obstacleInterval = Math.max(0.55, 1.5 - state.time * 0.015);
  if (obstacleTimer > obstacleInterval) {
    obstacleTimer = 0;
    spawnObstacle();
  }

  // ---- Spawn coins ----
  coinTimer += dt;
  if (coinTimer > 1.2) {
    coinTimer = 0;
    if (Math.random() < 0.6) spawnCoin();
  }

  // ---- Update obstacles ----
  for (let i = obstacles.length - 1; i >= 0; i--) {
    const ob = obstacles[i];
    ob.x -= state.speed * dt * 60;

    // Score when passed
    if (!ob.passed && ob.x + ob.width < ball.x) {
      ob.passed = true;
      state.score += 10;
    }

    // Collision
    if (checkCollision(ball, ob)) {
      gameOver();
      return;
    }

    if (ob.x + ob.width < -50) {
      obstacles.splice(i, 1);
    }
  }

  // ---- Update coins ----
  for (let i = coins.length - 1; i >= 0; i--) {
    const c = coins[i];
    c.x -= state.speed * dt * 60;
    c.pulse += dt * 5;

    // Collect
    const dx = ball.x - c.x;
    const dy = ball.y - c.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < ball.radius + c.radius + 5) {
      coinsCollected++;
      spawnCoinBurst(c.x, c.y, c.hue);
      coins.splice(i, 1);
      continue;
    }

    if (c.x < -30) coins.splice(i, 1);
  }

  // ---- Update particles ----
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;
    p.vy += 0.4;
    p.vx *= 0.97;
    p.life -= dt * 2;
    if (p.life <= 0) particles.splice(i, 1);
  }

  // ---- Update stars ----
  for (const s of stars) {
    s.x -= s.speed * state.speed * 0.15 * dt * 60;
    if (s.x < -5) {
      s.x = W + 5;
      s.y = Math.random() * H;
    }
  }

  // ---- Shake ----
  state.shakeAmount *= 0.9;
}

function checkCollision(ball, ob) {
  // Circle vs rectangle
  const closestX = Math.max(ob.x, Math.min(ball.x, ob.x + ob.width));
  const closestY = Math.max(ob.y, Math.min(ball.y, ob.y + ob.height));
  const dx = ball.x - closestX;
  const dy = ball.y - closestY;
  return dx * dx + dy * dy < (ball.radius * 0.85) ** 2;
}

// ==============================================
// 🎨 Render
// ==============================================
function draw() {
  // Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  const hue1 = state.hueShift;
  bgGrad.addColorStop(0, `hsl(${hue1 + 240}, 70%, 8%)`);
  bgGrad.addColorStop(0.6, `hsl(${hue1 + 280}, 80%, 6%)`);
  bgGrad.addColorStop(1, `hsl(${hue1 + 320}, 90%, 4%)`);
  ctx.fillStyle = bgGrad;
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
    ctx.shadowColor = `hsl(${s.hue}, 100%, 70%)`;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  // ---- Ground Line (Neon) ----
  const groundHue = (state.hueShift + 180) % 360;
  // Glow
  ctx.shadowColor = `hsl(${groundHue}, 100%, 60%)`;
  ctx.shadowBlur = 30;
  ctx.strokeStyle = `hsl(${groundHue}, 100%, 65%)`;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(W, GROUND_Y);
  ctx.stroke();

  // Ground fill below
  ctx.shadowBlur = 0;
  const groundGrad = ctx.createLinearGradient(0, GROUND_Y, 0, H);
  groundGrad.addColorStop(0, `hsla(${groundHue}, 100%, 50%, 0.25)`);
  groundGrad.addColorStop(1, `hsla(${groundHue}, 100%, 30%, 0)`);
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

  // Ground moving pattern
  ctx.strokeStyle = `hsla(${groundHue}, 100%, 70%, 0.3)`;
  ctx.lineWidth = 1;
  const patternSpacing = 60;
  const patternOffset = (state.distance * 1.0) % patternSpacing;
  for (let i = -patternSpacing; i < W + patternSpacing; i += patternSpacing) {
    ctx.beginPath();
    ctx.moveTo(i - patternOffset, GROUND_Y);
    ctx.lineTo(i - patternOffset, GROUND_Y + 30);
    ctx.stroke();
  }

  // ---- Obstacles ----
  for (const ob of obstacles) {
    ctx.shadowColor = `hsl(${ob.hue}, 100%, 60%)`;
    ctx.shadowBlur = 25;

    if (ob.type === 'spike' || ob.type === 'tallSpike') {
      // Triangle spikes with gradient
      const grad = ctx.createLinearGradient(ob.x, ob.y, ob.x, ob.y + ob.height);
      grad.addColorStop(0, `hsl(${ob.hue}, 100%, 75%)`);
      grad.addColorStop(1, `hsl(${ob.hue}, 100%, 45%)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(ob.x + ob.width / 2, ob.y);
      ctx.lineTo(ob.x + ob.width, ob.y + ob.height);
      ctx.lineTo(ob.x, ob.y + ob.height);
      ctx.closePath();
      ctx.fill();

      // Inner bright core
      ctx.fillStyle = `hsl(${ob.hue}, 100%, 90%)`;
      ctx.beginPath();
      ctx.moveTo(ob.x + ob.width / 2, ob.y + 5);
      ctx.lineTo(ob.x + ob.width - 8, ob.y + ob.height - 3);
      ctx.lineTo(ob.x + 8, ob.y + ob.height - 3);
      ctx.closePath();
      ctx.fill();
    } else if (ob.type === 'block') {
      const grad = ctx.createLinearGradient(ob.x, ob.y, ob.x + ob.width, ob.y + ob.height);
      grad.addColorStop(0, `hsl(${ob.hue}, 100%, 70%)`);
      grad.addColorStop(1, `hsl(${ob.hue}, 100%, 40%)`);
      ctx.fillStyle = grad;
      ctx.fillRect(ob.x, ob.y, ob.width, ob.height);

      // Outline
      ctx.strokeStyle = `hsl(${ob.hue}, 100%, 90%)`;
      ctx.lineWidth = 2;
      ctx.strokeRect(ob.x + 2, ob.y + 2, ob.width - 4, ob.height - 4);
    } else if (ob.type === 'doubleSpike') {
      const w = ob.width / 2;
      for (let k = 0; k < 2; k++) {
        const ox = ob.x + k * w;
        const grad = ctx.createLinearGradient(ox, ob.y, ox, ob.y + ob.height);
        grad.addColorStop(0, `hsl(${ob.hue}, 100%, 75%)`);
        grad.addColorStop(1, `hsl(${ob.hue}, 100%, 45%)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(ox + w / 2, ob.y);
        ctx.lineTo(ox + w, ob.y + ob.height);
        ctx.lineTo(ox, ob.y + ob.height);
        ctx.closePath();
        ctx.fill();
      }
    }
  }
  ctx.shadowBlur = 0;

  // ---- Coins ----
  for (const c of coins) {
    const size = c.radius + Math.sin(c.pulse) * 2;

    // Glow
    const grad = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, size * 3);
    grad.addColorStop(0, `hsla(${c.hue}, 100%, 75%, 1)`);
    grad.addColorStop(0.4, `hsla(${c.hue}, 100%, 60%, 0.6)`);
    grad.addColorStop(1, `hsla(${c.hue}, 100%, 50%, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(c.x, c.y, size * 3, 0, Math.PI * 2);
    ctx.fill();

    // Core coin
    ctx.fillStyle = `hsl(${c.hue}, 100%, 70%)`;
    ctx.shadowColor = `hsl(${c.hue}, 100%, 60%)`;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(c.x, c.y, size, 0, Math.PI * 2);
    ctx.fill();

    // Inner symbol
    ctx.fillStyle = `hsl(${c.hue}, 100%, 95%)`;
    ctx.shadowBlur = 0;
    ctx.font = `bold ${size * 1.4}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', c.x, c.y + 1);
  }

  // ---- Particles ----
  for (const p of particles) {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = `hsl(${p.hue}, 100%, 65%)`;
    ctx.shadowColor = `hsl(${p.hue}, 100%, 60%)`;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;

  // ---- Ball trail ----
  for (let i = 0; i < ball.trail.length; i++) {
    const t = ball.trail[i];
    const alpha = t.life * 0.6;
    const size = ball.radius * (i / ball.trail.length) * 0.8;
    ctx.fillStyle = `hsla(${ball.colorHue}, 100%, 60%, ${alpha})`;
    ctx.beginPath();
    ctx.arc(t.x, t.y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- Ball ----
  // Outer glow
  const bGrad = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, ball.radius * 2.5);
  bGrad.addColorStop(0, `hsla(${ball.colorHue}, 100%, 75%, 1)`);
  bGrad.addColorStop(0.5, `hsla(${ball.colorHue}, 100%, 55%, 0.6)`);
  bGrad.addColorStop(1, `hsla(${ball.colorHue}, 100%, 50%, 0)`);
  ctx.fillStyle = bGrad;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius * 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Ball main gradient
  const ballGrad = ctx.createRadialGradient(
    ball.x - ball.radius * 0.3,
    ball.y - ball.radius * 0.3,
    2,
    ball.x,
    ball.y,
    ball.radius
  );
  ballGrad.addColorStop(0, `hsl(${ball.colorHue}, 100%, 95%)`);
  ballGrad.addColorStop(0.5, `hsl(${ball.colorHue}, 100%, 65%)`);
  ballGrad.addColorStop(1, `hsl(${ball.colorHue}, 100%, 45%)`);

  ctx.fillStyle = ballGrad;
  ctx.shadowColor = `hsl(${ball.colorHue}, 100%, 60%)`;
  ctx.shadowBlur = 25;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Ball pattern (rotating)
  ctx.save();
  ctx.translate(ball.x, ball.y);
  ctx.rotate(ball.rotation);
  ctx.strokeStyle = `hsla(${ball.colorHue}, 100%, 20%, 0.6)`;
  ctx.lineWidth = 2;
  for (let i = 0; i < 2; i++) {
    ctx.beginPath();
    ctx.arc(0, 0, ball.radius * (0.4 + i * 0.3), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(-ball.radius, 0);
  ctx.lineTo(ball.radius, 0);
  ctx.stroke();
  ctx.restore();

  // Highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.beginPath();
  ctx.arc(ball.x - ball.radius * 0.35, ball.y - ball.radius * 0.35, ball.radius * 0.25, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ==============================================
// 🔁 Game Loop
// ==============================================
function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  if (state.running) update(dt);
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
  state.distance = 0;
  state.speed = state.baseSpeed;
  state.shakeAmount = 0;

  obstacles = [];
  coins = [];
  particles = [];
  obstacleTimer = 0;
  coinTimer = 0;
  coinsCollected = 0;

  resetBall();
  initStars();

  document.getElementById('score').textContent = '0';
  document.getElementById('speed').textContent = '1x';
  document.getElementById('highScore').textContent = state.highScore;

  document.getElementById('startScreen').classList.add('hidden');
  document.getElementById('gameOverScreen').classList.add('hidden');
}

function gameOver() {
  state.running = false;
  state.shakeAmount = 40;

  spawnExplosion(ball.x, ball.y);

  if (state.score > state.highScore) {
    state.highScore = state.score;
    localStorage.setItem('crazyball_high', state.highScore);
  }

  document.getElementById('finalScore').textContent = state.score;
  document.getElementById('finalHighScore').textContent = state.highScore;
  document.getElementById('finalSpeed').textContent = state.speed.toFixed(1) + 'x';

  setTimeout(() => {
    document.getElementById('gameOverScreen').classList.remove('hidden');
  }, 600);
}

document.getElementById('startBtn').addEventListener('click', startGame);
document.getElementById('restartBtn').addEventListener('click', startGame);

// Start loop
requestAnimationFrame(loop);
