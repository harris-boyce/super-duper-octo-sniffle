import type { StadiumSection } from './StadiumSection';
import { gameBalance } from '@/config/gameBalance';

/**
 * Segment type representing the four sides of a section
 */
type PerimeterSegment = 'front' | 'right' | 'back' | 'left';

/**
 * Manages mascot movement along section perimeter
 * Handles path calculation, position updates, and depth factor
 *
 * Movement pattern: Hybrid perimeter path with random pauses and shortcuts
 * - Primarily follows perimeter: front → right → back → left → front
 * - Can pause at corners (configurable probability)
 * - Can take shortcuts across section interior (configurable probability)
 */
export class MascotPerimeterPath {
  private section: StadiumSection;
  private currentSegment: PerimeterSegment;
  private segmentProgress: number = 0; // 0-1 progress along current segment
  private pathPoints: Array<{ x: number; y: number }>;
  private pauseTimer: number = 0; // milliseconds remaining in current pause
  private isOnShortcut: boolean = false; // true when cutting across section
  private shortcutStart: { x: number; y: number } | null = null;
  private shortcutEnd: { x: number; y: number } | null = null;

  constructor(section: StadiumSection) {
    this.section = section;
    this.currentSegment = this.getRandomSegment();
    this.pathPoints = this.calculatePathPoints();
  }

  /**
   * Calculate the four corner points of section perimeter
   * Points are offset inward by edgePadding to keep mascot visible
   */
  private calculatePathPoints(): Array<{ x: number; y: number }> {
    const bounds = this.section.getSectionBounds();
    const padding = gameBalance.mascot.edgePadding;

    // Define perimeter corners (clockwise from front-left)
    return [
      { x: bounds.left + padding, y: bounds.top + padding },     // front-left (0)
      { x: bounds.right - padding, y: bounds.top + padding },    // front-right (1)
      { x: bounds.right - padding, y: bounds.bottom - padding }, // back-right (2)
      { x: bounds.left + padding, y: bounds.bottom - padding },  // back-left (3)
    ];
  }

  /**
   * Get current position along perimeter and facing direction
   */
  public getCurrentPosition(): { x: number; y: number; facing: 'left' | 'right' } {
    // If on shortcut, interpolate between shortcut start and end
    if (this.isOnShortcut && this.shortcutStart && this.shortcutEnd) {
      const x = this.shortcutStart.x + (this.shortcutEnd.x - this.shortcutStart.x) * this.segmentProgress;
      const y = this.shortcutStart.y + (this.shortcutEnd.y - this.shortcutStart.y) * this.segmentProgress;
      const facing = (this.shortcutEnd.x > this.shortcutStart.x) ? 'right' : 'left';
      return { x, y, facing };
    }

    // Normal perimeter movement
    const segmentIndex = this.getSegmentIndex();
    const start = this.pathPoints[segmentIndex];
    const end = this.pathPoints[(segmentIndex + 1) % 4];

    // Linear interpolation between start and end
    const x = start.x + (end.x - start.x) * this.segmentProgress;
    const y = start.y + (end.y - start.y) * this.segmentProgress;

    // Determine facing based on horizontal movement direction
    const facing = (end.x > start.x) ? 'right' : 'left';

    return { x, y, facing };
  }

  /**
   * Advance position along perimeter
   * @param deltaTime - Time elapsed in milliseconds
   * @param speed - Movement speed in pixels per second
   */
  public advance(deltaTime: number, speed: number): void {
    // Handle pause timer
    if (this.pauseTimer > 0) {
      this.pauseTimer -= deltaTime;
      return; // Don't move during pause
    }

    // Calculate effective speed (slower on shortcuts)
    let effectiveSpeed = speed;
    if (this.isOnShortcut) {
      effectiveSpeed *= gameBalance.mascot.shortcutSpeedMultiplier;
    }

    // Calculate movement
    const segmentLength = this.getSegmentLength();
    if (segmentLength === 0) {
      return; // Skip movement if segment has no length (avoid division by zero)
    }
    const distanceMoved = effectiveSpeed * (deltaTime / 1000); // pixels
    const progressDelta = distanceMoved / segmentLength;

    this.segmentProgress += progressDelta;

    // Check if we've completed current segment
    if (this.segmentProgress >= 1.0) {
      this.segmentProgress = 0;

      if (this.isOnShortcut) {
        // Shortcut completed, resume normal perimeter movement
        this.isOnShortcut = false;
        this.shortcutStart = null;
        this.shortcutEnd = null;
        // Pick a random segment to resume on
        this.currentSegment = this.getRandomSegment();
      } else {
        // Normal segment completed
        this.currentSegment = this.getNextSegment();

        // Random pause at corner
        if (Math.random() < gameBalance.mascot.cornerPauseProbability) {
          this.pauseTimer = this.getRandomPauseDuration();
        }

        // Random shortcut (only if not currently paused)
        if (this.pauseTimer === 0 && Math.random() < gameBalance.mascot.shortcutProbability) {
          this.initiateShortcut();
        }
      }
    }
  }

