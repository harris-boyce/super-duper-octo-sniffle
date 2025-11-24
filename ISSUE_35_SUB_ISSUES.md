# Sub-Issues for Issue #35: Dual-Mode Mascot Implementation

This document contains detailed issue templates for implementing the missing functionality identified in the Issue #35 Gap Analysis. These issues should be created on GitHub and linked to parent issue #35.

**Priority Order:**
1. Issue 1: Core Mode System (HIGH PRIORITY)
2. Issue 3: Targeted Boost with Stat Trade (HIGH PRIORITY)  
3. Issue 6: Testing & Validation (HIGH PRIORITY)
4. Issue 2: Section-Wide Slow Boost (MEDIUM PRIORITY)
5. Issue 4: Mode Switching UI (MEDIUM PRIORITY)
6. Issue 5: Visual Differentiation (LOW PRIORITY)

---

## Issue 1: Core Dual-Mode System Architecture

**Priority:** HIGH  
**Estimate:** 4-6 hours  
**Labels:** `p0-critical`, `enhancement`, `mascot-system`

### Title
Core Dual-Mode System: MascotMode Enum and Base Infrastructure

### Description
**As a** developer  
**I want** a foundational dual-mode system for mascot abilities  
**So that** mascots can switch between section-wide and targeted boost modes

### Background
Issue #35 requires mascot abilities with two distinct modes:
1. Section-wide slow happiness boost
2. Targeted boost trading happiness for attention

Currently, the mascot system only supports a single cannon mode. This issue establishes the core infrastructure for mode switching.

## 📋 Acceptance Criteria

- [ ] `MascotMode` enum created with `SECTION_WIDE` and `TARGETED` values
- [ ] `MascotModeConfig` interface defined for configuration
- [ ] `Mascot` class tracks `currentMode` property
- [ ] `switchMode(mode: MascotMode)` method implemented
- [ ] `getCurrentMode()` method returns active mode
- [ ] Mode switching prevented while mascot is active
- [ ] Mode-specific cooldowns tracked separately (`sectionWideCooldown`, `targetedCooldown`)
- [ ] Configuration added to `gameBalance.ts` for both modes
- [ ] Mode change event emitted on successful switch

## 🔧 Technical Implementation

### 1. Create MascotModes Type Definitions

**File:** `apps/stadium-simulator/src/types/MascotModes.ts` (NEW)

```typescript
/**
 * Mascot ability modes for dual-mode system
 */
export enum MascotMode {
  SECTION_WIDE = 'section_wide',
  TARGETED = 'targeted'
}

/**
 * Configuration for dual-mode mascot abilities
 */
export interface MascotModeConfig {
  sectionWide: {
    happinessPerSecond: number;  // Gradual boost rate
    duration: number;             // Effect duration in ms
    cooldown: number;             // Cooldown in ms
    particleColor: number;        // Hex color for particles
    indicatorType: string;        // Visual indicator type
  };
  targeted: {
    attentionBoost: number;       // Amount to increase attention
    happinessCost: number;        // Amount to decrease happiness (TRADE)
    maxTargets: number;           // Maximum fans to target
    cooldown: number;             // Cooldown in ms
    particleColor: number;        // Hex color for particles
    indicatorType: string;        // Visual indicator type
  };
}
```

### 2. Add Configuration to gameBalance

**File:** `apps/stadium-simulator/src/config/gameBalance.ts`

Add to exports:
```typescript
export const gameBalance = {
  // ... existing config
  
  // NEW: Dual-mode mascot configuration
  mascotModes: {
    // Section-wide slow happiness boost
    sectionWide: {
      happinessPerSecond: 1,      // +1 happiness per second
      duration: 20 * 1000,         // 20 seconds
      cooldown: 60 * 1000,         // 60 second cooldown
      particleColor: 0x00FF00,     // Green particles
      indicatorType: 'wide_area'
    },
    
    // Targeted attention boost with happiness cost
    targeted: {
      attentionBoost: 20,          // +20 attention
      happinessCost: 10,           // -10 happiness (TRADE)
      maxTargets: 3,               // 1-3 fans per activation
      cooldown: 45 * 1000,         // 45 second cooldown
      particleColor: 0xFF0000,     // Red particles
      indicatorType: 'focused_beam'
    }
  }
};
```

### 3. Extend Mascot Class with Mode System

**File:** `apps/stadium-simulator/src/sprites/Mascot.ts`

Add new properties:
```typescript
export class Mascot extends BaseActorSprite {
  // NEW: Mode system properties
  private currentMode: MascotMode = MascotMode.SECTION_WIDE;  // Default mode
  private sectionWideCooldown: number = 0;
  private targetedCooldown: number = 0;
  
  // ... existing properties
}
```

Add mode management methods:
```typescript
/**
 * Switch mascot ability mode
 * Cannot switch while mascot is active
 */
public switchMode(mode: MascotMode): boolean {
  if (this.isActive) {
    console.warn(`[Mascot ${this.mascotId}] Cannot switch mode while active`);
    return false;
  }
  
  if (this.currentMode === mode) {
    // Already in this mode
    return true;
  }
  
  this.currentMode = mode;
  this.emit('modeChanged', { 
    newMode: mode, 
    mascotId: this.mascotId,
    timestamp: this.scene.time.now
  });
  
  console.log(`[Mascot ${this.mascotId}] Switched to ${mode} mode`);
  return true;
}

/**
 * Get current ability mode
 */
public getCurrentMode(): MascotMode {
  return this.currentMode;
}

/**
 * Get cooldown for specific mode
 */
public getModeCooldown(mode: MascotMode): number {
  return mode === MascotMode.SECTION_WIDE 
    ? this.sectionWideCooldown 
    : this.targetedCooldown;
}

/**
 * Check if specific mode is ready (not in cooldown)
 */
public isModeReady(mode: MascotMode): boolean {
  return this.getModeCooldown(mode) <= 0;
}
```

