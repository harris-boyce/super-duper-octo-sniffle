# Mascot T-Shirt Cannon System

## Overview

The Mascot T-Shirt Cannon system is a gameplay feature that allows players to deploy mascots to re-engage disinterested fans and improve wave participation through cascading ripple effects. Mascots patrol section perimeters, firing t-shirt cannons at strategic targets to boost fan engagement.

**Related Issues:**
- **Parent Epic**: GitHub Issue #34 - Mascot System & Mechanics
- **Implementation Stories**: Issues #51, #52, #54, #55, #58, #59, #61 (Stories 1-6)

## System Architecture

### Core Components

The mascot system consists of 8 primary components working together:

1. **[Fan.ts](../src/sprites/Fan.ts)** - Disinterested state detection and re-engagement
2. **[Mascot.ts](../src/sprites/Mascot.ts)** - Mascot entity with perimeter movement
3. **[MascotPerimeterPath.ts](../src/sprites/MascotPerimeterPath.ts)** - Path calculation for perimeter patrol
4. **[MascotTargetingAI.ts](../src/systems/MascotTargetingAI.ts)** - Weighted target selection algorithm
5. **[RipplePropagationEngine.ts](../src/systems/RipplePropagationEngine.ts)** - Spatial effect spread system
6. **[MascotAnalytics.ts](../src/systems/MascotAnalytics.ts)** - Impact tracking and metrics
7. **[CatchParticles.ts](../src/components/CatchParticles.ts)** - Visual particle effects
8. **[TargetingIndicator.ts](../src/components/TargetingIndicator.ts)** - Targeting UI feedback

### Data Flow

```
1. Mascot Activation
   Mascot.activateInSection(section)
   └─> MascotPerimeterPath.calculatePath()
   └─> MascotAnalytics.recordBaseline()

2. Cannon Firing
   Mascot.fireCannonShot()
   └─> MascotTargetingAI.selectCatchingFans()
       └─> Weights disinterested fans 3x
       └─> Returns 1-3 catchers
   └─> TargetingIndicator.showTargetArea()  // 1s preview

3. Ripple Application (after 1s delay)
   RipplePropagationEngine.calculateRipple()
   └─> Manhattan distance decay
   └─> +40 attention at epicenter
   └─> +5 bonus for disinterested fans
   └─> CatchParticles.create()  // Visual feedback

4. Wave Participation Boost
   Fan.calculateWaveChance()
   └─> Boosted attention increases participation rate
   └─> 10-20% improvement typical

5. Deactivation & Analytics
   Mascot.deactivate()
   └─> MascotAnalytics.recordPostMascotParticipation()
   └─> Emit 'mascotAnalytics' event with report
```

## Component Details

### 1. Fan - Disinterested State Detection (Story #51)

**Purpose**: Identifies and visualizes fans who need re-engagement

**Key Methods:**
- `getIsDisinterested()` - Returns true if fan needs help
- `checkDisinterestedState()` - Updates disinterested flag
- `triggerReEngagement()` - Plays re-engagement animation

**Thresholds:**
```typescript
// From gameBalance.fanDisengagement
attention < 30 AND happiness < 40 = Disinterested
```

**Visual State:**
- Opacity: 0.7 (reduced from 1.0)
- Tint: 0x888888 (gray)
- Animation: Reduced jiggle

**Performance:**
- State checks throttled to 500ms intervals
- Section-level tracking available via `StadiumSection.getDisinterestedFans()`

### 2. Mascot - Perimeter Movement System (Story #52)

**Purpose**: Autonomous mascot entity that patrols sections

**Activation:**
```typescript
if (mascot.canActivate()) {
  mascot.activateInSection(section);
}
```

**Movement Behavior:**
- Hybrid perimeter path with random pauses
- Speed: 50 px/s (configurable)
- Duration: 15-20 seconds
- Cooldown: 45-60 seconds

**Depth Factor:**
- Back of section (depth = 1.0): Prioritizes distant fans
- Front/sides (depth = 0.3): Neutral prioritization

**Controls:**
- `M` key: Activate mascot
- `1-4` keys: Assign to section
- `A` key: Toggle auto-rotation mode

### 3. MascotPerimeterPath - Path Calculation (Story #52)

