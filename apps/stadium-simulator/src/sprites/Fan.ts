import Phaser from 'phaser';

export class Fan extends Phaser.GameObjects.Sprite {
  private happiness: number;
  private isWaving: boolean;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'fan'); // 'fan' sprite key to be loaded
    scene.add.existing(this);

    this.happiness = 50;
    this.isWaving = false;

    // TODO: Add animation setup
  }

  public wave(): void {
    // TODO: Implement wave animation
    this.isWaving = true;
  }

  public stopWaving(): void {
    this.isWaving = false;
  }

  public getHappiness(): number {
    return this.happiness;
  }

  public adjustHappiness(delta: number): void {
    // TODO: Implement happiness adjustment logic
    this.happiness = Phaser.Math.Clamp(this.happiness + delta, 0, 100);
  }
}
