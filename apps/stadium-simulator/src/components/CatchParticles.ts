import Phaser from 'phaser';
import { gameBalance } from '@/config/gameBalance';

/**
 * Particle effect system for t-shirt catch events
 * Creates retro-style pixel particles with arcade feel
 */
export class CatchParticles {
  /**
   * Create a particle burst at catching fan's position
   * 
   * @param scene - Phaser scene
   * @param x - World X position
   * @param y - World Y position
   * @param config - Optional configuration for particle behavior
   * 
   * @example
   * // Simple burst at fan position
   * CatchParticles.create(this.scene, fan.x, fan.y);
   * 
   * @example
   * // Custom configuration
   * CatchParticles.create(this.scene, fan.x, fan.y, {
   *   particleCount: 20,
   *   lifespan: 800,
   *   color: 0xFF00FF
   * });
   */
  public static create(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config?: {
      particleCount?: number;
      lifespan?: number;
      color?: number;
      speed?: { min: number; max: number };
    }
  ): void {
    // Default configuration
    const particleCount = config?.particleCount ?? gameBalance.visuals.catchParticleCount;
    const lifespan = config?.lifespan ?? gameBalance.visuals.catchParticleLifespan;
    const color = config?.color ?? gameBalance.visuals.catchParticleColor;
    const speed = config?.speed ?? { min: 50, max: 150 };
    
    // Create particle emitter
    const particles = scene.add.particles(x, y, 'particle', {
      speed: speed,
      angle: { min: 0, max: 360 },
      scale: { start: 1.0, end: 0 },
      alpha: { start: 1.0, end: 0 },
      lifespan: lifespan,
      quantity: particleCount,
      blendMode: 'ADD',
      tint: color,
      frequency: -1, // One-shot emission
    });
    
    // Emit particles
    particles.explode(particleCount, x, y);
    
    // Auto-destroy after animation completes
    scene.time.delayedCall(lifespan + 100, () => {
      particles.destroy();
    });
  }
  
  /**
   * Create a "sparkle" effect (smaller, faster particles)
   * Used for re-engagement moments
   */
  public static createSparkle(
    scene: Phaser.Scene,
    x: number,
    y: number
  ): void {
    CatchParticles.create(scene, x, y, {
      particleCount: gameBalance.visuals.reEngageSparkleCount,
      lifespan: 400,
      color: 0xFFFFFF, // White sparkle
      speed: { min: 30, max: 80 }
    });
  }
}
