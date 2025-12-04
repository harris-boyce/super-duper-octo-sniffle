import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock phaser3spectorjs and GridManager BEFORE any imports
vi.mock('phaser3spectorjs', () => ({}));
vi.mock('@/managers/GridManager', () => ({
  GridManager: vi.fn().mockImplementation(() => ({
    getCellAt: vi.fn()
  }))
}));

import { WaveManager } from '@/managers/WaveManager';
import { GameStateManager } from '@/managers/GameStateManager';
import { ActorRegistry } from '@/actors/base/ActorRegistry';

describe('Wave-Vendor Collision Detection', () => {
  let waveManager: WaveManager;
  let gameState: GameStateManager;
  let actorRegistry: ActorRegistry;
  let mockGridManager: any;
  let collisionEvents: any[];

  // Mock actor factory
  const createMockVendor = (id: string, row: number, col: number, pointsEarned: number = 0) => ({
    id,
    kind: 'vendor',
    category: 'vendor' as const,
    getGridPosition: () => ({ row, col }),
    getBehavior: () => ({
      getPointsEarned: () => pointsEarned
    })
  });

  const createMockSeat = (id: string, row: number, col: number) => ({
    id,
    kind: 'seat',
    category: 'scenery' as const,
    getGridPosition: () => ({ row, col })
  });

  const createMockFan = (id: string, row: number, col: number) => ({
    id,
    kind: 'fan',
    category: 'fan' as const,
    getGridPosition: () => ({ row, col })
  });

  beforeEach(() => {
    // Create minimal managers
    gameState = new GameStateManager();
    actorRegistry = new ActorRegistry();
    mockGridManager = {
      getCellAt: vi.fn()
    };
    
    // Initialize WaveManager with registries
    waveManager = new WaveManager(gameState, undefined, mockGridManager, actorRegistry);

    // Capture collision events
    collisionEvents = [];
    waveManager.on('vendorCollision', (data: any) => {
      collisionEvents.push(data);
    });
  });

  describe('Collision Requirements', () => {
    it('should detect collision when vendor, seat, and fan all occupy same cell in wave column', () => {
      // Arrange: Section A, col 5 (middle of section)
      const vendor = createMockVendor('vendor-1', 15, 5, 3);
      const seat = createMockSeat('seat-15-5', 15, 5);
      const fan = createMockFan('fan-15-5', 15, 5);

      actorRegistry.register(vendor as any);
      actorRegistry.register(seat as any);
      actorRegistry.register(fan as any);

      // Act: Wave passes through column 5
      (waveManager as any).checkVendorCollisions('A', 5);

      // Assert: Collision detected
      expect(collisionEvents).toHaveLength(1);
      expect(collisionEvents[0]).toMatchObject({
        actorId: 'vendor-1',
        sectionId: 'A',
        pointsAtRisk: 3,
        vendorPosition: { row: 15, col: 5 },
        waveColumn: 5,
        seatId: 'seat-15-5',
        fanId: 'fan-15-5'
      });
    });

    it('should NOT detect collision when vendor is in different column than wave', () => {
      const vendor = createMockVendor('vendor-1', 15, 5, 2);
      const seat = createMockSeat('seat-15-5', 15, 5);
      const fan = createMockFan('fan-15-5', 15, 5);

      actorRegistry.register(vendor as any);
      actorRegistry.register(seat as any);
      actorRegistry.register(fan as any);

      // Wave passes through column 6 (vendor is at col 5)
      (waveManager as any).checkVendorCollisions('A', 6);

      expect(collisionEvents).toHaveLength(0);
    });

    it('should NOT detect collision when vendor is at seat but no fan present', () => {
      const vendor = createMockVendor('vendor-1', 15, 5, 2);
      const seat = createMockSeat('seat-15-5', 15, 5);
      // No fan registered!

      actorRegistry.register(vendor as any);
      actorRegistry.register(seat as any);

      (waveManager as any).checkVendorCollisions('A', 5);

      expect(collisionEvents).toHaveLength(0);
    });

    it('should NOT detect collision when vendor is not on a seat', () => {
      const vendor = createMockVendor('vendor-1', 19, 5, 2); // Ground zone, not seat
      const fan = createMockFan('fan-15-5', 15, 5); // Fan is elsewhere
      // No seat at vendor position!

      actorRegistry.register(vendor as any);
      actorRegistry.register(fan as any);

      (waveManager as any).checkVendorCollisions('A', 5);

      expect(collisionEvents).toHaveLength(0);
    });
  });

  describe('Seat Zone Coverage', () => {
    // Section A: cols 2-9, Section B: cols 12-19, Section C: cols 22-29
    // All sections: rows 14-17

    it('should detect collisions across all Section A columns (2-9)', () => {
      const testColumns = [2, 3, 4, 5, 6, 7, 8, 9];
      
      testColumns.forEach((col) => {
        // Clear registry between tests
        actorRegistry = new ActorRegistry();
        waveManager = new WaveManager(gameState, undefined, mockGridManager, actorRegistry);
        collisionEvents = [];
        waveManager.on('vendorCollision', (data: any) => collisionEvents.push(data));

        const vendor = createMockVendor('vendor-1', 15, col, 1);
        const seat = createMockSeat(`seat-15-${col}`, 15, col);
        const fan = createMockFan(`fan-15-${col}`, 15, col);

        actorRegistry.register(vendor as any);
        actorRegistry.register(seat as any);
        actorRegistry.register(fan as any);

        (waveManager as any).checkVendorCollisions('A', col);

        expect(collisionEvents, `Should detect collision at Section A col ${col}`).toHaveLength(1);
      });
    });

    it('should detect collisions across all Section B columns (12-19)', () => {
      const testColumns = [12, 13, 14, 15, 16, 17, 18, 19];
      
      testColumns.forEach((col) => {
        actorRegistry = new ActorRegistry();
        waveManager = new WaveManager(gameState, undefined, mockGridManager, actorRegistry);
        collisionEvents = [];
        waveManager.on('vendorCollision', (data: any) => collisionEvents.push(data));

        const vendor = createMockVendor('vendor-1', 16, col, 2);
        const seat = createMockSeat(`seat-16-${col}`, 16, col);
        const fan = createMockFan(`fan-16-${col}`, 16, col);

        actorRegistry.register(vendor as any);
        actorRegistry.register(seat as any);
        actorRegistry.register(fan as any);

        (waveManager as any).checkVendorCollisions('B', col);

        expect(collisionEvents, `Should detect collision at Section B col ${col}`).toHaveLength(1);
      });
    });

    it('should detect collisions across all Section C columns (22-29)', () => {
      const testColumns = [22, 23, 24, 25, 26, 27, 28, 29];
      
      testColumns.forEach((col) => {
        actorRegistry = new ActorRegistry();
        waveManager = new WaveManager(gameState, undefined, mockGridManager, actorRegistry);
        collisionEvents = [];
        waveManager.on('vendorCollision', (data: any) => collisionEvents.push(data));

        const vendor = createMockVendor('vendor-1', 14, col, 3);
        const seat = createMockSeat(`seat-14-${col}`, 14, col);
        const fan = createMockFan(`fan-14-${col}`, 14, col);

        actorRegistry.register(vendor as any);
        actorRegistry.register(seat as any);
        actorRegistry.register(fan as any);

        (waveManager as any).checkVendorCollisions('C', col);

        expect(collisionEvents, `Should detect collision at Section C col ${col}`).toHaveLength(1);
      });
    });

    it('should detect collisions across all seat rows (14-17)', () => {
      const testRows = [14, 15, 16, 17];
      
      testRows.forEach((row) => {
        actorRegistry = new ActorRegistry();
        waveManager = new WaveManager(gameState, undefined, mockGridManager, actorRegistry);
        collisionEvents = [];
        waveManager.on('vendorCollision', (data: any) => collisionEvents.push(data));

        const vendor = createMockVendor('vendor-1', row, 5, 1);
        const seat = createMockSeat(`seat-${row}-5`, row, 5);
        const fan = createMockFan(`fan-${row}-5`, row, 5);

        actorRegistry.register(vendor as any);
        actorRegistry.register(seat as any);
        actorRegistry.register(fan as any);

        (waveManager as any).checkVendorCollisions('A', 5);

        expect(collisionEvents, `Should detect collision at row ${row}`).toHaveLength(1);
      });
    });
  });

  describe('Multiple Vendors', () => {
    it('should detect collisions for multiple vendors in same column', () => {
      // Two vendors at different rows, same column
      const vendor1 = createMockVendor('vendor-1', 14, 5, 2);
      const vendor2 = createMockVendor('vendor-2', 16, 5, 3);
      
      const seat1 = createMockSeat('seat-14-5', 14, 5);
      const seat2 = createMockSeat('seat-16-5', 16, 5);
      
      const fan1 = createMockFan('fan-14-5', 14, 5);
      const fan2 = createMockFan('fan-16-5', 16, 5);

      actorRegistry.register(vendor1 as any);
      actorRegistry.register(vendor2 as any);
      actorRegistry.register(seat1 as any);
      actorRegistry.register(seat2 as any);
      actorRegistry.register(fan1 as any);
      actorRegistry.register(fan2 as any);

      (waveManager as any).checkVendorCollisions('A', 5);

      expect(collisionEvents).toHaveLength(2);
      expect(collisionEvents[0].actorId).toBe('vendor-1');
      expect(collisionEvents[1].actorId).toBe('vendor-2');
    });

    it('should only detect collision for vendor at occupied seat, not empty seat', () => {
      const vendor1 = createMockVendor('vendor-1', 14, 5, 2);
      const vendor2 = createMockVendor('vendor-2', 16, 5, 3);
      
      const seat1 = createMockSeat('seat-14-5', 14, 5);
      const seat2 = createMockSeat('seat-16-5', 16, 5);
      
      // Only fan1, no fan at seat2
      const fan1 = createMockFan('fan-14-5', 14, 5);

      actorRegistry.register(vendor1 as any);
      actorRegistry.register(vendor2 as any);
      actorRegistry.register(seat1 as any);
      actorRegistry.register(seat2 as any);
      actorRegistry.register(fan1 as any);

      (waveManager as any).checkVendorCollisions('A', 5);

      expect(collisionEvents).toHaveLength(1);
      expect(collisionEvents[0].actorId).toBe('vendor-1');
    });
  });

  describe('Points at Risk', () => {
    it('should report correct points at risk from vendor behavior', () => {
      const vendor = createMockVendor('vendor-1', 15, 5, 7);
      const seat = createMockSeat('seat-15-5', 15, 5);
      const fan = createMockFan('fan-15-5', 15, 5);

      actorRegistry.register(vendor as any);
      actorRegistry.register(seat as any);
      actorRegistry.register(fan as any);

      (waveManager as any).checkVendorCollisions('A', 5);

      expect(collisionEvents[0].pointsAtRisk).toBe(7);
    });

    it('should report 0 points at risk when vendor has no points', () => {
      const vendor = createMockVendor('vendor-1', 15, 5, 0);
      const seat = createMockSeat('seat-15-5', 15, 5);
      const fan = createMockFan('fan-15-5', 15, 5);

      actorRegistry.register(vendor as any);
      actorRegistry.register(seat as any);
      actorRegistry.register(fan as any);

      (waveManager as any).checkVendorCollisions('A', 5);

      expect(collisionEvents[0].pointsAtRisk).toBe(0);
    });
  });
});
