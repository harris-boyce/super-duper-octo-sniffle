# Testing Strategy - Mascot System

## Overview

This document outlines the testing approach for the Mascot T-Shirt Cannon system, including current test coverage, testing methodology, and roadmap for future comprehensive testing.

**Status**: MVP Complete (Issue #62)
**Last Updated**: 2025-11-24

## Current Test Coverage

### Test Summary

| Component | Test File | Tests | Status | Coverage |
|-----------|-----------|-------|--------|----------|
| RipplePropagationEngine | `systems/RipplePropagationEngine.test.ts` | 32 | ✅ Passing | Comprehensive |
| MascotAnalytics | `systems/MascotAnalytics.test.ts` | 23 | ✅ Passing | Comprehensive |
| WaveManager | `managers/WaveManager.test.ts` | 40 (4 skipped) | ✅ Passing | Good |
| MascotTargetingAI | `systems/MascotTargetingAI.test.ts` | 20 | ✅ Passing | Comprehensive |
| CatchParticles | `components/CatchParticles.test.ts` | 8 | ✅ Passing | Basic |
| TargetingIndicator | `components/TargetingIndicator.test.ts` | 5 | ✅ Passing | Basic |
| Fan | `sprites/Fan.test.ts` | 9 | ✅ Passing | Config only |
| Mascot | `sprites/Mascot.test.ts` | 27 | ⚠️ Failing | WIP |
| StadiumSection | - | 0 | ❌ Missing | None |

**Total Tests**: 490 passing, 27 failing (WIP), 4 skipped

### Coverage by Testing Level

#### Unit Tests ✅
- **Component Isolation**: Each system tested independently
- **Mock Dependencies**: Phaser scene, sections, fans mocked
- **Edge Cases**: Null handling, boundary conditions tested
- **Configuration**: gameBalance values validated

**Coverage**: ~75-80% (estimated)

#### Integration Tests ⚠️
- **Status**: Minimal (skipped in MVP)
- **Planned**: Cross-component workflows
- **Gap**: Full activation → ripple → wave flow untested

**Coverage**: ~10% (estimated)

#### E2E Tests ❌
- **Status**: Not implemented
- **Planned**: Playwright test framework documented
- **Gap**: No browser-based functional tests

**Coverage**: 0%

#### Performance Tests ⚠️
- **Status**: Basic validation in unit tests
- **Planned**: Dedicated performance test suite
- **Gap**: No sustained load testing

**Coverage**: ~30% (estimated)

#### Statistical Validation ❌
- **Status**: Not implemented
- **Planned**: 100-1000 trial validation tests
- **Gap**: No probabilistic behavior validation

**Coverage**: 0%

## Testing Methodology

### Unit Testing Approach

#### Test Framework
- **Framework**: Vitest v4.0.8
- **Environment**: happy-dom (browser simulation)
- **Coverage Tool**: @vitest/coverage-v8
- **Assertion Library**: Vitest built-in

#### Mock Pattern

```typescript
// Example: Minimal mock factory
const createMockScene = (): any => {
  return {
    add: { existing: vi.fn() },
    physics: { add: { existing: vi.fn() } },
    tweens: { add: vi.fn() },
    sys: {
      queueDepthSort: vi.fn(),
      events: {
        on: vi.fn(),
        emit: vi.fn(),
      },
    },
    events: {
      on: vi.fn(),
      emit: vi.fn(),
    },
  };
};
```

#### Test Organization

Tests follow AAA pattern:
1. **Arrange**: Set up test data and mocks
2. **Act**: Execute the system under test
3. **Assert**: Verify expected outcomes

```typescript
it('should calculate ripple effect with linear decay', () => {
  // Arrange
  const engine = new RipplePropagationEngine();
  const epicenterFan = createMockFan(5, 5);
  const section = createMockSection({ rows: 10, seatsPerRow: 10 });

  // Act
  const ripple = engine.calculateRipple(epicenterFan, section);

  // Assert
  expect(ripple.affectedFans.size).toBeGreaterThan(0);
  expect(ripple.affectedFans.get(epicenterFan)).toBe(40); // baseEffect
});
```

### Integration Testing Approach

#### Planned Scope
- Mascot → Wave integration
- Analytics → DevPanel integration
- Multiple concurrent mascots
- Full activation lifecycle

#### Example Integration Test (Planned)

```typescript
describe('Mascot-Wave Integration', () => {
  it('should improve wave participation after mascot activation', async () => {
    const scene = createRealScene(); // Full Phaser scene
    const section = createSection({ rows: 5, seatsPerRow: 6 });
    const mascot = new Mascot(scene, 0, 0);
    const waveManager = new WaveManager(gameState);

    // Baseline
    const baselineRate = calculateParticipationRate(section);

    // Mascot activation
    mascot.activateInSection(section);
    await waitForDeactivation(mascot);

    // Post-mascot
    const improvedRate = calculateParticipationRate(section);

    expect(improvedRate - baselineRate).toBeGreaterThan(10);
  });
});
```

## Running Tests

### NPM Scripts

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with UI
npm run test:ui

# Generate coverage report
npm run test:coverage

# Run specific test file
npm test -- RipplePropagationEngine

# Run tests matching pattern
npm test -- mascot
```

### Configuration

**File**: `vitest.config.ts`

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/__tests__/setup.ts',
    coverage: {
      reporter: ['text', 'html'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
      ],
    },
  },
});
```

## Test Coverage Goals

### MVP (Current)
- ✅ Core systems unit tested (>70% coverage)
- ✅ Critical components validated
- ✅ Basic edge cases covered
- ✅ Configuration validated

### Post-MVP (Planned)
- ⬜ Integration tests (>50 scenarios)
- ⬜ E2E tests with Playwright (>20 scenarios)
- ⬜ Performance benchmarks (all targets validated)
- ⬜ Statistical validation (1000+ trials)
- ⬜ >90% unit test coverage

## Known Test Gaps

### 1. Mascot.test.ts Failures (27 tests)
**Issue**: Phaser animation mocking incomplete

**Error**: `Cannot read properties of undefined (reading 'on')`

**Root Cause**: AnimationState initialization requires texture frame management

**Status**: Documented as WIP, not blocking MVP

**Fix Required**: Enhanced Phaser mock with texture/frame support

### 2. Wave Creation Tests (Skipped)
**Issue**: createWave requires full section objects

**Tests Affected**: 4 tests in WaveManager.test.ts

**Status**: Skipped, documented for integration testing

**Fix Required**: Full section mock or integration test approach

### 3. Missing Integration Tests
**Gap**: No cross-component workflow validation

**Impact**: System integration assumed, not proven

**Priority**: High (post-MVP)

**Effort**: 2-3 days for comprehensive suite

### 4. No Performance Benchmarks
**Gap**: Performance validated in unit tests only

**Impact**: No baseline for regression detection

**Priority**: Medium

**Effort**: 1 day for benchmark suite

### 5. No Statistical Validation
**Gap**: Probabilistic behaviors not statistically proven

**Impact**: Targeting accuracy, participation improvement not validated at scale

**Priority**: Low (behavior appears correct in practice)

**Effort**: 2 days for 1000+ trial validation

## Test Utilities

### Shared Mocks

**Planned**: `src/__tests__/test-utils.ts`

```typescript
export function createMockScene(): Phaser.Scene { /* ... */ }
export function createMockFan(row: number, seat: number): Fan { /* ... */ }
export function createMockSection(config: SectionConfig): StadiumSection { /* ... */ }
export function createMockMascot(): Mascot { /* ... */ }
```

**Status**: Not yet implemented, mocks duplicated across test files

### Custom Assertions

**Planned**: `src/__tests__/assertions.ts`

```typescript
export function expectParticipationImprovement(
  before: number,
  after: number,
  min: number = 10,
  max: number = 30
) {
  const improvement = after - before;
  expect(improvement).toBeGreaterThan(min);
  expect(improvement).toBeLessThan(max);
}

export function expectRippleDecay(ripple: Ripple, fan: Fan) {
  const distance = manhattanDistance(ripple.epicenterFan, fan);
  const expectedDecay = 1 - (distance / maxRadius);
  const actualBoost = ripple.affectedFans.get(fan);
  expect(actualBoost).toBeCloseTo(baseEffect * expectedDecay, 1);
}
```

**Status**: Not yet implemented

## Testing Checklist

### Before Committing Code

- [ ] All unit tests pass (`npm test`)
- [ ] No new console warnings/errors
- [ ] Coverage maintained or improved
- [ ] Edge cases considered
- [ ] Configuration changes documented

### Before Release

- [ ] All tests passing (490+)
- [ ] Manual testing checklist complete
- [ ] Performance acceptable (55fps+)
- [ ] No memory leaks detected
- [ ] Analytics validated
- [ ] Documentation updated

## Debugging Failed Tests

### Common Issues

#### 1. Mock Scene Incomplete
**Symptom**: `Cannot read property 'X' of undefined`

**Fix**: Add missing property to createMockScene

```typescript
mockScene.X = { /* required methods */ };
```

#### 2. Async Timing
**Symptom**: Test fails intermittently

**Fix**: Use proper async/await patterns

```typescript
await page.waitForFunction(() => condition);
// Not: setTimeout(() => assert(), 1000);
```

#### 3. Random Behavior
**Symptom**: Statistical test occasionally fails

**Fix**: Increase trial count or widen tolerance

```typescript
expect(rate).toBeGreaterThan(60); // Not 75
expect(rate).toBeLessThan(90);    // Not 80
```

### Debug Mode

```bash
# Run single test with full output
npm test -- --run RipplePropagationEngine --reporter=verbose

# Debug in browser
npm run test:ui
```

## Continuous Integration

### GitHub Actions (Planned)

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test
      - uses: codecov/codecov-action@v3
```

## Future Test Enhancements

### Phase 1: Integration Tests (2-3 days)
- Mascot → Wave integration
- Analytics → DevPanel integration
- Multi-mascot scenarios
- Full activation lifecycle

### Phase 2: Performance Tests (1 day)
- Benchmark suite creation
- Regression detection setup
- Load testing (500+ fans)
- Memory leak validation

### Phase 3: Statistical Validation (2 days)
- 1000+ trial targeting validation
- Participation improvement trials
- Shot distribution validation
- Ripple effect distribution

### Phase 4: E2E Tests (3-5 days)
- Playwright setup
- Visual regression testing
- User interaction flows
- Cross-browser validation

### Phase 5: Test Infrastructure (1-2 days)
- Shared test utilities
- Custom assertions
- CI/CD pipeline
- Coverage reporting

## References

- **TEST_BASELINE.md**: Initial test status documentation
- **MANUAL_TESTING.md**: Manual test checklist and Playwright guide
- **MASCOT_SYSTEM.md**: System architecture and usage
- **Vitest Docs**: https://vitest.dev/
- **Playwright Docs**: https://playwright.dev/

## Support

For testing questions:
1. Check this document
2. Review existing test files for patterns
3. See MANUAL_TESTING.md for E2E guidance
4. GitHub Issues for test failures or gaps
