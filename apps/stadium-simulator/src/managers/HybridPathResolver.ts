import type { VendorProfile, PathSegment, PathNodeType } from '@/types/GameTypes';
import type { StadiumSection } from '@/sprites/StadiumSection';
import type { Fan } from '@/sprites/Fan';
import { gameBalance } from '@/config/gameBalance';

/**
 * Navigation node types for hybrid pathfinding
 */

/** Corridor node (top or front of section) */
export interface CorridorNode {
  type: 'corridor';
  position: 'top' | 'front';
  sectionIdx: number;
  colIdx: number;
  x: number;
  y: number;
}

/** Stair node (left or right edge between sections) */
export interface StairNode {
  type: 'stair';
  side: 'left' | 'right';
  sectionIdx: number; // section it connects to
  y: number; // vertical position along stair
  x: number;
}

/** Row entry node (access point to a section row) */
export interface RowEntryNode {
  type: 'rowEntry';
  sectionIdx: number;
  rowIdx: number;
  colIdx: number;
  x: number;
  y: number;
}

/** Seat anchor node (specific fan location) */
export interface SeatNode {
  type: 'seat';
  sectionIdx: number;
  rowIdx: number;
  colIdx: number;
  x: number;
  y: number;
  fan?: Fan;
}

/** Union type for all navigation nodes */
export type NavigationNode = CorridorNode | StairNode | RowEntryNode | SeatNode;

/**
 * Navigation graph structure
 * Maps node IDs to their neighbors with edge costs
 */
export interface NavigationGraph {
  nodes: Map<string, NavigationNode>;
  edges: Map<string, Array<{ targetNodeId: string; baseCost: number }>>;
}

/**
 * Target scoring result for vendor targeting
 */
export interface TargetScore {
  fan: Fan;
  sectionIdx: number;
  rowIdx: number;
  colIdx: number;
  score: number; // higher is better
  estimatedCost: number;
  thirstLevel: number;
  happinessLevel: number;
}

/**
 * HybridPathResolver implements layered heuristic pathfinding for vendors
 * 
 * Architecture:
 * - Phase 1: Global zone selection (which section, which side/stair)
 * - Phase 2: Intra-section approach (top vs front corridor entry)
 * - Phase 3: Row infiltration and seat micro-positioning
 * 
 * Cost Function:
 * - cost = manhattanDistance + terrainPenalty * (1 - vendorEfficiency) - targetValueScore
 * - terrainPenalty accounts for row slowdown, seat occupancy, grump presence
 * - vendorEfficiency from quality tier modifier
 * - targetValueScore prioritizes high-thirst or low-happiness fans
 * 
 * Detour Logic:
 * - Tracks cumulative penalty along path
 * - Triggers local detour search when penalty exceeds vendor's tolerance
 * - Expands small neighborhood (adjacent row entry, alternative stair) for lower-cost branch
 * 
 * Future Expansion:
 * - Full A* implementation can be swapped in using same node schema
 * - Multi-vendor collision avoidance via dynamic cost adjustments
 * - Stair connector geometry and vertical movement modeling
 */
export class HybridPathResolver {
  private graph: NavigationGraph;
  private sections: StadiumSection[];

  constructor(sections: StadiumSection[]) {
    this.sections = sections;
    this.graph = this.buildNavigationGraph(sections);
  }

  /**
   * Build navigation graph from stadium sections
   * Currently a stub - returns empty graph for Phase 1
   * 
   * Future implementation will:
   * 1. Create corridor nodes for each section (top and front)
   * 2. Create stair nodes on left/right edges between adjacent sections
   * 3. Create row entry nodes for each row in each section
   * 4. Create seat nodes for occupied seats
   * 5. Connect nodes with edges weighted by distance and terrain type
   * 
   * @param sections Array of StadiumSection objects
   * @returns Navigation graph structure
   */
  private buildNavigationGraph(sections: StadiumSection[]): NavigationGraph {
    const nodes = new Map<string, NavigationNode>();
    const edges = new Map<string, Array<{ targetNodeId: string; baseCost: number }>>();

    // TODO: Implement graph construction
    // For now, return empty graph as foundation

    return { nodes, edges };
  }

  /**
   * Plan a path from vendor's current position to target node
   * Currently a stub - returns direct segment for Phase 1
   * 
   * Future implementation will:
   * 1. Determine vendor's current node (or nearest node)
   * 2. Apply heuristic cost function to potential paths
   * 3. Generate segment array representing movement waypoints
   * 4. Apply vendor-specific efficiency and penalty modifiers
   * 
   * @param vendor Vendor profile with quality and abilities
   * @param fromX Current X position
   * @param fromY Current Y position
   * @param toNode Target navigation node
   * @returns Array of path segments to follow
   */
  public planPath(
    vendor: VendorProfile,
    fromX: number,
    fromY: number,
    toNode: NavigationNode
  ): PathSegment[] {
    // TODO: Implement hybrid heuristic pathfinding
    // For now, return simple direct segment as stub

    const directSegment: PathSegment = {
      nodeType: 'seat',
      sectionIdx: 0,
      rowIdx: 0,
      colIdx: 0,
      x: toNode.x,
      y: toNode.y,
      cost: this.calculateDistance(fromX, fromY, toNode.x, toNode.y),
    };

    return [directSegment];
  }

