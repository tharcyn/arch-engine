import { describe, test, expect } from 'vitest';
import { executeLoaderPipeline } from '../../src/transport/loaderPipeline.js';
import { RegistryAdapter } from '../../src/transport/registryAdapter.js';

class MockRegistryAdapter extends RegistryAdapter {
  lookup(namespace: string, policyId: string) {
    if (namespace === 'core' && policyId === 'test') {
      return {
        namespace, policyId, availableVersions: ['1.0.0'], registrySource: 'core',
        manifests: { '1.0.0': { config: { version: 1 } } }
      };
    }
    throw new Error();
  }
}

describe('Freeze Evidence: Zero Overlay Closure Identity Parity (v3)', () => {
    test('Closure identity hash remains strictly deterministic regardless of active overlays length 0 vs missing entirely', () => {
        const adapter = new MockRegistryAdapter();
        const baseOptions = { runtimeCapabilities: { engineVersion: '9.9.9', supportedLayers: [], supportedDomains: [], providedCapabilities: [] } };
        
        const pureResult = executeLoaderPipeline('policy://core/test', adapter, baseOptions);
        
        const overlayEmptyResult = executeLoaderPipeline('policy://core/test', adapter, {
            ...baseOptions,
            overlayExecutionContext: {
                activation: { activeOverlays: [],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',seamOverrides: {}, allowPrecedenceOverrides: true }
            }
        });

        const pureHash = pureResult.loaderClosureMetadata!.snapshotClosureGraphHash;
        const emptyHash = overlayEmptyResult.loaderClosureMetadata!.snapshotClosureGraphHash;
        
        expect(pureHash).toBe(emptyHash);
        expect(pureResult.loaderClosureMetadata!.closureProvenance).toBeUndefined();
        expect(overlayEmptyResult.loaderClosureMetadata!.closureProvenance).toBeUndefined();
    });
});
