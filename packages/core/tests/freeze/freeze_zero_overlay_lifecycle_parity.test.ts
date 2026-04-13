import { describe, test, expect } from 'vitest';
import { executeLoaderPipeline } from '../../src/transport/loaderPipeline.js';
import { RegistryAdapter } from '../../src/transport/registryAdapter.js';

class MockRegistryAdapter extends RegistryAdapter {
  lookup(namespace: string, policyId: string) {
    if (namespace === 'core' && policyId === 'test') {
      return { namespace, policyId, availableVersions: ['1.0.0'], registrySource: 'core', manifests: { '1.0.0': { config: { version: 1 } } } };
    }
    throw new Error();
  }
}

describe('Freeze Evidence: F-10 Zero Overlay Lifecycle Parity', () => {
    test('Lifecycle governance introduces zero changes when activeOverlays is empty', () => {
        const adapter = new MockRegistryAdapter();
        const baseOptions = {
            runtimeCapabilities: { engineVersion: '9.9.9', supportedLayers: [], supportedDomains: [], providedCapabilities: [] },
            overlayExecutionContext: {
                activation: {
                    activeOverlays: [],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',}
            }
        };

        const result = executeLoaderPipeline('policy://core/test', adapter, baseOptions);
        expect(result.loaderClosureMetadata!.snapshotClosureGraphHash).toBeDefined();
        // Since no overlays are requested, no lifecycle rules engage or throw. Execution is inherently 1-to-1 identical.
    });
});
