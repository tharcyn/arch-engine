import { describe, test, expect } from 'vitest';
import { inspectOverlayResolutionDecision } from '../../src/transport/federationDiagnostics.js';

describe('Freeze Evidence: Diagnostics Replay-Stability Verification', () => {
    test('diagnostics output is structurally identical across repeated executions asynchronously delayed', async () => {
        const diagnosticsA = inspectOverlayResolutionDecision(
            'seam', [], 'AUTHORITY_FIRST', [], [], false, true, false, false, null, {}, []
        );

        // Intentionally delay to forcefully shift any underlying system clock if a hidden dependency to Date.now() exists
        await new Promise(r => setTimeout(r, 10));

        const diagnosticsB = inspectOverlayResolutionDecision(
            'seam', [], 'AUTHORITY_FIRST', [], [], false, true, false, false, null, {}, []
        );

        expect(diagnosticsA).toEqual(diagnosticsB);
    });
});
