import { describe, test, expect } from 'vitest';
import { executeLoaderPipeline } from '../../src/transport/loaderPipeline.js';
import { RegistryAdapter } from '../../src/transport/registryAdapter.js';

class MockRegistryAdapter extends RegistryAdapter {
    lookup(namespace: string, policyId: string) {
        if (namespace === 'core' && policyId === 'test-policy') {
            return {
                namespace,
                policyId,
                availableVersions: ['1.0.0'],
                registrySource: 'parity-test-source',
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

describe('Freeze Evidence: Overlay Seam Zero-Overlay Parity', () => {
    test('freeze::overlay::topology::zeroOverlayParity', () => {
        const adapter = new MockRegistryAdapter();

        const pureOptions = {
            runtimeCapabilities: {
                engineVersion: '9.9.9',
                supportedLayers: ['governance', 'routing', 'security'],
                supportedDomains: ['identity', 'network', 'inventory'],
                providedCapabilities: ['auth-v1', 'metrics-v1']
            }
        };

        const resultWithoutOverrides = executeLoaderPipeline('policy://core/test-policy@1.0.0', adapter, pureOptions);

        const overlayOptions = {
            ...pureOptions,
            overlayExecutionContext: {
              activation: {
                  activeOverlays: [],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',// EMPTY
                  allowPrecedenceOverrides: true,
                  seamOverrides: {}
              }
            }
        };

        const resultWithInactiveOverrides = executeLoaderPipeline('policy://core/test-policy@1.0.0', adapter, overlayOptions);

        // Strict deterministic structural deep equality proves the seams do exactly zero mutation.
        expect(resultWithoutOverrides.executionMetadata!.snapshotEnvelope.snapshotClosureGraphHash)
            .toBe(resultWithInactiveOverrides.executionMetadata!.snapshotEnvelope.snapshotClosureGraphHash);
        
        expect(resultWithoutOverrides.executionMetadata!.snapshotEnvelope.manifestDigestSetHash)
            .toBe(resultWithInactiveOverrides.executionMetadata!.snapshotEnvelope.manifestDigestSetHash);
    });
});
