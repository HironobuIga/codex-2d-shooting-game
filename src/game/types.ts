export type GameMode = "menu" | "playing" | "paused" | "gameOver";
export type EnemyType = "chaser" | "shooter" | "tank";
export type BulletOwner = "player" | "enemy";
export type PowerUpType = "rapidFire" | "heal";

export interface Vector2 {
  x: number;
  y: number;
}

export interface Player extends Vector2 {
  vx: number;
  vy: number;
  radius: number;
  speed: number;
  hp: number;
  maxHp: number;
  baseFireCooldownMs: number;
  activeFireCooldownMs: number;
  weaponCooldownMs: number;
  rapidFireRemainingMs: number;
}

export interface Enemy extends Vector2 {
  id: string;
  type: EnemyType;
  vx: number;
  vy: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  contactDps: number;
  projectileDamage: number;
  shootCooldownMs: number;
  scoreValue: number;
}

export interface Bullet extends Vector2 {
  id: string;
  owner: BulletOwner;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  ttlMs: number;
}

export interface PowerUp extends Vector2 {
  id: string;
  type: PowerUpType;
  radius: number;
  ttlMs: number;
}

export interface SpawnState {
  wave: number;
  queue: EnemyType[];
  spawnCooldownMs: number;
  nextWaveInMs: number;
}

export interface GameState {
  mode: GameMode;
  timeMs: number;
  arenaWidth: number;
  arenaHeight: number;
  player: Player;
  enemies: Enemy[];
  bullets: Bullet[];
  powerUps: PowerUp[];
  score: number;
  highScore: number;
  survivalBonusTickerMs: number;
  spawn: SpawnState;
  nextId: number;
  lastDamageFlashMs: number;
}

export interface InputSnapshot {
  moveX: number;
  moveY: number;
  shooting: boolean;
  spaceHeld: boolean;
  mouseX: number;
  mouseY: number;
  startPressed: boolean;
  pausePressed: boolean;
  restartPressed: boolean;
  fullscreenPressed: boolean;
}

export interface AudioBus {
  unlock: () => void;
  startBgm: () => void;
  stopBgm: () => void;
  playShot: () => void;
  playHit: () => void;
  playEnemyDown: () => void;
  playPickup: () => void;
  playGameOver: () => void;
}
