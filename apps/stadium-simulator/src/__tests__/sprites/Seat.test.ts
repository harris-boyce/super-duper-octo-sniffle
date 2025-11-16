import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Seat } from '@/sprites/Seat';
import type { Fan } from '@/sprites/Fan';
import type { VendorAbilities } from '@/types/GameTypes';
import { gameBalance } from '@/config/gameBalance';

describe('Seat', () => {
  function createMockFan(): Fan {
    return {
      x: 0,
      y: 0,
      isDifficultTerrain: vi.fn(() => false),
      getTerrainPenaltyMultiplier: vi.fn(() => 1.0),
      destroy: vi.fn(),
    } as unknown as Fan;
  }

  function createDefaultVendorAbilities(): VendorAbilities {
    return {
      ignoreRowPenalty: false,
      ignoreGrumpPenalty: false,
      canEnterRows: true,
      rangedOnly: false,
    };
  }

  describe('Constructor & Initial State', () => {
    it('should create seat with index and position', () => {
      const seat = new Seat(5, 100, 200);

      expect(seat.seatIndex).toBe(5);
      expect(seat.getPosition().x).toBe(100);
      expect(seat.getPosition().y).toBe(200);
    });

    it('should start empty (no fan assigned)', () => {
      const seat = new Seat(0, 50, 100);

      expect(seat.isEmpty()).toBe(true);
      expect(seat.getFan()).toBeNull();
    });

    it('should handle zero index', () => {
      const seat = new Seat(0, 10, 20);

      expect(seat.seatIndex).toBe(0);
      expect(seat.isEmpty()).toBe(true);
    });

    it('should handle negative coordinates', () => {
      const seat = new Seat(3, -50, -100);

      expect(seat.getPosition().x).toBe(-50);
      expect(seat.getPosition().y).toBe(-100);
    });

    it('should create multiple seats with different indices', () => {
      const seat1 = new Seat(0, 100, 200);
      const seat2 = new Seat(1, 120, 200);
      const seat3 = new Seat(2, 140, 200);

      expect(seat1.seatIndex).toBe(0);
      expect(seat2.seatIndex).toBe(1);
      expect(seat3.seatIndex).toBe(2);
    });
  });

  describe('Fan Assignment', () => {
    it('should assign fan to empty seat', () => {
      const seat = new Seat(0, 100, 200);
      const fan = createMockFan();

      seat.assignFan(fan);

      expect(seat.isEmpty()).toBe(false);
      expect(seat.getFan()).toBe(fan);
    });

    it('should overwrite existing fan when assigning new fan', () => {
      const seat = new Seat(0, 100, 200);
      const fan1 = createMockFan();
      const fan2 = createMockFan();

      seat.assignFan(fan1);
      expect(seat.getFan()).toBe(fan1);

      seat.assignFan(fan2);
      expect(seat.getFan()).toBe(fan2);
    });

    it('should maintain fan reference', () => {
      const seat = new Seat(0, 100, 200);
      const fan = createMockFan();

      seat.assignFan(fan);

      const retrieved1 = seat.getFan();
      const retrieved2 = seat.getFan();

      expect(retrieved1).toBe(fan);
      expect(retrieved2).toBe(fan);
      expect(retrieved1).toBe(retrieved2);
    });

    it('should allow multiple assignments to same seat', () => {
      const seat = new Seat(0, 100, 200);
      const fans = [createMockFan(), createMockFan(), createMockFan()];

      seat.assignFan(fans[0]);
      expect(seat.getFan()).toBe(fans[0]);

      seat.assignFan(fans[1]);
      expect(seat.getFan()).toBe(fans[1]);

      seat.assignFan(fans[2]);
      expect(seat.getFan()).toBe(fans[2]);
    });
  });

  describe('Fan Removal', () => {
    it('should remove fan from occupied seat', () => {
      const seat = new Seat(0, 100, 200);
      const fan = createMockFan();

      seat.assignFan(fan);
      const removed = seat.removeFan();

      expect(removed).toBe(fan);
      expect(seat.isEmpty()).toBe(true);
      expect(seat.getFan()).toBeNull();
    });

    it('should return null when removing from empty seat', () => {
      const seat = new Seat(0, 100, 200);

      const removed = seat.removeFan();

      expect(removed).toBeNull();
      expect(seat.isEmpty()).toBe(true);
    });

    it('should allow removing fan multiple times (returns null after first)', () => {
      const seat = new Seat(0, 100, 200);
      const fan = createMockFan();

      seat.assignFan(fan);

      const removed1 = seat.removeFan();
      expect(removed1).toBe(fan);

      const removed2 = seat.removeFan();
      expect(removed2).toBeNull();

      const removed3 = seat.removeFan();
      expect(removed3).toBeNull();
    });

    it('should allow reassignment after removal', () => {
      const seat = new Seat(0, 100, 200);
      const fan1 = createMockFan();
      const fan2 = createMockFan();

      seat.assignFan(fan1);
      seat.removeFan();

      expect(seat.isEmpty()).toBe(true);

      seat.assignFan(fan2);
      expect(seat.isEmpty()).toBe(false);
      expect(seat.getFan()).toBe(fan2);
    });
  });

  describe('isEmpty Check', () => {
    it('should return true for newly created seat', () => {
      const seat = new Seat(0, 100, 200);

      expect(seat.isEmpty()).toBe(true);
    });

    it('should return false after fan assignment', () => {
      const seat = new Seat(0, 100, 200);
      const fan = createMockFan();

      seat.assignFan(fan);

      expect(seat.isEmpty()).toBe(false);
    });

    it('should return true after fan removal', () => {
      const seat = new Seat(0, 100, 200);
      const fan = createMockFan();

      seat.assignFan(fan);
      seat.removeFan();

      expect(seat.isEmpty()).toBe(true);
    });

    it('should toggle correctly through multiple operations', () => {
      const seat = new Seat(0, 100, 200);
      const fan = createMockFan();

      expect(seat.isEmpty()).toBe(true);

      seat.assignFan(fan);
      expect(seat.isEmpty()).toBe(false);

      seat.removeFan();
      expect(seat.isEmpty()).toBe(true);

      seat.assignFan(fan);
      expect(seat.isEmpty()).toBe(false);
    });
  });

  describe('Position Access', () => {
    it('should return seat position', () => {
      const seat = new Seat(0, 150, 250);

      const pos = seat.getPosition();

      expect(pos.x).toBe(150);
      expect(pos.y).toBe(250);
    });

    it('should return same position on multiple calls', () => {
      const seat = new Seat(0, 100, 200);

      const pos1 = seat.getPosition();
      const pos2 = seat.getPosition();

      expect(pos1).toEqual(pos2);
      expect(pos1.x).toBe(pos2.x);
      expect(pos1.y).toBe(pos2.y);
    });

    it('should return position independent of fan assignment', () => {
      const seat = new Seat(0, 300, 400);
      const fan = createMockFan();

      const posBefore = seat.getPosition();
      seat.assignFan(fan);
      const posAfter = seat.getPosition();

      expect(posBefore).toEqual(posAfter);
    });

    it('should handle different coordinate values', () => {
      const seat1 = new Seat(0, 0, 0);
      const seat2 = new Seat(1, 999, 999);
      const seat3 = new Seat(2, -100, -200);

      expect(seat1.getPosition()).toEqual({ x: 0, y: 0 });
      expect(seat2.getPosition()).toEqual({ x: 999, y: 999 });
      expect(seat3.getPosition()).toEqual({ x: -100, y: -200 });
    });
  });

  describe('Traversal Penalty - Empty Seats', () => {
    it('should return empty seat penalty for unoccupied seat', () => {
      const seat = new Seat(0, 100, 200);
      const abilities = createDefaultVendorAbilities();

      const penalty = seat.getTraversalPenalty(abilities);

      expect(penalty).toBe(gameBalance.vendorMovement.emptySeatPenalty);
    });

    it('should return empty seat penalty after fan removal', () => {
      const seat = new Seat(0, 100, 200);
      const fan = createMockFan();
      const abilities = createDefaultVendorAbilities();

      seat.assignFan(fan);
      seat.removeFan();

      const penalty = seat.getTraversalPenalty(abilities);

      expect(penalty).toBe(gameBalance.vendorMovement.emptySeatPenalty);
    });
  });

  describe('Traversal Penalty - Occupied Seats', () => {
    it('should return occupied seat penalty for normal fan', () => {
      const seat = new Seat(0, 100, 200);
      const fan = createMockFan();
      (fan.isDifficultTerrain as any).mockReturnValue(false);
      const abilities = createDefaultVendorAbilities();

      seat.assignFan(fan);

      const penalty = seat.getTraversalPenalty(abilities);

      expect(penalty).toBe(gameBalance.vendorMovement.occupiedSeatPenalty);
    });

    it('should check fan difficult terrain status', () => {
      const seat = new Seat(0, 100, 200);
      const fan = createMockFan();
      const abilities = createDefaultVendorAbilities();

      seat.assignFan(fan);
      seat.getTraversalPenalty(abilities);

      expect(fan.isDifficultTerrain).toHaveBeenCalled();
    });
  });

  describe('Traversal Penalty - Difficult Terrain (Grumpy Fans)', () => {
    it('should apply grump penalty for difficult terrain fan', () => {
      const seat = new Seat(0, 100, 200);
      const fan = createMockFan();
      (fan.isDifficultTerrain as any).mockReturnValue(true);
      (fan.getTerrainPenaltyMultiplier as any).mockReturnValue(2.0);
      const abilities = createDefaultVendorAbilities();

      seat.assignFan(fan);

      const penalty = seat.getTraversalPenalty(abilities);

      const expectedPenalty = gameBalance.vendorMovement.rowBasePenalty * 2.0;
      expect(penalty).toBe(expectedPenalty);
    });

    it('should call getTerrainPenaltyMultiplier for difficult terrain', () => {
      const seat = new Seat(0, 100, 200);
      const fan = createMockFan();
      (fan.isDifficultTerrain as any).mockReturnValue(true);
      const abilities = createDefaultVendorAbilities();

      seat.assignFan(fan);
      seat.getTraversalPenalty(abilities);

      expect(fan.getTerrainPenaltyMultiplier).toHaveBeenCalled();
    });

    it('should cap grump penalty at maxTerrainPenalty', () => {
      const seat = new Seat(0, 100, 200);
      const fan = createMockFan();
      (fan.isDifficultTerrain as any).mockReturnValue(true);
      (fan.getTerrainPenaltyMultiplier as any).mockReturnValue(999.0); // Very high
      const abilities = createDefaultVendorAbilities();

      seat.assignFan(fan);

      const penalty = seat.getTraversalPenalty(abilities);

      expect(penalty).toBe(gameBalance.vendorMovement.maxTerrainPenalty);
      expect(penalty).toBeLessThanOrEqual(gameBalance.vendorMovement.maxTerrainPenalty);
    });

    it('should apply different multipliers from fan', () => {
      const seat = new Seat(0, 100, 200);
      const fan = createMockFan();
      (fan.isDifficultTerrain as any).mockReturnValue(true);
      const abilities = createDefaultVendorAbilities();

      seat.assignFan(fan);

      (fan.getTerrainPenaltyMultiplier as any).mockReturnValue(1.5);
      const penalty1 = seat.getTraversalPenalty(abilities);
      expect(penalty1).toBe(gameBalance.vendorMovement.rowBasePenalty * 1.5);

      (fan.getTerrainPenaltyMultiplier as any).mockReturnValue(3.0);
      const penalty2 = seat.getTraversalPenalty(abilities);
      expect(penalty2).toBe(gameBalance.vendorMovement.rowBasePenalty * 3.0);
    });
  });

  describe('Traversal Penalty - Vendor Abilities', () => {
    it('should ignore grump penalty when vendor has ignoreGrumpPenalty ability', () => {
      const seat = new Seat(0, 100, 200);
      const fan = createMockFan();
      (fan.isDifficultTerrain as any).mockReturnValue(true);
      (fan.getTerrainPenaltyMultiplier as any).mockReturnValue(5.0); // Very high
      
      const abilities: VendorAbilities = {
        ignoreRowPenalty: false,
        ignoreGrumpPenalty: true,
        canEnterRows: true,
        rangedOnly: false,
      };

      seat.assignFan(fan);

      const penalty = seat.getTraversalPenalty(abilities);

      // Should return occupied seat penalty, ignoring the high grump multiplier
      expect(penalty).toBe(gameBalance.vendorMovement.occupiedSeatPenalty);
      
      // Without the ability, penalty would be much higher
      const abilitiesWithoutIgnore = createDefaultVendorAbilities();
      const penaltyWithGrump = seat.getTraversalPenalty(abilitiesWithoutIgnore);
      expect(penaltyWithGrump).toBeGreaterThan(penalty);
    });

    it('should still check difficult terrain even with ignoreGrumpPenalty', () => {
      const seat = new Seat(0, 100, 200);
      const fan = createMockFan();
      (fan.isDifficultTerrain as any).mockReturnValue(true);
      
      const abilities: VendorAbilities = {
        ignoreRowPenalty: false,
        ignoreGrumpPenalty: true,
        canEnterRows: true,
        rangedOnly: false,
      };

      seat.assignFan(fan);
      seat.getTraversalPenalty(abilities);

      expect(fan.isDifficultTerrain).toHaveBeenCalled();
    });

    it('should not call getTerrainPenaltyMultiplier when ignoring grump penalty', () => {
      const seat = new Seat(0, 100, 200);
      const fan = createMockFan();
      (fan.isDifficultTerrain as any).mockReturnValue(true);
      
      const abilities: VendorAbilities = {
        ignoreRowPenalty: false,
        ignoreGrumpPenalty: true,
        canEnterRows: true,
        rangedOnly: false,
      };

      seat.assignFan(fan);
      seat.getTraversalPenalty(abilities);

      expect(fan.getTerrainPenaltyMultiplier).not.toHaveBeenCalled();
    });
  });

  describe('Traversal Penalty - Edge Cases', () => {
    it('should handle fan becoming difficult terrain', () => {
      const seat = new Seat(0, 100, 200);
      const fan = createMockFan();
      const abilities = createDefaultVendorAbilities();

      seat.assignFan(fan);

      // Initially not difficult
      (fan.isDifficultTerrain as any).mockReturnValue(false);
      const penalty1 = seat.getTraversalPenalty(abilities);
      expect(penalty1).toBe(gameBalance.vendorMovement.occupiedSeatPenalty);

      // Becomes difficult
      (fan.isDifficultTerrain as any).mockReturnValue(true);
      (fan.getTerrainPenaltyMultiplier as any).mockReturnValue(2.0);
      const penalty2 = seat.getTraversalPenalty(abilities);
      expect(penalty2).toBe(gameBalance.vendorMovement.rowBasePenalty * 2.0);
    });

    it('should return to empty penalty after removing difficult terrain fan', () => {
      const seat = new Seat(0, 100, 200);
      const fan = createMockFan();
      (fan.isDifficultTerrain as any).mockReturnValue(true);
      (fan.getTerrainPenaltyMultiplier as any).mockReturnValue(2.0);
      const abilities = createDefaultVendorAbilities();

      seat.assignFan(fan);
      const penaltyOccupied = seat.getTraversalPenalty(abilities);
      expect(penaltyOccupied).toBeGreaterThan(gameBalance.vendorMovement.emptySeatPenalty);

      seat.removeFan();
      const penaltyEmpty = seat.getTraversalPenalty(abilities);
      expect(penaltyEmpty).toBe(gameBalance.vendorMovement.emptySeatPenalty);
    });

    it('should handle zero penalty multiplier', () => {
      const seat = new Seat(0, 100, 200);
      const fan = createMockFan();
      (fan.isDifficultTerrain as any).mockReturnValue(true);
      (fan.getTerrainPenaltyMultiplier as any).mockReturnValue(0);
      const abilities = createDefaultVendorAbilities();

      seat.assignFan(fan);

      const penalty = seat.getTraversalPenalty(abilities);

      expect(penalty).toBe(0);
    });

    it('should handle very small penalty multiplier', () => {
      const seat = new Seat(0, 100, 200);
      const fan = createMockFan();
      (fan.isDifficultTerrain as any).mockReturnValue(true);
      (fan.getTerrainPenaltyMultiplier as any).mockReturnValue(0.1);
      const abilities = createDefaultVendorAbilities();

      seat.assignFan(fan);

      const penalty = seat.getTraversalPenalty(abilities);

      expect(penalty).toBe(gameBalance.vendorMovement.rowBasePenalty * 0.1);
    });
  });

  describe('Immutability', () => {
    it('should have readonly seatIndex property', () => {
      const seat = new Seat(5, 100, 200);

      // TypeScript readonly prevents modification at compile time
      // Runtime access still returns original value
      expect(seat.seatIndex).toBe(5);
    });

    it('should expose x via position getter', () => {
      const seat = new Seat(0, 100, 200);

      expect(seat.getPosition().x).toBe(100);
    });

    it('should expose y via position getter', () => {
      const seat = new Seat(0, 100, 200);

      expect(seat.getPosition().y).toBe(200);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle typical seat lifecycle', () => {
      const seat = new Seat(3, 120, 240);
      const fan = createMockFan();
      const abilities = createDefaultVendorAbilities();

      // Start empty
      expect(seat.isEmpty()).toBe(true);
      expect(seat.getPosition()).toEqual({ x: 120, y: 240 });
      expect(seat.getTraversalPenalty(abilities)).toBe(gameBalance.vendorMovement.emptySeatPenalty);

      // Fan sits down
      seat.assignFan(fan);
      expect(seat.isEmpty()).toBe(false);
      expect(seat.getFan()).toBe(fan);

      // Fan becomes grumpy
      (fan.isDifficultTerrain as any).mockReturnValue(true);
      (fan.getTerrainPenaltyMultiplier as any).mockReturnValue(3.0); // High multiplier
      const grumpPenalty = seat.getTraversalPenalty(abilities);
      // rowBasePenalty (0.1) * 3.0 = 0.3 > occupiedSeatPenalty (0.2)
      expect(grumpPenalty).toBeGreaterThan(gameBalance.vendorMovement.occupiedSeatPenalty);

      // Fan leaves
      const removed = seat.removeFan();
      expect(removed).toBe(fan);
      expect(seat.isEmpty()).toBe(true);
      expect(seat.getTraversalPenalty(abilities)).toBe(gameBalance.vendorMovement.emptySeatPenalty);
    });

    it('should handle multiple fan swaps', () => {
      const seat = new Seat(0, 100, 200);
      const fans = [createMockFan(), createMockFan(), createMockFan()];

      for (let i = 0; i < fans.length; i++) {
        seat.assignFan(fans[i]);
        expect(seat.getFan()).toBe(fans[i]);
        expect(seat.isEmpty()).toBe(false);

        const removed = seat.removeFan();
        expect(removed).toBe(fans[i]);
        expect(seat.isEmpty()).toBe(true);
      }
    });
  });
});