**Purpose**: Generates perimeter patrol paths for mascots

**Path Algorithm:**
```typescript
1. Start at section top-left
2. Calculate perimeter points (clockwise)
3. Add random pauses (40% probability at corners)
4. Add optional shortcuts (15% probability)
```

**Configuration:**
```typescript
edgePadding: 10px  // Distance from section edge
shortcutSpeedMultiplier: 0.7  // 70% speed during shortcuts
```

### 4. MascotTargetingAI - Weighted Selection (Story #58)

**Purpose**: Intelligently selects fans to catch t-shirts

**Algorithm:**
```typescript
weight = baseWeight * disinterestedMultiplier * distanceFactor

disinterestedMultiplier = fan.getIsDisinterested() ? 3.0 : 1.0
distanceFactor = 1 + (distance / maxDistance) * depthFactor
```

**Selection:**
- 1-3 catchers per shot
- No duplicate targeting within activation
- Validated 75% disinterested catch rate

**Events:**
```typescript
mascot.on('cannonCharging', (data) => { /* 1.5s charge pause */ });
mascot.on('cannonFired', (data) => { /* Shot initiated */ });
mascot.on('cannonShot', (data) => { /* Ripples applied */ });
```

### 5. RipplePropagationEngine - Spatial Spread (Story #54)

**Purpose**: Propagates engagement boost from catchers to nearby fans

**Algorithm:**
```typescript
distance = manhattanDistance(catcher, fan)
decay = 1 - (distance / maxRadius)  // Linear decay
effect = baseEffect * decay

if (fan.getIsDisinterested()) {
  effect += disinterestedBonus
}
```

**Configuration:**
```typescript
baseEffect: 40         // +40 attention at epicenter
maxRadius: 4           // 4 grid units
disinterestedBonus: 5  // +5 extra for disinterested fans
```

**Features:**
- Section boundary enforcement
- Multiple ripple combination (additive)
- Comprehensive test coverage (32 tests)

**Documentation:** See [RIPPLE_ENGINE.md](./RIPPLE_ENGINE.md) for detailed API reference

### 6. MascotAnalytics - Impact Tracking (Story #61)

**Purpose**: Measures mascot effectiveness on wave participation

**Metrics Tracked:**
```typescript
{
  totalActivations: number,
  totalShotsFired: number,
  totalFansAffected: number,
  baselineParticipationRate: number,
  postMascotParticipationRate: number,
  participationImprovement: number,  // Percentage points
  disinterestedFansReEngaged: number,
  shotBreakdown: Array<{
    shotNumber: number,
    fansAffected: number,
    avgBoost: number,
    disinterestedHit: number
  }>
}
```

**Usage:**
```typescript
const analytics = mascot.getAnalytics();
const metrics = analytics.getMetrics();
console.log(`Improvement: ${metrics.participationImprovement.toFixed(1)}%`);
```

**Integration:**
- Real-time display in DevPanel
- JSON report generation
- Event-driven updates

### 7. CatchParticles - Visual Feedback (Story #57)

**Purpose**: Particle effects for t-shirt catches

**Configuration:**
```typescript
particleCount: 15
particleLifespan: 800ms
particleColor: 0xFFD700 (gold)
```

**Creation:**
```typescript
CatchParticles.create(scene, fan.x, fan.y);
```

**Auto-destroys** after lifespan

### 8. TargetingIndicator - UI Feedback (Story #57)

**Purpose**: Shows targeting reticles before shots

**Configuration:**
```typescript
reticleRadius: 25px
reticleColor: 0xFFFF00 (yellow)
duration: 1000ms
```

**Usage:**
```typescript
targetingIndicator.showTargetArea(fans, section);
```

## Configuration

All values centralized in [gameBalance.ts](../src/config/gameBalance.ts):

### Fan Disengagement
```typescript
gameBalance.fanDisengagement = {
  attentionThreshold: 30,      // < 30 attention
  happinessThreshold: 40,      // < 40 happiness
  visualOpacity: 0.7,          // 70% opacity when disinterested
  visualTint: 0x888888,        // Gray tint
  stateCheckInterval: 500      // Check every 500ms
}
```

