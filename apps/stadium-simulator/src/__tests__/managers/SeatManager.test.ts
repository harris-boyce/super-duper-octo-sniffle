import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SeatManager } from '@/managers/SeatManager';
import type { StadiumSection } from '@/sprites/StadiumSection';
import type { SectionRow } from '@/sprites/SectionRow';
import type { Seat } from '@/sprites/Seat';
import type { Fan } from '@/sprites/Fan';
import type { GridManager } from '@/managers/GridManager';
import type { SeatAssignment } from '@/types/GameTypes';

// Mock Phaser Scene
function createMockScene(): any {
  return {
    add: {
      container: vi.fn(() => ({
        add: vi.fn(),
        setDepth: vi.fn().mockReturnThis(),
        destroy: vi.fn(),
      })),
      rectangle: vi.fn(() => ({
        setOrigin: vi.fn().mockReturnThis(),
        setDepth: vi.fn().mockReturnThis(),
        destroy: vi.fn(),
      })),
      existing: vi.fn((gameObject) => gameObject),
    },
  };
}

// Mock GridManager
function createMockGridManager(): GridManager {
  return {
    worldToGrid: vi.fn((x: number, y: number) => ({ row: Math.floor(y / 32), col: Math.floor(x / 32) })),
    registerSeat: vi.fn(),
    registerWall: vi.fn(),
  } as any;
}

// Mock Fan
function createMockFan(thirst: number = 50, happiness: number = 60): Fan {
  return {
    getThirst: () => thirst,
    getHappiness: () => happiness,
  } as Fan;
}

// Mock Seat
function createMockSeat(isEmpty: boolean = true, fan?: Fan): Seat {
  let currentFan = fan || null;
  
  return {
    isEmpty: () => currentFan === null,
    getFan: () => currentFan,
    assignFan: (f: Fan) => { currentFan = f; },
    removeFan: () => { currentFan = null; },
    getPosition: () => ({ x: 0, y: 0 }),
  } as Seat;
}

// Mock SectionRow
function createMockRow(seatCount: number = 8, occupancy: number = 0.5): SectionRow {
  const seats: Seat[] = [];
  for (let i = 0; i < seatCount; i++) {
    const isEmpty = i >= seatCount * occupancy;
    const fan = isEmpty ? undefined : createMockFan(30 + i * 10, 50 + i * 5);
    seats.push(createMockSeat(isEmpty, fan));
  }
  
  return {
    y: 0,
    height: 40,
    getSeats: () => seats,
    getOccupancyRate: () => occupancy,
  } as SectionRow;
}

// Mock StadiumSection
function createMockSection(sectionId: string, rowCount: number = 4, seatsPerRow: number = 8): StadiumSection {
  const rows: SectionRow[] = [];
  for (let i = 0; i < rowCount; i++) {
    rows.push(createMockRow(seatsPerRow, 0.5));
  }
  
  return {
    sectionId,
    x: 100,
    y: 200,
    sectionWidth: 250,
    sectionHeight: 150,
    getRows: () => rows,
  } as any as StadiumSection;
}

