Original prompt: 2dのshooting gameを作成したいです。プランを考えてください。必要に応じて質問をしてください。

## 2026-02-14
- Vite + TypeScript のプロジェクト骨格を作成。
- Canvasベースの2Dシューティング実装を追加（メニュー、プレイ、ポーズ、ゲームオーバー）。
- 入力は WASD + マウス照準 + 左クリック/Space 射撃、Pポーズ、Fフルスクリーン。
- 敵3種（chaser/shooter/tank）、ウェーブ進行、弾、接触ダメージ、スコアを実装。
- パワーアップ2種（rapidFire/heal）、10秒ごとの生存ボーナス、ハイスコア保存を実装。
- `window.render_game_to_text` と `window.advanceTime(ms)` を実装。
- Web Audio APIでBGMとSFXを実装。
- Vitestでコア挙動テスト（ダメージ・ウェーブ増加・パワーアップ期限・保存）を追加。
- 検証実行は `npm install` がネットワーク制限下で `typescript` 取得待ちとなり完了せず、`npm install --offline` では `ENOTCACHED` で失敗することを確認。
- Playwright クライアントも `playwright` パッケージ不足で `ERR_MODULE_NOT_FOUND` となり、ローカル実行不可を確認。
- 昇格実行で `npm ping` が `registry.npmjs.org` に対して `PONG` を返し、`npm install` が完了。
- `npm test`（Vitest 6件）と `npm run build`（Vite build）が成功することを確認。
- Node `v19.7.0` は Vite/Vitest 推奨レンジ外のため `EBADENGINE` 警告あり（動作は継続可能）。
- `playwright` をdev dependencyとして追加し、`npx playwright install chromium` を実施。
- `develop-web-game` クライアントで smoke シナリオを3反復実行し、`output/playwright/smoke` に screenshot/state を出力。コンソールエラーは未発生。
- 追加の deep-check シナリオで `menu -> playing -> paused -> resumed -> gameOver -> retry` を確認し、`render_game_to_text` の各状態整合とハイスコア更新（25）を確認。
- プロジェクト直下に `.tool-versions` を作成し `nodejs 22.11.0` を固定。`package.json` に `engines.node: >=20` を追加。
- Node 22.11.0 / npm 10.9.0 で再検証し、`npm test` と `npm run build` が成功（EBADENGINE警告なし）。

## Balance iteration (Playwright scenarios)
- シナリオ拡張:
  - `long-survival`（固定パターンの長時間入力、4反復）
  - `autoplay-balance-check`（render_game_to_text を利用した自動追尾/回避入力）
  - `deep-check`（状態遷移回帰）
- 調整内容:
  - `POWER_UP_DROP_CHANCE: 0.22 -> 0.30`
  - `PLAYER_CONTACT_PUSHBACK: 220 -> 280`
  - shooter `projectileDamage: 9 -> 7`
  - `getWaveSpawnBudget: 4 + floor(wave * 2.2) -> 4 + floor(wave * 1.8)`
  - 接触ダメージを「重複和算」から「重なった敵の最大DPSのみ適用」に変更
- 比較結果:
  - `long-survival` baseline: 4反復目で `gameOver`, HP推移 `58.2 -> 35.6 -> 11.2 -> 0`, score 200, wave 1
  - `long-survival` tuned: 4反復目でも `playing`, HP推移 `82.4 -> 72.4 -> 62.0 -> 50.8`, score 220, wave 1
  - `autoplay` baseline: `gameOver @ 15.1s`, maxWave 1, maxScore 115
  - `autoplay` tuned: `gameOver @ 44.0s`, maxWave 3, maxScore 625
  - `autoplay` tuned(再計測): `gameOver @ 63.2s`, maxWave 4, maxScore 1085, `maxPowerUpsOnField=2`（パワーアップ出現確認）
- 調整後も `npm test` / `npm run build` は成功。Playwright実行で新規console/pageエラーなし。

## TODO / Suggestions
- 敵出現頻度とスコア配分のバランス調整（初期値は機能優先）。
- ビジュアル演出（被弾エフェクト、撃破パーティクル）の追加で可読性向上。
- Playwright の複数シナリオ（長時間プレイ、連続リトライ）を継続実施。
