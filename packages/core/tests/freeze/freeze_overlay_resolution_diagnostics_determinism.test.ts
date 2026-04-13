import { describe, test, expect } from 'vitest';
import { inspectOverlayResolutionDecision } from '../../src/transport/federationDiagnostics.js';

describe('Freeze Evidence: Diagnostics Determinism', () => {
    test('same logical inputs -> identical deterministic output', async () => {
        const diagnosticsA = inspectOverlayResolutionDecision(
            'seam',
            [{ id: 'test-A' }, { id: 'test-B' }],
            'AUTHORITY_FIRST',
            [{ id: 'test-B' }, { id: 'test-A' }],
            [],
            false, true, false,
            false, null, {}, []
        );

        // We explicitly simulate same normalized arrays, diagnostics map everything purely structurally.
        const diagnosticsB = inspectOverlayResolutionDecision(
            'seam',
            [{ id: 'test-A' }, { id: 'test-B' }],
            'AUTHORITY_FIRST',
            [{ id: 'test-B' }, { id: 'test-A' }],
            [],
            false, true, false,
            false, null, {}, []
        );

        // Remove the non-deterministic timestamp
        const { timestamp: tA, ...cleanA } = diagnosticsA;
        const { timestamp: tB, ...cleanB } = diagnosticsB;

        expect(cleanA).toEqual(cleanB);
    });
});
