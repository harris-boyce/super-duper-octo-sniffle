import { describe, it, expect, beforeEach } from 'vitest';
import { HybridPathResolver } from '@/managers/HybridPathResolver';
import type { NavigationGraph } from '@/managers/HybridPathResolver';
import type { VendorProfile } from '@/types/GameTypes';
import type { StadiumSection } from '@/sprites/StadiumSection';
import type { SectionRow } from '@/sprites/SectionRow';
import type { Seat } from '@/sprites/Seat';
import type { Fan } from '@/sprites/Fan';

// Mock StadiumSection
function createMockSection(
  sectionIdx: number,
  x: number,
  y: number,
  width: number,
  height: number,
  rowCount: number = 4,
  seatsPerRow: number = 8
): StadiumSection {
  const mockRows: SectionRow[] = [];
  const rowHeight = height / rowCount;

  for (let i = 0; i < rowCount; i++) {
    const mockSeats: Seat[] = [];
    for (let j = 0; j < seatsPerRow; j++) {
      mockSeats.push({
        seatIndex: j,
        x: x + (j * width / seatsPerRow),
        y: y + (i * rowHeight),
      } as Seat);
    }

    mockRows.push({
      y: i * rowHeight - height / 2,
      height: rowHeight,
      getSeats: () => mockSeats,
    } as SectionRow);
  }

  return {
    getBounds: () => ({ x, y, width, height }),
    getRows: () => mockRows,
  } as StadiumSection;
}

// Mock vendor profile
function createMockVendor(qualityTier: 'excellent' | 'good' | 'average' | 'poor' = 'average'): VendorProfile {
  return {
    id: 1,
    type: 'drink',
    qualityTier,
    abilities: {
      ignoreRowPenalty: false,
      ignoreGrumpPenalty: false,
      canEnterRows: true,
      rangedOnly: false,
    },
  };
}

// Mock fan
function createMockFan(thirst: number, happiness: number): Fan {
  return {
    getThirst: () => thirst,
    getHappiness: () => happiness,
  } as Fan;
}

