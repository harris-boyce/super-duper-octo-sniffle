# Early Gameplay Math Simulation (First 20-30s)

## Initial State (Session Load, t=0)
```
All 3 sections (A, B, C) - 9 fans per section = 27 fans total

Per section:
- Happiness: 75
- Attention: 70
- Thirst: 20 (midpoint of 15-30)

Wave readiness requires:
- Happiness >= 85 (NOT MET yet: need +10)
- Attention >= 50 (MET: 70 > 50)
```

## Timeline Analysis

### t=0-3s: Countdown (no decay, waves locked)
- Wave triggering is disabled during 3s countdown
- All stats remain stable
- **Status**: All sections not wave-ready (happiness 75 < 85)

### t=3s: Countdown ends, wave lock released
- Auto-wave checking begins
- Still no decay events yet
- **Wave ready sections**: 0/3 (all need +10 happiness)

### t=5s: First cluster decay event (Decay 1) ⏰
**Timing**: Early game decay interval = 10s, so first decay at t=10s? 
Actually, depends on when decay timer starts. Let's assume it starts at t=0, so t=10s is first event.

### t=10s: First Cluster Decay Event (Decay 1) ⏰
**Configuration**:
- earlyDecayRate: 0.6 pts/sec × 10 sec interval = **6 happiness per event**
- attentionDecayRate: 0.6 × 2.5 = 1.5 pts/sec × 10 sec interval = **15 attention per event**
- attentionDecayCap: 3 (so actual decay is min(15, 3) = **3 attention per event**)
- Cluster selection: 3-7 random adjacent fans per section (say 4-5 fans per section)
- Randomization: ±20% variance per fan

**Math per section** (e.g., Section A, 5 fans in cluster):
- Happiness before: 75
- Happiness decay: 6 × variance (0.8-1.2) = 4.8-7.2, but capped at 10 → **6 per fan**
- Happiness after: 75 - 6 = **69**
- Attention before: 70
- Attention decay: 3 × variance (0.8-1.2) = 2.4-3.6, capped at 3 → **~3 per fan**
- Attention after: 70 - 3 = **67**

**All 3 sections decay**:
- Section A: Happiness 75→69, Attention 70→67
- Section B: Happiness 75→69, Attention 70→67
- Section C: Happiness 75→69, Attention 70→67

**Wave readiness after Decay 1**:
- Happiness 69 < 85 still ❌
- Attention 67 >= 50 ✅
- **Still NOT wave-ready** (need happiness >= 85)

---

### t=15s: Auto-wave check (post-Decay 1)
- No section meets happiness threshold (all at 69)
- **Waves triggered**: 0

---

### t=20s: Second Cluster Decay Event (Decay 2) ⏰
**Cascade effect**: Centralized GameStateManager randomizes section order, applies decay with diminishing returns:
- 1st section: 60% decay chance → likely decays
- 2nd section: 60% × 0.6 = 36% chance → less likely
- 3rd section: 36% × 0.6 = 21.6% chance → unlikely

**Scenario A (typical)**: First 1-2 sections decay again
- Section A decays again: Happiness 69→63, Attention 67→64
- Section B decays again: Happiness 69→63, Attention 67→64
- Section C skips (21.6% chance missed): Happiness 75, Attention 70

**Wave readiness after Decay 2**:
- Section A: Happiness 63 < 85 ❌
- Section B: Happiness 63 < 85 ❌
- Section C: Happiness 75 < 85 ❌ (still needs +10)
- **Still NOT wave-ready**

---

### t=25s: Auto-wave check (post-Decay 2)
- No section meets happiness threshold
- **Waves triggered**: 0

---

### t=30s: Third Cluster Decay Event (Decay 3) ⏰
If pattern continues (diminishing returns):
- Sections likely decay into range: Happiness 57-63, Attention 61-64
- All sections still < 85 threshold

---

## **Problem: Mathematical Reality vs. Your Desired State**

