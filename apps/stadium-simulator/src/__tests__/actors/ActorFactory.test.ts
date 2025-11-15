import { describe, it, expect, beforeEach } from 'vitest';
import { ActorFactory } from '@/actors/ActorFactory';

describe('ActorFactory', () => {
  beforeEach(() => {
    ActorFactory.reset();
  });

  it('generates sequential IDs for same type', () => {
    const id1 = ActorFactory.generateId('fan');
    const id2 = ActorFactory.generateId('fan');
    const id3 = ActorFactory.generateId('fan');

    expect(id1).toBe('actor:fan-0');
    expect(id2).toBe('actor:fan-1');
    expect(id3).toBe('actor:fan-2');
  });

  it('maintains separate counters per type', () => {
    const fanId = ActorFactory.generateId('fan');
    const vendorId = ActorFactory.generateId('vendor');
    const fanId2 = ActorFactory.generateId('fan');

    expect(fanId).toBe('actor:fan-0');
    expect(vendorId).toBe('actor:vendor-0');
    expect(fanId2).toBe('actor:fan-1');
  });

  it('supports custom suffixes for named actors', () => {
    const sectionA = ActorFactory.generateId('section', 'A');
    const sectionB = ActorFactory.generateId('section', 'B');
    const sectionC = ActorFactory.generateId('section', 'C');

    expect(sectionA).toBe('actor:section-A');
    expect(sectionB).toBe('actor:section-B');
    expect(sectionC).toBe('actor:section-C');
  });

  it('resets all counters', () => {
    ActorFactory.generateId('fan');
    ActorFactory.generateId('vendor');
    
    expect(ActorFactory.getCount('fan')).toBe(1);
    expect(ActorFactory.getCount('vendor')).toBe(1);

    ActorFactory.reset();

    expect(ActorFactory.getCount('fan')).toBe(0);
    expect(ActorFactory.getCount('vendor')).toBe(0);

    const newId = ActorFactory.generateId('fan');
    expect(newId).toBe('actor:fan-0');
  });

  it('returns current count for type', () => {
    expect(ActorFactory.getCount('mascot')).toBe(0);
    
    ActorFactory.generateId('mascot');
    expect(ActorFactory.getCount('mascot')).toBe(1);
    
    ActorFactory.generateId('mascot');
    ActorFactory.generateId('mascot');
    expect(ActorFactory.getCount('mascot')).toBe(3);
  });
});
