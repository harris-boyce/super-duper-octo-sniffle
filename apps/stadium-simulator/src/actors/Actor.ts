import { ActorLogger } from '@/sprites/ActorLogger';

/**
 * Actor: Root abstraction for all game entities.
 * Provides common lifecycle, logging, position, and unique ID generation.
 * 
 * Taxonomy:
 * - AnimatedActor: Dynamic entity with stats/state (Fan, Vendor, Mascot)
 * - SceneryActor: Static visual element (StadiumSection, SectionRow, Seat)
 * - UtilityActor: Non-visual logic entity (Waypoint, Zone, WaveState)
 */
export abstract class Actor {
  readonly id: string;
  readonly type: string;
  readonly category: string;
  protected logger: ActorLogger;
  protected x: number;
  protected y: number;

  constructor(id: string, type: string, category: string, x: number = 0, y: number = 0, enableLogging = false) {
    this.id = id;
    this.type = type;
    this.category = category;
    this.x = x;
    this.y = y;
    this.logger = new ActorLogger(category, id, enableLogging);
  }

  public setLogging(enabled: boolean): void {
    this.logger.setEnabled(enabled);
  }

  public getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  public setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  /**
   * Update logic called each frame by registry or manager.
   * @param delta Time elapsed since last frame (ms)
   */
  public abstract update(delta: number): void;

  /**
   * Refresh visual/state representation.
   * Called after update when state needs refreshing.
   */
  public abstract draw(): void;
}

/**
 * AnimatedActor: Dynamic entity with internal state that affects gameplay.
 * Examples: Fan (happiness/thirst/attention), Vendor (movement), Mascot (abilities).
 * Must implement per-frame update and visual refresh.
 */
export abstract class AnimatedActor extends Actor {
  constructor(id: string, type: string, category: string, x: number = 0, y: number = 0, enableLogging = false) {
    super(id, type, category, x, y, enableLogging);
  }

  public abstract update(delta: number): void;
  public abstract draw(): void;
}

/**
 * SceneryActor: Static visual element with minimal per-frame updates.
 * Examples: StadiumSection, SectionRow, Seat.
 * Visual created once; update typically no-op unless animating.
 */
export abstract class SceneryActor extends Actor {
  constructor(id: string, type: string, category: string, x: number = 0, y: number = 0, enableLogging = false) {
    super(id, type, category, x, y, enableLogging);
  }

  // Scenery typically doesn't animate
  public update(delta: number): void {
    // No-op by default; override if needed
  }

  // Draw is one-time setup; no per-frame refresh
  public draw(): void {
    // No-op by default
  }
}

/**
 * UtilityActor: Non-visual entity whose position/state affects game logic.
 * Examples: Pathfinding waypoint, collision zone, AI decision point.
 * Participates in logic without being rendered.
 */
export abstract class UtilityActor extends Actor {
  constructor(id: string, type: string, category: string, x: number = 0, y: number = 0, enableLogging = false) {
    super(id, type, category, x, y, enableLogging);
  }

  public abstract update(delta: number): void;

  // Non-visual actors don't draw
  public draw(): void {
    // No-op
  }
}
