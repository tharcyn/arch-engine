import { describe, test, expect } from 'vitest';
import { executeLoaderPipeline } from '../../src/transport/loaderPipeline.js';
import { RegistryAdapter } from '../../src/transport/registryAdapter.js';

class MockRegistryAdapter extends RegistryAdapter {
  lookup(namespace: string, policyId: string) {
    return { namespace, policyId, availableVersions: ['1.0.0'], registrySource: 'external', manifests: { '1.0.0': { config: { version: 1 } } } };
  }
}
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';
import { enforceRegistryAuthorityLadder } from '../../src/topology/registryAuthorityLadder.js';

describe('Freeze Evidence: F-9 Authority Ladder Never Elevates', () => {
    test('a low-tier declared overlay cannot be upgraded by registry category', () => {
        // A core registry (which has max authority ceiling) 
        // processing a declared tier of UNTRUSTED_EXTERNAL
        const decision = enforceRegistryAuthorityLadder(
            OverlayAuthorityTier.UNTRUSTED_EXTERNAL, 
            'core'
        );

        // Core shouldn't elevate it.
        expect(decision.effectiveTier).toBe(OverlayAuthorityTier.UNTRUSTED_EXTERNAL);
        expect(decision.ceilingApplied).toBe(false);
    });

    test('authority ladder only reduces or preserves authority during execution', () => {
        const adapter = new MockRegistryAdapter();
        
        let capturedTier: number | undefined;

        const baseOptions = {
            overlayExecutionContext: {
                activation: {
                    activeOverlays: ['test-overlay'],
                        overlayRegistrySource: 'core',
                        overlaySignature: 'sig:context-default',overlayTrustTier: OverlayAuthorityTier.UNTRUSTED_EXTERNAL,
                        allowPrecedenceOverrides: true
                }
            }
        };

        // Execution shouldn't elevate it to CORE just because registry is 'core'
        expect(() => {
            executeLoaderPipeline('policy://core/test', adapter, baseOptions);
        }).toThrow(/Insufficient trust tier/); // It fails standard downstream validations because it lacks authority

        // We know it didn't elevate, otherwise it might have succeeded if we tested actual authority checks
        // However, we test the pure functional enforcement directly in the previous test.
    });
});
