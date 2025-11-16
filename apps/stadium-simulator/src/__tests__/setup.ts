// Test setup and utilities
import { vi } from 'vitest';

// Mock Phaser globally to prevent canvas initialization
vi.mock('phaser', () => {
  return {
    default: {
      GameObjects: {
        Container: class Container {
          scene: any;
          x: number = 0;
          y: number = 0;
          constructor(scene: any, x: number, y: number) {
            this.scene = scene;
            this.x = x;
            this.y = y;
          }
          add(children: any) {
            // Mock add method for Container
            return this;
          }
          destroy() {}
        },
        Sprite: class Sprite {
          scene: any;
          x: number = 0;
          y: number = 0;
          constructor(scene: any, x: number, y: number, texture: string) {
            this.scene = scene;
            this.x = x;
            this.y = y;
          }
          destroy() {}
        },
        Graphics: class Graphics {
          clear = vi.fn();
          lineStyle = vi.fn();
          lineBetween = vi.fn();
          setDepth = vi.fn();
          setVisible = vi.fn();
          destroy = vi.fn();
        },
      },
      Scene: class Scene {
        add = {
          graphics: vi.fn(() => ({
            clear: vi.fn(),
            lineStyle: vi.fn(),
            lineBetween: vi.fn(),
            setDepth: vi.fn(),
            setVisible: vi.fn(),
            destroy: vi.fn(),
          })),
          rectangle: vi.fn(() => ({
            setOrigin: vi.fn().mockReturnThis(),
            setDepth: vi.fn().mockReturnThis(),
            destroy: vi.fn(),
          })),
          container: vi.fn(() => ({
            add: vi.fn(),
            setDepth: vi.fn().mockReturnThis(),
            destroy: vi.fn(),
          })),
          existing: vi.fn((gameObject) => gameObject),
        };
      },
      Math: {
        Clamp: (value: number, min: number, max: number) => Math.max(min, Math.min(max, value)),
        Between: (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min,
        FloatBetween: (min: number, max: number) => Math.random() * (max - min) + min,
        Distance: {
          Between: (x1: number, y1: number, x2: number, y2: number) => {
            const dx = x2 - x1;
            const dy = y2 - y1;
            return Math.sqrt(dx * dx + dy * dy);
          },
        },
      },
    },
  };
});

export {};

