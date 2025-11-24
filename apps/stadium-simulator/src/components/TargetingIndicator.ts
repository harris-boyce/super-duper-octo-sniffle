import Phaser from 'phaser';
import { Fan } from '@/sprites/Fan';
import { gameBalance } from '@/config/gameBalance';

/**
 * Visual indicator showing which fans will catch t-shirts
 * Displays 1 second before cannon fires
 */
export class TargetingIndicator extends Phaser.GameObjects.Container {
  private graphics: Phaser.GameObjects.Graphics;
  private isShowing: boolean = false;
  
  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    
    this.graphics = scene.add.graphics();
    this.add(this.graphics);
    
    scene.add.existing(this);
  }
  
  /**
   * Show targeting reticle around fans about to catch
   * 
   * @param fans - Array of fans who will catch
   * @param duration - How long to display (ms)
   * 
   * @example
   * indicator.showTargetArea([fan1, fan2], 1000);
   * // Shows pulsing circles around fans for 1 second
   */
  public showTargetArea(fans: Fan[], duration: number = gameBalance.visuals.targetingDuration): void {
    if (this.isShowing) {
      this.clear();
    }
    
    this.isShowing = true;
    this.graphics.clear();
    
    if (fans.length === 0) return;
    
    // Draw targeting reticle for each fan
    fans.forEach(fan => {
      this.drawReticle(fan.x, fan.y);
    });
    
    // Pulse animation
    this.scene.tweens.add({
      targets: this.graphics,
      alpha: { from: 0.8, to: 0.3 },
      duration: 300,
      yoyo: true,
      repeat: Math.floor(duration / 600) - 1,
      onComplete: () => {
        this.clear();
      }
    });
  }
  
  /**
   * Draw a retro-style targeting reticle
   * Pixelated circle with crosshairs
   */
  private drawReticle(x: number, y: number): void {
    const radius = gameBalance.visuals.targetingReticleRadius;
    const color = gameBalance.visuals.targetingReticleColor;
    const lineWidth = 2;
    
    // Outer circle
    this.graphics.lineStyle(lineWidth, color, 0.8);
    this.graphics.strokeCircle(x, y, radius);
    
    // Inner highlight circle
    this.graphics.lineStyle(lineWidth, color, 0.4);
    this.graphics.strokeCircle(x, y, radius - 5);
    
    // Crosshairs (retro style - chunky pixels)
    const crosshairLength = radius + 8;
    this.graphics.lineStyle(lineWidth + 1, color, 0.6);
    
    // Vertical line (top)
    this.graphics.lineBetween(x, y - crosshairLength, x, y - radius - 2);
    // Vertical line (bottom)
    this.graphics.lineBetween(x, y + radius + 2, x, y + crosshairLength);
    // Horizontal line (left)
    this.graphics.lineBetween(x - crosshairLength, y, x - radius - 2, y);
    // Horizontal line (right)
    this.graphics.lineBetween(x + radius + 2, y, x + crosshairLength, y);
    
    // Center dot
    this.graphics.fillStyle(color, 1.0);
    this.graphics.fillCircle(x, y, 3);
  }
  
  /**
   * Clear all targeting indicators
   */
  public clear(): void {
    this.isShowing = false;
    this.graphics.clear();
    this.scene.tweens.killTweensOf(this.graphics);
    this.graphics.setAlpha(1.0);
  }
  
  /**
   * Destroy indicator and cleanup
   */
  public destroy(fromScene?: boolean): void {
    this.clear();
    super.destroy(fromScene);
  }
}
