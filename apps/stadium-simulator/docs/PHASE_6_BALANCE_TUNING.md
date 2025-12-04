# Phase 6: Balance Tuning & Polish

**Status**: Active  
**Branch**: `sb/add-vendor-scoring-and-splat`  
**Start Date**: December 4, 2025

## Overview

Core game systems are complete. Focus is now on balance tuning and refinement to create optimal gameplay experience.

## Current State Summary

### ✅ Completed Systems
- **Cluster Decay System**: 8-16 fans per burst, 27/32/40 happiness decay per interval (early/mid/late)
- **Autonomous Wave Triggering**: 8+ fans with happiness ≥70 required to initiate
- **Wave Participation Boosts**: +2 happiness, +3 attention per successful wave
- **Vendor Scoring & Dropoff**: Point accumulation with splat risk/reward
- **Mascot System**: T-shirt cannon with targeting cycles and ultimate ability
- **Session Timing**: 3s countdown, 5s grace period before autonomous logic

### 🔧 Recently Fixed
- **Decay Cap Removal**: Removed 10-point happiness decay cap (Phase 5.6)
- **Adjacency Radius**: Increased from 2 to 5 Manhattan distance for better fan clustering
- **Cluster Size**: Increased from 5-12 to 8-16 fans per decay burst
- **State Skip Removal**: Decay now affects all fans regardless of engaged/drinking state
- **Wave Ready Flag Bug**: `waveReady` now updates immediately in `setHappiness()` (critical fix)

### 📊 Current Balance Configuration
```
Decay Rates (happiness points):
- Early (0-30s, 10s interval): 2.7 pts/sec = 27 points/burst
- Mid (30-70s, 5s interval): 6.4 pts/sec = 32 points/burst
- Late (70-100s, 5s interval): 8.0 pts/sec = 40 points/burst

Cluster Parameters:
- Size: 8-16 fans per burst (25-50% of 32-fan section)
- Adjacency: Manhattan radius 5
- Attention cap: 11 points max per burst

Wave Initiation:
- Threshold: 8 fans with happiness ≥70
- Initial happiness: 70 (immediate wave potential)
- Wave boost: +2 happiness (2s duration, reduced from 5)
```

## Priority Issues & Solutions

### 🔴 P0: Decay Stacking Problem
**Issue**: Multiple sections can decay simultaneously, causing uneven punishment. Some sections get hit repeatedly while others go unscathed.

**Desired Behavior**: Spread decay more evenly across sections to avoid "death spiral stacking".

**Proposed Solution**:
```typescript
// In SectionActor or coordinating manager
private lastDecaySectionIds: string[] = []; // Track last 2 decay targets

selectDecaySection(): SectionActor {
  const candidates = allSections.filter(s => 
    !this.lastDecaySectionIds.includes(s.id)
  );
  
  // If all sections decayed recently, reset tracking and allow any
  if (candidates.length === 0) {
    this.lastDecaySectionIds = [];
    return randomFrom(allSections);
  }
  
  // Select from non-recently-decayed sections
  const selected = randomFrom(candidates);
  
  // Track for future exclusion
  this.lastDecaySectionIds.push(selected.id);
  if (this.lastDecaySectionIds.length > 2) {
    this.lastDecaySectionIds.shift(); // Keep last 2 only
  }
  
  return selected;
}
```

**Files to Edit**:
- `SectionActor.ts` or `GameStateManager.ts` (decay coordination)
- Add section ID tracking for last N decay events
- Filter out recently-decayed sections when rolling for next decay

---

### 🟡 P1: Multi-Section Decay Diminishing Returns
**Issue**: When multiple sections decay in same interval, diminishing returns might not be optimal. Current behavior unclear.

**Investigation Needed**:
- What is current diminishing returns formula?
- Is it per-section or global?
- Does it scale with number of simultaneous decays?

**Proposed Solution**: Review and potentially adjust:
```typescript
// Possible approach: Reduce decay magnitude when multiple sections hit
const decayMultiplier = 1.0 / Math.sqrt(simultaneousDecayCount);
const adjustedDecay = baseDecay * decayMultiplier;
```

**Files to Check**:
- `SectionActor.ts` - `applyClusterDecay()`
- Look for any global decay coordination logic

---

### 🟡 P1: Wave Initiation Death Spiral
**Issue**: When sections get low, fans won't initiate waves even though player wants engagement. "Waves dying in their own section" feels bad.

**Current Behavior**: 
- Requires 8+ fans with happiness ≥70 to initiate
- If section decays below this, no waves start
- Player loses engagement opportunity

**Proposed Solutions**:

**Option A: Lower Initiation Threshold**
```typescript
// gameBalance.ts
waveAutonomous: {
  minReadyFans: 6, // Reduced from 8
  // OR use percentage-based threshold
  minReadyPercentage: 0.20, // 20% of section (6-7 fans)
}
```

**Option B: Allow "Desperate Waves"**
```typescript
// Allow waves to start with lower success chance
// Even if they'll likely fail in their section, give them a shot
desperateWaveConfig: {
  enabled: true,
  minReadyFans: 4, // Much lower threshold
  happinessThreshold: 50, // Lower happiness gate
  cooldownPenalty: 3000, // Longer cooldown if desperate wave fails
}
```

**Option C: "Hope" Mechanic**
```typescript
// Fans get excited seeing other sections succeed
// Temporary happiness boost when nearby section completes wave
crossSectionMomentum: {
  enabled: true,
  happinessBoost: 5, // +5 happiness to adjacent sections
  attentionBoost: 3,
  duration: 3000, // 3s temporary boost
}
```

