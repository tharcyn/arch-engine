import { describe, test, expect } from 'vitest';
import { validateSeamNamespace } from '../../src/topology/seamNamespaceValidation.js';
import { OverlaySeamError, SeamConflictCode } from '../../src/errors/seamErrors.js';

describe('Freeze Evidence: Seam Namespace Validation', () => {
    test('valid namespace returns registry mapping identically', () => {
        const seam = validateSeamNamespace('overlay::manifest::mergeBoundary');
        expect(seam.identity).toBe('overlay::manifest::mergeBoundary');
        expect(seam.mergeMode).toBe('merge-by-key');
    });

    test('invalid shape prefix throws SEAM_NOT_FOUND', () => {
        try {
            validateSeamNamespace('underlay::manifest::mergeBoundary' as any);
        } catch(e: any) {
            expect(e).toBeInstanceOf(OverlaySeamError);
            expect(e.code).toBe(SeamConflictCode.SEAM_NOT_FOUND);
            expect(e.message).toContain('Invalid seam syntax');
        }
    });

    test('valid shape but unregistered throws SEAM_NOT_FOUND', () => {
        try {
            validateSeamNamespace('overlay::manifest::hackedBoundary' as any);
        } catch(e: any) {
            expect(e).toBeInstanceOf(OverlaySeamError);
            expect(e.code).toBe(SeamConflictCode.SEAM_NOT_FOUND);
            expect(e.message).toContain('Unregistered overlay seam boundary');
        }
    });
});