Update cooldowns in update method:
```typescript
public update(time: number, delta: number): void {
  // ... existing update logic
  
  // Update mode-specific cooldowns
  if (this.sectionWideCooldown > 0) {
    this.sectionWideCooldown = Math.max(0, this.sectionWideCooldown - delta);
  }
  
  if (this.targetedCooldown > 0) {
    this.targetedCooldown = Math.max(0, this.targetedCooldown - delta);
  }
}
```

## 🧪 Test Cases

### Test 1: Mode Enum and Types
```typescript
test('MascotMode enum has correct values', () => {
  expect(MascotMode.SECTION_WIDE).toBe('section_wide');
  expect(MascotMode.TARGETED).toBe('targeted');
});
```

### Test 2: Mode Switching
```typescript
test('can switch between modes when inactive', () => {
  const mascot = new Mascot(scene, 0, 0);
  
  expect(mascot.getCurrentMode()).toBe(MascotMode.SECTION_WIDE);
  
  const switched = mascot.switchMode(MascotMode.TARGETED);
  expect(switched).toBe(true);
  expect(mascot.getCurrentMode()).toBe(MascotMode.TARGETED);
});
```

### Test 3: Mode Switching Prevention
```typescript
test('cannot switch modes while active', () => {
  const mascot = new Mascot(scene, 0, 0);
  const section = createMockSection();
  
  mascot.activateInSection(section);  // Activate mascot
  
  const switched = mascot.switchMode(MascotMode.TARGETED);
  expect(switched).toBe(false);
  expect(mascot.getCurrentMode()).toBe(MascotMode.SECTION_WIDE);  // Unchanged
});
```

### Test 4: Mode Change Event
```typescript
test('emits modeChanged event on successful switch', () => {
  const mascot = new Mascot(scene, 0, 0);
  let eventFired = false;
  let eventData = null;
  
  mascot.on('modeChanged', (data) => {
    eventFired = true;
    eventData = data;
  });
  
  mascot.switchMode(MascotMode.TARGETED);
  
  expect(eventFired).toBe(true);
  expect(eventData.newMode).toBe(MascotMode.TARGETED);
});
```

### Test 5: Separate Cooldowns
```typescript
test('tracks cooldowns separately for each mode', () => {
  const mascot = new Mascot(scene, 0, 0);
  
  // Manually set cooldowns for testing
  mascot['sectionWideCooldown'] = 30000;
  mascot['targetedCooldown'] = 0;
  
  expect(mascot.isModeReady(MascotMode.SECTION_WIDE)).toBe(false);
  expect(mascot.isModeReady(MascotMode.TARGETED)).toBe(true);
  expect(mascot.getModeCooldown(MascotMode.SECTION_WIDE)).toBe(30000);
  expect(mascot.getModeCooldown(MascotMode.TARGETED)).toBe(0);
});
```

### Test 6: Configuration Exists
```typescript
test('gameBalance contains mascotModes configuration', () => {
  expect(gameBalance.mascotModes).toBeDefined();
  expect(gameBalance.mascotModes.sectionWide).toBeDefined();
  expect(gameBalance.mascotModes.targeted).toBeDefined();
  
  expect(gameBalance.mascotModes.sectionWide.happinessPerSecond).toBeGreaterThan(0);
  expect(gameBalance.mascotModes.targeted.attentionBoost).toBeGreaterThan(0);
  expect(gameBalance.mascotModes.targeted.happinessCost).toBeGreaterThan(0);
});
```

## 📁 Files to Create

- `apps/stadium-simulator/src/types/MascotModes.ts` - Mode enum and interface definitions

## 📁 Files to Modify

- `apps/stadium-simulator/src/sprites/Mascot.ts` - Add mode properties and methods
- `apps/stadium-simulator/src/config/gameBalance.ts` - Add mascotModes configuration
- `apps/stadium-simulator/src/__tests__/sprites/Mascot.test.ts` - Add mode system tests

## 🔗 Dependencies

**Depends On:** None (foundational issue)  
**Blocks:**
- Issue 2: Section-Wide Slow Boost
- Issue 3: Targeted Boost with Stat Trade
- Issue 4: Mode Switching UI

## 📊 Estimation

**Story Points:** 5  
**Time Estimate:** 4-6 hours  
**Complexity:** Medium

## 🏷️ Suggested Labels

- `p0-critical` - Foundation for Issue #35
- `enhancement` - New feature
- `mascot-system` - Part of mascot epic
- `copilot` - Can be implemented by Copilot

## 📝 Definition of Done

- [ ] All acceptance criteria met
- [ ] All test cases pass
- [ ] Type definitions exported correctly
- [ ] Configuration integrated with existing gameBalance
- [ ] Mode switching logic tested manually
- [ ] Events fire correctly
- [ ] Code reviewed and approved
- [ ] No breaking changes to existing cannon system

## 🔍 Testing Checklist

- [ ] MascotMode enum accessible from imports
- [ ] Mode switching works when inactive
- [ ] Mode switching blocked when active
- [ ] Cooldowns tracked independently
- [ ] Events emitted on mode change
- [ ] Configuration values loaded correctly
- [ ] No TypeScript errors
- [ ] No performance regressions

