import Phaser from 'phaser';

export class Vendor extends Phaser.GameObjects.Sprite {
  private cooldown: number;
  private isServing: boolean;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'vendor'); // 'vendor' sprite key to be loaded
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.cooldown = 0;
    this.isServing = false;

    // TODO: Add animation setup
  }

  public serve(): void {
    // TODO: Implement serving logic
    if (this.cooldown <= 0) {
      this.isServing = true;
      this.cooldown = 60; // 1 second cooldown at 60 FPS
    }
  }

  public update(delta: number): void {
    // TODO: Update cooldown timer
    if (this.cooldown > 0) {
      this.cooldown -= delta;
    } else {
      this.isServing = false;
    }
  }

  public getBody(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }
}
