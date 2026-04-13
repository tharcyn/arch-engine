import { describe, test, expect } from 'vitest';
import { setOverlayLifecycleState, OverlayLifecycleState } from '../../src/topology/overlayLifecycleState.js';

describe('Freeze Evidence: F-10 Lifecycle Transition Graph', () => {
    test('Rejects transition from REVOKED to ACTIVE', () => {
        setOverlayLifecycleState({
            overlaySourceId: 'test-trans',
                overlayRegistrySource: 'core', overlayVersion: '1', registryId: 'core', lifecycleState: OverlayLifecycleState.REVOKED
        });

        expect(() => {
            setOverlayLifecycleState({
                overlaySourceId: 'test-trans',
                overlayRegistrySource: 'core', overlayVersion: '1', registryId: 'core', lifecycleState: OverlayLifecycleState.ACTIVE
            });
        }).toThrow(/Illegal lifecycle transition from REVOKED to ACTIVE/);
    });

    test('Rejects transition from ACTIVE to ADMITTED', () => {
        setOverlayLifecycleState({
            overlaySourceId: 'test-trans-2',
                overlayRegistrySource: 'core', overlayVersion: '1', registryId: 'core', lifecycleState: OverlayLifecycleState.ACTIVE
        });

        expect(() => {
            setOverlayLifecycleState({
                overlaySourceId: 'test-trans-2',
                overlayRegistrySource: 'core', overlayVersion: '1', registryId: 'core', lifecycleState: OverlayLifecycleState.ADMITTED
            });
        }).toThrow(/Illegal lifecycle transition from ACTIVE to ADMITTED/);
    });
});
