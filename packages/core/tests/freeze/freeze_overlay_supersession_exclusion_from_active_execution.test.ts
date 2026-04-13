import { describe, test, expect } from 'vitest';
import { registerOverlaySupersession } from '../../src/topology/overlaySupersessionGraph.js';
import { resolveEffectiveOverlayState, OverlayLifecycleState } from '../../src/topology/overlayLifecycleState.js';

describe('Freeze Evidence: F-10 Overlay Supersession Exclusion', () => {
    test('Superseded overlay cannot participate in active execution without pinning', () => {
        registerOverlaySupersession({
            currentOverlaySourceId: 'test-v1',
            currentOverlayVersion: '1.0.0',
            registryId: 'core',
            supersededBySourceId: 'test-v2',
            supersededByVersion: '2.0.0'
        });

        // Try standard execution resolve
        const executionState = resolveEffectiveOverlayState('test-v1', '1.0.0', 'core');
        expect(executionState.allowed).toBe(false);
        expect(executionState.state).toBe(OverlayLifecycleState.SUPERSEDED);

        // Try explicitly pinned
        const pinnedState = resolveEffectiveOverlayState('test-v1', '1.0.0', 'core', false, true);
        expect(pinnedState.allowed).toBe(true);
    });
});
