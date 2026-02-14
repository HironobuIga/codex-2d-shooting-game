import {
  ENEMY_BULLET_DAMAGE_MULTIPLIER,
  ENEMY_BULLET_RADIUS,
  ENEMY_BULLET_SPEED,
  ENEMY_BULLET_TTL_MS,
  ENEMY_STATS,
  HEAL_AMOUNT,
  PLAYER_BULLET_DAMAGE,
  PLAYER_BULLET_SPEED,
  PLAYER_CONTACT_PUSHBACK,
  PLAYER_RAPID_FIRE_COOLDOWN_MS,
  POWER_UP_DROP_CHANCE,
  POWER_UP_RADIUS,
  POWER_UP_TTL_MS,
  RAPID_FIRE_DURATION_MS,
  SURVIVAL_BONUS_INTERVAL_MS,
  SURVIVAL_BONUS_POINTS,
  WAVE_BREAK_MS
} from "./constants";
import { applyEnemyDamage, circlesOverlap, keepInsideArena, normalize } from "./collision";
import { startWave, tickSpawnQueue } from "./spawn";
import type { AudioBus, Bullet, Enemy, GameState, InputSnapshot, PowerUpType } from "./types";

function nextId(state: GameState, prefix: string): string {
  const id = `${prefix}-${state.nextId}`;
  state.nextId += 1;
  return id;
}

function createPlayerBullet(
  state: GameState,
  directionX: number,
  directionY: number
): Bullet {
  return {
    id: nextId(state, "pbullet"),
    owner: "player",
    x: state.player.x,
    y: state.player.y,
    vx: directionX * PLAYER_BULLET_SPEED,
    vy: directionY * PLAYER_BULLET_SPEED,
    radius: 5,
    damage: PLAYER_BULLET_DAMAGE,
    ttlMs: 1700
  };
}

function createEnemyBullet(state: GameState, enemy: Enemy, directionX: number, directionY: number): Bullet {
  return {
    id: nextId(state, "ebullet"),
    owner: "enemy",
    x: enemy.x,
    y: enemy.y,
    vx: directionX * ENEMY_BULLET_SPEED,
    vy: directionY * ENEMY_BULLET_SPEED,
    radius: ENEMY_BULLET_RADIUS,
    damage: enemy.projectileDamage * ENEMY_BULLET_DAMAGE_MULTIPLIER,
    ttlMs: ENEMY_BULLET_TTL_MS
  };
}

function maybeDropPowerUp(
  state: GameState,
  x: number,
  y: number,
  random: () => number
): void {
  if (random() > POWER_UP_DROP_CHANCE) {
    return;
  }
  const type: PowerUpType = random() < 0.58 ? "rapidFire" : "heal";
  state.powerUps.push({
    id: nextId(state, "power"),
    type,
    x,
    y,
    radius: POWER_UP_RADIUS,
    ttlMs: POWER_UP_TTL_MS
  });
}

export function applyPowerUp(player: GameState["player"], type: PowerUpType): void {
  if (type === "rapidFire") {
    player.rapidFireRemainingMs = RAPID_FIRE_DURATION_MS;
    player.activeFireCooldownMs = PLAYER_RAPID_FIRE_COOLDOWN_MS;
    return;
  }
  player.hp = Math.min(player.maxHp, player.hp + HEAL_AMOUNT);
}

function updatePowerUpTimer(player: GameState["player"], dtMs: number): void {
  if (player.rapidFireRemainingMs <= 0) {
    player.activeFireCooldownMs = player.baseFireCooldownMs;
    return;
  }
  player.rapidFireRemainingMs = Math.max(0, player.rapidFireRemainingMs - dtMs);
  if (player.rapidFireRemainingMs === 0) {
    player.activeFireCooldownMs = player.baseFireCooldownMs;
  } else {
    player.activeFireCooldownMs = PLAYER_RAPID_FIRE_COOLDOWN_MS;
  }
}