**Recommendation**: Start with **Option A** (lower threshold to 6 fans). Test gameplay feel before implementing more complex mechanics.

**Files to Edit**:
- `gameBalance.ts` - `waveAutonomous.minReadyFans`
- `SectionActor.ts` - wave initiation logic (if percentage-based)

---

### 🟡 P1: Scoring Paradigm Cleanup
**Issue**: "Scoring paradigm is messy and needs cleaned up."

**Current Scoring Sources** (Audit Needed):
1. Wave completion points
2. Vendor service points
3. Section success bonuses
4. Mascot effectiveness bonuses?
5. Time remaining multipliers?

**Investigation Tasks**:
- [ ] Map all current scoring sources and magnitudes
- [ ] Identify inconsistencies or redundant systems
- [ ] Define clear scoring philosophy:
  - What should be worth most points?
  - Should failed waves have negative score?
  - Should vendors have diminishing returns?
  - Should mascot usage have opportunity cost?

**Proposed Cleanup**:
```typescript
// Unified scoring configuration
scoring: {
  // Primary sources
  waveCompletion: {
    base: 100,
    participationBonus: 2, // per percentage point
    speedBonus: 50, // if under X seconds
    perfectBonus: 100, // 100% participation
  },
  
  // Secondary sources
  vendorService: {
    base: 10,
    urgencyMultiplier: 2.0, // high thirst/low happiness
    efficiencyBonus: 5, // fast service time
  },
  
  // Penalties
  waveFailed: {
    penalty: -25, // negative score for failed waves
    splatVendor: -50, // vendor hit during wave
  },
  
  // Multipliers
  lateGameMultiplier: 1.5, // last 30 seconds
  streakMultiplier: 1.2, // per consecutive wave success
}
```

**Files to Edit**:
- `gameBalance.ts` - consolidate all scoring config
- `GameStateManager.ts` - centralize score tracking
- `WaveManager.ts` - apply wave scoring
- `DrinkVendorBehavior.ts` - apply vendor scoring

---

## Testing Checklist

### Decay System
- [ ] Verify 27/32/40 point decay actually applied
- [ ] Confirm ready count drops after decay (waveReady fix working)
- [ ] Test decay stacking behavior (multiple sections in one interval)
- [ ] Verify decay exclusion logic (avoid targeting same section)

### Wave Initiation
- [ ] Test wave spawning with 6 vs 8 fan threshold
- [ ] Verify waves can initiate even when section is struggling
- [ ] Check cross-section momentum (if implemented)
- [ ] Confirm player can still engage with low sections

### Scoring
- [ ] Verify all score sources tracked correctly
- [ ] Test end-of-session score report accuracy
- [ ] Confirm grade thresholds feel appropriate
- [ ] Check for score inflation/deflation issues

---

## Next Session Starting Point

**Resume Here**: Balance tuning phase with 4 priority items:
1. **Decay Stacking Fix** - Implement section exclusion logic to spread decay evenly
2. **Wave Initiation Threshold** - Lower to 6 fans and test gameplay feel
3. **Scoring Audit** - Map current sources, identify cleanup targets
4. **Multi-Decay Diminishing Returns** - Investigate and tune current behavior

**Quick Wins**:
- Lower `minReadyFans` from 8 to 6 (1 line change)
- Add last-decayed tracking to prevent stacking (20-30 lines)

**Deeper Work**:
- Scoring system consolidation (audit → redesign → implement)
- Diminishing returns tuning (requires understanding current formula)

---

## Configuration Reference

### Key Balance Knobs
```typescript
// gameBalance.ts locations

// Decay system
clusterDecay.clusterSizeMin: 8
clusterDecay.clusterSizeMax: 16
clusterDecay.adjacencyRadius: 5
clusterDecay.earlyDecayRate: 2.7
clusterDecay.midDecayRate: 6.4
clusterDecay.lateDecayRate: 8.0
clusterDecay.attentionDecayCap: 11

// Wave initiation
waveAutonomous.minReadyFans: 8  // ← Primary tuning target
fanStats.waveStartThreshold: 70  // Happiness requirement
fanStats.initialHappiness: 70  // Starting value

// Wave boosts
waveAutonomous.waveCompletionHappinessBoost: 2
waveAutonomous.waveCompletionAttentionBoost: 3
waveAutonomous.waveBoostDuration: 2000

// Session timing
sessionConfig.gracePeriod: 5000
sessionConfig.runModeDuration: 100000
```

### Recent Changes Log
- **Dec 4, 2025**: Fixed waveReady flag update bug in setHappiness()
- **Dec 4, 2025**: Removed happiness decay cap, increased cluster size to 8-16
- **Dec 4, 2025**: Adjusted decay rates to 27/32/40 points per interval
- **Dec 4, 2025**: Increased adjacency radius from 2 to 5
- **Dec 4, 2025**: Removed engaged/drinking state skip in decay application

---

## Success Metrics

### Gameplay Feel Targets
- ✅ Waves spawn autonomously in first 10 seconds
- ⚠️ Decay causes downward spiral without intervention (working but uneven)
- ❌ Player can recover sections through vendor/mascot use (needs testing)
- ❌ Scoring feels rewarding and balanced (needs cleanup)
- ❌ Session duration feels right (100s, needs validation)

### Technical Validation
- ✅ waveReady flag updates immediately on happiness change
- ✅ Decay applies full calculated amount (no caps)
- ✅ Cluster selection finds sufficient fans (pool size 19-30)
- ⚠️ Ready count changes reflect decay impact (fixed, needs retest)
