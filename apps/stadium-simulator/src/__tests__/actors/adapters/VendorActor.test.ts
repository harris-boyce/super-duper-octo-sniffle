import { describe, it, expect, vi } from 'vitest';
import { VendorActor } from '@/actors/adapters/VendorActor';
import type { Vendor } from '@/sprites/Vendor';

describe('VendorActor', () => {
  function createMockVendor(x: number = 150, y: number = 300): Vendor {
    return {
      x,
      y,
      update: vi.fn(),
      destroy: vi.fn(),
    } as unknown as Vendor;
  }

  describe('Constructor', () => {
    it('should create VendorActor with unique ID', () => {
      const vendor = createMockVendor();
      const actor = new VendorActor('vendor-1', vendor);

      expect(actor.id).toBe('vendor-1');
      expect(actor.type).toBe('vendor');
      expect(actor.category).toBe('vendor');
    });

    it('should store initial position from Vendor sprite', () => {
      const vendor = createMockVendor(200, 400);
      const actor = new VendorActor('vendor-1', vendor);

      const pos = actor.getPosition();
      expect(pos.x).toBe(200);
      expect(pos.y).toBe(400);
    });

    it('should accept custom category', () => {
      const vendor = createMockVendor();
      const actor = new VendorActor('vendor-1', vendor, 'special-vendor');

      expect(actor.category).toBe('special-vendor');
    });

    it('should support logging when enabled', () => {
      const vendor = createMockVendor();
      const actor = new VendorActor('vendor-1', vendor, 'vendor', true);

      expect(actor).toBeDefined();
    });
  });

  describe('Update', () => {
    it('should sync position from wrapped Vendor sprite', () => {
      const vendor = createMockVendor(150, 300);
      const actor = new VendorActor('vendor-1', vendor);

      // Simulate vendor movement
      vendor.x = 180;
      vendor.y = 320;

      actor.update(16.67);

      const pos = actor.getPosition();
      expect(pos.x).toBe(180);
      expect(pos.y).toBe(320);
    });

    it('should handle delta parameter', () => {
      const vendor = createMockVendor();
      const actor = new VendorActor('vendor-1', vendor);

      expect(() => {
        actor.update(16.67);
        actor.update(33.33);
        actor.update(8.33);
      }).not.toThrow();
    });

    it('should track vendor movement over time', () => {
      const vendor = createMockVendor(100, 200);
      const actor = new VendorActor('vendor-1', vendor);

      // Simulate path following
      vendor.x = 110;
      vendor.y = 205;
      actor.update(16);
      expect(actor.getPosition()).toEqual({ x: 110, y: 205 });

      vendor.x = 120;
      vendor.y = 210;
      actor.update(16);
      expect(actor.getPosition()).toEqual({ x: 120, y: 210 });

      vendor.x = 130;
      vendor.y = 215;
      actor.update(16);
      expect(actor.getPosition()).toEqual({ x: 130, y: 215 });
    });
  });

  describe('Draw', () => {
    it('should not throw when called', () => {
      const vendor = createMockVendor();
      const actor = new VendorActor('vendor-1', vendor);

      expect(() => actor.draw()).not.toThrow();
    });

    it('should be callable multiple times', () => {
      const vendor = createMockVendor();
      const actor = new VendorActor('vendor-1', vendor);

      actor.draw();
      actor.draw();
      actor.draw();
    });
  });

  describe('Sprite Access', () => {
    it('should return wrapped Vendor sprite', () => {
      const vendor = createMockVendor();
      const actor = new VendorActor('vendor-1', vendor);

      expect(actor.getVendor()).toBe(vendor);
    });

    it('should maintain reference to same Vendor instance', () => {
      const vendor = createMockVendor();
      const actor = new VendorActor('vendor-1', vendor);

      const vendor1 = actor.getVendor();
      const vendor2 = actor.getVendor();

      expect(vendor1).toBe(vendor2);
      expect(vendor1).toBe(vendor);
    });
  });

  describe('State Access', () => {
    it('should return vendor position state', () => {
      const vendor = createMockVendor(250, 350);
      const actor = new VendorActor('vendor-1', vendor);

      const state = actor.getState();

      expect(state.position.x).toBe(250);
      expect(state.position.y).toBe(350);
    });

    it('should reflect current vendor position', () => {
      const vendor = createMockVendor(100, 200);
      const actor = new VendorActor('vendor-1', vendor);

      vendor.x = 150;
      vendor.y = 250;

      const state = actor.getState();
      expect(state.position.x).toBe(150);
      expect(state.position.y).toBe(250);
    });
  });

  describe('Position Management', () => {
    it('should allow direct position setting', () => {
      const vendor = createMockVendor(100, 200);
      const actor = new VendorActor('vendor-1', vendor);

      actor.setPosition(500, 600);

      expect(actor.getPosition()).toEqual({ x: 500, y: 600 });
    });

    it('should maintain position set directly until next update', () => {
      const vendor = createMockVendor(100, 200);
      const actor = new VendorActor('vendor-1', vendor);

      actor.setPosition(500, 600);
      expect(actor.getPosition().x).toBe(500);

      // Update syncs back to vendor position
      actor.update(16);
      expect(actor.getPosition().x).toBe(100);
    });
  });

  describe('Logging', () => {
    it('should support toggling logging', () => {
      const vendor = createMockVendor();
      const actor = new VendorActor('vendor-1', vendor);

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
      const vendor = createMockVendor();
      const actor = new VendorActor('vendor-456', vendor, 'test-category');

      expect(actor.id).toBe('vendor-456');
      expect(actor.type).toBe('vendor');
      expect(actor.category).toBe('test-category');
    });

    it('should implement update and draw methods', () => {
      const vendor = createMockVendor();
      const actor = new VendorActor('vendor-1', vendor);

      expect(typeof actor.update).toBe('function');
      expect(typeof actor.draw).toBe('function');
    });

    it('should implement position getter/setter', () => {
      const vendor = createMockVendor();
      const actor = new VendorActor('vendor-1', vendor);

      expect(typeof actor.getPosition).toBe('function');
      expect(typeof actor.setPosition).toBe('function');
    });
  });
});
