# Phase 5.6: Decay Rebalance Plan
## Core Issue: Wave Participation Creates Positive Feedback Loop

### Current Math Problems:

1. **Attention Boost Too Strong**:
   - Wave participation: +5 attention to ALL participating fans
   - Cluster decay: -3 attention to only 3-7 fans per 10s
   - Net effect: Waves make sections MORE ready, not less

2. **Readiness Gate Too Permissive**:
   - Current: `happiness >= 65 AND attention >= 50`
   - Attention acts as hard gate, but gets boosted by waves
   - Result: Sections never fall below threshold

3. **Decay Magnitude Too Weak**:
   - Current cluster decay: -6 happiness (±20%), -3 attention (capped)
   - Affects only 3-7 fans per event
   - Not enough to counteract wave boosts

### Proposed Changes:

#### **Option A: Aggressive Decay (Recommended)**

**Cluster Decay Multipliers:**
```typescript
clusterDecay: {
  // DOUBLE the decay magnitude per event
  earlyDecayRate: 1.2,  // was 0.6 → 12 happiness per event
  midDecayRate: 2.8,    // was 1.4 → 28 happiness per event
  lateDecayRate: 6.0,   // was 3.0 → 60 happiness per event
  
  // DOUBLE attention decay cap
  attentionDecayCap: 6, // was 3 → -6 attention per event
  
  // Keep fan count range
  clusterSizeMin: 3,
  clusterSizeMax: 7,
}
```

**Wave Participation Adjustments:**
```typescript
waveAutonomous: {
  // REDUCE wave completion boosts
  waveCompletionHappinessBoost: 2,  // was 5 → less happiness reward
  waveCompletionAttentionBoost: 3,  // was 5 → less attention reward
  waveBoostDuration: 2000,          // was 3000 → shorter duration
}
```

**Readiness Logic Change:**
```typescript
// REMOVE attention as hard gate for wave START
// Attention should affect SUCCESS chance, not initiation

// Wave Start (SectionActor auto-trigger):
waveReady = (happiness >= 65)  // Only happiness gates initiation

// Wave Success (column participation in WaveManager):
participationChance = baseChance 
  + (happiness * 0.3)     // Happiness weight increased
  + (attention * 0.2)     // Attention contributes but doesn't gate
  - (thirst * 0.4)        // Thirst penalty increased
```

**Expected Timeline with Option A:**

```
T=0-3s:   Countdown (frozen)
T=3-8s:   5s lockout (frozen)
T=8s:     First wave check
          - happiness=70 → PASS (all 3 sections trigger)
          - Wave propagates → full success likely
T=10s:    First cluster decay
          - 4-6 fans per section: -12 happiness, -6 attention
          - Affected fans: happiness 70→58, attention 70→64
          - Unaffected fans: happiness 70, attention 70
T=18s:    Second wave check (10s cooldown)
          - Section avg: ~62-65 happiness (borderline)
          - 1-2 sections trigger, 1 may fail threshold
          - Wave propagates → partial success (50-70% columns)
T=20s:    Second cluster decay
          - More fans hit: some drop to happiness ~50
          - Attention spreading lower (~58-64 range)
T=28s:    Third wave check
          - Section avg: ~55-60 happiness
          - Maybe 1 section triggers naturally
          - Wave propagates → high failure rate (30-50% columns)
          - **Player intervention needed here**
T=30s+:   Without intervention:
          - Cluster decay continues every 10s
          - Happiness cascades below 65 threshold
          - Thirst climbing (0.8 pts/sec → +24 over 30s)
          - Spiral begins
```

#### **Option B: Moderate Decay + Remove Attention Gate**

```typescript
clusterDecay: {
  // 1.5x increase (not 2x)
  earlyDecayRate: 0.9,  // was 0.6 → 9 happiness per event
  midDecayRate: 2.1,    // was 1.4 → 21 happiness per event
  lateDecayRate: 4.5,   // was 3.0 → 45 happiness per event
  attentionDecayCap: 5, // was 3 → -5 attention per event
}

waveAutonomous: {
  // Keep current boosts but remove attention gate
  waveCompletionHappinessBoost: 5,  // unchanged
  waveCompletionAttentionBoost: 5,  // unchanged
}

fanStats: {
  // Remove attention from readiness
  waveStartThreshold: 65,           // happiness only
  // DELETE: attentionMinimumForWave
}
```

#### **Option C: Nuclear Decay (For Extreme Difficulty)**

```typescript
clusterDecay: {
  // 3x increase
  earlyDecayRate: 1.8,  // was 0.6 → 18 happiness per event
  midDecayRate: 4.2,    // was 1.4 → 42 happiness per event
  lateDecayRate: 9.0,   // was 3.0 → 90 happiness per event
  attentionDecayCap: 9, // was 3 → -9 attention per event
  
  // More fans affected
  clusterSizeMin: 5,
  clusterSizeMax: 10,
}
```

### Core Gameplay Goals Alignment:

#### **Goal 1: Player Skill = Score**
- ✅ More waves = more points
- ✅ Decay creates time pressure

#### **Goal 2: Keep Waves Spawning**
- ✅ Requires managing happiness above 65
- ✅ Balancing vendor/mascot trade-offs

#### **Goal 3: Risk/Reward Systems**

