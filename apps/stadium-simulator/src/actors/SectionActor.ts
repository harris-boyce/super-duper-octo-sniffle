import { SceneryActor } from '@/actors/base/Actor';
import { StadiumSection } from '@/sprites/StadiumSection';
import type { ActorCategory } from '@/actors/interfaces/ActorTypes';
import type { FanData } from '@/services/LevelService';
import { Fan } from '@/sprites/Fan';
import { FanActor } from '@/actors/FanActor';
import { SeatActor } from '@/sprites/Seat';
import { SectionRowActor } from './SectionRowActor';
import { gameBalance } from '@/config/gameBalance';

/**
 * SectionActor: Primary game logic for a stadium section.
 * Handles seat/fan population from data, provides queries for AI/wave systems.
 * Now owns its sprite (StadiumSection) via composition.
 */
export class SectionActor extends SceneryActor {
  private section: StadiumSection;
  private sectionId: string;
  private rowActors: SectionRowActor[] = [];
  // Sprite instances (visual only)
  private fans: Map<string, Fan> = new Map();
  // Actor instances (game logic)
  private fanActors: Map<string, FanActor> = new Map();
  private gridManager?: any;
  private sectionData: any;
  private labelText?: Phaser.GameObjects.Text;
  private happinessAgg: number = 0;
  private thirstAgg: number = 0;
  private attentionAgg: number = 0;
  private actorRegistry?: any;
  private lastCollisionAppliedWaveKeys: Set<string> = new Set();

  // Cluster decay tracking (Phase 5.1)
  private clusterDecayTimer: number = 0;
  private sessionStartTime: number = 0;
  private sessionLength: number = 100000; // Will be set from gameBalance
  private shouldDecayThisFrame: boolean = false; // Flag from GameStateManager
  
  // Auto-wave tracking (Phase 5.3)
  private readyFanCount: number = 0;
  private lastWaveInitiateTime: number = 0;
  
  // Debug tracking: sample one fan per section for stat monitoring
  private sampleFanActor?: FanActor;
  private sceneStartTime: number = 0;

  constructor(
    id: string,
    scene: Phaser.Scene,
    sectionData: any, // Should be SectionData
    gridManager?: any,
    actorRegistry?: any,
    category: ActorCategory = 'section',
    enableLogging = false
  ) {
    super(id, 'section', category, sectionData.gridTop, sectionData.gridLeft, enableLogging);
    this.sectionId = sectionData.id;
    this.gridManager = gridManager;
    this.actorRegistry = actorRegistry;
    this.sectionData = sectionData;
    // Calculate world position from grid boundaries
    // Section has 5 grid rows but only 4 visual seat rows (row 18 is corridor base)
    const topLeft = gridManager ? gridManager.gridToWorld(sectionData.gridTop, sectionData.gridLeft) : { x: 0, y: 0 };
    const bottomRight = gridManager ? gridManager.gridToWorld(sectionData.gridBottom, sectionData.gridRight) : { x: 256, y: 200 };
    const totalRowCount = sectionData.gridBottom - sectionData.gridTop + 1; // 5 rows (14-18)
    const visualRowCount = 4; // Only 4 seat rows (14-17)
    const seatsPerRow = sectionData.gridRight - sectionData.gridLeft + 1;
    const cellSize = gridManager ? gridManager.getWorldSize().cellSize : 32;
    const sectionWidth = seatsPerRow * cellSize;
    // Position section: gridToWorld returns cell CENTER, so we need to calculate
    // the center Y of the 4 visual seat rows (14-17)
    const visualRowsTop = topLeft.y; // Center of row 14
    const visualRowsBottom = gridManager ? gridManager.gridToWorld(sectionData.gridTop + 3, sectionData.gridLeft).y : topLeft.y + (3 * cellSize); // Center of row 17
    const worldPos = {
      x: (topLeft.x + bottomRight.x) / 2,
      y: (visualRowsTop + visualRowsBottom) / 2 // Center between row 14 and 17 centers
    };
    this.section = new StadiumSection(scene, worldPos.x, worldPos.y, {
      width: sectionWidth,
      height: visualRowCount * cellSize, // Height of 4 seat rows only
      rowCount: visualRowCount, // 4 seat rows
      seatsPerRow,
      rowBaseHeightPercent: 0.15,
      startLightness: 62,
      autoPopulate: false,
    }, sectionData.id);
    this.sprite = this.section;
    // Create label using grid boundaries and label from data
    if (gridManager) {
      const topLeft = gridManager.gridToWorld(sectionData.gridTop, sectionData.gridLeft);
      const topRight = gridManager.gridToWorld(sectionData.gridTop, sectionData.gridRight);
      const labelX = (topLeft.x + topRight.x) / 2;
      const labelY = topLeft.y - 96;
      this.labelText = scene.add.text(labelX, labelY, sectionData.label, {
        fontSize: '24px',
        fontFamily: 'Arial',
        color: '#ffffff',
      }).setOrigin(0.5, 0.5);
      // Register section with grid
      gridManager.addOccupant(sectionData.gridTop, sectionData.gridLeft, {
        id: this.id,
        type: 'section',
        metadata: { sectionId: sectionData.id }
      });
    }
    this.logger.debug(`SectionActor created for section ${sectionData.id}`);
    
    // Initialize session tracking for cluster decay (Phase 5.1)
    this.sessionLength = gameBalance.sessionConfig.runModeDuration;
    // sessionStartTime will be set when session activates (not at scene creation)
    this.sessionStartTime = 0;
    
    // Setup event listeners (Phase 5.4)
    if (this.actorRegistry && this.actorRegistry.on) {
      this.actorRegistry.on('waveCountdownStarted', (data: { sectionId: string; countdown: number }) => {
        if (data.sectionId === this.sectionId) {
          this.startBlinkEffect(data.countdown);
        }
      });
    }
  }

