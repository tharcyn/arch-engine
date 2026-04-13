import { describe, test, expect } from 'vitest';
import { executeLoaderPipeline } from '../../src/transport/loaderPipeline.js';
import { RegistryAdapter } from '../../src/transport/registryAdapter.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';
import { explainClosureIdentity } from '../../src/transport/provenanceExplain.js';
import { createTestSignatureEnvelope } from './utils/wrapHandler.js';

class MockRegistryAdapter extends RegistryAdapter {
  lookup(namespace: string, policyId: string) {
    if (namespace === 'core' && policyId === 'test') {
      return { namespace, policyId, availableVersions: ['1.0.0'], registrySource: 'official', manifests: { '1.0.0': { config: { version: 1 } } } };
    }
    throw new Error();
  }
}

describe('Freeze Evidence: Provenance Explain Pipeline Consistency', () => {
    test('explainClosureIdentity correctly extracts provenance from envelope without side effects', () => {
        const adapter = new MockRegistryAdapter();
        const envelope = createTestSignatureEnvelope('overlay-explain', '1.0.0', 'official');
        const baseOptions = {
            runtimeCapabilities: { engineVersion: '9.9.9', supportedLayers: [], supportedDomains: [], providedCapabilities: [] },
            overlayExecutionContext: {
                activation: {
                    activeOverlays: ['overlay-explain'],
                        overlaySourceId: 'overlay-explain',
                        overlayVersion: '1.0.0',
                        overlayRegistrySource: 'official',
                        overlaySignature: envelope,
                        overlayTrustTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK,
                        allowPrecedenceOverrides: true
                }
            }
        };
        
        const result = executeLoaderPipeline('policy://core/test', adapter, baseOptions);
        const explanation = explainClosureIdentity(result.executionMetadata!.snapshotEnvelope);
        
        expect(explanation).toBeDefined();
        expect(explanation!.registryTrustRootId).toBe('official.registry.root');
        expect(explanation!.trustRootEpoch).toBeDefined();
        expect(explanation!.signatureDigest).toBeDefined();
        expect(explanation!.manifestContentHash).toBeDefined();
        expect(explanation!.stackOrderingKeySummary).toBeDefined();
    });
});
