# Manual Testing Checklist - Mascot System

This document provides a comprehensive manual testing checklist for the Mascot T-Shirt Cannon system, along with guidance for future Playwright E2E test automation.

## Setup

### Prerequisites
1. Build and run game in development mode: `npm run dev`
2. Enable dev panel: `Ctrl+Shift+D` (or `Cmd+Shift+D` on Mac)
3. Have keyboard access for mascot controls
4. Browser with developer tools open (for console logs)

### Mascot Controls
- **M key**: Activate mascot in current section
- **1-4 keys**: Assign mascot to specific section
- **A key**: Toggle auto-rotation mode
- **G key**: Toggle grid debug view

## Manual Test Scenarios

### Test 1: Basic Activation Flow
**Reference:** Stories #51, #52, #58, #57

**Steps:**
1. Press `M` to activate mascot in first section
2. Observe mascot sprite appears on section perimeter
3. Observe mascot walks smoothly around perimeter
4. After ~3-5 seconds, observe targeting indicator appears
5. Verify 1-3 fans highlighted with yellow reticles
6. After 1 second delay, verify gold particles burst on catchers
7. Verify mascot fires 3-5 total shots during activation
8. After 15-20 seconds, verify mascot disappears
9. Press `M` again - verify nothing happens (cooldown)
10. Wait 45-60 seconds, press `M` - verify mascot activates again

**Expected Result:**
- Smooth, coordinated visual sequence
- Clear feedback at each step
- Cooldown prevents spam

**Pass/Fail:** ___________

**Notes:**
_______________________________________

---

### Test 2: Disinterested Fan Targeting
**Reference:** Story #51, #58

**Setup:**
- Use dev panel or console to identify disinterested fans
- Look for grayed/desaturated fans in section

**Steps:**
1. Count disinterested fans before mascot activation
2. Activate mascot with `M`
3. Observe which fans get targeting reticles
4. Verify targeting reticles appear MORE on disinterested fans
5. Over 3-5 shots, count disinterested vs normal catches
6. After activation, observe re-engaged fans "pop" (scale animation)
7. Verify re-engaged fans return to normal color

**Expected Result:**
- ~75% of catches should be disinterested fans
- Clear visual feedback when fan re-engages
- Targeting clearly prefers struggling fans

**Pass/Fail:** ___________

**Disinterested catch rate:** ___________

---

### Test 3: Ripple Effects
**Reference:** Story #54

**Steps:**
1. Activate mascot
2. Watch first catch event closely
3. Verify catcher gets gold particle burst
4. Observe adjacent fans (1-2 seats away)
5. Use dev panel to check attention values before/after
6. Verify nearby fans also improved (smaller boost than catcher)
7. Verify distant fans (5+ seats away) unaffected
8. Verify effects stay within section boundary

**Expected Result:**
- "Pebble in pond" spreading effect
- Catcher: +40 attention
- Adjacent fans: +20-30 attention
- Distant fans: no change
- No cross-section effects

**Pass/Fail:** ___________

**Notes:**
_______________________________________

---

### Test 4: Wave Participation Improvement
**Reference:** Story #61

**Setup:**
- Start with section showing poor wave participation (~30-40%)
- Note participation % in dev panel

**Steps:**
1. Trigger a wave (`W` key or wait for autonomous wave)
2. Observe and note low participation in test section
3. Activate mascot in struggling section
4. Wait for all 3-5 shots to fire
5. Trigger another wave
6. Observe participation improvement
7. Check dev panel for analytics report
8. Verify 10-20% improvement shown

**Expected Result:**
- Clear visual improvement in wave
- Dev panel shows 10-20% participation increase
- Wave succeeds where it previously failed or sputtered

**Pass/Fail:** ___________

**Improvement %:** ___________

---

### Test 5: Multiple Mascots
**Reference:** Story #52 (Multi-mascot support)

**Steps:**
1. Activate mascot in section 1 (`M` while section 1 selected)
2. Switch to section 2 (`2` key)
3. Activate mascot in section 2 (`M`)
4. Repeat for sections 3-4
5. Verify all 4 mascots work independently
6. Check framerate (should stay above 55fps)
7. Verify no visual glitches or stuttering
8. Verify each mascot improves its own section

