import { describe, it, expect } from 'vitest';
import { GameStateManager } from '@/managers/GameStateManager';
import { VendorManager } from '@/managers/VendorManager';
import { VendorManagerWrapper } from '@/managers/wrappers/VendorManagerWrapper';
import { LoggerService } from '@/services/LoggerService';

describe('VendorManagerWrapper', () => {
  it('bridges vendorSpawned events and logs them', () => {
    const gameState = new GameStateManager();
    const raw = new VendorManager(gameState, 0);
    const wrapper = new VendorManagerWrapper(raw);
    const received: Array<number> = [];
    wrapper.on('vendorSpawned', (data: { vendorId: number }) => {
      received.push(data.vendorId);
    });

    // Clear global logger buffer for deterministic assertions
    const logger = LoggerService.instance();
    logger.clear();

    wrapper.spawnInitialVendors(1); // should emit one event

    expect(received.length).toBe(1);
    expect(received[0]).toBe(0);

    const buf = logger.getBuffer();
    const spawnLog = buf.find(e => e.category === 'manager:vendor' && /Vendor spawned id=0/.test(e.message));
    expect(spawnLog).toBeTruthy();
  });
});
