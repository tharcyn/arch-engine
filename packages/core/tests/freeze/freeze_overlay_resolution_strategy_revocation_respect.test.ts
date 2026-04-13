import { describe, test, expect } from 'vitest';
import { processOverlayEligibilityAndResolution } from '../../src/topology/overlayAdmissionWorkflow.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';
import { propagateOverlayRevocation, clearOverlayRevocations } from '../../src/topology/overlayRevocationList.js';
import { setOverlayLifecycleState, OverlayLifecycleState } from '../../src/topology/overlayLifecycleState.js';

describe('Freeze Evidence: F-11 Resolution Respects Revocation', () => {
    test('Resolution strategy executes strictly AFTER admission filters out revoked overlays', () => {
        clearOverlayRevocations();
        setOverlayLifecycleState({ overlaySourceId: 'test-C',
                overlayRegistrySource: 'core', overlayVersion: '1', registryId: 'core', lifecycleState: OverlayLifecycleState.ACTIVE });
        setOverlayLifecycleState({ overlaySourceId: 'test-D',
                overlayRegistrySource: 'core', overlayVersion: '1', registryId: 'core', lifecycleState: OverlayLifecycleState.ACTIVE });

        propagateOverlayRevocation('core', {
            overlaySourceId: 'test-D',
                overlayRegistrySource: 'core', overlayVersion: '1', revocationScope: 'overlay', timestamp: new Date().toISOString()
        }, ['core']);

        const candidates = [
            { overlaySourceId: 'test-C',
                overlayRegistrySource: 'core', overlayVersion: '1', registryId: 'core', namespace: 'core', originRegistryId: 'core', declaredAuthorityTier: OverlayAuthorityTier.UNTRUSTED_EXTERNAL, signatureDigest: 'ok' },
            { overlaySourceId: 'test-D',
                overlayRegistrySource: 'core', overlayVersion: '1', registryId: 'core', namespace: 'core', originRegistryId: 'core', declaredAuthorityTier: OverlayAuthorityTier.UNTRUSTED_EXTERNAL, signatureDigest: 'ok' }
        ];

        const resolved = processOverlayEligibilityAndResolution('seam', candidates, '9.9.9', '1.0', [], []);
        
        expect(resolved.length).toBe(1);
        expect(resolved[0].overlaySourceId).toBe('test-C');
    });
});
