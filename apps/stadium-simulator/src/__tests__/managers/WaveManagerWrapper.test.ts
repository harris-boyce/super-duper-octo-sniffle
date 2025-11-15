import { describe, it, expect } from 'vitest';
import { GameStateManager } from '@/managers/GameStateManager';
import { VendorManager } from '@/managers/VendorManager';
import { WaveManagerWrapper } from '@/managers/wrappers/WaveManagerWrapper';
import { LoggerService } from '@/services/LoggerService';

describe('WaveManagerWrapper', () => {
  it('bridges waveCreated and waveStart events and logs them', () => {
    const gameState = new GameStateManager();
    const vendor = new VendorManager(gameState, 0); // optional for construction
    const waveWrapper = new WaveManagerWrapper(gameState, vendor);
    waveWrapper.setLogLevel('debug'); // capture debug strength logs

    const events: string[] = [];
    waveWrapper.on('waveCreated', () => events.push('waveCreated'));
    waveWrapper.on('waveStart', () => events.push('waveStart'));
    waveWrapper.on('waveStrengthChanged', (d: { strength: number }) => {
      // strength change should occur immediately after start
      events.push(`strength:${d.strength}`);
    });

    const logger = LoggerService.instance();
    logger.clear();

    waveWrapper.createWave('A');

    expect(events).toContain('waveCreated');
    expect(events).toContain('waveStart');
    const strengthEvent = events.find(e => e.startsWith('strength:'));
    expect(strengthEvent).toBeTruthy();

    const buf = logger.getBuffer();
    const createdLog = buf.find(e => e.category === 'manager:wave' && /Wave created origin=A/.test(e.message));
    const startedLog = buf.find(e => e.category === 'manager:wave' && /Wave started/.test(e.message));
    expect(createdLog).toBeTruthy();
    expect(startedLog).toBeTruthy();
  });
});
