import {
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  PLAYER_BASE_FIRE_COOLDOWN_MS,
  PLAYER_MAX_HP,
  PLAYER_RADIUS,
  PLAYER_SPEED
} from "./constants";
import { startWave } from "./spawn";
import type { GameState, Player } from "./types";

export function createPlayer(): Player {
  return {
    x: LOGICAL_WIDTH / 2,
    y: LOGICAL_HEIGHT / 2,
    vx: 0,
    vy: 0,
    radius: PLAYER_RADIUS,
    speed: PLAYER_SPEED,
    hp: PLAYER_MAX_HP,
    maxHp: PLAYER_MAX_HP,
    baseFireCooldownMs: PLAYER_BASE_FIRE_COOLDOWN_MS,
    activeFireCooldownMs: PLAYER_BASE_FIRE_COOLDOWN_MS,
    weaponCooldownMs: 0,
    rapidFireRemainingMs: 0
  };
}

export function createInitialGameState(highScore = 0): GameState {
  return {
    mode: "menu",
    timeMs: 0,
    arenaWidth: LOGICAL_WIDTH,
    arenaHeight: LOGICAL_HEIGHT,
    player: createPlayer(),
    enemies: [],
    bullets: [],
    powerUps: [],
    score: 0,
    highScore,
    survivalBonusTickerMs: 0,
    spawn: {
      wave: 0,
      queue: [],
      spawnCooldownMs: 0,
      nextWaveInMs: 0
    },
    nextId: 1,
    lastDamageFlashMs: 0
  };
}

export function resetRun(
  state: GameState,
  random: () => number = Math.random
): void {
  state.timeMs = 0;
  state.player = createPlayer();
  state.enemies = [];
  state.bullets = [];
  state.powerUps = [];
  state.score = 0;
  state.survivalBonusTickerMs = 0;
  state.lastDamageFlashMs = 0;
  startWave(state, 1, random);
  state.spawn.nextWaveInMs = 0;
}
