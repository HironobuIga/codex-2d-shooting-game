import type { EnemyType } from "./types";

export const LOGICAL_WIDTH = 1280;
export const LOGICAL_HEIGHT = 720;
export const FIXED_TIMESTEP_MS = 1000 / 60;

export const PLAYER_MAX_HP = 100;
export const PLAYER_SPEED = 380;
export const PLAYER_RADIUS = 18;
export const PLAYER_BASE_FIRE_COOLDOWN_MS = 160;
export const PLAYER_RAPID_FIRE_COOLDOWN_MS = 70;
export const PLAYER_BULLET_SPEED = 920;
export const PLAYER_BULLET_DAMAGE = 14;

export const ENEMY_BULLET_SPEED = 320;
export const ENEMY_BULLET_RADIUS = 6;
export const ENEMY_BULLET_TTL_MS = 3600;
export const ENEMY_BULLET_DAMAGE_MULTIPLIER = 1;

export const RAPID_FIRE_DURATION_MS = 8000;
export const HEAL_AMOUNT = 28;
export const POWER_UP_TTL_MS = 9000;
export const POWER_UP_DROP_CHANCE = 0.3;
export const POWER_UP_RADIUS = 14;

export const WAVE_BREAK_MS = 2000;
export const SPAWN_EDGE_PADDING = 42;
export const PLAYER_CONTACT_PUSHBACK = 280;

export const SURVIVAL_BONUS_INTERVAL_MS = 10_000;
export const SURVIVAL_BONUS_POINTS = 25;

export interface EnemyStat {
  radius: number;
  hp: number;
  speed: number;
  contactDps: number;
  projectileDamage: number;
  shootIntervalMs: number;
  scoreValue: number;
}

export const ENEMY_STATS: Record<EnemyType, EnemyStat> = {
  chaser: {
    radius: 16,
    hp: 28,
    speed: 140,
    contactDps: 12,
    projectileDamage: 0,
    shootIntervalMs: 0,
    scoreValue: 30
  },
  shooter: {
    radius: 18,
    hp: 34,
    speed: 105,
    contactDps: 8,
    projectileDamage: 7,
    shootIntervalMs: 1200,
    scoreValue: 45
  },
  tank: {
    radius: 24,
    hp: 90,
    speed: 72,
    contactDps: 20,
    projectileDamage: 0,
    shootIntervalMs: 0,
    scoreValue: 110
  }
};
