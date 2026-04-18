import { describe, test, expect, vi } from 'vitest';
import {
    explainCapabilityCommand,
    explainDatasetCommand,
    explainIdentityCommand,
    explainFindingCommand,
    explainMergeCommand,
    evaluateTraceCommand
} from '../../src/commands/evaluate/explain.js';

describe('Evaluation Trace Commands', () => {
    test('capability trace', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await explainCapabilityCommand('test-cap', { json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "availableCapabilities": [
              "other-cap",
            ],
            "blockingDatasets": [
              "hash1",
            ],
            "blockingExecutionModes": [],
            "blockingProviders": [
              "github",
            ],
            "datasetScope": [],
            "decisionOutcome": "blocked",
            "decisionReason": "Missing required capability",
            "inputContextHash": "hash",
            "intersectionResult": "missing",
            "missingCapabilities": [
              "test-cap",
            ],
            "providerScope": [],
            "relatedCapabilityIds": [
              "test-cap",
            ],
            "relatedDatasetSchemas": [],
            "relatedExecutionModes": [],
            "requestedCapability": "test-cap",
            "timestampDeterministicIndex": 1,
            "traceStepId": "trace-1",
            "traceType": "CAPABILITY_GATING",
          }
        `);
        consoleSpy.mockRestore();
    });

    test('dataset trace', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await explainDatasetCommand('test-ds', { json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "availableDatasetSchemas": [
              "test-ds",
            ],
            "datasetScope": [],
            "decisionOutcome": "allowed",
            "decisionReason": "Schema match",
            "federationCompatibilityImpact": "none",
            "inputContextHash": "hash",
            "providerScope": [],
            "relatedCapabilityIds": [],
            "relatedDatasetSchemas": [
              "test-ds",
            ],
            "relatedExecutionModes": [],
            "requiredDatasetSchemas": [
              "test-ds",
            ],
            "schemaIntersectionResult": "match",
            "schemaMismatchReasons": [],
            "timestampDeterministicIndex": 2,
            "traceStepId": "trace-2",
            "traceType": "DATASET_ELIGIBILITY",
          }
        `);
        consoleSpy.mockRestore();
    });

    test('identity trace', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await explainIdentityCommand('node-1', { json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "collisionCategory": "CROSS_PROVIDER_IDENTITY_ALIAS",
            "datasetScope": [],
            "decisionOutcome": "resolved",
            "decisionReason": "Cross-provider alias",
            "inputContextHash": "hash",
            "mergeJustification": "Explicit alias defined",
            "nodeId": "node-1",
            "providerPrecedenceNeutrality": true,
            "providerScope": [],
            "relatedCapabilityIds": [],
            "relatedDatasetSchemas": [],
            "relatedExecutionModes": [],
            "timestampDeterministicIndex": 3,
            "traceStepId": "trace-3",
            "traceType": "IDENTITY_RESOLUTION",
          }
        `);
        consoleSpy.mockRestore();
    });

    test('finding trace', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await explainFindingCommand('finding-1', { json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "capabilityUsed": "cap-1",
            "datasetProvenance": [
              "hash1",
            ],
            "datasetScope": [],
            "datasetUsed": "ds-1",
            "decisionOutcome": "generated",
            "decisionReason": "Rule matched",
            "deduplicationParticipation": [],
            "executionModeUsed": "multi-provider-federated",
            "federationMergeParticipation": [
              "hash1",
            ],
            "inputContextHash": "hash",
            "originatingPack": "pack-1",
            "originatingRule": "rule-1",
            "providerProvenance": [
              "github",
            ],
            "providerScope": [],
            "relatedCapabilityIds": [],
            "relatedDatasetSchemas": [],
            "relatedExecutionModes": [],
            "suppressionStatus": "none",
            "timestampDeterministicIndex": 4,
            "traceStepId": "trace-4",
            "traceType": "FINDING_GENERATION",
          }
        `);
        consoleSpy.mockRestore();
    });

    test('merge trace', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await explainMergeCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          {
            "datasetScope": [],
            "datasetsMerged": [
              "ds-1",
              "ds-2",
            ],
            "decisionOutcome": "merged",
            "decisionReason": "No collisions",
            "deduplicationReason": "structural-hash",
            "identityCollisionParticipation": [],
            "inputContextHash": "hash",
            "intersectionCapabilityImpact": "union",
            "provenanceUnionBehavior": "concat-sort",
            "providerScope": [],
            "providersMerged": [
              "github",
              "gitlab",
            ],
            "relatedCapabilityIds": [],
            "relatedDatasetSchemas": [],
            "relatedExecutionModes": [],
            "timestampDeterministicIndex": 5,
            "traceStepId": "trace-5",
            "traceType": "FEDERATION_MERGE",
          }
        `);
        consoleSpy.mockRestore();
    });

    test('trace evaluation', async () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        await evaluateTraceCommand({ json: true });
        expect(JSON.parse(consoleSpy.mock.calls[0][0])).toMatchInlineSnapshot(`
          [
            {
              "decision": "ruleEvaluated",
              "lineageType": "rule",
            },
            {
              "decision": "blocked",
              "lineageType": "capability",
            },
            {
              "decision": "allowed",
              "lineageType": "dataset",
            },
            {
              "decision": "resolved",
              "lineageType": "identity",
            },
            {
              "decision": "generated",
              "lineageType": "finding",
            },
            {
              "decision": "merged",
              "lineageType": "merge",
            },
          ]
        `);
        consoleSpy.mockRestore();
    });
});
