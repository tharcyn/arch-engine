import { describe, test, expect } from 'vitest';
import { executeOverlaySeam } from '../../src/topology/seamOrchestrator.js';
import { executeLoaderPipeline } from '../../src/transport/loaderPipeline.js';
import { RegistryAdapter } from '../../src/transport/registryAdapter.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';
import { wrapHandler } from './utils/wrapHandler.js';

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

describe('Freeze Evidence: Seam Grant Backward Compatibility (F-2)', () => {

    test('absence of authorityGrants preserves old behavior (merge-by-key)', () => {
        const runState = { telemetry: [] as any[], seamHashFingerprints: [] as string[] };

        const result = executeOverlaySeam(
            'overlay::manifest::mergeBoundary',
            () => ({ coreField: 'original' }),
            {
                activation: {
                    activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',overlayTrustTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
                        seamOverrides: {
                        'overlay::manifest::mergeBoundary': [
                            wrapHandler((core: any) => ({ ...core, ext: 'legacy' }))
                        ]
                    }
                },
                runState
            }
        );

        expect(result.ext).toBe('legacy');
        expect(runState.telemetry[0].activationDecision).toBe('EXECUTED');
        // seamGrantPresent should be undefined in old mode
        expect(runState.telemetry[0].seamGrantPresent).toBeUndefined();
    });

    test('absence of authorityGrants preserves old behavior (replace-if-authorized)', () => {
        const result = executeOverlaySeam(
            'overlay::registry::precedenceBoundary',
            () => ({ result: 'core' }),
            {
                activation: {
                    activeOverlays: ['pack1'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',overlayTrustTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
                        allowPrecedenceOverrides: true,
                    // NO authorityGrants — old behavior
                    seamOverrides: {
                        'overlay::registry::precedenceBoundary': [
                            wrapHandler(() => ({ result: 'replaced' }), { overlaySignature: 'sig:context-default' })
                        ]
                    }
                }
            }
        );

        expect(result.result).toBe('replaced');
    });

    test('absence of authorityGrants preserves old behavior (append)', () => {
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
                            wrapHandler((core: any) => ([...core, 4]))
                        ]
                    }
                }
            }
        );

        expect(result).toEqual([1, 2, 3, 4]);
    });

    test('zero-overlay parity remains intact with authorityGrants absent', () => {
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

    test('zero-overlay parity remains intact with empty authorityGrants present', () => {
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
                  seamOverrides: {},
                  authorityGrants: {} // Present but empty — should not affect parity
              }
            }
        };

        const resultWith = executeLoaderPipeline('policy://core/test-policy@1.0.0', adapter, overlayOptions);

        expect(resultWithout.executionMetadata!.snapshotEnvelope.snapshotClosureGraphHash)
            .toBe(resultWith.executionMetadata!.snapshotEnvelope.snapshotClosureGraphHash);
    });
});
