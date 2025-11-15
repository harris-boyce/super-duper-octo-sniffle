import { BaseManager } from '@/managers/base/BaseManager';
import { VendorManager } from '@/managers/VendorManager';
import type { VendorInstance } from '@/managers/VendorManager';
import type { StadiumSection } from '@/sprites/StadiumSection';

// List of inner events we bridge outward (extended to include legacy placement)
const BRIDGED_EVENTS = [
  'vendorSpawned',
  'vendorPlaced',
  'vendorReachedTarget',
  'serviceComplete',
  'vendorDistracted',
  'vendorSectionAssigned',
  'vendorScanAttempt',
  'vendorTargetSelected',
  'vendorNoTarget'
];

/** Wrapper for VendorManager providing unified logging/event surface */
export class VendorManagerWrapper extends BaseManager {
  private inner: VendorManager;

  constructor(inner: VendorManager) {
    super({ name: 'Vendor', category: 'manager:vendor', logLevel: 'info' });
    this.inner = inner;
    // Bridge inner events
    BRIDGED_EVENTS.forEach(evt => {
      this.inner.on(evt, (payload: any) => {
        this.emit(evt, payload); // re-emit outward
        // Minimal logging for key events
        switch (evt) {
          case 'vendorSpawned':
            this.log('event', `Vendor spawned id=${payload.vendorId}`);
            break;
          case 'vendorPlaced':
            this.log('info', `Legacy vendor placed id=${payload.vendorId} section=${payload.section}`);
            break;
          case 'vendorTargetSelected':
            this.log('debug', `Target selected vendor=${payload.vendorId} section=${payload.sectionIdx} row=${payload.rowIdx} col=${payload.colIdx}`);
            break;
          case 'serviceComplete':
            this.log('info', `Service complete vendor=${payload.vendorId}`);
            break;
        }
      });
    });
  }

  initializeSections(sections: StadiumSection[]): void {
    this.inner.initializeSections(sections);
    this.log('info', 'Sections initialized for pathfinding');
  }

  spawnInitialVendors(count?: number): void {
    this.inner.spawnInitialVendors(count);
    this.log('info', 'Initial vendors spawned');
  }

  getVendorInstance(id: number): VendorInstance | undefined {
    return this.inner.getVendorInstance(id);
  }

  /**
   * Return map of all vendor instances (profile-based)
   */
  getVendorInstances(): Map<number, VendorInstance> {
    return this.inner.getVendorInstances();
  }

  /**
   * Proxy legacy placement method (used by existing scene buttons)
   */
  placeVendor(vendorId: number, sectionId: string): boolean {
    const ok = this.inner.placeVendor(vendorId, sectionId);
    if (ok) {
      this.log('event', `Placed legacy vendor id=${vendorId} section=${sectionId}`);
    } else {
      this.log('debug', `PlaceVendor rejected id=${vendorId} (cooldown or already serving)`);
    }
    return ok;
  }

  update(delta: number): void {
    this.inner.update(delta);
  }

  assignVendorToSection(vendorId: number, sectionIdx: number): void {
    this.inner.assignVendorToSection(vendorId, sectionIdx);
    this.log('event', `Assigned vendor ${vendorId} to sectionIdx=${sectionIdx}`);
  }
}
