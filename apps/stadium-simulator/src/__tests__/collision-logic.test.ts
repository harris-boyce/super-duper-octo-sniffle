import { describe, it, expect } from 'vitest';

/**
 * Pure logic test for wave-vendor collision detection
 * Tests the collision algorithm without any manager dependencies
 */

interface Position {
  row: number;
  col: number;
}

interface Actor {
  id: string;
  kind: string;
  category: string;
  getGridPosition: () => Position;
}

// Extracted collision logic from WaveManager.checkVendorCollisions
function detectCollision(
  waveColumn: number,
  vendors: Actor[],
  seats: Actor[],
  fans: Actor[]
): Array<{ vendorId: string; seatId: string; fanId: string; position: Position }> {
  const collisions: Array<{ vendorId: string; seatId: string; fanId: string; position: Position }> = [];

  for (const vendor of vendors) {
    const vendorPos = vendor.getGridPosition();
    
    // First check: Does vendor intersect this wave column?
    if (vendorPos.col !== waveColumn) {
      continue;
    }

    // Second check: Is there a seat actor at vendor's position?
    const seatAtPosition = seats.find((seat) => {
      const seatPos = seat.getGridPosition();
      return seatPos.row === vendorPos.row && seatPos.col === vendorPos.col;
    });

    if (!seatAtPosition) {
      continue; // Vendor not on a seat
    }

    // Third check: Is there a fan actor occupying this seat?
    const fanAtPosition = fans.find((fan) => {
      const fanPos = fan.getGridPosition();
      return fanPos.row === vendorPos.row && fanPos.col === vendorPos.col;
    });

    if (!fanAtPosition) {
      continue; // Empty seat
    }

    // COLLISION CONFIRMED
    collisions.push({
      vendorId: vendor.id,
      seatId: seatAtPosition.id,
      fanId: fanAtPosition.id,
      position: vendorPos
    });
  }

  return collisions;
}

// Test helpers
const createVendor = (id: string, row: number, col: number): Actor => ({
  id,
  kind: 'vendor',
  category: 'vendor',
  getGridPosition: () => ({ row, col })
});

const createSeat = (id: string, row: number, col: number): Actor => ({
  id,
  kind: 'seat',
  category: 'scenery',
  getGridPosition: () => ({ row, col })
});

const createFan = (id: string, row: number, col: number): Actor => ({
  id,
  kind: 'fan',
  category: 'fan',
  getGridPosition: () => ({ row, col })
});

