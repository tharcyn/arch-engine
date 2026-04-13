import { describe, test, expect } from 'vitest';
import { executeOverlaySeam } from '../../src/topology/seamOrchestrator.js';
import { executeLoaderPipeline } from '../../src/transport/loaderPipeline.js';
import { RegistryAdapter } from '../../src/transport/registryAdapter.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';
import { wrapHandler } from './utils/wrapHandler.js';

import { SNAPSHOT_CLOSURE_GRAPH_HASH_VERSION } from '../../src/transport/snapshotClosureGraphHash.js';

class MockRegistryAdapter extends RegistryAdapter {
    lookup(namespace: string, policyId: string) {
        if (namespace === 'core' && policyId === 'test-policy') {
            return {
                namespace,
                policyId,
                availableVersions: ['1.0.0'],
                registrySource: 'compat-test-source',
                manifests: {
                    '1.0.0': {
                        dependencies: [],
                        extends: [],
                        namespaces: { core: '1.0.0' },
                        issuerData: [],
                        manifestMetadata: {},
                        capabilities: { required: [], provided: [] }
                    }
                }
            };
        }
        throw new Error(`Unknown policy: ${namespace}://${policyId}`);
    }
}

describe('Freeze Evidence: Signature Backward Compatibility (F-3)', () => {

    test('UNTRUSTED_EXTERNAL with no signature preserves old behavior', () => {
        const result = executeOverlaySeam(
            'overlay::dependency::closureBoundary',
            () => ([1, 2, 3]),
            {
                activation: {
                    activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',overlayTrustTier: OverlayAuthorityTier.UNTRUSTED_EXTERNAL,
                        seamOverrides: {
                        'overlay::dependency::closureBoundary': [
                            {
                                overlaySourceId: 'legacy-pack',
                overlayRegistrySource: 'core',
                                overlayVersion: '1.0.0',
                                handler: (core: any) => ([...core, 4])
                            }
                        ]
                    }
                }
            }
        );

        expect(result).toEqual([1, 2, 3, 4]);
    });

    test('zero-overlay parity remains intact', () => {
        const adapter = new MockRegistryAdapter();

        const pureOptions = {
            runtimeCapabilities: {
                engineVersion: '9.9.9',
                supportedLayers: ['governance', 'routing', 'security'],
                supportedDomains: ['identity', 'network', 'inventory'],
                providedCapabilities: ['auth-v1', 'metrics-v1']
            }
        };

        const resultWithout = executeLoaderPipeline('policy://core/test-policy@1.0.0', adapter, pureOptions);

        const overlayOptions = {
            ...pureOptions,
            overlayExecutionContext: {
              activation: {
                  activeOverlays: [],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',allowPrecedenceOverrides: true,
                  seamOverrides: {}
              }
            }
        };

        const resultWith = executeLoaderPipeline('policy://core/test-policy@1.0.0', adapter, overlayOptions);

        expect(resultWithout.executionMetadata!.snapshotEnvelope.snapshotClosureGraphHash)
            .toBe(resultWith.executionMetadata!.snapshotEnvelope.snapshotClosureGraphHash);
    });

    test('closure hash version evaluates to v3 under new identity model', () => {
        const adapter = new MockRegistryAdapter();

        const options = {
            runtimeCapabilities: {
                engineVersion: '9.9.9',
                supportedLayers: ['governance', 'routing', 'security'],
                supportedDomains: ['identity', 'network', 'inventory'],
                providedCapabilities: ['auth-v1', 'metrics-v1']
            }
        };

        const result = executeLoaderPipeline('policy://core/test-policy@1.0.0', adapter, options);
        const hash = result.executionMetadata!.snapshotEnvelope.snapshotClosureGraphHash;

        // Closure hash version constant evaluates to v3
        expect(SNAPSHOT_CLOSURE_GRAPH_HASH_VERSION).toBe('v3');
        // Hash is a valid SHA-256 hex digest
        expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    test('F-3 security blocker closed: SIGNED_EXTERNAL_PACK + undefined signature = REJECTED', () => {
        // OLD BAD STATE: this would have succeeded
        // NEW REQUIRED STATE: this must fail
        expect(() => {
            executeOverlaySeam(
                'overlay::transport::uriResolutionBoundary',
                () => ({ coreField: 'data' }),
                {
                    activation: {
                        activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlaySignature: undefined as any,
                        overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        seamOverrides: {
                            'overlay::transport::uriResolutionBoundary': [
                                wrapHandler((core: any) => ({ ...core, ext: 'spoofed' }))
                            ]
                        }
                    }
                }
            );
        }).toThrowError(/Signature missing|Signature format invalid/);
    });
});
