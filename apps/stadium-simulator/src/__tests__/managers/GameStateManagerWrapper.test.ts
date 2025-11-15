import { describe, it, expect } from 'vitest';
import { GameStateManager } from '@/managers/GameStateManager';
import { GameStateManagerWrapper } from '@/managers/wrappers/GameStateManagerWrapper';
import { LoggerService } from '@/services/LoggerService';

describe('GameStateManagerWrapper', () => {
  it('bridges sessionStateChanged and logs event', () => {
    const raw = new GameStateManager();
    const wrapper = new GameStateManagerWrapper(raw);
    const logger = LoggerService.instance();
    logger.clear();
    const received: string[] = [];
    wrapper.on('sessionStateChanged', (d: { state: string }) => received.push(d.state));
    wrapper.startSession('eternal');
    wrapper.activateSession();
    expect(received).toEqual(['countdown','active']);
    const buf = logger.getBuffer();
    const stateLogs = buf.filter(e => e.category === 'manager:gameState' && /Session state=/.test(e.message));
    expect(stateLogs.length).toBeGreaterThanOrEqual(2);
  });
});
