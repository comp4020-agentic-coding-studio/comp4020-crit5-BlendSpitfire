import { describe, expect, it } from "vitest";
import {
  applyEnemyBulletHit,
  applyEnemyCollision,
  createInitialState,
  maybeFireGunner,
  START_LIVES,
  type Enemy,
  type EnemyBullet,
} from "../src/scripts/game-logic";

// The spec's required "focused automated test": a collision between the
// player and an enemy ends the round once lives run out.

function withEnemy(): { state: ReturnType<typeof createInitialState>; enemy: Enemy } {
  const state = createInitialState({ x: 480, y: 720 });
  const enemy: Enemy = {
    id: 99,
    kind: "diver",
    pos: { x: 0, y: 0 },
    width: 10,
    height: 10,
    hp: 1,
    speed: 100,
  };
  return { state: { ...state, enemies: [enemy] }, enemy };
}

function withEnemyBullet(): { state: ReturnType<typeof createInitialState>; bullet: EnemyBullet } {
  const state = createInitialState({ x: 480, y: 720 });
  const bullet: EnemyBullet = { id: 42, pos: { x: 0, y: 0 }, width: 8, height: 8, speed: 220 };
  return { state: { ...state, enemyBullets: [bullet] }, bullet };
}

describe("applyEnemyCollision", () => {
  it("removes one life and clears the enemy on impact", () => {
    const { state, enemy } = withEnemy();
    const next = applyEnemyCollision(state, enemy.id, 10_000);

    expect(next.lives).toBe(START_LIVES - 1);
    expect(next.enemies).toHaveLength(0);
    expect(next.gameOver).toBe(false);
  });

  it("ends the round once lives reach zero", () => {
    let { state, enemy } = withEnemy();

    for (let i = 0; i < START_LIVES; i++) {
      // each hit lands well after the previous hit's invincibility window
      state = applyEnemyCollision(state, enemy.id, 10_000 * (i + 1) * 10);
      state = { ...state, enemies: [enemy] };
    }

    expect(state.lives).toBe(0);
    expect(state.gameOver).toBe(true);
  });

  it("does not remove a life while the player is briefly invincible", () => {
    const { state, enemy } = withEnemy();
    const justHit = applyEnemyCollision(state, enemy.id, 1_000);
    const secondEnemy: Enemy = { ...enemy, id: 100 };
    const withSecond = { ...justHit, enemies: [secondEnemy] };

    const stillInvincible = applyEnemyCollision(withSecond, secondEnemy.id, 1_050);

    expect(stillInvincible.lives).toBe(justHit.lives);
  });

  it("does nothing once the game is already over", () => {
    const { state, enemy } = withEnemy();
    const over = { ...state, gameOver: true, lives: 0 };

    const next = applyEnemyCollision(over, enemy.id, 5_000);

    expect(next).toBe(over);
  });
});

describe("applyEnemyBulletHit", () => {
  it("removes one life and clears the bullet on impact", () => {
    const { state, bullet } = withEnemyBullet();
    const next = applyEnemyBulletHit(state, bullet.id, 10_000);

    expect(next.lives).toBe(START_LIVES - 1);
    expect(next.enemyBullets).toHaveLength(0);
  });

  it("does not remove a life while the player is briefly invincible", () => {
    const { state, bullet } = withEnemyBullet();
    const justHit = applyEnemyBulletHit(state, bullet.id, 1_000);
    const secondBullet: EnemyBullet = { ...bullet, id: 43 };
    const withSecond = { ...justHit, enemyBullets: [secondBullet] };

    const stillInvincible = applyEnemyBulletHit(withSecond, secondBullet.id, 1_050);

    expect(stillInvincible.lives).toBe(justHit.lives);
  });
});

describe("maybeFireGunner", () => {
  it("ignores non-gunner enemies", () => {
    const diver: Enemy = {
      id: 1,
      kind: "diver",
      pos: { x: 0, y: 0 },
      width: 10,
      height: 10,
      hp: 1,
      speed: 100,
      nextFireAtMs: 0,
    };

    expect(maybeFireGunner(diver, 1_000, 5)).toBeNull();
  });

  it("holds fire until its cooldown elapses", () => {
    const gunner: Enemy = {
      id: 2,
      kind: "gunner",
      pos: { x: 0, y: 0 },
      width: 10,
      height: 10,
      hp: 2,
      speed: 50,
      nextFireAtMs: 1_000,
    };

    expect(maybeFireGunner(gunner, 900, 5)).toBeNull();
  });

  it("fires a bullet downward and resets its own cooldown", () => {
    const gunner: Enemy = {
      id: 3,
      kind: "gunner",
      pos: { x: 40, y: 20 },
      width: 10,
      height: 10,
      hp: 2,
      speed: 50,
      nextFireAtMs: 1_000,
    };

    const result = maybeFireGunner(gunner, 1_000, 7);

    expect(result).not.toBeNull();
    expect(result?.bullet.id).toBe(7);
    expect(result?.bullet.pos.y).toBeGreaterThan(gunner.pos.y);
    expect(result?.enemy.nextFireAtMs).toBeGreaterThan(1_000);
  });
});