Your desired state requires **at least one section to reach happiness >= 85** to trigger a wave by t=20-30s.

But with current config:
- **Initial happiness: 75** (starts 10 points below wave threshold)
- **Decay: -6 happiness per event** (moving AWAY from threshold)
- **10s decay interval** (only 2 decays by t=20s)

**Math doesn't support wave spawning in first 20-30s without vendor intervention.**

---

## **Solutions**

### Option 1: Increase Initial Happiness
```javascript
initialHappiness: 85  // Start AT threshold, not below
// With decay:
// t=10: 85 - 6 = 79 (drop below threshold)
// t=20: 79 - 6 = 73 (further below)
// Result: One wave at start, then requires vendors
```

### Option 2: Lower Wave Readiness Happiness Threshold
```javascript
waveStartThreshold: 70  // Match initial happiness
// Then:
// t=10: All sections at 69 (JUST BELOW)
// t=10+: One section likely at 69 but close to triggering
// Result: Marginal, still requires luck or vendor boost
```

### Option 3: Reduce Decay Per Event
```javascript
earlyDecayRate: 0.3  // 0.3 × 10s = 3 happiness per event (not 6)
// Then:
// t=10: 75 - 3 = 72 (still below 85)
// t=20: 72 - 3 = 69 (still below)
// Result: Still doesn't reach 85
```

### Option 4: Increase Decay Interval (Less Frequent Decay)
```javascript
earlyInterval: 20000  // 20s instead of 10s
// Then:
// t=20: First decay at 75 - 6 = 69 (still below 85)
// Result: Only 1 decay by t=20s, doesn't help much
```

### Option 5: Positive Bias for Undecked Sections
Cluster decay doesn't hit ALL sections every time (diminishing returns). Some sections skip decay.
```
t=10: Section A decays (75→69)
      Section B skips (remains 75)
      Section C decays (75→69)
t=15: Possible auto-wave from Section B at 75? Still below 85.
```

---

## **Recommended Hybrid Approach**

**To achieve your ideal state** (waves every 15-30s starting around t=15-20s):

1. **Increase initialHappiness: 75 → 82-83**
   - Closer to 85 threshold
   - One decay brings to ~76-77, just below threshold
   - If a section skips a decay cycle, it stays near 82, triggering wave

2. **Reduce earlyDecayRate: 0.6 → 0.3-0.4**
   - Decay = 3-4 happiness per 10s interval (not 6)
   - Gentler slope, sections stay wave-viable longer

3. **Keep diminishing returns active**
   - Only 1-2 sections decay per 10s window (not all 3)
   - Creates variance: some sections always wave-ready

4. **Optional: Reduce waveStartThreshold: 85 → 80**
   - 82 initial minus one 3-pt decay = 79 (close)
   - 82 initial minus zero decays = 82 (wave ready!)

---

## **Expected Outcome with Hybrid Settings**

```
t=0: All sections at Happiness 82, Attention 70 ✅

t=10: Decay event
  - Section A: 82 - 3 = 79 (no wave)
  - Section B: skip (remains 82, WAVE READY!)
  - Section C: 82 - 3 = 79 (no wave)
  → Wave 1 from Section B at ~t=13s (countdown + fire)

t=20: Decay event (after first wave)
  - Section A: 79 - 3 = 76 (decay but vendor could save)
  - Section B: 82 - 3 = 79 (vendor-vendee interaction zone)
  - Section C: 79 - 3 = 76 (similar)
  → By t=25-30s, likely one section back to wave-ready via vendor intervention

Result: Waves ~every 12-15s, vendors essential but not overwhelming
```

---

## **Recommendation**

Change:
- `initialHappiness: 82` (was 75)
- `earlyDecayRate: 0.35` (was 0.6, = 3.5 happiness decay per 10s)
- Consider `waveStartThreshold: 80` (was 85, optional)

This gives players 2-3 sections wave-ready at spawn, guarantees first wave by t=15s, and creates meaningful vendor windows.
