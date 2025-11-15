import { SceneryActor } from '@/actors/Actor';
import { StadiumSection } from '@/sprites/StadiumSection';
import type { ActorCategory } from '@/actors/ActorTypes';

/**
 * SectionActor: Adapter wrapping StadiumSection as a SceneryActor.
 * Minimal adapter since sections are mostly static after creation.
 */
export class SectionActor extends SceneryActor {
  private section: StadiumSection;
  private sectionId: string;

  constructor(id: string, section: StadiumSection, sectionId: string, category: ActorCategory = 'section', enableLogging = false) {
    super(id, 'section', category, section.x, section.y, enableLogging);
    this.section = section;
    this.sectionId = sectionId;
    this.logger.debug(`SectionActor created for section ${sectionId}`);
  }

  /**
   * Get wrapped StadiumSection sprite.
   */
  public getSection(): StadiumSection {
    return this.section;
  }

  /**
   * Get section identifier (A, B, C).
   */
  public getSectionId(): string {
    return this.sectionId;
  }

  /**
   * Get section stats for registry snapshot.
   */
  public getStats() {
    return {
      sectionId: this.sectionId,
      position: { x: this.section.x, y: this.section.y }
    };
  }
}