**Vendors:**
- **Reward**: +happiness (fight decay), +thirst relief, +score
- **Risk**: Wave collision → vendor splat → attention penalty
- ✅ This mechanic already exists and works

**Mascots:**
- **Reward**: Strong happiness boost, charges ultimate
- **Risk**: Attention cost (makes sections distracted)
- ⚠️ **NEEDS ATTENTION TO AFFECT SUCCESS, NOT JUST READINESS**

#### **Goal 4: Attention Should Affect Success, Not Initiation**

**Current Problem:**
```typescript
// BAD: Attention gates both start AND success
waveReady = happiness >= 65 AND attention >= 50
```

**Proposed Fix:**
```typescript
// GOOD: Happiness gates start, attention affects success
waveReady = happiness >= 65

// In wave propagation (column-level):
participationChance = calculateFromStats(happiness, attention, thirst)
// Low attention → lower participation → wave sputters
```

This allows:
- Happy but distracted sections CAN start waves
- But distracted fans DON'T participate as well
- Wave sputters/crashes → happiness penalty
- Creates the mascot risk you want

### Recommended Implementation: **Option A + Attention Refactor**

**Step 1: Remove attention gate from wave initiation**
```typescript
// FanActor.ts - updateStats()
this.waveReady = this.happiness >= gameBalance.fanStats.waveStartThreshold;
// Delete: && this.attention >= attentionMinimumForWave
```

**Step 2: Make attention affect wave SUCCESS**
```typescript
// WaveManager or column participation logic
// Need to find where individual fan participation is rolled
participationChance = 50  // base
  + (fan.happiness * 0.4)
  + (fan.attention * 0.3)
  - (fan.thirst * 0.5);

// Low attention = lower participation = wave sputter
```

**Step 3: Double cluster decay magnitude**
```typescript
// gameBalance.ts
clusterDecay: {
  earlyDecayRate: 1.2,  // 2x
  midDecayRate: 2.8,    // 2x
  lateDecayRate: 6.0,   // 2x
  attentionDecayCap: 6, // 2x
}
```

**Step 4: Reduce wave participation boosts**
```typescript
waveAutonomous: {
  waveCompletionHappinessBoost: 2,  // was 5
  waveCompletionAttentionBoost: 3,  // was 5
  waveBoostDuration: 2000,          // was 3000
}
```

### Expected Outcome:

**First 30 seconds:**
- Wave 1: Auto-triggers, full success (free points)
- Decay hits, some fans drop to happiness ~58-62
- Wave 2: Partial trigger, some columns fail
- Player sees: "I need to help!"

**30-60 seconds:**
- Without intervention: happiness cascades below 65
- With vendors: Can stabilize 1-2 sections
- With mascot: Can boost happiness BUT burns attention → risky

**60-90 seconds:**
- Decay accelerates (late phase)
- Player must actively manage all 3 sections
- Mistakes cascade quickly

**Skill Expression:**
- **Low skill**: Panic-use vendors/mascot → wave collisions, splats, attention crashes
- **Medium skill**: Maintain 1-2 sections, occasional waves
- **High skill**: Manage decay timing, anticipate waves, maximize score

### Testing Validation:

Run simulation with Option A config:
1. First wave at T=8s should succeed fully ✓
2. Second wave at T=18-20s should partially succeed (~50-70%)
3. Third wave at T=28-35s should barely trigger without intervention
4. By T=45s, sections should be spiraling without player input
5. Vendor intervention should provide ~10-15s of breathing room
6. Mascot should create visible attention trade-off in wave quality

### Migration Notes:

- Current logs show attention staying at 75 indefinitely
- After this change, attention should drift down due to:
  - Doubled cluster decay (-6 per event vs +3 from waves)
  - Reduced wave boost (+3 vs current +5)
  - Net: Attention will slowly decay over multiple waves
- Happiness will decay faster (2x rate)
- Sections should naturally fall below threshold around T=30-40s

### Risk Assessment:

**If decay is TOO aggressive:**
- Symptom: Sections spiral immediately after first wave
- Fix: Reduce multiplier to 1.5x instead of 2x
- Knob: `earlyDecayRate` from 1.2 → 0.9

**If decay is STILL too weak:**
- Symptom: Waves continue spawning past T=45s without intervention
- Fix: Increase multiplier to 2.5x or 3x
- Alternative: Increase `clusterSizeMax` from 7 → 10 (affect more fans)

**If attention gate removal breaks balance:**
- Symptom: Waves spawn from unhappy sections
- Fix: Increase `waveStartThreshold` from 65 → 70
- Alternative: Add "minimum ready fans" threshold (current: 4)

### Implementation Priority:

1. **High Priority**: Remove attention gate from wave initiation
2. **High Priority**: Double cluster decay magnitude
3. **Medium Priority**: Reduce wave participation boosts
4. **Low Priority**: Make attention affect wave success (requires finding participation formula)

### Next Steps:

1. Implement Option A config changes
2. Test with manual playthrough:
   - Note when first intervention is required
   - Note when spiral becomes unrecoverable
   - Validate vendor/mascot effectiveness
3. Adjust multipliers based on feel
4. Add logging for section-level stats during waves
5. Consider adding "section danger" visual indicator when happiness < 70
