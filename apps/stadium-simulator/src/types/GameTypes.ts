/**
 * Represents a section of the stadium with fan engagement metrics
 */
export interface Section {
  /** Unique identifier for the section */
  id: string;
  /** Happiness level of fans in this section (0-100) */
  happiness: number;
  /** Thirst level of fans in this section (0-100) */
  thirst: number;
  /** Attention level of fans in this section (0-100) */
  attention: number;
}

/**
 * Represents the current state of the wave animation
 */
export interface WaveState {
  /** Countdown timer before wave starts */
  countdown: number;
  /** Whether the wave is currently active */
  active: boolean;
  /** Index of the current section participating in the wave */
  currentSection: number;
  /** Score multiplier for the current wave */
  multiplier: number;
}

/**
 * Represents the legacy state of a vendor in the stadium (deprecated)
 * @deprecated Use VendorProfile and VendorState (union type) instead
 */
export interface LegacyVendorState {
  /** Current position of the vendor */
  position: number;
  /** Cooldown timer before vendor can serve again */
  cooldown: number;
  /** Whether the vendor is currently serving */
  isServing: boolean;
}

/**
 * Represents the state of the stadium mascot
 */
export interface MascotState {
  /** Cooldown timer before mascot can perform again */
  cooldown: number;
  /** Whether the mascot is currently active */
  isActive: boolean;
}

/**
 * Represents the overall game state
 */
export interface GameState {
  /** Array of all stadium sections */
  sections: Section[];
  /** Current wave state */
  wave: WaveState;
  /** Current game score */
  score: number;
}

/**
 * Configuration for a stadium section
 */
export interface SectionConfig {
  rowCount?: number;
  seatsPerRow?: number;
  width: number;
  height: number;
  rowBaseHeightPercent?: number;
  startLightness?: number;
  autoPopulate?: boolean;
}

/**
 * Assignment for a seat in a section
 */
export interface SeatAssignment {
  sectionId: string;
  row: number;
  seat: number;
  occupied: boolean;
  fanType?: string;
  fanProperties?: any;
}

/**
 * Vendor type identifier
 */
export type VendorType = 'drink' | 'rangedAoE';

/**
 * Vendor quality tier
 */
export type VendorQualityTier = 'excellent' | 'good' | 'average' | 'poor';

/**
 * Vendor abilities and capabilities
 */
export interface VendorAbilities {
  /** Can ignore base row movement penalty */
  ignoreRowPenalty: boolean;
  /** Can ignore grump/difficult terrain penalty */
  ignoreGrumpPenalty: boolean;
  /** Can enter section rows (vs corridor-only) */
  canEnterRows: boolean;
  /** Ranged service only (no direct approach) */
  rangedOnly: boolean;
}

/**
 * Movement penalty configuration (optional per-vendor overrides)
 */
export interface VendorMovementPenalties {
  rowBasePenalty: number;
  occupiedSeatPenalty: number;
  grumpPenaltyMultiplier: number;
}

/**
 * Vendor profile defining type, quality, and capabilities
 */
export interface VendorProfile {
  /** Unique vendor identifier */
  id: number;
  /** Vendor type (drink, rangedAoE, etc.) */
  type: VendorType;
  /** Quality tier affecting efficiency and behavior */
  qualityTier: VendorQualityTier;
  /** Vendor-specific abilities and flags */
  abilities: VendorAbilities;
  /** Custom AoE radius (for ranged vendors) */
  aoeRadius?: number;
  /** Custom penalty overrides */
  customPenalties?: Partial<VendorMovementPenalties>;
}

/**
 * Vendor state machine states
 */
export type VendorState = 
  | 'idle' 
  | 'planning' 
  | 'movingSegment' 
  | 'serving' 
  | 'cooldown' 
  | 'distracted' 
  | 'rangedCharging';

/**
 * Path segment node type
 */
export type PathNodeType = 'corridor' | 'stair' | 'rowEntry' | 'seat';

/**
 * Path segment for vendor navigation
 */
export interface PathSegment {
  /** Type of navigation node */
  nodeType: PathNodeType;
  /** Section index this segment belongs to */
  sectionIdx: number;
  /** Row index (if applicable) */
  rowIdx?: number;
  /** Column index (if applicable) */
  colIdx?: number;
  /** World X coordinate */
  x: number;
  /** World Y coordinate */
  y: number;
  /** Calculated movement cost for this segment */
  cost: number;
}
