import { describe, test, expect } from 'vitest';
import { validateOverlayAdmission, OverlayAdmissionRequest } from '../../src/topology/overlayAdmissionWorkflow.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';

describe('Freeze Evidence: F-10 Overlay Admission Rejection on Signature Absence', () => {
    test('Admission rejected if signature is required by authority tier but missing', () => {
        const request: OverlayAdmissionRequest = {
            overlaySourceId: 'test-overlay',
                overlayRegistrySource: 'core',
            overlayVersion: '1.0.0',
            declaredAuthorityTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK, // Requires Signature
            registryId: 'partner',
            originRegistryId: 'partner',
            namespace: 'partner.some.space'
        };

        const result = validateOverlayAdmission(request, '1.0.0', '1.0', [], []);
        expect(result.admitted).toBe(false);
        expect(result.reason).toMatch(/Signature trust root missing/);
    });
});
