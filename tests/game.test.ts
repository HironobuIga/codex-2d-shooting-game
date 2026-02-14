import { describe, expect, it } from "vitest";

import { applyEnemyDamage } from "../src/game/collision";
import { ENEMY_STATS } from "../src/game/constants";
import { computeHighScore, loadHighScore, saveHighScore, type StorageLike } from "../src/game/persistence";
import { getWaveSpawnBudget } from "../src/game/spawn";
import { createInitialGameState, resetRun } from "../src/game/state";
import type { AudioBus, EnemyType, InputSnapshot } from "../src/game/types";
import { advanceGame, applyPowerUp } from "../src/game/update";

const idleInput: InputSnapshot = {
  moveX: 0,
  moveY: 0,
  shooting: false,
  spaceHeld: false,
  mouseX: 640,
  mouseY: 360,
  startPressed: false,
  pausePressed: false,
  restartPressed: false,
  fullscreenPressed: false
};

const silentAudio: AudioBus = {
  unlock: () => undefined,
  startBgm: () => undefined,
  stopBgm: () => undefined,
  playShot: () => undefined,
  playHit: () => undefined,
  playEnemyDown: () => undefined,
  playPickup: () => undefined,
  playGameOver: () => undefined
};

class MemoryStorage implements StorageLike {
  private readonly map = new Map<string, string>();

  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

describe("enemy damage and defeat rules", () => {
  const enemyTypes: EnemyType[] = ["chaser", "shooter", "tank"];

  for (const enemyType of enemyTypes) {
    it(`defeats ${enemyType} when HP threshold is exceeded`, () => {
      const enemy = {
        id: "enemy-test",
        type: enemyType,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        radius: ENEMY_STATS[enemyType].radius,
        hp: ENEMY_STATS[enemyType].hp,
        maxHp: ENEMY_STATS[enemyType].hp,
        speed: ENEMY_STATS[enemyType].speed,
        contactDps: ENEMY_STATS[enemyType].contactDps,
        projectileDamage: ENEMY_STATS[enemyType].projectileDamage,
        shootCooldownMs: ENEMY_STATS[enemyType].shootIntervalMs,
        scoreValue: ENEMY_STATS[enemyType].scoreValue
      };

      const defeated = applyEnemyDamage(enemy, enemy.maxHp + 1);
      expect(defeated).toBe(true);
      expect(enemy.hp).toBeLessThanOrEqual(0);
    });
  }
});

describe("wave scaling", () => {
  it("is monotonically non-decreasing", () => {
    for (let wave = 1; wave <= 20; wave += 1) {
      expect(getWaveSpawnBudget(wave + 1)).toBeGreaterThanOrEqual(getWaveSpawnBudget(wave));
    }
  });
});

describe("power-up behavior", () => {
  it("rapid fire applies and expires back to base cooldown", () => {
    const state = createInitialGameState(0);
    resetRun(state, () => 0.3);
    state.mode = "playing";

    const baseCooldown = state.player.baseFireCooldownMs;
    applyPowerUp(state.player, "rapidFire");
    expect(state.player.activeFireCooldownMs).toBeLessThan(baseCooldown);
    expect(state.player.rapidFireRemainingMs).toBeGreaterThan(0);

    for (let i = 0; i < 9; i += 1) {
      advanceGame(state, idleInput, 1000, silentAudio, () => 0.99);
    }

    expect(state.player.rapidFireRemainingMs).toBe(0);
    expect(state.player.activeFireCooldownMs).toBe(baseCooldown);
  });
});

describe("high score persistence", () => {
  it("reads and writes local high score storage", () => {
    const storage = new MemoryStorage();
    expect(loadHighScore(storage)).toBe(0);

    saveHighScore(320, storage);
    expect(loadHighScore(storage)).toBe(320);

    expect(computeHighScore(320, 300)).toBe(320);
    expect(computeHighScore(320, 500)).toBe(500);
  });
});
