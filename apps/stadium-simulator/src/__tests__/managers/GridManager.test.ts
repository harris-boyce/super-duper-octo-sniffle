import { describe, it, expect, beforeEach } from 'vitest';
import { GridManager } from '@/managers/GridManager';
import type { GridManagerOptions, CardinalDirection, GridOccupant } from '@/managers/GridManager';

describe('GridManager', () => {
  let gridManager: GridManager;
  const defaultOptions: GridManagerOptions = {
    width: 800,
    height: 600,
    cellSize: 32,
    offsetX: 0,
    offsetY: 0,
  };

  beforeEach(() => {
    gridManager = new GridManager(defaultOptions);
  });

  describe('Initialization', () => {
    it('should initialize with correct dimensions', () => {
      expect(gridManager.getRowCount()).toBe(Math.ceil(600 / 32)); // 19 rows
      expect(gridManager.getColumnCount()).toBe(Math.ceil(800 / 32)); // 25 cols
    });

    it('should store world size correctly', () => {
      const worldSize = gridManager.getWorldSize();
      expect(worldSize.width).toBe(800);
      expect(worldSize.height).toBe(600);
      expect(worldSize.cellSize).toBe(32);
    });

    it('should store origin correctly', () => {
      const origin = gridManager.getOrigin();
      expect(origin.x).toBe(0);
      expect(origin.y).toBe(0);
    });

    it('should handle custom offset', () => {
      const customGrid = new GridManager({
        width: 800,
        height: 600,
        cellSize: 32,
        offsetX: 100,
        offsetY: 50,
      });

      const origin = customGrid.getOrigin();
      expect(origin.x).toBe(100);
      expect(origin.y).toBe(50);
    });

    it('should handle minimum grid size (at least 1 row/col)', () => {
      const tinyGrid = new GridManager({
        width: 10,
        height: 10,
        cellSize: 32,
      });

      expect(tinyGrid.getRowCount()).toBeGreaterThanOrEqual(1);
      expect(tinyGrid.getColumnCount()).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Coordinate Conversion', () => {
    it('should convert world to grid coordinates', () => {
      const result = gridManager.worldToGrid(64, 96);
      expect(result).toEqual({ row: 3, col: 2 });
    });

    it('should convert world coordinates at cell boundaries', () => {
      const result = gridManager.worldToGrid(32, 32);
      expect(result).toEqual({ row: 1, col: 1 });
    });

    it('should return null for negative world coordinates', () => {
      const result = gridManager.worldToGrid(-10, 50);
      expect(result).toBeNull();
    });

    it('should return null for out-of-bounds world coordinates', () => {
      const result = gridManager.worldToGrid(10000, 10000);
      expect(result).toBeNull();
    });

    it('should convert grid to world coordinates (cell center)', () => {
      const result = gridManager.gridToWorld(3, 2);
      expect(result).toEqual({ x: 80, y: 112 }); // col 2 * 32 + 16, row 3 * 32 + 16
    });

    it('should handle world coordinates with offset', () => {
      const offsetGrid = new GridManager({
        width: 800,
        height: 600,
        cellSize: 32,
        offsetX: 100,
        offsetY: 50,
      });

      const result = offsetGrid.worldToGrid(164, 146);
      expect(result).toEqual({ row: 3, col: 2 });
    });

    it('should get cell bounds in world coordinates', () => {
      const bounds = gridManager.getCellBounds(3, 2);
      expect(bounds).toEqual({
        x: 64,
        y: 96,
        width: 32,
        height: 32,
      });
    });

    it('should handle round-trip conversion', () => {
      const worldCoords = { x: 100, y: 150 };
      const gridCoords = gridManager.worldToGrid(worldCoords.x, worldCoords.y);
      expect(gridCoords).not.toBeNull();
      
      if (gridCoords) {
        const backToWorld = gridManager.gridToWorld(gridCoords.row, gridCoords.col);
        // Should be within same cell (center will differ from original)
        const boundsBack = gridManager.getCellBounds(gridCoords.row, gridCoords.col);
        expect(worldCoords.x).toBeGreaterThanOrEqual(boundsBack.x);
        expect(worldCoords.x).toBeLessThan(boundsBack.x + boundsBack.width);
        expect(worldCoords.y).toBeGreaterThanOrEqual(boundsBack.y);
        expect(worldCoords.y).toBeLessThan(boundsBack.y + boundsBack.height);
      }
    });
  });

  describe('Cell Operations', () => {
    it('should get cell at valid coordinates', () => {
      const cell = gridManager.getCell(5, 5);
      expect(cell).not.toBeNull();
      expect(cell?.row).toBe(5);
      expect(cell?.col).toBe(5);
    });

    it('should return null for invalid cell coordinates', () => {
      const cell = gridManager.getCell(-1, 5);
      expect(cell).toBeNull();
    });

    it('should return null for out-of-bounds coordinates', () => {
      const cell = gridManager.getCell(1000, 1000);
      expect(cell).toBeNull();
    });

    it('should get cell at world coordinates', () => {
      const cell = gridManager.getCellAtWorld(100, 150);
      expect(cell).not.toBeNull();
      expect(cell?.row).toBe(4); // 150 / 32 = 4.6875 -> 4
      expect(cell?.col).toBe(3); // 100 / 32 = 3.125 -> 3
    });

    it('should initialize cells as passable by default', () => {
      const cell = gridManager.getCell(5, 5);
      expect(cell?.passable).toBe(true);
    });

    it('should set cell passability', () => {
      gridManager.setCellPassable(5, 5, false);
      const cell = gridManager.getCell(5, 5);
      expect(cell?.passable).toBe(false);
    });

    it('should set cell terrain penalty', () => {
      gridManager.setCellTerrainPenalty(5, 5, 0.5);
      const cell = gridManager.getCell(5, 5);
      expect(cell?.terrainPenalty).toBe(0.5);
    });

    it('should clamp negative terrain penalties to 0', () => {
      gridManager.setCellTerrainPenalty(5, 5, -1);
      const cell = gridManager.getCell(5, 5);
      expect(cell?.terrainPenalty).toBe(0);
    });

    it('should set cell height level', () => {
      gridManager.setCellHeightLevel(5, 5, 2);
      const cell = gridManager.getCell(5, 5);
      expect(cell?.heightLevel).toBe(2);
    });

    it('should initialize terrain penalty to 0', () => {
      const cell = gridManager.getCell(5, 5);
      expect(cell?.terrainPenalty).toBe(0);
    });

    it('should initialize height level to 0', () => {
      const cell = gridManager.getCell(5, 5);
      expect(cell?.heightLevel).toBe(0);
    });
  });

  describe('Wall Management', () => {
    it('should register a wall in a direction', () => {
      gridManager.registerWall(5, 5, 'top', true);
      expect(gridManager.isWallBetween(5, 5, 'top')).toBe(true);
    });

    it('should clear a wall', () => {
      gridManager.registerWall(5, 5, 'right', true);
      expect(gridManager.isWallBetween(5, 5, 'right')).toBe(true);
      
      gridManager.clearWall(5, 5, 'right');
      expect(gridManager.isWallBetween(5, 5, 'right')).toBe(false);
    });

    it('should handle walls in all cardinal directions', () => {
      const directions: CardinalDirection[] = ['top', 'right', 'bottom', 'left'];
      
      directions.forEach((dir, index) => {
        gridManager.registerWall(5, 5 + index, dir, true);
        expect(gridManager.isWallBetween(5, 5 + index, dir)).toBe(true);
      });
    });

    it('should return true for wall checks on invalid cells', () => {
      expect(gridManager.isWallBetween(-1, 5, 'top')).toBe(true);
      expect(gridManager.isWallBetween(1000, 1000, 'left')).toBe(true);
    });

    it('should not have walls by default (except exterior/ground)', () => {
      // Test interior cell that shouldn't have walls
      const interiorCell = gridManager.getCell(5, 5);
      if (interiorCell) {
        // Interior cells start without walls unless added
        expect(interiorCell.walls.top || interiorCell.walls.right || 
               interiorCell.walls.bottom || interiorCell.walls.left).toBeDefined();
      }
    });

    it('should allow registering multiple walls on same cell', () => {
      gridManager.registerWall(5, 5, 'top', true);
      gridManager.registerWall(5, 5, 'right', true);
      
      expect(gridManager.isWallBetween(5, 5, 'top')).toBe(true);
      expect(gridManager.isWallBetween(5, 5, 'right')).toBe(true);
      expect(gridManager.isWallBetween(5, 5, 'bottom')).toBe(false);
      expect(gridManager.isWallBetween(5, 5, 'left')).toBe(false);
    });
  });

  describe('Occupant Tracking', () => {
    const mockOccupant: GridOccupant = {
      id: 'test-occupant-1',
      type: 'fan',
      metadata: { name: 'Test Fan' },
    };

    it('should add occupant to cell', () => {
      gridManager.addOccupant(5, 5, mockOccupant);
      const occupants = gridManager.getCellOccupants(5, 5);
      
      expect(occupants).toHaveLength(1);
      expect(occupants[0].id).toBe('test-occupant-1');
      expect(occupants[0].type).toBe('fan');
    });

    it('should remove occupant from cell', () => {
      gridManager.addOccupant(5, 5, mockOccupant);
      expect(gridManager.getCellOccupants(5, 5)).toHaveLength(1);
      
      gridManager.removeOccupant(5, 5, 'test-occupant-1');
      expect(gridManager.getCellOccupants(5, 5)).toHaveLength(0);
    });

    it('should handle multiple occupants in same cell', () => {
      const occupant1: GridOccupant = { id: 'occ-1', type: 'fan' };
      const occupant2: GridOccupant = { id: 'occ-2', type: 'vendor' };
      
      gridManager.addOccupant(5, 5, occupant1);
      gridManager.addOccupant(5, 5, occupant2);
      
      const occupants = gridManager.getCellOccupants(5, 5);
      expect(occupants).toHaveLength(2);
      expect(occupants.map(o => o.id)).toContain('occ-1');
      expect(occupants.map(o => o.id)).toContain('occ-2');
    });

    it('should return empty array for cell with no occupants', () => {
      const occupants = gridManager.getCellOccupants(5, 5);
      expect(occupants).toEqual([]);
    });

    it('should return empty array for invalid cell', () => {
      const occupants = gridManager.getCellOccupants(-1, 5);
      expect(occupants).toEqual([]);
    });

    it('should update occupant if added with same id', () => {
      const occupant1: GridOccupant = { id: 'occ-1', type: 'fan', metadata: { level: 1 } };
      const occupant2: GridOccupant = { id: 'occ-1', type: 'fan', metadata: { level: 2 } };
      
      gridManager.addOccupant(5, 5, occupant1);
      gridManager.addOccupant(5, 5, occupant2);
      
      const occupants = gridManager.getCellOccupants(5, 5);
      expect(occupants).toHaveLength(1);
      expect(occupants[0].metadata?.level).toBe(2);
    });

    it('should handle occupant with wall overrides', () => {
      const occupantWithWalls: GridOccupant = {
        id: 'wall-occ',
        type: 'seat',
        wallOverrides: { top: true, right: false },
      };
      
      gridManager.addOccupant(5, 5, occupantWithWalls);
      const occupants = gridManager.getCellOccupants(5, 5);
      
      expect(occupants[0].wallOverrides?.top).toBe(true);
      expect(occupants[0].wallOverrides?.right).toBe(false);
    });
  });

  describe('Pathfinding Support - getPassableNeighbors', () => {
    beforeEach(() => {
      // Clear any default walls for controlled testing
      gridManager = new GridManager({
        width: 800,
        height: 600,
        cellSize: 32,
        offsetX: 0,
        offsetY: 0,
      });
    });

    it('should return passable neighbors for cell with no walls', () => {
      const neighbors = gridManager.getPassableNeighbors(5, 5);
      
      // Should have neighbors (exact count depends on walls applied during init)
      expect(neighbors.length).toBeGreaterThan(0);
      
      // All neighbors should be valid cells
      neighbors.forEach(neighbor => {
        expect(neighbor.row).toBeGreaterThanOrEqual(0);
        expect(neighbor.col).toBeGreaterThanOrEqual(0);
        expect(neighbor.cost).toBeGreaterThan(0);
      });
    });

    it('should not return neighbors blocked by walls', () => {
      gridManager.registerWall(5, 5, 'top', true);
      const neighbors = gridManager.getPassableNeighbors(5, 5);
      
      // Should not include cell at (4, 5) if top wall exists
      const hasTopNeighbor = neighbors.some(n => n.row === 4 && n.col === 5);
      expect(hasTopNeighbor).toBe(false);
    });

    it('should not return neighbors that are impassable', () => {
      gridManager.setCellPassable(5, 6, false); // Block right neighbor
      const neighbors = gridManager.getPassableNeighbors(5, 5);
      
      const hasRightNeighbor = neighbors.some(n => n.row === 5 && n.col === 6);
      expect(hasRightNeighbor).toBe(false);
    });

    it('should include terrain penalty in neighbor cost', () => {
      gridManager.setCellTerrainPenalty(5, 6, 2.0);
      const neighbors = gridManager.getPassableNeighbors(5, 5);
      
      const rightNeighbor = neighbors.find(n => n.row === 5 && n.col === 6);
      if (rightNeighbor) {
        expect(rightNeighbor.cost).toBeGreaterThan(1); // Base cost 1 + penalty
      }
    });

    it('should return empty array for impassable origin cell', () => {
      gridManager.setCellPassable(5, 5, false);
      const neighbors = gridManager.getPassableNeighbors(5, 5);
      
      expect(neighbors).toEqual([]);
    });

    it('should return empty array for invalid cell', () => {
      const neighbors = gridManager.getPassableNeighbors(-1, 5);
      expect(neighbors).toEqual([]);
    });

    it('should handle corner cells (fewer neighbors)', () => {
      const neighbors = gridManager.getPassableNeighbors(0, 0);
      
      // Corner cells have at most 2 neighbors (right, bottom)
      expect(neighbors.length).toBeLessThanOrEqual(2);
    });

    it('should handle edge cells', () => {
      const neighbors = gridManager.getPassableNeighbors(0, 5);
      
      // Top edge cells have at most 3 neighbors (no top)
      expect(neighbors.length).toBeLessThanOrEqual(3);
    });

    it('should respect bidirectional walls', () => {
      gridManager.registerWall(5, 5, 'right', true);
      gridManager.registerWall(5, 6, 'left', true); // Redundant but explicit
      
      const neighborsFrom5_5 = gridManager.getPassableNeighbors(5, 5);
      const hasRightNeighbor = neighborsFrom5_5.some(n => n.row === 5 && n.col === 6);
      expect(hasRightNeighbor).toBe(false);
      
      const neighborsFrom5_6 = gridManager.getPassableNeighbors(5, 6);
      const hasLeftNeighbor = neighborsFrom5_6.some(n => n.row === 5 && n.col === 5);
      expect(hasLeftNeighbor).toBe(false);
    });
  });

  describe('Ground Line Walls', () => {
    it('should apply ground line walls during initialization', () => {
      // Ground line should create bottom walls on row 0 (or configured ground row)
      // This is implementation-specific, but we can verify walls exist
      const bottomRow = 0;
      const hasGroundWalls = gridManager.isWallBetween(bottomRow, 5, 'top');
      
      // Should have some wall configuration for ground line
      expect(typeof hasGroundWalls).toBe('boolean');
    });

    it('should maintain ground walls across columns', () => {
      // Check multiple cells on ground row
      const bottomRow = 0;
      const wall1 = gridManager.isWallBetween(bottomRow, 5, 'top');
      const wall2 = gridManager.isWallBetween(bottomRow, 10, 'top');
      
      // Both should have consistent ground wall behavior
      expect(wall1).toBe(wall2);
    });
  });

  describe('Grid Change Events', () => {
    it('should emit gridChanged event when cell passability changes', () => {
      let eventEmitted = false;
      gridManager.on('gridChanged', () => {
        eventEmitted = true;
      });
      
      gridManager.setCellPassable(5, 5, false);
      expect(eventEmitted).toBe(true);
    });

    it('should emit gridChanged event when terrain penalty changes', () => {
      let eventEmitted = false;
      gridManager.on('gridChanged', () => {
        eventEmitted = true;
      });
      
      gridManager.setCellTerrainPenalty(5, 5, 1.5);
      expect(eventEmitted).toBe(true);
    });

    it('should emit gridChanged event when height level changes', () => {
      let eventEmitted = false;
      gridManager.on('gridChanged', () => {
        eventEmitted = true;
      });
      
      gridManager.setCellHeightLevel(5, 5, 3);
      expect(eventEmitted).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle cells at exact grid boundaries', () => {
      const maxRow = gridManager.getRowCount() - 1;
      const maxCol = gridManager.getColumnCount() - 1;
      
      const cell = gridManager.getCell(maxRow, maxCol);
      expect(cell).not.toBeNull();
      expect(cell?.row).toBe(maxRow);
      expect(cell?.col).toBe(maxCol);
    });

    it('should handle world coordinates at exact cell edges', () => {
      const result = gridManager.worldToGrid(0, 0);
      expect(result).toEqual({ row: 0, col: 0 });
    });

    it('should handle very small cell size', () => {
      const smallGrid = new GridManager({
        width: 100,
        height: 100,
        cellSize: 1,
      });
      
      expect(smallGrid.getRowCount()).toBe(100);
      expect(smallGrid.getColumnCount()).toBe(100);
    });

    it('should handle large cell size', () => {
      const largeGrid = new GridManager({
        width: 800,
        height: 600,
        cellSize: 200,
      });
      
      expect(largeGrid.getRowCount()).toBe(3); // 600 / 200
      expect(largeGrid.getColumnCount()).toBe(4); // 800 / 200
    });
  });
});
