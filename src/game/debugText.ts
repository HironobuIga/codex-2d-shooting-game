import { getTimePressureTier } from "./spawn";
import type { GameState } from "./types";

export function renderGameToText(state: GameState): string {
  const payload = {
    mode: state.mode,
    coordinateSystem: "origin=(0,0) top-left, +x right, +y down",
    timeMs: Math.floor(state.timeMs),
    player: {
      x: Number(state.player.x.toFixed(1)),
      y: Number(state.player.y.toFixed(1)),
      vx: Number(state.player.vx.toFixed(1)),
      vy: Number(state.player.vy.toFixed(1)),
      hp: Number(state.player.hp.toFixed(1)),
      maxHp: state.player.maxHp,
      weaponCooldownMs: Number(state.player.weaponCooldownMs.toFixed(1))
    },
    enemies: state.enemies.map((enemy) => ({
      id: enemy.id,
      type: enemy.type,
      x: Number(enemy.x.toFixed(1)),
      y: Number(enemy.y.toFixed(1)),
      hp: Number(enemy.hp.toFixed(1))
    })),
    bullets: state.bullets.map((bullet) => ({
      owner: bullet.owner,
      x: Number(bullet.x.toFixed(1)),
      y: Number(bullet.y.toFixed(1)),
      vx: Number(bullet.vx.toFixed(1)),
      vy: Number(bullet.vy.toFixed(1))
    })),
    powerUps: state.powerUps.map((powerUp) => ({
      type: powerUp.type,
      x: Number(powerUp.x.toFixed(1)),
      y: Number(powerUp.y.toFixed(1)),
      ttlMs: Number(powerUp.ttlMs.toFixed(1))
    })),
    score: Math.floor(state.score),
    wave: state.spawn.wave,
    difficultyTier: getTimePressureTier(state.timeMs),
    nextWaveInMs: Number(state.spawn.nextWaveInMs.toFixed(1)),
    highScore: state.highScore
  };

  return JSON.stringify(payload);
}
