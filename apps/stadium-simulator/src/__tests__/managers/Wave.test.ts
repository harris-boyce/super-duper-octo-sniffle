import { describe, it, expect, beforeEach } from 'vitest';
import { Wave, WaveType, WaveOutcome, WaveSectionResult } from '@/managers/Wave';

describe('Wave', () => {
  describe('Constructor & Properties', () => {
    it('should create wave with all required properties', () => {
      const wave = new Wave('wave-1', 'NORMAL', 'A', ['A', 'B', 'C'], 1000);
      
      expect(wave.id).toBe('wave-1');
      expect(wave.type).toBe('NORMAL');
      expect(wave.originSection).toBe('A');
      expect(wave.path).toEqual(['A', 'B', 'C']);
      expect(wave.startTime).toBe(1000);
      expect(wave.endTime).toBeNull();
    });

    it('should determine right direction for left-to-right path', () => {
      const wave = new Wave('wave-1', 'NORMAL', 'A', ['A', 'B', 'C'], 1000);
      expect(wave.direction).toBe('right');
    });

    it('should determine left direction for right-to-left path', () => {
      const wave = new Wave('wave-1', 'NORMAL', 'C', ['C', 'B', 'A'], 1000);
      expect(wave.direction).toBe('left');
    });

    it('should default to right direction for single-section wave', () => {
      const wave = new Wave('wave-1', 'NORMAL', 'B', ['B'], 1000);
      expect(wave.direction).toBe('right');
    });

    it('should determine direction based on alphabetical comparison', () => {
      // B→C is right (B < C)
      const wave1 = new Wave('wave-1', 'NORMAL', 'B', ['B', 'C'], 1000);
      expect(wave1.direction).toBe('right');
      
      // B→A is left (B > A)
      const wave2 = new Wave('wave-2', 'NORMAL', 'B', ['B', 'A'], 1000);
      expect(wave2.direction).toBe('left');
    });

    it('should store wave type correctly', () => {
      const normalWave = new Wave('wave-1', 'NORMAL', 'A', ['A', 'B'], 1000);
      const superWave = new Wave('wave-2', 'SUPER', 'A', ['A', 'B'], 2000);
      const doubleWave = new Wave('wave-3', 'DOUBLE_DOWN', 'A', ['A', 'B'], 3000);
      
      expect(normalWave.type).toBe('NORMAL');
      expect(superWave.type).toBe('SUPER');
      expect(doubleWave.type).toBe('DOUBLE_DOWN');
    });

    it('should return correct wave length', () => {
      const wave1 = new Wave('wave-1', 'NORMAL', 'A', ['A', 'B', 'C'], 1000);
      const wave2 = new Wave('wave-2', 'NORMAL', 'B', ['B'], 1000);
      
      expect(wave1.length).toBe(3);
      expect(wave2.length).toBe(1);
    });
  });

  describe('Path Calculation (Static Method)', () => {
    const sections = ['A', 'B', 'C'];

    it('should calculate right path from leftmost section', () => {
      const path = Wave.calculatePath(sections, 'A');
      expect(path).toEqual(['A', 'B', 'C']);
    });

    it('should calculate left path from rightmost section', () => {
      const path = Wave.calculatePath(sections, 'C');
      expect(path).toEqual(['C', 'B', 'A']);
    });

    it('should calculate path from middle section', () => {
      const path = Wave.calculatePath(sections, 'B');
      // Right path ['B', 'C'] has length 2
      // Left path ['B', 'A'] has length 2
      // Tie favors right
      expect(path).toEqual(['B', 'C']);
    });

    it('should favor right direction on tie (equal length paths)', () => {
      const evenSections = ['A', 'B', 'C', 'D'];
      const pathFromB = Wave.calculatePath(evenSections, 'B');
      const pathFromC = Wave.calculatePath(evenSections, 'C');
      
      // From B: left=['B','A'] (2), right=['B','C','D'] (3) → right wins
      expect(pathFromB).toEqual(['B', 'C', 'D']);
      
      // From C: left=['C','B','A'] (3), right=['C','D'] (2) → left wins
      expect(pathFromC).toEqual(['C', 'B', 'A']);
    });

    it('should handle single section array', () => {
      const path = Wave.calculatePath(['A'], 'A');
      expect(path).toEqual(['A']);
    });

    it('should throw error for non-existent origin section', () => {
      expect(() => {
        Wave.calculatePath(sections, 'Z');
      }).toThrow('Origin section "Z" not found in sections array');
    });

    it('should calculate longest path when origin is off-center', () => {
      const fiveSections = ['A', 'B', 'C', 'D', 'E'];
      
      // From B: left=['B','A'] (2), right=['B','C','D','E'] (4) → right
      const pathB = Wave.calculatePath(fiveSections, 'B');
      expect(pathB).toEqual(['B', 'C', 'D', 'E']);
      
      // From D: left=['D','C','B','A'] (4), right=['D','E'] (2) → left
      const pathD = Wave.calculatePath(fiveSections, 'D');
      expect(pathD).toEqual(['D', 'C', 'B', 'A']);
    });

    it('should handle two-section array from either end', () => {
      const twoSections = ['A', 'B'];
      
      const pathA = Wave.calculatePath(twoSections, 'A');
      expect(pathA).toEqual(['A', 'B']);
      
      const pathB = Wave.calculatePath(twoSections, 'B');
      expect(pathB).toEqual(['B', 'A']);
    });
  });

  describe('Section Results Management', () => {
    let wave: Wave;

    beforeEach(() => {
      wave = new Wave('wave-1', 'NORMAL', 'A', ['A', 'B', 'C'], 1000);
    });

    it('should add section results', () => {
      const result: WaveSectionResult = {
        sectionId: 'A',
        outcome: 'success',
        participationRate: 0.85,
        columnResults: [
          { columnIndex: 0, participation: 0.9, state: 'success' },
          { columnIndex: 1, participation: 0.8, state: 'success' },
        ],
      };

      wave.addSectionResult(result);
      expect(wave.getResults()).toHaveLength(1);
      expect(wave.getResults()[0]).toEqual(result);
    });

    it('should accumulate multiple section results', () => {
      const resultA: WaveSectionResult = {
        sectionId: 'A',
        outcome: 'success',
        participationRate: 0.85,
        columnResults: [],
      };
      const resultB: WaveSectionResult = {
        sectionId: 'B',
        outcome: 'sputter',
        participationRate: 0.6,
        columnResults: [],
      };
      const resultC: WaveSectionResult = {
        sectionId: 'C',
        outcome: 'death',
        participationRate: 0.3,
        columnResults: [],
      };

      wave.addSectionResult(resultA);
      wave.addSectionResult(resultB);
      wave.addSectionResult(resultC);

      const results = wave.getResults();
      expect(results).toHaveLength(3);
      expect(results[0].sectionId).toBe('A');
      expect(results[1].sectionId).toBe('B');
      expect(results[2].sectionId).toBe('C');
    });

    it('should return empty array when no results added', () => {
      expect(wave.getResults()).toEqual([]);
    });

    it('should return immutable copy of results', () => {
      const result: WaveSectionResult = {
        sectionId: 'A',
        outcome: 'success',
        participationRate: 0.85,
        columnResults: [],
      };

      wave.addSectionResult(result);
      const results1 = wave.getResults();
      const results2 = wave.getResults();

      // Should be equal but not same reference
      expect(results1).toEqual(results2);
      expect(results1).not.toBe(results2);
    });
  });

  describe('Wave Completion & Outcomes', () => {
    let wave: Wave;

    beforeEach(() => {
      wave = new Wave('wave-1', 'NORMAL', 'A', ['A', 'B', 'C'], 1000);
    });

    it('should mark wave as completed with endTime', () => {
      expect(wave.endTime).toBeNull();
      
      wave.complete(5000);
      
      expect(wave.endTime).toBe(5000);
    });

    it('should return false for isSuccess before completion', () => {
      wave.addSectionResult({ sectionId: 'A', outcome: 'success', participationRate: 0.9, columnResults: [] });
      expect(wave.isSuccess).toBe(false);
    });

    it('should return false for isFailed before completion', () => {
      wave.addSectionResult({ sectionId: 'A', outcome: 'death', participationRate: 0.2, columnResults: [] });
      expect(wave.isFailed).toBe(false);
    });

    it('should return true for isSuccess when all sections succeed', () => {
      wave.addSectionResult({ sectionId: 'A', outcome: 'success', participationRate: 0.9, columnResults: [] });
      wave.addSectionResult({ sectionId: 'B', outcome: 'success', participationRate: 0.85, columnResults: [] });
      wave.addSectionResult({ sectionId: 'C', outcome: 'success', participationRate: 0.88, columnResults: [] });
      wave.complete(5000);

      expect(wave.isSuccess).toBe(true);
      expect(wave.isFailed).toBe(false);
    });

    it('should return true for isSuccess when sections have success or sputter', () => {
      wave.addSectionResult({ sectionId: 'A', outcome: 'success', participationRate: 0.9, columnResults: [] });
      wave.addSectionResult({ sectionId: 'B', outcome: 'sputter', participationRate: 0.6, columnResults: [] });
      wave.addSectionResult({ sectionId: 'C', outcome: 'success', participationRate: 0.88, columnResults: [] });
      wave.complete(5000);

      expect(wave.isSuccess).toBe(true);
      expect(wave.isFailed).toBe(false);
    });

    it('should return true for isFailed when any section dies', () => {
      wave.addSectionResult({ sectionId: 'A', outcome: 'success', participationRate: 0.9, columnResults: [] });
      wave.addSectionResult({ sectionId: 'B', outcome: 'death', participationRate: 0.3, columnResults: [] });
      wave.addSectionResult({ sectionId: 'C', outcome: 'success', participationRate: 0.88, columnResults: [] });
      wave.complete(5000);

      expect(wave.isSuccess).toBe(false);
      expect(wave.isFailed).toBe(true);
    });

    it('should handle wave with only sputter outcomes', () => {
      wave.addSectionResult({ sectionId: 'A', outcome: 'sputter', participationRate: 0.6, columnResults: [] });
      wave.addSectionResult({ sectionId: 'B', outcome: 'sputter', participationRate: 0.55, columnResults: [] });
      wave.complete(5000);

      expect(wave.isSuccess).toBe(true);
      expect(wave.isFailed).toBe(false);
    });

    it('should handle empty results as success (no failures)', () => {
      wave.complete(5000);
      
      expect(wave.isSuccess).toBe(true);
      expect(wave.isFailed).toBe(false);
    });
  });

  describe('Score Calculation', () => {
    let wave: Wave;

    beforeEach(() => {
      wave = new Wave('wave-1', 'NORMAL', 'A', ['A', 'B', 'C'], 1000);
    });

    it('should calculate score for successful sections', () => {
      wave.addSectionResult({ sectionId: 'A', outcome: 'success', participationRate: 0.9, columnResults: [] });
      wave.addSectionResult({ sectionId: 'B', outcome: 'success', participationRate: 0.85, columnResults: [] });
      wave.addSectionResult({ sectionId: 'C', outcome: 'success', participationRate: 0.88, columnResults: [] });

      expect(wave.calculateScore()).toBe(300); // 3 sections × 100 points
    });

    it('should count sputter as success for scoring', () => {
      wave.addSectionResult({ sectionId: 'A', outcome: 'success', participationRate: 0.9, columnResults: [] });
      wave.addSectionResult({ sectionId: 'B', outcome: 'sputter', participationRate: 0.6, columnResults: [] });
      wave.addSectionResult({ sectionId: 'C', outcome: 'success', participationRate: 0.88, columnResults: [] });

      expect(wave.calculateScore()).toBe(300); // Sputter counts as success
    });

    it('should not award points for death outcome', () => {
      wave.addSectionResult({ sectionId: 'A', outcome: 'success', participationRate: 0.9, columnResults: [] });
      wave.addSectionResult({ sectionId: 'B', outcome: 'death', participationRate: 0.3, columnResults: [] });
      wave.addSectionResult({ sectionId: 'C', outcome: 'success', participationRate: 0.88, columnResults: [] });

      expect(wave.calculateScore()).toBe(200); // Only 2 successful sections
    });

    it('should use custom basePointsPerSection', () => {
      wave.addSectionResult({ sectionId: 'A', outcome: 'success', participationRate: 0.9, columnResults: [] });
      wave.addSectionResult({ sectionId: 'B', outcome: 'success', participationRate: 0.85, columnResults: [] });

      expect(wave.calculateScore(50)).toBe(100); // 2 sections × 50 points
      expect(wave.calculateScore(200)).toBe(400); // 2 sections × 200 points
    });

    it('should return 0 when no results added', () => {
      expect(wave.calculateScore()).toBe(0);
    });

    it('should return 0 when all sections die', () => {
      wave.addSectionResult({ sectionId: 'A', outcome: 'death', participationRate: 0.2, columnResults: [] });
      wave.addSectionResult({ sectionId: 'B', outcome: 'death', participationRate: 0.3, columnResults: [] });

      expect(wave.calculateScore()).toBe(0);
    });

    it('should calculate max possible score based on path length', () => {
      expect(wave.getMaxPossibleScore()).toBe(300); // 3 sections × 100 points
      expect(wave.getMaxPossibleScore(50)).toBe(150); // 3 sections × 50 points
      expect(wave.getMaxPossibleScore(200)).toBe(600); // 3 sections × 200 points
    });

    it('should calculate max possible score for single section wave', () => {
      const singleWave = new Wave('wave-1', 'NORMAL', 'A', ['A'], 1000);
      expect(singleWave.getMaxPossibleScore()).toBe(100);
    });
  });

  describe('Position Weight Calculation (Static Method)', () => {
    it('should return higher weight for edge sections in 3-section array', () => {
      const weight0 = Wave.getSectionPositionWeight(0, 3);
      const weight1 = Wave.getSectionPositionWeight(1, 3);
      const weight2 = Wave.getSectionPositionWeight(2, 3);

      // Edges (0, 2) should have higher weight than center (1)
      expect(weight0).toBeGreaterThan(weight1);
      expect(weight2).toBeGreaterThan(weight1);
      expect(weight0).toBe(weight2); // Symmetric
    });

    it('should calculate weights based on distance from center', () => {
      const weight0 = Wave.getSectionPositionWeight(0, 5); // Edge
      const weight1 = Wave.getSectionPositionWeight(1, 5); // Near edge
      const weight2 = Wave.getSectionPositionWeight(2, 5); // Center
      const weight3 = Wave.getSectionPositionWeight(3, 5); // Near edge
      const weight4 = Wave.getSectionPositionWeight(4, 5); // Edge

      // Edges should have highest weight
      expect(weight0).toBeGreaterThan(weight2);
      expect(weight4).toBeGreaterThan(weight2);
      
      // Near-edges should be between center and edges
      expect(weight1).toBeGreaterThan(weight2);
      expect(weight1).toBeLessThan(weight0);
      
      // Symmetric weights
      expect(weight0).toBe(weight4);
      expect(weight1).toBe(weight3);
    });

    it('should use custom weights when provided', () => {
      const customWeights = {
        3: [2.0, 0.5, 1.5], // A gets 2.0, B gets 0.5, C gets 1.5
      };

      expect(Wave.getSectionPositionWeight(0, 3, customWeights)).toBe(2.0);
      expect(Wave.getSectionPositionWeight(1, 3, customWeights)).toBe(0.5);
      expect(Wave.getSectionPositionWeight(2, 3, customWeights)).toBe(1.5);
    });

    it('should fall back to default calculation when custom weights not found', () => {
      const customWeights = {
        3: [2.0, 0.5, 1.5],
        // No entry for 5 sections
      };

      const weight = Wave.getSectionPositionWeight(0, 5, customWeights);
      
      // Should use default calculation (not custom)
      expect(weight).toBeGreaterThan(0);
      expect(weight).not.toBe(2.0);
    });

    it('should handle single section (division by zero edge case)', () => {
      const weight = Wave.getSectionPositionWeight(0, 1);
      
      // maxDistance = 0, causes division by zero (NaN)
      expect(weight).toBeNaN();
    });

    it('should handle two-section array', () => {
      const weight0 = Wave.getSectionPositionWeight(0, 2);
      const weight1 = Wave.getSectionPositionWeight(1, 2);

      // Center at index 1: section 0 is distance 1, section 1 is distance 0
      // maxDistance = 1, so: index 0 = 0.5 + (1/1) = 1.5, index 1 = 0.5 + (0/1) = 0.5
      expect(weight0).toBe(1.5);
      expect(weight1).toBe(0.5);
    });

    it('should return default 1.0 when custom weight array missing index', () => {
      const customWeights = {
        3: [2.0, 0.5], // Missing index 2
      };

      const weight = Wave.getSectionPositionWeight(2, 3, customWeights);
      expect(weight).toBe(1.0); // Fallback default
    });
  });

  describe('JSON Export', () => {
    it('should export all wave properties to JSON', () => {
      const wave = new Wave('wave-1', 'SUPER', 'B', ['B', 'C'], 1000);
      wave.addSectionResult({ sectionId: 'B', outcome: 'success', participationRate: 0.9, columnResults: [] });
      wave.addSectionResult({ sectionId: 'C', outcome: 'success', participationRate: 0.85, columnResults: [] });
      wave.complete(3000);

      const json = wave.toJSON();

      expect(json.id).toBe('wave-1');
      expect(json.type).toBe('SUPER');
      expect(json.originSection).toBe('B');
      expect(json.path).toEqual(['B', 'C']);
      expect(json.direction).toBe('right');
      expect(json.startTime).toBe(1000);
      expect(json.endTime).toBe(3000);
      expect(json.completed).toBe(true);
      expect(json.isSuccess).toBe(true);
      expect(json.isFailed).toBe(false);
      expect(json.sectionResults).toHaveLength(2);
      expect(json.score).toBe(200);
      expect(json.maxPossible).toBe(200);
    });

    it('should include calculated fields before completion', () => {
      const wave = new Wave('wave-1', 'NORMAL', 'A', ['A', 'B', 'C'], 1000);
      wave.addSectionResult({ sectionId: 'A', outcome: 'success', participationRate: 0.9, columnResults: [] });

      const json = wave.toJSON();

      expect(json.completed).toBe(false);
      expect(json.isSuccess).toBe(false); // Not completed yet
      expect(json.isFailed).toBe(false); // Not completed yet
      expect(json.endTime).toBeNull();
    });

    it('should reflect failed wave in JSON', () => {
      const wave = new Wave('wave-1', 'NORMAL', 'A', ['A', 'B'], 1000);
      wave.addSectionResult({ sectionId: 'A', outcome: 'success', participationRate: 0.9, columnResults: [] });
      wave.addSectionResult({ sectionId: 'B', outcome: 'death', participationRate: 0.2, columnResults: [] });
      wave.complete(2500);

      const json = wave.toJSON();

      expect(json.isSuccess).toBe(false);
      expect(json.isFailed).toBe(true);
      expect(json.score).toBe(100); // Only first section
      expect(json.maxPossible).toBe(200);
    });

    it('should include section results with column details', () => {
      const wave = new Wave('wave-1', 'NORMAL', 'A', ['A'], 1000);
      const result: WaveSectionResult = {
        sectionId: 'A',
        outcome: 'success',
        participationRate: 0.85,
        columnResults: [
          { columnIndex: 0, participation: 0.9, state: 'success' },
          { columnIndex: 1, participation: 0.8, state: 'success' },
        ],
      };
      wave.addSectionResult(result);

      const json = wave.toJSON();

      expect(json.sectionResults).toHaveLength(1);
      expect(json.sectionResults[0].columnResults).toHaveLength(2);
      expect(json.sectionResults[0].columnResults[0].columnIndex).toBe(0);
      expect(json.sectionResults[0].columnResults[1].participation).toBe(0.8);
    });

    it('should export empty wave without results', () => {
      const wave = new Wave('wave-1', 'NORMAL', 'B', ['B'], 5000);

      const json = wave.toJSON();

      expect(json.id).toBe('wave-1');
      expect(json.sectionResults).toEqual([]);
      expect(json.score).toBe(0);
      expect(json.maxPossible).toBe(100);
      expect(json.completed).toBe(false);
    });
  });
});
