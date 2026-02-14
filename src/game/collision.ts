import type { Enemy, Vector2 } from "./types";

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function normalize(x: number, y: number): Vector2 {
  const length = Math.hypot(x, y);
  if (length === 0) {
    return { x: 0, y: 0 };
  }
  return { x: x / length, y: y / length };
}

export function circlesOverlap(
  ax: number,
  ay: number,
  ar: number,
  bx: number,
  by: number,
  br: number
): boolean {
  const dx = ax - bx;
  const dy = ay - by;
  const rr = ar + br;
  return dx * dx + dy * dy <= rr * rr;
}

export function keepInsideArena(
  point: Vector2,
  radius: number,
  width: number,
  height: number
): void {
  point.x = clamp(point.x, radius, width - radius);
  point.y = clamp(point.y, radius, height - radius);
}

export function applyEnemyDamage(enemy: Enemy, damage: number): boolean {
  enemy.hp -= damage;
  return enemy.hp <= 0;
}
