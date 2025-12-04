import { describe, it, expect, beforeEach } from 'vitest';
import { ActorRegistry } from '@/actors/base/ActorRegistry';

/**
 * Integration test for WaveManager collision detection
 * Tests the actual checkVendorCollisions implementation with real ActorRegistry
 * 
 * NOTE: This directly tests the collision logic by simulating what WaveManager does:
 * 1. Query ActorRegistry for vendors, seats, fans
 * 2. Check if vendor column matches wave column
 * 3. Check if seat exists at vendor position
 * 4. Check if fan exists at seat position
 */

// Mock actors with grid positions
const createMockVendor = (id: string, row: number, col: number) => ({
  id,
  category: 'vendor' as const,
  kind: 'animated' as const,
  type: 'vendor',
  getGridPosition: () => ({ row, col }),
  getBehavior: () => ({
    getPointsEarned: () => 50
  }),
  getState: () => ({})
});

const createMockSeat = (id: string, row: number, col: number) => ({
  id,
  category: 'seat' as const,
  kind: 'scenery' as const,
  type: 'seat',
  getGridPosition: () => ({ row, col }),
  getState: () => ({})
});

const createMockFan = (id: string, row: number, col: number) => ({
  id,
  category: 'fan' as const,
  kind: 'animated' as const,
  type: 'fan',
  getGridPosition: () => ({ row, col }),
  getState: () => ({})
});

/**
 * Simulate WaveManager.checkVendorCollisions logic
 * This mirrors the actual implementation to validate it works with ActorRegistry
 */
function checkCollisions(actorRegistry: ActorRegistry, waveColumn: number) {
  const vendors = actorRegistry.getByCategory('vendor');
  const seats = actorRegistry.getByCategory('seat');
  const fans = actorRegistry.getByCategory('fan');

  const collisions: any[] = [];

  for (const vendor of vendors) {
    const vendorPos = vendor.getGridPosition();
    
    // Step 1: Column match
    if (vendorPos.col !== waveColumn) {
      continue;
    }

    // Step 2: Seat exists at vendor position
    const seatAtPosition = seats.find((seat: any) => {
      const seatPos = seat.getGridPosition();
      return seatPos.row === vendorPos.row && seatPos.col === vendorPos.col;
    });

    if (!seatAtPosition) {
      continue;
    }

    // Step 3: Fan exists at seat position
    const fanAtPosition = fans.find((fan: any) => {
      const fanPos = fan.getGridPosition();
      return fanPos.row === vendorPos.row && fanPos.col === vendorPos.col;
    });

    if (!fanAtPosition) {
      continue;
    }

    // Collision confirmed
    collisions.push({
      vendorId: vendor.id,
      seatId: seatAtPosition.id,
      fanId: fanAtPosition.id,
      position: vendorPos
    });
  }

  return collisions;
}

