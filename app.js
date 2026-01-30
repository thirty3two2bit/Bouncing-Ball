const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// HiDPI-friendly resize
function resizeCanvasToDisplaySize() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));

  const displayW = Math.floor(rect.width);
  const displayH = Math.floor(rect.height);

  const needResize = canvas.width !== displayW * dpr || canvas.height !== displayH * dpr;
  if (needResize) {
    canvas.width = displayW * dpr;
    canvas.height = displayH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels
  }
  return { w: displayW, h: displayH };
}

const world = {
  gravity: 1200,   // px/s^2
  restitution: 0.82, // bounciness (0..1)
  friction: 0.995, // horizontal damping per frame
};

let paused = false;

const ball = {
  r: 18,
  x: 160,
  y: 120,
  vx: 280, // px/s
  vy: -40, // px/s
};

function resetBall(bounds) {
  ball.x = bounds.w * 0.25;
  ball.y = bounds.h * 0.3;
  ball.vx = 280;
  ball.vy = -40;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function step(dt, bounds) {
  // integrate velocity
  ball.vy += world.gravity * dt;

  // integrate position
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  // collisions with walls
  const left = ball.r;
  const right = bounds.w - ball.r;
  const top = ball.r;
  const bottom = bounds.h - ball.r;

  if (ball.x < left) {
    ball.x = left;
    ball.vx = Math.abs(ball.vx) * world.restitution;
  } else if (ball.x > right) {
    ball.x = right;
    ball.vx = -Math.abs(ball.vx) * world.restitution;
  }

  if (ball.y < top) {
    ball.y = top;
    ball.vy = Math.abs(ball.vy) * world.restitution;
  } else if (ball.y > bottom) {
    ball.y = bottom;
    ball.vy = -Math.abs(ball.vy) * world.restitution;

    // tiny energy loss + horizontal damping on floor contact
    ball.vx *= world.friction;

    // if almost stopped, settle
    if (Math.abs(ball.vy) < 18) ball.vy = 0;
  }

  // mild air drag
  ball.vx *= 0.999;
}

function draw(bounds) {
  // background
  ctx.clearRect(0, 0, bounds.w, bounds.h);

  // subtle grid
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  const grid = 40;
  for (let x = 0.5; x < bounds.w; x += grid) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, bounds.h);
  }
  for (let y = 0.5; y < bounds.h; y += grid) {
    ctx.moveTo(0, y);
    ctx.lineTo(bounds.w, y);
  }
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.stroke();
  ctx.globalAlpha = 1;

  // ball shadow
  const groundY = bounds.h - 6;
  const shadowW = clamp(80 - Math.abs(ball.vy) * 0.03, 20, 80);
  ctx.beginPath();
  ctx.ellipse(ball.x, groundY, shadowW, shadowW * 0.22, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fill();

  // ball
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);

  // simple “shiny” gradient look
  const g = ctx.createRadialGradient(
    ball.x - ball.r * 0.35,
    ball.y - ball.r * 0.35,
    ball.r * 0.25,
    ball.x,
    ball.y,
    ball.r * 1.2
  );
  g.addColorStop(0, "rgba(255,255,255,0.95)");
  g.addColorStop(0.2, "rgba(180,220,255,0.9)");
  g.addColorStop(1, "rgba(40,120,255,0.9)");

  ctx.fillStyle = g;
  ctx.fill();

  // HUD
  ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, Arial";
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fillText(`gravity: ${world.gravity.toFixed(0)} px/s²`, 12, 20);
  ctx.fillText(`restitution: ${world.restitution.toFixed(2)}`, 12, 36);
  ctx.fillText(`paused: ${paused ? "yes" : "no"}`, 12, 52);
}

let lastT = performance.now();
function loop(t) {
  const bounds = resizeCanvasToDisplaySize();
  const dt = clamp((t - lastT) / 1000, 0, 1 / 20); // clamp big jumps
  lastT = t;

  if (!paused) step(dt, bounds);
  draw(bounds);

  requestAnimationFrame(loop);
}

window.addEventListener("resize", () => resizeCanvasToDisplaySize());

canvas.addEventListener("click", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  ball.x = x;
  ball.y = y;
  // give it a small kick so it’s not boring
  ball.vx = (Math.random() * 2 - 1) * 360;
  ball.vy = -Math.random() * 420;
});

window.addEventListener("keydown", (e) => {
  const bounds = resizeCanvasToDisplaySize();
  if (e.key.toLowerCase() === "r") resetBall(bounds);
  if (e.key.toLowerCase() === "p") paused = !paused;

  // tiny “debug” controls to make it fun:
  if (e.key === "ArrowUp") world.gravity = clamp(world.gravity + 100, 100, 4000);
  if (e.key === "ArrowDown") world.gravity = clamp(world.gravity - 100, 100, 4000);
  if (e.key === "ArrowRight") world.restitution = clamp(world.restitution + 0.02, 0.1, 0.99);
  if (e.key === "ArrowLeft") world.restitution = clamp(world.restitution - 0.02, 0.1, 0.99);
});

resizeCanvasToDisplaySize();
requestAnimationFrame(loop);