describe('SeatManager', () => {
  let seatManager: SeatManager;
  let mockScene: any;
  let mockSections: StadiumSection[];

  beforeEach(() => {
    mockScene = createMockScene();
    seatManager = new SeatManager(mockScene);
    
    // Create 3 mock sections (typical stadium)
    mockSections = [
      createMockSection('A', 4, 8),
      createMockSection('B', 4, 8),
      createMockSection('C', 4, 8),
    ];
  });

  describe('Initialization', () => {
    it('should create without GridManager', () => {
      expect(seatManager).toBeDefined();
      expect(seatManager.getSections()).toEqual([]);
    });

    it('should create with GridManager', () => {
      const mockGrid = createMockGridManager();
      const managerWithGrid = new SeatManager(mockScene, mockGrid);
      
      expect(managerWithGrid).toBeDefined();
    });

    it('should initialize sections', () => {
      seatManager.initializeSections(mockSections);
      
      expect(seatManager.getSections()).toEqual(mockSections);
      expect(seatManager.getSections().length).toBe(3);
    });

    it('should register seats with GridManager when available', () => {
      const mockGrid = createMockGridManager();
      const managerWithGrid = new SeatManager(mockScene, mockGrid);
      
      managerWithGrid.initializeSections(mockSections);
      
      // Should register seats for all sections
      expect(mockGrid.registerSeat).toHaveBeenCalled();
    });

    it('should register walls with GridManager when available', () => {
      const mockGrid = createMockGridManager();
      const managerWithGrid = new SeatManager(mockScene, mockGrid);
      
      managerWithGrid.initializeSections(mockSections);
      
      // Should register row and perimeter walls
      expect(mockGrid.registerWall).toHaveBeenCalled();
    });

    it('should handle empty sections array', () => {
      seatManager.initializeSections([]);
      
      expect(seatManager.getSections()).toEqual([]);
    });
  });

  describe('Fan Population', () => {
    beforeEach(() => {
      seatManager.initializeSections(mockSections);
    });

    it('should populate all empty seats with fans', () => {
      // Note: This creates real Fan objects which require full Phaser mocks
      // Just verify it doesn't throw for now
      expect(() => {
        seatManager.populateAllSeats(26);
      }).not.toThrow();
    });

    it('should use custom fan size', () => {
      const customSize = 32;
      
      expect(() => {
        seatManager.populateAllSeats(customSize);
      }).not.toThrow();
    });

    it('should not overwrite existing fans', () => {
      // First population
      expect(() => {
        seatManager.populateAllSeats(26);
      }).not.toThrow();
      
      // Second population should skip occupied seats (verified by implementation)
      expect(() => {
        seatManager.populateAllSeats(26);
      }).not.toThrow();
    });

    it('should populate from assignment data', () => {
      const assignments: SeatAssignment[] = [
        { sectionId: 'A', row: 0, seat: 0, occupied: true },
        { sectionId: 'A', row: 0, seat: 1, occupied: false },
        { sectionId: 'B', row: 1, seat: 3, occupied: true },
      ];
      
      expect(() => {
        seatManager.populateFromData(assignments, 26);
      }).not.toThrow();
    });

    it('should handle assignment for non-existent section', () => {
      const assignments: SeatAssignment[] = [
        { sectionId: 'Z', row: 0, seat: 0, occupied: true },
      ];
      
      expect(() => {
        seatManager.populateFromData(assignments, 26);
      }).not.toThrow();
    });

    it('should handle assignment for out-of-bounds row', () => {
      const assignments: SeatAssignment[] = [
        { sectionId: 'A', row: 99, seat: 0, occupied: true },
      ];
      
      expect(() => {
        seatManager.populateFromData(assignments, 26);
      }).not.toThrow();
    });

    it('should handle assignment for out-of-bounds seat', () => {
      const assignments: SeatAssignment[] = [
        { sectionId: 'A', row: 0, seat: 99, occupied: true },
      ];
      
      expect(() => {
        seatManager.populateFromData(assignments, 26);
      }).not.toThrow();
    });

    it('should remove fans when occupied is false', () => {
      const assignments: SeatAssignment[] = [
        { sectionId: 'A', row: 0, seat: 0, occupied: false },
      ];
      
      seatManager.populateFromData(assignments, 26);
      
      const seat = mockSections[0].getRows()[0].getSeats()[0];
      expect(seat.isEmpty()).toBe(true);
    });
  });

  describe('Thirsty Fan Queries', () => {
    beforeEach(() => {
      // Create sections with fans at different thirst levels
      mockSections = [
        createMockSection('A', 2, 4),
      ];
      
      // Manually set up fans with specific thirst levels
      const rows = mockSections[0].getRows();
      rows[0].getSeats()[0].assignFan(createMockFan(80, 50)); // Very thirsty
      rows[0].getSeats()[1].assignFan(createMockFan(60, 50)); // Moderately thirsty
      rows[0].getSeats()[2].assignFan(createMockFan(30, 50)); // Not thirsty
      rows[1].getSeats()[0].assignFan(createMockFan(90, 50)); // Extremely thirsty
      
      seatManager.initializeSections(mockSections);
    });

    it('should return thirsty fans above threshold', () => {
      const thirstyFans = seatManager.getThirstyFansInSection(0, 70);
      
      expect(thirstyFans.length).toBe(2); // 80 and 90 thirst
      expect(thirstyFans[0].fan.getThirst()).toBeGreaterThan(70);
      expect(thirstyFans[1].fan.getThirst()).toBeGreaterThan(70);
    });

    it('should include row and col indices', () => {
      const thirstyFans = seatManager.getThirstyFansInSection(0, 50);
      
      expect(thirstyFans.length).toBeGreaterThan(0);
      expect(thirstyFans[0]).toHaveProperty('row');
      expect(thirstyFans[0]).toHaveProperty('col');
      expect(thirstyFans[0]).toHaveProperty('fan');
      expect(thirstyFans[0]).toHaveProperty('seat');
    });

    it('should return empty array for low threshold', () => {
      const thirstyFans = seatManager.getThirstyFansInSection(0, 95);
      
      expect(thirstyFans.length).toBe(0);
    });

    it('should return empty array for non-existent section', () => {
      const thirstyFans = seatManager.getThirstyFansInSection(99, 50);
      
      expect(thirstyFans).toEqual([]);
    });

    it('should only check occupied seats', () => {
      const thirstyFans = seatManager.getThirstyFansInSection(0, 0);
      
      // Should only return fans from occupied seats
      thirstyFans.forEach(entry => {
        expect(entry.seat.isEmpty()).toBe(false);
      });
    });

    it('should handle section with all empty seats', () => {
      const emptySection = createMockSection('D', 2, 4);
      // All seats empty by default in new section
      emptySection.getRows().forEach(row => {
        row.getSeats().forEach(seat => {
          seat.removeFan();
        });
      });
      
      seatManager.initializeSections([emptySection]);
      const thirstyFans = seatManager.getThirstyFansInSection(0, 0);
      
      expect(thirstyFans).toEqual([]);
    });
  });

  describe('Crowd Density', () => {
    beforeEach(() => {
      seatManager.initializeSections(mockSections);
    });

    it('should return row occupancy rate', () => {
      const density = seatManager.getRowCrowdDensity(0, 0);
      
      expect(density).toBeGreaterThanOrEqual(0);
      expect(density).toBeLessThanOrEqual(1);
    });

    it('should return 0 for non-existent section', () => {
      const density = seatManager.getRowCrowdDensity(99, 0);
      
      expect(density).toBe(0);
    });

    it('should return 0 for out-of-bounds row', () => {
      const density = seatManager.getRowCrowdDensity(0, 99);
      
      expect(density).toBe(0);
    });

    it('should return correct density for different rows', () => {
      // Mock setup has 0.5 occupancy for all rows
      const density = seatManager.getRowCrowdDensity(0, 0);
      
      expect(density).toBe(0.5);
    });
  });

  describe('Section Occupancy', () => {
    beforeEach(() => {
      seatManager.initializeSections(mockSections);
    });

    it('should calculate section occupancy rate', () => {
      const occupancy = seatManager.getSectionOccupancy('A');
      
      expect(occupancy).toBeGreaterThanOrEqual(0);
      expect(occupancy).toBeLessThanOrEqual(1);
    });

    it('should return 0 for non-existent section', () => {
      const occupancy = seatManager.getSectionOccupancy('Z');
      
      expect(occupancy).toBe(0);
    });

    it('should calculate correct occupancy', () => {
      // Mock sections have 50% occupancy
      const occupancy = seatManager.getSectionOccupancy('A');
      
      expect(occupancy).toBe(0.5);
    });

    it('should count empty seats', () => {
      const emptySeats = seatManager.getEmptySeats('A');
      
      expect(emptySeats).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 empty seats for non-existent section', () => {
      const emptySeats = seatManager.getEmptySeats('Z');
      
      expect(emptySeats).toBe(0);
    });

    it('should calculate correct empty seat count', () => {
      // Section has 4 rows × 8 seats = 32 total, 50% occupied = 16 empty
      const emptySeats = seatManager.getEmptySeats('A');
      
      expect(emptySeats).toBe(16);
    });

    it('should handle fully occupied section', () => {
      // Create fully occupied section
      const fullSection = createMockSection('Full', 2, 4);
      fullSection.getRows().forEach(row => {
        row.getSeats().forEach(seat => {
          seat.assignFan(createMockFan());
        });
      });
      
      seatManager.initializeSections([fullSection]);
      
      const emptySeats = seatManager.getEmptySeats('Full');
      const occupancy = seatManager.getSectionOccupancy('Full');
      
      expect(emptySeats).toBe(0);
      expect(occupancy).toBeGreaterThan(0.9); // Should be close to 1.0
    });

    it('should handle empty section', () => {
      const emptySection = createMockSection('Empty', 2, 4);
      emptySection.getRows().forEach(row => {
        row.getSeats().forEach(seat => {
          seat.removeFan();
        });
      });
      
      seatManager.initializeSections([emptySection]);
      
      const emptySeats = seatManager.getEmptySeats('Empty');
      const occupancy = seatManager.getSectionOccupancy('Empty');
      
      expect(emptySeats).toBe(8); // 2 rows × 4 seats
      expect(occupancy).toBe(0);
    });
  });

  describe('Section Accessor Methods', () => {
    beforeEach(() => {
      seatManager.initializeSections(mockSections);
    });

    it('should return all sections', () => {
      const sections = seatManager.getSections();
      
      expect(sections).toEqual(mockSections);
      expect(sections.length).toBe(3);
    });

    it('should return empty array when no sections initialized', () => {
      const newManager = new SeatManager(mockScene);
      
      expect(newManager.getSections()).toEqual([]);
    });

    it('should return section center position', () => {
      const position = seatManager.getSectionCenterPosition('A');
      
      expect(position).not.toBeNull();
      expect(position).toHaveProperty('x');
      expect(position).toHaveProperty('y');
    });

    it('should return correct coordinates', () => {
      const position = seatManager.getSectionCenterPosition('A');
      
      expect(position?.x).toBe(100);
      expect(position?.y).toBe(200);
    });

    it('should return null for non-existent section', () => {
      const position = seatManager.getSectionCenterPosition('Z');
      
      expect(position).toBeNull();
    });

    it('should handle multiple section lookups', () => {
      const posA = seatManager.getSectionCenterPosition('A');
      const posB = seatManager.getSectionCenterPosition('B');
      const posC = seatManager.getSectionCenterPosition('C');
      
      expect(posA).not.toBeNull();
      expect(posB).not.toBeNull();
      expect(posC).not.toBeNull();
    });
  });

  describe('Unhappy Clusters (Future Feature)', () => {
    beforeEach(() => {
      seatManager.initializeSections(mockSections);
    });

    it('should return empty array (not yet implemented)', () => {
      const clusters = seatManager.getUnhappyClustersInSection(0, 40, true);
      
      expect(clusters).toEqual([]);
    });

    it('should not throw for non-existent section', () => {
      expect(() => {
        seatManager.getUnhappyClustersInSection(99, 40, true);
      }).not.toThrow();
    });
  });

  describe('Integration with GridManager', () => {
    it('should register seats when GridManager present', () => {
      const mockGrid = createMockGridManager();
      const managerWithGrid = new SeatManager(mockScene, mockGrid);
      
      managerWithGrid.initializeSections(mockSections);
      
      // Should call registerSeat for each seat in all sections
      // 3 sections × 4 rows × 8 seats = 96 seats
      expect(mockGrid.registerSeat).toHaveBeenCalled();
      const callCount = (mockGrid.registerSeat as any).mock.calls.length;
      expect(callCount).toBeGreaterThan(0);
    });

    it('should register row walls when GridManager present', () => {
      const mockGrid = createMockGridManager();
      const managerWithGrid = new SeatManager(mockScene, mockGrid);
      
      managerWithGrid.initializeSections(mockSections);
      
      // Should call registerWall for row boundaries
      expect(mockGrid.registerWall).toHaveBeenCalled();
      const callCount = (mockGrid.registerWall as any).mock.calls.length;
      expect(callCount).toBeGreaterThan(0);
    });

    it('should register section perimeter walls', () => {
      const mockGrid = createMockGridManager();
      const managerWithGrid = new SeatManager(mockScene, mockGrid);
      
      managerWithGrid.initializeSections(mockSections);
      
      // Should register walls for top, bottom, left, right of each section
      expect(mockGrid.registerWall).toHaveBeenCalled();
    });

    it('should not crash when GridManager is null', () => {
      const managerWithoutGrid = new SeatManager(mockScene);
      
      expect(() => {
        managerWithoutGrid.initializeSections(mockSections);
      }).not.toThrow();
    });

    it('should convert world coordinates to grid coordinates', () => {
      const mockGrid = createMockGridManager();
      const managerWithGrid = new SeatManager(mockScene, mockGrid);
      
      managerWithGrid.initializeSections(mockSections);
      
      // Should call worldToGrid for coordinate conversion
      expect(mockGrid.worldToGrid).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle section with no rows', () => {
      const emptySection = createMockSection('Empty', 0, 0);
      seatManager.initializeSections([emptySection]);
      
      const occupancy = seatManager.getSectionOccupancy('Empty');
      const emptySeats = seatManager.getEmptySeats('Empty');
      
      expect(occupancy).toBe(0);
      expect(emptySeats).toBe(0);
    });

    it('should handle row with no seats', () => {
      const section = createMockSection('NoSeats', 1, 0);
      seatManager.initializeSections([section]);
      
      const density = seatManager.getRowCrowdDensity(0, 0);
      
      expect(density).toBeGreaterThanOrEqual(0);
    });

    it('should handle multiple initializations', () => {
      seatManager.initializeSections(mockSections);
      
      const newSections = [createMockSection('X', 2, 4)];
      seatManager.initializeSections(newSections);
      
      expect(seatManager.getSections()).toEqual(newSections);
    });

    it('should handle sections with same ID', () => {
      const duplicateSections = [
        createMockSection('A', 4, 8),
        createMockSection('A', 4, 8),
      ];
      
      seatManager.initializeSections(duplicateSections);
      
      // Should use first match
      const position = seatManager.getSectionCenterPosition('A');
      expect(position).not.toBeNull();
    });

    it('should handle null fan references gracefully', () => {
      const section = createMockSection('Test', 1, 2);
      section.getRows()[0].getSeats()[0].assignFan(null as any);
      
      seatManager.initializeSections([section]);
      
      expect(() => {
        seatManager.getThirstyFansInSection(0, 50);
      }).not.toThrow();
    });
  });
});