  /**
   * Populate seats and fans from level data (data-driven)
   */
  public populateFromData(fanData: FanData[]): void {
    const rowCount = this.sectionData.gridBottom - this.sectionData.gridTop + 1;
    const seatsPerRow = this.sectionData.gridRight - this.sectionData.gridLeft + 1;
    const cellSize = this.gridManager ? this.gridManager.getWorldSize().cellSize : 32;
    const sectionWidth = seatsPerRow * cellSize;
    const sectionHeight = rowCount * cellSize;
    const baseRowHeight = Math.floor(sectionHeight / rowCount);
    const remainder = sectionHeight - baseRowHeight * rowCount;
    const startLightness = 62;
    const maxLightness = 90;
    const minLightness = 30;
    const interval = (maxLightness - startLightness) / Math.max(1, rowCount - 1);

    for (let row = 0; row < rowCount; row++) {
      const gridRow = this.sectionData.gridTop + row;
      const rowHeight = baseRowHeight + (row === 0 ? remainder : 0);
      const targetLightness = Math.max(minLightness, Math.min(maxLightness, startLightness + interval * row));
      const nextRowLightness = Math.max(minLightness, Math.min(maxLightness, startLightness + interval * (row + 1)));

      const rowActor = new SectionRowActor({
        id: `${this.sectionId}-row-${row}`,
        sectionId: this.sectionId,
        rowIndex: row,
        gridTop: gridRow,
        gridLeft: this.sectionData.gridLeft,
        gridRight: this.sectionData.gridRight,
        rowHeightPx: rowHeight,
        rowWidthPx: sectionWidth,
        lightnessStops: { current: targetLightness, next: nextRowLightness },
        container: this.section,
        scene: this.section.scene,
        gridManager: this.gridManager,
        actorRegistry: this.actorRegistry
      });

      rowActor.buildSeats(seatsPerRow);
      this.rowActors.push(rowActor);

      // Inject seats into StadiumSection's row stub for backward compatibility
      if (this.section.getRows()[row]) {
        this.section.getRows()[row].seats = rowActor.getSeats();
      }
    }

    // Create fan sprites + actors from data
    fanData.forEach(fd => {
      const rowActor = this.rowActors[fd.row];
      if (rowActor) {
        const seat = rowActor.getSeatAt(fd.col);
        if (seat) {
          // Create fan sprite at seat position
          // gridToWorld already returns center of cell
          const worldPos = this.gridManager
            ? this.gridManager.gridToWorld(fd.gridRow, fd.gridCol)
            : { x: 0, y: 0 };
          const seatOffsetY = -10; // Offset to align with top of row floor divider (matches SectionRow seat positioning)
          const fanY = worldPos.y - seatOffsetY; // Adjust from cell center by seat offset
          const fan = new Fan(this.section.scene, worldPos.x, fanY);
          // Create FanActor for game logic (pass actorRegistry for vendor collision detection)
          const fanActor = new FanActor(
            `fan-${this.sectionId}-${fd.row}-${fd.col}`,
            fan,
            fd.initialStats ? {
              happiness: fd.initialStats.happiness,
              thirst: fd.initialStats.thirst,
              attention: fd.initialStats.attention
            } : undefined,
            'fan',
            false,
            this.gridManager,
            this.actorRegistry
          );
          // Set the FanActor's grid position to absolute grid coordinates
          fanActor.setGridPosition(fd.gridRow, fd.gridCol, this.gridManager);
          // Register fan with ActorRegistry
          if (this.actorRegistry) {
            this.actorRegistry.register(fanActor);
          }
          seat.setFan(fan);
          this.fans.set(`${fd.row}-${fd.col}`, fan);
          this.fanActors.set(`${fd.row}-${fd.col}`, fanActor);
        }
      }
    });

    this.logger.debug(`Section ${this.sectionId} populated with ${this.fans.size} fans across ${rowCount} rows`);
    
    // Pick first fan as sample for stat tracking (debug)
    const fanActorsArray = Array.from(this.fanActors.values());
    if (fanActorsArray.length > 0) {
      this.sampleFanActor = fanActorsArray[0];
    }
  }

