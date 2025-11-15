import { describe, it, expect, vi } from 'vitest';
import { AnnouncerService } from '@/managers/AnnouncerService';
import { AnnouncerServiceWrapper } from '@/managers/wrappers/AnnouncerServiceWrapper';
import { LoggerService } from '@/services/LoggerService';

describe('AnnouncerServiceWrapper', () => {
  it('logs commentary received event', async () => {
    const mock = new AnnouncerService();
    // Monkey patch getCommentary for deterministic result
    (mock as any).getCommentary = vi.fn().mockResolvedValue('Test commentary');
    const wrapper = new AnnouncerServiceWrapper(mock);
    const logger = LoggerService.instance();
    logger.clear();
    const result = await wrapper.getCommentary('ctx');
    expect(result).toBe('Test commentary');
    const buf = logger.getBuffer();
    const log = buf.find(e => e.category === 'service:announcer' && /Commentary received/.test(e.message));
    expect(log).toBeTruthy();
  });
});