## 📚 Additional Context

This issue provides the foundation for Issue #35's dual-mode mascot system. It does NOT implement the actual abilities (section-wide boost or targeted boost) - those are separate issues. This focuses solely on:

1. Mode infrastructure (enum, types, config)
2. Mode switching logic
3. Cooldown tracking per mode

**Parent Issue:** #35 - Mascot: Section-wide mode and targeted boost implementation  
**Epic:** #34 - Mascot System & Mechanics  
**Gap Analysis:** See `ISSUE_35_GAP_ANALYSIS.md` Phase 1

---

## Issue 2: Section-Wide Slow Boost Implementation

**Priority:** MEDIUM  
**Estimate:** 2-3 hours  
**Labels:** `p1-high`, `enhancement`, `mascot-system`

### Title
Section-Wide Slow Boost: Gradual Happiness Increase to All Fans

### Description
**As a** player  
**I want** to activate a section-wide happiness boost on all fans  
**So that** I can improve overall section morale gradually

### Background
Issue #35 specifies a "section-wide slow boost to happiness" as one of two mascot abilities. This boost should:
- Apply gradual happiness increase (+1/sec for 20 seconds)
- Affect ALL fans in the mascot's assigned section
- Run for a duration (not instantaneous)
- Be a separate activation from targeted mode

## 📋 Acceptance Criteria

- [ ] `activateSectionWideBoost()` method implemented in Mascot class
- [ ] Boost applies +1 happiness per second to all section fans
- [ ] Effect lasts for configured duration (20 seconds default)
- [ ] Only activates when mode is `SECTION_WIDE` and cooldown is ready
- [ ] Sets `sectionWideCooldown` after activation (60 seconds default)
- [ ] Emits `sectionWideActivated` event on start
- [ ] Emits `sectionWideCompleted` event on finish
- [ ] Effect can be tracked and cancelled if needed
- [ ] Happiness changes visible in real-time during effect
- [ ] Works correctly with existing stat bounds (0-100)

## 🔧 Technical Implementation

### 1. Create SectionWideBoostEffect System

**File:** `apps/stadium-simulator/src/systems/SectionWideBoostEffect.ts` (NEW)

```typescript
import type { StadiumSection } from '@/sprites/StadiumSection';
import { gameBalance } from '@/config/gameBalance';

/**
 * Sustained section-wide happiness boost effect
 * Applies gradual happiness increase to all fans in a section over time
 */
export class SectionWideBoostEffect {
  private section: StadiumSection;
  private duration: number;
  private happinessPerSecond: number;
  private elapsed: number = 0;
  private active: boolean = false;
  private updateInterval: NodeJS.Timeout | null = null;
  
  constructor(
    section: StadiumSection,
    duration: number = gameBalance.mascotModes.sectionWide.duration,
    happinessPerSecond: number = gameBalance.mascotModes.sectionWide.happinessPerSecond
  ) {
    this.section = section;
    this.duration = duration;
    this.happinessPerSecond = happinessPerSecond;
  }
  
  /**
   * Start the sustained boost effect
   */
  public start(): void {
    if (this.active) {
      console.warn('[SectionWideBoost] Effect already active');
      return;
    }
    
    this.active = true;
    this.elapsed = 0;
    
    // Apply boost every second
    this.updateInterval = setInterval(() => {
      this.applyBoost();
      this.elapsed += 1000;
      
      if (this.elapsed >= this.duration) {
        this.complete();
      }
    }, 1000);
    
    console.log(`[SectionWideBoost] Started ${this.duration}ms effect (+${this.happinessPerSecond}/sec)`);
  }
  
  /**
   * Apply happiness boost to all fans in section
   */
  private applyBoost(): void {
    const fans = this.section.getFans();
    
    fans.forEach(fan => {
      const stats = fan.getStats();
      fan.modifyStats({
        happiness: Math.min(100, stats.happiness + this.happinessPerSecond)
      });
    });
    
    console.log(`[SectionWideBoost] Applied +${this.happinessPerSecond} happiness to ${fans.length} fans`);
  }
  
  /**
   * Complete the effect (duration elapsed)
   */
  private complete(): void {
    this.stop();
    console.log(`[SectionWideBoost] Completed after ${this.elapsed}ms`);
  }
  
  /**
   * Stop the effect (cancellation or completion)
   */
  public stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.active = false;
  }
  
  /**
   * Check if effect is currently active
   */
  public isActive(): boolean {
    return this.active;
  }
  
  /**
   * Get elapsed time in milliseconds
   */
  public getElapsed(): number {
    return this.elapsed;
  }
  
  /**
   * Get remaining time in milliseconds
   */
  public getRemaining(): number {
    return Math.max(0, this.duration - this.elapsed);
  }
}
```

### 2. Add Activation Method to Mascot

**File:** `apps/stadium-simulator/src/sprites/Mascot.ts`

Add property:
```typescript
private activeSectionWideEffect: SectionWideBoostEffect | null = null;
```

