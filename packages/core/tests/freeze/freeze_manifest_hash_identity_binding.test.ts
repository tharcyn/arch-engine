import { describe, test, expect } from 'vitest';
import { executeLoaderPipeline } from '../../src/transport/loaderPipeline.js';
import { RegistryAdapter } from '../../src/transport/registryAdapter.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';
import { createTestSignatureEnvelope } from './utils/wrapHandler.js';

class MockRegistryAdapter extends RegistryAdapter {
  constructor(public manifestA: any, public manifestB: any) { super(); }
  lookup(namespace: string, policyId: string) {
    if (namespace === 'core' && policyId === 'testA') {
      return { namespace, policyId, availableVersions: ['1.0.0'], registrySource: 'core', manifests: { '1.0.0': this.manifestA } };
    }
    if (namespace === 'core' && policyId === 'testB') {
      return { namespace, policyId, availableVersions: ['1.0.0'], registrySource: 'core', manifests: { '1.0.0': this.manifestB } };
    }
    throw new Error();
  }
}

describe('Freeze Evidence: Manifest Hash Identity Binding', () => {
    test('Different manifest payload results in different closure hash bound identity', () => {
        const manifestA = { config: { version: 1, prop: 'valueA' } };
        const manifestB = { config: { version: 1, prop: 'valueB' } };
        const adapter = new MockRegistryAdapter(manifestA, manifestB);

        const baseOptions = {
            runtimeCapabilities: { engineVersion: '9.9.9', supportedLayers: [], supportedDomains: [], providedCapabilities: [] },
            overlayExecutionContext: {
                activation: {
                    activeOverlays: ['pack1'],
                        overlaySourceId: 'pack1',
                        overlayVersion: '1.0.0',
                        overlayRegistrySource: 'core',
                        overlaySignature: createTestSignatureEnvelope('pack1', '1.0.0', 'core'),
                        overlayTrustTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
                        allowPrecedenceOverrides: true
                }
            }
        };
        
        const resultA = executeLoaderPipeline('policy://core/testA', adapter, baseOptions);
        const resultB = executeLoaderPipeline('policy://core/testB', adapter, baseOptions);

        const hashA = resultA.loaderClosureMetadata!.snapshotClosureGraphHash;
        const hashB = resultB.loaderClosureMetadata!.snapshotClosureGraphHash;

        expect(hashA).not.toBe(hashB);
        expect(resultA.loaderClosureMetadata!.closureProvenance!.manifestContentHash)
            .not.toBe(resultB.loaderClosureMetadata!.closureProvenance!.manifestContentHash);
    });

    test('Identical manifest payload results in identical closure hash bound identity', () => {
        const manifestA = { config: { version: 1, prop: 'valueA' } };
        const manifestB = { config: { prop: 'valueA', version: 1 } }; // different order
        const adapter = new MockRegistryAdapter(manifestA, manifestB);

        const baseOptions = {
            runtimeCapabilities: { engineVersion: '9.9.9', supportedLayers: [], supportedDomains: [], providedCapabilities: [] },
            overlayExecutionContext: {
                activation: {
                    activeOverlays: ['pack1'],
                        overlaySourceId: 'pack1',
                        overlayVersion: '1.0.0',
                        overlayRegistrySource: 'core',
                        overlaySignature: createTestSignatureEnvelope('pack1', '1.0.0', 'core'),
                        overlayTrustTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
                        allowPrecedenceOverrides: true
                }
            }
        };
        
        const resultA = executeLoaderPipeline('policy://core/testA', adapter, baseOptions);
        const resultB = executeLoaderPipeline('policy://core/testA', adapter, baseOptions);

        expect(resultA.loaderClosureMetadata!.snapshotClosureGraphHash).toBe(resultB.loaderClosureMetadata!.snapshotClosureGraphHash);
    });
});
