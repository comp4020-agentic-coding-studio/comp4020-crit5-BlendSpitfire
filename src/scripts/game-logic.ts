// Pure game logic: no DOM, no canvas, no timers. Everything the rendering
// loop in game.ts calls through to, and everything spec/game-logic.test.ts
// exercises directly.

export interface Vec2 {
  x: number;
  y: number;
}

export interface Entity {
  id: number;
  pos: Vec2;
  width: number;
  height: number;
}

export interface Enemy extends Entity {
  hp: number;
  speed: number;
}

export interface Bullet extends Entity {
  speed: number;
}

export interface Powerup extends Entity {
  speed: number;
}

export interface GameState {
  player: Entity;
  invincibleUntilMs: number;
  enemies: Enemy[];
  bullets: Bullet[];
  powerups: Powerup[];
  spreadUntilMs: number;
  lives: number;
  score: number;
  elapsedMs: number;
  gameOver: boolean;
  nextId: number;
}

export const START_LIVES = 3;
export const INVINCIBILITY_MS = 1200;

export function aabbIntersects(a: Entity, b: Entity): boolean {
  return (
    a.pos.x < b.pos.x + b.width &&
    a.pos.x + a.width > b.pos.x &&
    a.pos.y < b.pos.y + b.height &&
    a.pos.y + a.height > b.pos.y
  );
}

// Difficulty ramp: enemies per second, purely a function of elapsed time so
// it can be reasoned about and tested without running the game loop.
export function spawnIntervalMs(elapsedMs: number): number {
  const startMs = 900;
  const floorMs = 260;
  const rampMs = 45_000; // reaches the floor after 45s of play
  const t = Math.min(1, elapsedMs / rampMs);
  return startMs - (startMs - floorMs) * t;
}

export function enemySpeed(elapsedMs: number): number {
  const startSpeed = 70;
  const maxSpeed = 220;
  const rampMs = 60_000;
  const t = Math.min(1, elapsedMs / rampMs);
  return startSpeed + (maxSpeed - startSpeed) * t;
}

// The spec-required, focused rule: a collision between the player and an
// enemy removes one life (unless the player is briefly invincible), clears
// that enemy, and ends the round once lives reach zero.
export function applyEnemyCollision(
  state: GameState,
  enemyId: number,
  nowMs: number,
): GameState {
  const enemy = state.enemies.find((e) => e.id === enemyId);
  if (!enemy || state.gameOver) return state;

  const enemies = state.enemies.filter((e) => e.id !== enemyId);

  if (nowMs < state.invincibleUntilMs) {
    return { ...state, enemies };
  }

  const lives = state.lives - 1;
  return {
    ...state,
    enemies,
    lives,
    gameOver: lives <= 0,
    invincibleUntilMs: nowMs + INVINCIBILITY_MS,
  };
}

export function clampToBounds(pos: Vec2, width: number, height: number, bounds: Vec2): Vec2 {
  return {
    x: Math.max(0, Math.min(bounds.x - width, pos.x)),
    y: Math.max(0, Math.min(bounds.y - height, pos.y)),
  };
}

export function createInitialState(bounds: Vec2): GameState {
  const width = 36;
  const height = 40;
  return {
    player: {
      id: 0,
      pos: { x: bounds.x / 2 - width / 2, y: bounds.y - height - 24 },
      width,
      height,
    },
    invincibleUntilMs: 0,
    enemies: [],
    bullets: [],
    powerups: [],
    spreadUntilMs: 0,
    lives: START_LIVES,
    score: 0,
    elapsedMs: 0,
    gameOver: false,
    nextId: 1,
  };
}