Add method:
```typescript
/**
 * Activate section-wide happiness boost
 * Applies gradual happiness increase to all fans in section
 */
public activateSectionWideBoost(): boolean {
  // Validate preconditions
  if (!this.assignedSection) {
    console.warn(`[Mascot ${this.mascotId}] No assigned section for section-wide boost`);
    return false;
  }
  
  if (this.currentMode !== MascotMode.SECTION_WIDE) {
    console.warn(`[Mascot ${this.mascotId}] Must be in SECTION_WIDE mode`);
    return false;
  }
  
  if (this.sectionWideCooldown > 0) {
    console.warn(`[Mascot ${this.mascotId}] Section-wide boost on cooldown (${this.sectionWideCooldown}ms)`);
    return false;
  }
  
  if (this.activeSectionWideEffect?.isActive()) {
    console.warn(`[Mascot ${this.mascotId}] Section-wide boost already active`);
    return false;
  }
  
  // Create and start effect
  this.activeSectionWideEffect = new SectionWideBoostEffect(
    this.assignedSection,
    gameBalance.mascotModes.sectionWide.duration,
    gameBalance.mascotModes.sectionWide.happinessPerSecond
  );
  
  this.activeSectionWideEffect.start();
  
  // Set cooldown
  this.sectionWideCooldown = gameBalance.mascotModes.sectionWide.cooldown;
  
  // Emit event
  this.emit('sectionWideActivated', {
    mascotId: this.mascotId,
    sectionId: this.assignedSection.getId(),
    duration: gameBalance.mascotModes.sectionWide.duration,
    happinessPerSecond: gameBalance.mascotModes.sectionWide.happinessPerSecond,
    timestamp: this.scene.time.now
  });
  
  // Schedule completion event
  this.scene.time.delayedCall(
    gameBalance.mascotModes.sectionWide.duration,
    () => {
      this.emit('sectionWideCompleted', {
        mascotId: this.mascotId,
        sectionId: this.assignedSection?.getId(),
        timestamp: this.scene.time.now
      });
    }
  );
  
  console.log(`[Mascot ${this.mascotId}] Section-wide boost activated`);
  return true;
}

/**
 * Get active section-wide effect (if any)
 */
public getActiveSectionWideEffect(): SectionWideBoostEffect | null {
  return this.activeSectionWideEffect;
}
```

## 🧪 Test Cases

### Test 1: Activation Success
```typescript
test('activateSectionWideBoost succeeds with valid conditions', () => {
  const mascot = new Mascot(scene, 0, 0);
  const section = createMockSection();
  
  mascot.assignToSection(section);
  mascot.switchMode(MascotMode.SECTION_WIDE);
  
  const result = mascot.activateSectionWideBoost();
  expect(result).toBe(true);
  expect(mascot.getActiveSectionWideEffect()).not.toBeNull();
});
```

### Test 2: Gradual Happiness Increase
```typescript
test('section-wide boost gradually increases happiness', async () => {
  const mascot = new Mascot(scene, 0, 0);
  const section = createMockSection();
  const fans = section.getFans();
  
  mascot.assignToSection(section);
  mascot.switchMode(MascotMode.SECTION_WIDE);
  
  const initialHappiness = fans[0].getStats().happiness;
  mascot.activateSectionWideBoost();
  
  // Wait 3 seconds
  await wait(3000);
  
  const finalHappiness = fans[0].getStats().happiness;
  
  // Should have increased by ~3 (1 per second * 3 seconds)
  expect(finalHappiness - initialHappiness).toBeCloseTo(3, 0);
});
```

### Test 3: Affects All Fans
```typescript
test('boost affects all fans in section', async () => {
  const mascot = new Mascot(scene, 0, 0);
  const section = createMockSection();
  const fans = section.getFans();
  
  mascot.assignToSection(section);
  mascot.switchMode(MascotMode.SECTION_WIDE);
  mascot.activateSectionWideBoost();
  
  await wait(2000);
  
  // All fans should have increased happiness
  fans.forEach(fan => {
    const stats = fan.getStats();
    expect(stats.happiness).toBeGreaterThan(0);
  });
});
```

### Test 4: Cooldown Applied
```typescript
test('sets cooldown after activation', () => {
  const mascot = new Mascot(scene, 0, 0);
  const section = createMockSection();
  
  mascot.assignToSection(section);
  mascot.switchMode(MascotMode.SECTION_WIDE);
  
  expect(mascot.getModeCooldown(MascotMode.SECTION_WIDE)).toBe(0);
  
  mascot.activateSectionWideBoost();
  
  expect(mascot.getModeCooldown(MascotMode.SECTION_WIDE)).toBeGreaterThan(0);
  expect(mascot.isModeReady(MascotMode.SECTION_WIDE)).toBe(false);
});
```

### Test 5: Wrong Mode Rejection
```typescript
test('rejects activation when in targeted mode', () => {
  const mascot = new Mascot(scene, 0, 0);
  const section = createMockSection();
  
  mascot.assignToSection(section);
  mascot.switchMode(MascotMode.TARGETED);  // Wrong mode
  
  const result = mascot.activateSectionWideBoost();
  expect(result).toBe(false);
  expect(mascot.getActiveSectionWideEffect()).toBeNull();
});
```

### Test 6: Events Emitted
```typescript
test('emits sectionWideActivated and sectionWideCompleted events', async () => {
  const mascot = new Mascot(scene, 0, 0);
  const section = createMockSection();
  
  let activatedFired = false;
  let completedFired = false;
  
  mascot.on('sectionWideActivated', () => activatedFired = true);
  mascot.on('sectionWideCompleted', () => completedFired = true);
  
  mascot.assignToSection(section);
  mascot.switchMode(MascotMode.SECTION_WIDE);
  mascot.activateSectionWideBoost();
  
  expect(activatedFired).toBe(true);
  
  // Wait for duration + buffer
  await wait(gameBalance.mascotModes.sectionWide.duration + 500);
  
  expect(completedFired).toBe(true);
});
```