**Expected Result:**
- Smooth performance with 4 simultaneous mascots
- No interference between mascots
- 55fps+ maintained

**Pass/Fail:** ___________

**FPS:** ___________

---

### Test 6: Edge Cases

#### 6a: Empty Section
**Steps:**
1. Create or find section with no fans (or use dev tools to clear)
2. Activate mascot
3. Verify no crash, graceful handling

**Pass/Fail:** ___________

#### 6b: Single Fan Section
**Steps:**
1. Create section with only 1 fan
2. Activate mascot
3. Verify fan is targeted and boosted correctly

**Pass/Fail:** ___________

#### 6c: All Disinterested
**Steps:**
1. Use dev tools to set all fans to disinterested state
2. Activate mascot
3. Verify targeting works, many fans re-engage

**Pass/Fail:** ___________

---

### Test 7: Strategic Depth
**Reference:** Parent Epic (#34) goals

**Steps:**
1. Play several rounds naturally
2. Try deploying mascot at different times:
   - Early in game (fans still engaged)
   - Mid-game (some disinterest building)
   - Late game (many struggling fans)
3. Try deploying in different sections
4. Observe which timing/placement has most impact

**Assessment Questions:**
- Is mascot timing strategic? (YES / NO)
- Does position matter? (Back vs Front) (YES / NO)
- Can player see value of mascot? (YES / NO)
- Is cooldown balanced? (Too short / Just right / Too long)

**Overall strategic feel:** ___________

---

### Test 8: Analytics & Debug
**Reference:** Story #61

**Steps:**
1. Open browser console (F12)
2. Activate mascot
3. Check console for `[Mascot]` activation log
4. Verify shot-by-shot impact logs appear
5. Verify deactivation log with analytics report
6. Open dev panel (`Ctrl+Shift+D`)
7. Verify analytics section shows current mascot status

**Expected Result:**
- Rich debugging information
- Clear console logs
- Dev panel shows real-time metrics

**Pass/Fail:** ___________

---

### Test 9: Performance Check

**Steps:**
1. Activate 5 mascots simultaneously (if possible)
2. Open browser performance monitor
3. Check framerate counter
4. Watch for stuttering during particle bursts
5. Check memory usage over time
6. Look for memory warnings in console

**Expected Result:**
- 55fps+ consistently
- No stuttering
- No memory warnings
- Stable memory usage

**Pass/Fail:** ___________

**FPS Range:** ___________

---

## Final Acceptance Criteria

- [ ] **Feel**: Does mascot feel satisfying to use?
- [ ] **Clarity**: Is the impact obvious to player?
- [ ] **Strategy**: Does timing/positioning matter?
- [ ] **Polish**: Do animations feel arcade-punchy?
- [ ] **Bugs**: Any visual glitches or errors?

**Overall Assessment:** (PASS / FAIL / NEEDS WORK)

**Tester:** _______________

**Date:** _______________

**Notes:**
________________________________________
________________________________________

---

# Playwright E2E Testing Guide

This section provides guidance for implementing automated E2E tests using Playwright. These tests are **NOT implemented in this MVP** but serve as a roadmap for future test automation.

## Playwright Setup

### Installation

```bash
npm install -D @playwright/test
npx playwright install
```

### Configuration

Create `playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Game state dependent
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for game state consistency
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
});
```

## Test Structure

### Recommended File Organization

```
e2e/
├── fixtures/
│   └── game-setup.ts          # Reusable game state setup
├── page-objects/
│   ├── stadium-scene.ts       # StadiumScene page object
│   └── dev-panel.ts           # DevPanel page object
├── tests/
│   ├── mascot-activation.spec.ts
│   ├── mascot-targeting.spec.ts
│   ├── mascot-ripple.spec.ts
│   └── mascot-wave-improvement.spec.ts
└── utils/
    ├── selectors.ts           # CSS/data selectors
    └── assertions.ts          # Custom assertions
```

## Key Testing Patterns

### 1. Waiting for Game Ready

```typescript
// utils/game-ready.ts
export async function waitForGameReady(page: Page) {
  // Wait for Phaser game to initialize
  await page.waitForSelector('[data-testid="stadium-canvas"]');

  // Wait for initial scene load
  await page.waitForFunction(() => {
    return window.game?.scene?.isActive('StadiumScene');
  });

  // Wait for sections to load
  await page.waitForFunction(() => {
    const scene = window.game.scene.getScene('StadiumScene');
    return scene?.stadiumSections?.length > 0;
  });
}
```

### 2. Accessing Game State

```typescript
// page-objects/stadium-scene.ts
export class StadiumScenePage {
  constructor(private page: Page) {}

  async getMascotState(mascotIndex: number = 0) {
    return await this.page.evaluate((idx) => {
      const scene = window.game.scene.getScene('StadiumScene');
      const mascot = scene.mascots[idx];
      return {
        isActive: mascot.isActive(),
        canActivate: mascot.canActivate(),
        cooldown: mascot.getCooldown(),
      };
    }, mascotIndex);
  }

  async getDisinterestedFanCount(sectionIndex: number) {
    return await this.page.evaluate((idx) => {
      const scene = window.game.scene.getScene('StadiumScene');
      const section = scene.stadiumSections[idx];
      return section.getDisinterestedCount();
    }, sectionIndex);
  }

  async getSectionParticipationRate(sectionIndex: number) {
    return await this.page.evaluate((idx) => {
      const scene = window.game.scene.getScene('StadiumScene');
      const section = scene.stadiumSections[idx];
      const fans = section.getFans();
      const participating = fans.filter(f => f.calculateWaveChance(0) > 50);
      return (participating.length / fans.length) * 100;
    }, sectionIndex);
  }
}
```

### 3. Simulating Keyboard Input

```typescript
async function activateMascot(page: Page) {
  await page.keyboard.press('M');

  // Wait for activation event
  await page.waitForFunction(() => {
    const scene = window.game.scene.getScene('StadiumScene');
    return scene.mascots[0].isActive();
  });
}
```

### 4. Visual Regression Testing

```typescript
test('mascot activation visual flow', async ({ page }) => {
  await waitForGameReady(page);

  // Before activation screenshot
  await page.screenshot({ path: 'screenshots/before-mascot.png' });

  // Activate mascot
  await page.keyboard.press('M');

  // Wait for targeting indicator
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'screenshots/targeting.png' });

  // Wait for particles
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'screenshots/catch-particles.png' });

  // Visual diff comparison
  await expect(page).toHaveScreenshot('mascot-activation-complete.png', {
    maxDiffPixels: 100, // Allow small differences
  });
});
```

### 5. Event Listening

```typescript
async function waitForMascotEvent(page: Page, eventName: string) {
  return await page.evaluate((evtName) => {
    return new Promise((resolve) => {
      const scene = window.game.scene.getScene('StadiumScene');
      scene.mascots[0].once(evtName, (data) => {
        resolve(data);
      });
    });
  }, eventName);
}

// Usage
const shotData = await waitForMascotEvent(page, 'cannonShot');
expect(shotData.shotNumber).toBeLessThanOrEqual(5);
```

## Example Test Scenarios

### Test 1: Mascot Activation Flow

```typescript
// e2e/tests/mascot-activation.spec.ts
import { test, expect } from '@playwright/test';
import { StadiumScenePage } from '../page-objects/stadium-scene';
import { waitForGameReady } from '../utils/game-ready';

test.describe('Mascot Activation', () => {
  test('should activate and deactivate correctly', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);

    const stadium = new StadiumScenePage(page);

    // Check initial state
    const initialState = await stadium.getMascotState();
    expect(initialState.canActivate).toBe(true);
    expect(initialState.isActive).toBe(false);

    // Activate mascot
    await page.keyboard.press('M');

    // Verify activation
    const activeState = await stadium.getMascotState();
    expect(activeState.isActive).toBe(true);

    // Wait for deactivation (15-20 seconds)
    await page.waitForFunction(() => {
      const scene = window.game.scene.getScene('StadiumScene');
      return !scene.mascots[0].isActive();
    }, { timeout: 25000 });

    // Verify cooldown
    const cooldownState = await stadium.getMascotState();
    expect(cooldownState.canActivate).toBe(false);
    expect(cooldownState.cooldown).toBeGreaterThan(0);
  });
});
```

### Test 2: Targeting Accuracy

```typescript
test('should target disinterested fans at ~75% rate', async ({ page }) => {
  await page.goto('/');
  await waitForGameReady(page);

  const stadium = new StadiumScenePage(page);

  // Set up test scenario with known disinterested fans
  await page.evaluate(() => {
    const scene = window.game.scene.getScene('StadiumScene');
    const section = scene.stadiumSections[0];
    const fans = section.getFans();

    // Make first 10 fans disinterested
    fans.slice(0, 10).forEach(fan => {
      fan.setStats({ attention: 20, happiness: 30 });
      fan.checkDisinterestedState();
    });
  });

  // Track catches
  const catches = await page.evaluate(() => {
    return new Promise((resolve) => {
      const scene = window.game.scene.getScene('StadiumScene');
      const mascot = scene.mascots[0];
      const catchData = { total: 0, disinterested: 0 };

      mascot.on('cannonShot', (data) => {
        data.catchers.forEach(fan => {
          catchData.total++;
          if (fan.getIsDisinterested()) {
            catchData.disinterested++;
          }
        });
      });

      mascot.once('mascotDeactivated', () => {
        resolve(catchData);
      });

      // Activate mascot
      mascot.activateInSection(scene.stadiumSections[0]);
    });
  });

  // Verify targeting accuracy
  const disinterestedRate = (catches.disinterested / catches.total) * 100;
  expect(disinterestedRate).toBeGreaterThan(60);
  expect(disinterestedRate).toBeLessThan(90);
});
```

### Test 3: Wave Participation Improvement

```typescript
test('should improve wave participation by 10-20%', async ({ page }) => {
  await page.goto('/');
  await waitForGameReady(page);

  const stadium = new StadiumScenePage(page);

  // Measure baseline
  const baselineRate = await stadium.getSectionParticipationRate(0);

  // Activate mascot
  await page.keyboard.press('M');

  // Wait for completion
  await page.waitForFunction(() => {
    const scene = window.game.scene.getScene('StadiumScene');
    return !scene.mascots[0].isActive();
  }, { timeout: 25000 });

  // Measure improved rate
  const improvedRate = await stadium.getSectionParticipationRate(0);

  // Verify improvement
  const improvement = improvedRate - baselineRate;
  expect(improvement).toBeGreaterThan(10);
  expect(improvement).toBeLessThan(30); // Allow some variance
});
```

## Custom Selectors

```typescript
// utils/selectors.ts
export const SELECTORS = {
  canvas: '[data-testid="stadium-canvas"]',
  devPanel: '[data-testid="dev-panel"]',
  mascotStatus: '[data-testid="mascot-status"]',
  analyticsDisplay: '[data-testid="mascot-analytics"]',
};

// Add data-testid attributes to relevant components:
// <canvas data-testid="stadium-canvas"></canvas>
// <div data-testid="dev-panel"></div>
```

## Running Playwright Tests

```bash
# Run all E2E tests
npx playwright test

# Run specific test file
npx playwright test e2e/tests/mascot-activation.spec.ts

# Run in headed mode (see browser)
npx playwright test --headed

# Debug mode
npx playwright test --debug

# Generate report
npx playwright show-report
```

## Best Practices

1. **Isolate Test State**: Reset game state between tests
2. **Wait for Events**: Use game events rather than fixed timeouts
3. **Deterministic Tests**: Seed random values when possible
4. **Screenshot on Failure**: Enable automatic screenshots
5. **Parallel Caution**: Game state makes parallel tests challenging
6. **Performance Monitoring**: Track FPS during tests
7. **Data-Driven Tests**: Use fixtures for different scenarios

## Future Enhancements

- Visual regression testing with Percy or Chromatic
- Performance profiling during E2E tests
- Accessibility testing with axe-playwright
- Mobile viewport testing
- Network condition simulation
- Analytics tracking verification

---

**Note**: Playwright tests are **not implemented** in this MVP. This guide provides the foundation for future E2E test development.
