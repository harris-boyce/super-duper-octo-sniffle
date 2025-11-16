import { Fan } from './Fan';
import { UtilityActor } from '@/actors/Actor';
import type { VendorAbilities } from '@/types/GameTypes';
import { gameBalance } from '@/config/gameBalance';

/**
 * Represents a seat in a stadium section row
 */
export class Seat extends UtilityActor {
  public readonly seatIndex: number;
  private fan: Fan | null;
  private static _counter = 0;

  constructor(seatIndex: number, x: number, y: number, id?: string) {
    super(id ?? `seat-${Seat._counter++}`, 'seat', 'seat', x, y, false);
    this.seatIndex = seatIndex;
    this.fan = null;
  }


  /** Assign a fan to this seat */
  assignFan(fan: Fan): void {
    this.fan = fan;
  }

  /** Remove the fan from this seat */
  removeFan(): Fan | null {
    const removed = this.fan;
    this.fan = null;
    return removed;
  }

  /** Is this seat empty? */
  isEmpty(): boolean {
    return this.fan === null;
  }

  /** Get the fan assigned to this seat */
  getFan(): Fan | null {
    return this.fan;
  }

  /** Get the position of this seat */
  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  // UtilityActor required methods (no-op for Seat)
  public update(delta: number): void {}
  public draw(): void {}

  /**
   * Calculate traversal penalty for vendor pathfinding
   * Returns movement penalty multiplier (0 = no penalty, higher = more penalty)
   * 
   * @param vendorAbilities Vendor abilities to check for penalty overrides
   * @returns Penalty value (0-1 scale, where 1 = maxTerrainPenalty)
   */
  public getTraversalPenalty(vendorAbilities: VendorAbilities): number {
    // Empty seats have no penalty
    if (this.isEmpty()) {
      return gameBalance.vendorMovement.emptySeatPenalty;
    }

    // Occupied seat base penalty
    let penalty = gameBalance.vendorMovement.occupiedSeatPenalty;

    // Check if fan is difficult terrain (grump)
    if (this.fan && this.fan.isDifficultTerrain()) {
      if (!vendorAbilities.ignoreGrumpPenalty) {
        const grumpPenalty = gameBalance.vendorMovement.rowBasePenalty 
          * this.fan.getTerrainPenaltyMultiplier();
        penalty = Math.min(grumpPenalty, gameBalance.vendorMovement.maxTerrainPenalty);
      }
    }

    return penalty;
  }
}