## 📁 Files to Create

- `apps/stadium-simulator/src/systems/SectionWideBoostEffect.ts` - Sustained boost effect system

## 📁 Files to Modify

- `apps/stadium-simulator/src/sprites/Mascot.ts` - Add activateSectionWideBoost method
- `apps/stadium-simulator/src/__tests__/sprites/Mascot.test.ts` - Add section-wide boost tests
- `apps/stadium-simulator/src/__tests__/systems/SectionWideBoostEffect.test.ts` - Create if needed

## 🔗 Dependencies

**Depends On:**
- Issue 1: Core Dual-Mode System Architecture

**Blocks:** None

## 📊 Estimation

**Story Points:** 3  
**Time Estimate:** 2-3 hours  
**Complexity:** Low-Medium

## 🏷️ Suggested Labels

- `p1-high` - Core feature for Issue #35
- `enhancement` - New feature
- `mascot-system` - Part of mascot epic
- `copilot` - Can be implemented by Copilot

## 📝 Definition of Done

- [ ] All acceptance criteria met
- [ ] All test cases pass
- [ ] Sustained effect applies over time correctly
- [ ] Cooldown system works
- [ ] Events fire at correct times
- [ ] Happiness increases visible in-game
- [ ] No stat bound violations (stays 0-100)
- [ ] Code reviewed and approved

## 📚 Additional Context

This is one of the two core abilities required by Issue #35. It implements the "section-wide slow boost" part of the specification.

**Key Design Points:**
- Uses `setInterval` for gradual application (1/sec)
- Separate `SectionWideBoostEffect` class for clean separation
- Effect can be tracked and cancelled if needed
- Duration and boost rate configurable via `gameBalance`

**Parent Issue:** #35 - Mascot: Section-wide mode and targeted boost implementation  
**Epic:** #34 - Mascot System & Mechanics  
**Gap Analysis:** See `ISSUE_35_GAP_ANALYSIS.md` Phase 2

---

## Issue 3: Targeted Boost with Stat Trade Implementation

**Priority:** HIGH  
**Estimate:** 2-3 hours  
**Labels:** `p0-critical`, `enhancement`, `mascot-system`

### Title
Targeted Boost: Attention Increase with Happiness Trade-Off

### Description
**As a** player  
**I want** to boost attention of specific fans at the cost of their happiness  
**So that** I can strategically re-engage fans right before a wave

### Background
Issue #35 specifies "targeted boosts trading happiness for attention" as the second mascot ability. This boost should:
- Increase attention significantly (+20)
- Decrease happiness as a trade-off (-10)
- Target specific fans (1-3 fans)
- Demonstrate the cost/benefit mechanic

## 📋 Acceptance Criteria

- [ ] `activateTargetedBoost(targets?: Fan[])` method implemented
- [ ] Boost increases attention by configured amount (+20 default)
- [ ] Boost decreases happiness by configured amount (-10 default)
- [ ] Auto-selects targets if not provided (using existing targeting AI)
- [ ] Only activates when mode is `TARGETED` and cooldown is ready
- [ ] Sets `targetedCooldown` after activation (45 seconds default)
- [ ] Emits `targetedBoostActivated` event with target details
- [ ] Respects stat bounds (attention/happiness stay 0-100)
- [ ] Maximum targets configurable (1-3 default)
- [ ] Trade-off mechanic clearly visible in stats

## 🔧 Technical Implementation

### 1. Add Targeted Boost Method to Mascot

**File:** `apps/stadium-simulator/src/sprites/Mascot.ts`

```typescript
/**
 * Activate targeted boost: increase attention, decrease happiness
 * Demonstrates stat trade-off mechanic
 */
public activateTargetedBoost(targets?: Fan[]): boolean {
  // Validate preconditions
  if (!this.assignedSection) {
    console.warn(`[Mascot ${this.mascotId}] No assigned section for targeted boost`);
    return false;
  }
  
  if (this.currentMode !== MascotMode.TARGETED) {
    console.warn(`[Mascot ${this.mascotId}] Must be in TARGETED mode`);
    return false;
  }
  
  if (this.targetedCooldown > 0) {
    console.warn(`[Mascot ${this.mascotId}] Targeted boost on cooldown (${this.targetedCooldown}ms)`);
    return false;
  }
  
  // Select targets if not provided
  const selectedTargets = targets || this.selectTargetsForBoost();
  
  if (selectedTargets.length === 0) {
    console.warn(`[Mascot ${this.mascotId}] No valid targets for targeted boost`);
    return false;
  }
  
  // Limit to max targets
  const maxTargets = gameBalance.mascotModes.targeted.maxTargets;
  const finalTargets = selectedTargets.slice(0, maxTargets);
  
  // Apply stat trade: +attention, -happiness
  const attentionBoost = gameBalance.mascotModes.targeted.attentionBoost;
  const happinessCost = gameBalance.mascotModes.targeted.happinessCost;
  
  finalTargets.forEach(fan => {
    const stats = fan.getStats();
    fan.modifyStats({
      attention: Math.min(100, stats.attention + attentionBoost),
      happiness: Math.max(0, stats.happiness - happinessCost)  // TRADE
    });
  });
  
  // Set cooldown
  this.targetedCooldown = gameBalance.mascotModes.targeted.cooldown;
  
  // Emit event
  this.emit('targetedBoostActivated', {
    mascotId: this.mascotId,
    targets: finalTargets,
    targetCount: finalTargets.length,
    attentionBoost,
    happinessCost,
    timestamp: this.scene.time.now
  });
  
  console.log(`[Mascot ${this.mascotId}] Targeted boost applied to ${finalTargets.length} fans (+${attentionBoost} ATT, -${happinessCost} HAP)`);
  return true;
}

/**
 * Select targets for targeted boost using existing targeting AI
 * Prefers disinterested fans, respects depth factor
 */
private selectTargetsForBoost(): Fan[] {
  if (!this.assignedSection) {
    return [];
  }
  
  // Reuse existing targeting AI logic
  return this.targetingAI.selectCatchingFans(
    this.assignedSection,
    this
  );
}
```

