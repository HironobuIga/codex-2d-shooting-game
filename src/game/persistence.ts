const HIGH_SCORE_KEY = "codex_2d_shooting_high_score_v1";

export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

function getBrowserStorage(): StorageLike | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }
  return window.localStorage;
}

export function loadHighScore(storage: StorageLike | null = getBrowserStorage()): number {
  if (!storage) {
    return 0;
  }
  const rawValue = storage.getItem(HIGH_SCORE_KEY);
  if (!rawValue) {
    return 0;
  }
  const parsedValue = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    return 0;
  }
  return parsedValue;
}

export function saveHighScore(
  score: number,
  storage: StorageLike | null = getBrowserStorage()
): void {
  if (!storage) {
    return;
  }
  storage.setItem(HIGH_SCORE_KEY, String(Math.max(0, Math.floor(score))));
}

export function computeHighScore(current: number, candidate: number): number {
  return Math.max(Math.floor(current), Math.floor(candidate));
}
