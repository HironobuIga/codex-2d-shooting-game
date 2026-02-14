import type { Enemy, GameState, InputSnapshot } from "./types";

function drawBackdrop(ctx: CanvasRenderingContext2D, state: GameState): void {
  const gradient = ctx.createLinearGradient(0, 0, state.arenaWidth, state.arenaHeight);
  gradient.addColorStop(0, "#031021");
  gradient.addColorStop(0.55, "#0a1833");
  gradient.addColorStop(1, "#01101a");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, state.arenaWidth, state.arenaHeight);

  ctx.strokeStyle = "rgba(80, 226, 255, 0.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= state.arenaWidth; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, state.arenaHeight);
    ctx.stroke();
  }
  for (let y = 0; y <= state.arenaHeight; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(state.arenaWidth, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(94, 255, 175, 0.35)";
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, state.arenaWidth - 3, state.arenaHeight - 3);
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  input: InputSnapshot
): void {
  const angle = Math.atan2(input.mouseY - state.player.y, input.mouseX - state.player.x);
  const frontX = state.player.x + Math.cos(angle) * (state.player.radius + 8);
  const frontY = state.player.y + Math.sin(angle) * (state.player.radius + 8);
  const leftX = state.player.x + Math.cos(angle + 2.4) * state.player.radius;
  const leftY = state.player.y + Math.sin(angle + 2.4) * state.player.radius;
  const rightX = state.player.x + Math.cos(angle - 2.4) * state.player.radius;
  const rightY = state.player.y + Math.sin(angle - 2.4) * state.player.radius;

  ctx.fillStyle = "#5ee6ff";
  ctx.beginPath();
  ctx.moveTo(frontX, frontY);
  ctx.lineTo(leftX, leftY);
  ctx.lineTo(rightX, rightY);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#91fff6";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy): void {
  if (enemy.type === "chaser") {
    ctx.fillStyle = "#ff5f9e";
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (enemy.type === "shooter") {
    ctx.fillStyle = "#ffc55c";
    ctx.fillRect(
      enemy.x - enemy.radius,
      enemy.y - enemy.radius,
      enemy.radius * 2,
      enemy.radius * 2
    );
    return;
  }
  ctx.fillStyle = "#8d7dff";
  ctx.beginPath();
  ctx.moveTo(enemy.x, enemy.y - enemy.radius);
  ctx.lineTo(enemy.x + enemy.radius, enemy.y);
  ctx.lineTo(enemy.x, enemy.y + enemy.radius);
  ctx.lineTo(enemy.x - enemy.radius, enemy.y);
  ctx.closePath();
  ctx.fill();
}

function drawHUD(ctx: CanvasRenderingContext2D, state: GameState): void {
  ctx.fillStyle = "rgba(0, 7, 18, 0.58)";
  ctx.fillRect(12, 12, 300, 94);
  ctx.strokeStyle = "rgba(94, 230, 255, 0.48)";
  ctx.strokeRect(12, 12, 300, 94);

  ctx.fillStyle = "#d5f9ff";
  ctx.font = "700 22px Rajdhani, Trebuchet MS, sans-serif";
  ctx.fillText(`HP ${Math.ceil(state.player.hp)}/${state.player.maxHp}`, 24, 38);
  ctx.fillText(`SCORE ${Math.floor(state.score)}`, 24, 65);
  ctx.fillText(`WAVE ${state.spawn.wave}  BEST ${state.highScore}`, 24, 92);
}

function drawCrosshair(ctx: CanvasRenderingContext2D, input: InputSnapshot): void {
  ctx.strokeStyle = "rgba(209, 255, 230, 0.82)";
  ctx.lineWidth = 2;
  const size = 10;
  ctx.beginPath();
  ctx.moveTo(input.mouseX - size, input.mouseY);
  ctx.lineTo(input.mouseX + size, input.mouseY);
  ctx.moveTo(input.mouseX, input.mouseY - size);
  ctx.lineTo(input.mouseX, input.mouseY + size);
  ctx.stroke();
}

function drawCenterOverlay(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  title: string,
  lines: string[]
): void {
  ctx.fillStyle = "rgba(0, 8, 18, 0.66)";
  ctx.fillRect(0, 0, state.arenaWidth, state.arenaHeight);

  const cardWidth = 640;
  const cardHeight = 340;
  const cardX = (state.arenaWidth - cardWidth) / 2;
  const cardY = (state.arenaHeight - cardHeight) / 2;
  ctx.fillStyle = "rgba(2, 17, 32, 0.86)";
  ctx.fillRect(cardX, cardY, cardWidth, cardHeight);
  ctx.strokeStyle = "rgba(94, 230, 255, 0.52)";
  ctx.lineWidth = 2;
  ctx.strokeRect(cardX, cardY, cardWidth, cardHeight);

  ctx.fillStyle = "#8df9ff";
  ctx.font = "700 54px Orbitron, Rajdhani, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(title, state.arenaWidth / 2, cardY + 86);

  ctx.fillStyle = "#e8f7ff";
  ctx.font = "600 24px Rajdhani, Trebuchet MS, sans-serif";
  lines.forEach((line, index) => {
    ctx.fillText(line, state.arenaWidth / 2, cardY + 148 + index * 36);
  });
  ctx.textAlign = "left";
}

export function render(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  input: InputSnapshot
): void {
  drawBackdrop(ctx, state);

  for (const powerUp of state.powerUps) {
    ctx.fillStyle = powerUp.type === "rapidFire" ? "#68ffbc" : "#7cd4ff";
    ctx.beginPath();
    ctx.arc(powerUp.x, powerUp.y, powerUp.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.72)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  for (const bullet of state.bullets) {
    ctx.fillStyle = bullet.owner === "player" ? "#b9fff0" : "#ff9f72";
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const enemy of state.enemies) {
    drawEnemy(ctx, enemy);
  }

  drawPlayer(ctx, state, input);
  drawHUD(ctx, state);
  drawCrosshair(ctx, input);

  if (state.lastDamageFlashMs > 0 && state.mode === "playing") {
    const alpha = Math.min(0.18, state.lastDamageFlashMs / 500);
    ctx.fillStyle = `rgba(255, 50, 80, ${alpha})`;
    ctx.fillRect(0, 0, state.arenaWidth, state.arenaHeight);
  }

  if (state.mode === "menu") {
    drawCenterOverlay(ctx, state, "NEON SENTINEL", [
      "WASD: 移動 / マウス: 照準",
      "左クリック or Space: 射撃",
      "P: 一時停止 / F: フルスクリーン",
      "Enter で出撃"
    ]);
  } else if (state.mode === "paused") {
    drawCenterOverlay(ctx, state, "PAUSED", [
      "戦闘を一時停止中",
      "P または Enter で再開",
      "R でリスタート"
    ]);
  } else if (state.mode === "gameOver") {
    drawCenterOverlay(ctx, state, "GAME OVER", [
      `スコア: ${Math.floor(state.score)}`,
      `ハイスコア: ${state.highScore}`,
      "Enter または R で再挑戦"
    ]);
  }
}