## 🧪 Test Cases

### Test 1: Activation Success
```typescript
test('activateTargetedBoost succeeds with valid conditions', () => {
  const mascot = new Mascot(scene, 0, 0);
  const section = createMockSection();
  
  mascot.assignToSection(section);
  mascot.switchMode(MascotMode.TARGETED);
  
  const result = mascot.activateTargetedBoost();
  expect(result).toBe(true);
});
```

### Test 2: Attention Increases
```typescript
test('targeted boost increases attention', () => {
  const mascot = new Mascot(scene, 0, 0);
  const section = createMockSection();
  const fan = section.getFans()[0];
  
  fan.setStats({ attention: 30, happiness: 60, thirst: 40 });
  
  mascot.assignToSection(section);
  mascot.switchMode(MascotMode.TARGETED);
  mascot.activateTargetedBoost([fan]);
  
  const finalStats = fan.getStats();
  expect(finalStats.attention).toBe(50);  // 30 + 20
});
```

### Test 3: Happiness Decreases (TRADE)
```typescript
test('targeted boost decreases happiness (trade-off)', () => {
  const mascot = new Mascot(scene, 0, 0);
  const section = createMockSection();
  const fan = section.getFans()[0];
  
  fan.setStats({ attention: 30, happiness: 60, thirst: 40 });
  
  mascot.assignToSection(section);
  mascot.switchMode(MascotMode.TARGETED);
  mascot.activateTargetedBoost([fan]);
  
  const finalStats = fan.getStats();
  expect(finalStats.happiness).toBe(50);  // 60 - 10 (TRADE)
});
```

### Test 4: Stat Trade Demonstrated
```typescript
test('stat trade: attention up, happiness down', () => {
  const mascot = new Mascot(scene, 0, 0);
  const section = createMockSection();
  const fan = section.getFans()[0];
  
  const initialStats = fan.getStats();
  
  mascot.assignToSection(section);
  mascot.switchMode(MascotMode.TARGETED);
  mascot.activateTargetedBoost([fan]);
  
  const finalStats = fan.getStats();
  
  // Attention should increase
  expect(finalStats.attention).toBeGreaterThan(initialStats.attention);
  
  // Happiness should decrease (TRADE)
  expect(finalStats.happiness).toBeLessThan(initialStats.happiness);
});
```

### Test 5: Respects Stat Bounds
```typescript
test('respects 0-100 bounds for stats', () => {
  const mascot = new Mascot(scene, 0, 0);
  const section = createMockSection();
  const fan = section.getFans()[0];
  
  // Edge case: high attention, low happiness
  fan.setStats({ attention: 95, happiness: 5, thirst: 40 });
  
  mascot.assignToSection(section);
  mascot.switchMode(MascotMode.TARGETED);
  mascot.activateTargetedBoost([fan]);
  
  const finalStats = fan.getStats();
  
  // Should cap at 100
  expect(finalStats.attention).toBe(100);
  
  // Should floor at 0
  expect(finalStats.happiness).toBe(0);
});
```

### Test 6: Max Targets Limit
```typescript
test('limits to maxTargets configuration', () => {
  const mascot = new Mascot(scene, 0, 0);
  const section = createMockSection();
  const fans = section.getFans().slice(0, 5);  // 5 fans
  
  let eventTargets = null;
  mascot.on('targetedBoostActivated', (data) => {
    eventTargets = data.targets;
  });
  
  mascot.assignToSection(section);
  mascot.switchMode(MascotMode.TARGETED);
  mascot.activateTargetedBoost(fans);
  
  // Should limit to maxTargets (3 by default)
  expect(eventTargets.length).toBe(3);
});
```

### Test 7: Auto-Target Selection
```typescript
test('auto-selects targets when none provided', () => {
  const mascot = new Mascot(scene, 0, 0);
  const section = createMockSection();
  
  mascot.assignToSection(section);
  mascot.switchMode(MascotMode.TARGETED);
  
  const result = mascot.activateTargetedBoost();  // No targets provided
  expect(result).toBe(true);
});
```

### Test 8: Cooldown Applied
```typescript
test('sets cooldown after activation', () => {
  const mascot = new Mascot(scene, 0, 0);
  const section = createMockSection();
  
  mascot.assignToSection(section);
  mascot.switchMode(MascotMode.TARGETED);
  
  expect(mascot.getModeCooldown(MascotMode.TARGETED)).toBe(0);
  
  mascot.activateTargetedBoost();
  
  expect(mascot.getModeCooldown(MascotMode.TARGETED)).toBeGreaterThan(0);
  expect(mascot.isModeReady(MascotMode.TARGETED)).toBe(false);
});
```

## 📁 Files to Modify

