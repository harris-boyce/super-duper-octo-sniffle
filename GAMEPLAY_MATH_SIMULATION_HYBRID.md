# Hybrid Wave Triggering Math Simulation (First 20-30s)

## Hybrid Model Definition

**Wave Trigger Logic**:
1. **Gating**: Section needs `minReadyFans >= 5` fans with (happiness >= 65 AND attention >= 50)
2. **Once gated**: Use **section average happiness** to determine wave success probability
3. **Result**: Fans must be engaged enough to unlock wave potential, but then crowd momentum determines success

**Rationale**: 
- One or two hyped fans can't accidentally trigger a wave (gate prevents spam)
- But once that core is engaged, *their energy* can inspire others to participate
- Still risk: Even with gate, wave might fail if other fans aren't ready (realistic!)

---

## Initial State (t=0)
```
All 3 sections (A, B, C) - 9 fans per section = 27 fans total

Per fan:
- Happiness: 70
- Attention: 70
- Thirst: 20

Wave gate requirement:
- At least 5 fans with (happiness >= 65 AND attention >= 50)
- Current: 9/9 fans qualify ✅ (all above both thresholds)
```

---

## Timeline

### t=0-3s: Countdown (no decay, waves locked)
- All fans comfortable, gate easily met
- **Status**: Wave triggering disabled during countdown

### t=3s: Countdown ends
- All 27 fans still qualify (happiness 70 > 65, attention 70 > 50)
- Gate is **OPEN** for all 3 sections

### t=10s: First Cluster Decay Event (Decay 1) ⏰
**Configuration**:
- earlyDecayRate: 0.6 pts/sec × 10 sec interval = **6 happiness per event**
- attentionDecayRate: 1.5 pts/sec × 10 sec interval = **3 attention per event** (capped)
- Diminishing returns: 60% → 36% → 21.6% decay chance per section

**Scenario** (typical diminishing returns):
- **Section A**: 60% chance to decay → DECAYS
  - Happiness: 70 - 6 = **64**
  - Attention: 70 - 3 = **67**
  - Wave-ready fans: 4/9 (70 - 64 = 6 now below 65, but 4 still qualify) ❌ **GATE CLOSES**
  
- **Section B**: 36% chance to decay → SKIPS (lucky!)
  - Happiness: 70 (no decay)
  - Attention: 70 (no decay)
  - Wave-ready fans: 9/9 ✅ **GATE OPEN**
  
- **Section C**: 21.6% chance to decay → SKIPS (very lucky!)
  - Happiness: 70 (no decay)
  - Attention: 70 (no decay)
  - Wave-ready fans: 9/9 ✅ **GATE OPEN**

**After Decay 1**:
- Section A: **Gate CLOSED** (only 4 ready fans)
- Section B: **Gate OPEN** (9/9 ready), avg happiness 70 → **high wave success**
- Section C: **Gate OPEN** (9/9 ready), avg happiness 70 → **high wave success**

### t=13s: First Wave Triggers (from Section B)
Section B emits `sectionWaveInitiate` because:
- ✅ Minimum 5 fans ready (9 ready)
- ✅ Not on cooldown
- ✅ No wave active

**Wave success calculation** (using Section B average):
```
Avg happiness: 70
Avg attention: 70
Avg thirst: 20

Success formula (from code):
success = 80 + (happiness * 0.2) - (thirst * 0.3)
        = 80 + (70 * 0.2) - (20 * 0.3)
        = 80 + 14 - 6
        = 88% success chance
```

**Wave outcome**: Section B succeeds (88% chance), gets +5 happiness boost, 1s freeze

### t=16s: Wave Completes, Cooldown Starts
- Global cooldown: 15s base (reduced to 10s on full success)
- All sections get: 1s freeze, +5 happiness boost
- **Updated state**:
  - Section A: Happiness 64+5=**69**, Attention 67
  - Section B: Happiness 70+5=**75**, Attention 70 (participated + boost)
  - Section C: Happiness 70+5=**75**, Attention 70 (participated + boost)

### t=20s: Second Cluster Decay Event (Decay 2) ⏰
**Cooldown status**: At t=16s + 10s = t=26s (full success refund), so **still in cooldown** ✅

Decay still happens independently, but waves are locked:

**Decay 2 (diminishing returns again)**:
- **Section A**: 60% → DECAYS
  - Happiness: 69 - 6 = **63**
  - Attention: 67 - 3 = **64**
  - Wave-ready: 3/9 ❌ GATE CLOSED

- **Section B**: 36% → LIKELY SKIPS
  - Happiness: 75 (no decay, stays high!)
  - Attention: 70
  - Wave-ready: 9/9 ✅ GATE OPEN

- **Section C**: 21.6% → LIKELY SKIPS
  - Happiness: 75 (no decay)
  - Attention: 70
  - Wave-ready: 9/9 ✅ GATE OPEN

**After Decay 2**:
- Section A: Still gate-closed (3 ready)
- Section B: Gate open, happiness **75** (strong position)
- Section C: Gate open, happiness **75** (strong position)

### t=26s: Cooldown Expires, Next Wave Window Opens
- Section B or C can trigger
- Both have open gates and high happiness (75)
- **Expected**: Immediate wave 2 from Section B or C

