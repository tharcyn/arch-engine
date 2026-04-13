import { describe, test, expect } from 'vitest';
import { validateOverlayAdmission, OverlayAdmissionRequest } from '../../src/topology/overlayAdmissionWorkflow.js';
import { OverlayAuthorityTier } from '../../src/topology/seamContracts.js';

describe('Freeze Evidence: F-10 Overlay Admission Rejection on Namespace Violation', () => {
    test('Admission rejected if namespace ownership fails', () => {
        const request: OverlayAdmissionRequest = {
            overlaySourceId: 'test-overlay',
                overlayRegistrySource: 'core',
            overlayVersion: '1.0.0',
            declaredAuthorityTier: OverlayAuthorityTier.SIGNED_EXTERNAL_PACK,
            registryId: 'external',
            originRegistryId: 'external',
            namespace: 'core.malicious' // Namespace violates ownership rules (core owned by core)
        };

        const result = validateOverlayAdmission(request, '1.0.0', '1.0', [], []);
        expect(result.admitted).toBe(false);
        expect(result.reason).toMatch(/Namespace violation/);
    });
});