### Mascot Movement
```typescript
gameBalance.mascot = {
  movementSpeed: 50,           // pixels per second
  minDuration: 15000,          // 15 seconds minimum
  maxDuration: 20000,          // 20 seconds maximum
  minCooldown: 45000,          // 45 seconds minimum
  maxCooldown: 60000,          // 60 seconds maximum
  edgePadding: 10,             // pixels from edge
  depthFactorBack: 1.0,        // Back position weight
  depthFactorFrontSides: 0.3   // Front/side weight
}
```

### Cannon Behavior
```typescript
gameBalance.mascotCannon = {
  minShotsPerActivation: 3,
  maxShotsPerActivation: 5,
  minShotInterval: 3000,       // 3 seconds
  maxShotInterval: 5000,       // 5 seconds
  globalAttentionBoost: 5,     // +5 to all fans in section
  globalHappinessBoost: 3,     // +3 to all fans in section
  minCatchersPerShot: 1,
  maxCatchersPerShot: 3,
  disinterestedTargetingWeight: 3.0,
  chargeDuration: 1500,        // 1.5s charge pause
  targetingPreviewDuration: 1000,
  projectileFlightTime: 1000
}
```

### Ripple Mechanics
```typescript
gameBalance.ripplePropagation = {
  enabled: true,
  baseEffect: 40,              // +40 attention at epicenter
  maxRadius: 4,                // 4 grid units
  disinterestedBonus: 5,       // +5 extra attention
  decayType: 'linear'
}
```

### Visual Effects
```typescript
gameBalance.visuals = {
  // Catch particles
  catchParticleCount: 15,
  catchParticleLifespan: 800,
  catchParticleColor: 0xFFD700,

  // Re-engagement animation
  reEngageScalePop: 1.3,
  reEngageFlashDuration: 100,
  reEngageSparkleCount: 8,

  // Targeting indicator
  targetingReticleRadius: 25,
  targetingReticleColor: 0xFFFF00,
  targetingDuration: 1000
}
```

## Usage Examples

### Basic Mascot Activation

```typescript
import { Mascot } from '@/sprites/Mascot';
import { StadiumSection } from '@/sprites/StadiumSection';

// In your scene
const mascot = new Mascot(this, x, y);
const section = /* ... get section ... */;

// Check if can activate (not in cooldown)
if (mascot.canActivate()) {
  mascot.activateInSection(section);
}
```

### Event Listening

```typescript
mascot.on('cannonShot', (data) => {
  console.log(`Shot ${data.shotNumber}/${data.totalShots}`);
  console.log(`Affected ${data.combinedEffects.size} fans`);

  data.ripples.forEach(ripple => {
    console.log(`Epicenter: ${ripple.epicenterRow}, ${ripple.epicenterSeat}`);
    console.log(`Boost: ${ripple.affectedFans.size} fans`);
  });
});

mascot.on('mascotAnalytics', (report) => {
  console.log(`Participation improved by ${report.metrics.participationImprovement}%`);
});
```

### Manual Targeting

```typescript
import { MascotTargetingAI } from '@/systems/MascotTargetingAI';

const ai = new MascotTargetingAI();
const catchers = ai.selectCatchingFans(section, depthFactor);

catchers.forEach(fan => {
  console.log(`Selected fan at (${fan.row}, ${fan.seat})`);
  console.log(`Disinterested: ${fan.getIsDisinterested()}`);
});
```

### Ripple Calculation

```typescript
import { RipplePropagationEngine } from '@/systems/RipplePropagationEngine';

const engine = new RipplePropagationEngine();
const epicenterFan = /* ... fan who caught t-shirt ... */;

const ripple = engine.calculateRipple(epicenterFan, section);

ripple.affectedFans.forEach((boost, fan) => {
  console.log(`Fan received +${boost} attention`);
});
```

## Integration Points

### With WaveManager

Mascot boosts feed directly into wave participation calculation:

```typescript
// In Fan.ts
calculateWaveChance(depthFactor: number): number {
  const base = this.attention * 0.5 + this.happiness * 0.3;
  // Mascot boosts increase attention, which increases wave chance
  return Math.min(100, base * (1 + depthFactor));
}
```

**Expected Impact:**
- **Baseline participation**: 30-40% (struggling section)
- **After mascot**: 50-70% (recovered section)
- **Improvement range**: 10-20 percentage points

