import { describe, it, expect, vi } from 'vitest';
import { WaveActor } from '@/actors/adapters/WaveActor';
import type { Wave } from '@/managers/Wave';

describe('WaveActor', () => {
  function createMockWave(originSection: string = 'A'): Wave {
    return {
      id: 'wave-123',
      originSection,
      type: 'NORMAL',
      path: ['A', 'B', 'C'],
      direction: 'right',
      startTime: 1000,
      endTime: null,
      length: 3,
      isSuccess: false,
      isFailed: false,
      addSectionResult: vi.fn(),
      complete: vi.fn(),
      getResults: vi.fn(() => []),
      calculateScore: vi.fn(() => 0),
      getMaxPossibleScore: vi.fn(() => 300),
      toJSON: vi.fn(),
    } as unknown as Wave;
  }

  describe('Constructor', () => {
    it('should create WaveActor with unique ID', () => {
      const wave = createMockWave();
      const actor = new WaveActor('wave-actor-1', wave);

      expect(actor.id).toBe('wave-actor-1');
      expect(actor.type).toBe('wave');
      expect(actor.category).toBe('wave');
    });

    it('should use default position when not specified', () => {
      const wave = createMockWave();
      const actor = new WaveActor('wave-actor-1', wave);

      const pos = actor.getPosition();
      expect(pos.x).toBe(0);
      expect(pos.y).toBe(0);
    });

    it('should accept custom position', () => {
      const wave = createMockWave();
      const actor = new WaveActor('wave-actor-1', wave, 100, 200);

      const pos = actor.getPosition();
      expect(pos.x).toBe(100);
      expect(pos.y).toBe(200);
    });

    it('should accept custom category', () => {
      const wave = createMockWave();
      const actor = new WaveActor('wave-actor-1', wave, 0, 0, 'special-wave');

      expect(actor.category).toBe('special-wave');
    });

    it('should support logging when enabled', () => {
      const wave = createMockWave();
      const actor = new WaveActor('wave-actor-1', wave, 0, 0, 'wave', true);

      expect(actor).toBeDefined();
    });
  });

  describe('Update', () => {
    it('should not throw when update is called', () => {
      const wave = createMockWave();
      const actor = new WaveActor('wave-actor-1', wave);

      expect(() => actor.update(16.67)).not.toThrow();
    });

    it('should handle multiple update calls (UtilityActor tracks state, WaveManager drives logic)', () => {
      const wave = createMockWave();
      const actor = new WaveActor('wave-actor-1', wave);

      actor.update(16);
      actor.update(16);
      actor.update(16);

      // Position unchanged (non-visual utility actor)
      expect(actor.getPosition()).toEqual({ x: 0, y: 0 });
    });

    it('should handle delta parameter', () => {
      const wave = createMockWave();
      const actor = new WaveActor('wave-actor-1', wave);

      expect(() => {
        actor.update(16.67);
        actor.update(33.33);
        actor.update(8.33);
      }).not.toThrow();
    });
  });

  describe('Draw', () => {
    it('should not throw when called (UtilityActor is non-visual)', () => {
      const wave = createMockWave();
      const actor = new WaveActor('wave-actor-1', wave);

      expect(() => actor.draw()).not.toThrow();
    });

    it('should be callable multiple times', () => {
      const wave = createMockWave();
      const actor = new WaveActor('wave-actor-1', wave);

      actor.draw();
      actor.draw();
      actor.draw();
    });
  });

  describe('Wave Access', () => {
    it('should return wrapped Wave object', () => {
      const wave = createMockWave();
      const actor = new WaveActor('wave-actor-1', wave);

      expect(actor.getWave()).toBe(wave);
    });

    it('should maintain reference to same Wave instance', () => {
      const wave = createMockWave();
      const actor = new WaveActor('wave-actor-1', wave);

      const wave1 = actor.getWave();
      const wave2 = actor.getWave();

      expect(wave1).toBe(wave2);
      expect(wave1).toBe(wave);
    });
  });

  describe('State Access', () => {
    it('should return wave state with origin and ID', () => {
      const wave = createMockWave('B');
      const actor = new WaveActor('wave-actor-1', wave);

      const state = actor.getState();

      expect(state.origin).toBe('B');
      expect(state.id).toBe('wave-123');
    });

    it('should reflect wave properties', () => {
      const wave = createMockWave('C');
      wave.id = 'wave-456';
      wave.originSection = 'C';

      const actor = new WaveActor('wave-actor-1', wave);
      const state = actor.getState();

      expect(state.origin).toBe('C');
      expect(state.id).toBe('wave-456');
    });
  });

  describe('Position Management', () => {
    it('should allow direct position setting', () => {
      const wave = createMockWave();
      const actor = new WaveActor('wave-actor-1', wave);

      actor.setPosition(500, 600);

      expect(actor.getPosition()).toEqual({ x: 500, y: 600 });
    });

    it('should maintain position across updates', () => {
      const wave = createMockWave();
      const actor = new WaveActor('wave-actor-1', wave, 100, 200);

      actor.update(16);
      actor.update(16);

      expect(actor.getPosition()).toEqual({ x: 100, y: 200 });
    });
  });

  describe('Logging', () => {
    it('should support toggling logging', () => {
      const wave = createMockWave();
      const actor = new WaveActor('wave-actor-1', wave);

      expect(() => {
        actor.setLogging(true);
        actor.update(16);
        actor.setLogging(false);
        actor.update(16);
      }).not.toThrow();
    });
  });

  describe('UtilityActor Behavior', () => {
    it('should be non-visual (no rendering)', () => {
      const wave = createMockWave();
      const actor = new WaveActor('wave-actor-1', wave);

      // draw() is no-op for UtilityActor
      actor.draw();
      actor.draw();

      // No visual state to verify, just ensure it doesn't throw
      expect(actor.getWave()).toBe(wave);
    });

    it('should track wave state without updating wave directly', () => {
      const wave = createMockWave();
      const actor = new WaveActor('wave-actor-1', wave);

      actor.update(16);

      // UtilityActor doesn't modify wrapped Wave
      expect(wave.addSectionResult).not.toHaveBeenCalled();
      expect(wave.complete).not.toHaveBeenCalled();
    });
  });

  describe('Actor Interface', () => {
    it('should have id, type, and category properties', () => {
      const wave = createMockWave();
      const actor = new WaveActor('wave-999', wave, 0, 0, 'test-category');

      expect(actor.id).toBe('wave-999');
      expect(actor.type).toBe('wave');
      expect(actor.category).toBe('test-category');
    });

    it('should implement update and draw methods', () => {
      const wave = createMockWave();
      const actor = new WaveActor('wave-actor-1', wave);

      expect(typeof actor.update).toBe('function');
      expect(typeof actor.draw).toBe('function');
    });

    it('should implement position getter/setter', () => {
      const wave = createMockWave();
      const actor = new WaveActor('wave-actor-1', wave);

      expect(typeof actor.getPosition).toBe('function');
      expect(typeof actor.setPosition).toBe('function');
    });
  });
});
