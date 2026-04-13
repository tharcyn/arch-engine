import { describe, test, expect } from 'vitest';
import { OverlaySeamRegistry } from '../../src/topology/seamRegistry.js';

describe('Freeze Evidence: Overlay Seam Registry Immutability', () => {
    test('freeze::overlay::topology::seamRegistryStatic', () => {
        // 1. Assert registry is deeply frozen.
        expect(Object.isFrozen(OverlaySeamRegistry)).toBe(true);
        for (const seamId of Object.keys(OverlaySeamRegistry)) {
            expect(Object.isFrozen(OverlaySeamRegistry[seamId])).toBe(true);
        }

        // 2. Assert canonical shape
        for (const seamId of Object.keys(OverlaySeamRegistry)) {
            const seam = OverlaySeamRegistry[seamId];
            expect(seam.identity).toBe(seamId);
            expect(typeof seam.target).toBe('string');
            expect(typeof seam.mergeMode).toBe('string');
            expect(seam.defaultInactive).toBe(true);
            expect(seam.auditIdentity.startsWith('freeze::overlay::')).toBe(true);
            expect(Array.isArray(seam.determinismConstraints)).toBe(true);
            expect(Object.isFrozen(seam.determinismConstraints)).toBe(true);
        }

        // 3. Prevent wildcards
        expect(OverlaySeamRegistry['overlay::*']).toBeUndefined();
    });

    test('snapshot registry structure', () => {
        expect(OverlaySeamRegistry).toMatchSnapshot();
    });
});
