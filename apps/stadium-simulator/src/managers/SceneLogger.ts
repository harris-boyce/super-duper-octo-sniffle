import { BaseManager } from '@/managers/base/BaseManager';

/** SceneLogger centralizes StadiumScene orchestration logging under category `scene:stadium`. */
export class SceneLogger extends BaseManager {
  constructor() {
    super({ name: 'StadiumScene', category: 'scene:stadium', logLevel: 'info' });
  }
}
