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

// "diver" enemies just descend; "gunner" enemies descend more slowly and
// fire straight down at intervals, tracked per-enemy via nextFireAtMs.
export type EnemyKind = "diver" | "gunner";

export interface Enemy extends Entity {
  kind: EnemyKind;
  hp: number;
  speed: number;
  nextFireAtMs?: number;
}

export interface Bullet extends Entity {
  speed: number;
}

export interface EnemyBullet extends Entity {
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
  enemyBullets: EnemyBullet[];
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
export const GUNNER_FIRE_INTERVAL_MS = 1500;
export const GUNNER_BULLET_SPEED = 220;

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

// Shared by every way the player can get hit: remove a life unless briefly
// invincible, and end the round once lives reach zero.
function loseLifeIfVulnerable(state: GameState, nowMs: number): GameState {
  if (nowMs < state.invincibleUntilMs) return state;
  const lives = state.lives - 1;
  return {
    ...state,
    lives,
    gameOver: lives <= 0,
    invincibleUntilMs: nowMs + INVINCIBILITY_MS,
  };
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
  return { ...loseLifeIfVulnerable(state, nowMs), enemies };
}

// Same rule, but for a gunner enemy's bullet reaching the player instead of
// the enemy's own body.
export function applyEnemyBulletHit(
  state: GameState,
  bulletId: number,
  nowMs: number,
): GameState {
  const bullet = state.enemyBullets.find((b) => b.id === bulletId);
  if (!bullet || state.gameOver) return state;

  const enemyBullets = state.enemyBullets.filter((b) => b.id !== bulletId);
  return { ...loseLifeIfVulnerable(state, nowMs), enemyBullets };
}

// A gunner fires once its cooldown elapses, resetting it for next time.
// Returns null when it's not a gunner or the cooldown hasn't elapsed.
export function maybeFireGunner(
  enemy: Enemy,
  nowMs: number,
  bulletId: number,
): { enemy: Enemy; bullet: EnemyBullet } | null {
  if (enemy.kind !== "gunner") return null;
  if (enemy.nextFireAtMs === undefined || nowMs < enemy.nextFireAtMs) return null;

  const bullet: EnemyBullet = {
    id: bulletId,
    pos: { x: enemy.pos.x + enemy.width / 2 - 4, y: enemy.pos.y + enemy.height },
    width: 8,
    height: 8,
    speed: GUNNER_BULLET_SPEED,
  };
  return {
    enemy: { ...enemy, nextFireAtMs: nowMs + GUNNER_FIRE_INTERVAL_MS },
    bullet,
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
    enemyBullets: [],
    powerups: [],
    spreadUntilMs: 0,
    lives: START_LIVES,
    score: 0,
    elapsedMs: 0,
    gameOver: false,
    nextId: 1,
  };
}
