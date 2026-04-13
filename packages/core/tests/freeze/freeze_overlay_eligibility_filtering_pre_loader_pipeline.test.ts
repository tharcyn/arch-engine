import { describe, test, expect } from 'vitest';
import { validateOverlayAdmission, OverlayAdmissionRequest } from '../../src/topology/overlayAdmissionWorkflow.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';
import { setOverlayLifecycleState, OverlayLifecycleState } from '../../src/topology/overlayLifecycleState.js';

describe('Freeze Evidence: F-10 Eligibility Filtering Pre-Loader Pipeline', () => {
    test('Lifecycle state explicitly skips payload assembly by rejecting admission cleanly', () => {
        setOverlayLifecycleState({
            overlaySourceId: 'test-pre',
                overlayRegistrySource: 'core', overlayVersion: '1', registryId: 'core', lifecycleState: OverlayLifecycleState.SUPERSEDED
        });

        const result = validateOverlayAdmission({
            overlaySourceId: 'test-pre',
                overlayRegistrySource: 'core', overlayVersion: '1', registryId: 'core', namespace: 'core.test', originRegistryId: 'core', declaredAuthorityTier: OverlayAuthorityTier.TRUSTED_POLICY_PACK
        }, '9.9.9', '1.0', [], []);

        expect(result.admitted).toBe(false);
        expect(result.reason).toMatch(/Supersession exclusion: overlay is superseded/);
    });
});