### With DevPanel

Analytics display in real-time:

```typescript
// DevPanel shows:
- Current mascot status (active/cooldown)
- Shots remaining
- Fans affected this activation
- Baseline vs current participation
- Improvement percentage
```

### With StadiumScene

Keyboard controls for manual activation:

```typescript
// StadiumScene.ts
if (key === 'M') {
  mascots[currentMascotIndex].activateInSection(sections[selectedSection]);
}

if (key === 'A') {
  toggleAutoRotationMode();
}
```

## Performance Targets

### Targeting AI
- **Target**: <2ms per shot
- **Validated**: Averages ~1ms with 200 fans

### Ripple Calculation
- **Target**: <5ms for 200-fan section
- **Validated**: Averages ~2-3ms

### Visual Effects
- **Target**: Maintain 55fps+ with 5 simultaneous mascots
- **Status**: Achieves 60fps consistently

### Memory
- **Target**: No leaks from particles, tweens, or analytics
- **Status**: Validated across 50+ activation cycles

## Known Limitations

1. **No UI Button**: Keyboard-only activation (`M` key)
2. **Placeholder Sprite**: Flash animation, no sprite sheet
3. **No Sound Effects**: Events emitted, audio not hooked up
4. **Single Section**: Can't activate across multiple sections simultaneously
5. **Visual Ripples**: Ripple mechanics work, visual wave animation not implemented
6. **Max Mascots**: Recommended limit of 5 simultaneous for performance

## Testing

### Unit Tests
- **RipplePropagationEngine**: 32 tests
- **MascotAnalytics**: 23 tests (14 suites)
- **MascotTargetingAI**: 20 tests
- **Fan**: 9 tests (config validation)
- **CatchParticles**: 8 tests
- **TargetingIndicator**: 5 tests
- **WaveManager**: 40 tests

### Test Coverage
- **Core systems**: Well-covered (>90%)
- **Integration**: Basic scenarios covered
- **Performance**: Validated in unit tests
- **Edge cases**: Empty sections, null fans, large sections

### Running Tests

```bash
# All mascot-related tests
npm test -- mascot

# Specific component
npm test -- RipplePropagationEngine
npm test -- MascotAnalytics
npm test -- WaveManager

# With coverage
npm test -- --coverage
```

## Troubleshooting

### Issue: Mascot won't activate

**Check:**
1. Is mascot in cooldown? `mascot.canActivate()`
2. Is section valid? `section !== null`
3. Is mascot already active? `mascot.isActive()`

### Issue: Low targeting accuracy

**Check:**
1. Depth factor setting: Back = 1.0, Front = 0.3
2. Disinterested fan count: Need sufficient targets
3. Weight configuration: `disinterestedTargetingWeight = 3.0`

### Issue: No visual feedback

**Check:**
1. TargetingIndicator initialized? `scene.targetingIndicator`
2. Particle texture created? Check MenuScene setup
3. Timing: 1s delay between targeting and particles

### Issue: Poor wave improvement

**Expected causes:**
1. Too few disinterested fans (already engaged)
2. Section too small (<20 fans)
3. Insufficient shots (only 1-2 fired)

## Future Enhancements

### Planned Features
1. **Visual Ripple Animation**: Expanding circle effect
2. **T-Shirt Projectile**: Arc trajectory visualization
3. **Animated Sprite Sheets**: Full mascot character animations
4. **Sound Effects**: Cannon fire, catch sounds, crowd cheers
5. **Multi-Section Targeting**: Deploy across multiple sections
6. **Power-Ups**: Extended duration, multi-shot bursts

### Balance Tuning
- Adjust `disinterestedTargetingWeight` for different difficulty
- Modify `ripplePropagation.baseEffect` for stronger/weaker impact
- Tune `mascot.cooldown` for frequency control

## References

- **RIPPLE_ENGINE.md**: Detailed ripple propagation API
- **gameBalance.ts**: All configuration values
- **Issue #34**: Parent epic (original design)
- **Issues #51-61**: Implementation stories

## Support

For questions or issues:
1. Check this documentation
2. Review test files for usage examples
3. See TESTING_STRATEGY.md for test approach
4. GitHub Issues: Report bugs or feature requests
