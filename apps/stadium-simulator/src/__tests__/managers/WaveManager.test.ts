import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WaveManager } from '@/managers/WaveManager';
import { gameBalance } from '@/config/gameBalance';
import type { GameStateManager } from '@/managers/GameStateManager';

/**
 * WaveManager Basic Unit Tests (MVP)
 * Tests core wave lifecycle and participation calculations
 */
describe('WaveManager', () => {
  let waveManager: WaveManager;
  let mockGameState: GameStateManager;

  beforeEach(() => {
    // Create minimal mock GameStateManager with sections
    mockGameState = {
      getSections: vi.fn().mockReturnValue(['section-1', 'section-2', 'section-3', 'section-4']),
      getTotalFans: vi.fn().mockReturnValue(100),
      getParticipatingFans: vi.fn().mockReturnValue(50),
    } as any;

    waveManager = new WaveManager(mockGameState);
  });

  describe('Initialization', () => {
    it('should initialize with inactive state', () => {
      expect(waveManager.isActive()).toBe(false);
    });

    it('should initialize with starting wave strength', () => {
      expect(waveManager.getCurrentWaveStrength()).toBe(gameBalance.waveStrength.starting);
    });

    it('should initialize with score of zero', () => {
      expect(waveManager.getScore()).toBe(0);
    });

    it('should initialize with base multiplier of 1.0', () => {
      expect(waveManager.getMultiplier()).toBe(1.0);
    });

    it('should initialize with no active wave', () => {
      expect(waveManager.getActiveWave()).toBeNull();
    });
  });

  describe('Wave Lifecycle', () => {
    it('should start a wave when startWave is called', () => {
      waveManager.startWave();
      expect(waveManager.isActive()).toBe(true);
    });

    it('should track wave results when wave is active', () => {
      waveManager.startWave();
      const initialResults = waveManager.getWaveResults();
      expect(Array.isArray(initialResults)).toBe(true);
    });

    // Note: createWave requires full section objects for Wave.calculatePath
    // These tests are skipped in MVP as they require complex mocking
    // Integration tests will cover wave creation with actual section objects

    it.skip('should create a wave instance when creating wave', () => {
      // Skipped: Requires full section object mocking
      // Covered in integration tests
    });

    it.skip('should finalize wave and record in history', () => {
      // Skipped: Requires full section object mocking
      // Covered in integration tests
    });

    it.skip('should clear active wave after finalization', () => {
      // Skipped: Requires full section object mocking
      // Covered in integration tests
    });
  });

  describe('Wave Strength Management', () => {
    it('should clamp wave strength to 0-100 range', () => {
      // Wave strength is clamped to 0-100 in implementation
      waveManager.setWaveStrength(150);
      expect(waveManager.getCurrentWaveStrength()).toBe(100);

      waveManager.setWaveStrength(-50);
      expect(waveManager.getCurrentWaveStrength()).toBe(0);

      waveManager.setWaveStrength(75);
      expect(waveManager.getCurrentWaveStrength()).toBe(75);
    });

    it('should adjust wave strength based on column state', () => {
      // Reset to a known value
      waveManager.setWaveStrength(70);
      const initialStrength = waveManager.getCurrentWaveStrength();

      // Success should increase strength (clamped to max)
      waveManager.adjustWaveStrength('success', 0.8);
      const afterSuccess = waveManager.getCurrentWaveStrength();
      expect(afterSuccess).toBeGreaterThanOrEqual(initialStrength);
    });

    it('should handle death state strength adjustment', () => {
      waveManager.setWaveStrength(70);
      waveManager.adjustWaveStrength('death', 0.2);
      // Death may decrease strength or clamp to min (0)
      const newStrength = waveManager.getCurrentWaveStrength();
      expect(newStrength).toBeLessThanOrEqual(70);
      expect(newStrength).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Column State Classification', () => {
    it('should classify high participation as success', () => {
      const state = waveManager.classifyColumn(0.8); // 80%
      expect(state).toBe('success');
    });

    it('should classify medium participation as sputter', () => {
      const state = waveManager.classifyColumn(0.5); // 50%
      expect(state).toBe('sputter');
    });

    it('should classify low participation as death', () => {
      const state = waveManager.classifyColumn(0.2); // 20%
      expect(state).toBe('death');
    });

    it('should use thresholds from gameBalance config', () => {
      const successThreshold = gameBalance.waveClassification.columnSuccessThreshold;
      const sputterThreshold = gameBalance.waveClassification.columnSputterThreshold;

      // Just above success threshold
      expect(waveManager.classifyColumn(successThreshold + 0.01)).toBe('success');

      // Just above sputter threshold
      expect(waveManager.classifyColumn(sputterThreshold + 0.01)).toBe('sputter');

      // Below sputter threshold
      expect(waveManager.classifyColumn(sputterThreshold - 0.01)).toBe('death');
    });
  });

  describe('Column State Recording', () => {
    it('should record column states', () => {
      waveManager.recordColumnState('section-1', 0, 0.8, 'success');
      waveManager.recordColumnState('section-1', 1, 0.5, 'sputter');

      const records = waveManager.getColumnStateRecords();
      expect(records.length).toBe(2);
      expect(records[0].state).toBe('success');
      expect(records[1].state).toBe('sputter');
    });

    it('should track participation rates in column records', () => {
      waveManager.recordColumnState('section-1', 0, 0.75, 'success');

      const records = waveManager.getColumnStateRecords();
      expect(records[0].participation).toBe(0.75);
    });
  });

  describe('Participation Rate Tracking', () => {
    it('should track last column participation rate', () => {
      waveManager.setLastColumnParticipationRate(0.65);
      expect(waveManager.getLastColumnParticipationRate()).toBe(0.65);
    });

    it('should track last two column participation rates', () => {
      waveManager.pushColumnParticipation(0.7);
      waveManager.pushColumnParticipation(0.8);

      const avg = waveManager.getLastTwoAvgParticipation();
      expect(avg).toBe(0.75); // (0.7 + 0.8) / 2
    });

    it('should maintain only last two participation values', () => {
      waveManager.pushColumnParticipation(0.5);
      waveManager.pushColumnParticipation(0.6);
      waveManager.pushColumnParticipation(0.7);

      // Should average only the last two (0.6 and 0.7)
      const avg = waveManager.getLastTwoAvgParticipation();
      expect(avg).toBeCloseTo(0.65, 2); // Allow for floating point rounding
    });
  });

  describe('Wave Booster System', () => {
    it('should start with no booster active', () => {
      expect(waveManager.getWaveBoosterMultiplier()).toBe(1.0);
      expect(waveManager.getLastBoosterType()).toBe('none');
    });

    it('should apply momentum booster', () => {
      waveManager.applyWaveBooster('momentum');
      expect(waveManager.getWaveBoosterMultiplier()).toBeGreaterThan(1.0);
      expect(waveManager.getLastBoosterType()).toBe('momentum');
    });

    it('should apply recovery booster', () => {
      waveManager.applyWaveBooster('recovery');
      expect(waveManager.getWaveBoosterMultiplier()).toBeGreaterThan(1.0);
      expect(waveManager.getLastBoosterType()).toBe('recovery');
    });

    it('should clear booster back to baseline', () => {
      waveManager.applyWaveBooster('momentum');
      waveManager.clearWaveBooster();

      expect(waveManager.getWaveBoosterMultiplier()).toBe(1.0);
      expect(waveManager.getLastBoosterType()).toBe('none');
    });
  });

  describe('Wave Sputter Mechanics', () => {
    it('should detect sputter condition when participation drops below 40%', () => {
      // Sputter activates at < 0.40 participation
      const isSputter = waveManager.checkWaveSputter(0.35);
      expect(isSputter).toBe(true);
    });

    it('should not sputter on high participation', () => {
      const isSputter = waveManager.checkWaveSputter(0.9);
      expect(isSputter).toBe(false);
    });

    it('should not sputter again if already active', () => {
      // First call triggers sputter
      waveManager.checkWaveSputter(0.35);

      // Second call with low participation should return false (already active)
      const isSputter = waveManager.checkWaveSputter(0.30);
      expect(isSputter).toBe(false);
    });

    it('should track sputter state', () => {
      const sputterState = waveManager.getWaveSputter();
      expect(sputterState).toHaveProperty('active');
      expect(sputterState).toHaveProperty('columnsRemaining');
    });
  });

  describe('Cooldown System', () => {
    it('should not be in global cooldown initially', () => {
      expect(waveManager.isInGlobalCooldown()).toBe(false);
    });

    it('should enter global cooldown after wave ends', () => {
      waveManager.recordWaveEnd(true);
      expect(waveManager.isInGlobalCooldown()).toBe(true);
    });

    it('should track per-section cooldowns', () => {
      const now = Date.now();
      waveManager.recordSectionStart('section-1');

      // Section should be in cooldown immediately after
      const canStart = waveManager.canSectionStartWave('section-1');
      expect(canStart).toBe(false);
    });
  });

  describe('Event System', () => {
    it('should allow registering event listeners', () => {
      const callback = vi.fn();
      waveManager.on('testEvent', callback);

      // Emit event (using private emit method via type assertion)
      (waveManager as any).emit('testEvent', { data: 'test' });

      expect(callback).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should allow unregistering event listeners', () => {
      const callback = vi.fn();
      waveManager.on('testEvent', callback);
      waveManager.off('testEvent', callback);

      (waveManager as any).emit('testEvent', { data: 'test' });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Enhanced Recovery Calculation', () => {
    it('should calculate recovery when transitioning from sputter to success', () => {
      const recovery = waveManager.calculateEnhancedRecovery('sputter', 'success');
      expect(recovery).toBe(gameBalance.waveClassification.recoveryPowerMultiplier);
      expect(recovery).toBeGreaterThan(0);
    });

    it('should return zero recovery when staying in success', () => {
      const recovery = waveManager.calculateEnhancedRecovery('success', 'success');
      expect(recovery).toBe(0);
    });

    it('should return zero recovery when transitioning from death to success', () => {
      // Enhanced recovery only applies to sputter->success, not death->success
      const recovery = waveManager.calculateEnhancedRecovery('death', 'success');
      expect(recovery).toBe(0);
    });

    it('should return zero recovery for other state transitions', () => {
      expect(waveManager.calculateEnhancedRecovery('success', 'sputter')).toBe(0);
      expect(waveManager.calculateEnhancedRecovery('success', 'death')).toBe(0);
      expect(waveManager.calculateEnhancedRecovery('death', 'sputter')).toBe(0);
    });
  });

  describe('Last Section Wave State', () => {
    it('should track last section wave state', () => {
      waveManager.setLastSectionWaveState('success');
      expect(waveManager.getLastSectionWaveState()).toBe('success');
    });

    it('should support all state types', () => {
      waveManager.setLastSectionWaveState('sputter');
      expect(waveManager.getLastSectionWaveState()).toBe('sputter');

      waveManager.setLastSectionWaveState('death');
      expect(waveManager.getLastSectionWaveState()).toBe('death');

      waveManager.setLastSectionWaveState(null);
      expect(waveManager.getLastSectionWaveState()).toBeNull();
    });
  });

  describe('Wave History and Max Score', () => {
    it.skip('should track wave history', () => {
      // Skipped: Requires full section object mocking for createWave
      // Covered in integration tests
    });

    it('should track max possible score', () => {
      const maxScore = waveManager.getMaxPossibleScore();
      expect(typeof maxScore).toBe('number');
      expect(maxScore).toBeGreaterThanOrEqual(0);
    });

    it('should export waves as JSON with correct structure', () => {
      const json = waveManager.exportWavesJSON();
      expect(json).toBeTruthy();

      const parsed = JSON.parse(json);
      // Actual structure uses 'history' not 'waves'
      expect(parsed).toHaveProperty('activeWave');
      expect(parsed).toHaveProperty('history');
      expect(parsed).toHaveProperty('maxPossibleScore');
      expect(Array.isArray(parsed.history)).toBe(true);
      expect(parsed.history.length).toBe(0); // No waves created yet
      expect(parsed.activeWave).toBeNull();
    });
  });
});
