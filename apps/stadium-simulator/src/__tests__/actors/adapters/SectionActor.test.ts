import { describe, it, expect, vi } from 'vitest';
import { SectionActor } from '@/actors/adapters/SectionActor';
import type { StadiumSection } from '@/sprites/StadiumSection';

describe('SectionActor', () => {
  function createMockSection(x: number = 50, y: number = 100): StadiumSection {
    return {
      x,
      y,
      destroy: vi.fn(),
    } as unknown as StadiumSection;
  }

  describe('Constructor', () => {
    it('should create SectionActor with unique ID and section identifier', () => {
      const section = createMockSection();
      const actor = new SectionActor('section-a', section, 'A');

      expect(actor.id).toBe('section-a');
      expect(actor.type).toBe('section');
      expect(actor.category).toBe('section');
      expect(actor.getSectionId()).toBe('A');
    });

    it('should store initial position from StadiumSection sprite', () => {
      const section = createMockSection(300, 400);
      const actor = new SectionActor('section-b', section, 'B');

      const pos = actor.getPosition();
      expect(pos.x).toBe(300);
      expect(pos.y).toBe(400);
    });

    it('should accept custom category', () => {
      const section = createMockSection();
      const actor = new SectionActor('section-c', section, 'C', 'special-section');

      expect(actor.category).toBe('special-section');
    });

    it('should support logging when enabled', () => {
      const section = createMockSection();
      const actor = new SectionActor('section-a', section, 'A', 'section', true);

      expect(actor).toBeDefined();
    });

    it('should handle different section identifiers', () => {
      const sectionA = createMockSection();
      const sectionB = createMockSection();
      const sectionC = createMockSection();

      const actorA = new SectionActor('section-a', sectionA, 'A');
      const actorB = new SectionActor('section-b', sectionB, 'B');
      const actorC = new SectionActor('section-c', sectionC, 'C');

      expect(actorA.getSectionId()).toBe('A');
      expect(actorB.getSectionId()).toBe('B');
      expect(actorC.getSectionId()).toBe('C');
    });
  });

  describe('Update', () => {
    it('should not throw when update is called', () => {
      const section = createMockSection();
      const actor = new SectionActor('section-a', section, 'A');

      expect(() => actor.update(16.67)).not.toThrow();
    });

    it('should handle multiple update calls (SceneryActor typically no-op)', () => {
      const section = createMockSection();
      const actor = new SectionActor('section-a', section, 'A');

      actor.update(16);
      actor.update(16);
      actor.update(16);

      // Position should remain unchanged (scenery is static)
      expect(actor.getPosition()).toEqual({ x: 50, y: 100 });
    });
  });

  describe('Draw', () => {
    it('should not throw when called', () => {
      const section = createMockSection();
      const actor = new SectionActor('section-a', section, 'A');

      expect(() => actor.draw()).not.toThrow();
    });

    it('should be callable multiple times', () => {
      const section = createMockSection();
      const actor = new SectionActor('section-a', section, 'A');

      actor.draw();
      actor.draw();
      actor.draw();
    });
  });

  describe('Sprite Access', () => {
    it('should return wrapped StadiumSection sprite', () => {
      const section = createMockSection();
      const actor = new SectionActor('section-a', section, 'A');

      expect(actor.getSection()).toBe(section);
    });

    it('should maintain reference to same Section instance', () => {
      const section = createMockSection();
      const actor = new SectionActor('section-a', section, 'A');

      const section1 = actor.getSection();
      const section2 = actor.getSection();

      expect(section1).toBe(section2);
      expect(section1).toBe(section);
    });
  });

  describe('Section Identifier', () => {
    it('should return section ID', () => {
      const section = createMockSection();
      const actor = new SectionActor('section-b', section, 'B');

      expect(actor.getSectionId()).toBe('B');
    });

    it('should maintain section ID across updates', () => {
      const section = createMockSection();
      const actor = new SectionActor('section-a', section, 'A');

      actor.update(16);
      expect(actor.getSectionId()).toBe('A');

      actor.update(16);
      expect(actor.getSectionId()).toBe('A');
    });
  });

  describe('Stats Access', () => {
    it('should return section stats including ID and position', () => {
      const section = createMockSection(400, 500);
      const actor = new SectionActor('section-c', section, 'C');

      const stats = actor.getStats();

      expect(stats.sectionId).toBe('C');
      expect(stats.position.x).toBe(400);
      expect(stats.position.y).toBe(500);
    });

    it('should reflect current section position in stats', () => {
      const section = createMockSection(100, 200);
      const actor = new SectionActor('section-a', section, 'A');

      section.x = 150;
      section.y = 250;

      const stats = actor.getStats();
      expect(stats.position.x).toBe(150);
      expect(stats.position.y).toBe(250);
    });
  });

  describe('Position Management', () => {
    it('should allow direct position setting', () => {
      const section = createMockSection(100, 200);
      const actor = new SectionActor('section-a', section, 'A');

      actor.setPosition(600, 700);

      expect(actor.getPosition()).toEqual({ x: 600, y: 700 });
    });

    it('should maintain position independently of section sprite', () => {
      const section = createMockSection(100, 200);
      const actor = new SectionActor('section-a', section, 'A');

      actor.setPosition(600, 700);
      
      // SceneryActor doesn't sync back to sprite on update
      actor.update(16);
      expect(actor.getPosition()).toEqual({ x: 600, y: 700 });
    });
  });

  describe('Logging', () => {
    it('should support toggling logging', () => {
      const section = createMockSection();
      const actor = new SectionActor('section-a', section, 'A');

      expect(() => {
        actor.setLogging(true);
        actor.update(16);
        actor.setLogging(false);
        actor.update(16);
      }).not.toThrow();
    });
  });

  describe('SceneryActor Behavior', () => {
    it('should be static (position unchanged by updates)', () => {
      const section = createMockSection(300, 400);
      const actor = new SectionActor('section-b', section, 'B');

      const initialPos = actor.getPosition();

      actor.update(16);
      actor.update(16);
      actor.update(16);

      expect(actor.getPosition()).toEqual(initialPos);
    });

    it('should not modify wrapped section sprite on update', () => {
      const section = createMockSection(100, 200);
      const actor = new SectionActor('section-a', section, 'A');

      actor.update(16);

      expect(section.x).toBe(100);
      expect(section.y).toBe(200);
    });
  });

  describe('Actor Interface', () => {
    it('should have id, type, and category properties', () => {
      const section = createMockSection();
      const actor = new SectionActor('section-789', section, 'C', 'test-category');

      expect(actor.id).toBe('section-789');
      expect(actor.type).toBe('section');
      expect(actor.category).toBe('test-category');
    });

    it('should implement update and draw methods', () => {
      const section = createMockSection();
      const actor = new SectionActor('section-a', section, 'A');

      expect(typeof actor.update).toBe('function');
      expect(typeof actor.draw).toBe('function');
    });

    it('should implement position getter/setter', () => {
      const section = createMockSection();
      const actor = new SectionActor('section-a', section, 'A');

      expect(typeof actor.getPosition).toBe('function');
      expect(typeof actor.setPosition).toBe('function');
    });
  });
});
