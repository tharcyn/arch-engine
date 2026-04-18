import { describe, test, expect } from 'vitest';
import { defineDependencies, defineOptionalDependencies, defineConflicts } from '../src/policy-pack/index.js';

describe('Dependency Template Contract', () => {
    test('orders dependencies deterministically', () => {
        expect(defineDependencies(['pack-b', 'pack-a'])).toMatchInlineSnapshot(`
          [
            "pack-a",
            "pack-b",
          ]
        `);
        expect(defineOptionalDependencies(['pack-d', 'pack-c'])).toMatchInlineSnapshot(`
          [
            "pack-c",
            "pack-d",
          ]
        `);
        expect(defineConflicts(['pack-f', 'pack-e'])).toMatchInlineSnapshot(`
          [
            "pack-e",
            "pack-f",
          ]
        `);
    });
});