- `apps/stadium-simulator/src/sprites/Mascot.ts` - Add activateTargetedBoost method
- `apps/stadium-simulator/src/__tests__/sprites/Mascot.test.ts` - Add targeted boost tests

## 🔗 Dependencies

**Depends On:**
- Issue 1: Core Dual-Mode System Architecture

**Blocks:** None

## 📊 Estimation

**Story Points:** 3  
**Time Estimate:** 2-3 hours  
**Complexity:** Low-Medium

## 🏷️ Suggested Labels

- `p0-critical` - Core feature for Issue #35
- `enhancement` - New feature
- `mascot-system` - Part of mascot epic
- `gameplay` - Affects core mechanics
- `copilot` - Can be implemented by Copilot

## 📝 Definition of Done

- [ ] All acceptance criteria met
- [ ] All test cases pass
- [ ] Stat trade mechanic works correctly
- [ ] Attention increases, happiness decreases
- [ ] Stat bounds respected (0-100)
- [ ] Cooldown system works
- [ ] Event fires with correct data
- [ ] Auto-targeting works
- [ ] Code reviewed and approved

## 📚 Additional Context

This is the second core ability required by Issue #35. It implements the "targeted boosts trading happiness for attention" part of the specification.

**Key Design Points:**
- **Trade-off mechanic:** Explicitly decreases happiness while increasing attention
- Reuses existing `targetingAI` for auto-selection
- Instant application (not sustained like section-wide)
- Demonstrates strategic choice: short-term gain vs long-term cost

**Strategic Depth:**
- Use when wave is imminent (need attention NOW)
- Accept happiness penalty for immediate engagement
- Player must balance short-term and long-term goals

**Parent Issue:** #35 - Mascot: Section-wide mode and targeted boost implementation  
**Epic:** #34 - Mascot System & Mechanics  
**Gap Analysis:** See `ISSUE_35_GAP_ANALYSIS.md` Phase 3

---


## Issue 4: Mode Switching UI and Controls

**Priority:** MEDIUM  
**Estimate:** 2 hours  
**Labels:** `p1-high`, `enhancement`, `UI`, `mascot-system`

### Title
Mode Switching UI: Visual Indicators and User Controls

### Description
**As a** player  
**I want** clear visual indicators and controls for mascot mode switching  
**So that** I understand which mode is active and can switch easily

## 📋 Acceptance Criteria

- [ ] Visual indicator shows current mode (section-wide vs targeted)
- [ ] Keyboard controls for mode switching (e.g., 'M' key)
- [ ] Mode indicator updates in real-time on switch
- [ ] Cannot switch modes while mascot is active (visual feedback)
- [ ] Cooldown status visible for each mode
- [ ] Mode icons/colors distinct (green for section-wide, red for targeted)
- [ ] Tooltips explain each mode's effect
- [ ] Mode switching plays sound effect (optional)

## 🔧 Technical Implementation

Add to StadiumScene or UI layer:
```typescript
// Mode indicator UI element
private mascotModeIndicator: Phaser.GameObjects.Text;

// Update on mode change
this.mascot.on('modeChanged', (data) => {
  this.updateModeIndicator(data.newMode);
});

private updateModeIndicator(mode: MascotMode): void {
  const color = mode === MascotMode.SECTION_WIDE ? '#00FF00' : '#FF0000';
  const text = mode === MascotMode.SECTION_WIDE ? 'SECTION BOOST' : 'TARGETED BOOST';
  this.mascotModeIndicator.setText(text);
  this.mascotModeIndicator.setColor(color);
}
```

## 📁 Files to Modify

- `apps/stadium-simulator/src/scenes/StadiumScene.ts` - Add UI elements and controls

## 🔗 Dependencies

**Depends On:**
- Issue 1: Core Dual-Mode System Architecture

## 📊 Estimation

**Story Points:** 2  
**Time Estimate:** 2 hours  
**Complexity:** Low

---

## Issue 5: Mode-Specific Visual Differentiation

**Priority:** LOW  
**Estimate:** 2-3 hours  
**Labels:** `p2-medium`, `enhancement`, `visual`, `mascot-system`

### Title
Visual Differentiation: Mode-Specific Particles and Indicators

### Description
**As a** player  
**I want** different visual effects for each mascot mode  
**So that** I can immediately recognize which ability is active

## 📋 Acceptance Criteria

- [ ] Section-wide mode uses green particles
- [ ] Targeted mode uses red particles
- [ ] Section-wide shows wide-area indicator
- [ ] Targeted mode shows focused beam indicator
- [ ] Particle colors match configuration
- [ ] Visual effects play at correct timing
- [ ] No visual conflicts between modes
- [ ] Effects are performant (no FPS drop)

## 🔧 Technical Implementation

Extend particle system to use mode-specific colors:
```typescript
private spawnModeParticles(mode: MascotMode): void {
  const color = gameBalance.mascotModes[
    mode === MascotMode.SECTION_WIDE ? 'sectionWide' : 'targeted'
  ].particleColor;
  
  // Create particles with appropriate color
  this.particles.setTint(color);
}
```

## 📁 Files to Modify

- `apps/stadium-simulator/src/scenes/StadiumScene.ts` - Visual effects
- `apps/stadium-simulator/src/components/CatchParticles.ts` - Color configuration

## 🔗 Dependencies

**Depends On:**
- Issue 1: Core Dual-Mode System Architecture
- Issue 2: Section-Wide Slow Boost
- Issue 3: Targeted Boost

## 📊 Estimation

