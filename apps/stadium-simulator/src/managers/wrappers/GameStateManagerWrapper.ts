import { BaseManager } from '@/managers/base/BaseManager';
import { GameStateManager, type GameMode, type SessionState } from '@/managers/GameStateManager';
import type { Section } from '@/types/GameTypes';

// Events to bridge
const BRIDGED_EVENTS = [
  'sessionStateChanged',
  'sessionTick'
];

export class GameStateManagerWrapper extends BaseManager {
  private inner: GameStateManager;

  constructor(inner?: GameStateManager) {
    super({ name: 'GameState', category: 'manager:gameState', logLevel: 'info' });
    this.inner = inner || new GameStateManager();
    BRIDGED_EVENTS.forEach(evt => {
      this.inner.on(evt, (payload: any) => {
        this.emit(evt, payload);
        if (evt === 'sessionStateChanged') {
          this.log('event', `Session state=${payload.state}`);
        } else if (evt === 'sessionTick') {
          this.log('debug', `Tick remaining=${payload.timeRemaining}`);
        }
      });
    });
  }

  // Access raw for other managers
  getInner(): GameStateManager { return this.inner; }

  // Proxy methods used by scene/managers
  startSession(mode: GameMode): void { this.inner.startSession(mode); }
  activateSession(): void { this.inner.activateSession(); }
  updateSession(delta: number): void { this.inner.updateSession(delta); }
  updateSectionStat(id: string, stat: keyof Section, value: number): void { this.inner.updateSectionStat(id, stat, value); }
  getSessionState(): SessionState { return this.inner.getSessionState(); }
  getSections(): Section[] { return this.inner.getSections(); }
  getSection(id: string): Section { return this.inner.getSection(id); }
  getSessionTimeRemaining(): number { return this.inner.getSessionTimeRemaining(); }
  incrementCompletedWaves(): void { this.inner.incrementCompletedWaves(); }
  incrementSectionSuccesses(): void { this.inner.incrementSectionSuccesses(); }
  getCompletedWaves(): number { return this.inner.getCompletedWaves(); }
  calculateSessionScore() { return this.inner.calculateSessionScore(); }
  getSectionAverageHappiness(id: string): number { return this.inner.getSectionAverageHappiness(id); }
  vendorServe(sectionId: string): void { this.inner.vendorServe(sectionId); }
}
