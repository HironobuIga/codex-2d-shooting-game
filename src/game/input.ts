import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from "./constants";
import { clamp } from "./collision";
import type { InputSnapshot } from "./types";

export class InputController {
  private readonly keys = new Set<string>();
  private shooting = false;
  private mouseX = LOGICAL_WIDTH / 2;
  private mouseY = LOGICAL_HEIGHT / 2;

  private startPressed = false;
  private pausePressed = false;
  private restartPressed = false;
  private fullscreenPressed = false;

  constructor(private readonly canvas: HTMLCanvasElement) {
    window.addEventListener("keydown", this.handleKeyDown, { passive: false });
    window.addEventListener("keyup", this.handleKeyUp, { passive: false });
    this.canvas.addEventListener("mousemove", this.handleMouseMove);
    this.canvas.addEventListener("mousedown", this.handleMouseDown);
    window.addEventListener("mouseup", this.handleMouseUp);
    this.canvas.addEventListener("contextmenu", this.preventContextMenu);
  }

  dispose(): void {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    this.canvas.removeEventListener("mousemove", this.handleMouseMove);
    this.canvas.removeEventListener("mousedown", this.handleMouseDown);
    window.removeEventListener("mouseup", this.handleMouseUp);
    this.canvas.removeEventListener("contextmenu", this.preventContextMenu);
  }

  private readonly preventContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    const trackedMovement = [
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "Space"
    ];
    if (trackedMovement.includes(event.code)) {
      event.preventDefault();
    }
    this.keys.add(event.code);
    if (event.repeat) {
      return;
    }
    if (event.code === "Enter") {
      this.startPressed = true;
    }
    if (event.code === "KeyP") {
      this.pausePressed = true;
    }
    if (event.code === "KeyR") {
      this.restartPressed = true;
    }
    if (event.code === "KeyF") {
      this.fullscreenPressed = true;
    }
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };

  private setMousePosition(clientX: number, clientY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return;
    }
    this.mouseX = clamp(
      ((clientX - rect.left) / rect.width) * this.canvas.width,
      0,
      this.canvas.width
    );
    this.mouseY = clamp(
      ((clientY - rect.top) / rect.height) * this.canvas.height,
      0,
      this.canvas.height
    );
  }

  private readonly handleMouseMove = (event: MouseEvent): void => {
    this.setMousePosition(event.clientX, event.clientY);
  };

  private readonly handleMouseDown = (event: MouseEvent): void => {
    if (event.button !== 0) {
      return;
    }
    this.setMousePosition(event.clientX, event.clientY);
    this.shooting = true;
    event.preventDefault();
  };

  private readonly handleMouseUp = (event: MouseEvent): void => {
    if (event.button === 0) {
      this.shooting = false;
    }
  };

  peek(): InputSnapshot {
    return {
      moveX: (this.keys.has("KeyD") || this.keys.has("ArrowRight") ? 1 : 0) -
        (this.keys.has("KeyA") || this.keys.has("ArrowLeft") ? 1 : 0),
      moveY: (this.keys.has("KeyS") || this.keys.has("ArrowDown") ? 1 : 0) -
        (this.keys.has("KeyW") || this.keys.has("ArrowUp") ? 1 : 0),
      shooting: this.shooting,
      spaceHeld: this.keys.has("Space"),
      mouseX: this.mouseX,
      mouseY: this.mouseY,
      startPressed: this.startPressed,
      pausePressed: this.pausePressed,
      restartPressed: this.restartPressed,
      fullscreenPressed: this.fullscreenPressed
    };
  }

  poll(): InputSnapshot {
    const snapshot = this.peek();
    this.startPressed = false;
    this.pausePressed = false;
    this.restartPressed = false;
    this.fullscreenPressed = false;
    return snapshot;
  }
}
