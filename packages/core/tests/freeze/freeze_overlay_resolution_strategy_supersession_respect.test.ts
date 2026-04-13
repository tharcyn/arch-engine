import { describe, test, expect } from 'vitest';
import { processOverlayEligibilityAndResolution } from '../../src/topology/overlayAdmissionWorkflow.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';
import { setOverlayLifecycleState, OverlayLifecycleState } from '../../src/topology/overlayLifecycleState.js';

describe('Freeze Evidence: F-11 Resolution Respects Supersession', () => {
    test('Resolution strategy executes strictly AFTER admission filters out superseded overlays', () => {
        setOverlayLifecycleState({
            overlaySourceId: 'test-A',
                overlayRegistrySource: 'core', overlayVersion: '1', registryId: 'core', lifecycleState: OverlayLifecycleState.SUPERSEDED
        });
        
        setOverlayLifecycleState({
            overlaySourceId: 'test-B',
                overlayRegistrySource: 'core', overlayVersion: '1', registryId: 'core', lifecycleState: OverlayLifecycleState.ACTIVE
        });

        const candidates = [
            { overlaySourceId: 'test-A',
                overlayRegistrySource: 'core', overlayVersion: '1', registryId: 'core', namespace: 'core', originRegistryId: 'core', declaredAuthorityTier: OverlayAuthorityTier.UNTRUSTED_EXTERNAL, signatureDigest: 'ok' },
            { overlaySourceId: 'test-B',
                overlayRegistrySource: 'core', overlayVersion: '1', registryId: 'core', namespace: 'core', originRegistryId: 'core', declaredAuthorityTier: OverlayAuthorityTier.UNTRUSTED_EXTERNAL, signatureDigest: 'ok' }
        ];

        const resolved = processOverlayEligibilityAndResolution('seam', candidates, '9.9.9', '1.0', [], []);
        
        expect(resolved.length).toBe(1);
        expect(resolved[0].overlaySourceId).toBe('test-B');
    });
});