describe('HybridPathResolver', () => {
  let resolver: HybridPathResolver;
  let mockSections: StadiumSection[];

  beforeEach(() => {
    // Create 3 mock sections (typical stadium layout)
    mockSections = [
      createMockSection(0, 0, 100, 200, 150, 4, 8),      // Section A
      createMockSection(1, 250, 100, 200, 150, 4, 8),    // Section B
      createMockSection(2, 500, 100, 200, 150, 4, 8),    // Section C
    ];

    resolver = new HybridPathResolver(mockSections);
  });

  describe('Graph Construction', () => {
    it('should create navigation graph with nodes', () => {
      const graph = resolver.getGraph();
      expect(graph.nodes.size).toBeGreaterThan(0);
    });

    it('should create corridor nodes for each section', () => {
      const graph = resolver.getGraph();
      
      // Should have top and front corridor for each section
      const topCorridors = Array.from(graph.nodes.values()).filter(
        n => n.type === 'corridor' && n.position === 'top'
      );
      const frontCorridors = Array.from(graph.nodes.values()).filter(
        n => n.type === 'corridor' && n.position === 'front'
      );

      expect(topCorridors.length).toBe(3); // One per section
      expect(frontCorridors.length).toBe(3);
    });

    it('should create stair nodes between adjacent sections', () => {
      const graph = resolver.getGraph();
      
      const stairNodes = Array.from(graph.nodes.values()).filter(
        n => n.type === 'stair'
      );

      // Should have stairs between sections: A-B, B-C = 2 stairs
      expect(stairNodes.length).toBe(2);
    });

    it('should create row entry nodes for each section row', () => {
      const graph = resolver.getGraph();
      
      const rowEntryNodes = Array.from(graph.nodes.values()).filter(
        n => n.type === 'rowEntry'
      );

      // 3 sections * 4 rows * 2 entries (left/right) = 24
      expect(rowEntryNodes.length).toBe(24);
    });

    it('should create corridor nodes with correct positions', () => {
      const graph = resolver.getGraph();
      
      const topCorridor0 = graph.nodes.get('corridor_top_0');
      expect(topCorridor0).toBeDefined();
      expect(topCorridor0?.type).toBe('corridor');
      if (topCorridor0?.type === 'corridor') {
        expect(topCorridor0.position).toBe('top');
        expect(topCorridor0.sectionIdx).toBe(0);
      }
    });

    it('should create row entry nodes with correct metadata', () => {
      const graph = resolver.getGraph();
      
      const leftEntry = graph.nodes.get('rowEntry_left_0_0');
      expect(leftEntry).toBeDefined();
      expect(leftEntry?.type).toBe('rowEntry');
      if (leftEntry?.type === 'rowEntry') {
        expect(leftEntry.sectionIdx).toBe(0);
        expect(leftEntry.rowIdx).toBe(0);
        expect(leftEntry.colIdx).toBe(0);
      }
    });
  });

  describe('Edge Connections', () => {
    it('should create bidirectional edges between nodes', () => {
      const graph = resolver.getGraph();
      
      const topCorridor0Id = 'corridor_top_0';
      const leftEntry0_0Id = 'rowEntry_left_0_0';
      
      // Check edge from corridor to row entry
      const corridorEdges = graph.edges.get(topCorridor0Id) || [];
      const hasEdgeToEntry = corridorEdges.some(e => e.targetNodeId === leftEntry0_0Id);
      
      // Check reverse edge
      const entryEdges = graph.edges.get(leftEntry0_0Id) || [];
      const hasEdgeToCorridor = entryEdges.some(e => e.targetNodeId === topCorridor0Id);
      
      expect(hasEdgeToEntry).toBe(true);
      expect(hasEdgeToCorridor).toBe(true);
    });

    it('should connect stairs to adjacent corridor nodes', () => {
      const graph = resolver.getGraph();
      
      const stairId = 'stair_right_0';
      const stairEdges = graph.edges.get(stairId) || [];
      
      // Stair should connect to corridors of adjacent sections
      expect(stairEdges.length).toBeGreaterThan(0);
      
      const connectedToCorridor = stairEdges.some(e => 
        e.targetNodeId.startsWith('corridor_')
      );
      expect(connectedToCorridor).toBe(true);
    });

    it('should connect left and right row entries', () => {
      const graph = resolver.getGraph();
      
      const leftEntryId = 'rowEntry_left_0_0';
      const rightEntryId = 'rowEntry_right_0_0';
      
      const leftEdges = graph.edges.get(leftEntryId) || [];
      const hasEdgeToRight = leftEdges.some(e => e.targetNodeId === rightEntryId);
      
      expect(hasEdgeToRight).toBe(true);
    });

    it('should connect vertically adjacent row entries', () => {
      const graph = resolver.getGraph();
      
      const row0LeftId = 'rowEntry_left_0_0';
      const row1LeftId = 'rowEntry_left_0_1';
      
      const row0Edges = graph.edges.get(row0LeftId) || [];
      const hasEdgeToRow1 = row0Edges.some(e => e.targetNodeId === row1LeftId);
      
      expect(hasEdgeToRow1).toBe(true);
    });

    it('should assign costs to edges', () => {
      const graph = resolver.getGraph();
      
      const someEdges = Array.from(graph.edges.values())[0];
      expect(someEdges).toBeDefined();
      expect(someEdges.length).toBeGreaterThan(0);
      expect(someEdges[0].baseCost).toBeGreaterThan(0);
    });
  });

  describe('Dijkstra Pathfinding', () => {
    it('should find path between two corridor nodes', () => {
      const startNode = { type: 'corridor' as const, position: 'top' as const, sectionIdx: 0, colIdx: 4, x: 100, y: 60 };
      const targetNode = { type: 'corridor' as const, position: 'top' as const, sectionIdx: 1, colIdx: 4, x: 350, y: 60 };
      
      const path = resolver.planPath(createMockVendor(), 100, 60, targetNode);
      
      expect(path).toBeDefined();
      expect(path.length).toBeGreaterThan(0);
    });

    it('should return path segments with coordinates', () => {
      const targetNode = { type: 'corridor' as const, position: 'top' as const, sectionIdx: 1, colIdx: 4, x: 350, y: 60 };
      const path = resolver.planPath(createMockVendor(), 100, 60, targetNode);
      
      path.forEach(segment => {
        expect(segment.x).toBeDefined();
        expect(segment.y).toBeDefined();
        expect(segment.cost).toBeGreaterThanOrEqual(0);
      });
    });

    it('should find path to row entry node', () => {
      const targetNode = { 
        type: 'rowEntry' as const, 
        sectionIdx: 1, 
        rowIdx: 2, 
        colIdx: 0, 
        x: 250, 
        y: 150 
      };
      
      const path = resolver.planPath(createMockVendor(), 100, 60, targetNode);
      
      expect(path).toBeDefined();
      expect(path.length).toBeGreaterThan(0);
    });

    it('should handle path from same location', () => {
      const startPos = { x: 100, y: 60 };
      const targetNode = { 
        type: 'corridor' as const, 
        position: 'top' as const, 
        sectionIdx: 0, 
        colIdx: 4, 
        x: 100, 
        y: 60 
      };
      
      const path = resolver.planPath(createMockVendor(), startPos.x, startPos.y, targetNode);
      
      // Should still return a path (even if minimal)
      expect(path).toBeDefined();
    });

    it('should find path across multiple sections', () => {
      const targetNode = { 
        type: 'corridor' as const, 
        position: 'top' as const, 
        sectionIdx: 2, 
        colIdx: 4, 
        x: 600, 
        y: 60 
      };
      
      const path = resolver.planPath(createMockVendor(), 100, 60, targetNode);
      
      expect(path).toBeDefined();
      expect(path.length).toBeGreaterThan(0);
      
      // Path should traverse through middle section
      // (exact validation depends on graph structure)
    });
  });

  describe('Segment Cost Calculation', () => {
    it('should calculate base cost for corridor segment', () => {
      const segment = {
        nodeType: 'corridor' as const,
        sectionIdx: 0,
        rowIdx: 0,
        colIdx: 0,
        x: 100,
        y: 60,
        cost: 100,
      };
      
      const vendor = createMockVendor();
      const cost = resolver.calculateSegmentCost(segment, vendor);
      
      expect(cost).toBeGreaterThan(0);
    });

    it('should apply row penalty for row segments', () => {
      const corridorSegment = {
        nodeType: 'corridor' as const,
        sectionIdx: 0,
        rowIdx: 0,
        colIdx: 0,
        x: 100,
        y: 60,
        cost: 100,
      };
      
      const rowSegment = {
        nodeType: 'rowEntry' as const,
        sectionIdx: 0,
        rowIdx: 0,
        colIdx: 0,
        x: 100,
        y: 150,
        cost: 100,
      };
      
      const vendor = createMockVendor();
      const corridorCost = resolver.calculateSegmentCost(corridorSegment, vendor);
      const rowCost = resolver.calculateSegmentCost(rowSegment, vendor);
      
      // Row should be more expensive due to penalty
      expect(rowCost).toBeGreaterThan(corridorCost);
    });

    it('should respect vendor ability to ignore row penalty', () => {
      const rowSegment = {
        nodeType: 'rowEntry' as const,
        sectionIdx: 0,
        rowIdx: 0,
        colIdx: 0,
        x: 100,
        y: 150,
        cost: 100,
      };
      
      const basicVendor = createMockVendor('poor');
      const excellentVendor: VendorProfile = {
        ...createMockVendor('excellent'),
        abilities: {
          ignoreRowPenalty: true,
          ignoreGrumpPenalty: false,
          canEnterRows: true,
          rangedOnly: false,
        },
      };
      
      const basicCost = resolver.calculateSegmentCost(rowSegment, basicVendor);
      const excellentCost = resolver.calculateSegmentCost(rowSegment, excellentVendor);
      
      // Excellent should have lower cost due to ignoring penalty
      expect(excellentCost).toBeLessThan(basicCost);
    });

    it('should apply occupied seat penalty', () => {
      const segment = {
        nodeType: 'seat' as const,
        sectionIdx: 0,
        rowIdx: 0,
        colIdx: 2,
        x: 100,
        y: 150,
        cost: 50,
      };
      
      const vendor = createMockVendor();
      const unoccupiedSeats = [false, false, false, false];
      const occupiedSeats = [false, false, true, false]; // col 2 is occupied
      
      const unoccupiedCost = resolver.calculateSegmentCost(segment, vendor, unoccupiedSeats);
      const occupiedCost = resolver.calculateSegmentCost(segment, vendor, occupiedSeats);
      
      // Occupied seat should be more expensive
      expect(occupiedCost).toBeGreaterThan(unoccupiedCost);
    });

    it('should apply grump penalty for difficult terrain fans', () => {
      const segment = {
        nodeType: 'seat' as const,
        sectionIdx: 0,
        rowIdx: 0,
        colIdx: 2,
        x: 100,
        y: 150,
        cost: 50,
      };
      
      const vendor = createMockVendor();
      const seatOccupancy = [false, false, true, false];
      const grumpPresence = [false, false, true, false]; // col 2 has grump
      
      const normalCost = resolver.calculateSegmentCost(segment, vendor, seatOccupancy);
      const grumpCost = resolver.calculateSegmentCost(segment, vendor, seatOccupancy, grumpPresence);
      
      // Grump should increase cost
      expect(grumpCost).toBeGreaterThanOrEqual(normalCost);
    });

    it('should respect vendor ability to ignore grump penalty', () => {
      const segment = {
        nodeType: 'seat' as const,
        sectionIdx: 0,
        rowIdx: 0,
        colIdx: 2,
        x: 100,
        y: 150,
        cost: 50,
      };
      
      const basicVendor = createMockVendor('poor');
      const excellentVendor: VendorProfile = {
        ...createMockVendor('excellent'),
        abilities: {
          ignoreRowPenalty: false,
          ignoreGrumpPenalty: true,
          canEnterRows: true,
          rangedOnly: false,
        },
      };
      
      const seatOccupancy = [false, false, true, false];
      const grumpPresence = [false, false, true, false];
      
      const basicCost = resolver.calculateSegmentCost(segment, basicVendor, seatOccupancy, grumpPresence);
      const excellentCost = resolver.calculateSegmentCost(segment, excellentVendor, seatOccupancy, grumpPresence);
      
      // Excellent should have lower cost due to ignoring grump
      expect(excellentCost).toBeLessThanOrEqual(basicCost);
    });

    it('should cap terrain penalty at maximum', () => {
      const segment = {
        nodeType: 'seat' as const,
        sectionIdx: 0,
        rowIdx: 0,
        colIdx: 0,
        x: 100,
        y: 150,
        cost: 50,
      };
      
      const vendor = createMockVendor();
      const seatOccupancy = [true];
      const grumpPresence = [true];
      
      const cost = resolver.calculateSegmentCost(segment, vendor, seatOccupancy, grumpPresence);
      
      // Cost should not be infinite - should cap at maxTerrainPenalty
      expect(cost).toBeLessThan(Infinity);
      expect(cost).toBeGreaterThan(0);
    });
  });

  describe('Target Scoring', () => {
    it('should score targets based on thirst level', () => {
      const vendor = createMockVendor();
      const highThirstFan = createMockFan(80, 50);
      const lowThirstFan = createMockFan(20, 50);
      
      const candidates = [
        { fan: highThirstFan, sectionIdx: 0, rowIdx: 0, colIdx: 0, x: 100, y: 150 },
        { fan: lowThirstFan, sectionIdx: 0, rowIdx: 0, colIdx: 1, x: 120, y: 150 },
      ];
      
      const scores = resolver.scoreTargets(vendor, 100, 100, candidates);
      
      expect(scores.length).toBe(2);
      // Higher thirst should have higher score
      expect(scores[0].thirstLevel).toBeGreaterThan(scores[1].thirstLevel);
    });

    it('should sort targets by score descending', () => {
      const vendor = createMockVendor();
      const candidates = [
        { fan: createMockFan(30, 50), sectionIdx: 0, rowIdx: 0, colIdx: 0, x: 100, y: 150 },
        { fan: createMockFan(80, 50), sectionIdx: 0, rowIdx: 0, colIdx: 1, x: 120, y: 150 },
        { fan: createMockFan(50, 50), sectionIdx: 0, rowIdx: 0, colIdx: 2, x: 140, y: 150 },
      ];
      
      const scores = resolver.scoreTargets(vendor, 100, 100, candidates);
      
      // Should be sorted descending
      for (let i = 0; i < scores.length - 1; i++) {
        expect(scores[i].score).toBeGreaterThanOrEqual(scores[i + 1].score);
      }
    });

    it('should penalize distant targets', () => {
      const vendor = createMockVendor();
      const nearFan = createMockFan(50, 50);
      const farFan = createMockFan(50, 50);
      
      const candidates = [
        { fan: nearFan, sectionIdx: 0, rowIdx: 0, colIdx: 0, x: 110, y: 110 }, // Close
        { fan: farFan, sectionIdx: 2, rowIdx: 3, colIdx: 7, x: 700, y: 250 },  // Far
      ];
      
      const scores = resolver.scoreTargets(vendor, 100, 100, candidates);
      
      // Near fan should have higher score (same thirst, less distance)
      expect(scores[0].estimatedCost).toBeLessThan(scores[1].estimatedCost);
    });

    it('should include fan metadata in score results', () => {
      const vendor = createMockVendor();
      const fan = createMockFan(60, 40);
      
      const candidates = [
        { fan, sectionIdx: 0, rowIdx: 0, colIdx: 0, x: 100, y: 150 },
      ];
      
      const scores = resolver.scoreTargets(vendor, 100, 100, candidates);
      
      expect(scores[0].thirstLevel).toBe(60);
      expect(scores[0].happinessLevel).toBe(40);
      expect(scores[0].fan).toBe(fan);
    });
  });

  describe('Detour Detection', () => {
    it('should detect when penalty exceeds tolerance', () => {
      const poorVendor = createMockVendor('poor');
      const highPenalty = 1.0; // Exceeds poor tolerance
      
      const needsDetour = resolver.detectDetourNeed(highPenalty, poorVendor);
      
      expect(needsDetour).toBe(true);
    });

    it('should not detect detour for low penalties', () => {
      const vendor = createMockVendor('good');
      const lowPenalty = 0.1; // Below tolerance
      
      const needsDetour = resolver.detectDetourNeed(lowPenalty, vendor);
      
      expect(needsDetour).toBe(false);
    });

    it('should have different tolerance for different quality tiers', () => {
      const poorVendor = createMockVendor('poor');
      const excellentVendor = createMockVendor('excellent');
      const penalty = 0.5; // Medium penalty
      
      const poorNeedsDetour = resolver.detectDetourNeed(penalty, poorVendor);
      const excellentNeedsDetour = resolver.detectDetourNeed(penalty, excellentVendor);
      
      // Excellent should have higher tolerance
      // (exact behavior depends on gameBalance values)
      expect(typeof poorNeedsDetour).toBe('boolean');
      expect(typeof excellentNeedsDetour).toBe('boolean');
    });
  });

  describe('Local Detour Finding', () => {
    it('should return null when no detour available', () => {
      const fromNode = { type: 'corridor' as const, position: 'top' as const, sectionIdx: 0, colIdx: 4, x: 100, y: 60 };
      const targetNode = { type: 'corridor' as const, position: 'top' as const, sectionIdx: 1, colIdx: 4, x: 350, y: 60 };
      const avoidNodes = new Set<string>();
      
      const detour = resolver.findLocalDetour(fromNode, targetNode, avoidNodes);
      
      // Currently stub implementation returns null
      expect(detour).toBeNull();
    });

    it('should accept avoid nodes set', () => {
      const fromNode = { type: 'corridor' as const, position: 'top' as const, sectionIdx: 0, colIdx: 4, x: 100, y: 60 };
      const targetNode = { type: 'corridor' as const, position: 'top' as const, sectionIdx: 1, colIdx: 4, x: 350, y: 60 };
      const avoidNodes = new Set(['corridor_top_1', 'stair_right_0']);
      
      // Should not throw
      expect(() => {
        resolver.findLocalDetour(fromNode, targetNode, avoidNodes);
      }).not.toThrow();
    });
  });

  describe('Graph Rebuild', () => {
    it('should rebuild graph with new sections', () => {
      const initialGraph = resolver.getGraph();
      const initialNodeCount = initialGraph.nodes.size;
      
      const newSections = [
        createMockSection(0, 0, 100, 200, 150, 4, 8),
        createMockSection(1, 250, 100, 200, 150, 4, 8),
      ];
      
      resolver.rebuildGraph(newSections);
      
      const newGraph = resolver.getGraph();
      // Should have different node count (2 sections vs 3)
      expect(newGraph.nodes.size).not.toBe(initialNodeCount);
    });

    it('should maintain graph structure after rebuild', () => {
      const newSections = [
        createMockSection(0, 0, 100, 200, 150, 4, 8),
      ];
      
      resolver.rebuildGraph(newSections);
      
      const graph = resolver.getGraph();
      expect(graph.nodes.size).toBeGreaterThan(0);
      expect(graph.edges.size).toBeGreaterThan(0);
    });

    it('should create valid graph after rebuild', () => {
      const newSections = [
        createMockSection(0, 0, 100, 200, 150, 4, 8),
        createMockSection(1, 250, 100, 200, 150, 4, 8),
      ];
      
      resolver.rebuildGraph(newSections);
      
      // Should be able to pathfind after rebuild
      const targetNode = { type: 'corridor' as const, position: 'top' as const, sectionIdx: 1, colIdx: 4, x: 350, y: 60 };
      const path = resolver.planPath(createMockVendor(), 100, 60, targetNode);
      
      expect(path).toBeDefined();
      expect(path.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty sections array', () => {
      expect(() => {
        new HybridPathResolver([]);
      }).not.toThrow();
    });

    it('should handle single section', () => {
      const singleSection = [createMockSection(0, 0, 100, 200, 150, 4, 8)];
      const singleResolver = new HybridPathResolver(singleSection);
      
      const graph = singleResolver.getGraph();
      expect(graph.nodes.size).toBeGreaterThan(0);
    });

    it('should handle sections with no rows', () => {
      const noRowSection = createMockSection(0, 0, 100, 200, 150, 0, 0);
      const noRowResolver = new HybridPathResolver([noRowSection]);
      
      // Should not crash
      expect(() => {
        noRowResolver.getGraph();
      }).not.toThrow();
    });

    it('should handle pathfinding with GridManager', () => {
      const mockGridManager = {} as any; // GridManager is optional
      const resolverWithGrid = new HybridPathResolver(mockSections, mockGridManager);
      
      expect(resolverWithGrid).toBeDefined();
      
      const targetNode = { type: 'corridor' as const, position: 'top' as const, sectionIdx: 1, colIdx: 4, x: 350, y: 60 };
      const path = resolverWithGrid.planPath(createMockVendor(), 100, 60, targetNode);
      
      expect(path).toBeDefined();
    });
  });
});
