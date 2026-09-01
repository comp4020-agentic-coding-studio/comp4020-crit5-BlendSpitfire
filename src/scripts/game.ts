import {
  aabbIntersects,
  applyEnemyCollision,
  clampToBounds,
  createInitialState,
  enemySpeed,
  spawnIntervalMs,
  type Bullet,
  type Enemy,
  type GameState,
  type Powerup,
} from "./game-logic";

const canvas = document.querySelector<HTMLCanvasElement>("#game");
if (!canvas) throw new Error("missing #game canvas");
const ctx = canvas.getContext("2d");
if (!ctx) throw new Error("2d context unavailable");

const BOUNDS = { x: 480, y: 720 };
canvas.width = BOUNDS.x;
canvas.height = BOUNDS.y;

const PLAYER_SPEED = 260; // px/s
const BULLET_SPEED = 480;
const FIRE_INTERVAL_MS = 260;
const SPREAD_FIRE_INTERVAL_MS = 200;
const SPREAD_DURATION_MS = 6000;
const POWERUP_INTERVAL_MS = 9000;
const POWERUP_SPEED = 90;

let state: GameState = createInitialState(BOUNDS);
let lastFireMs = 0;
let lastSpawnAt = 0;
let lastPowerupAt = 0;

const keys = new Set<string>();
window.addEventListener("keydown", (e) => keys.add(e.key.toLowerCase()));
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

let pointerTarget: { x: number; y: number } | null = null;

function pointerToCanvas(clientX: number, clientY: number) {
  const rect = canvas!.getBoundingClientRect();
  const scaleX = BOUNDS.x / rect.width;
  const scaleY = BOUNDS.y / rect.height;
  return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
}

canvas.addEventListener("pointerdown", (e) => {
  if (state.gameOver) {
    state = createInitialState(BOUNDS);
    lastSpawnAt = 0;
    lastPowerupAt = 0;
    return;
  }
  pointerTarget = pointerToCanvas(e.clientX, e.clientY);
});
canvas.addEventListener("pointermove", (e) => {
  if (e.buttons === 0 && e.pointerType === "mouse") return;
  pointerTarget = pointerToCanvas(e.clientX, e.clientY);
});
window.addEventListener("pointerup", () => {
  pointerTarget = null;
});

function movementFromKeys(dt: number): { dx: number; dy: number } {
  let dx = 0;
  let dy = 0;
  if (keys.has("arrowleft") || keys.has("a")) dx -= 1;
  if (keys.has("arrowright") || keys.has("d")) dx += 1;
  if (keys.has("arrowup") || keys.has("w")) dy -= 1;
  if (keys.has("arrowdown") || keys.has("s")) dy += 1;
  const len = Math.hypot(dx, dy) || 1;
  return { dx: (dx / len) * PLAYER_SPEED * dt, dy: (dy / len) * PLAYER_SPEED * dt };
}

function spawnEnemy(nowMs: number) {
  const width = 34;
  const height = 30;
  const enemy: Enemy = {
    id: state.nextId,
    pos: { x: Math.random() * (BOUNDS.x - width), y: -height },
    width,
    height,
    hp: Math.random() < 0.15 ? 2 : 1,
    speed: enemySpeed(nowMs) * (0.85 + Math.random() * 0.3),
  };
  state = { ...state, enemies: [...state.enemies, enemy], nextId: state.nextId + 1 };
}

function spawnPowerup(nowMs: number) {
  const width = 22;
  const height = 22;
  const powerup: Powerup = {
    id: state.nextId,
    pos: { x: Math.random() * (BOUNDS.x - width), y: -height },
    width,
    height,
    speed: POWERUP_SPEED,
  };
  state = { ...state, powerups: [...state.powerups, powerup], nextId: state.nextId + 1 };
  void nowMs;
}

