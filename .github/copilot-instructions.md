# Stadium Simulator — AI Coding Agent Quickstart

Concise, repo-specific guidance to make AI agents immediately productive. Keep changes minimal, follow existing patterns, and reference files by path.

## Architecture Essentials
- **Actor pattern:** Three-layer separation for all dynamic entities (Fans, Vendors, Mascots):
  - Stats (pure data) → State Machine (derived) → Visuals (presentation). See `src/actors` and adapters under `src/actors/adapters/`.
- **Managers:** Domain logic in `src/managers/` (WaveManager, GameStateManager, AIManager, GridManager). Managers emit events via `on/emit` and avoid Phaser coupling.
- **Scenes:** Orchestration only in `src/scenes/` (e.g., `StadiumScene.ts`). Scenes call `manager.update(delta)`, listen to events, and create/update sprites.
- **Sprites:** Pure visual GameObjects in `src/sprites/`. No game rules or thresholds here—actors drive visuals.
- **Config:** All tuning values live in `src/config/gameBalance.ts`. Do not hardcode magic numbers.

## Core Patterns (with examples)
- **State update loop:** In an actor’s `update(delta)`: `updateStats(delta)`, `updateContinuousVisuals()`, `deriveStateFromStats()`, `transitionToState(newState)`. Example: FanActor updates thirst/happiness then transitions to `disengaged` when `attention < 30 && happiness < 40`.
- **Vendor behavior:** `DrinkVendorBehavior` handles targeting and movement; states include `idle → moving → serving`. When service completes, call `fan.drinkServed()` (thirst -100, happiness +15).
- **Wave propagation:** `WaveManager.propagateWave()` iterates sections/columns via `ActorRegistry` and grid; success chance: `80 + happiness*0.2 - thirst*0.3` plus vendor effects. Emits `sectionSuccess`, `sectionFail`, and final `waveComplete`.
- **Event API:** All managers use `manager.on(event, handler)` and `manager.emit(event, payload)`; unsubscribe on cleanup.
- **Path aliases:** Use `@` for `src`: `import { ActorRegistry } from '@/actors/ActorRegistry'`.

## Developer Workflows
- **Dev server:**
  - `cd apps/stadium-simulator`
  - `npm run dev` (Vite at http://localhost:3000)
- **Type-check/build/tests:** `npm run type-check`, `npm run build`, `npm test`, `npm run test:ui` (Vitest w/ happy-dom).
- **Debug scenes:** Add `?demo=debug` to URL to load isolated test scene.
- **Deployment:** GitHub Pages via `.github/workflows/deploy.yml`, base path `/stadium-simulator/`.

## Conventions to Follow
- **No scene logic leakage:** Scenes don’t check thresholds or modify stats.
- **Sprites stay pure:** No `if (thirst > 50)` or config access inside sprites.
- **Config centralization:** Touch only `src/config/gameBalance.ts` for tuning.
- **Interfaces location:** Use `{namespace}/interfaces/` imports (e.g., `src/managers/interfaces/Section.ts`).
- **Grid vs world coords:** Actors/behaviors use GridManager; sprites use world positions.

## Integration Points
- **AnnouncerService (Claude):** Endpoint from `VITE_ANTHROPIC_API_URL`, model `claude-3-5-sonnet-20241022`, headers `x-api-key`, `anthropic-version: 2023-06-01`. Max tokens 150. Fallback: "The crowd goes wild!". Invoked by `StadiumScene` on notable events.
- **Assets/config:** Public JSON under `apps/stadium-simulator/public/assets/` (e.g., `stadium-grid-config.json`).

## Current Focus Areas
- Refactor wave/misc systems to use FanActor states (remove direct sprite dependencies).
- Finish `HybridPathResolver` (A*) and vendor navigation/collision.
- Implement MascotBehavior with the same actor state machine pattern.

## Quick References
- ActorRegistry queries: `ActorRegistry.getByCategory('section')`, `query()`, `snapshot()`.
- IDs via `ActorFactory.generateId()` (e.g., `actor:section-A`).
- Tests live in `apps/stadium-simulator/src/__tests__/` and `api/__tests__/`.

Questions or unclear areas? Point to specific files, and I’ll refine this doc.
