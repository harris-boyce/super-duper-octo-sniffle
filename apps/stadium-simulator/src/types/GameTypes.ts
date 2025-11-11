/**
 * Game type definitions for Stadium Simulator
 */

export interface Section {
  id: number;
  happiness: number;
  thirst: number;
  attention: number;
}

export interface Wave {
  countdown: number;
  active: boolean;
  currentSection: number;
  multiplier: number;
}

export interface Vendor {
  position: { x: number; y: number };
  cooldown: number;
  isServing: boolean;
}

export interface Mascot {
  cooldown: number;
  isActive: boolean;
}

export interface GameState {
  sections: Section[];
  wave: Wave;
  vendors: Vendor[];
  mascot: Mascot;
  score: number;
}
