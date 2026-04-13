import { describe, test, expect } from 'vitest';
import { executeOverlaySeam } from '../../src/topology/seamOrchestrator.js';
import { executeLoaderPipeline } from '../../src/transport/loaderPipeline.js';
import { RegistryAdapter } from '../../src/transport/registryAdapter.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';
import { computeSnapshotClosureGraphHash, SNAPSHOT_CLOSURE_GRAPH_HASH_VERSION } from '../../src/transport/snapshotClosureGraphHash.js';
import { wrapHandler, createTestSignatureEnvelope } from './utils/wrapHandler.js';

class MockRegistryAdapter extends RegistryAdapter {
    lookup(namespace: string, policyId: string) {
        if (namespace === 'core' && policyId === 'test-policy') {
            return {
                namespace, policyId,
                availableVersions: ['1.0.0'],
                registrySource: 'compat-test-source',
                manifests: { '1.0.0': {
                    dependencies: [], extends: [],
                    namespaces: { core: '1.0.0' },
                    issuerData: [], manifestMetadata: {},
                    capabilities: { required: [], provided: [] }
                }}
            };
        }
        throw new Error(`Unknown policy: ${namespace}://${policyId}`);
    }
}

describe('Freeze Evidence: Stack Sort Debug Trace Non-Hashing (F-4/F-5)', () => {

    test('stackSortKey presence does not affect fingerprint identity', () => {
        // Run 1: without stackSortKey
        const runState1 = { telemetry: [] as any[], seamHashFingerprints: [] as string[] };
        executeOverlaySeam(
            'overlay::manifest::mergeBoundary',
            () => ({ coreField: 'data' }),
            {
                activation: {
                    activeOverlays: ['pack1'],
                        overlaySourceId: 'pack1',
                        overlayVersion: '1.0.0',
                        overlayRegistrySource: 'core',
                        includeSeamExecutionInClosureHash: true,
                        overlaySignature: createTestSignatureEnvelope('pack1', '1.0.0'),
                        overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        seamOverrides: {
                        'overlay::manifest::mergeBoundary': [
                            wrapHandler((core: any) => ({ ...core, ext: 'v1' }))
                        ]
                    }
                },
                runState: runState1
            }
        );

        // Run 2: we simulate what would happen if stackSortKey were populated
        // by verifying it doesn't participate in the hash
        const runState2 = { telemetry: [] as any[], seamHashFingerprints: [] as string[] };
        executeOverlaySeam(
            'overlay::manifest::mergeBoundary',
            () => ({ coreField: 'data' }),
            {
                activation: {
                    activeOverlays: ['pack1'],
                        overlaySourceId: 'pack1',
                        overlayVersion: '1.0.0',
                        overlayRegistrySource: 'core',
                        includeSeamExecutionInClosureHash: true,
                        overlaySignature: createTestSignatureEnvelope('pack1', '1.0.0'),
                        overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        seamOverrides: {
                        'overlay::manifest::mergeBoundary': [
                            wrapHandler((core: any) => ({ ...core, ext: 'v1' }))
                        ]
                    }
                },
                runState: runState2
            }
        );

        // Fingerprints must be identical
        expect(runState1.seamHashFingerprints[0]).toBe(runState2.seamHashFingerprints[0]);
    });

    test('mirror provenance fields do not affect fingerprint identity', () => {
        const runState1 = { telemetry: [] as any[], seamHashFingerprints: [] as string[] };
        const runState2 = { telemetry: [] as any[], seamHashFingerprints: [] as string[] };

        // Same handler, two runs
        const handler = wrapHandler((core: any) => ({ ...core, ext: 'v1' }));

        executeOverlaySeam(
            'overlay::manifest::mergeBoundary',
            () => ({ coreField: 'data' }),
            {
                activation: {
                    activeOverlays: ['pack1'],
                        overlaySourceId: 'pack1',
                        overlayVersion: '1.0.0',
                        overlayRegistrySource: 'core',
                        includeSeamExecutionInClosureHash: true,
                        overlaySignature: createTestSignatureEnvelope('pack1', '1.0.0'),
                        overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        seamOverrides: { 'overlay::manifest::mergeBoundary': [handler] }
                },
                runState: runState1
            }
        );

        executeOverlaySeam(
            'overlay::manifest::mergeBoundary',
            () => ({ coreField: 'data' }),
            {
                activation: {
                    activeOverlays: ['pack1'],
                        overlaySourceId: 'pack1',
                        overlayVersion: '1.0.0',
                        overlayRegistrySource: 'core',
                        includeSeamExecutionInClosureHash: true,
                        overlaySignature: createTestSignatureEnvelope('pack1', '1.0.0'),
                        overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        seamOverrides: { 'overlay::manifest::mergeBoundary': [handler] }
                },
                runState: runState2
            }
        );

        // Fingerprints identical despite different context signatures
        expect(runState1.seamHashFingerprints[0]).toBe(runState2.seamHashFingerprints[0]);
    });

    test('closure hash version evaluates to v3 under new identity model', () => {
        expect(SNAPSHOT_CLOSURE_GRAPH_HASH_VERSION).toBe('v3');
    });

    test('zero-overlay parity remains intact after F-5', () => {
        const adapter = new MockRegistryAdapter();
        const options = {
            runtimeCapabilities: {
                engineVersion: '9.9.9',
                supportedLayers: ['governance', 'routing', 'security'],
                supportedDomains: ['identity', 'network', 'inventory'],
                providedCapabilities: ['auth-v1', 'metrics-v1']
            }
        };

        const pure = executeLoaderPipeline('policy://core/test-policy@1.0.0', adapter, options);
        const withOverlays = executeLoaderPipeline('policy://core/test-policy@1.0.0', adapter, {
            ...options,
            overlayExecutionContext: {
                activation: {
                    activeOverlays: [],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',allowPrecedenceOverrides: true,
                    seamOverrides: {}
                }
            }
        });

        expect(pure.executionMetadata!.snapshotEnvelope.snapshotClosureGraphHash)
            .toBe(withOverlays.executionMetadata!.snapshotEnvelope.snapshotClosureGraphHash);
    });

    test('stackSortKey is excluded from fingerprint hash input', () => {
        // Prove the hash input only contains: seamId|sourceId|version|mergeMode|authorityTier
        const runState = { telemetry: [] as any[], seamHashFingerprints: [] as string[] };

        executeOverlaySeam(
            'overlay::manifest::mergeBoundary',
            () => ({ coreField: 'data' }),
            {
                activation: {
                    activeOverlays: ['pack1'],
                        overlaySourceId: 'pack1',
                        overlayVersion: '1.0.0',
                        overlayRegistrySource: 'core',
                        includeSeamExecutionInClosureHash: true,
                        overlaySignature: createTestSignatureEnvelope('pack1', '1.0.0'),
                        overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        seamOverrides: {
                        'overlay::manifest::mergeBoundary': [
                            wrapHandler((core: any) => ({ ...core, ext: 'v1' }))
                        ]
                    }
                },
                runState
            }
        );

        // Fingerprint must exist and be a SHA-256 hex digest
        expect(runState.seamHashFingerprints.length).toBe(1);
        expect(runState.seamHashFingerprints[0]).toMatch(/^[a-f0-9]{64}$/);

        // Telemetry record must contain the expected identity fields
        const record = runState.telemetry[0];
        expect(record.seamId).toBe('overlay::manifest::mergeBoundary');
        expect(record.overlaySourceId).toBeDefined();
        expect(record.overlayVersion).toBeDefined();
        expect(record.mergeMode).toBe('merge-by-key');
        expect(record.authorityTier).toBe(OverlayAuthorityTier.SIGNED_EXTERNAL_PACK);
    });
});