  /**
   * Set the scene start time for timestamp logging
   */
  public setSceneStartTime(time: number): void {
    this.sceneStartTime = time;
  }

  /**
   * Activate session timing - called when countdown completes
   * Starts autonomous logic (cluster decay, auto-wave triggering)
   */
  public activateSession(): void {
    this.sessionStartTime = Date.now();
    console.log(`[SectionActor ${this.sectionId}] Session activated at ${this.sessionStartTime}`);
  }

  /**
   * Apply collision penalties for a wave-section event with cooldown per wave+section.
   * @param waveKey Unique key for the active wave and this section (e.g., `${waveSerial}:${sectionId}`)
   * @param vendorPos Grid position of vendor
   * @param localRadius Radius in cells for local happiness penalty
   */
  public applyCollisionPenalties(waveKey: string, vendorPos: { row: number; col: number }, localRadius: number = gameBalance.waveCollision.localRadius): void {
    if (this.lastCollisionAppliedWaveKeys.has(waveKey)) {
      // Debug: penalty suppressed due to per-wave-per-section cooldown
      console.log(`[SectionActor:${this.sectionId}] Collision penalties suppressed for waveKey=${waveKey}`);
      return; // Cooldown: already applied for this wave+section
    }

    this.lastCollisionAppliedWaveKeys.add(waveKey);
    console.log(`[SectionActor:${this.sectionId}] Applying collision penalties for waveKey=${waveKey} at (${vendorPos.row},${vendorPos.col})`);

    // Section-wide attention penalty
    const attentionPenalty = gameBalance.waveCollision.sectionAttentionPenalty;

    // Apply to all fan actors in this section
    this.fanActors.forEach((fanActor) => {
      const state = (fanActor as any).getState?.();
      if (state === 'engaged' || state === 'drinking') return;
      // Modify attention (correct key)
      (fanActor as any).modifyStats?.({ attention: -attentionPenalty });
    });

    // Local happiness penalty
    const happinessPenalty = gameBalance.waveCollision.localHappinessPenalty;
    const radius = localRadius;

    this.fanActors.forEach((fanActor) => {
      const pos = (fanActor as any).getGridPosition?.();
      if (!pos) return;
      const dr = Math.abs(pos.row - vendorPos.row);
      const dc = Math.abs(pos.col - vendorPos.col);
      if (dr + dc <= radius) {
        const state = (fanActor as any).getState?.();
        if (state === 'engaged' || state === 'drinking') return;
        (fanActor as any).modifyStats?.({ happiness: -happinessPenalty });
      }
    });
    // Check for vendor splat (if vendor actor has behavior with collision handler)
    if (this.actorRegistry) {
      const vendors = this.actorRegistry.getByCategory('vendor');
      console.log(`[SectionActor:${this.sectionId}] Checking ${vendors.length} vendors for splat at (${vendorPos.row},${vendorPos.col})`);
      for (const vendorActor of vendors) {
        const vPos = (vendorActor as any).getGridPosition?.();
        console.log(`[SectionActor:${this.sectionId}] Vendor at (${vPos?.row},${vPos?.col})`);
        if (vPos) {
          // Check if vendor is within collision radius
          const dr = Math.abs(vPos.row - vendorPos.row);
          const dc = Math.abs(vPos.col - vendorPos.col);
          const distance = dr + dc;
          
          if (distance <= localRadius) {
            // Found a vendor within collision radius
            console.log(`[SectionActor:${this.sectionId}] Found vendor at distance ${distance} <= ${localRadius}, checking for splat!`);
            const behavior = (vendorActor as any).getBehavior?.();
            if (behavior && typeof behavior.handleCollisionSplat === 'function') {
              console.log(`[SectionActor:${this.sectionId}] Calling handleCollisionSplat...`);
              const splatted = behavior.handleCollisionSplat(vPos);
              console.log(`[SectionActor:${this.sectionId}] Splat result: ${splatted}`);
            } else {
              console.log(`[SectionActor:${this.sectionId}] No handleCollisionSplat method found`);
            }
            break; // Only splat one vendor per collision
          }
        }
      }
    }
    
    // Emit collision notification for AIManager listeners
    if (this.actorRegistry && typeof this.actorRegistry.emit === 'function') {
      this.actorRegistry.emit('vendorCollision', {
        sectionId: this.sectionId,
        vendorPos,
        waveKey,
        attentionPenalty,
        happinessPenalty,
        radius
      });
    }

    // Emit a UI event so the Scene can render an overlay
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('vendorPenaltyApplied', {
        detail: {
          sectionId: this.sectionId,
          message: 'Vendor In the Way! Booooo!',
          vendorRow: vendorPos.row,
          vendorCol: vendorPos.col,
          attentionPenalty,
          happinessPenalty,
          radius
        }
      }));
    }
  }

  /**
   * Reset collision cooldown keys for a new wave cycle.
   */
  public resetCollisionCooldown(): void {
    if (this.lastCollisionAppliedWaveKeys.size > 0) {
      console.log(`[SectionActor:${this.sectionId}] Resetting ${this.lastCollisionAppliedWaveKeys.size} collision cooldown keys`);
    }
    this.lastCollisionAppliedWaveKeys.clear();
  }

  /**
   * Get all fans in this section
   */
  public getFans(): Fan[] { return Array.from(this.fans.values()); }

  /**
   * Get all FanActor logic instances in this section
   */
  public getFanActors(): FanActor[] { return Array.from(this.fanActors.values()); }

  /**
   * Get FanActor at a seat position
   */
  public getFanActorAt(row: number, col: number): FanActor | undefined {
    return this.fanActors.get(`${row}-${col}`);
  }

  /**
   * Get FanActor using global grid coordinates (converts to section-local indices)
   * @param globalRow Absolute grid row
   * @param globalCol Absolute grid col
   */
  public getFanActorAtGlobal(globalRow: number, globalCol: number): FanActor | undefined {
    if (!this.sectionData) return undefined;
    const localRow = globalRow - this.sectionData.gridTop;
    const localCol = globalCol - this.sectionData.gridLeft;
    if (localRow < 0 || localCol < 0) return undefined;
    return this.getFanActorAt(localRow, localCol);
  }

  /**
   * Query fans by criteria (e.g., thirstiest for AI targeting)
   * @deprecated Use queryFanActors for game logic
   */
  public queryFans(filter: (fan: Fan) => boolean): Fan[] {
    return this.getFans().filter(filter);
  }

