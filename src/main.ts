import "./styles.css";

import { createAudioBus } from "./game/audio";
import { FIXED_TIMESTEP_MS, LOGICAL_HEIGHT, LOGICAL_WIDTH } from "./game/constants";
import { renderGameToText } from "./game/debugText";
import { InputController } from "./game/input";
import { computeHighScore, loadHighScore, saveHighScore } from "./game/persistence";
import { render } from "./game/render";
import { createInitialGameState, resetRun } from "./game/state";
import type { GameMode, GameState, InputSnapshot } from "./game/types";
import { advanceGame } from "./game/update";

const appRoot = document.querySelector<HTMLDivElement>("#app");
if (!appRoot) {
  throw new Error("Root node #app was not found.");
}

const shell = document.createElement("div");
shell.id = "game-shell";

const canvas = document.createElement("canvas");
canvas.id = "game-canvas";
canvas.width = LOGICAL_WIDTH;
canvas.height = LOGICAL_HEIGHT;
shell.appendChild(canvas);
appRoot.appendChild(shell);

const context = canvas.getContext("2d");
if (!context) {
  throw new Error("2D canvas context was not created.");
}

const state = createInitialGameState(loadHighScore());
const input = new InputController(canvas);
const audio = createAudioBus();

function resizeDisplay(): void {
  const maxWidth = window.innerWidth * 0.96;
  const maxHeight = window.innerHeight * 0.9;
  const scale = Math.max(0.4, Math.min(maxWidth / LOGICAL_WIDTH, maxHeight / LOGICAL_HEIGHT));
  shell.style.width = `${Math.floor(LOGICAL_WIDTH * scale)}px`;
  shell.style.height = `${Math.floor(LOGICAL_HEIGHT * scale)}px`;
}

async function toggleFullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await shell.requestFullscreen();
    }
  } catch {
    // Ignore browser limitations and continue without fullscreen.
  }
}

function syncHighScore(previousMode: GameMode): void {
  if (previousMode !== "playing" || state.mode !== "gameOver") {
    return;
  }
  const nextHighScore = computeHighScore(state.highScore, state.score);
  state.highScore = nextHighScore;
  saveHighScore(nextHighScore);
}

function startRun(current: GameState): void {
  resetRun(current);
  current.mode = "playing";
  audio.unlock();
  audio.startBgm();
}

function handleGlobalControls(snapshot: InputSnapshot): void {
  if (snapshot.fullscreenPressed) {
    void toggleFullscreen();
  }

  if (state.mode === "menu") {
    if (snapshot.startPressed) {
      startRun(state);
    }
    return;
  }

  if (state.mode === "playing") {
    if (snapshot.pausePressed) {
      state.mode = "paused";
    }
    return;
  }

  if (state.mode === "paused") {
    if (snapshot.pausePressed || snapshot.startPressed) {
      state.mode = "playing";
      return;
    }
    if (snapshot.restartPressed) {
      startRun(state);
    }
    return;
  }

  if (snapshot.startPressed || snapshot.restartPressed) {
    startRun(state);
  }
}

function updateNonPlaying(current: GameState, dtMs: number): void {
  current.timeMs += dtMs;
  current.lastDamageFlashMs = Math.max(0, current.lastDamageFlashMs - dtMs);
}

function runSimulationStep(snapshot: InputSnapshot, dtMs: number): void {
  const previousMode = state.mode;
  if (state.mode === "playing") {
    advanceGame(state, snapshot, dtMs, audio);
  } else {
    updateNonPlaying(state, dtMs);
  }
  syncHighScore(previousMode);
}

window.render_game_to_text = (): string => renderGameToText(state);
window.advanceTime = (ms: number): void => {
  const steps = Math.max(1, Math.round(ms / FIXED_TIMESTEP_MS));
  const dtMs = ms / steps;
  for (let i = 0; i < steps; i += 1) {
    const snapshot = input.poll();
    handleGlobalControls(snapshot);
    runSimulationStep(snapshot, dtMs);
  }
  render(context, state, input.peek());
};

let previousTime = performance.now();
let accumulator = 0;

function animationLoop(now: number): void {
  const frameDt = Math.min(100, now - previousTime);
  previousTime = now;
  accumulator += frameDt;

  const snapshot = input.poll();
  handleGlobalControls(snapshot);
  while (accumulator >= FIXED_TIMESTEP_MS) {
    runSimulationStep(snapshot, FIXED_TIMESTEP_MS);
    accumulator -= FIXED_TIMESTEP_MS;
  }

  render(context, state, input.peek());
  requestAnimationFrame(animationLoop);
}

window.addEventListener("resize", resizeDisplay);
window.addEventListener("fullscreenchange", resizeDisplay);
window.addEventListener("beforeunload", () => {
  input.dispose();
  audio.stopBgm();
});

resizeDisplay();
render(context, state, input.peek());
requestAnimationFrame(animationLoop);
