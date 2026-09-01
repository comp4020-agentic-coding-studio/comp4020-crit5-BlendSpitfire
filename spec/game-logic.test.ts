import { describe, expect, it } from "vitest";
import {
  applyEnemyCollision,
  createInitialState,
  START_LIVES,
  type Enemy,
} from "../src/scripts/game-logic";

// The spec's required "focused automated test": a collision between the
// player and an enemy ends the round once lives run out.

function withEnemy(): { state: ReturnType<typeof createInitialState>; enemy: Enemy } {
  const state = createInitialState({ x: 480, y: 720 });
  const enemy: Enemy = {
    id: 99,
    pos: { x: 0, y: 0 },
    width: 10,
    height: 10,
    hp: 1,
    speed: 100,
  };
  return { state: { ...state, enemies: [enemy] }, enemy };
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