private lastLoggedTargetFan: number = 0; 

  /**
   * Query thirstiest FanActors for vendor targeting
   * @param count Maximum number of fans to return
   * @returns Array of fan actors with grid positions, sorted by thirst descending
   */
  public queryThirstiestFans(count: number = 10): Array<{
    fanActor: FanActor;
    fan: Fan;
    row: number;
    col: number;
    thirst: number;
  }> {
    const results: Array<{
      fanActor: FanActor;
      fan: Fan;
      row: number;
      col: number;
      thirst: number;
    }> = [];

    // Scan all rows/columns to find fans
    for (let rowIdx = 0; rowIdx < this.rowActors.length; rowIdx++) {
      const rowActor = this.rowActors[rowIdx];
      const seats = rowActor.getSeats();
      
      for (let colIdx = 0; colIdx < seats.length; colIdx++) {
        const seat = seats[colIdx];
        if (!seat.isEmpty()) {
          const fanActor = this.getFanActorAt(rowIdx, colIdx);
          let fanPos = fanActor?.getGridPosition();
          let time = this.section.scene.game.getTime();
          if(time - this.lastLoggedTargetFan > 5000){
            this.lastLoggedTargetFan = time;
            this.logger.debug(`Checking fan at row ${fanPos?.row}, col ${fanPos?.col}`);
          }
          
          if (fanActor) {
            const fan = fanActor.getFan();
            if (!fanPos) continue; // guard against undefined grid lookup
            results.push({
              fanActor,
              fan,
              row: fanPos.row,
              col: fanPos.col,
              thirst: fanActor.getThirst()
            });
          }
        }
      }
    }

    // Sort by thirst descending and take top N
    return results
      .sort((a, b) => b.thirst - a.thirst)
      .slice(0, count);
  }

  /**
   * Get fan at specific seat position
   */
  public getFanAt(row: number, col: number): Fan | undefined {
    return this.fans.get(`${row}-${col}`);
  }

  /**
   * Get wrapped StadiumSection sprite.
   */
  public getSection(): StadiumSection {
    return this.section;
  }

  /**
   * Get section identifier (A, B, C).
   */
  public getSectionId(): string {
    return this.sectionId;
  }

  /**
   * Get all row actors in this section.
   */
  public getRowActors(): SectionRowActor[] {
    return this.rowActors;
  }

  /**
   * Get section data (grid bounds, etc).
   */
  public getSectionData(): any {
    return this.sectionData;
  }

  /**
   * Get section stats for registry snapshot.
   */
  public getStats() {
    const worldPos = this.gridManager 
      ? this.gridManager.gridToWorld(this.gridRow, this.gridCol)
      : { x: 0, y: 0 };
    return {
      sectionId: this.sectionId,
      gridPosition: { row: this.gridRow, col: this.gridCol },
      worldPosition: worldPos,
      fanCount: this.fans.size
    };
  }

  /**
   * Per-frame update: drive fan stat decay and aggregate cache.
   * Environmental modifier passed in from AIManager orchestrator.
   * @param delta - Time elapsed in milliseconds
   * @param roundTime - Time relative to round start (negative = remaining, positive = elapsed)
   * @param scene - Phaser scene for FanActor updates
   * @param environmentalModifier - Environmental thirst multiplier
   */
  public update(delta: number, roundTime: number, scene?: Phaser.Scene, environmentalModifier: number = 1.0): void {
    // Check if session has started and grace period has passed
    const sessionActive = this.sessionStartTime > 0;
    const gracePeriodPassed = sessionActive && (Date.now() - this.sessionStartTime) >= gameBalance.sessionConfig.gracePeriod;
    
    // Update all fan actors (stat decay + state transitions) - ALWAYS runs
    const allFanActors = this.getFanActors();
    for (const fanActor of allFanActors) {
      fanActor.update(delta, roundTime, scene, environmentalModifier);
    }
    
    // Update cached aggregate values for performance - ALWAYS runs
    this.updateAggregateCache();
    
    // STOP HERE if session hasn't started or grace period hasn't passed
    // This prevents cluster decay and auto-wave triggering during countdown and grace period
    if (!gracePeriodPassed) {
      return;
    }
    
    // Cluster decay logic (Phase 5.1) - triggered by GameStateManager
    if (this.shouldDecayThisFrame) {
      const sessionTime = Date.now() - this.sessionStartTime;
      const progress = sessionTime / this.sessionLength;
      const interval = progress >= gameBalance.clusterDecay.lateGameThreshold
        ? gameBalance.clusterDecay.lateInterval
        : gameBalance.clusterDecay.earlyInterval;
      this.applyClusterDecay(sessionTime, interval);
      this.shouldDecayThisFrame = false; // Reset flag
    }
    
    // Auto-wave triggering (Phase 5.3)
    // Count fans ready to wave and emit initiation event if threshold met
    const previousReadyCount = this.readyFanCount;
    this.readyFanCount = allFanActors.filter(fan => fan.isWaveReady()).length;
    
    // Log readiness changes with timestamp and sample fan stats (debug)
    if (this.readyFanCount !== previousReadyCount) {
      const elapsed = this.sceneStartTime > 0 ? (Date.now() - this.sceneStartTime) / 1000 : 0;
      let sampleStats = '';
      if (this.sampleFanActor) {
        sampleStats = ` [Sample fan: happiness=${this.sampleFanActor.getHappiness().toFixed(0)}, attention=${this.sampleFanActor.getAttention().toFixed(0)}]`;
      }
      console.log(`[${elapsed.toFixed(1)}s] [Section ${this.sectionId}] Ready fan count: ${previousReadyCount} → ${this.readyFanCount}${sampleStats}`);
    }

    const gate1Pass = this.readyFanCount >= gameBalance.waveAutonomous.minReadyFans;
        
        // Get section average happiness for wave success determination
      const avgHappiness = this.happinessAgg;
      
      // Gate 2 (OPTIONAL): Section average happiness threshold
      // Uncomment to enable: prevents "gate opens but wave fails" scenario
      const sectionHappinessThreshold = gameBalance.waveAutonomous.waveStartHappinessThreshold; // Minimum section avg happiness to trigger
      const gate2Pass = avgHappiness >= sectionHappinessThreshold;
    
    if (gate1Pass && gate2Pass) {
      const now = Date.now();
      // Throttle wave initiations (cooldown per section)
      if (now - this.lastWaveInitiateTime > gameBalance.waveAutonomous.initiationCooldown) {
        this.lastWaveInitiateTime = now;
        
        // Hybrid wave triggering (Phase 5.5):
        // Gate 1: Minimum ready fans requirement (REQUIRED)
        
        
        // For now, only check Gate 1; Gate 2 can be enabled if needed
        const shouldInitiate = gate1Pass; // && gate2Pass;
        
        // Emit via actorRegistry for WaveManager to listen
        if (shouldInitiate && this.actorRegistry && typeof this.actorRegistry.emit === 'function') {
          const elapsed = this.sceneStartTime > 0 ? (Date.now() - this.sceneStartTime) / 1000 : 0;
          console.log(`[${elapsed.toFixed(1)}s] [Section ${this.sectionId}] Wave gate OPEN: ${this.readyFanCount} ready fans (threshold: ${gameBalance.waveAutonomous.minReadyFans}), avg happiness: ${avgHappiness.toFixed(1)}`);
          this.actorRegistry.emit('sectionWaveInitiate', { 
            sectionId: this.sectionId,
            readyFanCount: this.readyFanCount,
            avgHappiness: avgHappiness  // Hybrid: pass section state for wave success calculation
          });
        }
      }
    } else if (previousReadyCount >= gameBalance.waveAutonomous.minReadyFans && this.readyFanCount < gameBalance.waveAutonomous.minReadyFans) {
      // Log when we DROP below gate threshold
      const elapsed = this.sceneStartTime > 0 ? (Date.now() - this.sceneStartTime) / 1000 : 0;
      console.log(`[${elapsed.toFixed(1)}s] [Section ${this.sectionId}] Wave gate CLOSED: ${this.readyFanCount} ready fans (threshold: ${gameBalance.waveAutonomous.minReadyFans})`);
    }
  }

  /**
   * Scenery draw: no-op (handled by sprites), kept for Actor contract.
   */
  public draw(): void { /* no-op */ }

  /**
   * Update all fan stats (thirst, happiness, attention decay).
   * Called explicitly by StadiumScene during active session.
   * @param deltaTime - Time elapsed in milliseconds
   * @param environmentalModifier - Environmental thirst multiplier (< 1.0 = shade, 1.0 = normal, > 1.0 = hot/sunny)
   */
  public updateFanStats(deltaTime: number, environmentalModifier: number = 1.0): void {
    const allFanActors = this.getFanActors();
    for (const fanActor of allFanActors) {
      fanActor.updateStats(deltaTime, this.section.scene, environmentalModifier);
    }
    // Update cached aggregate values for performance
    this.updateAggregateCache();
  }

  /**
   * Get aggregate stats across all fans in this section.
   * Returns cached values updated by updateFanStats().
   */
  public getAggregateStats(): { happiness: number; thirst: number; attention: number } {
    const allFanActors = this.getFanActors();
    if (allFanActors.length === 0) {
      return { happiness: 50, thirst: 50, attention: 50 };
    }
    return {
      happiness: this.happinessAgg,
      thirst: this.thirstAgg,
      attention: this.attentionAgg
    };
  }

  /**
   * Calculate section bonus for individual fan wave participation.
   * Higher happiness and attention, lower thirst = higher bonus.
   */
  public getSectionWaveBonus(): number {
    const aggregate = this.getAggregateStats();
    return (aggregate.happiness * 0.2 + aggregate.attention * 0.2) - (aggregate.thirst * 0.15);
  }

  /**
   * Update cached aggregate stats from all fans.
   * Called internally after fan stats update.
   */
  private updateAggregateCache(): void {
    const allFanActors = this.getFanActors();
    if (allFanActors.length === 0) {
      this.happinessAgg = 50;
      this.thirstAgg = 50;
      this.attentionAgg = 50;
      return;
    }

    let totalHappiness = 0;
    let totalThirst = 0;
    let totalAttention = 0;

    for (const fanActor of allFanActors) {
      const stats = fanActor.getStats();
      totalHappiness += stats.happiness;
      totalThirst += stats.thirst;
      totalAttention += stats.attention;
    }

    this.happinessAgg = totalHappiness / allFanActors.length;
    this.thirstAgg = totalThirst / allFanActors.length;
    this.attentionAgg = totalAttention / allFanActors.length;
  }

  /**
   * Update fan visual intensity based on thirst.
   * Called each frame to update fan colors.
   */
  public updateFanIntensity(intensity?: number): void {
    const allFanActors = this.getFanActors();
    if (intensity !== undefined) {
      // Set all fans to same intensity
      for (const fanActor of allFanActors) {
        fanActor.getFan().setIntensity(intensity);
      }
    } else {
      // Use each fan's personal thirst as intensity
      for (const fanActor of allFanActors) {
        const thirst = fanActor.getThirst();
        fanActor.getFan().setIntensity(thirst / 100);
      }
    }
  }

  /**
   * Reset wave-related state on all fans before new wave calculations.
   * Clears reducedEffort flag and wave strength modifier for clean state.
   */
  public resetFanWaveState(): void {
    for (const fanActor of this.getFanActors()) {
      fanActor.reducedEffort = false;
      fanActor.setWaveStrengthModifier(0);
    }
  }

  /**
   * Calculate participation for a specific column with peer pressure logic.
   * @param columnIndex - The column index (0-7)
   * @param waveStrength - Current wave strength for strength modifier
   * @returns Array of fan objects with their participation state and intensity
   */
  public calculateColumnParticipation(
    columnIndex: number,
    waveStrength: number
  ): Array<{ fan: any; willParticipate: boolean; intensity: number }> {
    const sectionBonus = this.getSectionWaveBonus();
    const strengthModifier = (waveStrength - 50) * gameBalance.waveStrength.strengthModifier;
    const result: Array<{ fan: any; willParticipate: boolean; intensity: number }> = [];

    // First pass: roll participation for all fans in column
    let participatingCount = 0;
    const fanStates: Array<{ fan: any; willParticipate: boolean }> = [];

    for (let rowIdx = 0; rowIdx < this.rowActors.length; rowIdx++) {
      const rowActor = this.rowActors[rowIdx];
      const seats = rowActor.getSeats();
      if (columnIndex < seats.length) {
        const seat = seats[columnIndex];
        if (!seat.isEmpty()) {
          const fan = seat.getFan();
          if (fan) {
            const fanActor = this.getFanActorAt(rowIdx, columnIndex);
            if (fanActor) {
              fanActor.setWaveStrengthModifier(strengthModifier);
              const willParticipate = fanActor.rollForWaveParticipation(sectionBonus);
              fanStates.push({ fan: fanActor, willParticipate });
              if (willParticipate) {
                participatingCount++;
              }
            }
          }
        }
      }
    }

    // Second pass: apply peer pressure if threshold met
    const columnSize = fanStates.length;
    const peerPressureThreshold = gameBalance.waveStrength.peerPressureThreshold;
    const participationRate = columnSize > 0 ? participatingCount / columnSize : 0;

    if (participationRate >= peerPressureThreshold) {
      // This column succeeded, non-participating fans join at reduced effort
      for (const state of fanStates) {
        if (!state.willParticipate) {
          state.willParticipate = true;
          (state.fan as FanActor).reducedEffort = true;
        }
      }
    }

    // Build result with intensity
    for (const state of fanStates) {
      const actor = state.fan as FanActor;
      result.push({
        fan: actor,
        willParticipate: state.willParticipate,
        intensity: actor.reducedEffort ? 0.5 : 1.0,
      });
    }

    return result;
  }

  /**
   * Play wave animation for a specific column with fan participation states.
   * @param columnIndex - The column index
   * @param fanStates - Array of fans with participation info
   * @param visualState - Visual state for animation ('full', 'sputter', 'death')
   * @param waveStrength - Current wave strength (0-100) for height scaling
   */
  public async playColumnAnimation(
    columnIndex: number,
    fanStates: Array<{ fan: any; willParticipate: boolean; intensity: number }>,
    visualState: 'full' | 'sputter' | 'death' = 'full',
    waveStrength: number = 70
  ): Promise<void> {
    const baseRowDelay = gameBalance.waveTiming.rowDelay;
    const columnPromises: Promise<void>[] = [];

    // Determine animation completion time based on visual state
    let animationDuration: number;
    switch (visualState) {
      case 'sputter':
        animationDuration = 378; // 108ms up + 270ms down
        break;
      case 'death':
        animationDuration = 252; // 72ms up + 180ms down
        break;
      case 'full':
      default:
        animationDuration = 420; // 120ms up + 300ms down
        break;
    }

    let animCount = 0;
    for (let rowIdx = 0; rowIdx < this.rowActors.length; rowIdx++) {
      const state = fanStates[rowIdx];
      if (state && state.willParticipate && state.fan) {
        const delayMs = rowIdx * baseRowDelay;
        const actor = state.fan as FanActor;
        columnPromises.push(actor.playWave(delayMs, state.intensity, visualState, waveStrength));
        animCount++;
        // Call onWaveParticipation after animation completes
        const scene = (this.section as any).scene;
        if (scene) {
          scene.time.delayedCall(delayMs + animationDuration, () => {
            (state.fan as FanActor).onWaveParticipation(scene, state.willParticipate);
          });
        }
      }
    }

    // Start all fans in this column (don't await - allows smooth overlapping animations)
    Promise.all(columnPromises).catch(err => {
      // console.error('Error during column animation:', err);
    });
  }

  /**
   * Public method called by GameStateManager to flag this section for decay this frame
   */
  public flagForDecay(): void {
    this.shouldDecayThisFrame = true;
  }

  /**
   * Apply cluster-based happiness decay (Phase 5.1)
   * Selects random seed fan, finds adjacent fans, applies decay to cluster
   */
  private applyClusterDecay(sessionTime: number, intervalUsed: number): void {
    const fanActors = this.getFanActors();
    if (fanActors.length === 0) return;
    
    // Count ready fans BEFORE decay
    const readyBefore = fanActors.filter(f => f.isWaveReady()).length;
    
    // 1. Pick random seed fan
    const seed = fanActors[Math.floor(Math.random() * fanActors.length)];
    if (!this.gridManager) return;
    
    const seedGrid = seed.getGridPosition();
    if (!seedGrid) return;
    
    // 2. Find adjacent fans (radius: 2)
    const adjacent = this.getAdjacentFans(seedGrid.row, seedGrid.col, gameBalance.clusterDecay.adjacencyRadius);
    
    if (adjacent.length === 0) return;
    
    // 3. Select 3-7 fans from pool
    const clusterSize = Math.floor(
      Math.random() * (gameBalance.clusterDecay.clusterSizeMax - gameBalance.clusterDecay.clusterSizeMin + 1)
    ) + gameBalance.clusterDecay.clusterSizeMin;
    
    const cluster = adjacent
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(clusterSize, adjacent.length));
    
    // 4. Calculate decay rate based on session time
    let decayRate = gameBalance.clusterDecay.earlyDecayRate;
    if (sessionTime > gameBalance.clusterDecay.midPhaseEnd) {
      decayRate = gameBalance.clusterDecay.lateDecayRate;
    } else if (sessionTime > gameBalance.clusterDecay.earlyPhaseEnd) {
      decayRate = gameBalance.clusterDecay.midDecayRate;
    }
    
    // Attention decays at 2-3x the rate of happiness
    const attentionDecayRate = decayRate * 2.5;
    
    // 5. Apply decay to cluster (time since last decay) with randomization
    const timeSinceLastDecay = intervalUsed / 1000; // convert ms to seconds
    
    const elapsed = this.sceneStartTime > 0 ? (Date.now() - this.sceneStartTime) / 1000 : 0;
    console.log(`[${elapsed.toFixed(1)}s] [Decay] Section ${this.sectionId}: seed(${seedGrid.row},${seedGrid.col}), pool=${adjacent.length}, selected=${cluster.length}/${clusterSize}, ${readyBefore} ready before`);
    
    // Sample first 3 fans for detailed logging
    const happinessSamples: Array<{before: number, decay: number, after: number}> = [];
    
    cluster.forEach(fan => {
      // Apply decay to all fans in cluster (no state exemptions for aggressive spiral)
      // Randomize decay amounts: base ± 20% variance
      const happinessVariance = 0.8 + Math.random() * 0.4; // 0.8 - 1.2
      const attentionVariance = 0.8 + Math.random() * 0.4; // 0.8 - 1.2
      
      let happinessDecay = decayRate * timeSinceLastDecay * happinessVariance;
      let attentionDecay = attentionDecayRate * timeSinceLastDecay * attentionVariance;
      
      // Cap maximum decay per fan (attention only - happiness uncapped for aggressive spiral)
      attentionDecay = Math.min(gameBalance.clusterDecay.attentionDecayCap, attentionDecay);
      
      // Sample first 3 fans for detailed logging
      const happinessBefore = fan.getHappiness();
      
      // Apply happiness and attention decay
      fan.modifyStats({ happiness: -happinessDecay, attention: -attentionDecay });
      
      // Log sample
      if (happinessSamples.length < 3) {
        happinessSamples.push({
          before: happinessBefore,
          decay: happinessDecay,
          after: fan.getHappiness()
        });
      }
      
      // Visual feedback: scale pop + pink outline flash for debug
      const sprite = fan.getSprite();
      if (sprite && sprite.scene) {
        sprite.scene.tweens.add({
          targets: sprite,
          scaleX: 1.1,
          scaleY: 1.1,
          duration: 150,
          yoyo: true,
        });
        
        // Debug visual: pink outline flash (bright magenta)
        sprite.scene.tweens.add({
          targets: sprite,
          outlineStrokeColor: 0xFF00FF, // Bright magenta
          outlineStrokeThickness: 4,
          duration: 100,
          onComplete: () => {
            sprite.scene.tweens.add({
              targets: sprite,
              outlineStrokeColor: 0x000000, // Back to black
              outlineStrokeThickness: 0,
              duration: 200,
              
            });
          }
        });
      }
    });
    
    // Log ready count after decay for comparison
    const readyAfter = fanActors.filter(f => f.isWaveReady()).length;
    const elapsedEnd = this.sceneStartTime > 0 ? (Date.now() - this.sceneStartTime) / 1000 : 0;
    const sampleStr = happinessSamples.map(s => `${s.before.toFixed(0)}→${s.after.toFixed(0)} (-${s.decay.toFixed(1)})`).join(', ');
    console.log(`[${elapsedEnd.toFixed(1)}s] [Decay] Section ${this.sectionId}: ready fans ${readyBefore} → ${readyAfter}, samples: ${sampleStr}`);
  }

  /**
   * Get fans adjacent to given position within Manhattan radius
   */
  private getAdjacentFans(row: number, col: number, radius: number): FanActor[] {
    const fanActors = this.getFanActors();
    const adjacent: FanActor[] = [];
    
    if (!this.gridManager) return adjacent;
    
    for (const fan of fanActors) {
      const grid = fan.getGridPosition();
      
      const manhattanDist = Math.abs(grid.row - row) + Math.abs(grid.col - col);
      if (manhattanDist <= radius && manhattanDist > 0) {
        adjacent.push(fan);
      }
    }
    
    return adjacent;
  }

  /**
   * Start blink effect for auto-wave countdown (Phase 5.4)
   * Shows 3px light blue border, 5 blinks over 2.25 seconds
   */
  private startBlinkEffect(countdown: number): void {
    const scene = this.section.scene;
    if (!scene) return;

    // Get section bounds for border graphics
    const bounds = this.section.getBounds();
    
    // Create graphics object for border (will be destroyed after animation)
    const borderGraphics = scene.add.graphics();
    borderGraphics.lineStyle(3, 0x00BFFF, 1); // 3px light blue
    // bounds.x and bounds.y are already top-left corner
    borderGraphics.strokeRect(
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height
    );
    
    // Set depth to appear above section but below UI
    borderGraphics.setDepth(1000);

    // Blink animation: 5 cycles over 2.25 seconds
    // Each cycle: 225ms visible, 225ms hidden = 450ms per blink
    // Use yoyo + repeat for smooth blinking
    scene.tweens.add({
      targets: borderGraphics,
      alpha: 0,
      duration: 225,
      yoyo: true,
      repeat: 4, // 5 total blinks (initial + 4 repeats)
      ease: 'Linear',
      onComplete: () => {
        borderGraphics.destroy();
      }
    });
  }
}
