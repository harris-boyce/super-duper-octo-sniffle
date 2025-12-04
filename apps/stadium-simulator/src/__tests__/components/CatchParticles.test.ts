import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CatchParticles } from '@/components/CatchParticles';
import { gameBalance } from '@/config/gameBalance';

// Mock Phaser scene
const createMockScene = (): any => {
  return {
    add: {
      particles: vi.fn().mockReturnValue({
        explode: vi.fn(),
        destroy: vi.fn(),
      }),
    },
    time: {
      delayedCall: vi.fn(),
    },
  };
};

describe('CatchParticles', () => {
  let scene: any;
  
  beforeEach(() => {
    scene = createMockScene();
  });
  
  describe('create', () => {
    it('creates particle emitter at specified position', () => {
      const particlesSpy = scene.add.particles;
      
      CatchParticles.create(scene, 100, 200);
      
      expect(particlesSpy).toHaveBeenCalledWith(
        100, 200, 'particle', expect.any(Object)
      );
    });
    
    it('uses default configuration when none provided', () => {
      const particlesSpy = scene.add.particles;
      
      CatchParticles.create(scene, 100, 200);
      
      const config = particlesSpy.mock.calls[0][3];
      expect(config.quantity).toBe(gameBalance.visuals.catchParticleCount);
      expect(config.lifespan).toBe(gameBalance.visuals.catchParticleLifespan);
      expect(config.tint).toBe(gameBalance.visuals.catchParticleColor);
    });
    
    it('respects custom configuration', () => {
      const particlesSpy = scene.add.particles;
      
      CatchParticles.create(scene, 100, 200, {
        particleCount: 25,
        lifespan: 800,
        color: 0xFF00FF
      });
      
      const config = particlesSpy.mock.calls[0][3];
      expect(config.quantity).toBe(25);
      expect(config.lifespan).toBe(800);
      expect(config.tint).toBe(0xFF00FF);
    });
    
    it('calls explode on particle emitter', () => {
      const mockParticles = scene.add.particles();
      
      CatchParticles.create(scene, 100, 200);
      
      expect(mockParticles.explode).toHaveBeenCalledWith(
        gameBalance.visuals.catchParticleCount
      );
    });
    
    it('schedules auto-destroy after lifespan', () => {
      const delaySpy = scene.time.delayedCall;
      
      CatchParticles.create(scene, 100, 200, { lifespan: 600 });
      
      expect(delaySpy).toHaveBeenCalledWith(
        700, // lifespan + 100
        expect.any(Function)
      );
    });
  });
  
  describe('createSparkle', () => {
    it('uses white color for sparkles', () => {
      const particlesSpy = scene.add.particles;
      
      CatchParticles.createSparkle(scene, 100, 200);
      
      const config = particlesSpy.mock.calls[0][3];
      expect(config.tint).toBe(0xFFFFFF); // White
    });
    
    it('uses fewer particles than regular catch effect', () => {
      const particlesSpy = scene.add.particles;
      
      CatchParticles.createSparkle(scene, 100, 200);
      
      const config = particlesSpy.mock.calls[0][3];
      expect(config.quantity).toBe(gameBalance.visuals.reEngageSparkleCount);
      expect(config.quantity).toBeLessThan(gameBalance.visuals.catchParticleCount);
    });
    
    it('has shorter lifespan than regular catch effect', () => {
      const particlesSpy = scene.add.particles;
      
      CatchParticles.createSparkle(scene, 100, 200);
      
      const config = particlesSpy.mock.calls[0][3];
      expect(config.lifespan).toBe(400);
      expect(config.lifespan).toBeLessThan(gameBalance.visuals.catchParticleLifespan);
    });
  });
});
