import { describe, it, expect } from 'vitest';
import { SeatManagerWrapper } from '@/managers/wrappers/SeatManagerWrapper';

// Rather than constructing SeatManager (which pulls Phaser internals), we validate wrapper creation logic by stubbing the inner object.
class StubSeatManager {
  initializeSections(arg: any) { this._sections = arg; }
  populateAllSeats() {}
  getSections() { return this._sections || []; }
  getThirstyFansInSection() { return []; }
  getRowCrowdDensity() { return 0; }
  _sections: any[] = [];
}

describe('SeatManagerWrapper', () => {
  it('proxies basic methods against stubbed inner manager', () => {
    const raw: any = new StubSeatManager();
    const wrapper = new SeatManagerWrapper(raw);
    wrapper.initializeSections([]);
    wrapper.populateAllSeats();
    expect(wrapper.getSections()).toEqual([]);
    expect(wrapper.getThirstyFansInSection(0, 50)).toEqual([]);
    expect(wrapper.getRowCrowdDensity(0, 0)).toBe(0);
  });
});