**Story Points:** 2  
**Time Estimate:** 2-3 hours  
**Complexity:** Low-Medium

---

## Issue 6: Comprehensive Testing and Validation

**Priority:** HIGH  
**Estimate:** 3-4 hours  
**Labels:** `p0-critical`, `testing`, `mascot-system`

### Title
Dual-Mode System: Comprehensive Testing & Validation

### Description
**As a** developer  
**I want** comprehensive test coverage for the dual-mode mascot system  
**So that** all functionality works correctly and regressions are prevented

## 📋 Acceptance Criteria

- [ ] Unit tests for mode switching logic
- [ ] Integration tests for both abilities
- [ ] Test coverage >90% for new code
- [ ] Mode switching tests pass
- [ ] Section-wide boost tests pass
- [ ] Targeted boost tests pass
- [ ] Stat trade mechanic validated
- [ ] Cooldown system tested
- [ ] Event emission verified
- [ ] Performance benchmarks pass
- [ ] Manual testing completed
- [ ] No regressions in existing features

## 🧪 Test Categories

### 1. Mode Switching Tests
- Can switch when inactive
- Cannot switch when active
- Events fire correctly
- Cooldowns independent

### 2. Section-Wide Boost Tests
- Gradual happiness increase
- Affects all fans
- Duration correctness
- Cooldown applied
- Event timing

### 3. Targeted Boost Tests
- Attention increases
- Happiness decreases (TRADE)
- Stat bounds respected
- Target selection
- Cooldown applied

### 4. Integration Tests
- Can activate both abilities in sequence
- Mode-specific cooldowns work independently
- Visual feedback displays correctly
- No stat corruption
- Performance acceptable

### 5. Edge Cases
- Stat bounds (0 and 100)
- Multiple rapid mode switches
- Activation during cooldown
- Missing section assignment
- Empty target list

## 📁 Files to Create/Modify

- `apps/stadium-simulator/src/__tests__/sprites/Mascot.test.ts` - Extend with dual-mode tests
- `apps/stadium-simulator/src/__tests__/systems/SectionWideBoostEffect.test.ts` - Create if needed
- `apps/stadium-simulator/MANUAL_TESTING.md` - Add dual-mode test scenarios

## 🔗 Dependencies

**Depends On:**
- Issue 1: Core Dual-Mode System Architecture
- Issue 2: Section-Wide Slow Boost
- Issue 3: Targeted Boost

**Blocks:** Issue #35 completion

## 📊 Estimation

**Story Points:** 3  
**Time Estimate:** 3-4 hours  
**Complexity:** Medium

## 📝 Definition of Done

- [ ] All test suites pass
- [ ] Code coverage >90%
- [ ] Manual testing checklist completed
- [ ] No performance regressions
- [ ] All edge cases handled
- [ ] Documentation updated

---

## Summary of Sub-Issues

| Issue | Title | Priority | Estimate | Status |
|-------|-------|----------|----------|--------|
| 1 | Core Dual-Mode System | HIGH | 4-6h | Ready to Start |
| 2 | Section-Wide Slow Boost | MEDIUM | 2-3h | Blocked by #1 |
| 3 | Targeted Boost with Stat Trade | HIGH | 2-3h | Blocked by #1 |
| 4 | Mode Switching UI | MEDIUM | 2h | Blocked by #1 |
| 5 | Visual Differentiation | LOW | 2-3h | Blocked by #1, #2, #3 |
| 6 | Testing & Validation | HIGH | 3-4h | Blocked by #1, #2, #3 |
| **Total** | | | **15-21h** | |

## Implementation Sequence

**Week 1:**
1. Day 1: Issue 1 (Core Mode System) - 4-6 hours
2. Day 2: Issue 2 (Section-Wide Boost) + Issue 3 (Targeted Boost) - 4-6 hours
3. Day 3: Issue 4 (Mode Switching UI) + Issue 5 (Visual Differentiation) - 4-5 hours

**Week 2:**
1. Day 4-5: Issue 6 (Testing & Validation) - 3-4 hours

## Creating These Issues on GitHub

To create these sub-issues on GitHub:

1. **Navigate to:** https://github.com/harris-boyce/super-duper-octo-sniffle/issues/new

2. **For each issue above:**
   - Copy the Title section as the issue title
   - Copy the entire Description + implementation sections as the issue body
   - Add suggested labels
   - Link to parent issue #35 in the description
   - Set milestone if applicable
   - Assign to appropriate developer/AI agent

3. **Link to parent issue #35:**
   Add this to each issue description:
   ```
   **Parent Issue:** #35 - Mascot: Section-wide mode and targeted boost implementation
   **Epic:** #34 - Mascot System & Mechanics
   **Gap Analysis:** See `ISSUE_35_GAP_ANALYSIS.md`
   ```

4. **Update issue #35:**
   Add a comment listing all sub-issues:
   ```
   Sub-issues created to implement missing functionality:
   - [ ] #XX - Core Dual-Mode System
   - [ ] #XX - Section-Wide Slow Boost
   - [ ] #XX - Targeted Boost with Stat Trade
   - [ ] #XX - Mode Switching UI
   - [ ] #XX - Visual Differentiation
   - [ ] #XX - Testing & Validation
   ```

## Notes

- All issues follow the same format as existing sub-issues (#50, #52, etc.)
- User stories, acceptance criteria, and test cases included
- Technical implementation details provided
- Dependencies clearly marked
- Estimates align with gap analysis
- Priority order matches high-priority items first

