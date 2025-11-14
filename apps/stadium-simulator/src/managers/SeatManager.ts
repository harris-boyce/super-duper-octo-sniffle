import { StadiumSection } from '../sprites/StadiumSection';
import { SectionConfig, SeatAssignment } from '../types/GameTypes';
import { Fan } from '../sprites/Fan';

/**
 * Manages seat population and assignment for all stadium sections
 * Provides query methods for vendor targeting and pathfinding
 */
export class SeatManager {
  private sections: StadiumSection[] = [];
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Store references to all sections
   */
  initializeSections(sections: StadiumSection[]): void {
    this.sections = sections;
  }

  /**
   * Populate all seats in all sections with fans
   */
  populateAllSeats(fanSize: number = 26): void {
    this.sections.forEach(section => {
      section.getRows().forEach(row => {
        row.getSeats().forEach(seat => {
          if (seat.isEmpty()) {
            const pos = seat.getPosition();
            const fan = new Fan(this.scene, pos.x + section.x, pos.y + section.y, fanSize);
            seat.assignFan(fan);
          }
        });
      });
    });
  }

  /**
   * Populate seats from assignment data
   */
  populateFromData(assignments: SeatAssignment[], fanSize: number = 26): void {
    assignments.forEach(assign => {
      const section = this.sections.find(s => s["sectionId"] === assign.sectionId);
      if (!section) return;
      const row = section.getRows()[assign.row];
      if (!row) return;
      const seat = row.getSeats()[assign.seat];
      if (!seat) return;
      if (assign.occupied) {
        const pos = seat.getPosition();
        // Optionally use assign.fanType and assign.fanProperties for future fan customization
        const fan = new Fan(this.scene, pos.x + section.x, pos.y + section.y, fanSize);
        seat.assignFan(fan);
      } else {
        seat.removeFan();
      }
    });
  }

  /**
   * Get number of empty seats in a section
   */
  getEmptySeats(sectionId: string): number {
    const section = this.sections.find(s => s["sectionId"] === sectionId);
    if (!section) return 0;
    return section.getRows().reduce((sum, row) => sum + row.getSeats().filter(seat => seat.isEmpty()).length, 0);
  }

  /**
   * Get occupancy rate (0-1) for a section
   */
  getSectionOccupancy(sectionId: string): number {
    const section = this.sections.find(s => s["sectionId"] === sectionId);
    if (!section) return 0;
    const totalSeats = section.getRows().reduce((sum, row) => sum + row.getSeats().length, 0);
    const occupied = section.getRows().reduce((sum, row) => sum + row.getSeats().filter(seat => !seat.isEmpty()).length, 0);
    return totalSeats === 0 ? 0 : occupied / totalSeats;
  }

  /**
   * Get thirsty fans in a specific section above threshold
   * Used by drink vendors for targeting
   * 
   * @param sectionIdx Section index (0-based)
   * @param thirstThreshold Minimum thirst level to include
   * @returns Array of thirsty fans with their positions
   */
  public getThirstyFansInSection(
    sectionIdx: number,
    thirstThreshold: number
  ): Array<{ fan: Fan; row: number; col: number; seat: any }> {
    const section = this.sections[sectionIdx];
    if (!section) return [];

    const thirstyFans: Array<{ fan: Fan; row: number; col: number; seat: any }> = [];
    const rows = section.getRows();

    for (let rIdx = 0; rIdx < rows.length; rIdx++) {
      const row = rows[rIdx];
      const seats = row.getSeats();

      for (let cIdx = 0; cIdx < seats.length; cIdx++) {
        const seat = seats[cIdx];
        if (!seat.isEmpty()) {
          const fan = seat.getFan();
          if (fan && fan.getThirst() > thirstThreshold) {
            thirstyFans.push({ fan, row: rIdx, col: cIdx, seat });
          }
        }
      }
    }

    return thirstyFans;
  }

  /**
   * Get unhappy fan clusters in a section for ranged AoE targeting
   * Future implementation for t-shirt cannon vendors
   * 
   * @param sectionIdx Section index (0-based)
   * @param happinessThreshold Maximum happiness to be considered unhappy
   * @param excludeGrumps Whether to exclude difficult terrain fans
   * @returns Array of fan clusters with center fan and surrounding fans
   */
  public getUnhappyClustersInSection(
    sectionIdx: number,
    happinessThreshold: number,
    excludeGrumps: boolean = true
  ): Array<{ centerFan: Fan; surroundingFans: Fan[]; avgUnhappiness: number; centerRow: number; centerCol: number }> {
    const section = this.sections[sectionIdx];
    if (!section) return [];

    // TODO: Implement clustering algorithm for AoE targeting
    // For now, return empty array as this is for future ranged vendors
    return [];
  }

  /**
   * Get row crowd density (occupancy percentage)
   * Used for pathfinding cost calculations
   * 
   * @param sectionIdx Section index (0-based)
   * @param rowIdx Row index within section
   * @returns Occupancy rate (0-1)
   */
  public getRowCrowdDensity(sectionIdx: number, rowIdx: number): number {
    const section = this.sections[sectionIdx];
    if (!section) return 0;

    const rows = section.getRows();
    if (rowIdx >= rows.length) return 0;

    const row = rows[rowIdx];
    return row.getOccupancyRate();
  }

  /**
   * Get all sections
   * @returns Array of StadiumSection objects
   */
  public getSections(): StadiumSection[] {
    return this.sections;
  }
}