function updatePlayer(state: GameState, input: InputSnapshot, dtMs: number, audio: AudioBus): void {
  const dtSeconds = dtMs / 1000;
  const direction = normalize(input.moveX, input.moveY);
  state.player.vx = direction.x * state.player.speed;
  state.player.vy = direction.y * state.player.speed;
  state.player.x += state.player.vx * dtSeconds;
  state.player.y += state.player.vy * dtSeconds;
  keepInsideArena(state.player, state.player.radius, state.arenaWidth, state.arenaHeight);

  state.player.weaponCooldownMs = Math.max(0, state.player.weaponCooldownMs - dtMs);
  if ((input.shooting || input.spaceHeld) && state.player.weaponCooldownMs === 0) {
    const aim = normalize(input.mouseX - state.player.x, input.mouseY - state.player.y);
    if (aim.x !== 0 || aim.y !== 0) {
      state.bullets.push(createPlayerBullet(state, aim.x, aim.y));
      state.player.weaponCooldownMs = state.player.activeFireCooldownMs;
      audio.playShot();
    }
  }
}

function updateEnemies(
  state: GameState,
  dtMs: number,
  random: () => number
): void {
  const dtSeconds = dtMs / 1000;
  for (const enemy of state.enemies) {
    const toPlayerX = state.player.x - enemy.x;
    const toPlayerY = state.player.y - enemy.y;
    const distance = Math.hypot(toPlayerX, toPlayerY);
    const towardPlayer = normalize(toPlayerX, toPlayerY);

    enemy.vx = towardPlayer.x * enemy.speed;
    enemy.vy = towardPlayer.y * enemy.speed;

    if (enemy.type === "shooter") {
      if (distance < 230) {
        enemy.vx = -towardPlayer.x * enemy.speed * 0.85;
        enemy.vy = -towardPlayer.y * enemy.speed * 0.85;
      } else if (distance < 320) {
        enemy.vx = towardPlayer.y * enemy.speed * 0.7;
        enemy.vy = -towardPlayer.x * enemy.speed * 0.7;
      }
      enemy.shootCooldownMs = Math.max(0, enemy.shootCooldownMs - dtMs);
      if (enemy.shootCooldownMs === 0 && distance > 20) {
        state.bullets.push(createEnemyBullet(state, enemy, towardPlayer.x, towardPlayer.y));
        enemy.shootCooldownMs = ENEMY_STATS.shooter.shootIntervalMs * (0.75 + random() * 0.65);
      }
    }

    enemy.x += enemy.vx * dtSeconds;
    enemy.y += enemy.vy * dtSeconds;
    keepInsideArena(enemy, enemy.radius, state.arenaWidth, state.arenaHeight);
  }
}

function updateBullets(state: GameState, dtMs: number): void {
  const dtSeconds = dtMs / 1000;
  for (const bullet of state.bullets) {
    bullet.x += bullet.vx * dtSeconds;
    bullet.y += bullet.vy * dtSeconds;
    bullet.ttlMs -= dtMs;
  }
  state.bullets = state.bullets.filter((bullet) => {
    if (bullet.ttlMs <= 0) {
      return false;
    }
    const xMargin = 80;
    const yMargin = 80;
    return (
      bullet.x >= -xMargin &&
      bullet.x <= state.arenaWidth + xMargin &&
      bullet.y >= -yMargin &&
      bullet.y <= state.arenaHeight + yMargin
    );
  });
}

function resolveBulletCollisions(
  state: GameState,
  random: () => number,
  audio: AudioBus
): void {
  const remainingBullets: Bullet[] = [];
  const defeatedEnemyIds = new Set<string>();
  let playerDamaged = false;

  for (const bullet of state.bullets) {
    let consumed = false;
    if (bullet.owner === "player") {
      for (const enemy of state.enemies) {
        if (
          circlesOverlap(
            bullet.x,
            bullet.y,
            bullet.radius,
            enemy.x,
            enemy.y,
            enemy.radius
          )
        ) {
          consumed = true;
          audio.playHit();
          const defeated = applyEnemyDamage(enemy, bullet.damage);
          if (defeated) {
            defeatedEnemyIds.add(enemy.id);
          }
          break;
        }
      }
    } else if (
      circlesOverlap(
        bullet.x,
        bullet.y,
        bullet.radius,
        state.player.x,
        state.player.y,
        state.player.radius
      )
    ) {
      consumed = true;
      playerDamaged = true;
      state.player.hp -= bullet.damage;
      audio.playHit();
    }

    if (!consumed) {
      remainingBullets.push(bullet);
    }
  }

  state.bullets = remainingBullets;

  if (defeatedEnemyIds.size > 0) {
    const survivors: Enemy[] = [];
    for (const enemy of state.enemies) {
      if (!defeatedEnemyIds.has(enemy.id)) {
        survivors.push(enemy);
        continue;
      }
      state.score += enemy.scoreValue;
      maybeDropPowerUp(state, enemy.x, enemy.y, random);
      audio.playEnemyDown();
    }
    state.enemies = survivors;
  }

  if (playerDamaged) {
    state.lastDamageFlashMs = Math.max(state.lastDamageFlashMs, 130);
  }
}

