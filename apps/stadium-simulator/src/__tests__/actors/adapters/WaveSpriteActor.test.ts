import { describe, it, expect, vi } from 'vitest';
import { WaveSpriteActor } from '@/actors/adapters/WaveSpriteActor';
import type { WaveSprite } from '@/sprites/WaveSprite';

describe('WaveSpriteActor', () => {
  function createMockWaveSprite(x: number = 200, y: number = 300): WaveSprite {
    return {
      getPosition: vi.fn(() => ({ x, y })),
      getState: vi.fn(() => 'active'),
      isComplete: vi.fn(() => false),
      update: vi.fn(),
      destroy: vi.fn(),
    } as unknown as WaveSprite;
  }

  describe('Constructor', () => {
    it('should create WaveSpriteActor with unique ID', () => {
      const sprite = createMockWaveSprite();
      const actor = new WaveSpriteActor('wave-sprite-1', sprite);

      expect(actor.id).toBe('wave-sprite-1');
      expect(actor.type).toBe('wave');
      expect(actor.category).toBe('wave');
    });

    it('should initialize position from sprite', () => {
      const sprite = createMockWaveSprite(150, 250);
      const actor = new WaveSpriteActor('wave-sprite-1', sprite);

      const pos = actor.getPosition();
      expect(pos.x).toBe(150);
      expect(pos.y).toBe(250);
      expect(sprite.getPosition).toHaveBeenCalled();
    });

    it('should accept custom category', () => {
      const sprite = createMockWaveSprite();
      const actor = new WaveSpriteActor('wave-sprite-1', sprite, 'special-wave');

      expect(actor.category).toBe('special-wave');
    });

    it('should support logging when enabled', () => {
      const sprite = createMockWaveSprite();
      const actor = new WaveSpriteActor('wave-sprite-1', sprite, 'wave', true);

      expect(actor).toBeDefined();
    });
  });

  describe('Update', () => {
    it('should delegate update to wrapped sprite', () => {
      const sprite = createMockWaveSprite();
      const actor = new WaveSpriteActor('wave-sprite-1', sprite);

      actor.update(16.67);

      expect(sprite.update).toHaveBeenCalledWith(16.67);
    });

    it('should sync position from sprite after update', () => {
      const sprite = createMockWaveSprite(100, 200);
      const actor = new WaveSpriteActor('wave-sprite-1', sprite);

      // Simulate sprite movement
      (sprite.getPosition as any).mockReturnValue({ x: 120, y: 220 });

      actor.update(16);

      expect(actor.getPosition()).toEqual({ x: 120, y: 220 });
    });

    it('should handle multiple updates with position changes', () => {
      const sprite = createMockWaveSprite(100, 100);
      const actor = new WaveSpriteActor('wave-sprite-1', sprite);

      (sprite.getPosition as any).mockReturnValue({ x: 110, y: 110 });
      actor.update(16);
      expect(actor.getPosition()).toEqual({ x: 110, y: 110 });

      (sprite.getPosition as any).mockReturnValue({ x: 120, y: 120 });
      actor.update(16);
      expect(actor.getPosition()).toEqual({ x: 120, y: 120 });

      (sprite.getPosition as any).mockReturnValue({ x: 130, y: 130 });
      actor.update(16);
      expect(actor.getPosition()).toEqual({ x: 130, y: 130 });
    });

    it('should call sprite update with correct delta values', () => {
      const sprite = createMockWaveSprite();
      const actor = new WaveSpriteActor('wave-sprite-1', sprite);

      actor.update(16.67);
      actor.update(33.33);
      actor.update(8.33);

      expect(sprite.update).toHaveBeenCalledWith(16.67);
      expect(sprite.update).toHaveBeenCalledWith(33.33);
      expect(sprite.update).toHaveBeenCalledWith(8.33);
    });
  });

  describe('Draw', () => {
    it('should not throw when called (UtilityActor is non-visual)', () => {
      const sprite = createMockWaveSprite();
      const actor = new WaveSpriteActor('wave-sprite-1', sprite);

      expect(() => actor.draw()).not.toThrow();
    });

    it('should be callable multiple times', () => {
      const sprite = createMockWaveSprite();
      const actor = new WaveSpriteActor('wave-sprite-1', sprite);

      actor.draw();
      actor.draw();
      actor.draw();
    });
  });

  describe('Sprite Access', () => {
    it('should return wrapped WaveSprite', () => {
      const sprite = createMockWaveSprite();
      const actor = new WaveSpriteActor('wave-sprite-1', sprite);

      expect(actor.getSprite()).toBe(sprite);
    });

    it('should maintain reference to same sprite instance', () => {
      const sprite = createMockWaveSprite();
      const actor = new WaveSpriteActor('wave-sprite-1', sprite);

      const sprite1 = actor.getSprite();
      const sprite2 = actor.getSprite();

      expect(sprite1).toBe(sprite2);
      expect(sprite1).toBe(sprite);
    });
  });

  describe('State Access', () => {
    it('should return sprite state', () => {
      const sprite = createMockWaveSprite(250, 350);
      (sprite.getState as any).mockReturnValue('propagating');
      (sprite.isComplete as any).mockReturnValue(false);

      const actor = new WaveSpriteActor('wave-sprite-1', sprite);
      const state = actor.getState();

      expect(state.state).toBe('propagating');
      expect(state.position.x).toBe(250);
      expect(state.position.y).toBe(350);
      expect(state.isComplete).toBe(false);
    });

    it('should reflect current sprite state', () => {
      const sprite = createMockWaveSprite(100, 200);
      (sprite.getState as any).mockReturnValue('complete');
      (sprite.isComplete as any).mockReturnValue(true);

      const actor = new WaveSpriteActor('wave-sprite-1', sprite);
      const state = actor.getState();

      expect(state.state).toBe('complete');
      expect(state.isComplete).toBe(true);
    });

    it('should update state after sprite updates', () => {
      const sprite = createMockWaveSprite(100, 100);
      const actor = new WaveSpriteActor('wave-sprite-1', sprite);

      (sprite.getState as any).mockReturnValue('active');
      (sprite.isComplete as any).mockReturnValue(false);
      let state = actor.getState();
      expect(state.state).toBe('active');
      expect(state.isComplete).toBe(false);

      (sprite.getState as any).mockReturnValue('complete');
      (sprite.isComplete as any).mockReturnValue(true);
      state = actor.getState();
      expect(state.state).toBe('complete');
      expect(state.isComplete).toBe(true);
    });
  });

  describe('Destroy', () => {
    it('should delegate destroy to wrapped sprite', () => {
      const sprite = createMockWaveSprite();
      const actor = new WaveSpriteActor('wave-sprite-1', sprite);

      actor.destroy();

      expect(sprite.destroy).toHaveBeenCalled();
    });

    it('should call sprite destroy only once', () => {
      const sprite = createMockWaveSprite();
      const actor = new WaveSpriteActor('wave-sprite-1', sprite);

      actor.destroy();

      expect(sprite.destroy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Position Management', () => {
    it('should allow direct position setting', () => {
      const sprite = createMockWaveSprite(100, 200);
      const actor = new WaveSpriteActor('wave-sprite-1', sprite);

      actor.setPosition(500, 600);

      expect(actor.getPosition()).toEqual({ x: 500, y: 600 });
    });

    it('should override position on next update', () => {
      const sprite = createMockWaveSprite(100, 200);
      const actor = new WaveSpriteActor('wave-sprite-1', sprite);

      actor.setPosition(500, 600);
      expect(actor.getPosition().x).toBe(500);

      // Update syncs back to sprite position
      actor.update(16);
      expect(actor.getPosition().x).toBe(100);
    });
  });

  describe('Logging', () => {
    it('should support toggling logging', () => {
      const sprite = createMockWaveSprite();
      const actor = new WaveSpriteActor('wave-sprite-1', sprite);

      expect(() => {
        actor.setLogging(true);
        actor.update(16);
        actor.setLogging(false);
        actor.update(16);
      }).not.toThrow();
    });
  });

  describe('UtilityActor Behavior', () => {
    it('should track sprite state via delegation', () => {
      const sprite = createMockWaveSprite();
      const actor = new WaveSpriteActor('wave-sprite-1', sprite);

      actor.update(16);

      expect(sprite.update).toHaveBeenCalled();
      expect(sprite.getPosition).toHaveBeenCalled();
    });

    it('should not modify sprite except through update delegation', () => {
      const sprite = createMockWaveSprite();
      const actor = new WaveSpriteActor('wave-sprite-1', sprite);

      // Only update should call sprite methods
      expect(sprite.update).not.toHaveBeenCalled();

      actor.update(16);

      expect(sprite.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('Actor Interface', () => {
    it('should have id, type, and category properties', () => {
      const sprite = createMockWaveSprite();
      const actor = new WaveSpriteActor('wave-sprite-777', sprite, 'test-category');

      expect(actor.id).toBe('wave-sprite-777');
      expect(actor.type).toBe('wave');
      expect(actor.category).toBe('test-category');
    });

    it('should implement update and draw methods', () => {
      const sprite = createMockWaveSprite();
      const actor = new WaveSpriteActor('wave-sprite-1', sprite);

      expect(typeof actor.update).toBe('function');
      expect(typeof actor.draw).toBe('function');
    });

    it('should implement position getter/setter', () => {
      const sprite = createMockWaveSprite();
      const actor = new WaveSpriteActor('wave-sprite-1', sprite);

      expect(typeof actor.getPosition).toBe('function');
      expect(typeof actor.setPosition).toBe('function');
    });

    it('should implement destroy method', () => {
      const sprite = createMockWaveSprite();
      const actor = new WaveSpriteActor('wave-sprite-1', sprite);

      expect(typeof actor.destroy).toBe('function');
    });
  });
});