describe('Wave-Vendor Collision Logic', () => {
  describe('Collision Requirements', () => {
    it('should detect collision when vendor, seat, and fan all occupy same cell in wave column', () => {
      const vendors = [createVendor('vendor-1', 15, 5)];
      const seats = [createSeat('seat-15-5', 15, 5)];
      const fans = [createFan('fan-15-5', 15, 5)];

      const collisions = detectCollision(5, vendors, seats, fans);

      expect(collisions).toHaveLength(1);
      expect(collisions[0]).toMatchObject({
        vendorId: 'vendor-1',
        seatId: 'seat-15-5',
        fanId: 'fan-15-5',
        position: { row: 15, col: 5 }
      });
    });

    it('should NOT detect collision when vendor is in different column than wave', () => {
      const vendors = [createVendor('vendor-1', 15, 5)];
      const seats = [createSeat('seat-15-5', 15, 5)];
      const fans = [createFan('fan-15-5', 15, 5)];

      const collisions = detectCollision(6, vendors, seats, fans);

      expect(collisions).toHaveLength(0);
    });

    it('should NOT detect collision when vendor is at seat but no fan present', () => {
      const vendors = [createVendor('vendor-1', 15, 5)];
      const seats = [createSeat('seat-15-5', 15, 5)];
      const fans: Actor[] = []; // No fan!

      const collisions = detectCollision(5, vendors, seats, fans);

      expect(collisions).toHaveLength(0);
    });

    it('should NOT detect collision when vendor is not on a seat', () => {
      const vendors = [createVendor('vendor-1', 19, 5)]; // Ground zone
      const seats: Actor[] = []; // No seat at this position
      const fans = [createFan('fan-15-5', 15, 5)]; // Fan is elsewhere

      const collisions = detectCollision(5, vendors, seats, fans);

      expect(collisions).toHaveLength(0);
    });
  });

  describe('Seat Zone Coverage', () => {
    // Section A: cols 2-9, Section B: cols 12-19, Section C: cols 22-29
    // All sections: rows 14-17

    it('should detect collisions across all Section A columns (2-9)', () => {
      const testColumns = [2, 3, 4, 5, 6, 7, 8, 9];
      
      testColumns.forEach((col) => {
        const vendors = [createVendor('vendor-1', 15, col)];
        const seats = [createSeat(`seat-15-${col}`, 15, col)];
        const fans = [createFan(`fan-15-${col}`, 15, col)];

        const collisions = detectCollision(col, vendors, seats, fans);

        expect(collisions, `Should detect collision at Section A col ${col}`).toHaveLength(1);
      });
    });

    it('should detect collisions across all Section B columns (12-19)', () => {
      const testColumns = [12, 13, 14, 15, 16, 17, 18, 19];
      
      testColumns.forEach((col) => {
        const vendors = [createVendor('vendor-1', 16, col)];
        const seats = [createSeat(`seat-16-${col}`, 16, col)];
        const fans = [createFan(`fan-16-${col}`, 16, col)];

        const collisions = detectCollision(col, vendors, seats, fans);

        expect(collisions, `Should detect collision at Section B col ${col}`).toHaveLength(1);
      });
    });

    it('should detect collisions across all Section C columns (22-29)', () => {
      const testColumns = [22, 23, 24, 25, 26, 27, 28, 29];
      
      testColumns.forEach((col) => {
        const vendors = [createVendor('vendor-1', 14, col)];
        const seats = [createSeat(`seat-14-${col}`, 14, col)];
        const fans = [createFan(`fan-14-${col}`, 14, col)];

        const collisions = detectCollision(col, vendors, seats, fans);

        expect(collisions, `Should detect collision at Section C col ${col}`).toHaveLength(1);
      });
    });

    it('should detect collisions across all seat rows (14-17)', () => {
      const testRows = [14, 15, 16, 17];
      
      testRows.forEach((row) => {
        const vendors = [createVendor('vendor-1', row, 5)];
        const seats = [createSeat(`seat-${row}-5`, row, 5)];
        const fans = [createFan(`fan-${row}-5`, row, 5)];

        const collisions = detectCollision(5, vendors, seats, fans);

        expect(collisions, `Should detect collision at row ${row}`).toHaveLength(1);
      });
    });
  });

  describe('Multiple Vendors', () => {
    it('should detect collisions for multiple vendors in same column', () => {
      const vendors = [
        createVendor('vendor-1', 14, 5),
        createVendor('vendor-2', 16, 5)
      ];
      const seats = [
        createSeat('seat-14-5', 14, 5),
        createSeat('seat-16-5', 16, 5)
      ];
      const fans = [
        createFan('fan-14-5', 14, 5),
        createFan('fan-16-5', 16, 5)
      ];

      const collisions = detectCollision(5, vendors, seats, fans);

      expect(collisions).toHaveLength(2);
      expect(collisions.map(c => c.vendorId)).toContain('vendor-1');
      expect(collisions.map(c => c.vendorId)).toContain('vendor-2');
    });

    it('should only detect collision for vendor at occupied seat, not empty seat', () => {
      const vendors = [
        createVendor('vendor-1', 14, 5),
        createVendor('vendor-2', 16, 5)
      ];
      const seats = [
        createSeat('seat-14-5', 14, 5),
        createSeat('seat-16-5', 16, 5)
      ];
      const fans = [
        createFan('fan-14-5', 14, 5)
        // No fan at row 16!
      ];

      const collisions = detectCollision(5, vendors, seats, fans);

      expect(collisions).toHaveLength(1);
      expect(collisions[0].vendorId).toBe('vendor-1');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty vendors array', () => {
      const vendors: Actor[] = [];
      const seats = [createSeat('seat-15-5', 15, 5)];
      const fans = [createFan('fan-15-5', 15, 5)];

      const collisions = detectCollision(5, vendors, seats, fans);

      expect(collisions).toHaveLength(0);
    });

    it('should handle vendor at seat with fan in different row/col', () => {
      const vendors = [createVendor('vendor-1', 15, 5)];
      const seats = [createSeat('seat-15-5', 15, 5)];
      const fans = [createFan('fan-16-6', 16, 6)]; // Different position

      const collisions = detectCollision(5, vendors, seats, fans);

      expect(collisions).toHaveLength(0);
    });

    it('should handle multiple seats in column but only one with vendor+fan', () => {
      const vendors = [createVendor('vendor-1', 15, 5)];
      const seats = [
        createSeat('seat-14-5', 14, 5),
        createSeat('seat-15-5', 15, 5),
        createSeat('seat-16-5', 16, 5)
      ];
      const fans = [createFan('fan-15-5', 15, 5)];

      const collisions = detectCollision(5, vendors, seats, fans);

      expect(collisions).toHaveLength(1);
      expect(collisions[0].position.row).toBe(15);
    });
  });
});
