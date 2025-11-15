import { AnimatedActor } from '@/actors/Actor';
import { Vendor } from '@/sprites/Vendor';
import type { ActorCategory } from '@/actors/ActorTypes';

/**
 * VendorActor: Adapter wrapping Vendor sprite as an AnimatedActor.
 * Delegates movement and service logic to existing Vendor.
 */
export class VendorActor extends AnimatedActor {
  private vendor: Vendor;

  constructor(id: string, vendor: Vendor, category: ActorCategory = 'vendor', enableLogging = false) {
    super(id, 'vendor', category, vendor.x, vendor.y, enableLogging);
    this.vendor = vendor;
    this.logger.debug('VendorActor created, wrapping Vendor sprite');
  }

  /**
   * Update vendor position from sprite.
   * Actual vendor logic is handled by VendorManager.
   */
  public update(delta: number): void {
    this.x = this.vendor.x;
    this.y = this.vendor.y;
  }

  /**
   * Refresh vendor visual (handled by VendorManager events).
   */
  public draw(): void {
    // Vendor animation already driven by state changes
  }

  /**
   * Get wrapped Vendor sprite.
   */
  public getVendor(): Vendor {
    return this.vendor;
  }

  /**
   * Get vendor state for registry snapshot.
   */
  public getState() {
    return {
      position: { x: this.vendor.x, y: this.vendor.y }
    };
  }
}