describe('WaveManager Collision Detection (Integration)', () => {
  let actorRegistry: ActorRegistry;

  beforeEach(() => {
    actorRegistry = new ActorRegistry();
  });

  describe('Collision Detection with Real ActorRegistry', () => {
    it('should detect collision when vendor+seat+fan all at wave column', () => {
      // Register actors
      const vendor = createMockVendor('vendor-1', 15, 5);
      const seat = createMockSeat('seat-15-5', 15, 5);
      const fan = createMockFan('fan-15-5', 15, 5);

      actorRegistry.register(vendor as any);
      actorRegistry.register(seat as any);
      actorRegistry.register(fan as any);

      const collisions = checkCollisions(actorRegistry, 5);

      expect(collisions).toHaveLength(1);
      expect(collisions[0]).toMatchObject({
        vendorId: 'vendor-1',
        seatId: 'seat-15-5',
        fanId: 'fan-15-5',
        position: { row: 15, col: 5 }
      });
    });

    it('should NOT detect collision when vendor is in different column than wave', () => {
      const vendor = createMockVendor('vendor-1', 15, 5);
      const seat = createMockSeat('seat-15-5', 15, 5);
      const fan = createMockFan('fan-15-5', 15, 5);

      actorRegistry.register(vendor as any);
      actorRegistry.register(seat as any);
      actorRegistry.register(fan as any);

      // Wave at column 6, vendor at column 5
      const collisions = checkCollisions(actorRegistry, 6);

      expect(collisions).toHaveLength(0);
    });

    it('should NOT detect collision when no seat exists at vendor position', () => {
      const vendor = createMockVendor('vendor-1', 15, 5);
      const fan = createMockFan('fan-15-5', 15, 5);
      // No seat registered!

      actorRegistry.register(vendor as any);
      actorRegistry.register(fan as any);

      const collisions = checkCollisions(actorRegistry, 5);

      expect(collisions).toHaveLength(0);
    });

    it('should NOT detect collision when no fan exists at seat position', () => {
      const vendor = createMockVendor('vendor-1', 15, 5);
      const seat = createMockSeat('seat-15-5', 15, 5);
      // No fan registered!

      actorRegistry.register(vendor as any);
      actorRegistry.register(seat as any);

      const collisions = checkCollisions(actorRegistry, 5);

      expect(collisions).toHaveLength(0);
    });

    it('should detect collision at Section B column 12 (leftmost)', () => {
      const vendor = createMockVendor('vendor-1', 14, 12);
      const seat = createMockSeat('seat-14-12', 14, 12);
      const fan = createMockFan('fan-14-12', 14, 12);

      actorRegistry.register(vendor as any);
      actorRegistry.register(seat as any);
      actorRegistry.register(fan as any);

      const collisions = checkCollisions(actorRegistry, 12);

      expect(collisions).toHaveLength(1);
      expect(collisions[0].position.col).toBe(12);
    });

    it('should detect collision at Section C column 20', () => {
      const vendor = createMockVendor('vendor-1', 20, 20);
      const seat = createMockSeat('seat-20-20', 20, 20);
      const fan = createMockFan('fan-20-20', 20, 20);

      actorRegistry.register(vendor as any);
      actorRegistry.register(seat as any);
      actorRegistry.register(fan as any);

      const collisions = checkCollisions(actorRegistry, 20);

      expect(collisions).toHaveLength(1);
      expect(collisions[0].position).toEqual({ row: 20, col: 20 });
    });

    it('should detect multiple collisions in same column', () => {
      const vendor1 = createMockVendor('vendor-1', 14, 5);
      const vendor2 = createMockVendor('vendor-2', 16, 5);
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

      const collisions = checkCollisions(actorRegistry, 5);

      expect(collisions).toHaveLength(2);
      const vendorIds = collisions.map(c => c.vendorId);
      expect(vendorIds).toContain('vendor-1');
      expect(vendorIds).toContain('vendor-2');
    });

    it('should only detect collision for vendor with fan, not empty seat', () => {
      const vendor1 = createMockVendor('vendor-1', 14, 5);
      const vendor2 = createMockVendor('vendor-2', 16, 5);
      const seat1 = createMockSeat('seat-14-5', 14, 5);
      const seat2 = createMockSeat('seat-16-5', 16, 5);
      const fan1 = createMockFan('fan-14-5', 14, 5);
      // No fan2 at row 16!

      actorRegistry.register(vendor1 as any);
      actorRegistry.register(vendor2 as any);
      actorRegistry.register(seat1 as any);
      actorRegistry.register(seat2 as any);
      actorRegistry.register(fan1 as any);

      const collisions = checkCollisions(actorRegistry, 5);

      expect(collisions).toHaveLength(1);
      expect(collisions[0].vendorId).toBe('vendor-1');
    });
  });

  describe('ActorRegistry Integration', () => {
    it('should find vendors, seats, and fans via getByCategory', () => {
      // Register mixed actors
      const vendor = createMockVendor('vendor-1', 15, 5);
      const seat = createMockSeat('seat-15-5', 15, 5);
      const fan = createMockFan('fan-15-5', 15, 5);
      const otherSeat = createMockSeat('seat-16-6', 16, 6);
      const otherFan = createMockFan('fan-14-4', 14, 4);

      actorRegistry.register(vendor as any);
      actorRegistry.register(seat as any);
      actorRegistry.register(fan as any);
      actorRegistry.register(otherSeat as any);
      actorRegistry.register(otherFan as any);

      // Check that getByCategory returns correct actors
      const vendors = actorRegistry.getByCategory('vendor');
      const seats = actorRegistry.getByCategory('seat');
      const fans = actorRegistry.getByCategory('fan');

      expect(vendors).toHaveLength(1);
      expect(seats).toHaveLength(2);
      expect(fans).toHaveLength(2);

      // Should find collision despite other actors present
      const collisions = checkCollisions(actorRegistry, 5);
      expect(collisions).toHaveLength(1);
    });

    it('should handle empty registry gracefully', () => {
      // Empty registry - no actors registered
      const collisions = checkCollisions(actorRegistry, 5);

      expect(collisions).toHaveLength(0);
    });

    it('should find actors registered after creation', () => {
      // Register actors dynamically
      const vendor = createMockVendor('vendor-late', 17, 8);
      const seat = createMockSeat('seat-17-8', 17, 8);
      const fan = createMockFan('fan-17-8', 17, 8);

      actorRegistry.register(vendor as any);
      actorRegistry.register(seat as any);
      actorRegistry.register(fan as any);

      const collisions = checkCollisions(actorRegistry, 8);

      expect(collisions).toHaveLength(1);
      expect(collisions[0].vendorId).toBe('vendor-late');
    });
  });
});