  /**
   * Calculate segment cost based on terrain and vendor profile
   * 
   * Cost breakdown:
   * - Base movement cost (distance * base speed for node type)
   * - Row base penalty (if in row)
   * - Occupied seat penalties (per seat crossed)
   * - Grump penalties (multiplied for difficult terrain fans)
   * - Vendor ability overrides (ignore certain penalties)
   * - Quality efficiency modifier (scales total cost)
   * 
   * @param segment Path segment to evaluate
   * @param vendor Vendor profile
   * @param seatOccupancy Optional seat occupancy data for row
   * @param grumpPresence Optional grump/difficult terrain flags
   * @returns Total movement cost for this segment
   */
  public calculateSegmentCost(
    segment: PathSegment,
    vendor: VendorProfile,
    seatOccupancy?: boolean[],
    grumpPresence?: boolean[]
  ): number {
    let cost = segment.cost; // base distance cost

    // Apply node type base speed modifier
    const speedModifiers = {
      corridor: gameBalance.vendorMovement.baseSpeedCorridor,
      stair: gameBalance.vendorMovement.baseSpeedStair,
      rowEntry: gameBalance.vendorMovement.baseSpeedRow,
      seat: gameBalance.vendorMovement.baseSpeedRow,
    };

    cost = cost / speedModifiers[segment.nodeType];

    // Apply row base penalty if in row (unless vendor ignores it)
    if ((segment.nodeType === 'rowEntry' || segment.nodeType === 'seat') 
        && !vendor.abilities.ignoreRowPenalty) {
      cost *= (1 + gameBalance.vendorMovement.rowBasePenalty);
    }

    // Apply seat occupancy and grump penalties if provided
    if (seatOccupancy && segment.colIdx !== undefined) {
      const col = segment.colIdx;
      if (seatOccupancy[col]) {
        cost *= (1 + gameBalance.vendorMovement.occupiedSeatPenalty);
      }

      // Apply grump penalty if present and vendor doesn't ignore it
      if (grumpPresence && grumpPresence[col] && !vendor.abilities.ignoreGrumpPenalty) {
        const grumpPenalty = gameBalance.vendorMovement.rowBasePenalty 
          * gameBalance.vendorMovement.grumpPenaltyMultiplier;
        const cappedPenalty = Math.min(grumpPenalty, gameBalance.vendorMovement.maxTerrainPenalty);
        cost *= (1 + cappedPenalty);
      }
    }

    // Apply vendor quality efficiency modifier
    const qualityConfig = gameBalance.vendorQuality[vendor.qualityTier];
    cost = cost / qualityConfig.efficiencyModifier;

    return cost;
  }

  /**
   * Detect if cumulative path penalty exceeds tolerance threshold
   * Triggers local detour search to find alternative route
   * 
   * @param cumulativePenalty Current accumulated movement penalty
   * @param vendor Vendor profile with quality-based tolerance
   * @returns true if detour should be triggered
   */
  public detectDetourNeed(cumulativePenalty: number, vendor: VendorProfile): boolean {
    const qualityConfig = gameBalance.vendorQuality[vendor.qualityTier];
    const tolerance = qualityConfig.penaltyTolerance;
    return cumulativePenalty > tolerance;
  }

  /**
   * Find local detour around high-penalty segment
   * Currently a stub - returns null for Phase 1
   * 
   * Future implementation will:
   * 1. Expand small neighborhood around current position
   * 2. Consider alternative row entries or stair access
   * 3. Score alternative branches by cost reduction
   * 4. Return new segment array if better path found
   * 
   * @param fromNode Current position node
   * @param targetNode Destination node
   * @param avoidNodes Nodes to avoid (high penalty)
   * @returns Alternative path segments or null if no better route
   */
  public findLocalDetour(
    fromNode: NavigationNode,
    targetNode: NavigationNode,
    avoidNodes: Set<string>
  ): PathSegment[] | null {
    // TODO: Implement local detour search
    // For now, return null (no detour available)
    return null;
  }

  /**
   * Score potential target fans for drink vendor service
   * Considers thirst severity, distance, and path cost
   * 
   * @param vendor Vendor profile
   * @param fromX Current vendor X position
   * @param fromY Current vendor Y position
   * @param candidates Array of candidate fans with positions
   * @returns Sorted array of target scores (highest first)
   */
  public scoreTargets(
    vendor: VendorProfile,
    fromX: number,
    fromY: number,
    candidates: Array<{ fan: Fan; sectionIdx: number; rowIdx: number; colIdx: number; x: number; y: number }>
  ): TargetScore[] {
    const scores: TargetScore[] = [];

    for (const candidate of candidates) {
      const distance = this.calculateDistance(fromX, fromY, candidate.x, candidate.y);
      const thirst = candidate.fan.getThirst();
      const happiness = candidate.fan.getHappiness();

      // Score formula: thirstSeverity / (estimatedCost * efficiency)
      // Higher thirst = higher priority, lower cost = higher priority
      const thirstWeight = thirst / 100; // normalize to 0-1
      const estimatedCost = distance; // simplified for stub
      const qualityConfig = gameBalance.vendorQuality[vendor.qualityTier];
      const efficiency = qualityConfig.efficiencyModifier;

      const score = (thirstWeight * 100) / (estimatedCost * (1 / efficiency));

      scores.push({
        fan: candidate.fan,
        sectionIdx: candidate.sectionIdx,
        rowIdx: candidate.rowIdx,
        colIdx: candidate.colIdx,
        score,
        estimatedCost,
        thirstLevel: thirst,
        happinessLevel: happiness,
      });
    }

    // Sort descending by score
    return scores.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate Manhattan distance between two points
   */
  private calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.abs(x2 - x1) + Math.abs(y2 - y1);
  }

  /**
   * Get navigation graph (for debugging/visualization)
   */
  public getGraph(): NavigationGraph {
    return this.graph;
  }

  /**
   * Rebuild graph when sections change
   */
  public rebuildGraph(sections: StadiumSection[]): void {
    this.sections = sections;
    this.graph = this.buildNavigationGraph(sections);
  }
}