function resolveContactDamage(state: GameState, dtMs: number): void {
  const dtSeconds = dtMs / 1000;
  let touched = false;
  let maxContactDps = 0;
  for (const enemy of state.enemies) {
    if (
      circlesOverlap(
        state.player.x,
        state.player.y,
        state.player.radius,
        enemy.x,
        enemy.y,
        enemy.radius
      )
    ) {
      touched = true;
      maxContactDps = Math.max(maxContactDps, enemy.contactDps);
      const push = normalize(state.player.x - enemy.x, state.player.y - enemy.y);
      state.player.x += push.x * PLAYER_CONTACT_PUSHBACK * dtSeconds;
      state.player.y += push.y * PLAYER_CONTACT_PUSHBACK * dtSeconds;
    }
  }
  if (touched) {
    state.player.hp -= maxContactDps * dtSeconds;
    state.lastDamageFlashMs = Math.max(state.lastDamageFlashMs, 90);
  }
  keepInsideArena(state.player, state.player.radius, state.arenaWidth, state.arenaHeight);
}

function updatePowerUps(state: GameState, dtMs: number, audio: AudioBus): void {
  const nextPowerUps: GameState["powerUps"] = [];
  for (const powerUp of state.powerUps) {
    powerUp.ttlMs -= dtMs;
    if (powerUp.ttlMs <= 0) {
      continue;
    }
    if (
      circlesOverlap(
        state.player.x,
        state.player.y,
        state.player.radius,
        powerUp.x,
        powerUp.y,
        powerUp.radius
      )
    ) {
      applyPowerUp(state.player, powerUp.type);
      audio.playPickup();
      continue;
    }
    nextPowerUps.push(powerUp);
  }
  state.powerUps = nextPowerUps;
}

function updateWaveProgress(state: GameState, dtMs: number, random: () => number): void {
  if (state.spawn.queue.length > 0) {
    tickSpawnQueue(state, dtMs, random);
    return;
  }
  if (state.enemies.length > 0) {
    state.spawn.nextWaveInMs = 0;
    return;
  }
  if (state.spawn.nextWaveInMs === 0) {
    state.spawn.nextWaveInMs = WAVE_BREAK_MS;
    return;
  }
  state.spawn.nextWaveInMs = Math.max(0, state.spawn.nextWaveInMs - dtMs);
  if (state.spawn.nextWaveInMs === 0) {
    startWave(state, state.spawn.wave + 1, random);
    state.spawn.nextWaveInMs = 0;
  }
}

function updateSurvivalBonus(state: GameState, dtMs: number): void {
  state.survivalBonusTickerMs += dtMs;
  while (state.survivalBonusTickerMs >= SURVIVAL_BONUS_INTERVAL_MS) {
    state.survivalBonusTickerMs -= SURVIVAL_BONUS_INTERVAL_MS;
    state.score += SURVIVAL_BONUS_POINTS;
  }
}

export function advanceGame(
  state: GameState,
  input: InputSnapshot,
  dtMs: number,
  audio: AudioBus,
  random: () => number = Math.random
): void {
  if (state.mode !== "playing") {
    state.lastDamageFlashMs = Math.max(0, state.lastDamageFlashMs - dtMs);
    return;
  }

  state.timeMs += dtMs;
  state.lastDamageFlashMs = Math.max(0, state.lastDamageFlashMs - dtMs);
  updatePowerUpTimer(state.player, dtMs);
  updatePlayer(state, input, dtMs, audio);
  updateEnemies(state, dtMs, random);
  updateBullets(state, dtMs);
  resolveBulletCollisions(state, random, audio);
  resolveContactDamage(state, dtMs);
  updatePowerUps(state, dtMs, audio);
  updateSurvivalBonus(state, dtMs);
  updateWaveProgress(state, dtMs, random);

  if (state.player.hp <= 0) {
    state.player.hp = 0;
    state.mode = "gameOver";
    audio.playGameOver();
    audio.stopBgm();
  }
}
