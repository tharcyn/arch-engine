import { describe, it, expect } from 'vitest';
import { assertPlainObjectGraph } from '../../src/transport/assertPlainObjectGraph.js';

describe('Phase 4.13: Plain-Object Metadata Graph Safety', () => {

  it('Test 1: Allows plain objects, arrays, and primitives', () => {
    const valid = {
      str: 'hello',
      num: 42,
      bool: true,
      nil: null,
      arr: [1, 'two', { nested: true }],
      obj: { a: 1, b: 2 }
    };
    expect(() => assertPlainObjectGraph(valid)).not.toThrow();
  });

  it('Test 2: Rejects Function', () => {
    const invalid = { a: () => {} };
    expect(() => assertPlainObjectGraph(invalid)).toThrow('Non-plain metadata');
  });

  it('Test 3: Rejects Symbol', () => {
    const invalid = { sym: Symbol('test') };
    expect(() => assertPlainObjectGraph(invalid)).toThrow('Non-plain metadata');
  });

  it('Test 4: Rejects Date', () => {
    const invalid = { date: new Date() };
    expect(() => assertPlainObjectGraph(invalid)).toThrow('Date instance detected');
  });

  it('Test 5: Rejects Map and Set', () => {
    expect(() => assertPlainObjectGraph(new Map())).toThrow('Map instance detected');
    expect(() => assertPlainObjectGraph({ set: new Set() })).toThrow('Set instance detected');
  });

  it('Test 6: Rejects class instances', () => {
    class CustomClass { a = 1; }
    const instance = new CustomClass();
    expect(() => assertPlainObjectGraph({ instance })).toThrow('non-plain prototype detected');
  });

  it('Test 7: Detects deep violations', () => {
    const invalid = { config: { items: [ { id: 1 }, { date: new Date() } ] } };
    expect(() => assertPlainObjectGraph(invalid)).toThrow('config.items[1].date');
  });

});