  /**
   * Initiate a shortcut across the section interior
   *
   * NOTE: This method captures the current position before setting isOnShortcut=true.
   * getCurrentPosition() relies on the isOnShortcut flag, so order of operations matters:
   * 1. Call getCurrentPosition() while still on perimeter (isOnShortcut=false)
   * 2. Set isOnShortcut=true to switch to shortcut mode
   * 3. Use captured position as shortcutStart
   */
  private initiateShortcut(): void {
    // Capture current position before modifying state
    const startPosition = this.getCurrentPosition();

    this.isOnShortcut = true;
    this.shortcutStart = startPosition;

    // Pick a random destination corner (different from current)
    const currentSegmentIndex = this.getSegmentIndex();
    const possibleDestinations = [0, 1, 2, 3].filter(i => i !== currentSegmentIndex);
    const destinationIndex = possibleDestinations[Math.floor(Math.random() * possibleDestinations.length)];
    this.shortcutEnd = this.pathPoints[destinationIndex];

    // Reset progress for shortcut
    this.segmentProgress = 0;
  }

  /**
   * Get random pause duration
   */
  private getRandomPauseDuration(): number {
    const min = gameBalance.mascot.pauseAtCornerMin;
    const max = gameBalance.mascot.pauseAtCornerMax;
    return min + Math.random() * (max - min);
  }

  /**
   * Get index of current segment (0=front, 1=right, 2=back, 3=left)
   */
  private getSegmentIndex(): number {
    const segments: PerimeterSegment[] = ['front', 'right', 'back', 'left'];
    return segments.indexOf(this.currentSegment);
  }

  /**
   * Calculate length of current segment (or shortcut)
   */
  private getSegmentLength(): number {
    if (this.isOnShortcut && this.shortcutStart && this.shortcutEnd) {
      const dx = this.shortcutEnd.x - this.shortcutStart.x;
      const dy = this.shortcutEnd.y - this.shortcutStart.y;
      return Math.sqrt(dx * dx + dy * dy);
    }

    // Normal perimeter segment
    const segmentIndex = this.getSegmentIndex();
    const start = this.pathPoints[segmentIndex];
    const end = this.pathPoints[(segmentIndex + 1) % 4];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Get random starting segment
   */
  private getRandomSegment(): PerimeterSegment {
    const segments: PerimeterSegment[] = ['front', 'right', 'back', 'left'];
    return segments[Math.floor(Math.random() * segments.length)];
  }

  /**
   * Get next segment in clockwise order
   */
  private getNextSegment(): PerimeterSegment {
    const order: Record<PerimeterSegment, PerimeterSegment> = {
      front: 'right',
      right: 'back',
      back: 'left',
      left: 'front',
    };
    return order[this.currentSegment];
  }

  /**
   * Get depth factor for targeting
   * Returns 0-1 where 1 = furthest from fans (best for long throws)
   * Back of section = 1.0, front/sides = 0.3
   */
  public getDepthFactor(): number {
    // If on shortcut, use average of front/sides
    if (this.isOnShortcut) {
      return gameBalance.mascot.depthFactorFrontSides;
    }

    // Use configured depth factors based on segment
    if (this.currentSegment === 'back') {
      return gameBalance.mascot.depthFactorBack;
    }
    return gameBalance.mascot.depthFactorFrontSides;
  }

  /**
   * Check if mascot is currently paused
   */
  public isPaused(): boolean {
    return this.pauseTimer > 0;
  }

  /**
   * Check if mascot is on a shortcut path
   */
  public isOnShortcutPath(): boolean {
    return this.isOnShortcut;
  }

  /**
   * Get current segment name (for debugging)
   */
  public getCurrentSegment(): PerimeterSegment {
    return this.currentSegment;
  }
}
