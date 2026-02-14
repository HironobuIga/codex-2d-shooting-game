import {
  ENEMY_STATS,
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  SPAWN_EDGE_PADDING,
  WAVE_BREAK_MS
} from "./constants";
import type { Enemy, EnemyType, GameState, Vector2 } from "./types";

function nextId(state: GameState, prefix: string): string {
  const id = `${prefix}-${state.nextId}`;
  state.nextId += 1;
  return id;
}

function randomSpawnPoint(random: () => number): Vector2 {
  const side = Math.floor(random() * 4);
  if (side === 0) {
    return {
      x: SPAWN_EDGE_PADDING + random() * (LOGICAL_WIDTH - SPAWN_EDGE_PADDING * 2),
      y: SPAWN_EDGE_PADDING
    };
  }
  if (side === 1) {
    return {
      x: LOGICAL_WIDTH - SPAWN_EDGE_PADDING,
      y: SPAWN_EDGE_PADDING + random() * (LOGICAL_HEIGHT - SPAWN_EDGE_PADDING * 2)
    };
  }
  if (side === 2) {
    return {
      x: SPAWN_EDGE_PADDING + random() * (LOGICAL_WIDTH - SPAWN_EDGE_PADDING * 2),
      y: LOGICAL_HEIGHT - SPAWN_EDGE_PADDING
    };
  }
  return {
    x: SPAWN_EDGE_PADDING,
    y: SPAWN_EDGE_PADDING + random() * (LOGICAL_HEIGHT - SPAWN_EDGE_PADDING * 2)
  };
}

export function getWaveSpawnBudget(wave: number): number {
  return 4 + Math.floor(wave * 1.8);
}

export function getSpawnCooldownForWave(wave: number): number {
  return Math.max(200, 900 - wave * 35);
}

function pickEnemyType(wave: number, random: () => number): EnemyType {
  const roll = random();
  if (wave <= 2) {
    return roll < 0.75 ? "chaser" : "shooter";
  }
  if (wave <= 5) {
    if (roll < 0.52) {
      return "chaser";
    }
    if (roll < 0.9) {
      return "shooter";
    }
    return "tank";
  }
  if (roll < 0.35) {
    return "chaser";
  }
  if (roll < 0.75) {
    return "shooter";
  }
  return "tank";
}

export function buildWaveQueue(
  wave: number,
  random: () => number = Math.random
): EnemyType[] {
  const queue: EnemyType[] = [];
  const budget = getWaveSpawnBudget(wave);
  for (let i = 0; i < budget; i += 1) {
    queue.push(pickEnemyType(wave, random));
  }
  if (wave % 3 === 0 && !queue.includes("tank")) {
    const index = Math.floor(random() * queue.length);
    queue[index] = "tank";
  }
  return queue;
}

export function createEnemy(
  state: GameState,
  type: EnemyType,
  random: () => number = Math.random
): Enemy {
  const stats = ENEMY_STATS[type];
  const spawnPoint = randomSpawnPoint(random);
  return {
    id: nextId(state, "enemy"),
    type,
    x: spawnPoint.x,
    y: spawnPoint.y,
    vx: 0,
    vy: 0,
    radius: stats.radius,
    hp: stats.hp,
    maxHp: stats.hp,
    speed: stats.speed,
    contactDps: stats.contactDps,
    projectileDamage: stats.projectileDamage,
    shootCooldownMs: stats.shootIntervalMs * (0.4 + random() * 0.6),
    scoreValue: stats.scoreValue
  };
}

export function startWave(
  state: GameState,
  wave: number,
  random: () => number = Math.random
): void {
  state.spawn.wave = wave;
  state.spawn.queue = buildWaveQueue(wave, random);
  state.spawn.spawnCooldownMs = 320;
  state.spawn.nextWaveInMs = WAVE_BREAK_MS;
}

export function tickSpawnQueue(
  state: GameState,
  dtMs: number,
  random: () => number = Math.random
): void {
  if (state.spawn.queue.length === 0) {
    return;
  }
  state.spawn.spawnCooldownMs -= dtMs;
  if (state.spawn.spawnCooldownMs > 0) {
    return;
  }
  const type = state.spawn.queue.shift();
  if (!type) {
    return;
  }
  state.enemies.push(createEnemy(state, type, random));
  state.spawn.spawnCooldownMs = getSpawnCooldownForWave(state.spawn.wave);
}
