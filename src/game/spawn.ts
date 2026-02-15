import {
  ENEMY_STATS,
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  SPAWN_EDGE_PADDING,
  WAVE_BREAK_MS
} from "./constants";
import type { Enemy, EnemyType, GameState, Vector2 } from "./types";

const TIME_PRESSURE_INTERVAL_MS = 30_000;
const MAX_TIME_PRESSURE_TIER = 12;

function nextId(state: GameState, prefix: string): string {
  const id = `${prefix}-${state.nextId}`;
  state.nextId += 1;
  return id;
}

function scaleUp(
  baseValue: number,
  tier: number,
  perTierRatio: number,
  maxMultiplier: number
): number {
  const multiplier = Math.min(maxMultiplier, 1 + tier * perTierRatio);
  return baseValue * multiplier;
}

function scaleDown(
  baseValue: number,
  tier: number,
  perTierRatio: number,
  minMultiplier: number
): number {
  const multiplier = Math.max(minMultiplier, 1 - tier * perTierRatio);
  return baseValue * multiplier;
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

export function getTimePressureTier(elapsedMs: number): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) {
    return 0;
  }
  return Math.min(
    MAX_TIME_PRESSURE_TIER,
    Math.floor(elapsedMs / TIME_PRESSURE_INTERVAL_MS)
  );
}

export function getWaveSpawnBudget(wave: number, elapsedMs = 0): number {
  const baseBudget = 4 + Math.floor(wave * 1.8);
  const pressureTier = getTimePressureTier(elapsedMs);
  const timeBonus = Math.min(8, Math.floor(pressureTier / 2));
  return baseBudget + timeBonus;
}

export function getSpawnCooldownForWave(wave: number, elapsedMs = 0): number {
  const baseCooldown = Math.max(200, 900 - wave * 35);
  const pressureTier = getTimePressureTier(elapsedMs);
  const timeReduction = pressureTier * 35;
  return Math.max(130, baseCooldown - timeReduction);
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
  elapsedMs = 0,
  random: () => number = Math.random
): EnemyType[] {
  const queue: EnemyType[] = [];
  const budget = getWaveSpawnBudget(wave, elapsedMs);
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
  const pressureTier = getTimePressureTier(state.timeMs);
  const speed = scaleUp(stats.speed, pressureTier, 0.05, 1.6);
  const hp = Math.max(1, Math.round(scaleUp(stats.hp, pressureTier, 0.06, 1.75)));
  const contactDps = scaleUp(stats.contactDps, pressureTier, 0.05, 1.65);
  const projectileDamage = scaleUp(
    stats.projectileDamage,
    pressureTier,
    0.05,
    1.65
  );
  const shootIntervalMs = Math.max(
    0,
    scaleDown(stats.shootIntervalMs, pressureTier, 0.04, 0.45)
  );
  const spawnPoint = randomSpawnPoint(random);
  return {
    id: nextId(state, "enemy"),
    type,
    x: spawnPoint.x,
    y: spawnPoint.y,
    vx: 0,
    vy: 0,
    radius: stats.radius,
    hp,
    maxHp: hp,
    speed,
    contactDps,
    projectileDamage,
    shootIntervalMs,
    shootCooldownMs: shootIntervalMs * (0.4 + random() * 0.6),
    scoreValue: stats.scoreValue
  };
}

export function startWave(
  state: GameState,
  wave: number,
  random: () => number = Math.random
): void {
  state.spawn.wave = wave;
  state.spawn.queue = buildWaveQueue(wave, state.timeMs, random);
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
  state.spawn.spawnCooldownMs = getSpawnCooldownForWave(state.spawn.wave, state.timeMs);
}