// Bullets travel mostly straight up; a spread-shot power-up adds bullets
// that drift sideways. The horizontal drift is fixed at spawn time.
interface DirectedBullet extends Bullet {
  dx: number;
}

function fireBullets(nowMs: number) {
  const spreading = nowMs < state.spreadUntilMs;
  const interval = spreading ? SPREAD_FIRE_INTERVAL_MS : FIRE_INTERVAL_MS;
  if (nowMs - lastFireMs < interval) return;
  lastFireMs = nowMs;

  const cx = state.player.pos.x + state.player.width / 2;
  const top = state.player.pos.y;
  const angles = spreading ? [-0.28, 0, 0.28] : [0];
  const bullets: DirectedBullet[] = angles.map((angle, i) => ({
    id: state.nextId + i,
    pos: { x: cx - 3, y: top },
    width: 6,
    height: 14,
    speed: BULLET_SPEED,
    dx: Math.sin(angle) * BULLET_SPEED,
  }));
  state = {
    ...state,
    bullets: [...state.bullets, ...bullets],
    nextId: state.nextId + angles.length,
  };
}

function update(dt: number, nowMs: number) {
  if (state.gameOver) return;

  const move = movementFromKeys(dt);
  let pos = { x: state.player.pos.x + move.dx, y: state.player.pos.y + move.dy };
  if (pointerTarget) {
    pos = {
      x: pointerTarget.x - state.player.width / 2,
      y: pointerTarget.y - state.player.height / 2,
    };
  }
  pos = clampToBounds(pos, state.player.width, state.player.height, BOUNDS);
  state = { ...state, player: { ...state.player, pos }, elapsedMs: state.elapsedMs + dt * 1000 };

  if (nowMs - lastSpawnAt > spawnIntervalMs(state.elapsedMs)) {
    lastSpawnAt = nowMs;
    spawnEnemy(state.elapsedMs);
  }
  if (nowMs - lastPowerupAt > POWERUP_INTERVAL_MS) {
    lastPowerupAt = nowMs;
    spawnPowerup(state.elapsedMs);
  }

  fireBullets(nowMs);

  const bullets = (state.bullets as DirectedBullet[])
    .map((b) => ({ ...b, pos: { x: b.pos.x + (b.dx ?? 0) * dt, y: b.pos.y - b.speed * dt } }))
    .filter((b) => b.pos.y + b.height > 0);

  const enemies = state.enemies
    .map((e) => ({ ...e, pos: { x: e.pos.x, y: e.pos.y + e.speed * dt } }))
    .filter((e) => e.pos.y < BOUNDS.y + e.height);

  const powerups = state.powerups
    .map((p) => ({ ...p, pos: { x: p.pos.x, y: p.pos.y + p.speed * dt } }))
    .filter((p) => p.pos.y < BOUNDS.y + p.height);

  state = { ...state, bullets, enemies, powerups };

  // bullet vs enemy
  let score = state.score;
  const hitEnemyIds = new Set<number>();
  const hitBulletIds = new Set<number>();
  const hpById = new Map(state.enemies.map((e) => [e.id, e.hp]));
  for (const bullet of state.bullets) {
    if (hitBulletIds.has(bullet.id)) continue;
    for (const enemy of state.enemies) {
      if (hitEnemyIds.has(enemy.id)) continue;
      if (aabbIntersects(bullet, enemy)) {
        hitBulletIds.add(bullet.id);
        const hp = (hpById.get(enemy.id) ?? enemy.hp) - 1;
        hpById.set(enemy.id, hp);
        if (hp <= 0) {
          hitEnemyIds.add(enemy.id);
          score += 10;
        }
        break;
      }
    }
  }
  if (hitBulletIds.size || hitEnemyIds.size) {
    state = {
      ...state,
      score,
      bullets: state.bullets.filter((b) => !hitBulletIds.has(b.id)),
      enemies: state.enemies
        .filter((e) => !hitEnemyIds.has(e.id))
        .map((e) => ({ ...e, hp: hpById.get(e.id) ?? e.hp })),
    };
  }

  // player vs enemy
  for (const enemy of state.enemies) {
    if (aabbIntersects(state.player, enemy)) {
      state = applyEnemyCollision(state, enemy.id, nowMs);
      break;
    }
  }

  // player vs powerup
  const collectedIds = new Set<number>();
  for (const powerup of state.powerups) {
    if (aabbIntersects(state.player, powerup)) collectedIds.add(powerup.id);
  }
  if (collectedIds.size) {
    state = {
      ...state,
      powerups: state.powerups.filter((p) => !collectedIds.has(p.id)),
      spreadUntilMs: nowMs + SPREAD_DURATION_MS,
    };
  }
}

