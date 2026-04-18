import { describe, test, expect, vi } from 'vitest';
import { federationInspectCommand } from '../../src/commands/federationInspect.js';
import * as core from '@arch-engine/core';

vi.mock('@arch-engine/core', () => ({
    loadFederatedTopologyDatasets: vi.fn(() => ({
        datasets: [],
        datasetIdentityHashes: ['hash1', 'hash2'],
        datasetCapabilityIntersection: { supports_magic: true },
        datasetCapabilityUnion: { supports_magic: true, supports_extra: true },
        providerDatasetMap: { github: {}, gitlab: {} }
    })),
    computeFederatedCapabilityMatrix: vi.fn(() => ({
        intersectionCapabilities: ['supports_magic'],
        unionCapabilities: ['supports_magic', 'supports_extra'],
        incompatibleCapabilities: [],
        federationCompatible: true,
        diagnostics: []
    })),
    createFederatedExecutionContext: vi.fn(() => ({
        mergedTopologyDataset: {
            nodes: [{ id: 'n1', providerProvenance: ['github', 'gitlab'] }],
            edges: []
        },
        federationExecutionHash: 'hash-xyz-123'
    }))
}));

describe('Federation Inspect CLI Output', () => {
    test('JSON output matches strict schema snapshot', async () => {
        const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        
        const exitCode = await federationInspectCommand({ providers: ['github', 'gitlab'], json: true });
        
        expect(exitCode).toBe(0);
        expect(logSpy).toHaveBeenCalledTimes(1);
        
        const outputJSON = JSON.parse(logSpy.mock.calls[0][0]);
        
        expect(outputJSON).toMatchInlineSnapshot(`
          {
            "blockingDatasets": [],
            "blockingProviders": [],
            "capabilityIntersection": [
              "supports_magic",
            ],
            "capabilityUnion": [
              "supports_magic",
              "supports_extra",
            ],
            "datasetCapabilityMap": {},
            "datasetIdentitySet": [
              "hash1",
              "hash2",
            ],
            "diagnostics": [],
            "federationExecutionHash": "hash-xyz-123",
            "identityCollisionSummary": [],
            "missingCapabilities": [],
            "providerCapabilityMap": {},
            "providerContributionMap": {},
            "requiredCapabilities": [],
            "topologyStats": {
              "mergedEdgeCount": 0,
              "mergedNodeCount": 1,
            },
          }
        `);
        
        logSpy.mockRestore();
    });
});
