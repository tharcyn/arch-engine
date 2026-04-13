import { describe, test, expect } from 'vitest';
import { processOverlayEligibilityAndResolution } from '../../src/topology/overlayAdmissionWorkflow.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';
import { setOverlayLifecycleState, OverlayLifecycleState } from '../../src/topology/overlayLifecycleState.js';

describe('Freeze Evidence: F-11 Resolution Respects Namespace Policy', () => {
    test('Resolution strategy executes strictly AFTER admission filters out namespace violations', () => {
        setOverlayLifecycleState({ overlaySourceId: 'test-E',
                overlayRegistrySource: 'core', overlayVersion: '1', registryId: 'external', lifecycleState: OverlayLifecycleState.ACTIVE });

        const candidates = [
            // core namespaces cannot be owned by external registry
            { overlaySourceId: 'test-E',
                overlayRegistrySource: 'core', overlayVersion: '1', registryId: 'external', namespace: 'core.malicious', originRegistryId: 'external', declaredAuthorityTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK }
        ];

        expect(() => {
            processOverlayEligibilityAndResolution('seam', candidates, '9.9.9', '1.0', [], []);
        }).toThrow(/OverlayResolutionFailureError/); // All candidates eliminated
    });
});
