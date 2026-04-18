import { describe, test, expect } from 'vitest';
import { IncrementalEvaluationRuntime } from '../../../core/src/incremental-evaluation/index.js';

describe('Incremental Evaluation', () => {
    test('renders deterministic incremental evaluation output', () => {
        const output = IncrementalEvaluationRuntime.runIncrementalEvaluation();
        expect(output).toMatchInlineSnapshot(`
          {
            "capabilityRecalculations": [
              "cap-auth",
            ],
            "datasetLevelChanges": [
              "schema-v1",
            ],
            "fileLevelChanges": [
              "src/main.ts",
            ],
            "findingDiffs": [
              "finding-123",
            ],
            "ruleRecalculations": [
              "rule-auth-boundary",
            ],
          }
        `);
    });
});
