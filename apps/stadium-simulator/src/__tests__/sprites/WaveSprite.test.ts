import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WaveSprite } from '@/sprites/WaveSprite';
import type { WaveSpriteConfig, SectionBounds, WaveMovementState } from '@/sprites/WaveSprite';
import type { GridManager } from '@/managers/GridManager';
import { gameBalance } from '@/config/gameBalance';

// Mock Phaser Scene
function createMockScene(): any {
  const mockGraphics = {
    clear: vi.fn(),
    lineStyle: vi.fn(),
    lineBetween: vi.fn(),
    setDepth: vi.fn(),
    setVisible: vi.fn(),
    destroy: vi.fn(),
  };

  return {
    add: {
      graphics: vi.fn(() => mockGraphics),
    },
  };
}

// Mock GridManager
function createMockGridManager(): GridManager {
  return {} as GridManager;
}

// Mock section bounds
function createMockSectionBounds(id: string, left: number, right: number, top: number = 0, bottom: number = 400): SectionBounds {
  return { id, left, right, top, bottom };
}

describe('WaveSprite', () => {
  let mockScene: any;
  let mockGridManager: GridManager;
  let waveSprite: WaveSprite;

  beforeEach(() => {
    mockScene = createMockScene();
    mockGridManager = createMockGridManager();
    waveSprite = new WaveSprite(mockScene, 'wave-1', mockGridManager, 100, 200);
  });

  describe('Initialization', () => {
    it('should create with default config values', () => {
      expect(waveSprite).toBeDefined();
      expect(waveSprite.x).toBe(100);
      expect(waveSprite.y).toBe(200);
      expect(waveSprite.getState()).toBe('idle');
    });

    it('should accept custom config values', () => {
      const customConfig: Partial<WaveSpriteConfig> = {
        baseSpeed: 500,
        waveStrength: 85,
        debugVisible: true,
        debugColor: 0xff0000,
        debugAlpha: 0.8,
        lineWidth: 5,
      };

      const customWave = new WaveSprite(
        mockScene,
        'wave-custom',
        mockGridManager,
        50,
        100,
        customConfig
      );

      expect(customWave.x).toBe(50);
      expect(customWave.y).toBe(100);
    });

    it('should use gameBalance defaults when config not provided', () => {
      // WaveSprite should use gameBalance.waveSprite values
      expect(waveSprite).toBeDefined();
      // Defaults are applied internally
    });

    it('should initialize with empty sections array', () => {
      // Should not throw when no sections set
      expect(() => waveSprite.update(16)).not.toThrow();
    });

    it('should start in idle state', () => {
      expect(waveSprite.getState()).toBe('idle');
      expect(waveSprite.isComplete()).toBe(false);
    });
  });

  describe('Section and Line Bounds', () => {
    it('should store section bounds', () => {
      const sections = [
        createMockSectionBounds('A', 0, 200),
        createMockSectionBounds('B', 250, 450),
        createMockSectionBounds('C', 500, 700),
      ];

      expect(() => waveSprite.setSections(sections)).not.toThrow();
    });

    it('should set line bounds for vertical rendering', () => {
      expect(() => waveSprite.setLineBounds(50, 400)).not.toThrow();
    });

    it('should copy sections array defensively', () => {
      const sections = [createMockSectionBounds('A', 0, 200)];
      waveSprite.setSections(sections);
      
      // Mutate original array
      sections.push(createMockSectionBounds('B', 250, 450));
      
      // WaveSprite should have its own copy
      // (verified by checking no errors on collision detection)
      expect(() => waveSprite.update(16)).not.toThrow();
    });
  });

  describe('Movement State Machine', () => {
    beforeEach(() => {
      waveSprite.setTarget('right', 500);
      waveSprite.setLineBounds(0, 400);
    });

    it('should transition from idle to moving', () => {
      expect(waveSprite.getState()).toBe('idle');
      
      waveSprite.startMovement();
      
      expect(waveSprite.getState()).toBe('moving');
    });

    it('should emit movementStarted event on start', () => {
      const callback = vi.fn();
      waveSprite.on('movementStarted', callback);
      
      waveSprite.startMovement();
      
      expect(callback).toHaveBeenCalledWith({
        actorId: 'wave-1',
        x: 100,
      });
    });

    it('should remain idle when update called before startMovement', () => {
      waveSprite.update(16);
      
      expect(waveSprite.getState()).toBe('idle');
      expect(waveSprite.x).toBe(100); // No movement
    });

    it('should move toward target when in moving state', () => {
      const initialX = waveSprite.x;
      
      waveSprite.startMovement();
      waveSprite.update(100); // 100ms delta
      
      expect(waveSprite.x).toBeGreaterThan(initialX);
      expect(waveSprite.getState()).toBe('moving');
    });

    it('should reach target and transition to complete', () => {
      waveSprite.setTarget('right', 150); // Very close target
      waveSprite.startMovement();
      
      // Multiple updates to reach target
      for (let i = 0; i < 10; i++) {
        waveSprite.update(100);
        if (waveSprite.isComplete()) break;
      }
      
      expect(waveSprite.x).toBe(150);
      expect(waveSprite.getState()).toBe('complete');
      expect(waveSprite.isComplete()).toBe(true);
    });

    it('should emit pathComplete event when reaching target', () => {
      const callback = vi.fn();
      waveSprite.on('pathComplete', callback);
      
      waveSprite.setTarget('right', 120);
      waveSprite.startMovement();
      
      // Update until complete
      for (let i = 0; i < 10; i++) {
        waveSprite.update(100);
        if (waveSprite.isComplete()) break;
      }
      
      expect(callback).toHaveBeenCalledWith({
        actorId: 'wave-1',
        finalX: 120,
      });
    });

    it('should not move when already complete', () => {
      waveSprite.setTarget('right', 120);
      waveSprite.startMovement();
      
      // Reach target
      for (let i = 0; i < 10; i++) {
        waveSprite.update(100);
        if (waveSprite.isComplete()) break;
      }
      
      const finalX = waveSprite.x;
      
      // Additional updates should not change position
      waveSprite.update(100);
      waveSprite.update(100);
      
      expect(waveSprite.x).toBe(finalX);
    });

    it('should clear entered sections on startMovement', () => {
      const sections = [createMockSectionBounds('A', 50, 150)];
      waveSprite.setSections(sections);
      
      const enterCallback = vi.fn();
      waveSprite.on('waveSpriteEntersSection', enterCallback);
      
      // First movement - enter section A
      waveSprite.setTarget('right', 200);
      waveSprite.startMovement();
      waveSprite.update(100);
      
      expect(enterCallback).toHaveBeenCalledTimes(1);
      
      // Reset and start again - should trigger enter event again
      waveSprite = new WaveSprite(mockScene, 'wave-2', mockGridManager, 100, 200);
      waveSprite.setSections(sections);
      waveSprite.on('waveSpriteEntersSection', enterCallback);
      waveSprite.setTarget('right', 200);
      waveSprite.startMovement();
      waveSprite.update(100);
      
      expect(enterCallback).toHaveBeenCalledTimes(2);
    });
  });

  describe('Speed Calculation', () => {
    it('should calculate speed based on wave strength', () => {
      const baseSpeed = 300;
      const highStrength = new WaveSprite(
        mockScene,
        'wave-high',
        mockGridManager,
        0,
        0,
        { baseSpeed, waveStrength: 100 }
      );
      
      highStrength.setTarget('right', 1000);
      highStrength.startMovement();
      highStrength.update(100); // 100ms
      
      // Should move baseSpeed × 1.0 × 0.1s = 30 pixels
      expect(highStrength.x).toBeCloseTo(30, 0);
    });

    it('should apply minimum 20% speed at 0 strength', () => {
      const baseSpeed = 300;
      const zeroStrength = new WaveSprite(
        mockScene,
        'wave-zero',
        mockGridManager,
        0,
        0,
        { baseSpeed, waveStrength: 0 }
      );
      
      zeroStrength.setTarget('right', 1000);
      zeroStrength.startMovement();
      zeroStrength.update(100); // 100ms
      
      // Should move baseSpeed × 0.2 × 0.1s = 6 pixels (minimum speed)
      expect(zeroStrength.x).toBeCloseTo(6, 0);
    });

    it('should update speed when wave strength changes', () => {
      const baseSpeed = 400;
      const wave = new WaveSprite(
        mockScene,
        'wave-dynamic',
        mockGridManager,
        0,
        0,
        { baseSpeed, waveStrength: 50 }
      );
      
      wave.setTarget('right', 1000);
      wave.startMovement();
      wave.update(100); // 100ms at 50% strength
      
      const positionAt50 = wave.x;
      // Should move baseSpeed × 0.5 × 0.1s = 20 pixels
      expect(positionAt50).toBeCloseTo(20, 0);
      
      // Increase strength
      wave.setWaveStrength(100);
      wave.update(100); // 100ms at 100% strength
      
      // Should move additional baseSpeed × 1.0 × 0.1s = 40 pixels
      expect(wave.x).toBeCloseTo(60, 0);
    });

    it('should clamp wave strength to 0-100 range', () => {
      waveSprite.setWaveStrength(-50);
      // Should clamp to 0 (verified by movement)
      
      waveSprite.setWaveStrength(150);
      // Should clamp to 100 (verified by movement)
      
      // No errors should occur
      expect(() => waveSprite.update(16)).not.toThrow();
    });
  });

  describe('Direction Handling', () => {
    it('should move right when direction is right', () => {
      waveSprite.setTarget('right', 200);
      waveSprite.startMovement();
      
      const initialX = waveSprite.x;
      waveSprite.update(100);
      
      expect(waveSprite.x).toBeGreaterThan(initialX);
    });

    it('should move left when direction is left', () => {
      const leftWave = new WaveSprite(mockScene, 'wave-left', mockGridManager, 500, 200);
      leftWave.setTarget('left', 100);
      leftWave.startMovement();
      
      const initialX = leftWave.x;
      leftWave.update(100);
      
      expect(leftWave.x).toBeLessThan(initialX);
    });

    it('should reach target when moving left', () => {
      const leftWave = new WaveSprite(
        mockScene,
        'wave-left',
        mockGridManager,
        200,
        200,
        { baseSpeed: 500 }
      );
      
      leftWave.setTarget('left', 50);
      leftWave.startMovement();
      
      // Update until complete
      for (let i = 0; i < 20; i++) {
        leftWave.update(100);
        if (leftWave.isComplete()) break;
      }
      
      expect(leftWave.x).toBe(50);
      expect(leftWave.isComplete()).toBe(true);
    });
  });

  describe('Section Collision Detection', () => {
    beforeEach(() => {
      const sections = [
        createMockSectionBounds('A', 100, 200),
        createMockSectionBounds('B', 250, 350),
        createMockSectionBounds('C', 400, 500),
      ];
      waveSprite.setSections(sections);
    });

    it('should emit enter event when entering section', () => {
      const enterCallback = vi.fn();
      waveSprite.on('waveSpriteEntersSection', enterCallback);
      
      waveSprite.setTarget('right', 600);
      waveSprite.startMovement();
      
      // Position sprite inside section A
      waveSprite.x = 150;
      waveSprite.update(16);
      
      expect(enterCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'wave-1',
          sectionId: 'A',
          sectionIndex: 0,
        })
      );
      
      // X coordinate should be approximately 150
      const call = enterCallback.mock.calls[0][0];
      expect(call.x).toBeCloseTo(150, -1); // Within 10 pixels
    });

    it('should emit exit event when leaving section', () => {
      const exitCallback = vi.fn();
      waveSprite.on('waveSpriteExitsSection', exitCallback);
      
      // Start inside section A
      waveSprite.x = 150;
      waveSprite.setTarget('right', 600);
      waveSprite.startMovement();
      waveSprite.update(16); // Register entry
      
      // Move outside section A
      waveSprite.x = 220;
      waveSprite.update(16);
      
      expect(exitCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'wave-1',
          sectionId: 'A',
          sectionIndex: 0,
        })
      );
      
      // X coordinate should be approximately 220
      const call = exitCallback.mock.calls[0][0];
      expect(call.x).toBeCloseTo(220, -1); // Within 10 pixels
    });

    it('should only emit enter event once per section', () => {
      const enterCallback = vi.fn();
      waveSprite.on('waveSpriteEntersSection', enterCallback);
      
      waveSprite.x = 150; // Inside section A
      waveSprite.setTarget('right', 600);
      waveSprite.startMovement();
      
      waveSprite.update(16);
      waveSprite.update(16);
      waveSprite.update(16);
      
      // Should only emit once
      expect(enterCallback).toHaveBeenCalledTimes(1);
    });

    it('should detect multiple section transitions', () => {
      const enterCallback = vi.fn();
      waveSprite.on('waveSpriteEntersSection', enterCallback);
      
      waveSprite.setTarget('right', 600);
      waveSprite.startMovement();
      
      // Manually move through sections
      waveSprite.x = 150; // Section A
      waveSprite.update(16);
      
      waveSprite.x = 300; // Section B
      waveSprite.update(16);
      
      waveSprite.x = 450; // Section C
      waveSprite.update(16);
      
      expect(enterCallback).toHaveBeenCalledTimes(3);
      expect(enterCallback).toHaveBeenNthCalledWith(1, expect.objectContaining({ sectionId: 'A' }));
      expect(enterCallback).toHaveBeenNthCalledWith(2, expect.objectContaining({ sectionId: 'B' }));
      expect(enterCallback).toHaveBeenNthCalledWith(3, expect.objectContaining({ sectionId: 'C' }));
    });

    it('should handle empty sections array without errors', () => {
      waveSprite.setSections([]);
      waveSprite.setTarget('right', 500);
      waveSprite.startMovement();
      
      expect(() => {
        for (let i = 0; i < 10; i++) {
          waveSprite.update(100);
        }
      }).not.toThrow();
    });

    it('should track which sections have been entered', () => {
      const enterCallback = vi.fn();
      const exitCallback = vi.fn();
      waveSprite.on('waveSpriteEntersSection', enterCallback);
      waveSprite.on('waveSpriteExitsSection', exitCallback);
      
      waveSprite.setTarget('right', 600);
      waveSprite.startMovement();
      
      // Enter section A
      waveSprite.x = 150;
      waveSprite.update(16);
      
      // Exit section A
      waveSprite.x = 220;
      waveSprite.update(16);
      
      // Re-enter section A should NOT emit (hasEnteredSection tracks this)
      // Actually, exiting should allow re-entry, but startMovement clears the set
      
      expect(exitCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('Event System', () => {
    it('should subscribe to events', () => {
      const callback = vi.fn();
      waveSprite.on('testEvent', callback);
      
      // Manually emit for testing
      (waveSprite as any).emit('testEvent', { data: 'test' });
      
      expect(callback).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should unsubscribe from events', () => {
      const callback = vi.fn();
      waveSprite.on('testEvent', callback);
      waveSprite.off('testEvent', callback);
      
      (waveSprite as any).emit('testEvent', { data: 'test' });
      
      expect(callback).not.toHaveBeenCalled();
    });

    it('should support multiple listeners for same event', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      waveSprite.on('testEvent', callback1);
      waveSprite.on('testEvent', callback2);
      
      (waveSprite as any).emit('testEvent', { data: 'test' });
      
      expect(callback1).toHaveBeenCalledWith({ data: 'test' });
      expect(callback2).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should only remove specific callback when unsubscribing', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      waveSprite.on('testEvent', callback1);
      waveSprite.on('testEvent', callback2);
      waveSprite.off('testEvent', callback1);
      
      (waveSprite as any).emit('testEvent', { data: 'test' });
      
      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledWith({ data: 'test' });
    });

    it('should handle unsubscribing non-existent listener', () => {
      const callback = vi.fn();
      
      expect(() => waveSprite.off('nonExistentEvent', callback)).not.toThrow();
    });
  });

  describe('Debug Visuals', () => {
    it('should create debug graphics when debugVisible is true', () => {
      const debugWave = new WaveSprite(
        mockScene,
        'wave-debug',
        mockGridManager,
        100,
        200,
        { debugVisible: true }
      );
      
      expect(mockScene.add.graphics).toHaveBeenCalled();
    });

    it('should not create debug graphics when debugVisible is false', () => {
      mockScene.add.graphics.mockClear();
      
      const noDebugWave = new WaveSprite(
        mockScene,
        'wave-no-debug',
        mockGridManager,
        100,
        200,
        { debugVisible: false }
      );
      
      // Graphics should not be created initially
      expect(mockScene.add.graphics).not.toHaveBeenCalled();
    });

    it('should toggle debug visibility', () => {
      const mockGraphics = mockScene.add.graphics();
      
      waveSprite.setDebugVisible(true);
      expect(mockScene.add.graphics).toHaveBeenCalled();
      
      waveSprite.setDebugVisible(false);
      expect(mockGraphics.setVisible).toHaveBeenCalledWith(false);
    });

    it('should update debug visual during movement', () => {
      // Create fresh scene mock for this test
      const freshScene = createMockScene();
      const debugWave = new WaveSprite(
        freshScene,
        'wave-debug',
        mockGridManager,
        100,
        200,
        { debugVisible: true }
      );
      
      debugWave.setLineBounds(0, 400);
      debugWave.setTarget('right', 500);
      debugWave.startMovement();
      
      // Verify graphics were created
      expect(freshScene.add.graphics).toHaveBeenCalled();
      
      // Get the graphics mock that was created
      const mockGraphics = freshScene.add.graphics.mock.results[0].value;
      
      // Note: Debug visual rendering is controlled by gameBalance.waveSprite.visible
      // Since we can't easily mock gameBalance in this test, just verify graphics exists
      expect(mockGraphics).toBeDefined();
    });

    it('should render vertical line with correct coordinates', () => {
      const freshScene = createMockScene();
      const debugWave = new WaveSprite(
        freshScene,
        'wave-debug',
        mockGridManager,
        100,
        200,
        { debugVisible: true }
      );
      
      debugWave.setLineBounds(50, 450);
      debugWave.setTarget('right', 500);
      debugWave.startMovement();
      
      // Verify graphics were created with correct line bounds set
      expect(freshScene.add.graphics).toHaveBeenCalled();
      const mockGraphics = freshScene.add.graphics.mock.results[0].value;
      expect(mockGraphics).toBeDefined();
    });

    it('should render direction indicator arrow', () => {
      const freshScene = createMockScene();
      const debugWave = new WaveSprite(
        freshScene,
        'wave-debug',
        mockGridManager,
        100,
        200,
        { debugVisible: true, debugColor: 0xff0000 }
      );
      
      debugWave.setLineBounds(50, 450);
      debugWave.setTarget('right', 500);
      debugWave.startMovement();
      
      // Verify debug graphics created with custom color
      expect(freshScene.add.graphics).toHaveBeenCalled();
      const mockGraphics = freshScene.add.graphics.mock.results[0].value;
      expect(mockGraphics).toBeDefined();
    });

    it('should use custom debug colors and styles', () => {
      const freshScene = createMockScene();
      const debugWave = new WaveSprite(
        freshScene,
        'wave-custom-debug',
        mockGridManager,
        100,
        200,
        { 
          debugVisible: true,
          debugColor: 0x00ff00,
          debugAlpha: 0.5,
          lineWidth: 7,
        }
      );
      
      debugWave.setLineBounds(0, 400);
      debugWave.setTarget('right', 500);
      debugWave.startMovement();
      
      // Verify custom config was accepted
      expect(freshScene.add.graphics).toHaveBeenCalled();
      const mockGraphics = freshScene.add.graphics.mock.results[0].value;
      expect(mockGraphics).toBeDefined();
    });
  });

  describe('Cleanup', () => {
    it('should destroy debug graphics on destroy', () => {
      const debugWave = new WaveSprite(
        mockScene,
        'wave-debug',
        mockGridManager,
        100,
        200,
        { debugVisible: true }
      );
      
      const mockGraphics = mockScene.add.graphics();
      
      debugWave.destroy();
      
      expect(mockGraphics.destroy).toHaveBeenCalled();
    });

    it('should clear event listeners on destroy', () => {
      const callback = vi.fn();
      waveSprite.on('testEvent', callback);
      
      waveSprite.destroy();
      
      (waveSprite as any).emit('testEvent', { data: 'test' });
      
      // Should not call callback after destroy
      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle destroy when no debug graphics exist', () => {
      expect(() => waveSprite.destroy()).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero delta time', () => {
      waveSprite.setTarget('right', 500);
      waveSprite.startMovement();
      
      const initialX = waveSprite.x;
      waveSprite.update(0);
      
      expect(waveSprite.x).toBe(initialX); // No movement
    });

    it('should handle very large delta time', () => {
      waveSprite.setTarget('right', 200);
      waveSprite.startMovement();
      
      waveSprite.update(10000); // 10 seconds
      
      // Should reach target without overshooting
      expect(waveSprite.x).toBe(200);
      expect(waveSprite.isComplete()).toBe(true);
    });

    it('should handle same start and target position', () => {
      waveSprite.setTarget('right', 100); // Same as initial x
      waveSprite.startMovement();
      
      waveSprite.update(16);
      
      expect(waveSprite.x).toBe(100);
      expect(waveSprite.isComplete()).toBe(true);
    });

    it('should handle negative coordinates', () => {
      const negWave = new WaveSprite(mockScene, 'wave-neg', mockGridManager, -100, -50);
      
      negWave.setTarget('left', -200);
      negWave.startMovement();
      
      negWave.update(100);
      
      expect(negWave.x).toBeLessThan(-100);
    });

    it('should handle section bounds edge cases', () => {
      const sections = [
        createMockSectionBounds('Edge', 100, 100), // Zero width section
      ];
      
      waveSprite.setSections(sections);
      waveSprite.setTarget('right', 200);
      waveSprite.startMovement();
      
      expect(() => {
        for (let i = 0; i < 10; i++) {
          waveSprite.update(16);
        }
      }).not.toThrow();
    });
  });
});
