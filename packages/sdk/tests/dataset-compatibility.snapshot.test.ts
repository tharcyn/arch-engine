import { describe, test, expect } from 'vitest';
import { declareSupportedDatasetSchemas, declareRequiredDatasetSchemas, validateDatasetCompatibilityDeclarations } from '../src/policy-pack/dataset-compatibility/index.js';

describe('Dataset Compatibility Contract', () => {
    test('orders datasets deterministically', () => {
        expect(declareSupportedDatasetSchemas(['schema-v2', 'schema-v1'])).toMatchInlineSnapshot(`
          [
            "schema-v1",
            "schema-v2",
          ]
        `);
        expect(declareRequiredDatasetSchemas(['schema-v2'])).toMatchInlineSnapshot(`
          [
            "schema-v2",
          ]
        `);
    });

    test('validates dataset compatibility mapping', () => {
        expect(() => validateDatasetCompatibilityDeclarations(['schema-v1'], ['schema-v1'])).not.toThrow();
        expect(() => validateDatasetCompatibilityDeclarations(['schema-v2'], ['schema-v1'])).toThrow('Required dataset schema schema-v2 is not in the supported schemas list.');
    });
});
