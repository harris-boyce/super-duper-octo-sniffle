import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FanActor } from '@/actors/adapters/FanActor';
import type { Fan } from '@/sprites/Fan';

describe('FanActor', () => {
  function createMockFan(x: number = 100, y: number = 200): Fan {
    return {
      x,
      y,
      getHappiness: vi.fn(() => 75),
      getThirst: vi.fn(() => 30),
      getAttention: vi.fn(() => 85),
      update: vi.fn(),
      destroy: vi.fn(),
    } as unknown as Fan;
  }

  describe('Constructor', () => {
    it('should create FanActor with unique ID', () => {
      const fan = createMockFan();
      const actor = new FanActor('fan-1', fan);

      expect(actor.id).toBe('fan-1');
      expect(actor.type).toBe('fan');
      expect(actor.category).toBe('fan');
    });

    it('should store initial position from Fan sprite', () => {
      const fan = createMockFan(150, 250);
      const actor = new FanActor('fan-1', fan);

      const pos = actor.getPosition();
      expect(pos.x).toBe(150);
      expect(pos.y).toBe(250);
    });

    it('should accept custom category', () => {
      const fan = createMockFan();
      const actor = new FanActor('fan-1', fan, 'special-fan');

      expect(actor.category).toBe('special-fan');
    });

    it('should support logging when enabled', () => {
      const fan = createMockFan();
      const actor = new FanActor('fan-1', fan, 'fan', true);

      expect(actor).toBeDefined();
      // Logging is internal, just verify construction doesn't throw
    });
  });

  describe('Update', () => {
    it('should sync position from wrapped Fan sprite', () => {
      const fan = createMockFan(100, 200);
      const actor = new FanActor('fan-1', fan);

      // Simulate fan movement
      fan.x = 120;
      fan.y = 220;

      actor.update(16.67);

      const pos = actor.getPosition();
      expect(pos.x).toBe(120);
      expect(pos.y).toBe(220);
    });

    it('should handle delta parameter', () => {
      const fan = createMockFan();
      const actor = new FanActor('fan-1', fan);

      expect(() => {
        actor.update(16.67);
        actor.update(33.33);
        actor.update(8.33);
      }).not.toThrow();
    });

    it('should update position multiple times', () => {
      const fan = createMockFan(100, 200);
      const actor = new FanActor('fan-1', fan);

      fan.x = 110;
      fan.y = 210;
      actor.update(16);
      expect(actor.getPosition()).toEqual({ x: 110, y: 210 });

      fan.x = 120;
      fan.y = 220;
      actor.update(16);
      expect(actor.getPosition()).toEqual({ x: 120, y: 220 });
    });
  });

  describe('Draw', () => {
    it('should not throw when called', () => {
      const fan = createMockFan();
      const actor = new FanActor('fan-1', fan);

      expect(() => actor.draw()).not.toThrow();
    });

    it('should be callable multiple times', () => {
      const fan = createMockFan();
      const actor = new FanActor('fan-1', fan);

      actor.draw();
      actor.draw();
      actor.draw();
    });
  });

  describe('Sprite Access', () => {
    it('should return wrapped Fan sprite', () => {
      const fan = createMockFan();
      const actor = new FanActor('fan-1', fan);

      expect(actor.getFan()).toBe(fan);
    });

    it('should maintain reference to same Fan instance', () => {
      const fan = createMockFan();
      const actor = new FanActor('fan-1', fan);

      const fan1 = actor.getFan();
      const fan2 = actor.getFan();

      expect(fan1).toBe(fan2);
      expect(fan1).toBe(fan);
    });
  });

  describe('Stats Access', () => {
    it('should return fan stats from wrapped sprite', () => {
      const fan = createMockFan();
      const actor = new FanActor('fan-1', fan);

      const stats = actor.getStats();

      expect(stats.happiness).toBe(75);
      expect(stats.thirst).toBe(30);
      expect(stats.attention).toBe(85);
    });

    it('should reflect updated stats from Fan', () => {
      const fan = createMockFan();
      (fan.getHappiness as any).mockReturnValue(60);
      (fan.getThirst as any).mockReturnValue(50);
      (fan.getAttention as any).mockReturnValue(70);

      const actor = new FanActor('fan-1', fan);
      const stats = actor.getStats();

      expect(stats.happiness).toBe(60);
      expect(stats.thirst).toBe(50);
      expect(stats.attention).toBe(70);
    });

    it('should handle missing stat methods gracefully', () => {
      const fan = createMockFan();
      delete (fan as any).getHappiness;
      delete (fan as any).getThirst;

      const actor = new FanActor('fan-1', fan);
      const stats = actor.getStats();

      expect(stats.happiness).toBeUndefined();
      expect(stats.thirst).toBeUndefined();
      expect(stats.attention).toBe(85);
    });
  });

  describe('Position Management', () => {
    it('should allow direct position setting', () => {
      const fan = createMockFan(100, 200);
      const actor = new FanActor('fan-1', fan);

      actor.setPosition(300, 400);

      expect(actor.getPosition()).toEqual({ x: 300, y: 400 });
    });

    it('should maintain position set directly until next update', () => {
      const fan = createMockFan(100, 200);
      const actor = new FanActor('fan-1', fan);

      actor.setPosition(300, 400);
      expect(actor.getPosition().x).toBe(300);

      // Update syncs back to fan position
      actor.update(16);
      expect(actor.getPosition().x).toBe(100);
    });
  });

  describe('Logging', () => {
    it('should support toggling logging', () => {
      const fan = createMockFan();
      const actor = new FanActor('fan-1', fan);

      expect(() => {
        actor.setLogging(true);
        actor.update(16);
        actor.setLogging(false);
        actor.update(16);
      }).not.toThrow();
    });
  });

  describe('Actor Interface', () => {
    it('should have id, type, and category properties', () => {
      const fan = createMockFan();
      const actor = new FanActor('fan-123', fan, 'test-category');

      expect(actor.id).toBe('fan-123');
      expect(actor.type).toBe('fan');
      expect(actor.category).toBe('test-category');
    });

    it('should implement update and draw methods', () => {
      const fan = createMockFan();
      const actor = new FanActor('fan-1', fan);

      expect(typeof actor.update).toBe('function');
      expect(typeof actor.draw).toBe('function');
    });

    it('should implement position getter/setter', () => {
      const fan = createMockFan();
      const actor = new FanActor('fan-1', fan);

      expect(typeof actor.getPosition).toBe('function');
      expect(typeof actor.setPosition).toBe('function');
    });
  });
});