**Wave 2 success** (e.g., Section C):
```
Avg happiness: 75
Avg attention: 70
Avg thirst: 20 (minimal growth, participation freeze)

success = 80 + (75 * 0.2) - (20 * 0.3)
        = 80 + 15 - 6
        = 89% success chance
```

---

## Analysis: Hybrid Model vs. Pure Fan-Level

### What the Hybrid Model Achieves

✅ **Wave 1** at ~13s (Section B, 88% success):
- Hybrid gate allows trigger
- Pure fan-level: also triggers (all 9 fans ready)
- **Same outcome**

✅ **Wave Momentum**: Section B/C stay wave-ready longer because they didn't decay (diminishing returns)
- Pure fan-level: Same (hasn't decayed yet)
- **Same outcome**

✅ **Wave 2** at ~26-28s (Section B or C):
- Hybrid gate: Open + average happiness 75 → **predictable success**
- Pure fan-level: Still triggerable if 5+ fans qualify → **same gate logic**
- **Slightly different**: Hybrid uses section average (75) for success; pure uses per-fan thresholds

### Key Difference: Success Rate Variance

**Hybrid model introduces one new dynamic**:
- Gate is binary (meets threshold or not)
- But once gated, **wave success depends on section average**, not individual fans
- This means:
  - Section with 5 gate-qualifying fans + 4 disengaged fans = **hybrid uses average of all 9**
  - Pure fan-level might require most/all fans to have high happiness

**Example failure scenario** (t=40s):
```
Section A after 2+ decay cycles:
- Happiness: 55 (multiple decays)
- But 6/9 fans still >= 65 (maybe they got vendor help mid-decay)
- Gate: OPEN ✅
- Wave trigger: YES
- But wave success = 80 + (55 * 0.2) - (20 * 0.3) = 80 + 11 - 6 = 85%

Pure fan-level approach:
- Only those 6 fans participate
- Participation rate = 6/9 = 67%
- Success might be higher if participation-based
```

---

## Hybrid Model: Experiential Outcomes (First 30s)

| Time | Event | Gate Status | Wave? | Success? | Notes |
|------|-------|------------|-------|----------|-------|
| 0-3s | Countdown | A,B,C open | No | — | Waves locked |
| 10s | Decay 1 | A closed, B/C open | No | — | Cooldown active (5s) |
| 13s | Auto-wave | A closed, B/C open | **YES (B)** | 88% ✅ | First wave: core fans infectious |
| 16s | Wave ends | All +5 happiness | — | ✅ Complete | Momentum boost |
| 20s | Decay 2 | A closed, B/C open | No | — | Still in cooldown |
| 26s | Cooldown expires | A closed, B/C open | **YES (C)** | 89% ✅ | Second wave: sustained momentum |
| 30s | ~End | A closed, B/C open | — | — | Ready for Wave 3 if no decay |

---

## Comparison: Pure vs. Hybrid

### Pure Fan-Level Readiness
```
Waves: t=13s (88% success), t=26s (89% success)
Failure mode: If most fans drop below 65, even if core 5 stay engaged, no wave
Feels: "Fans must be ready"
```

### Hybrid Model
```
Waves: t=13s (88% success), t=26s (89% success)  
Failure mode: Gate opens, but if section average is low, wave might fail anyway
Feels: "Core fans unlock potential, section energy determines success"
Example twist: 5 hyped fans at 80 happiness, 4 grumpy at 40 → gate opens, but avg=64 → wave might fail (80 + 12.8 - 6 = 86%)
```

---

## Downside: Cascade Failures

**Hybrid model risk**: Waves can be gated but fail, leading to:
- Cooldown after failure (9s penalty)
- Section feels "ready" but wave sputters
- Player sees gate open but wave fails → confusing?

**Example**:
```
t=26s: Section B gate opens (5+ fans >= 65 happiness)
       But section average happiness = 60 (some fans decayed more)
       Wave triggers → 80 + (60 * 0.2) - (20 * 0.3) = 80 + 12 - 6 = 86%
       Let's say it fails (14% chance) → frustrating for player
       Now cooldown 9s, must wait until t=35s for next attempt
```

**Pure fan-level avoids this**: If gate opens, **most participating fans are engaged** → higher success probability.

---

## Recommendation

**Hybrid model is viable** if you want:
- ✅ "Core fan" mechanic (5 engaged fans can inspire others)
- ✅ Section momentum feeling (average happiness matters)
- ⚠️ But accept that waves can gate-open and fail

**If you want to minimize cascade failures**, add a **success gate**:
```
Gate 1: Minimum 5 fans at (happiness >= 65 AND attention >= 50)
Gate 2: Section average happiness >= 55

Both must pass to trigger wave.
This way: core fans present AND section reasonably engaged
```

This reduces the "opened gate but failed wave" scenario.

---

## Math Check: Does Hybrid Model Support Your Ideal State?

**Your goal**: Waves every 15-30s, vendors necessary, first wave by t=15-20s

**Hybrid outcome**:
- ✅ Wave 1: ~13s (gate + momentum)
- ✅ Wave 2: ~26s (sustained momentum from boost)
- ⚠️ Wave 3: ~40s? (depends on decay + vendor intervention)

**Vendor dependency**: 
- Section A gates close after first decay (only 4 ready)
- Need vendors to re-engage those 4 fans → happiness back to 65+
- Once vendor help, gate reopens, average pulls up, wave succeeds

This matches your intent: **vendors essential for sustained waves**.

