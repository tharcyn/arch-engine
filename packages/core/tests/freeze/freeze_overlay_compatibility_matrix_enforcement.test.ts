import { describe, test, expect } from 'vitest';
import { validateOverlayCompatibility } from '../../src/topology/overlayCompatibilityMatrix.js';

describe('Freeze Evidence: F-10 Overlay Compatibility Matrix Enforcement', () => {
    test('Rejects on incompatible core version', () => {
        const result = validateOverlayCompatibility(
            { overlaySourceId: 'test',
                overlayRegistrySource: 'core', overlayVersion: '1', compatibleWithCoreVersions: ['2.0'] },
            '1.0', '1.0', [], []
        );
        expect(result.valid).toBe(false);
        expect(result.reason).toMatch(/Compatibility negotiation failed/);
    });

    test('Rejects on missing capability', () => {
        const result = validateOverlayCompatibility(
            { overlaySourceId: 'test',
                overlayRegistrySource: 'core', overlayVersion: '1', requiresCapabilities: ['network_access'] },
            '1.0', '1.0', ['storage_access'], []
        );
        expect(result.valid).toBe(false);
        expect(result.incompatibleItems![0]).toMatch(/Required capability missing: network_access/);
    });
});
