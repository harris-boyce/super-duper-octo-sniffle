import { BaseManager } from '@/managers/base/BaseManager';
import { AnnouncerService } from '@/managers/AnnouncerService';

export class AnnouncerServiceWrapper extends BaseManager {
  private inner: AnnouncerService;
  constructor(inner?: AnnouncerService) {
    super({ name: 'Announcer', category: 'service:announcer', logLevel: 'info' });
    this.inner = inner || new AnnouncerService();
  }
  async getCommentary(ctx: string): Promise<string> {
    try {
      const result = await this.inner.getCommentary(ctx);
      this.log('event', 'Commentary received', { ctx });
      return result;
    } catch (e) {
      this.log('warn', 'Commentary fallback used');
      return 'The crowd goes wild!';
    }
  }
  getInner(): AnnouncerService { return this.inner; }
}
