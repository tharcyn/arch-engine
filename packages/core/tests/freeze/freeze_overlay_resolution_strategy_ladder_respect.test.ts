import { describe, test, expect } from 'vitest';
import { processOverlayEligibilityAndResolution } from '../../src/topology/overlayAdmissionWorkflow.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';
import { setOverlayLifecycleState, OverlayLifecycleState } from '../../src/topology/overlayLifecycleState.js';

describe('Freeze Evidence: F-11 Resolution Respects Authority Ladders', () => {
    test('Resolution strategy executes strictly AFTER admission bounds excessive authority', () => {
        setOverlayLifecycleState({ overlaySourceId: 'test-F',
                overlayRegistrySource: 'core', overlayVersion: '1', registryId: 'partner', lifecycleState: OverlayLifecycleState.ACTIVE });

        const candidates = [
            // partner registries cannot declare CORE_INTERNAL. It drops to TRUSTED_POLICY_PACK implicitly or rejects natively if explicitly hard-fenced.
            // Under F-9, enforceRegistryAuthorityLadder clips it to the ceiling. So effective authority becomes TRUSTED_POLICY_PACK.
            { overlaySourceId: 'test-F',
                overlayRegistrySource: 'core', overlayVersion: '1', registryId: 'partner', namespace: 'partner.x', originRegistryId: 'partner', declaredAuthorityTier: OverlayAuthorityTier.CORE_INTERNAL }
        ];

        // The admission workflow checks trust root presence based on the EFFECTIVE tier.
        // Because the effective tier is TRUSTED_POLICY_PACK (3), and request has NO signatureDigest, admission will REJECT it.
        // Thus resolution should get 0 candidates.

        expect(() => {
            processOverlayEligibilityAndResolution('seam', candidates, '9.9.9', '1.0', [], []);
        }).toThrow(/OverlayResolutionFailureError/);
    });
});
