import { describe, it, expect } from 'vitest';
import { BaseManager } from '@/managers/base/BaseManager';
import { LoggerService } from '@/services/LoggerService';

describe('BaseManager logging', () => {
  it('records events respecting log level', () => {
    const mgr = new BaseManager({ name: 'Wave', category: 'manager:wave', logLevel: 'info' });
    mgr.log('debug', 'debug should be filtered');
    mgr.log('info', 'info message');
    mgr.log('event', 'wave started');

    const buf = mgr.getLogBuffer();
    expect(buf.length).toBe(2); // info + event
    expect(buf.map(b => b.message)).toContain('info message');
    expect(buf.map(b => b.message)).toContain('wave started');
  });

  it('pushes into global logger buffer', () => {
    const service = LoggerService.instance();
    service.clear();
    const mgr = new BaseManager({ name: 'Vendor', category: 'manager:vendor', logLevel: 'trace' });
    mgr.log('debug', 'debug message');
    mgr.log('warn', 'warn message');
    expect(service.getBuffer().some(e => e.message === 'debug message')).toBe(true);
    expect(service.getBuffer().some(e => e.message === 'warn message')).toBe(true);
  });
});
