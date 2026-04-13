import { describe, it, expect } from 'vitest';
import { deepFreezeDeterministic, isDeeplyFrozen } from '../../src/transport/deepFreezeDeterministic.js';

describe('Phase 4.12: Deep Freeze Deterministic', () => {

  it('Test 1: Deeply freezes nested objects', () => {
    const obj = { a: { b: { c: 'value' } } };
    deepFreezeDeterministic(obj);
    expect(Object.isFrozen(obj)).toBe(true);
    expect(Object.isFrozen(obj.a)).toBe(true);
    expect(Object.isFrozen(obj.a.b)).toBe(true);
  });

  it('Test 2: Deeply freezes arrays and array contents', () => {
    const obj = { items: [{ id: 1 }, { id: 2 }] };
    deepFreezeDeterministic(obj);
    expect(Object.isFrozen(obj.items)).toBe(true);
    expect(Object.isFrozen(obj.items[0])).toBe(true);
    expect(Object.isFrozen(obj.items[1])).toBe(true);
  });

  it('Test 3: Nested mutation rejected after freeze', () => {
    const obj = { a: { b: 'original' } };
    deepFreezeDeterministic(obj);
    expect(() => {
      'use strict';
      (obj.a as any).b = 'mutated';
    }).toThrow();
  });

  it('Test 4: Safe with null and undefined', () => {
    expect(() => deepFreezeDeterministic(null)).not.toThrow();
    expect(() => deepFreezeDeterministic(undefined)).not.toThrow();
    expect(() => deepFreezeDeterministic(42)).not.toThrow();
    expect(() => deepFreezeDeterministic('string')).not.toThrow();
  });

  it('Test 5: Safe with already-frozen objects', () => {
    const obj = Object.freeze({ a: 1 });
    expect(() => deepFreezeDeterministic(obj)).not.toThrow();
  });

  it('Test 6: Rejects functions inside metadata', () => {
    const obj = { handler: () => {} };
    expect(() => deepFreezeDeterministic(obj)).toThrow('function');
  });

  it('Test 7: Rejects symbols inside metadata', () => {
    const obj = { sym: Symbol('test') };
    expect(() => deepFreezeDeterministic(obj)).toThrow('symbol');
  });

  it('Test 8: isDeeplyFrozen returns true for deeply frozen', () => {
    const obj = { a: { b: [1, 2, { c: 3 }] } };
    deepFreezeDeterministic(obj);
    expect(isDeeplyFrozen(obj)).toBe(true);
  });

  it('Test 9: isDeeplyFrozen returns false for shallow-only freeze', () => {
    const obj = { a: { b: 'mutable' } };
    Object.freeze(obj);
    expect(isDeeplyFrozen(obj)).toBe(false);
  });

  it('Test 10: Rejects class instances', () => {
    class Custom { value = 1; }
    const obj = { instance: new Custom() };
    expect(() => deepFreezeDeterministic(obj)).toThrow('class instance');
  });

});
