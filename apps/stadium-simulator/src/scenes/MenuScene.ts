import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  preload(): void {
    // TODO: Add sprite loading in preload()
  }

  create(): void {
    // TODO: Implement scene initialization
    // Title screen with start button
    console.log('MenuScene created');
  }

  update(): void {
    // TODO: Implement menu update logic
  }
}
