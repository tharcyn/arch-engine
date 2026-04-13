import { describe, test, expect } from 'vitest';
import { validateOverlayCompatibility } from '../../src/topology/overlayCompatibilityMatrix.js';

describe('Freeze Evidence: Compatibility Numeric Leakage Guard', () => {
    test('diagnostic responses natively hide raw numerical authority differences', () => {
        const record = {
            overlaySourceId: 'test',
                overlayRegistrySource: 'core',
            overlayVersion: '1',
            minimumTrustTier: 4 // Requires higher tier
        };

        const result = validateOverlayCompatibility(record, '1.0', '1.0', [], [], 2); // Effective is 2
        
        expect(result.valid).toBe(false);
        const reason = result.incompatibleItems![0];
        
        expect(reason).toContain('requirement not met');
        expect(reason).not.toMatch(/[0-9]/); // No numeric values leaked!
    });
});
