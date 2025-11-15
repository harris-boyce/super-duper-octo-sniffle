import { BaseManager } from '@/managers/base/BaseManager';
import { SeatManager } from '@/managers/SeatManager';
import type { StadiumSection } from '@/sprites/StadiumSection';

export class SeatManagerWrapper extends BaseManager {
  private inner: SeatManager;
  constructor(inner: SeatManager) {
    super({ name: 'Seat', category: 'manager:seat', logLevel: 'info' });
    this.inner = inner;
  }
  initializeSections(sections: StadiumSection[]): void { this.inner.initializeSections(sections); }
  populateAllSeats(size?: number): void { this.inner.populateAllSeats(size); }
  getSections(): StadiumSection[] { return this.inner.getSections(); }
  getThirstyFansInSection(sectionIdx: number, threshold: number) { return this.inner.getThirstyFansInSection(sectionIdx, threshold); }
  getRowCrowdDensity(sectionIdx: number, rowIdx: number): number { return this.inner.getRowCrowdDensity(sectionIdx, rowIdx); }
  getInner(): SeatManager { return this.inner; }
}