function draw(nowMs: number) {
  const c = ctx!;
  c.fillStyle = "#05070f";
  c.fillRect(0, 0, BOUNDS.x, BOUNDS.y);

  c.fillStyle = "#132042";
  for (let i = 0; i < 40; i++) {
    const x = (i * 97) % BOUNDS.x;
    const y = (i * 133 + state.elapsedMs * 0.05) % BOUNDS.y;
    c.fillRect(x, y, 2, 2);
  }

  const invincible = nowMs < state.invincibleUntilMs;
  c.fillStyle = invincible && Math.floor(nowMs / 100) % 2 === 0 ? "#ffffff88" : "#4ade80";
  drawTriangle(c, state.player.pos.x, state.player.pos.y, state.player.width, state.player.height);

  c.fillStyle = "#f8fafc";
  for (const bullet of state.bullets) {
    c.fillRect(bullet.pos.x, bullet.pos.y, bullet.width, bullet.height);
  }

  for (const enemy of state.enemies) {
    c.fillStyle = enemy.hp > 1 ? "#f97316" : "#ef4444";
    drawTriangle(c, enemy.pos.x, enemy.pos.y, enemy.width, enemy.height, true);
  }

  c.fillStyle = "#38bdf8";
  for (const powerup of state.powerups) {
    c.beginPath();
    c.arc(
      powerup.pos.x + powerup.width / 2,
      powerup.pos.y + powerup.height / 2,
      powerup.width / 2,
      0,
      Math.PI * 2,
    );
    c.fill();
  }

  // HUD: score + life icons, drawn on canvas so no separate instructional text.
  c.fillStyle = "#e2e8f0";
  c.font = "20px system-ui, sans-serif";
  c.textBaseline = "top";
  c.fillText(String(state.score), 14, 12);
  for (let i = 0; i < state.lives; i++) {
    c.fillStyle = "#4ade80";
    drawTriangle(c, BOUNDS.x - 14 - (i + 1) * 26, 14, 18, 20);
  }

  if (state.gameOver) {
    c.fillStyle = "#00000099";
    c.fillRect(0, 0, BOUNDS.x, BOUNDS.y);
    c.fillStyle = "#f8fafc";
    c.textAlign = "center";
    c.font = "bold 40px system-ui, sans-serif";
    c.fillText(String(state.score), BOUNDS.x / 2, BOUNDS.y / 2 - 30);
    c.font = "18px system-ui, sans-serif";
    c.fillStyle = "#94a3b8";
    c.fillText("↻", BOUNDS.x / 2, BOUNDS.y / 2 + 20);
    c.textAlign = "left";
  }
}

function drawTriangle(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  pointDown = false,
) {
  c.beginPath();
  if (pointDown) {
    c.moveTo(x, y);
    c.lineTo(x + w, y);
    c.lineTo(x + w / 2, y + h);
  } else {
    c.moveTo(x + w / 2, y);
    c.lineTo(x + w, y + h);
    c.lineTo(x, y + h);
  }
  c.closePath();
  c.fill();
}

let lastFrame = performance.now();
function loop(now: number) {
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  update(dt, now);
  draw(now);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
