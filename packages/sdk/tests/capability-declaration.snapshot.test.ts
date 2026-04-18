import { describe, test, expect } from 'vitest';
import { declareRequiredCapabilities, declareOptionalCapabilities, validateCapabilityDeclarations } from '../src/policy-pack/capabilities/index.js';

describe('Capability Declaration Contract', () => {
    test('orders deterministically and prevents duplicates', () => {
        expect(declareRequiredCapabilities(['B', 'A'])).toMatchInlineSnapshot(`
          [
            "A",
            "B",
          ]
        `);
        
        expect(() => declareRequiredCapabilities(['A', 'A'])).toThrow('Duplicate capabilities declared');
        
        expect(declareOptionalCapabilities(['C', 'B'])).toMatchInlineSnapshot(`
          [
            "B",
            "C",
          ]
        `);
    });

    test('validates safe mapping', () => {
        expect(() => validateCapabilityDeclarations(['A'], ['A', 'B'])).not.toThrow();
        expect(() => validateCapabilityDeclarations(['C'], ['A', 'B'])).toThrow('Required capability C is not in the supported capabilities list.');
    });
});
