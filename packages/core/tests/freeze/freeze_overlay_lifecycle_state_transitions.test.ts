import { describe, test, expect } from 'vitest';
import { OverlayLifecycleState, resolveEffectiveOverlayState, setOverlayLifecycleState } from '../../src/topology/overlayLifecycleState.js';

describe('Freeze Evidence: F-10 Overlay Lifecycle State Model', () => {
    test('Only ACTIVE overlays unconditionally participate in execution', () => {
        setOverlayLifecycleState({
            overlaySourceId: 'test1',
                overlayRegistrySource: 'core',
            overlayVersion: '1.0.0',
            registryId: 'core',
            lifecycleState: OverlayLifecycleState.ACTIVE
        });
        const state = resolveEffectiveOverlayState('test1', '1.0.0', 'core');
        expect(state.allowed).toBe(true);
    });

    test('DEPRECATED overlays allowed for replay validation only', () => {
        setOverlayLifecycleState({
            overlaySourceId: 'test2',
                overlayRegistrySource: 'core',
            overlayVersion: '1.0.0',
            registryId: 'core',
            lifecycleState: OverlayLifecycleState.DEPRECATED
        });
        
        // Not replay context
        expect(resolveEffectiveOverlayState('test2', '1.0.0', 'core').allowed).toBe(false);
        // Is replay context
        expect(resolveEffectiveOverlayState('test2', '1.0.0', 'core', true).allowed).toBe(true);
    });

    test('REVOKED overlays rejected', () => {
        setOverlayLifecycleState({
            overlaySourceId: 'test3',
                overlayRegistrySource: 'core',
            overlayVersion: '1.0.0',
            registryId: 'core',
            lifecycleState: OverlayLifecycleState.REVOKED
        });
        expect(resolveEffectiveOverlayState('test3', '1.0.0', 'core').allowed).toBe(false);
        expect(resolveEffectiveOverlayState('test3', '1.0.0', 'core', true).allowed).toBe(false);
    });
});
